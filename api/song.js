// Авто-добавление песни пользователем: поиск + сборка караоке-разбора.
// ?action=search&q=  → кандидаты из lrclib (синхро-текст).
// ?action=build&artist=&track=  → собирает песню: строки+тайминги (lrclib),
//   романизация+перевод+пословный разбор (LLM через fal), id клипа (поиск YouTube).
// Текст/тайминги — из открытых источников, разбор — модель. Ничего не выдумываем на пустом месте.
import { readUserId } from "../lib/session.js";
import { supabase } from "../lib/supabase.js";
import { songUsage } from "../lib/limits.js";
import { transcribeLatin, transcribeCyrillic, pronounce } from "../lib/ko-g2p.js";

export const config = { maxDuration: 60 };

const MODEL = "anthropic/claude-haiku-4.5";
// Разбирается ВСЯ песня. До 24.07 здесь стояло MAX_LINES=8 — «первые ~2 куплета».
// На проверке это выглядело как зависание: у BABYMONSTER «PSYCHO» разбор кончался
// на 45-й секунде из 196 (23% песни), клип играл дальше, а экран уже показывал набор
// слов. Латентность держим не обрезкой песни, а параллельными кусками (annotateAll).
const MAX_LINES = 200; // предохранитель от аномального LRC, а не продуктовое ограничение
const CHUNK_LINES = 10; // корейских строк на один вызов модели
// Одновременных вызовов. Шесть, а не четыре: у Vercel на сборку 60 секунд, один кусок
// идёт около 30. При четырёх песня в 60 корейских строк ушла бы во ВТОРУЮ волну и
// уткнулась в таймаут; при шести почти любая песня укладывается в одну волну.
const MAX_PARALLEL = 6;

// Автоподсказки — iTunes Search API (бесплатный, прощает частичный ввод, знает корейский).
async function itunesSuggest(q) {
  const r = await fetch(
    "https://itunes.apple.com/search?media=music&entity=song&limit=10&term=" + encodeURIComponent(q),
    { headers: { "User-Agent": "StageOne" } }
  );
  if (!r.ok) return [];
  const d = await r.json().catch(() => ({}));
  const seen = new Set();
  const out = [];
  for (const x of d.results || []) {
    const key = (x.artistName + "|" + x.trackName).toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ title: x.trackName, artist: x.artistName });
    if (out.length >= 7) break;
  }
  return out;
}

// Текст с таймингами — lrclib. Ищем запись с синхро-текстом И корейским.
async function lrclibFind(artist, track) {
  const r = await fetch("https://lrclib.net/api/search?q=" + encodeURIComponent(artist + " " + track), {
    headers: { "User-Agent": "StageOne (korean learning app)" },
  });
  if (!r.ok) return null;
  const arr = await r.json().catch(() => []);
  const ok = (arr || []).filter((x) => x.syncedLyrics && !x.instrumental && /[가-힣]/.test(x.syncedLyrics || ""));
  // избегаем ремиксов/лайвов/каверов — их тайминг не совпадёт с официальным клипом
  const bad = /remix|sped|slow|live|inst|acoustic|cover|karaoke|version/i;
  const clean = ok.filter((x) => !bad.test(x.trackName || "") && !bad.test(x.albumName || ""));
  return clean[0] || ok[0] || null;
}

// LRC → [{t, kr, ko}] — ВСЕ спетые строки, а не только корейские.
// До 24.07 строки без хангыля выбрасывались. В k-pop их половина: у «PSYCHO»
// из 80 строк отбрасывалось 55, и человек видел четыре корейские строки подряд там,
// где на самом деле поётся английский. Отсюда «написано вообще не то» и рваный ритм
// заливки: слово тянулось через весь выброшенный кусок до следующей корейской строки.
// Английские строки НЕ разбираются пословно (учить в них нечего), но остаются на
// экране и, главное, держат тайминг.
function parseSynced(lrc) {
  const out = [];
  for (const line of (lrc || "").split("\n")) {
    const m = line.match(/^\[(\d+):(\d+)(?:\.(\d+))?\]\s?(.*)$/);
    if (!m) continue;
    const t = +m[1] * 60 + +m[2] + (m[3] ? +("0." + m[3]) : 0);
    const kr = (m[4] || "").trim();
    if (!kr) continue;
    out.push({ t: +t.toFixed(2), kr, ko: /[가-힣]/.test(kr), i: out.length });
  }
  return out;
}

