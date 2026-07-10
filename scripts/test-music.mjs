// Диагностический тест: работает ли Eleven Music API на текущем плане аккаунта,
// и как звучит K-pop стиль с корейским вокалом.
// Запуск: node --env-file=.env scripts/test-music.mjs

import { writeFile } from "node:fs/promises";
import { buffer as streamToBuffer } from "node:stream/consumers";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

const KEY = process.env.ELEVENLABS_API_KEY;
if (!KEY) { console.error("ELEVENLABS_API_KEY не задан"); process.exit(1); }

const elevenlabs = new ElevenLabsClient({ apiKey: KEY });

// Тот же словарь стилей, что в api/generate.js — проверяем, различает ли Eleven Music эти стили так же чётко.
const SONG = {
  ballad: "slow emotional tempo, soft minor key, punchy kick",
  rnb: "smooth R&B groove, sultry pocket, warm bass",
  hyperpop: "fast high-energy beat, explosive drops, crisp hi-hats",
  citypop: "retro funk groove, warm bass line, synth stabs",
  rock: "driving rock energy, distorted guitars, hard drums",
  darktrap: "heavy dark trap rhythm, 808 bass, rapid hi-hat rolls",
};

const style = process.argv[2] || "hyperpop";
const songVibe = SONG[style] || SONG.hyperpop;

async function main() {
  console.log(`[compose] запрашиваю K-pop трек (стиль: ${style}), корейский вокал, 15с...`);
  try {
    const track = await elevenlabs.music.compose({
      prompt:
        `Upbeat K-pop girl-crush anthem, powerful female vocals singing in Korean, ${songVibe}, ` +
        "catchy pre-chorus and hook, modern K-pop production, confident mood.",
      musicLengthMs: 15000,
      modelId: "music_v2",
    });

    // track — ReadableStream (web stream), конвертируем в Buffer
    const buf = Buffer.isBuffer(track) ? track : await streamToBuffer(track);
    const outName = `music_test_${style}_${Date.now()}.mp3`;
    await writeFile(new URL(`../test-output/${outName}`, import.meta.url), buf);
    console.log(`[saved] test-output/${outName}`);
  } catch (e) {
    console.error("[FAILED]");
    console.error("status:", e?.statusCode || e?.status || "unknown");
    console.error("body:", JSON.stringify(e?.body || e?.message || e, null, 2));
    process.exit(1);
  }
}

main();
