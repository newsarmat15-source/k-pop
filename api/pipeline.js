// Объединено: generate + status + result + lipsync + song + stitch + finalize + tts —
// было 8 функций, схлопнуто в одну ради лимита в 12 функций на Vercel Hobby (см. PROGRESS.md).
// Диспетчер по ?action=.
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import { buffer as streamToBuffer } from "node:stream/consumers";
import { writeFile, readFile, unlink } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import os from "node:os";
import ffmpegPath from "ffmpeg-static";
import { fetchWithRetry } from "../lib/fal-fetch.js";
import { readUserId } from "../lib/session.js";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function withRetry(fn, tries = 4) {
  let lastErr;
  for (let i = 0; i < tries; i++) {
    try { return await fn(); }
    catch (e) { lastErr = e; await sleep(2000); }
  }
  throw lastErr;
}
function runFfmpeg(args) {
  return new Promise((resolve, reject) => {
    const p = spawn(ffmpegPath, args);
    let stderr = "";
    p.stderr.on("data", (d) => { stderr += d.toString(); });
    p.on("error", reject);
    p.on("close", (code) => {
      if (code !== 0 && !stderr.includes("silence_start")) return reject(new Error(`ffmpeg exit ${code}: ${stderr.slice(-800)}`));
      resolve(stderr);
    });
  });
}
async function getDurationSec(filePath) {
  const stderr = await runFfmpeg(["-i", filePath, "-f", "null", "-"]).catch((e) => e.message);
  const m = stderr.match(/Duration:\s*(\d+):(\d+):(\d+\.\d+)/);
  return m ? (+m[1]) * 3600 + (+m[2]) * 60 + parseFloat(m[3]) : null;
}
async function uploadToFalCdn(buf, falKey, contentType, fileName) {
  return withRetry(async () => {
    const initRes = await fetchWithRetry("https://rest.alpha.fal.ai/storage/upload/initiate?storage_type=fal-cdn-v3", {
      method: "POST",
      headers: { Authorization: `Key ${falKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ content_type: contentType, file_name: fileName }),
    });
    if (!initRes.ok) throw new Error(`fal storage initiate ${initRes.status}: ${await initRes.text()}`);
    const { upload_url, file_url } = await initRes.json();
    const up = await fetchWithRetry(upload_url, { method: "PUT", headers: { "Content-Type": contentType }, body: buf });
    if (!up.ok) throw new Error(`fal storage upload ${up.status}: ${await up.text()}`);
    return file_url;
  });
}

/* ===================== GENERATE (Kling video) ===================== */
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

async function handleGenerate(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST" });
  if (!readUserId(req)) return res.status(401).json({ error: "Нужно войти в аккаунт" });
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

/* ===================== STATUS / RESULT (общие для видео и липсинка) ===================== */
async function handleStatus(req, res) {
  const KEY = process.env.FAL_KEY;
  if (!KEY) return res.status(500).json({ error: "FAL_KEY не задан" });
  const id = req.query.id;
  const app = req.query.app || "fal-ai/kling-video";
  if (!id) return res.status(400).json({ error: "Нужен ?id=" });
  try {
    const url = `https://queue.fal.run/${app}/requests/${id}/status`;
    const r = await fetchWithRetry(url, { headers: { Authorization: `Key ${KEY}` } });
    const txt = await r.text();
    let data; try { data = JSON.parse(txt); } catch { data = { raw: txt }; }
    if (!r.ok) return res.status(200).json({ ok:true, status:"ERROR", error:`fal ${r.status}`, detail:data });
    return res.status(200).json({ ok:true, status:data.status, queuePosition:data.queue_position ?? null });
  } catch (e) {
    return res.status(200).json({ ok:true, status:"ERROR", error:String(e?.message||e) });
  }
}

async function handleResult(req, res) {
  const KEY = process.env.FAL_KEY;
  if (!KEY) return res.status(500).json({ error: "FAL_KEY не задан" });
  const id = req.query.id;
  const app = req.query.app || "fal-ai/kling-video";
  if (!id) return res.status(400).json({ error: "Нужен ?id=" });
  try {
    const url = `https://queue.fal.run/${app}/requests/${id}`;
    const r = await fetchWithRetry(url, { headers: { Authorization: `Key ${KEY}` } });
    const txt = await r.text();
    let data; try { data = JSON.parse(txt); } catch { data = { raw: txt }; }
    if (!r.ok) return res.status(200).json({ ok:false, error:`fal ${r.status}`, detail:data });
    const v = data?.video;
    const videoUrl = (typeof v === "string") ? v : (v?.url || null);
    if (!videoUrl) return res.status(200).json({ ok:false, error:"Видео пустое", raw:data });
    return res.status(200).json({ ok:true, videoUrl });
  } catch (e) {
    return res.status(200).json({ ok:false, error:String(e?.message||e) });
  }
}

/* ===================== LIPSYNC ===================== */
async function handleLipsync(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST" });
  if (!readUserId(req)) return res.status(401).json({ error: "Нужно войти в аккаунт" });
  const KEY = process.env.FAL_KEY;
  if (!KEY) return res.status(500).json({ error: "FAL_KEY не задан" });

  try {
    const { videoUrl, songUrl } = req.body || {};
    if (!videoUrl || !songUrl) return res.status(400).json({ error: "Нужны videoUrl и songUrl" });

    const r = await fetchWithRetry("https://queue.fal.run/fal-ai/kling-video/lipsync/audio-to-video", {
      method: "POST",
      headers: { Authorization: `Key ${KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ video_url: videoUrl, audio_url: songUrl }),
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

/* ===================== SONG (ElevenLabs Music + обрезка по вокалу) ===================== */
const SONG = {
  ballad: "slow emotional tempo, soft minor key, punchy kick",
  rnb: "smooth R&B groove, sultry pocket, warm bass",
  hyperpop: "fast high-energy beat, explosive drops, crisp hi-hats",
  citypop: "retro funk groove, warm bass line, synth stabs",
  rock: "driving rock energy, distorted guitars, hard drums",
  darktrap: "heavy dark trap rhythm, 808 bass, rapid hi-hat rolls",
};
const LANGUAGE = { ko: "Korean", en: "English", ja: "Japanese", zh: "Chinese" };
const GIRL_REGISTER = ["soprano", "mezzo-soprano", "alto"];
const GIRL_TIMBRE = ["bright airy", "warm husky", "clear crystalline", "smoky low", "light breathy"];
const GIRL_TEXTURE = ["light head-voice tone", "strong chest-voice power", "soft delicate edge", "confident belting power"];
const BOY_REGISTER = ["tenor", "baritone", "bass-baritone"];
const BOY_TIMBRE = ["bright clear", "warm resonant", "husky raspy", "smooth velvety", "powerful bold"];
const BOY_TEXTURE = ["light and agile", "deep chest resonance", "airy falsetto edge", "strong projection"];

function hashStr(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}
function voiceProfileFor(memberName, gender) {
  const h = hashStr(memberName || "idol");
  const isBoy = gender === "boy";
  const REG = isBoy ? BOY_REGISTER : GIRL_REGISTER;
  const TIM = isBoy ? BOY_TIMBRE : GIRL_TIMBRE;
  const TEX = isBoy ? BOY_TEXTURE : GIRL_TEXTURE;
  const register = REG[h % REG.length];
  const timbre = TIM[Math.floor(h / 7) % TIM.length];
  const texture = TEX[Math.floor(h / 53) % TEX.length];
  return { descriptor: `${timbre} ${register} vocal, ${texture}`, seed: h % 1000000 };
}
async function detectSilences(filePath) {
  const stderr = await runFfmpeg([
    "-i", filePath,
    "-af", "silencedetect=noise=-30dB:d=0.4",
    "-f", "null", "-",
  ]);
  const silences = [];
  let start = null;
  for (const line of stderr.split("\n")) {
    const s = line.match(/silence_start:\s*([\d.]+)/);
    const e = line.match(/silence_end:\s*([\d.]+)/);
    if (s) start = parseFloat(s[1]);
    if (e && start != null) { silences.push([start, parseFloat(e[1])]); start = null; }
  }
  return silences;
}
function findBestWindow(silences, totalSec, windowSec) {
  const bounds = [0, ...silences.flatMap(([a, b]) => [a, b]), totalSec].sort((a, b) => a - b);
  const loudSpans = [];
  for (let i = 0; i < bounds.length - 1; i++) {
    const a = bounds[i], b = bounds[i + 1];
    const inSilence = silences.some(([s, e]) => a >= s - 0.01 && b <= e + 0.01);
    if (!inSilence && b - a > 0.05) loudSpans.push([a, b]);
  }
  const merged = [];
  for (const span of loudSpans) {
    const last = merged[merged.length - 1];
    if (last && span[0] - last[1] < 0.05) last[1] = span[1];
    else merged.push([...span]);
  }
  const bigEnough = merged.filter(([a, b]) => b - a >= windowSec);
  if (bigEnough.length) {
    const best = bigEnough.reduce((m, s) => (s[1] - s[0] > m[1] - m[0] ? s : m));
    return best[0];
  }
  return Math.max(0, (totalSec - windowSec) / 2);
}
async function trimAudio(inputPath, outputPath, startSec, durationSec) {
  await runFfmpeg(["-y", "-i", inputPath, "-ss", String(startSec), "-t", String(durationSec), "-c", "copy", outputPath]);
}

async function handleSong(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST" });
  if (!readUserId(req)) return res.status(401).json({ error: "Нужно войти в аккаунт" });
  const ELEVEN_KEY = process.env.ELEVENLABS_API_KEY;
  const FAL_KEY = process.env.FAL_KEY;
  if (!ELEVEN_KEY) return res.status(500).json({ error: "ELEVENLABS_API_KEY не задан" });
  if (!FAL_KEY) return res.status(500).json({ error: "FAL_KEY не задан" });

  const tag = Date.now();
  const rawPath = path.join(os.tmpdir(), `song-raw-${tag}.mp3`);
  const cutPath = path.join(os.tmpdir(), `song-cut-${tag}.mp3`);

  try {
    const { song = "ballad", lengthMs = 10000, language = "ko", memberName = "", gender = "girl" } = req.body || {};
    const songVibe = SONG[song] || SONG.ballad;
    const langName = LANGUAGE[language] || LANGUAGE.ko;
    const windowSec = lengthMs / 1000;
    const bufferSec = windowSec + 10;
    const { descriptor: voiceDescriptor, seed } = voiceProfileFor(memberName, gender);

    const elevenlabs = new ElevenLabsClient({ apiKey: ELEVEN_KEY });
    // seed нельзя передавать вместе с prompt (ElevenLabs Music v2 → 422 unprocessable_entity).
    // Вариативность голоса уже задаётся текстовым voiceDescriptor, seed тут лишний.
    const track = await elevenlabs.music.compose({
      prompt:
        `Upbeat K-pop chorus hook, ${voiceDescriptor} vocals singing in ${langName}, ${songVibe}, ` +
        "catchy, lyric-dense, modern K-pop production, confident mood, continuous singing throughout.",
      musicLengthMs: Math.round(bufferSec * 1000),
      modelId: "music_v2",
    });
    const rawBuf = Buffer.isBuffer(track) ? track : await streamToBuffer(track);
    await writeFile(rawPath, rawBuf);

    const totalSec = (await getDurationSec(rawPath)) || bufferSec;
    const silences = await detectSilences(rawPath);
    const startSec = findBestWindow(silences, totalSec, windowSec);

    await trimAudio(rawPath, cutPath, startSec, windowSec);
    const cutBuf = await readFile(cutPath);

    const songUrl = await uploadToFalCdn(cutBuf, FAL_KEY, "audio/mpeg", `song-${tag}.mp3`);
    return res.status(200).json({ ok: true, songUrl, debug: { totalSec, silences, chosenStart: startSec, voiceDescriptor, seed } });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e?.message || e) });
  } finally {
    await unlink(rawPath).catch(() => {});
    await unlink(cutPath).catch(() => {});
  }
}

/* ===================== STITCH (склейка сегментов) ===================== */
async function handleStitch(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST" });
  if (!readUserId(req)) return res.status(401).json({ error: "Нужно войти в аккаунт" });
  const FAL_KEY = process.env.FAL_KEY;
  if (!FAL_KEY) return res.status(500).json({ error: "FAL_KEY не задан" });

  const { videoUrls } = req.body || {};
  if (!Array.isArray(videoUrls) || videoUrls.length < 2) {
    return res.status(400).json({ error: "Нужен массив videoUrls минимум из 2 ссылок" });
  }

  const tag = Date.now();
  const tmp = os.tmpdir();
  const localPaths = videoUrls.map((_, i) => path.join(tmp, `stitch-${tag}-${i}.mp4`));
  const listPath = path.join(tmp, `stitch-list-${tag}.txt`);
  const outPath = path.join(tmp, `stitch-out-${tag}.mp4`);

  try {
    for (let i = 0; i < videoUrls.length; i++) {
      const buf = await withRetry(async () => {
        const r = await fetchWithRetry(videoUrls[i]);
        if (!r.ok) throw new Error(`download ${r.status}`);
        return Buffer.from(await r.arrayBuffer());
      });
      await writeFile(localPaths[i], buf);
    }

    const listContent = localPaths.map((p) => `file '${p.replace(/\\/g, "/")}'`).join("\n");
    await writeFile(listPath, listContent);
    await runFfmpeg(["-y", "-f", "concat", "-safe", "0", "-i", listPath, "-c", "copy", outPath]);

    const finalBuf = await readFile(outPath);
    const finalUrl = await uploadToFalCdn(finalBuf, FAL_KEY, "video/mp4", `stitched-${tag}.mp4`);
    return res.status(200).json({ ok: true, videoUrl: finalUrl });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e?.message || e) });
  } finally {
    await Promise.all([...localPaths, listPath, outPath].map((p) => unlink(p).catch(() => {})));
  }
}

/* ===================== FINALIZE (обрезка боков) ===================== */
// Срезает начало/конец готового LipSync-видео, где изображение может замирать/рот не двигаться
// (задокументированный boundary-артефакт LipSync-моделей, см. PROGRESS.md). Не чинит причину,
// просто не показывает зрителю плохой кусок. Асимметрично — в начале проблема сильнее выражена.
const TRIM_START_SEC = 1.8;
const TRIM_END_SEC = 0.8;

async function handleFinalize(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST" });
  if (!readUserId(req)) return res.status(401).json({ error: "Нужно войти в аккаунт" });
  const FAL_KEY = process.env.FAL_KEY;
  if (!FAL_KEY) return res.status(500).json({ error: "FAL_KEY не задан" });

  const tag = Date.now();
  const inPath = path.join(os.tmpdir(), `finalize-in-${tag}.mp4`);
  const outPath = path.join(os.tmpdir(), `finalize-out-${tag}.mp4`);

  try {
    const { videoUrl } = req.body || {};
    if (!videoUrl) return res.status(400).json({ error: "Нужен videoUrl" });

    const buf = await withRetry(async () => {
      const r = await fetchWithRetry(videoUrl);
      if (!r.ok) throw new Error(`не удалось скачать videoUrl: ${r.status}`);
      return Buffer.from(await r.arrayBuffer());
    });
    await writeFile(inPath, buf);

    const totalSec = await getDurationSec(inPath);
    if (!totalSec || totalSec <= TRIM_START_SEC + TRIM_END_SEC + 1) {
      return res.status(200).json({ ok: true, videoUrl });
    }
    const cutDuration = totalSec - TRIM_START_SEC - TRIM_END_SEC;

    await runFfmpeg(["-y", "-i", inPath, "-ss", String(TRIM_START_SEC), "-t", String(cutDuration), "-c", "copy", outPath]);
    const trimmedBuf = await readFile(outPath);
    const finalUrl = await uploadToFalCdn(trimmedBuf, FAL_KEY, "video/mp4", `finalized-${tag}.mp4`);

    return res.status(200).json({ ok: true, videoUrl: finalUrl });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e?.message || e) });
  } finally {
    await unlink(inPath).catch(() => {});
    await unlink(outPath).catch(() => {});
  }
}

/* ===================== TTS (голосовые — задел под чат-компаньона) ===================== */
async function handleTts(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST" });
  if (!readUserId(req)) return res.status(401).json({ error: "Нужно войти в аккаунт" });
  const ELEVEN_KEY = process.env.ELEVENLABS_API_KEY;
  if (!ELEVEN_KEY) return res.status(500).json({ error: "ELEVENLABS_API_KEY не задан" });

  const { text, voiceId = "21m00Tcm4TlvDq8ikWAM" } = req.body || {};
  if (!text || !String(text).trim()) return res.status(400).json({ error: "Нужен непустой text" });

  try {
    const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: "POST",
      headers: { "xi-api-key": ELEVEN_KEY, "Content-Type": "application/json", Accept: "audio/mpeg" },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    });
    if (!r.ok) {
      const errText = await r.text().catch(() => "");
      return res.status(r.status).json({ ok: false, error: errText || `ElevenLabs вернул ${r.status}` });
    }
    const buf = Buffer.from(await r.arrayBuffer());
    res.setHeader("Content-Type", "audio/mpeg");
    return res.status(200).send(buf);
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
}

/* ===================== ДИСПЕТЧЕР ===================== */
export default async function handler(req, res) {
  const action = req.query.action;
  if (action === "generate") return handleGenerate(req, res);
  if (action === "status") return handleStatus(req, res);
  if (action === "result") return handleResult(req, res);
  if (action === "lipsync") return handleLipsync(req, res);
  if (action === "song") return handleSong(req, res);
  if (action === "stitch") return handleStitch(req, res);
  if (action === "finalize") return handleFinalize(req, res);
  if (action === "tts") return handleTts(req, res);
  return res.status(400).json({ error: "Неизвестный action" });
}
