// Проверка: может ли ElevenLabs Music смешать корейский и английский в одной песне
// (первая половина — корейский, вторая — английский), для механики "тренировка вокала = урок языка".
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import { buffer as streamToBuffer } from "node:stream/consumers";
import { writeFile } from "node:fs/promises";
import path from "node:path";

const elevenlabs = new ElevenLabsClient({ apiKey: process.env.ELEVENLABS_API_KEY });

const track = await elevenlabs.music.compose({
  prompt:
    "Upbeat K-pop chorus hook, catchy modern K-pop production, confident mood. " +
    "The vocals sing the first half of the line in Korean, then switch clearly to English for the second half of the line — " +
    "a genuine bilingual Korean-English K-pop verse, like real K-pop songs that mix both languages in the same track. " +
    "Continuous singing throughout, no instrumental gaps.",
  musicLengthMs: 15000,
  modelId: "music_v2",
});
const buf = Buffer.isBuffer(track) ? track : await streamToBuffer(track);
const outPath = path.join(process.cwd(), "test-output", `bilingual_test_${Date.now()}.mp3`);
await writeFile(outPath, buf);
console.log("[saved]", outPath);
