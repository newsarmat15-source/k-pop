// Тест: изолировать вокал из уже готовой песни (без музыки), скормить его в LipSync
// для лучшей точности губ, потом подменить аудио готового видео обратно на полную песню.
// Запуск: node --env-file=.env scripts/test-vocal-isolation.mjs

import { writeFile, readFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import os from "node:os";
import ffmpegPath from "ffmpeg-static";

const FAL_KEY = process.env.FAL_KEY;
const ELEVEN_KEY = process.env.ELEVENLABS_API_KEY;
const TMP = os.tmpdir();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function log(...a) { console.log(new Date().toISOString().slice(11, 19), ...a); }

async function withRetry(fn, tries = 5) {
  let lastErr;
  for (let i = 0; i < tries; i++) {
    try { return await fn(); }
    catch (e) { lastErr = e; log(`  (retry ${i + 1}/${tries}: ${e.message})`); await sleep(3000); }
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

async function uploadToFalCdn(buf, contentType, fileName) {
  return withRetry(async () => {
    const initRes = await fetch("https://rest.alpha.fal.ai/storage/upload/initiate?storage_type=fal-cdn-v3", {
      method: "POST",
      headers: { Authorization: `Key ${FAL_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ content_type: contentType, file_name: fileName }),
    });
    if (!initRes.ok) throw new Error(`fal initiate ${initRes.status}: ${await initRes.text()}`);
    const { upload_url, file_url } = await initRes.json();
    const up = await fetch(upload_url, { method: "PUT", headers: { "Content-Type": contentType }, body: buf });
    if (!up.ok) throw new Error(`fal upload ${up.status}: ${await up.text()}`);
    return file_url;
  });
}

async function pollUntilComplete(app, requestId) {
  for (;;) {
    await sleep(5000);
    const d = await withRetry(async () => {
      const r = await fetch(`https://queue.fal.run/${app}/requests/${requestId}/status`, { headers: { Authorization: `Key ${FAL_KEY}` } });
      return r.json();
    });
    if (d.status === "COMPLETED") return;
    if (d.status === "ERROR" || d.status === "FAILED") throw new Error("job failed: " + JSON.stringify(d));
    log(`  status=${d.status}`);
  }
}
async function fetchVideoResult(app, requestId) {
  const d = await withRetry(async () => {
    const r = await fetch(`https://queue.fal.run/${app}/requests/${requestId}`, { headers: { Authorization: `Key ${FAL_KEY}` } });
    if (!r.ok) throw new Error(`result fetch ${r.status}: ${await r.text()}`);
    return r.json();
  });
  const url = d.video?.url || d.video;
  if (!url) throw new Error("no video url in result: " + JSON.stringify(d));
  return url;
}

async function runLipsync(videoUrl, audioUrl) {
  const data = await withRetry(async () => {
    const submit = await fetch("https://queue.fal.run/fal-ai/kling-video/lipsync/audio-to-video", {
      method: "POST",
      headers: { Authorization: `Key ${FAL_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ video_url: videoUrl, audio_url: audioUrl }),
    });
    const d = await submit.json();
    if (!submit.ok || !d.request_id) throw new Error("lipsync submit failed: " + JSON.stringify(d));
    return d;
  });
  log(`[lipsync submit] ${data.request_id}`);
  await pollUntilComplete("fal-ai/kling-video", data.request_id);
  const url = await fetchVideoResult("fal-ai/kling-video", data.request_id);
  log(`[lipsync done] ${url}`);
  return url;
}

async function downloadTo(url, filePath) {
  return withRetry(async () => {
    const r = await fetch(url);
    await writeFile(filePath, Buffer.from(await r.arrayBuffer()));
  });
}

async function isolateVocals(audioBuf) {
  const form = new FormData();
  form.append("audio", new Blob([audioBuf], { type: "audio/mpeg" }), "song.mp3");
  const r = await fetch("https://api.elevenlabs.io/v1/audio-isolation", {
    method: "POST",
    headers: { "xi-api-key": ELEVEN_KEY },
    body: form,
  });
  if (!r.ok) throw new Error(`audio-isolation ${r.status}: ${await r.text()}`);
  return Buffer.from(await r.arrayBuffer());
}

async function main() {
  // Уже готовые ресурсы с прошлых тестов: видео 1 (прошёл face detection) + его аудио-часть песни.
  const videoUrl = "https://v3b.fal.media/files/b/0aa16519/SL_i7sP9bXGtSvdP-OAR6_output.mp4";
  const fullSongUrl = "https://v3b.fal.media/files/b/0aa164c6/nGtm5FmGuc09BlyjNJXA8_seg1-audio.mp3";

  log("=== Скачиваю полную песню (с музыкой) ===");
  const fullSongPath = path.join(TMP, "iso-fullsong.mp3");
  await downloadTo(fullSongUrl, fullSongPath);
  const fullSongBuf = await readFile(fullSongPath);

  log("=== Изолирую вокал через ElevenLabs ===");
  const vocalsOnlyBuf = await withRetry(() => isolateVocals(fullSongBuf));
  const vocalsPath = path.join(TMP, "iso-vocals.mp3");
  await writeFile(vocalsPath, vocalsOnlyBuf);
  const vocalsUrl = await uploadToFalCdn(vocalsOnlyBuf, "audio/mpeg", "vocals-only.mp3");
  log("изолированный вокал загружен:", vocalsUrl);

  log("=== LipSync на изолированном вокале ===");
  const lipVocalsOnlyUrl = await runLipsync(videoUrl, vocalsUrl);
  const lipVocalsOnlyPath = path.join(TMP, "iso-lip-vocalsonly.mp4");
  await downloadTo(lipVocalsOnlyUrl, lipVocalsOnlyPath);

  log("=== Подменяю аудио обратно на полную песню (ffmpeg) ===");
  const outDir = path.join(process.cwd(), "test-output");
  const finalPath = path.join(outDir, `vocal_isolation_test_${Date.now()}.mp4`);
  await runFfmpeg([
    "-y",
    "-i", lipVocalsOnlyPath,
    "-i", fullSongPath,
    "-map", "0:v", "-map", "1:a",
    "-c:v", "copy", "-shortest",
    finalPath,
  ]);

  log("=== ГОТОВО ===", finalPath);
}

main().catch((e) => { console.error("[FATAL]", e); process.exit(1); });
