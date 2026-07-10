// Продолжение test-multisegment.mjs с шага 3 — видео 1 и аудио уже готовы, не тратим деньги повторно.
// Добавлены повторные попытки на сетевые сбои (та же причина "fetch failed", что ловили раньше).
// Запуск: node --env-file=.env scripts/test-multisegment-resume.mjs

import { writeFile, readFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import os from "node:os";
import ffmpegPath from "ffmpeg-static";

const FAL_KEY = process.env.FAL_KEY;
const TMP = os.tmpdir();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function log(...a) { console.log(new Date().toISOString().slice(11, 19), ...a); }

async function withRetry(fn, tries = 5) {
  let lastErr;
  for (let i = 0; i < tries; i++) {
    try { return await fn(); }
    catch (e) { lastErr = e; log(`  (retry ${i + 1}/${tries} after error: ${e.message})`); await sleep(3000); }
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
    return r.json();
  });
  return d.video?.url || d.video;
}

async function generateVideoSegment(imageUrl, prompt) {
  const data = await withRetry(async () => {
    const submit = await fetch("https://queue.fal.run/fal-ai/kling-video/v3/standard/image-to-video", {
      method: "POST",
      headers: { Authorization: `Key ${FAL_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, start_image_url: imageUrl, duration: "10", generate_audio: false }),
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

async function main() {
  // Уже готово с прошлого запуска:
  const video1Url = "https://v3b.fal.media/files/b/0aa164dc/jvpSVRcc1pKT3_XiV9wMt_output.mp4";
  const seg1AudioUrl = "https://v3b.fal.media/files/b/0aa164c6/nGtm5FmGuc09BlyjNJXA8_seg1-audio.mp3";
  const seg2AudioUrl = "https://v3b.fal.media/files/b/0aa164c6/gqh71njHfNjRzYCsf_Yem_seg2-audio.mp3";

  const clipScene = "fierce K-pop girl-crush stage, dark set, dramatic moving spotlights, neon rim light, cinematic haze";
  const danceStyle = "athletic powerful choreography, precise sharp moves, crisp synchronized lines, direct attitude";

  log("=== Скачиваю видео 1 ===");
  const video1Path = path.join(TMP, "seg1-video.mp4");
  await downloadTo(video1Url, video1Path);

  log("=== Извлекаю последний кадр ===");
  const lastFramePath = path.join(TMP, "seg1-lastframe.jpg");
  await runFfmpeg(["-y", "-sseof", "-0.2", "-i", video1Path, "-frames:v", "1", "-q:v", "2", lastFramePath]);
  const lastFrameUrl = await uploadToFalCdn(await readFile(lastFramePath), "image/jpeg", "seg1-lastframe.jpg");
  log("last frame uploaded:", lastFrameUrl);

  log("=== Видео-кусок 2 (продолжение) ===");
  const prompt2 =
    `This is the SAME K-pop idol, continuing directly from a mid-turn pose (arms extended, spinning) into the next ` +
    `phase of the dance routine — do not reset her pose, continue the motion smoothly. Scene: ${clipScene}. ` +
    `Dance style: ${danceStyle}. She completes the turn and flows into the high-energy chorus peak choreography, ` +
    "building to a strong finishing pose in the final frame.";
  const video2Url = await generateVideoSegment(lastFrameUrl, prompt2);
  const video2Path = path.join(TMP, "seg2-video.mp4");
  await downloadTo(video2Url, video2Path);

  log("=== LipSync кусок 1 ===");
  const lip1Url = await runLipsync(video1Url, seg1AudioUrl);
  const lip1Path = path.join(TMP, "seg1-lipsync.mp4");
  await downloadTo(lip1Url, lip1Path);

  log("=== LipSync кусок 2 ===");
  const lip2Url = await runLipsync(video2Url, seg2AudioUrl);
  const lip2Path = path.join(TMP, "seg2-lipsync.mp4");
  await downloadTo(lip2Url, lip2Path);

  log("=== Склейка ===");
  const listPath = path.join(TMP, "concat-list.txt");
  const listContent = [lip1Path, lip2Path].map((p) => `file '${p.replace(/\\/g, "/")}'`).join("\n");
  await writeFile(listPath, listContent);
  const outDir = path.join(process.cwd(), "test-output");
  const finalPath = path.join(outDir, `multisegment_${Date.now()}.mp4`);
  await runFfmpeg(["-y", "-f", "concat", "-safe", "0", "-i", listPath, "-c", "copy", finalPath]);

  log("=== ГОТОВО ===", finalPath);
}

main().catch((e) => { console.error("[FATAL]", e); process.exit(1); });
