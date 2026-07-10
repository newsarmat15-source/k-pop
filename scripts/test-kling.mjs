// Диагностический тест: пройдёт ли idol14.jpg через content-модерацию Kling 3.0.
// Дешёвый прогон (5с, без аудио) — цель: проверить бан по "похож на человека", не оценивать качество.
// Запуск: node --env-file=.env scripts/test-kling.mjs

import { writeFile } from "node:fs/promises";

const KEY = process.env.FAL_KEY;
if (!KEY) { console.error("FAL_KEY не задан"); process.exit(1); }

const IMAGE_URL = "https://k-pop-black.vercel.app/idols/idol14.jpg";
const prompt =
  "A K-pop idol performing on an urban street, daytime city energy, denim streetwear. " +
  "Dynamic solo performance with varied choreography and camera angles. Cinematic lighting, sharp detail.";

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function main() {
  console.log("[submit] Kling 3.0 Standard, idol14.jpg");
  const submitRes = await fetch("https://queue.fal.run/fal-ai/kling-video/v3/standard/image-to-video", {
    method: "POST",
    headers: { Authorization: `Key ${KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt,
      start_image_url: IMAGE_URL,
      duration: "5",
      generate_audio: false,
    }),
  });
  const submitText = await submitRes.text();
  let submitData; try { submitData = JSON.parse(submitText); } catch { submitData = { raw: submitText }; }
  if (!submitRes.ok) {
    console.error(`[submit FAILED] fal ${submitRes.status}`);
    console.error(JSON.stringify(submitData, null, 2));
    process.exit(1);
  }
  const requestId = submitData.request_id || submitData.requestId;
  if (!requestId) { console.error("[submit FAILED] нет request_id", submitData); process.exit(1); }
  console.log(`[submit OK] request_id=${requestId}`);

  const statusUrl = `https://queue.fal.run/fal-ai/kling-video/requests/${requestId}/status`;
  let status = "IN_QUEUE";
  while (status !== "COMPLETED") {
    await sleep(5000);
    const r = await fetch(statusUrl, { headers: { Authorization: `Key ${KEY}` } });
    const txt = await r.text();
    let data; try { data = JSON.parse(txt); } catch { data = { raw: txt }; }
    if (!r.ok) { console.error(`[status FAILED] fal ${r.status}`, data); process.exit(1); }
    status = data.status;
    console.log(`[status] ${status}`);
    if (status === "FAILED" || status === "ERROR") { console.error("[generation FAILED]", JSON.stringify(data, null, 2)); process.exit(1); }
  }

  const resultUrl = `https://queue.fal.run/fal-ai/kling-video/requests/${requestId}`;
  const r = await fetch(resultUrl, { headers: { Authorization: `Key ${KEY}` } });
  const txt = await r.text();
  let data; try { data = JSON.parse(txt); } catch { data = { raw: txt }; }
  if (!r.ok) { console.error(`[result FAILED] fal ${r.status}`, data); process.exit(1); }
  const v = data?.video;
  const videoUrl = typeof v === "string" ? v : v?.url;
  if (!videoUrl) { console.error("[result FAILED] видео пустое", data); process.exit(1); }
  console.log(`[result OK] video_url=${videoUrl}`);

  const videoRes = await fetch(videoUrl);
  const buf = Buffer.from(await videoRes.arrayBuffer());
  const outName = `kling_idol14_${Date.now()}.mp4`;
  await writeFile(new URL(`../test-output/${outName}`, import.meta.url), buf);
  console.log(`[saved] test-output/${outName}`);
}

main().catch((e) => { console.error("[FATAL]", e); process.exit(1); });
