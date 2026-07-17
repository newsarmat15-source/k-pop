// Пословное выравнивание: берём тайминги КАЖДОГО слова из ASR клипа (segs.tOffsetMs)
// и привязываем к ним наши чистые слова. Убирает и колебание, и нарастающий сдвиг.
// Режимы: dry (печать % совпадения) | write (записать t каждому слову в БД).
import { readFileSync } from "fs";
import { execFileSync } from "child_process";
import os from "os";
import path from "path";
import pg from "pg";

const DBURL = (readFileSync(".env", "utf8").match(/DATABASE_URL=(.+)/) || [])[1].trim().replace(/^["']|["']$/g, "");
const PY = process.env.PY || "python";

function getAsrWords(ytId) {
  const out = path.join(os.tmpdir(), "aw_" + ytId);
  try { execFileSync(PY, ["-m", "yt_dlp", "--skip-download", "--write-auto-subs", "--sub-langs", "ko", "--sub-format", "json3", "-o", out + ".%(ext)s", "https://www.youtube.com/watch?v=" + ytId], { stdio: "ignore", timeout: 60000 }); } catch (e) {}
  let j; try { j = JSON.parse(readFileSync(out + ".ko.json3", "utf8")); } catch (e) { return []; }
  const words = [];
  for (const e of j.events || []) {
    if (!e.segs) continue;
    const base = e.tStartMs || 0;
    for (const s of e.segs) {
      const w = (s.utf8 || "").replace(/\[[^\]]*\]/g, "").trim();
      if (/[가-힣]/.test(w)) words.push({ kr: w, t: +((base + (s.tOffsetMs || 0)) / 1000).toFixed(2) });
    }
  }
  return words;
}
const norm = (s) => (s || "").replace(/[^가-힣]/g, "");
function sim(a, b) {
  a = norm(a); b = norm(b);
  if (!a || !b) return 0;
  if (a === b) return 1;
  const bs = b.split(""); let c = 0;
  for (const ch of a.split("")) { const i = bs.indexOf(ch); if (i >= 0) { c++; bs.splice(i, 1); } }
  return c / Math.max(a.length, b.length);
}
// Монотонное окно-выравнивание: каждому нашему слову ищем совпадение впереди в ASR.
function alignWords(ourW, asrW) {
  const times = new Array(ourW.length).fill(null);
  let j = 0, matched = 0;
  for (let i = 0; i < ourW.length; i++) {
    let best = -1, bs = 0.45;
    for (let k = j; k < Math.min(asrW.length, j + 7); k++) { const s = sim(ourW[i], asrW[k].kr); if (s > bs) { bs = s; best = k; } }
    if (best >= 0) { times[i] = asrW[best].t; j = best + 1; matched++; }
  }
  // интерполяция пропусков между привязанными + экстраполяция краёв
  const idx = times.map((t, i) => (t != null ? i : -1)).filter((i) => i >= 0);
  if (idx.length >= 2) {
    for (let i = 0; i < times.length; i++) {
      if (times[i] != null) continue;
      let lo = null, hi = null;
      for (const k of idx) { if (k < i) lo = k; if (k > i) { hi = k; break; } }
      if (lo != null && hi != null) times[i] = +(times[lo] + (times[hi] - times[lo]) * (i - lo) / (hi - lo)).toFixed(2);
      else if (lo != null) times[i] = +(times[lo] + 0.3 * (i - lo)).toFixed(2);
      else if (hi != null) times[i] = +(times[hi] - 0.3 * (hi - i)).toFixed(2);
    }
  }
  return { times, matched };
}
function songWords(song) {
  const refs = [];
  for (const v of song.verses || []) for (const ln of v.lines || []) for (const w of ln.w || []) refs.push(w);
  return refs;
}

const mode = process.argv[2] || "dry";
const db = new pg.Client({ connectionString: DBURL, ssl: { rejectUnauthorized: false } });
await db.connect();
const { rows } = await db.query("select id,data from songs");
for (const row of rows) {
  const song = row.data; const refs = songWords(song);
  const asr = getAsrWords(song.ytId);
  if (!asr.length) { console.log("✗", song.title, "— нет ASR"); continue; }
  const { times, matched } = alignWords(refs.map((w) => w.k), asr);
  const pct = Math.round((matched / refs.length) * 100);
  console.log(`${song.title} — слов ${refs.length}, ASR-слов ${asr.length}, совпало ${matched} (${pct}%), t[0]=${times[0]}, t[конец]=${times[times.length - 1]}`);
  if (mode === "write" && pct >= 40) {
    refs.forEach((w, i) => { if (times[i] != null) w.t = times[i]; });
    song.videoOffset = 0; // тайминги уже абсолютные по клипу
    song.wordAligned = true;
    await db.query("update songs set data=$1, aligned=true, video_offset=0 where id=$2", [song, row.id]);
    console.log("   ✓ записано пословно");
  }
}
await db.end();
console.log("Готово (" + mode + ").");