// Разбиваем строки на куплеты по паузам между ними. Порог опущен с 3.5с до 2.5с:
// раньше пауза считалась по ОТФИЛЬТРОВАННЫМ строкам и была фиктивно большой —
// каждая корейская строка становилась «куплетом» из одной строки (у PSYCHO вышло
// 1,1,1,3,1,1). Теперь паузы настоящие.
function groupVerses(lines) {
  const verses = [];
  let cur = [];
  for (let i = 0; i < lines.length; i++) {
    cur.push(lines[i]);
    const gap = i + 1 < lines.length ? lines[i + 1].t - lines[i].t : 99;
    if (gap > 2.5 || cur.length >= 6) {
      verses.push(cur);
      cur = [];
    }
  }
  if (cur.length) verses.push(cur);
  return verses;
}

// Транскрипция: НЕ книжная романизация, а фактическое звучание слога у артиста.
// Модель обязана применить корейские звуковые правила (напряжение, ассимиляция,
// перенос патчхима, выпадение ㅎ) и разбить результат на слоги через «·».
// Плюс смысловой слой куплета: дословно / по смыслу / почему они расходятся —
// это то единственное, ради чего пользователь остаётся на экране разбора.
const TRANSCRIPTION_RULES = [
  "TRANSCRIPTION IS THE MOST IMPORTANT FIELD. Do NOT output textbook Revised Romanization.",
  "Transcribe how the syllable is ACTUALLY SUNG, after Korean phonological rules:",
  "  tensification: 보고 싶다 -> bo·go·sip·tta (not sipda); 잡고 -> jap·kko",
  "  liaison of the patchim: 사진을 -> sa·ji·neul; 8월에도 -> pa·rwo·re·do; 눈이 -> nu·ni",
  "  ㅎ weakening/aspiration: 말하니까 -> ma·ra·ni·kka; 이렇게 -> i·reo·ke; 야속한 -> ya·so·kan",
  "  nasal/lateral assimilation: 설국열차 -> seol·gung·nyeol·cha; 홀로 -> hol·lo; 끝내고파 -> kkeun·nae·go·pa",
  "Split every transcription into SYLLABLES separated by the middle dot '·'. One dot between syllables, no spaces.",
  "'r'  = Latin syllables (for English and all non-Cyrillic UI languages).",
  "'rr' = Cyrillic syllables for Russian speakers, Kontsevich system, also pronunciation-based:",
  "  보고 싶다 -> по·го·сип·та; 시간 -> щи·ган; 설국열차 -> соль·гун·нёль·ча; 잡고 -> чап·ко.",
  "Latin words inside Korean lyrics (e.g. 'friend') keep the word itself in 'r' and a Cyrillic reading in 'rr'.",
].join("\n");

