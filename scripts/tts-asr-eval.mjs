/**
 * Объективная оценка проб: обратное распознавание (ASR round-trip).
 * Гипотеза: если корейский ASR не узнаёт слог/букву — человек тоже услышит кашу.
 * Это ПРОКСИ, а не замена ушам: финальное решение всё равно за слухом.
 *
 * Запуск: node --env-file=.env scripts/tts-asr-eval.mjs
 * Читает public/tts-probe/2026-07-23/*.mp3|wav, шлёт в fal-ai/whisper (ko),
 * пишет asr-eval.json + печатает таблицу попаданий по движкам.
 */
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import ffmpegPath from "ffmpeg-static";

/* fal-whisper не принимает wav в data-URI — перегоняем в mp3 в памяти */
function wavToMp3(buf) {
  return new Promise((resolve, reject) => {
    const p = spawn(ffmpegPath, ["-hide_banner", "-loglevel", "error", "-i", "pipe:0", "-f", "mp3", "-b:a", "128k", "pipe:1"]);
    const out = [];
    p.stdout.on("data", (d) => out.push(d));
    p.on("error", reject);
    p.on("close", (c) => (c === 0 ? resolve(Buffer.concat(out)) : reject(new Error("ffmpeg " + c))));
    p.stdin.on("error", () => {});
    p.stdin.end(buf);
  });
}

const FAL_KEY = process.env.FAL_KEY;
const DIR = path.join(process.cwd(), "public", "tts-probe", "2026-07-23");

/* ожидаемый текст по префиксу имени файла */
const EXPECT = {
  "01_": "ㅏ", "02_": "아", "03_": "ㄹ", "04_": "리을",
  "05_": "어", "06_": "오", "07_": "애", "08_": "에",
  "09_": "가", "10_": "카", "11_": "까",
  "12_": "밥", "13_": "각", "14_": "각", "15_": "각",
  "16_": "안녕하세요 만나서 반가워요", "17_": "오늘 밤 우리 둘만의 별빛 아래에서",
};

const norm = (s) => (s || "").replace(/[\s.,!?~"'·…]/g, "");

async function asr(buf, mime) {
  const dataUri = `data:${mime};base64,${buf.toString("base64")}`;
  const r = await fetch("https://fal.run/fal-ai/whisper", {
    method: "POST",
    headers: { Authorization: `Key ${FAL_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ audio_url: dataUri, task: "transcribe", language: "ko", chunk_level: "segment" }),
  });
  if (!r.ok) throw new Error(`${r.status} ${(await r.text()).slice(0, 120)}`);
  const j = await r.json();
  return (j.text || "").trim();
}

const run = async () => {
  const only = process.argv[2];
  const files = (await readdir(DIR))
    .filter((f) => /\.(mp3|wav)$/i.test(f) && (!only || f.includes(only)))
    .sort();
  const rows = [];
  for (const f of files) {
    const pre = f.slice(0, 3);
    const expect = EXPECT[pre];
    if (!expect) continue;
    const engine = (f.split("__")[1] || "").replace(/\.(mp3|wav)$/i, "");
    try {
      let buf = await readFile(path.join(DIR, f));
      if (/\.wav$/i.test(f)) buf = await wavToMp3(buf);
      const heard = await asr(buf, "audio/mpeg");
      const hit = norm(heard) === norm(expect);
      rows.push({ file: f, engine, test: pre, expect, heard, hit });
      console.log(`${hit ? "✓" : "✗"} ${pre} ${engine.padEnd(28)} ждал «${expect}» услышал «${heard}»`);
    } catch (e) {
      rows.push({ file: f, engine, test: pre, expect, error: String(e.message) });
      console.log(`! ${f}: ${e.message}`);
    }
  }
  await writeFile(path.join(DIR, "asr-eval.json"), JSON.stringify(rows, null, 2));

  const by = {};
  for (const r of rows) {
    if (r.error) continue;
    const b = (by[r.engine] ||= { hit: 0, n: 0, letters: 0, lettersN: 0 });
    b.n++; if (r.hit) b.hit++;
    if (+r.test.slice(0, 2) <= 15) { b.lettersN++; if (r.hit) b.letters++; }
  }
  console.log("\n— распознаваемость (обратный ASR, корейский Whisper) —");
  for (const [k, v] of Object.entries(by))
    console.log(`${k.padEnd(28)} всего ${v.hit}/${v.n}   на буквах/слогах ${v.letters}/${v.lettersN}`);
};
run();
