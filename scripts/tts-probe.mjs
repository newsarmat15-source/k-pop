/**
 * TTS-проба 23.07.2026 — слепое сравнение движков на корейском.
 * Запуск: node --env-file=.env scripts/tts-probe.mjs [engine...]
 * Кладёт mp3 в public/tts-probe/2026-07-23/<engine>__<textkey>.mp3
 * Пишет отчёт по задержке в public/tts-probe/2026-07-23/latency.json
 *
 * ВАЖНО: платит по уже оплаченному FAL_KEY. Объём — десятки символов, цена копеечная.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const FAL_KEY = process.env.FAL_KEY;
if (!FAL_KEY) throw new Error("FAL_KEY не задан");

const OUT = path.join(process.cwd(), "public", "tts-probe", "2026-07-23");

/* ---- набор текстов: то, что реально произносит продукт ---- */
const TEXTS = {
  // 1. как СЕЙЧАС шлёт приложение — голая чамо (корень проблемы)
  "01-jamo-vowel-RAW": "ㅏ",
  "02-jamo-cons-RAW": "ㄹ",
  // 2. как НАДО: гласная = слог с немой ㅇ
  "03-vowel-FIXED": "아",
  // 3. согласная = имя буквы + демонстрация звука
  "04-cons-name": "리을",
  "05-cons-demo": "리을. 라, 러, 로, 루.",
  // 4. одиночный слог
  "06-syllable": "가",
  // 5. учебная фраза
  "07-phrase": "안녕하세요. 만나서 반가워요.",
  // 6. строка в духе песни (оригинальная, не чужой текст)
  "08-songline": "오늘 밤 우리 둘만의 별빛 아래에서",
};

/* ---- кандидаты ---- */
const ENGINES = {
  // БАЗОВАЯ ЛИНИЯ — то, что стоит сейчас
  "minimax-02hd": {
    url: "https://fal.run/fal-ai/minimax/speech-02-hd",
    body: (t) => ({
      text: t,
      voice_setting: { voice_id: "Korean_SweetGirl", speed: 1.0 },
      language_boost: "Korean",
      output_format: "url",
    }),
  },
  "minimax-28hd": {
    url: "https://fal.run/fal-ai/minimax/speech-2.8-hd",
    body: (t) => ({
      prompt: t,
      voice_setting: { voice_id: "Korean_SweetGirl", speed: 1.0 },
      language_boost: "Korean",
      output_format: "url",
    }),
  },
  "gemini-31-flash": {
    url: "https://fal.run/fal-ai/gemini-3.1-flash-tts",
    body: (t) => ({
      prompt: t,
      style_instructions:
        "You are a young Korean woman teaching Korean to a beginner. Pronounce clearly and naturally, at a calm teaching pace. Warm, friendly, not a news anchor.",
      voice: "Leda",
      language_code: "Korean (South Korea)",
      output_format: "mp3",
    }),
  },
  "qwen3-sohee": {
    url: "https://fal.run/fal-ai/qwen-3-tts/text-to-speech/1.7b",
    body: (t) => ({ text: t, voice: "Sohee", language: "Korean" }),
  },
  "inworld-minji": {
    url: "https://fal.run/fal-ai/inworld-tts",
    body: (t) => ({ text: t, voice: "Minji (ko)", sample_rate_hertz: 48000 }),
  },
  "inworld-yoona": {
    url: "https://fal.run/fal-ai/inworld-tts",
    body: (t) => ({ text: t, voice: "Yoona (ko)", sample_rate_hertz: 48000 }),
  },
  // ElevenLabs через fal — голоса только англоязычные пресеты, проверяем акцент
  "elevenlabs-v3-jessica": {
    url: "https://fal.run/fal-ai/elevenlabs/tts/eleven-v3",
    body: (t) => ({ text: t, voice: "Jessica", stability: 0.5 }),
  },
};

function pickAudioUrl(j) {
  if (!j) return null;
  if (typeof j.audio === "string") return j.audio;
  if (j.audio?.url) return j.audio.url;
  if (j.audio_url?.url) return j.audio_url.url;
  if (typeof j.audio_url === "string") return j.audio_url;
  if (j.audio_file?.url) return j.audio_file.url;
  return null;
}

async function run() {
  await mkdir(OUT, { recursive: true });
  const only = process.argv.slice(2);
  const names = only.length ? only : Object.keys(ENGINES);
  const report = [];

  for (const name of names) {
    const eng = ENGINES[name];
    if (!eng) {
      console.log(`пропуск: нет движка ${name}`);
      continue;
    }
    for (const [key, text] of Object.entries(TEXTS)) {
      const t0 = Date.now();
      try {
        const r = await fetch(eng.url, {
          method: "POST",
          headers: { Authorization: `Key ${FAL_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify(eng.body(text)),
        });
        const raw = await r.text();
        if (!r.ok) {
          console.log(`✗ ${name} ${key}: ${r.status} ${raw.slice(0, 160)}`);
          report.push({ engine: name, text: key, ok: false, status: r.status, error: raw.slice(0, 300) });
          continue;
        }
        const j = JSON.parse(raw);
        const url = pickAudioUrl(j);
        const ms = Date.now() - t0;
        if (!url) {
          console.log(`✗ ${name} ${key}: нет audio в ответе ${raw.slice(0, 160)}`);
          report.push({ engine: name, text: key, ok: false, error: "no audio url" });
          continue;
        }
        const ab = await (await fetch(url)).arrayBuffer();
        const ext = url.split("?")[0].split(".").pop().slice(0, 4) || "mp3";
        const file = path.join(OUT, `${name}__${key}.${ext}`);
        await writeFile(file, Buffer.from(ab));
        console.log(`✓ ${name} ${key}  ${ms}ms  ${Buffer.from(ab).length}b`);
        report.push({ engine: name, text: key, ok: true, ms, bytes: Buffer.from(ab).length, chars: text.length });
      } catch (e) {
        console.log(`✗ ${name} ${key}: ${e.message}`);
        report.push({ engine: name, text: key, ok: false, error: String(e.message) });
      }
    }
  }
  await writeFile(path.join(OUT, "latency.json"), JSON.stringify({ texts: TEXTS, report }, null, 2));
  // сводка задержек
  const by = {};
  for (const r of report) if (r.ok) (by[r.engine] ||= []).push(r.ms);
  console.log("\n— медиана задержки (полный запрос, из РФ, без стриминга) —");
  for (const [k, v] of Object.entries(by)) {
    const s = v.slice().sort((a, b) => a - b);
    console.log(`${k.padEnd(24)} med ${s[Math.floor(s.length / 2)]}ms  min ${s[0]}  max ${s[s.length - 1]}  n=${s.length}`);
  }
}

run();
