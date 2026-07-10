// Тест: Sync LipSync (отдельная специализированная модель, не Kling LipSync) на свежем
// 15-секундном видео Kling без родного липсинка + полной песне. Проверяем: (1) примет ли
// он 15с вообще, (2) держит ли губы на границах клипа лучше, чем Kling LipSync.
// Запуск: node --env-file=.env scripts/test-sync-lipsync.mjs

import { writeFile, readFile } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import { buffer as streamToBuffer } from "node:stream/consumers";

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

async function generateVideo15s(imageUrl, prompt) {
  const data = await withRetry(async () => {
    const submit = await fetch("https://queue.fal.run/fal-ai/kling-video/v3/standard/image-to-video", {
      method: "POST",
      headers: { Authorization: `Key ${FAL_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, start_image_url: imageUrl, duration: "15", generate_audio: false }),
    });
    const d = await submit.json();
    if (!submit.ok || !d.request_id) throw new Error("video submit failed: " + JSON.stringify(d));
    return d;
  });
  log(`[video submit] ${data.request_id}`);
  await pollUntilComplete("fal-ai/kling-video", data.request_id);
  const url = await fetchVideoResult("fal-ai/kling-video", data.request_id);
  log(`[video done] ${url}`);
  return url;
}

async function runSyncLipsync(videoUrl, audioUrl) {
  const data = await withRetry(async () => {
    const submit = await fetch("https://queue.fal.run/fal-ai/sync-lipsync/v2", {
      method: "POST",
      headers: { Authorization: `Key ${FAL_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "lipsync-2", video_url: videoUrl, audio_url: audioUrl, sync_mode: "cut_off" }),
    });
    const d = await submit.json();
    if (!submit.ok || !d.request_id) throw new Error("sync-lipsync submit failed: " + JSON.stringify(d));
    return d;
  });
  log(`[sync-lipsync submit] ${data.request_id}`);
  await pollUntilComplete("fal-ai/sync-lipsync", data.request_id);
  const url = await fetchVideoResult("fal-ai/sync-lipsync", data.request_id);
  log(`[sync-lipsync done] ${url}`);
  return url;
}

async function downloadTo(url, filePath) {
  return withRetry(async () => {
    const r = await fetch(url);
    await writeFile(filePath, Buffer.from(await r.arrayBuffer()));
  });
}

async function main() {
  const IMAGE_URL = "https://k-pop-black.vercel.app/idols/idol14.jpg";
  const clipScene = "fierce K-pop girl-crush stage, dark set, dramatic moving spotlights, neon rim light, cinematic haze";
  const danceStyle = "athletic powerful choreography, precise sharp moves, crisp synchronized lines, direct attitude";

  log("=== Песня на 15с ===");
  const elevenlabs = new ElevenLabsClient({ apiKey: ELEVEN_KEY });
  const track = await elevenlabs.music.compose({
    prompt:
      "Upbeat K-pop chorus hook, powerful vocals singing in Korean, fierce girl-crush energy, " +
      "catchy, lyric-dense, modern K-pop production, confident mood, continuous singing throughout.",
    musicLengthMs: 15000,
    modelId: "music_v2",
  });
  const songBuf = Buffer.isBuffer(track) ? track : await streamToBuffer(track);
  const songUrl = await uploadToFalCdn(songBuf, "audio/mpeg", "sync-test-song.mp3");
  log("песня загружена:", songUrl);

  log("=== Видео 15с, без родного липсинка ===");
  const prompt =
    `This is YUNA, a K-pop idol, performing a dance routine. Keep her face and identity exactly consistent with ` +
    `the reference image. Scene: ${clipScene}. Dance style: ${danceStyle}. ` +
    "Dynamic solo performance with varied choreography and camera angles throughout the full routine.";
  const videoUrl = await generateVideo15s(IMAGE_URL, prompt);

  log("=== Sync LipSync поверх 15-секундного видео ===");
  const finalUrl = await runSyncLipsync(videoUrl, songUrl);

  const outDir = path.join(process.cwd(), "test-output");
  const finalPath = path.join(outDir, `sync_lipsync_15s_${Date.now()}.mp4`);
  await downloadTo(finalUrl, finalPath);

  log("=== ГОТОВО ===", finalPath);
}

main().catch((e) => { console.error("[FATAL]", e); process.exit(1); });
