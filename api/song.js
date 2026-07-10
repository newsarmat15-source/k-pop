// StageOne — генерация песни через ElevenLabs Music, программная обрезка до лучшего
// непрерывного вокального куска (через ffmpeg silencedetect), загрузка на CDN fal.ai.
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import { buffer as streamToBuffer } from "node:stream/consumers";
import { writeFile, readFile, unlink } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import os from "node:os";
import ffmpegPath from "ffmpeg-static";
import { fetchWithRetry } from "../lib/fal-fetch.js";

const SONG = {
  ballad: "slow emotional tempo, soft minor key, punchy kick",
  rnb: "smooth R&B groove, sultry pocket, warm bass",
  hyperpop: "fast high-energy beat, explosive drops, crisp hi-hats",
  citypop: "retro funk groove, warm bass line, synth stabs",
  rock: "driving rock energy, distorted guitars, hard drums",
  darktrap: "heavy dark trap rhythm, 808 bass, rapid hi-hat rolls",
};
// Языки для мультиязычных кусков (см. PROGRESS.md — тренировка вокала = урок языка).
const LANGUAGE = {
  ko: "Korean", en: "English", ja: "Japanese", zh: "Chinese",
};

// Уникальный голос на персонажа: ElevenLabs Music не даёт выбрать вокал из библиотеки
// (в отличие от их же TTS) — единственные рычаги это текстовое описание тембра/регистра
// в промпте плюс seed генерации. Голос закрепляется за именем айдола хэшем — детерминированно
// (один и тот же айдол всегда звучит одинаково), без ручного распределения по каждому.
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

// Находит тихие участки (вероятно без вокала) через фильтр silencedetect.
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

// Ищет лучшее непрерывное "громкое" окно нужной длины среди пауз.
function findBestWindow(silences, totalSec, windowSec) {
  const bounds = [0, ...silences.flatMap(([a, b]) => [a, b]), totalSec].sort((a, b) => a - b);
  const loudSpans = [];
  for (let i = 0; i < bounds.length - 1; i++) {
    const a = bounds[i], b = bounds[i + 1];
    const inSilence = silences.some(([s, e]) => a >= s - 0.01 && b <= e + 0.01);
    if (!inSilence && b - a > 0.05) loudSpans.push([a, b]);
  }
  // объединяем соседние громкие интервалы (между ними нет тишины длиннее фильтра)
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
  // ничего достаточно длинного без пауз — берём середину как компромисс
  return Math.max(0, (totalSec - windowSec) / 2);
}

async function trimAudio(inputPath, outputPath, startSec, durationSec) {
  await runFfmpeg([
    "-y", "-i", inputPath,
    "-ss", String(startSec), "-t", String(durationSec),
    "-c", "copy", outputPath,
  ]);
}

async function getDurationSec(filePath) {
  const stderr = await runFfmpeg(["-i", filePath, "-f", "null", "-"]).catch((e) => e.message);
  const m = stderr.match(/Duration:\s*(\d+):(\d+):(\d+\.\d+)/);
  if (!m) return null;
  return (+m[1]) * 3600 + (+m[2]) * 60 + parseFloat(m[3]);
}

async function uploadToFalCdn(buf, falKey) {
  const initRes = await fetchWithRetry("https://rest.alpha.fal.ai/storage/upload/initiate?storage_type=fal-cdn-v3", {
    method: "POST",
    headers: { Authorization: `Key ${falKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ content_type: "audio/mpeg", file_name: `song-${Date.now()}.mp3` }),
  });
  if (!initRes.ok) throw new Error(`fal storage initiate ${initRes.status}: ${await initRes.text()}`);
  const { upload_url, file_url } = await initRes.json();
  if (!upload_url || !file_url) throw new Error("fal storage: нет upload_url/file_url в ответе");

  const uploadRes = await fetchWithRetry(upload_url, {
    method: "PUT",
    headers: { "Content-Type": "audio/mpeg" },
    body: buf,
  });
  if (!uploadRes.ok) throw new Error(`fal storage upload ${uploadRes.status}: ${await uploadRes.text()}`);
  return file_url;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST" });
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
    const bufferSec = windowSec + 10; // с запасом, чтобы было из чего выбирать
    const { descriptor: voiceDescriptor, seed } = voiceProfileFor(memberName, gender);

    const elevenlabs = new ElevenLabsClient({ apiKey: ELEVEN_KEY });
    const track = await elevenlabs.music.compose({
      prompt:
        `Upbeat K-pop chorus hook, ${voiceDescriptor} vocals singing in ${langName}, ${songVibe}, ` +
        "catchy, lyric-dense, modern K-pop production, confident mood, continuous singing throughout.",
      musicLengthMs: Math.round(bufferSec * 1000),
      modelId: "music_v2",
      seed,
    });
    const rawBuf = Buffer.isBuffer(track) ? track : await streamToBuffer(track);
    await writeFile(rawPath, rawBuf);

    const totalSec = (await getDurationSec(rawPath)) || bufferSec;
    const silences = await detectSilences(rawPath);
    const startSec = findBestWindow(silences, totalSec, windowSec);

    await trimAudio(rawPath, cutPath, startSec, windowSec);
    const cutBuf = await readFile(cutPath);

    const songUrl = await uploadToFalCdn(cutBuf, FAL_KEY);
    return res.status(200).json({ ok: true, songUrl, debug: { totalSec, silences, chosenStart: startSec, voiceDescriptor, seed } });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e?.message || e) });
  } finally {
    await unlink(rawPath).catch(() => {});
    await unlink(cutPath).catch(() => {});
  }
}
