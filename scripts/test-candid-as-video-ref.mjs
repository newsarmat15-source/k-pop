// Проверка: примет ли Kling "неполированную" фотокарточку как start_image_url для видео,
// или это тоже словит content_policy_violation, как оригинальный глянцевый портрет idol14.jpg.
import { fetchWithRetry } from "../lib/fal-fetch.js";

const FAL_KEY = process.env.FAL_KEY;
const CANDID_IMAGE_URL = "https://v3b.fal.media/files/b/0aa16c9e/fCFrjDxYBgMRIguiu-8TG_3PvsTbJ6.png";

const submit = await fetchWithRetry("https://queue.fal.run/fal-ai/kling-video/v3/standard/image-to-video", {
  method: "POST",
  headers: { Authorization: `Key ${FAL_KEY}`, "Content-Type": "application/json" },
  body: JSON.stringify({
    prompt: "She smiles and waves at the camera, casual dance studio setting, natural movement.",
    start_image_url: CANDID_IMAGE_URL,
    duration: "5",
    generate_audio: false,
  }),
});
const data = await submit.json();
console.log("status:", submit.status);
console.log(JSON.stringify(data, null, 2));