async function annotate(verseGroups, vBase = 0) {
  const key = process.env.FAL_KEY;
  if (!key) throw new Error("FAL_KEY не задан");
  const system =
    "You are a Korean lyrics annotator for a language-learning app. Output ONLY valid minified JSON, no prose, no markdown fences.";
  // Строки без хангыля идут в промпт как КОНТЕКСТ (модель должна понимать куплет целиком),
  // но объекта в ответе на них не ждём — разбирать в них нечего.
  const listing = verseGroups
    .map((g, v) => g.map((l) => `V${v + vBase} L${l.i} ${l.kr}${l.ko ? "" : "   <- not Korean: context only, DO NOT return an object for this line"}`).join("\n"))
    .join("\n");
  const vNums = verseGroups.map((_, v) => v + vBase);
  const koLines = verseGroups.flatMap((g) => g.filter((l) => l.ko).map((l) => l.i));
  const prompt =
    `Korean song, already grouped into verses. Each row is "V<verse> L<line> <lyrics>":\n` +
    listing +
    `\n\nReturn ONLY JSON of this exact shape:\n` +
    `{"lines":[{"i":0,"tr":{"ru":"","en":""},"c":{"ru":"","en":""},"w":[{"k":"","r":"","rr":"","ru":"","en":""}]}],` +
    `"verses":[{"v":0,"tr":{"ru":"","en":""},"lit":{"ru":"","en":""},"why":{"ru":"","en":""}}]}\n\n` +
    TRANSCRIPTION_RULES +
    `\n\nOther rules:\n` +
    `- "lines": one object per KOREAN input line — these and only these L numbers: ${koLines.join(", ")}. "i" = the L number from the input.\n` +
    `- If the SAME lyrics line appears again later (chorus), you may return it once — we reuse that breakdown for every repeat.\n` +
    `- lines[].tr = what THAT ONE LINE actually means in natural Russian/English. Not a word-for-word chain — a sentence a native speaker would say. It is shown under the lyrics and lights up word by word while the line is sung, so keep it one short sentence.\n` +
    `- lines[].c = OPTIONAL, only for lines where the meaning is NOT the sum of the words: idiom, fixed expression, culture/film reference, grammar tail that carries feeling. 1-2 sentences: word A alone means X, word B alone means Y, together they mean Z. Omit the field entirely on ordinary lines — do not pad.\n` +
    `- Split each line into meaningful words; keep particles attached to their word. "ru"/"en" = 1-3 word gloss of THAT word alone.\n` +
    `- "verses": exactly ${vNums.length} objects, one per verse, with these exact "v" values: ${vNums.join(", ")}. NEVER merge two verses into one object and never split one verse into two — the grouping above is fixed. A verse whose lines are all non-Korean still gets an object.\n` +
    `- verses[].lit = word-for-word literal translation of the whole verse. It MUST read clumsily — that is the point.\n` +
    `- verses[].tr = what the verse actually means in natural Russian/English.\n` +
    `- verses[].why = 2-4 sentences explaining WHY lit and tr differ. Name concrete words: word A means X on its own, word B means Y on its own, but together they mean Z. Cover idioms, film/culture references and grammar tails that carry feeling no single word carries. Write it for a fan with zero Korean.\n` +
    `- Russian text in Russian, English text in English. No markdown. JSON only.`;
  // 21.07: any-llm deprecated → OpenRouter chat-completions (OpenAI-совместимый, тот же FAL_KEY).
  const r = await fetch("https://fal.run/openrouter/router/openai/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Key ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ],
      temperature: 0,
    }),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok || d.error) throw new Error(d.error?.message || d.error || `fal ${r.status}`);
  let out = (d.choices?.[0]?.message?.content || "").trim().replace(/^```json?/i, "").replace(/```$/, "").trim();
  const m = out.match(/\{[\s\S]*\}/);
  const parsed = JSON.parse(m ? m[0] : out);
  return { lines: parsed.lines || [], verses: parsed.verses || [] };
}

/**
 * Разбор всей песни. Куплеты режутся на куски примерно по CHUNK_LINES корейских строк
 * (граница куска = граница куплета, иначе смысловой перевод куплета соберётся из огрызков)
 * и уходят в модель параллельно. Один длинный вызов на всю песню не влезал бы в
 * maxDuration=60 и стабильно обрывал JSON на середине.
 * Кусок, который не удался, не роняет песню целиком — его строки просто останутся
 * без разбора, а не оборвут её на середине, как это делала обрезка MAX_LINES=8.
 */
async function annotateAll(groups) {
  const chunks = [];
  let cur = [], curKo = 0, start = 0;
  groups.forEach((g, vi) => {
    cur.push(g);
    curKo += g.filter((l) => l.ko).length;
    if (curKo >= CHUNK_LINES) { chunks.push({ groups: cur, vBase: start }); cur = []; curKo = 0; start = vi + 1; }
  });
  if (cur.length) chunks.push({ groups: cur, vBase: start });

  const results = [];
  for (let i = 0; i < chunks.length; i += MAX_PARALLEL) {
    const batch = chunks.slice(i, i + MAX_PARALLEL);
    results.push(
      ...(await Promise.all(
        batch.map((c) =>
          annotate(c.groups, c.vBase)
            .then((r) => ({ ...r, chunk: c, ok: true }))
            .catch((e) => ({ lines: [], verses: [], chunk: c, ok: false, err: String(e?.message || e) }))
        )
      ))
    );
  }
  if (!results.some((r) => r.ok)) throw new Error(results[0]?.err || "модель не ответила ни на один кусок");

  const lines = [];
  const verses = [];
  for (const r of results) {
    lines.push(...r.lines);
    // ЗАЩИТА ОТ СЪЕЗДА КУПЛЕТОВ. Модель регулярно перегруппировывает куплеты по-своему
    // (у PSYCHO склеила шесть в три), но нумерует их с нуля — и объяснение «почему
    // дословно ≠ по смыслу» приезжало к ЧУЖИМ строкам. Именно это Сармат увидел как
    // «написано вообще не то». Поэтому: количество не сошлось — верхний слой куплета
    // не берём вообще, смысл соберётся из построчных переводов (они по «i» не съезжают).
    if (r.ok && r.verses.length === r.chunk.groups.length) verses.push(...r.verses);
  }
  return { lines, verses };
}

