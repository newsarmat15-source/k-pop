// Авто-добавление песни пользователем: поиск + сборка караоке-разбора.
// ?action=search&q=  → кандидаты из lrclib (синхро-текст).
// ?action=build&artist=&track=  → собирает песню: строки+тайминги (lrclib),
//   романизация+перевод+пословный разбор (LLM через fal), id клипа (поиск YouTube).
// Текст/тайминги — из открытых источников, разбор — модель. Ничего не выдумываем на пустом месте.
import { readUserId } from "../lib/session.js";

export const config = { maxDuration: 60 };

const MODEL = "anthropic/claude-haiku-4.5";
const MAX_LINES = 8; // первые ~2 куплета — держим латентность/размер разумными

async function lrclibSearch(q) {
  const r = await fetch("https://lrclib.net/api/search?q=" + encodeURIComponent(q), {
    headers: { "User-Agent": "StageOne (korean learning app)" },
  });
  if (!r.ok) return [];
  const arr = await r.json().catch(() => []);
  return (arr || [])
    .filter((x) => x.syncedLyrics && !x.instrumental)
    .slice(0, 8)
    .map((x) => ({ id: x.id, title: x.trackName || x.name, artist: x.artistName, duration: x.duration }));
}

async function lrclibGetById(id) {
  const r = await fetch("https://lrclib.net/api/get/" + encodeURIComponent(id), {
    headers: { "User-Agent": "StageOne (korean learning app)" },
  });
  if (!r.ok) return null;
  return await r.json().catch(() => null);
}

// LRC → [{t, kr}] (только строки с корейским)
function parseSynced(lrc) {
  const out = [];
  for (const line of (lrc || "").split("\n")) {
    const m = line.match(/^\[(\d+):(\d+)(?:\.(\d+))?\]\s?(.*)$/);
    if (!m) continue;
    const t = +m[1] * 60 + +m[2] + (m[3] ? +("0." + m[3]) : 0);
    const kr = (m[4] || "").trim();
    if (kr && /[가-힣]/.test(kr)) out.push({ t: +t.toFixed(2), kr });
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

async function annotate(lines) {
  const key = process.env.FAL_KEY;
  if (!key) throw new Error("FAL_KEY не задан");
  const system =
    "You are a Korean lyrics annotator for a language-learning app. Output ONLY valid minified JSON, no prose, no markdown fences.";
  const prompt =
    `Korean song lines (index, then text):\n` +
    lines.map((l, i) => i + " " + l.kr).join("\n") +
    `\n\nReturn ONLY JSON of this exact shape:\n` +
    `{"lines":[{"i":0,"rom":"<Revised romanization of the whole line>","tr":{"ru":"<short Russian translation>","en":"<short English translation>"},"w":[{"k":"<korean word>","r":"<rom>","ru":"<1-2 word Russian>","en":"<1-2 word English>"}]}]}\n` +
    `Rules: one object per input line, same index. Split each line into meaningful words (keep particles attached to their word). Revised Romanization. JSON only.`;
  const r = await fetch("https://fal.run/fal-ai/any-llm", {
    method: "POST",
    headers: { Authorization: `Key ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: MODEL, system_prompt: system, prompt }),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok || d.error) throw new Error(d.error || `fal ${r.status}`);
  let out = (d.output || "").trim().replace(/^```json?/i, "").replace(/```$/, "").trim();
  const m = out.match(/\{[\s\S]*\}/);
  const parsed = JSON.parse(m ? m[0] : out);
  return parsed.lines || [];
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
  const id = (req.query.id || "").trim();
  if (!id) return res.status(400).json({ error: "id обязателен" });

  const rec = await lrclibGetById(id);
  if (!rec || !rec.syncedLyrics) return res.status(404).json({ error: "Синхро-текст не найден для этой песни" });

  const allLines = parseSynced(rec.syncedLyrics);
  if (!allLines.length) return res.status(422).json({ error: "В песне нет корейского текста" });
  const lines = allLines.slice(0, MAX_LINES);

  let ann;
  try {
    ann = await annotate(lines);
  } catch (e) {
    return res.status(502).json({ error: "Не удалось собрать разбор, попробуй другую песню", detail: String(e?.message || e) });
  }

  // Склеиваем тайминги (lrclib) с разбором (LLM) построчно.
  const built = lines.map((l, i) => {
    const a = ann.find((x) => x.i === i) || ann[i] || {};
    const w = Array.isArray(a.w) && a.w.length ? a.w : [{ k: l.kr, r: a.rom || "", ru: (a.tr && a.tr.ru) || "", en: (a.tr && a.tr.en) || "" }];
    return { t: l.t, kr: l.kr, rom: a.rom || "", tr: a.tr || { ru: "", en: "" }, w };
  });

  // Куплеты по паузам, с переводом-склейкой и парой слов в тетрадь.
  const groups = groupVerses(built);
  const flat = built;
  const verses = groups.map((g) => {
    const lastIdx = flat.indexOf(g[g.length - 1]);
    const end = flat[lastIdx + 1] ? flat[lastIdx + 1].t : g[g.length - 1].t + 4;
    const vocab = [];
    for (const ln of g) for (const wd of ln.w) {
      if (vocab.length < 2 && wd.k && wd.k.length > 1 && !vocab.some((v) => v.kr === wd.k))
        vocab.push({ kr: wd.k, rom: wd.r, ru: wd.ru, en: wd.en });
    }
    return {
      end: +end.toFixed(2),
      tr: { ru: g.map((l) => l.tr.ru).filter(Boolean).join(" "), en: g.map((l) => l.tr.en).filter(Boolean).join(" ") },
      vocab,
      lines: g.map((l) => ({ t: l.t, w: l.w })),
    };
  });

  const ytId = await youtubeId(rec.artistName + " " + rec.trackName + " official");
  const song = {
    id: "usr_" + rec.id,
    title: rec.trackName + (/[가-힣]/.test(rec.trackName) ? "" : ""),
    artist: rec.artistName,
    ytId,
    duration: rec.duration,
    videoOffset: 0,
    level: { ru: "по песне", en: "from a song" },
    verses,
  };
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
      return res.status(200).json({ ok: true, results: await lrclibSearch(q) });
    }
    if (action === "build") return await handleBuild(req, res);
    return res.status(400).json({ error: "Неизвестный action" });
  } catch (e) {
    return res.status(500).json({ error: String(e?.message || e) });
  }
}
