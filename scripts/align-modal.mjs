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

function downloadAudio(ytId) {
  const out = path.join(os.tmpdir(), "clip_" + ytId + ".m4a");
  if (existsSync(out)) rmSync(out);
  execFileSync(PY, ["-m", "yt_dlp", "-f", "bestaudio[ext=m4a]/bestaudio", "-o", out, "--no-playlist",
    "https://www.youtube.com/watch?v=" + ytId], { stdio: "ignore", timeout: 120000 });
  return out;
}

function runModal(audioPath, lines) {
  const lf = path.join(os.tmpdir(), "lines_" + Date.now() + ".json");
  writeFileSync(lf, JSON.stringify(lines), "utf8");
  const raw = execFileSync(PY, ["-m", "modal", "run", "scripts/modal_align.py",
    "--audio", audioPath, "--lines", lf, "--lang", "kor"],
    { encoding: "utf8", timeout: 900000, env: { ...process.env, PYTHONIOENCODING: "utf-8", PYTHONUTF8: "1" }, maxBuffer: 64 * 1024 * 1024 });
  rmSync(lf, { force: true });
  const line = raw.split("\n").find((l) => l.includes("RESULT_JSON:"));
  if (!line) throw new Error("нет RESULT_JSON в выводе Modal");
  return JSON.parse(line.slice(line.indexOf("RESULT_JSON:") + "RESULT_JSON:".length));
}

// плоский список слов + строки со структурой (альбомный тайминг + слова), один порядок
function songData(song) {
  const refs = [];
  const lines = [];
  for (const v of song.verses || []) for (const ln of v.lines || []) {
    lines.push({ t: ln.t || 0, w: (ln.w || []).map((w) => w.k) });
    for (const w of ln.w || []) refs.push(w);
  }
  return { refs, lines };
}

const db = new pg.Client({ connectionString: DBURL, ssl: { rejectUnauthorized: false } });
await db.connect();
const q = target === "all" ? "select id,title,data from songs order by title" : "select id,title,data from songs where id=$1";
const { rows } = await db.query(q, target === "all" ? [] : [target]);
if (!rows.length) { console.log("нет песен по запросу", target); process.exit(1); }

for (const row of rows) {
  const song = row.data;
  const ytId = song.ytId;
  const { refs, lines } = songData(song);
  if (!ytId || !refs.length) { console.log("✗", row.title, "— нет ytId/слов"); continue; }
  try {
    console.log(`▶ ${row.title} (${ytId}) — качаю аудио…`);
    const audio = downloadAudio(ytId);
    console.log(`  выравниваю на Modal (${refs.length} слов, ${lines.length} строк, 2 прохода)…`);
    const res = runModal(audio, lines);
    const W = res.words;
    if (W.length !== refs.length) console.log(`  ⚠ длины не сошлись: слов ${refs.length}, вернулось ${W.length}`);
    let back = 0;
    for (let i = 1; i < W.length; i++) if (W[i].t < W[i - 1].t - 0.01) back++;
    refs.forEach((w, i) => { if (W[i]) { w.t = W[i].t; w.te = W[i].te; } });
    song.videoOffset = 0;
    song.wordAligned = true;
    await db.query("update songs set data=$1, aligned=true, video_offset=0 where id=$2", [song, row.id]);
    rmSync(audio, { force: true });
    console.log(`  ✓ ${row.title}: ${refs.length} слов, обратных скачков ${back}, низкой уверенности ${res.lowconf}, t[0]=${W[0]?.t}, t[конец]=${W[W.length - 1]?.t}`);
  } catch (e) {
    console.log(`  ✗ ${row.title}: ${e.message}`);
  }
}
await db.end();
console.log("Готово.");
