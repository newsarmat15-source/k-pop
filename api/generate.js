// StageOne v3 — видео через Kling 3.0 (замена Seedance, см. CLAUDE.md раздел про content policy).
// Соло-клипы, 10с (лимит Kling LipSync на входе), без родного звука — вокал накладывается отдельно.
import { fetchWithRetry } from "../lib/fal-fetch.js";

const CLIP = {
  girlcrush:"fierce K-pop girl-crush stage, dark set, dramatic moving spotlights, neon rim light, cinematic haze",
  ethereal:"ethereal dreamy stage, soft volumetric pastel light, floating particles, airy atmosphere",
  neon:"neon night-city rooftop, glowing signs, wet reflective ground, cinematic urban mood",
  studio:"high-end studio, seamless backdrop, crisp editorial lighting, polished commercial look",
  street:"urban street, daytime city energy, denim streetwear, candid crew vibe",
  stage:"massive concert stage, stadium spotlights, laser beams, crowd, dramatic wide shots",
};
// Раскадровка по фазам времени, не мешок прилагательных — иначе модель зацикливает
// один-два движения на весь клип. Каждый стиль — 3 явные фазы (начало/середина/конец),
// это словарь энергетики жанра, не покадровая копия чьей-то реальной хореографии.
// "Synchronized/formation" — убрано намеренно: продукт соло, синхронизироваться не с кем,
// это были бесполезные слова за счёт реальных движений.
const DANCE = {
  // --- женские стили (9) ---
  lesserafim:"Choreography timeline: first third — sharp diagonal arm cuts at full extension building into the opening pose; " +
    "middle third — forceful hip snaps combined with sharp point-and-freeze poses held with attitude, changing direction each hit; " +
    "final third — powerful floor-shaking stomps building to a strong held finishing pose. Athletic, precise, direct attitude throughout.",
  aespa:"Choreography timeline: first third — sharp robotic arm isolations with staccato snapping motions; " +
    "middle third — a powerful arm-wave sequence flowing through the whole body at full extension; " +
    "final third — a sudden hard freeze into a strong grounded power stance, then a sharp direction change to finish. Futuristic, powerful.",
  ive:"Choreography timeline: first third — sweeping full-arm extensions opening the routine, reaching completely outward; " +
    "middle third — powerful body rolls transitioning into sharp staccato accents; " +
    "final third — a graceful turn revealing her profile, ending in an elegant full-extension finishing pose. Refined but full amplitude.",
  idle:"Choreography timeline: first third — confident strutting with big forceful arm swings; " +
    "middle third — sharp hip rolls transitioning into bold chest pops; " +
    "final third — a fierce point-and-hold pose flowing into high-energy floor work to finish. Sensual, confident, fierce.",
  babymonster:"Choreography timeline: first third — deep knee bends with sharp arm pumps at full extension; " +
    "middle third — aggressive chest and shoulder pops building energy; " +
    "final third — forceful grounded stomps building into a powerful full-body bounce finish. Hard-hitting hip-hop.",
  katseye:"Choreography timeline: first third — bouncy opening with sharp arm waves at full extension; " +
    "middle third — playful powerful hip bounces with confident big-armed struts; " +
    "final third — a dynamic spin building into a bright, energetic finishing pose. Playful, global-pop energy.",
  blackpink:"Choreography timeline: first third — a confident hip-hop groove with sharp shoulder pops and a slow badass strut; " +
    "middle third — sudden sharp arm accents breaking the groove, contrasting elegant hand lines with hard-hitting hits; " +
    "final third — a bold power stance with a slow head tilt, full attitude held to the finish. Sultry, badass, effortlessly cool.",
  newjeans:"Choreography timeline: first third — light, natural bouncy steps with relaxed shoulder sways, deceptively simple and catchy; " +
    "middle third — a playful point-and-step sequence with subtle hip sways, easygoing but precise; " +
    "final third — a breezy spin into a soft natural finishing pose, arms relaxed. Effortless, youthful, naturalistic energy — never overly sharp or forced.",
  twice:"Choreography timeline: first third — delicate, precise hand gestures and light footwork, bright and crisp; " +
    "middle third — a sudden fiery burst of sharp hip accents and a powerful arm extension, contrasting the delicate opening; " +
    "final third — bright, bouncy finishing choreography with a confident wide-arm pose held to camera. Contrast of delicate and fiery, crisp precision throughout.",
  // --- мужские стили (4) ---
  straykids:"Choreography timeline: first third — sharp, complex footwork combined with hard-hitting arm accents, aggressive and precise; " +
    "middle third — a rapid-fire sequence of grounded power hits and sharp direction changes, intense and technical; " +
    "final third — an explosive full-body finishing combo, dropping low into a powerful held stance. Intense, technical, powerful hip-hop energy.",
  ateez:"Choreography timeline: first third — a theatrical grounded entrance with sharp street-style isolations and a commanding stance; " +
    "middle third — powerful wide-stance hits building in intensity, dramatic and sharp; " +
    "final third — an explosive theatrical finishing pose, arms thrown wide, full commitment. Theatrical, powerful, street-dance grit.",
  enhypen:"Choreography timeline: first third — smooth moody isolations with slow-building intensity, atmospheric and controlled; " +
    "middle third — an intricate sequence of sharp accents woven through fluid transitions, precise and intense; " +
    "final third — a dramatic sharp finishing line held with brooding intensity. Atmospheric, intricate, moody power.",
  txt:"Choreography timeline: first third — light bouncy footwork with playful arm swings, breezy and youthful; " +
    "middle third — a bright energetic sequence of sharp claps and easy hip sways; " +
    "final third — a big joyful finishing pose with arms thrown up, warm and open. Light, youthful, summery energy.",
};
const DANCE_GENDER = {
  lesserafim:"girl", aespa:"girl", ive:"girl", idle:"girl", babymonster:"girl", katseye:"girl",
  blackpink:"girl", newjeans:"girl", twice:"girl",
  straykids:"boy", ateez:"boy", enhypen:"boy", txt:"boy",
};
const DANCE_NEGATIVE = "weak movement, minimal movement, half-hearted gestures, subtle swaying, barely moving, low energy, static, stiff, timid, small amplitude, repetitive looping motion";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST" });
  const KEY = process.env.FAL_KEY;
  if (!KEY) return res.status(500).json({ error: "FAL_KEY не задан в Vercel" });

  try {
    const b = req.body || {};
    const { imageUrl, theme = "girlcrush", dance = "lesserafim", memberName = "", angle = "front" } = b;
    if (!imageUrl) return res.status(400).json({ error: "Нужен imageUrl" });

    const clipScene = CLIP[theme] || CLIP.girlcrush;
    const danceStyle = DANCE[dance] || DANCE.lesserafim;
    const gender = DANCE_GENDER[dance] || "girl";
    const pronoun = gender === "boy" ? "his" : "her";
    const heShe = gender === "boy" ? "he" : "she";
    const who = memberName ? `${memberName}, a K-pop idol,` : "a K-pop idol";
    // Для мультисегментных клипов: каждый кусок — отдельный кадр монтажа с другим ракурсом
    // (не попытка бесшовной склейки одного движения — это раньше давало видимый шов).
    const angleLine = angle === "side"
      ? "Camera: three-quarter side angle, a different framing than a straight front shot — like a new camera setup in a real music video edit. "
      : "Camera: straight-on front angle, clean and centered. ";

    const prompt =
      `This is ${who} performing a dance video. Keep ${pronoun} face and identity exactly consistent with the reference image. ` +
      `${angleLine}` +
      `Scene: ${clipScene}. ${danceStyle} ` +
      `High-amplitude, full-extension, high-energy professional K-pop choreography — every movement committed and forceful, ` +
      `like a real K-pop comeback stage, clearly different motion in each third of the video, never repeating the same gesture on loop. ` +
      `Shot sequence: wide full-body shot, cut to close-ups, cut to a dynamic angle mid-dance. ` +
      `Professional K-pop music video, cinematic lighting, smooth continuous motion throughout, no stutters, no freezing, sharp detail. ` +
      `${heShe.charAt(0).toUpperCase() + heShe.slice(1)} performs with full commitment and confidence.`;

    const r = await fetchWithRetry("https://queue.fal.run/fal-ai/kling-video/v3/standard/image-to-video", {
      method: "POST",
      headers: { Authorization: `Key ${KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt,
        start_image_url: imageUrl,
        duration: "10",
        generate_audio: false,
        negative_prompt: `blur, distort, low quality, ${DANCE_NEGATIVE}`,
        cfg_scale: 0.75,
      }),
    });
    const txt = await r.text();
    let data; try { data = JSON.parse(txt); } catch { data = { raw: txt }; }
    if (!r.ok) return res.status(200).json({ ok: false, error: `fal ${r.status}`, detail: data });

    const requestId = data.request_id || data.requestId;
    if (!requestId) return res.status(200).json({ ok: false, error: "Нет request_id", raw: data });
    return res.status(200).json({ ok: true, requestId });
  } catch (e) {
    return res.status(500).json({ error: String(e?.message || e) });
  }
}