// Страховка от книжной романизации: если модель вернула слитную строку без «·»,
// хотя бы режем её на слоги по границам гласных — лучше приблизительно по слогам,
// чем сплошным куском, который невозможно спеть.
const VOWELS = ["yeo", "wae", "yae", "eo", "eu", "ae", "oe", "ui", "ya", "yo", "yu", "ye", "wa", "wo", "wi", "a", "e", "i", "o", "u"];
const ONSETS = ["kk", "tt", "pp", "jj", "ss", "ch", "g", "n", "d", "r", "l", "m", "b", "s", "j", "k", "t", "p", "h", "w", "y"];
function syllabify(s) {
  const str = String(s || "").trim();
  if (!str || str.includes("·")) return str;
  if (!/^[a-z\s'-]+$/i.test(str)) return str;
  const low = str.toLowerCase();
  const isVowelAt = (i) => VOWELS.find((x) => low.startsWith(x, i));
  const out = [];
  let buf = "";
  let i = 0;
  const flush = () => { if (buf) out.push(buf); buf = ""; };
  while (i < low.length) {
    if (low[i] === " " || low[i] === "-") { flush(); i++; continue; }
    const v = isVowelAt(i);
    if (!v) { buf += str[i]; i++; continue; }
    buf += str.slice(i, i + v.length);
    i += v.length;
    // согласные после гласной: последняя «онсетная» группа уходит в следующий слог,
    // остальное — патчхим текущего. В конце слова всё остаётся патчхимом.
    let run = "";
    while (i < low.length && !isVowelAt(i) && low[i] !== " " && low[i] !== "-") { run += str[i]; i++; }
    if (!run || i >= low.length || low[i] === " " || low[i] === "-") { buf += run; flush(); continue; }
    const tail = run.toLowerCase();
    const onset = ONSETS.find((o) => tail.endsWith(o)) || run.slice(-1);
    const coda = run.slice(0, run.length - onset.length);
    buf += coda;
    flush();
    buf = run.slice(run.length - onset.length);
  }
  flush();
  return out.filter(Boolean).join("·") || str;
}

/* Ищем клип на YouTube (скрейп страницы результатов).
 *
 * До 24.07 бралось ПЕРВОЕ видео из выдачи. Для «PSYCHO» это оказался PERFORMANCE VIDEO
 * на 206 секунд против 196 у записи, под которую сделаны тайминги lrclib, — и весь разбор
 * ехал мимо пения. Тайминги мы не двигаем (двигать нечем, forced alignment здесь нет),
 * поэтому выбираем видео, у которого ДЛИТЕЛЬНОСТЬ совпадает с записью.
 * Заодно отсекаем то, что показывать бессмысленно: практики, фанкамы, реакции и чужие
 * «lyrics»-видео (у нас свой текст на экране — второй поверх клипа только мешает).
 */
const YT_BAD = /performance|dance practice|practice ver|choreograph|안무|연습|live|concert|fancam|reaction|cover|remix|sped|slowed|teaser|behind|making|spoiler|shorts|hour|loop|color coded|line distribution|karaoke|lyrics|lyric video|audio|오디오|topic|instrumental|inst\.|full album|album ver/i;
// Настоящий клип помечается «M/V» — отраслевой стандарт k-pop. «official» сам по себе
// слабый сигнал: «Official Audio» — это статичная картинка со звуком, не видео, и
// именно её Сармат видел как «просто картинку без видео». Поэтому M/V весит много,
// а голое «official» — мало.
const YT_MV = /\bm\/?v\b|뮤직비디오|music video/i;
const YT_GOOD = /official/i;

function ytCandidates(html) {
  const out = [];
  const re = /"videoRenderer":\{"videoId":"([\w-]{11})"/g;
  let m;
  while ((m = re.exec(html)) && out.length < 12) {
    const win = html.slice(m.index, m.index + 3000);
    const t = win.match(/"title":\{"runs":\[\{"text":"((?:[^"\\]|\\.)*)"/);
    const len = win.match(/"simpleText":"(\d+:\d+(?::\d+)?)"/);
    let title = "";
    try { title = t ? JSON.parse('"' + t[1] + '"') : ""; } catch { title = ""; }
    const sec = len ? len[1].split(":").reverse().reduce((s, p, i) => s + +p * Math.pow(60, i), 0) : 0;
    out.push({ id: m[1], title, sec });
  }
  return out;
}

async function youtubeId(query, duration = 0) {
  try {
    const r = await fetch("https://www.youtube.com/results?search_query=" + encodeURIComponent(query), {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)", "Accept-Language": "en-US" },
    });
    const html = await r.text();
    const cands = ytCandidates(html);
    if (!cands.length) return (html.match(/"videoId":"([\w-]{11})"/) || [])[1] || "";
    const score = (c) => {
      let s = 0;
      const d = c.sec && duration ? Math.abs(c.sec - duration) : 999;
      s += d <= 2 ? 6 : d <= 6 ? 4 : d <= 15 ? 1 : -4;
      if (YT_MV.test(c.title)) s += 6;          // настоящий клип — главный приоритет
      if (YT_GOOD.test(c.title)) s += 1;        // «official» слабо, у аудио оно тоже есть
      if (YT_BAD.test(c.title)) s -= 6;         // концерт, фанкам, «official audio», текстовик
      if (c.sec && c.sec < 90) s -= 3;          // короче полутора минут — тизер, не клип
      return s;
    };
    const best = cands.slice().sort((a, b) => score(b) - score(a))[0];
    return best.id;
  } catch (e) {
    return "";
  }
}

async function handleBuild(req, res) {
  const artist = (req.query.artist || "").trim();
  const track = (req.query.track || "").trim();
  if (!artist || !track) return res.status(400).json({ error: "artist и track обязательны" });

  const rec = await lrclibFind(artist, track);
  if (!rec || !rec.syncedLyrics) return res.status(404).json({ error: "Для этой песни нет синхро-текста с корейским" });

  const id = "usr_" + rec.id;
  const db = supabase();
  // Уже собрана кем-то раньше? — отдаём готовую из общего каталога, не пересобираем (бесплатно).
  const { data: existing } = await db.from("songs").select("data").eq("id", id).maybeSingle();
  if (existing && existing.data) return res.status(200).json({ ok: true, song: existing.data, cached: true });

  // Только НОВАЯ сборка платная (LLM) — дневной лимит на юзера.
  const lim = await songUsage(db, readUserId(req));
  if (lim.over) return res.status(429).json({
    error: `Дневной лимит новых песен (${lim.limit}) исчерпан. Готовые песни из каталога — без ограничений.`, limit: lim.limit });

  const allLines = parseSynced(rec.syncedLyrics);
  if (!allLines.some((l) => l.ko)) return res.status(422).json({ error: "В песне нет корейского текста" });
  const lines = allLines.slice(0, MAX_LINES);

  // Куплеты режем ДО обращения к модели: она должна видеть границы куплета,
  // чтобы дать смысловой перевод целого куплета, а не склейку построчных обрывков.
  const groups = groupVerses(lines);

  let ann;
  try {
    ann = await annotateAll(groups);
  } catch (e) {
    return res.status(502).json({ error: "Не удалось собрать разбор, попробуй другую песню", detail: String(e?.message || e) });
  }

  const byLine = new Map();
  for (const a of ann.lines) if (a && a.i != null) byLine.set(+a.i, a);
  // Припев поётся 3-4 раза, а модель разбирает его ОДИН раз — остальные вхождения
  // возвращались пустыми и падали в запасной вариант «вся строка одним словом»: без
  // транскрипции, без перевода слов, без возможности сохранить их в тетрадь. На PSYCHO
  // так осталось без разбора 10 корейских строк из 25 — то есть весь припев.
  // Поэтому разбор ищем и по ТЕКСТУ строки, а не только по её номеру.
  const byText = new Map();
  for (const [i, a] of byLine) {
    const src = lines[i];
    if (src && !byText.has(src.kr)) byText.set(src.kr, a);
  }
  const byVerse = new Map();
  for (const v of ann.verses) if (v && v.v != null) byVerse.set(+v.v, v);

  const built = lines.map((l, i) => {
    // Сопоставление СТРОГО по «i». Позиционный запасной вариант (ann.lines[i]) убран:
    // модель молчит по неспетым/английским строкам, и позиция в её ответе перестаёт
    // совпадать с позицией в песне — разбор приезжал к чужой строке.
    const a = byLine.get(i) || byText.get(l.kr) || {};
    // Строка не на корейском: слова нужны только как якоря тайминга, разбирать нечего.
    const raw = !l.ko
      ? l.kr.split(/\s+/).filter(Boolean).map((word) => ({ k: word, r: "", rr: "", ru: "", en: "" }))
      : Array.isArray(a.w) && a.w.length ? a.w : [{ k: l.kr, r: "", rr: "", ru: (a.tr && a.tr.ru) || "", en: (a.tr && a.tr.en) || "" }];
    // Транскрипцию считаем сами: правила произношения детерминированы, а модель
    // на них регулярно съезжает в книжную романизацию. Ответ модели держим только
    // как запасной вариант — для латиницы внутри корейского текста и прочих
    // случаев, где считать нечего. См. lib/ko-g2p.js.
    const w = raw.map((x) => {
      const k = x.k || "";
      const hangul = /[가-힣]/.test(k);
      return {
        k,
        r: hangul ? transcribeLatin(k) : syllabify(x.r),
        rr: hangul ? transcribeCyrillic(k) : String(x.rr || ""),
        p: hangul ? pronounce(k) : "",          // как слово звучит, хангылем
        ru: x.ru || "",
        en: x.en || "",
      };
    }).filter((x) => x.k);
    const c = a.c && (a.c.ru || a.c.en) ? a.c : null;
    const o = { t: l.t, kr: l.kr, tr: (l.ko && a.tr) || { ru: "", en: "" }, c, w: w.length ? w : [{ k: l.kr, r: "", rr: "", ru: "", en: "" }] };
    if (!l.ko) o.x = 1; // «строка не на корейском» — фронт рисует её приглушённо и не тащит слова в тетрадь
    return o;
  });

  const verses = groups.map((g, vi) => {
    const last = g[g.length - 1];
    const end = lines[last.i + 1] ? lines[last.i + 1].t : last.t + 4;
    const va = byVerse.get(vi) || {};
    const glines = g.map((l) => built[l.i]);
    // Фолбэк, если модель не дала перевод куплета: склейка построчных.
    const joined = (k) => glines.map((l) => (l.tr && l.tr[k]) || "").filter(Boolean).join(" ");
    const tr = va.tr && (va.tr.ru || va.tr.en) ? va.tr : { ru: joined("ru"), en: joined("en") };
    const v = {
      end: +end.toFixed(2),
      tr,
      // s — построчный смысловой перевод: заливается синхронно с пением (public/app.js,
      // buildSenseFill). c — почему компоновка слов даёт этот смысл, по 🔗.
      lines: glines.map((l) => {
        const o = { t: l.t, w: l.w };
        if (l.tr && (l.tr.ru || l.tr.en)) o.s = l.tr;
        if (l.c) o.c = l.c;
        if (l.x) o.x = 1;
        return o;
      }),
    };
    if (va.lit && (va.lit.ru || va.lit.en)) v.lit = va.lit;
    if (va.why && (va.why.ru || va.why.en)) v.why = va.why;
    return v;
  });

  // Ищем именно клип: «M/V» в запросе смещает выдачу к музыкальному видео, а не к
  // «Official Audio» (картинка со звуком), концертам и текстовикам.
  const ytId = await youtubeId(rec.artistName + " " + rec.trackName + " M/V", rec.duration);
  const song = {
    id,
    title: rec.trackName,
    artist: rec.artistName,
    ytId,
    duration: rec.duration,
    videoOffset: 0,
    level: { ru: "по песне", en: "from a song" },
    verses,
  };
  // Кладём в общий каталог — дальше все получат готовую.
  try {
    await db.from("songs").upsert({ id, title: song.title, artist: song.artist, yt_id: ytId, duration: rec.duration, video_offset: 0, data: song, added_by: readUserId(req) });
  } catch (e) {}
  return res.status(200).json({ ok: true, song });
}

export default async function handler(req, res) {
  const uid = readUserId(req);
  if (!uid) return res.status(401).json({ error: "Нужно войти в аккаунт" });
  const action = req.query.action;
  try {
    if (action === "search") {
      const q = (req.query.q || "").trim();
      if (q.length < 2) return res.status(200).json({ ok: true, results: [] });
      return res.status(200).json({ ok: true, results: await itunesSuggest(q) });
    }
    if (action === "build") return await handleBuild(req, res);
    if (action === "list") {
      const { data } = await supabase().from("songs").select("data").order("created_at", { ascending: false }).limit(200);
      return res.status(200).json({ ok: true, songs: (data || []).map((x) => x.data).filter(Boolean) });
    }
    return res.status(400).json({ error: "Неизвестный action" });
  } catch (e) {
    return res.status(500).json({ error: String(e?.message || e) });
  }
}
