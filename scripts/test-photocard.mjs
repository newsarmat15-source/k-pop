// Тест: Nano Banana Pro — фотокарточка YUNA (тот же портрет, что и в видео-тестах),
// "неполированная", как будто на репетиции с наколенниками, разучивает хореографию.
// Запуск: node --env-file=.env scripts/test-photocard.mjs

import { writeFile } from "node:fs/promises";
import path from "node:path";

const FAL_KEY = process.env.FAL_KEY;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function log(...a) { console.log(new Date().toISOString().slice(11, 19), ...a); }

async function withRetry(fn, tries = 4) {
  let lastErr;
  for (let i = 0; i < tries; i++) {
    try { return await fn(); }
    catch (e) { lastErr = e; log(`  (retry ${i + 1}/${tries}: ${e.message})`); await sleep(2000); }
  }
  throw lastErr;
}

async function main() {
  const IMAGE_URL = "https://k-pop-black.vercel.app/idols/idol14.jpg";
  const prompt =
    "Keep her face and identity exactly consistent with the reference image — same face shape, eyes, and features. " +
    "Her face must be clearly visible, unobstructed, and looking toward the camera. " +
    "Candid but charming photo of the same girl, casual K-pop photocard style — not an overly glossy studio shoot, " +
    "but not gritty or sweaty either, soft and flattering. " +
    "She is making a cute finger-heart gesture near her cheek with one hand, warm genuine smile, looking at the camera. " +
    "Dance practice studio setting in the background: mirrors, wooden floor, soft natural light. " +
    "Realistic phone-camera candid quality, natural, charming, lightly polished but authentic, K-pop photocard aesthetic.";

  const submit = await withRetry(async () => {
    const r = await fetch("https://queue.fal.run/fal-ai/nano-banana-pro/edit", {
      method: "POST",
      headers: { Authorization: `Key ${FAL_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        image_urls: [IMAGE_URL],
        prompt,
        aspect_ratio: "2:3",
        resolution: "1K",
        num_images: 1,
      }),
    });
    const d = await r.json();
    if (!r.ok || !d.request_id) throw new Error("submit failed: " + JSON.stringify(d));
    return d;
  });
  log("[submit]", submit.request_id);

  for (;;) {
    await sleep(4000);
    const d = await withRetry(async () => {
      const r = await fetch(`https://queue.fal.run/fal-ai/nano-banana-pro/requests/${submit.request_id}/status`, { headers: { Authorization: `Key ${FAL_KEY}` } });
      return r.json();
    });
    log("[status]", d.status);
    if (d.status === "COMPLETED") break;
    if (d.status === "ERROR" || d.status === "FAILED") throw new Error("job failed: " + JSON.stringify(d));
  }

  const result = await withRetry(async () => {
    const r = await fetch(`https://queue.fal.run/fal-ai/nano-banana-pro/requests/${submit.request_id}`, { headers: { Authorization: `Key ${FAL_KEY}` } });
    if (!r.ok) throw new Error(`result fetch ${r.status}: ${await r.text()}`);
    return r.json();
  });
  const imgUrl = result.images?.[0]?.url || result.image?.url;
  if (!imgUrl) throw new Error("no image url in result: " + JSON.stringify(result));
  log("[result]", imgUrl);

  const buf = Buffer.from(await (await fetch(imgUrl)).arrayBuffer());
  const outPath = path.join(process.cwd(), "test-output", `photocard_test_${Date.now()}.png`);
  await writeFile(outPath, buf);
  log("[saved]", outPath);
}

main().catch((e) => { console.error("[FATAL]", e); process.exit(1); });
