// Автономный тест-скрипт (Спринт 1): сабмит -> поллинг -> скачивание клипа локально.
// Дублирует логику api/generate.js напрямую, без деплоя, для быстрых тестов качества.
// Запуск: node --env-file=.env scripts/test-generate.mjs [idolFile] [theme] [song] [dance]

import { writeFile } from "node:fs/promises";

const KEY = process.env.FAL_KEY;
if (!KEY) {
  console.error("FAL_KEY не задан. Положи его в .env в корне проекта: FAL_KEY=твой_ключ");
  process.exit(1);
}

const CLIP = {
  girlcrush: "fierce K-pop girl-crush stage, dark set, dramatic moving spotlights, neon rim light, cinematic haze",
  ethereal: "ethereal dreamy stage, soft volumetric pastel light, floating particles, airy atmosphere",
  neon: "neon night-city rooftop, glowing signs, wet reflective ground, cinematic urban mood",
  studio: "high-end studio, seamless backdrop, crisp editorial lighting, polished commercial look",
  street: "urban street, daytime city energy, denim streetwear, candid crew vibe",
  stage: "massive concert stage, stadium spotlights, laser beams, crowd, dramatic wide shots",
};
const SONG = {
  ballad: "slow emotional tempo, soft minor key, punchy kick",
  rnb: "smooth R&B groove, sultry pocket, warm bass",
  hyperpop: "fast high-energy beat, explosive drops, crisp hi-hats",
  citypop: "retro funk groove, warm bass line, synth stabs",
  rock: "driving rock energy, distorted guitars, hard drums",
  darktrap: "heavy dark trap rhythm, 808 bass, rapid hi-hat rolls",
};
const DANCE = {
  lesserafim: "athletic powerful choreography, precise sharp moves, crisp synchronized lines, direct attitude",
  aespa: "powerful futuristic choreography, strong dynamic poses, precise isolation work",
  ive: "elegant graceful refined fluid choreography, polished synchronized formations",
  idle: "sensual confident expressive choreography, fierce stage charisma",
  babymonster: "hard-hitting hip-hop choreography, heavy groove and power moves",
  katseye: "energetic playful sharp global-pop choreography",
};

const IMAGE_BASE = "https://k-pop-black.vercel.app/idols";

const idolFile = process.argv[2] || "idol1.jpg";
const theme = process.argv[3] || "girlcrush";
const song = process.argv[4] || "ballad";
const dance = process.argv[5] || "lesserafim";

const imageUrls = [`${IMAGE_BASE}/${idolFile}`];
const clipScene = CLIP[theme] || CLIP.girlcrush;
const songVibe = SONG[song] || SONG.ballad;
const danceStyle = DANCE[dance] || DANCE.lesserafim;

const prompt =
  `@Image1 (member 1, center as lead). This is a K-pop idol performing a music video. ` +
  `Keep every member's face and identity exactly consistent with her reference image in every shot. ` +
  `Scene: ${clipScene}. Music vibe: ${songVibe}. Dance style: ${danceStyle}. ` +
  `Dynamic solo performance with varied choreography and camera angles. ` +
  `Shot sequence: wide full-body group shot, cut to close-ups on faces, cut to orbiting camera mid-dance. ` +
  `Audio: punchy instrumental K-pop track locked to the choreography, every beat matches movement. ` +
  `Background vocal ad-libs (breathy sounds, vocal runs, chants "ooh" "aah" "yeah" — no intelligible words, no full singing). ` +
  `Professional K-pop music video, cinematic lighting, smooth camera motion, sharp detail.`;

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function main() {
  console.log(`[submit] idol=${idolFile} theme=${theme} song=${song} dance=${dance}`);
  const submitRes = await fetch("https://queue.fal.run/bytedance/seedance-2.0/reference-to-video", {
    method: "POST",
    headers: { Authorization: `Key ${KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt,
      image_urls: imageUrls,
      resolution: "720p",
      duration: "15",
      aspect_ratio: "9:16",
      generate_audio: true,
    }),
  });
  const submitText = await submitRes.text();
  let submitData;
  try { submitData = JSON.parse(submitText); } catch { submitData = { raw: submitText }; }
  if (!submitRes.ok) {
    console.error(`[submit FAILED] fal ${submitRes.status}`, submitData);
    process.exit(1);
  }
  const requestId = submitData.request_id || submitData.requestId;
  if (!requestId) {
    console.error("[submit FAILED] нет request_id", submitData);
    process.exit(1);
  }
  console.log(`[submit OK] request_id=${requestId}`);

  const statusUrl = `https://queue.fal.run/bytedance/seedance-2.0/requests/${requestId}/status`;
  let status = "IN_QUEUE";
  while (status !== "COMPLETED") {
    await sleep(5000);
    const r = await fetch(statusUrl, { headers: { Authorization: `Key ${KEY}` } });
    const txt = await r.text();
    let data; try { data = JSON.parse(txt); } catch { data = { raw: txt }; }
    if (!r.ok) { console.error(`[status FAILED] fal ${r.status}`, data); process.exit(1); }
    status = data.status;
    console.log(`[status] ${status}${data.queue_position != null ? ` (позиция в очереди: ${data.queue_position})` : ""}`);
    if (status === "FAILED" || status === "ERROR") {
      console.error("[generation FAILED]", data);
      process.exit(1);
    }
  }

  const resultUrl = `https://queue.fal.run/bytedance/seedance-2.0/requests/${requestId}`;
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
  const outName = `test_${idolFile.replace(".jpg", "")}_${theme}_${song}_${dance}_${Date.now()}.mp4`;
  await writeFile(new URL(`../test-output/${outName}`, import.meta.url), buf);
  console.log(`[saved] test-output/${outName}`);
}

main().catch((e) => { console.error("[FATAL]", e); process.exit(1); });
