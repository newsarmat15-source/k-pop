// Воркер синхронизации: считает videoOffset клипа по корейской ASR-дорожке YouTube.
// Идея (проверена на Spring Day): первый вокал в ASR клипа - первая строка в наших
// таймингах (альбом) = сдвиг клипа. yt-dlp обходит защиту субтитров.
//
// Режимы:
//   node scripts/align-songs.mjs              — обработать все aligned=false в БД
//   node scripts/align-songs.mjs test <ytId> <firstLineSec>  — тест на одном клипе
//
// Требует: yt-dlp (python -m yt_dlp), pg, DATABASE_URL в .env.
import { readFileSync } from "fs";
import { execFileSync } from "child_process";
import os from "os";
import path from "path";
import pg from "pg";

const DBURL = (readFileSync(".env", "utf8").match(/DATABASE_URL=(.+)/) || [])[1].trim().replace(/^["']|["']$/g, "");
const TMP = os.tmpdir();
const PY = process.env.PY || "python";

// Достаём корейскую ASR-дорожку клипа, возвращаем время (сек) первого корейского события.
function firstKoreanAsrSec(ytId) {
  const out = path.join(TMP, "align_" + ytId);
  try {
    execFileSync(PY, ["-m", "yt_dlp", "--skip-download", "--write-auto-subs", "--sub-langs", "ko",
      "--sub-format", "json3", "-o", out + ".%(ext)s", "https://www.youtube.com/watch?v=" + ytId],
      { stdio: "ignore", timeout: 60000 });
  } catch (e) { /* yt-dlp варнит про ffmpeg — субтитры всё равно качает */ }
  let j;
  try { j = JSON.parse(readFileSync(out + ".ko.json3", "utf8")); } catch (e) { return null; }
  // Пропускаем аннотации в скобках ([음악] музыка, [박수] аплодисменты) — это не вокал.
  const ev = (j.events || []).filter((e) => {
    if (!e.segs) return false;
    const txt = e.segs.map((s) => s.utf8 || "").join("").replace(/\[[^\]]*\]/g, "").trim();
    return /[가-힣]/.test(txt);
  });
  return ev.length ? +(ev[0].tStartMs / 1000).toFixed(2) : null;
}

function computeOffset(ytId, firstLineSec) {
  const asr = firstKoreanAsrSec(ytId);
  if (asr == null) return null;
  return +Math.max(0, asr - firstLineSec).toFixed(2);
}

async function runDB() {
  const c = new pg.Client({ connectionString: DBURL, ssl: { rejectUnauthorized: false } });
  await c.connect();
  const { rows } = await c.query("select id, data from songs where aligned = false");
  console.log("Песен к обработке:", rows.length);
  for (const row of rows) {
    const song = row.data;
    const ytId = song.ytId;
    const firstT = song?.verses?.[0]?.lines?.[0]?.t;
    if (!ytId || firstT == null) { console.log("  skip", row.id, "(нет ytId/тайминга)"); continue; }
    const off = computeOffset(ytId, firstT);
    if (off == null) { console.log("  ✗", row.id, "— нет ASR-дорожки, offset не посчитан"); continue; }
    song.videoOffset = off;
    await c.query("update songs set video_offset = $1, aligned = true, data = $2 where id = $3", [off, song, row.id]);
    console.log("  ✓", row.id, song.title, "→ offset", off + "с");
  }
  await c.end();
}

const [mode, ytId, firstSec] = process.argv.slice(2);
if (mode === "test") {
  console.log("offset для", ytId, "=", computeOffset(ytId, parseFloat(firstSec)), "сек");
} else {
  runDB().catch((e) => { console.error("FAIL:", e.message); process.exit(1); });
}
