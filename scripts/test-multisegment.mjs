// Тест механики склейки: 2 куска по 10с с переносом последнего кадра между ними
// (для непрерывности движения) + разрезанная на 2 части песня + LipSync на каждый кусок + склейка.
// Запуск: node --env-file=.env scripts/test-multisegment.mjs

import { writeFile, readFile, unlink } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import os from "node:os";
import ffmpegPath from "ffmpeg-static";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import { buffer as streamToBuffer } from "node:stream/consumers";

const FAL_KEY = process.env.FAL_KEY;
const ELEVEN_KEY = process.env.ELEVENLABS_API_KEY;
const TMP = os.tmpdir();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function log(...a) { console.log(new Date().toISOString().slice(11, 19), ...a); }

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
}

async function pollUntilComplete(app, requestId) {
  for (;;) {
    await sleep(5000);
    const r = await fetch(`https://queue.fal.run/${app}/requests/${requestId}/status`, { headers: { Authorization: `Key ${FAL_KEY}` } });
    const d = await r.json();
    if (d.status === "COMPLETED") return;
    if (d.status === "ERROR" || d.status === "FAILED") throw new Error("job failed: " + JSON.stringify(d));
    log(`  status=${d.status}`);
  }
}
async function fetchVideoResult(app, requestId) {
  const r = await fetch(`https://queue.fal.run/${app}/requests/${requestId}`, { headers: { Authorization: `Key ${FAL_KEY}` } });
  const d = await r.json();
  return d.video?.url || d.video;
}

async function generateVideoSegment(imageUrl, prompt) {
  const submit = await fetch("https://queue.fal.run/fal-ai/kling-video/v3/standard/image-to-video", {
    method: "POST",
    headers: { Authorization: `Key ${FAL_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, start_image_url: imageUrl, duration: "10", generate_audio: false }),
  });
  const data = await submit.json();
  if (!submit.ok || !data.request_id) throw new Error("video submit failed: " + JSON.stringify(data));
  log(`[video submit] ${data.request_id}`);
  await pollUntilComplete("fal-ai/kling-video", data.request_id);
  const url = await fetchVideoResult("fal-ai/kling-video", data.request_id);
  log(`[video done] ${url}`);
  return url;
}

async function runLipsync(videoUrl, audioUrl) {
  const submit = await fetch("https://queue.fal.run/fal-ai/kling-video/lipsync/audio-to-video", {
    method: "POST",
    headers: { Authorization: `Key ${FAL_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ video_url: videoUrl, audio_url: audioUrl }),
  });
  const data = await submit.json();
  if (!submit.ok || !data.request_id) throw new Error("lipsync submit failed: " + JSON.stringify(data));
  log(`[lipsync submit] ${data.request_id}`);
  await pollUntilComplete("fal-ai/kling-video", data.request_id);
  const url = await fetchVideoResult("fal-ai/kling-video", data.request_id);
  log(`[lipsync done] ${url}`);
  return url;
}

async function downloadTo(url, filePath) {
  const r = await fetch(url);
  await writeFile(filePath, Buffer.from(await r.arrayBuffer()));
}

