// Объективная проверка синхрона: независимый Whisper слушает клип (asr), сравниваем
// его тайминги с нашей forced-привязкой из БД. Медиана |Δt| = оценка ошибки без слуха.
// node scripts/validate.mjs <songId|title>   (PY, Deno в PATH)
import { readFileSync, writeFileSync, existsSync, rmSync } from "fs";
import { execFileSync } from "child_process";
import os from "os";
import path from "path";
import pg from "pg";

const DBURL = (readFileSync(".env", "utf8").match(/DATABASE_URL=(.+)/) || [])[1].trim().replace(/^["']|["']$/g, "");
const PY = process.env.PY || "python";
const key = process.argv.slice(2).join(" ");

const norm = (s) => (s || "").toLowerCase().replace(/[^가-힣a-z]/g, "");
function sim(a, b) { a = norm(a); b = norm(b); if (!a || !b) return 0; if (a === b) return 1; const bs = b.split(""); let c = 0; for (const ch of a.split("")) { const i = bs.indexOf(ch); if (i >= 0) { c++; bs.splice(i, 1); } } return c / Math.max(a.length, b.length); }

function dl(ytId) {
  const out = path.join(os.tmpdir(), "val_" + ytId + ".m4a");
  if (existsSync(out)) return out;
  execFileSync(PY, ["-m", "yt_dlp", "-f", "bestaudio[ext=m4a]/bestaudio", "-o", out, "--no-playlist", "https://www.youtube.com/watch?v=" + ytId], { stdio: "ignore", timeout: 120000 });
  return out;
}
function runAsr(audioPath) {
  const raw = execFileSync(PY, ["-m", "modal", "run", "scripts/modal_align.py::check", "--audio", audioPath, "--lang", "ko"],
    { encoding: "utf8", timeout: 900000, env: { ...process.env, PYTHONIOENCODING: "utf-8", PYTHONUTF8: "1" }, maxBuffer: 64 * 1024 * 1024 });
  const line = raw.split("\n").find((l) => l.includes("RESULT_JSON:"));
  if (!line) throw new Error("нет RESULT_JSON");
  return JSON.parse(line.slice(line.indexOf("RESULT_JSON:") + 12)).words;
}

const db = new pg.Client({ connectionString: DBURL, ssl: { rejectUnauthorized: false } });
await db.connect();
const { rows } = await db.query("select id,title,data from songs where id=$1 or title=$1", [key]);
if (!rows.length) { console.log("нет песни", key); process.exit(1); }
const song = rows[0].data;
const ours = [];
for (const v of song.verses || []) for (const ln of v.lines || []) for (const w of ln.w || []) ours.push({ k: w.k, t: w.t });

console.log(`▶ ${rows[0].title}: качаю + независимый ASR…`);
const audio = dl(song.ytId);
const asr = runAsr(audio);
rmSync(audio, { force: true });
console.log(`  наших слов ${ours.length}, ASR-слов ${asr.length}`);

// монотонное сопоставление ASR→наши по тексту, дельта времени
const deltas = [];
let j = 0;
for (const a of asr) {
  let best = -1, bs = 0.6;
  for (let k = Math.max(0, j - 3); k < Math.min(ours.length, j + 25); k++) { const s = sim(a.kr, ours[k].k); if (s > bs) { bs = s; best = k; } }
  if (best >= 0) { deltas.push({ t_asr: a.t, t_our: ours[best].t, d: +(ours[best].t - a.t).toFixed(2), kr: ours[best].k }); j = best + 1; }
}
deltas.sort((x, y) => x.t_asr - y.t_asr);
const ds = deltas.map((x) => x.d).sort((a, b) => a - b);
const med = ds.length ? ds[Math.floor(ds.length / 2)] : NaN;
const absd = ds.map(Math.abs).sort((a, b) => a - b);
const medAbs = absd.length ? absd[Math.floor(absd.length / 2)] : NaN;
const p90 = absd.length ? absd[Math.floor(absd.length * 0.9)] : NaN;
console.log(`  совпало ${deltas.length} слов | медиана Δ(наш−asr) ${med}с | медиана |Δ| ${medAbs}с | p90 |Δ| ${p90}с`);
console.log("  худшие 12 (t_asr | наш_t | Δ | слово):");
deltas.slice().sort((a, b) => Math.abs(b.d) - Math.abs(a.d)).slice(0, 12).forEach((x) => console.log(`    ${x.t_asr}\t${x.t_our}\t${x.d >= 0 ? "+" : ""}${x.d}\t${x.kr}`));
await db.end();
