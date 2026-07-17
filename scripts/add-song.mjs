// Локально: собрать песню (lrclib+LLM+клип) + выровнять синхрон (ASR) + положить в общий каталог.
// Использование: PY=/c/Python314/python node scripts/add-song.mjs "IU|Love wins all" "aespa|Supernova"
// Требует: FAL_KEY, DATABASE_URL в .env; yt-dlp (python -m yt_dlp).
import { readFileSync } from "fs";
import { execFileSync } from "child_process";
import os from "os";
import path from "path";
import pg from "pg";

const ENV = readFileSync(".env", "utf8");
const FAL = (ENV.match(/FAL_KEY=(.+)/) || [])[1].trim();
const DBURL = (ENV.match(/DATABASE_URL=(.+)/) || [])[1].trim().replace(/^["']|["']$/g, "");
const PY = process.env.PY || "python";
const MAX_LINES = 60; // почти вся песня; собираем чанками
const UA = { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)", "Accept-Language": "en-US" };

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
async function lrclibFind(artist, track) {
  const arr = await (await fetch("https://lrclib.net/api/search?q=" + encodeURIComponent(artist + " " + track), { headers: UA })).json();
  const ok = (arr || []).filter((x) => x.syncedLyrics && !x.instrumental && /[가-힣]/.test(x.syncedLyrics || ""));
  const bad = /remix|sped|slow|live|inst|acoustic|cover|karaoke|version/i;
  return ok.filter((x) => !bad.test(x.trackName || "") && !bad.test(x.albumName || ""))[0] || ok[0] || null;
}
async function annotateChunk(lines) {
  const prompt = "Korean song lines (index, then text):\n" + lines.map((l, i) => i + " " + l.kr).join("\n") +
    '\n\nReturn ONLY JSON: {"lines":[{"i":0,"w":[{"k":"","r":"","rr":"","ru":"","en":""}]}]}. ' +
    'One object per input line, same index. Split each line into meaningful words (keep particles attached). For each word: ' +
    'k=Korean; r=Latin romanization SYLLABLE-SEPARATED with hyphens (e.g. "an-nyeong-ha-se-yo"); ' +
    'rr=Russian Cyrillic transcription SYLLABLE-SEPARATED with hyphens, how a Russian would read it (e.g. "ан-нён-ха-се-ё"); ' +
    'ru=Russian meaning 1-2 words; en=English meaning 1-2 words. JSON only.';
  const d = await (await fetch("https://fal.run/fal-ai/any-llm", { method: "POST", headers: { Authorization: "Key " + FAL, "Content-Type": "application/json" }, body: JSON.stringify({ model: "anthropic/claude-haiku-4.5", system_prompt: "Korean lyrics annotator. Output ONLY minified JSON.", prompt }) })).json();
  let out = (d.output || "").trim().replace(/^```json?/i, "").replace(/```$/, "").trim();
  const m = out.match(/\{[\s\S]*\}/);
  return JSON.parse(m ? m[0] : out).lines || [];
}
async function annotate(lines) {
  const out = [];
  for (let i = 0; i < lines.length; i += 12) {
    const chunk = lines.slice(i, i + 12);
    let res = [];
    try { res = await annotateChunk(chunk); } catch (e) { console.log("   (чанк", i, "провал:", e.message + ")"); }
    for (const r of res) if (r && r.i != null) out[i + r.i] = r;
  }
  return out;
}
function groupVerses(lines) {
  const verses = []; let cur = [];
  for (let i = 0; i < lines.length; i++) { cur.push(lines[i]); const gap = i + 1 < lines.length ? lines[i + 1].t - lines[i].t : 99; if (gap > 3.5 || cur.length >= 4) { verses.push(cur); cur = []; } }
  if (cur.length) verses.push(cur); return verses;
}
async function youtubeId(q) {
  try { const html = await (await fetch("https://www.youtube.com/results?search_query=" + encodeURIComponent(q), { headers: UA })).text(); const m = html.match(/"videoId":"([\w-]{11})"/); return m ? m[1] : ""; } catch (e) { return ""; }
}
function firstKoreanAsrSec(ytId) {
  const out = path.join(os.tmpdir(), "align_" + ytId);
  try { execFileSync(PY, ["-m", "yt_dlp", "--skip-download", "--write-auto-subs", "--sub-langs", "ko", "--sub-format", "json3", "-o", out + ".%(ext)s", "https://www.youtube.com/watch?v=" + ytId], { stdio: "ignore", timeout: 60000 }); } catch (e) {}
  let j; try { j = JSON.parse(readFileSync(out + ".ko.json3", "utf8")); } catch (e) { return null; }
  const ev = (j.events || []).filter((e) => { if (!e.segs) return false; const txt = e.segs.map((s) => s.utf8 || "").join("").replace(/\[[^\]]*\]/g, "").trim(); return /[가-힣]/.test(txt); });
  return ev.length ? +(ev[0].tStartMs / 1000).toFixed(2) : null;
}

async function build(artist, track, db) {
  const rec = await lrclibFind(artist, track);
  if (!rec || !rec.syncedLyrics) return console.log("  ✗", artist, "-", track, "— нет синхро-текста с корейским");
  const lines = parseSynced(rec.syncedLyrics).slice(0, MAX_LINES);
  if (!lines.length) return console.log("  ✗", track, "— нет корейского текста");
  const ann = await annotate(lines);
  const built = lines.map((l, i) => { const a = ann[i] || {}; const w = Array.isArray(a.w) && a.w.length ? a.w : [{ k: l.kr, r: "", rr: "", ru: "", en: "" }]; return { t: l.t, kr: l.kr, w }; });
  const groups = groupVerses(built);
  const verses = groups.map((g) => { const li = built.indexOf(g[g.length - 1]); const end = built[li + 1] ? built[li + 1].t : g[g.length - 1].t + 4; const vocab = []; for (const ln of g) for (const wd of ln.w) if (vocab.length < 2 && wd.k && wd.k.length > 1 && !vocab.some((v) => v.kr === wd.k)) vocab.push({ kr: wd.k, rom: wd.r, rr: wd.rr, ru: wd.ru, en: wd.en }); return { end: +end.toFixed(2), tr: { ru: "", en: "" }, vocab, lines: g.map((l) => ({ t: l.t, w: l.w })) }; });
  const ytId = await youtubeId(rec.artistName + " " + rec.trackName + " official");
  const id = "usr_" + rec.id;
  const asr = ytId ? firstKoreanAsrSec(ytId) : null;
  const offset = asr != null ? +Math.max(0, asr - lines[0].t).toFixed(2) : 0;
  const song = { id, title: rec.trackName, artist: rec.artistName, ytId, duration: rec.duration, videoOffset: offset, level: { ru: "по песне", en: "from a song" }, verses };
  await db.query("insert into songs(id,title,artist,yt_id,duration,video_offset,aligned,data,added_by) values($1,$2,$3,$4,$5,$6,$7,$8,null) on conflict(id) do update set video_offset=excluded.video_offset,aligned=excluded.aligned,data=excluded.data", [id, song.title, song.artist, ytId, rec.duration, offset, asr != null, song]);
  console.log("  ✓", rec.artistName, "-", rec.trackName, "| клип", ytId, "| offset", offset + "с", asr != null ? "(выровнено)" : "(нет ASR → 0)");
}

const db = new pg.Client({ connectionString: DBURL, ssl: { rejectUnauthorized: false } });
await db.connect();
for (const pair of process.argv.slice(2)) { const [a, t] = pair.split("|"); await build(a.trim(), t.trim(), db); }
await db.end();
console.log("Готово.");
