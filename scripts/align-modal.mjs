// Полный пайплайн синхрона (путь B, forced alignment под клип) через Modal.
// Для песни из БД: качает аудио клипа локально (резид. IP) → Modal CTC-выравнивает
// наши известные слова → пословный абсолютный .t → пишет в БД (wordAligned=true).
//
// node scripts/align-modal.mjs <songId|all>        # all = все песни каталога
//   PY=/c/Python314/python   (yt-dlp + modal там)
import { readFileSync, writeFileSync, existsSync, rmSync } from "fs";
import { execFileSync } from "child_process";
import os from "os";
import path from "path";
import pg from "pg";

const DBURL = (readFileSync(".env", "utf8").match(/DATABASE_URL=(.+)/) || [])[1].trim().replace(/^["']|["']$/g, "");
const PY = process.env.PY || "python";
const target = process.argv[2] || "all";

const clean = (s) => (s || "").toLowerCase().replace(/[^가-힣a-z0-9]/g, "");
function mapTimes(inp, out) {
  const times = new Array(inp.length).fill(null);
  const ends = new Array(inp.length).fill(null);
  let j = 0;
  for (let i = 0; i < inp.length; i++) {
    const t = clean(inp[i]);
    if (!t) { times[i] = j < out.length ? out[j].t : (times[i - 1] ?? 0); ends[i] = j < out.length ? out[j].end : times[i]; continue; }
    let acc = "", start = null, end = null;
    while (j < out.length) { if (start === null) start = out[j].t; end = out[j].end; acc += clean(out[j].kr); j++; if (acc.length >= t.length) break; }
    times[i] = start != null ? start : (times[i - 1] ?? 0);
    ends[i] = end != null ? end : times[i];
  }
  return { times, ends };
}

function downloadAudio(ytId) {
  const out = path.join(os.tmpdir(), "clip_" + ytId + ".m4a");
  if (existsSync(out)) rmSync(out);
  execFileSync(PY, ["-m", "yt_dlp", "-f", "bestaudio[ext=m4a]/bestaudio", "-o", out, "--no-playlist",
    "https://www.youtube.com/watch?v=" + ytId], { stdio: "ignore", timeout: 120000 });
  return out;
}

function runModal(audioPath, words) {
  const wf = path.join(os.tmpdir(), "words_" + Date.now() + ".json");
  writeFileSync(wf, JSON.stringify(words), "utf8");
  const raw = execFileSync(PY, ["-m", "modal", "run", "scripts/modal_align.py",
    "--audio", audioPath, "--words", wf, "--lang", "kor"],
    { encoding: "utf8", timeout: 900000, env: { ...process.env, PYTHONIOENCODING: "utf-8", PYTHONUTF8: "1" }, maxBuffer: 64 * 1024 * 1024 });
  rmSync(wf, { force: true });
  const line = raw.split("\n").find((l) => l.includes("RESULT_JSON:"));
  if (!line) throw new Error("нет RESULT_JSON в выводе Modal");
  return JSON.parse(line.slice(line.indexOf("RESULT_JSON:") + "RESULT_JSON:".length));
}

function songWords(song) {
  const refs = [];
  for (const v of song.verses || []) for (const ln of v.lines || []) for (const w of ln.w || []) refs.push(w);
  return refs;
}

const db = new pg.Client({ connectionString: DBURL, ssl: { rejectUnauthorized: false } });
await db.connect();
const q = target === "all" ? "select id,title,data from songs order by title" : "select id,title,data from songs where id=$1";
const { rows } = await db.query(q, target === "all" ? [] : [target]);
if (!rows.length) { console.log("нет песен по запросу", target); process.exit(1); }

for (const row of rows) {
  const song = row.data;
  const ytId = song.ytId;
  const refs = songWords(song);
  if (!ytId || !refs.length) { console.log("✗", row.title, "— нет ytId/слов"); continue; }
  try {
    console.log(`▶ ${row.title} (${ytId}) — качаю аудио…`);
    const audio = downloadAudio(ytId);
    console.log(`  выравниваю на Modal (${refs.length} слов)…`);
    const res = runModal(audio, refs.map((w) => w.k));
    const { times, ends } = mapTimes(refs.map((w) => w.k), res.words);
    let back = 0;
    for (let i = 1; i < times.length; i++) if (times[i] < times[i - 1] - 0.01) back++;
    refs.forEach((w, i) => { if (times[i] != null) w.t = times[i]; if (ends[i] != null) w.te = ends[i]; });
    song.videoOffset = 0;
    song.wordAligned = true;
    await db.query("update songs set data=$1, aligned=true, video_offset=0 where id=$2", [song, row.id]);
    rmSync(audio, { force: true });
    console.log(`  ✓ ${row.title}: ${refs.length} слов, CTC-токенов ${res.words.length}, обратных скачков ${back}, t[0]=${times[0]}, t[конец]=${times[times.length - 1]}`);
  } catch (e) {
    console.log(`  ✗ ${row.title}: ${e.message}`);
  }
}
await db.end();
console.log("Готово.");