async function main() {
  const IMAGE_URL = "https://k-pop-black.vercel.app/idols/idol14.jpg";
  const clipScene = "fierce K-pop girl-crush stage, dark set, dramatic moving spotlights, neon rim light, cinematic haze";
  const danceStyle = "athletic powerful choreography, precise sharp moves, crisp synchronized lines, direct attitude";

  // --- 1. Песня на 20с (буфер +3с, простая обрезка с начала для этого теста) ---
  log("=== 1. Генерация песни (23с буфер) ===");
  const elevenlabs = new ElevenLabsClient({ apiKey: ELEVEN_KEY });
  const track = await elevenlabs.music.compose({
    prompt:
      "Upbeat K-pop chorus hook, powerful vocals singing in Korean, fierce girl-crush energy, " +
      "catchy, lyric-dense, modern K-pop production, confident mood, continuous singing throughout.",
    musicLengthMs: 23000,
    modelId: "music_v2",
  });
  const rawSongBuf = Buffer.isBuffer(track) ? track : await streamToBuffer(track);
  const rawSongPath = path.join(TMP, "seg-song-raw.mp3");
  await writeFile(rawSongPath, rawSongBuf);

  const song20Path = path.join(TMP, "seg-song-20.mp3");
  await runFfmpeg(["-y", "-i", rawSongPath, "-t", "20", "-c", "copy", song20Path]);
  const seg1AudioPath = path.join(TMP, "seg1-audio.mp3");
  const seg2AudioPath = path.join(TMP, "seg2-audio.mp3");
  await runFfmpeg(["-y", "-i", song20Path, "-t", "10", "-c", "copy", seg1AudioPath]);
  await runFfmpeg(["-y", "-i", song20Path, "-ss", "10", "-t", "10", "-c", "copy", seg2AudioPath]);
  const seg1AudioUrl = await uploadToFalCdn(await readFile(seg1AudioPath), "audio/mpeg", "seg1-audio.mp3");
  const seg2AudioUrl = await uploadToFalCdn(await readFile(seg2AudioPath), "audio/mpeg", "seg2-audio.mp3");
  log("audio segments uploaded:", seg1AudioUrl, seg2AudioUrl);

  // --- 2. Видео-кусок 1 (от портрета) ---
  log("=== 2. Видео-кусок 1 ===");
  const prompt1 =
    `This is YUNA, a K-pop idol, performing the opening phase of a dance routine. Keep her face and identity ` +
    `exactly consistent with the reference image. Scene: ${clipScene}. Dance style: ${danceStyle}. ` +
    "She starts in a strong opening stance and builds through sharp choreography, ending the sequence mid-motion " +
    "as she spins into a turn, arms extended — captured clearly mid-turn in the very last frame.";
  const video1Url = await generateVideoSegment(IMAGE_URL, prompt1);
  const video1Path = path.join(TMP, "seg1-video.mp4");
  await downloadTo(video1Url, video1Path);

  // --- 3. Извлечь последний кадр видео 1 ---
  log("=== 3. Извлечение последнего кадра ===");
  const lastFramePath = path.join(TMP, "seg1-lastframe.jpg");
  await runFfmpeg(["-y", "-sseof", "-0.2", "-i", video1Path, "-frames:v", "1", "-q:v", "2", lastFramePath]);
  const lastFrameUrl = await uploadToFalCdn(await readFile(lastFramePath), "image/jpeg", "seg1-lastframe.jpg");
  log("last frame uploaded:", lastFrameUrl);

  // --- 4. Видео-кусок 2 (от последнего кадра куска 1) ---
  log("=== 4. Видео-кусок 2 (продолжение) ===");
  const prompt2 =
    `This is the SAME K-pop idol, continuing directly from a mid-turn pose (arms extended, spinning) into the next ` +
    `phase of the dance routine — do not reset her pose, continue the motion smoothly. Scene: ${clipScene}. ` +
    `Dance style: ${danceStyle}. She completes the turn and flows into the high-energy chorus peak choreography, ` +
    "building to a strong finishing pose in the final frame.";
  const video2Url = await generateVideoSegment(lastFrameUrl, prompt2);
  const video2Path = path.join(TMP, "seg2-video.mp4");
  await downloadTo(video2Url, video2Path);

  // --- 5. LipSync каждого куска со своей аудио-частью ---
  log("=== 5. LipSync кусок 1 ===");
  const lip1Url = await runLipsync(video1Url, seg1AudioUrl);
  const lip1Path = path.join(TMP, "seg1-lipsync.mp4");
  await downloadTo(lip1Url, lip1Path);

  log("=== 6. LipSync кусок 2 ===");
  const lip2Url = await runLipsync(video2Url, seg2AudioUrl);
  const lip2Path = path.join(TMP, "seg2-lipsync.mp4");
  await downloadTo(lip2Url, lip2Path);

  // --- 6. Склейка двух готовых кусков ---
  log("=== 7. Склейка в финальный файл ===");
  const listPath = path.join(TMP, "concat-list.txt");
  const listContent = [lip1Path, lip2Path].map((p) => `file '${p.replace(/\\/g, "/")}'`).join("\n");
  await writeFile(listPath, listContent);
  const outDir = path.join(process.cwd(), "test-output");
  const finalPath = path.join(outDir, `multisegment_${Date.now()}.mp4`);
  await runFfmpeg(["-y", "-f", "concat", "-safe", "0", "-i", listPath, "-c", "copy", finalPath]);

  log("=== ГОТОВО ===", finalPath);
  console.log(JSON.stringify({ ok: true, finalPath, video1Url, video2Url, lip1Url, lip2Url }, null, 2));
}

main().catch((e) => { console.error("[FATAL]", e); process.exit(1); });
