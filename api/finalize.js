// StageOne — финальная обрезка готового LipSync-видео: срезает начало/конец, где
// изображение может замирать/рот не двигаться (задокументированный boundary-артефакт
// LipSync-моделей, см. PROGRESS.md). Не чинит причину, просто не показывает зрителю
// плохой кусок. Асимметрично — в начале проблема сильнее выражена, чем в конце.
import { writeFile, readFile, unlink } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import os from "node:os";
import ffmpegPath from "ffmpeg-static";

const TRIM_START_SEC = 1.8;
const TRIM_END_SEC = 0.8;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function withRetry(fn, tries = 4) {
  let lastErr;
  for (let i = 0; i < tries; i++) {
    try { return await fn(); }
    catch (e) { lastErr = e; await sleep(2000); }
  }
  throw lastErr;
}

function runFfmpeg(args) {
  return new Promise((resolve, reject) => {
    const p = spawn(ffmpegPath, args);
    let stderr = "";
    p.stderr.on("data", (d) => { stderr += d.toString(); });
    p.on("error", reject);
    p.on("close", (code) => (code !== 0 ? reject(new Error(`ffmpeg exit ${code}: ${stderr.slice(-500)}`)) : resolve(stderr)));
  });
}

async function getDurationSec(filePath) {
  const stderr = await runFfmpeg(["-i", filePath, "-f", "null", "-"]).catch((e) => e.message);
  const m = stderr.match(/Duration:\s*(\d+):(\d+):(\d+\.\d+)/);
  return m ? (+m[1]) * 3600 + (+m[2]) * 60 + parseFloat(m[3]) : null;
}

async function uploadToFalCdn(buf, falKey, contentType, fileName) {
  return withRetry(async () => {
    const initRes = await fetch("https://rest.alpha.fal.ai/storage/upload/initiate?storage_type=fal-cdn-v3", {
      method: "POST",
      headers: { Authorization: `Key ${falKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ content_type: contentType, file_name: fileName }),
    });
    if (!initRes.ok) throw new Error(`fal storage initiate ${initRes.status}: ${await initRes.text()}`);
    const { upload_url, file_url } = await initRes.json();
    const up = await fetch(upload_url, { method: "PUT", headers: { "Content-Type": contentType }, body: buf });
    if (!up.ok) throw new Error(`fal storage upload ${up.status}: ${await up.text()}`);
    return file_url;
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST" });
  const FAL_KEY = process.env.FAL_KEY;
  if (!FAL_KEY) return res.status(500).json({ error: "FAL_KEY не задан" });

  const tag = Date.now();
  const inPath = path.join(os.tmpdir(), `finalize-in-${tag}.mp4`);
  const outPath = path.join(os.tmpdir(), `finalize-out-${tag}.mp4`);

  try {
    const { videoUrl } = req.body || {};
    if (!videoUrl) return res.status(400).json({ error: "Нужен videoUrl" });

    const buf = await withRetry(async () => {
      const r = await fetch(videoUrl);
      if (!r.ok) throw new Error(`не удалось скачать videoUrl: ${r.status}`);
      return Buffer.from(await r.arrayBuffer());
    });
    await writeFile(inPath, buf);

    const totalSec = await getDurationSec(inPath);
    if (!totalSec || totalSec <= TRIM_START_SEC + TRIM_END_SEC + 1) {
      // видео слишком короткое, чтобы безопасно резать — отдаём как есть
      return res.status(200).json({ ok: true, videoUrl });
    }
    const cutDuration = totalSec - TRIM_START_SEC - TRIM_END_SEC;

    await runFfmpeg(["-y", "-i", inPath, "-ss", String(TRIM_START_SEC), "-t", String(cutDuration), "-c", "copy", outPath]);
    const trimmedBuf = await readFile(outPath);
    const finalUrl = await uploadToFalCdn(trimmedBuf, FAL_KEY, "video/mp4", `finalized-${tag}.mp4`);

    return res.status(200).json({ ok: true, videoUrl: finalUrl });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e?.message || e) });
  } finally {
    await unlink(inPath).catch(() => {});
    await unlink(outPath).catch(() => {});
  }
}
