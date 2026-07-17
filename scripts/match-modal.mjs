// Берёт плотные ASR-слова от Modal (modal_align.py), привязывает наши известные
// слова песни (монотонное окно-совпадение по слогам) → абсолютный .t каждому слову.
// dry: печать % и примеров | write: записать в БД (data.wordAligned=true, offset=0).
// Использование: node scripts/match-modal.mjs <songId> <asr.json> [dry|write]
import { readFileSync } from "fs";
import pg from "pg";

const DBURL = (readFileSync(".env", "utf8").match(/DATABASE_URL=(.+)/) || [])[1].trim().replace(/^["']|["']$/g, "");
const [songId, asrFile, mode = "dry"] = process.argv.slice(2);

const asr = JSON.parse(readFileSync(asrFile, "utf8")).words; // [{kr,t}]
// оставляем и корейские слоги, и латиницу (англ. ад-либы) — оба размечаем
const norm = (s) => (s || "").toLowerCase().replace(/[^가-힣a-z]/g, "");
function sim(a, b) {
  a = norm(a); b = norm(b);
  if (!a || !b) return 0;
  if (a === b) return 1;
  const bs = b.split(""); let c = 0;
  for (const ch of a.split("")) { const i = bs.indexOf(ch); if (i >= 0) { c++; bs.splice(i, 1); } }
  return c / Math.max(a.length, b.length);
}
function alignWords(ourW, asrW) {
  const times = new Array(ourW.length).fill(null);
  let j = 0, matched = 0;
  for (let i = 0; i < ourW.length; i++) {
    let best = -1, bs = 0.5;
    for (let k = j; k < Math.min(asrW.length, j + 30); k++) { const s = sim(ourW[i], asrW[k].kr); if (s > bs) { bs = s; best = k; } }
    if (best >= 0) { times[i] = asrW[best].t; j = best + 1; matched++; }
  }
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

const db = new pg.Client({ connectionString: DBURL, ssl: { rejectUnauthorized: false } });
await db.connect();
const { rows } = await db.query("select id,title,data from songs where id=$1", [songId]);
if (!rows.length) { console.log("нет песни", songId); process.exit(1); }
const song = rows[0].data;
const refs = songWords(song);
const { times, matched } = alignWords(refs.map((w) => w.k), asr);
const pct = Math.round((matched / refs.length) * 100);
console.log(`${rows[0].title} — наших слов ${refs.length}, ASR-слов ${asr.length}, совпало ${matched} (${pct}%)`);
console.log(`t[0]=${times[0]}  t[конец]=${times[times.length - 1]}  ASR-конец=${asr[asr.length - 1]?.t}`);
console.log("Первые 12 слов (наше → t):");
for (let i = 0; i < Math.min(12, refs.length); i++) console.log(`  ${refs[i].k}  → ${times[i]}`);
if (mode === "write" && pct >= 40) {
  refs.forEach((w, i) => { if (times[i] != null) w.t = times[i]; });
  song.videoOffset = 0;
  song.wordAligned = true;
  await db.query("update songs set data=$1, aligned=true, video_offset=0 where id=$2", [song, songId]);
  console.log("✓ записано пословно в БД");
}
await db.end();
