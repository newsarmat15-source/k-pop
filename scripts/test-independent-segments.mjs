// Тест: генерируем 2 куска НЕЗАВИСИМО от одного и того же портрета (без переноса кадра),
// с разным ракурсом камеры, но явной инструкцией сохранить ту же одежду — проверяем,
// насколько похожи лицо и одежда между независимыми генерациями.
// Запуск: node --env-file=.env scripts/test-independent-segments.mjs

import { writeFile } from "node:fs/promises";
import path from "node:path";
import os from "node:os";

const FAL_KEY = process.env.FAL_KEY;
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
  const outfitLock = "Keep her exact same outfit, hairstyle, and overall look identical to her reference photo — no changes to clothing or styling.";

  log("=== Кусок 1 — общий план спереди ===");
  const prompt1 =
    `This is YUNA, a K-pop idol. Keep her face and identity exactly consistent with the reference image. ${outfitLock} ` +
    `Scene: ${clipScene}. Camera: wide shot, front-facing angle. Dance style: ${danceStyle}. ` +
    "She performs the opening phase of the choreography, building energy toward the first chorus.";
  const video1Url = await generateVideoSegment(IMAGE_URL, prompt1);
  const video1Path = path.join(TMP, "indep-seg1.mp4");
  await downloadTo(video1Url, video1Path);

  log("=== Кусок 2 — независимая генерация, другой ракурс, тот же портрет ===");
  const prompt2 =
    `This is YUNA, the SAME K-pop idol as before. Keep her face and identity exactly consistent with the reference ` +
    `image. ${outfitLock} Scene: ${clipScene}. Camera: closer three-quarter angle from the side, different framing ` +
    `than a front shot. Dance style: ${danceStyle}. She performs the high-energy chorus peak of the choreography.`;
  const video2Url = await generateVideoSegment(IMAGE_URL, prompt2);
  const video2Path = path.join(TMP, "indep-seg2.mp4");
  await downloadTo(video2Url, video2Path);

  const outDir = path.join(process.cwd(), "test-output");
  await import("node:fs/promises").then((fs) => fs.mkdir(outDir, { recursive: true }));
  const final1 = path.join(outDir, "independent_seg1.mp4");
  const final2 = path.join(outDir, "independent_seg2.mp4");
  await Promise.all([downloadTo(video1Url, final1), downloadTo(video2Url, final2)]);

  log("=== ГОТОВО === сравни:", final1, "и", final2);
}

main().catch((e) => { console.error("[FATAL]", e); process.exit(1); });
