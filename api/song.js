// Авто-добавление песни пользователем: поиск + сборка караоке-разбора.
// ?action=search&q=  → кандидаты из lrclib (синхро-текст).
// ?action=build&artist=&track=  → собирает песню: строки+тайминги (lrclib),
//   романизация+перевод+пословный разбор (LLM через fal), id клипа (поиск YouTube).
// Текст/тайминги — из открытых источников, разбор — модель. Ничего не выдумываем на пустом месте.
import { readUserId } from "../lib/session.js";
import { supabase } from "../lib/supabase.js";
import { songUsage } from "../lib/limits.js";

export const config = { maxDuration: 60 };

const MODEL = "anthropic/claude-haiku-4.5";
const MAX_LINES = 8; // первые ~2 куплета — держим латентность/размер разумными

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

// LRC → [{t, kr}] (только строки с корейским)
function parseSynced(lrc) {
  const out = [];
  for (const line of (lrc || "").split("\n")) {
    const m = line.match(/^\[(\d+):(\d+)(?:\.(\d+))?\]\s?(.*)$/);
    if (!m) continue;
    const t = +m[1] * 60 + +m[2] + (m[3] ? +("0." + m[3]) : 0);
    const kr = (m[4] || "").trim();
    if (kr && /[가-힣]/.test(kr)) out.push({ t: +t.toFixed(2), kr, i: out.length });
  }
  return out;
}

// Разбиваем строки на куплеты по паузам между ними (> 3.5с = граница).
function groupVerses(lines) {
  const verses = [];
  let cur = [];
  for (let i = 0; i < lines.length; i++) {
    cur.push(lines[i]);
    const gap = i + 1 < lines.length ? lines[i + 1].t - lines[i].t : 99;
    if (gap > 3.5 || cur.length >= 4) {
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

async function annotate(verseGroups) {
  const key = process.env.FAL_KEY;
  if (!key) throw new Error("FAL_KEY не задан");
  const system =
    "You are a Korean lyrics annotator for a language-learning app. Output ONLY valid minified JSON, no prose, no markdown fences.";
  const listing = verseGroups
    .map((g, v) => g.map((l) => `V${v} L${l.i} ${l.kr}`).join("\n"))
    .join("\n");
  const prompt =
    `Korean song, already grouped into verses. Each row is "V<verse> L<line> <lyrics>":\n` +
    listing +
    `\n\nReturn ONLY JSON of this exact shape:\n` +
    `{"lines":[{"i":0,"tr":{"ru":"","en":""},"w":[{"k":"","r":"","rr":"","ru":"","en":""}]}],` +
    `"verses":[{"v":0,"tr":{"ru":"","en":""},"lit":{"ru":"","en":""},"why":{"ru":"","en":""}}]}\n\n` +
    TRANSCRIPTION_RULES +
    `\n\nOther rules:\n` +
    `- "lines": exactly one object per input line, "i" = the L number from the input.\n` +
    `- Split each line into meaningful words; keep particles attached to their word. "ru"/"en" = 1-3 word gloss of THAT word alone.\n` +
    `- "verses": exactly one object per verse, "v" = the V number.\n` +
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

// Ищем id клипа на YouTube по названию (скрейп страницы результатов).
async function youtubeId(query) {
  try {
    const r = await fetch("https://www.youtube.com/results?search_query=" + encodeURIComponent(query), {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)", "Accept-Language": "en-US" },
    });
    const html = await r.text();
    const m = html.match(/"videoId":"([\w-]{11})"/);
    return m ? m[1] : "";
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
  if (!allLines.length) return res.status(422).json({ error: "В песне нет корейского текста" });
  const lines = allLines.slice(0, MAX_LINES);

  // Куплеты режем ДО обращения к модели: она должна видеть границы куплета,
  // чтобы дать смысловой перевод целого куплета, а не склейку построчных обрывков.
  const groups = groupVerses(lines);

  let ann;
  try {
    ann = await annotate(groups);
  } catch (e) {
    return res.status(502).json({ error: "Не удалось собрать разбор, попробуй другую песню", detail: String(e?.message || e) });
  }

  const byLine = new Map();
  for (const a of ann.lines) if (a && a.i != null) byLine.set(+a.i, a);
  const byVerse = new Map();
  for (const v of ann.verses) if (v && v.v != null) byVerse.set(+v.v, v);

  const built = lines.map((l, i) => {
    const a = byLine.get(i) || ann.lines[i] || {};
    const raw = Array.isArray(a.w) && a.w.length ? a.w : [{ k: l.kr, r: "", rr: "", ru: (a.tr && a.tr.ru) || "", en: (a.tr && a.tr.en) || "" }];
    const w = raw.map((x) => ({
      k: x.k || "",
      r: syllabify(x.r),
      rr: String(x.rr || ""),
      ru: x.ru || "",
      en: x.en || "",
    })).filter((x) => x.k);
    return { t: l.t, kr: l.kr, tr: a.tr || { ru: "", en: "" }, w: w.length ? w : [{ k: l.kr, r: "", rr: "", ru: "", en: "" }] };
  });

  const verses = groups.map((g, vi) => {
    const last = g[g.length - 1];
    const end = lines[last.i + 1] ? lines[last.i + 1].t : last.t + 4;
    const va = byVerse.get(vi) || ann.verses[vi] || {};
    const glines = g.map((l) => built[l.i]);
    // Фолбэк, если модель не дала перевод куплета: склейка построчных.
    const joined = (k) => glines.map((l) => (l.tr && l.tr[k]) || "").filter(Boolean).join(" ");
    const tr = va.tr && (va.tr.ru || va.tr.en) ? va.tr : { ru: joined("ru"), en: joined("en") };
    const v = {
      end: +end.toFixed(2),
      tr,
      lines: glines.map((l) => ({ t: l.t, w: l.w })),
    };
    if (va.lit && (va.lit.ru || va.lit.en)) v.lit = va.lit;
    if (va.why && (va.why.ru || va.why.en)) v.why = va.why;
    return v;
  });

  const ytId = await youtubeId(rec.artistName + " " + rec.trackName + " official");
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
