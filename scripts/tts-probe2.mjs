/**
 * TTS-проба №2, 23.07.2026 — учебные критерии.
 * Минимальные пары, патчхим, замедление, повторяемость.
 * Запуск: node --env-file=.env scripts/tts-probe2.mjs [engine...]
 * Файлы: public/tts-probe/2026-07-23/<NN>_<что слышно>__<движок>.mp3
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const FAL_KEY = process.env.FAL_KEY;
if (!FAL_KEY) throw new Error("FAL_KEY не задан");
const OUT = path.join(process.cwd(), "public", "tts-probe", "2026-07-23");

/* порядок прослушивания = порядок сортировки имён файлов */
const TESTS = [
  ["01_как-сейчас_голая-буква-A", "ㅏ", {}],
  ["02_правильно_гласная-A", "아", {}],
  ["03_как-сейчас_голая-буква-R", "ㄹ", {}],
  ["04_правильно_имя-буквы-риыль", "리을", {}],
  ["05_пара-ЕО-О_первая-어", "어", {}],
  ["06_пара-ЕО-О_вторая-오", "오", {}],
  ["07_пара-Э-Е_первая-애", "애", {}],
  ["08_пара-Э-Е_вторая-에", "에", {}],
  ["09_тройка-К_обычная-가", "가", {}],
  ["10_тройка-К_придыхательная-카", "카", {}],
  ["11_тройка-К_напряжённая-까", "까", {}],
  ["12_патчхим_밥", "밥", {}],
  ["13_патчхим_각", "각", {}],
  ["14_замедленно_각", "각", { slow: true }],
  ["15_повтор_각_дубль2", "각", {}],
  ["16_фраза_안녕하세요-만나서-반가워요", "안녕하세요. 만나서 반가워요.", {}],
  ["17_строка-песни", "오늘 밤 우리 둘만의 별빛 아래에서", {}],
];

const ENGINES = {
  // ТО, ЧТО СТОИТ СЕЙЧАС: speech-02-hd + Korean_SweetGirl + скорость 1.2
  "A-текущий-minimax02hd-1.2x": {
    url: "https://fal.run/fal-ai/minimax/speech-02-hd",
    body: (t, o) => ({
      text: t,
      voice_setting: { voice_id: "Korean_SweetGirl", speed: o.slow ? 0.8 : 1.2 },
      language_boost: "Korean",
      output_format: "url",
    }),
  },
  "B-minimax28hd": {
    url: "https://fal.run/fal-ai/minimax/speech-2.8-hd",
    body: (t, o) => ({
      prompt: t,
      voice_setting: { voice_id: "Korean_SweetGirl", speed: o.slow ? 0.75 : 1.0 },
      language_boost: "Korean",
      output_format: "url",
    }),
  },
  "C-inworld-Minji": {
    url: "https://fal.run/fal-ai/inworld-tts",
    // у Inworld нет параметра скорости — замедление недоступно на стороне движка
    body: (t) => ({ text: t, voice: "Minji (ko)", sample_rate_hertz: 24000 }),
  },
  "D-inworld-Yoona": {
    url: "https://fal.run/fal-ai/inworld-tts",
    body: (t) => ({ text: t, voice: "Yoona (ko)", sample_rate_hertz: 24000 }),
  },
  "E-qwen3-Sohee": {
    url: "https://fal.run/fal-ai/qwen-3-tts/text-to-speech/1.7b",
    body: (t, o) => ({
      text: t,
      voice: "Sohee",
      language: "Korean",
      prompt: o.slow ? "천천히, 또렷하게 발음하세요." : "또렷하고 친근하게.",
      temperature: 0.7,
    }),
  },
  "F-elevenlabs-v3-англоголос": {
    url: "https://fal.run/fal-ai/elevenlabs/tts/eleven-v3",
    body: (t) => ({ text: t, voice: "Jessica", stability: 0.5 }),
  },
};

const pickUrl = (j) =>
  (typeof j?.audio === "string" && j.audio) || j?.audio?.url || j?.audio_url?.url ||
  (typeof j?.audio_url === "string" && j.audio_url) || j?.audio_file?.url || null;

async function one(name, eng, key, text, opts, report) {
  const t0 = Date.now();
  try {
    const r = await fetch(eng.url, {
      method: "POST",
      headers: { Authorization: `Key ${FAL_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify(eng.body(text, opts)),
    });
    const raw = await r.text();
    if (!r.ok) {
      console.log(`✗ ${key} ${name}: ${r.status} ${raw.slice(0, 120)}`);
      report.push({ engine: name, test: key, ok: false, status: r.status, error: raw.slice(0, 240) });
      return;
    }
    const url = pickUrl(JSON.parse(raw));
    if (!url) { report.push({ engine: name, test: key, ok: false, error: "no audio url" }); return; }
    const buf = Buffer.from(await (await fetch(url)).arrayBuffer());
    const ext = (url.split("?")[0].split(".").pop() || "mp3").slice(0, 4);
    await writeFile(path.join(OUT, `${key}__${name}.${ext}`), buf);
    const ms = Date.now() - t0;
    console.log(`✓ ${key} ${name} ${ms}ms ${buf.length}b`);
    report.push({ engine: name, test: key, ok: true, ms, bytes: buf.length, text });
  } catch (e) {
    console.log(`✗ ${key} ${name}: ${e.message}`);
    report.push({ engine: name, test: key, ok: false, error: String(e.message) });
  }
}

async function run() {
  await mkdir(OUT, { recursive: true });
  const only = process.argv.slice(2);
  const names = only.length ? only : Object.keys(ENGINES);
  const report = [];
  for (const name of names) {
    const eng = ENGINES[name];
    if (!eng) { console.log(`нет движка ${name}`); continue; }
    for (const [key, text, opts] of TESTS) await one(name, eng, key, text, opts, report);
  }
  await writeFile(
    path.join(OUT, `latency2-${names.length === Object.keys(ENGINES).length ? "all" : names.join("-")}.json`),
    JSON.stringify(report, null, 2)
  );
  const by = {};
  for (const r of report) if (r.ok) (by[r.engine] ||= []).push(r.ms);
  console.log("\n— задержка полного запроса (из РФ, не стриминг) —");
  for (const [k, v] of Object.entries(by)) {
    const s = v.slice().sort((a, b) => a - b);
    console.log(`${k.padEnd(28)} med ${s[Math.floor(s.length / 2)]}ms  min ${s[0]}  max ${s[s.length - 1]}  ok=${s.length}/${TESTS.length}`);
  }
}
run();
