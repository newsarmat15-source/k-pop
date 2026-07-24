/**
 * Живое аудио носителей для СЛОВ курса — из Wikimedia Commons (проект Lingua Libre),
 * лицензия CC-BY-SA. Не TTS: реальные корейцы произносят слово.
 *
 *   node scripts/tts-native.mjs            # инкрементально (уже скачанное пропускает)
 *   node scripts/tts-native.mjs --force    # перекачать всё
 *
 * Кладёт mp3 в public/tts/native/<ключ>.mp3, дописывает public/tts/manifest.json
 * (тот же ключ ttsKey, что у TTS — фронт сам предпочтёт манифест) и ведёт
 * public/tts/native/CREDITS.json (автор+лицензия на каждый файл — требование CC-BY-SA).
 *
 * Фразы (с пробелом или '?') не трогаем: пословных записей носителей на них нет,
 * их озвучивает TTS. Алфавит не трогаем: живое аудио буквы = её НАЗВАНИЕ (기역).
 */
import { readFile, writeFile, mkdir, access } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import ffmpegPath from "ffmpeg-static";
import { ttsKey } from "../lib/tts-ko.js";

const FORCE = process.argv.includes("--force");
const ROOT = process.cwd();
const DIR = path.join(ROOT, "public", "tts", "native");
const MANIFEST = path.join(ROOT, "public", "tts", "manifest.json");
const CREDITS = path.join(DIR, "CREDITS.json");
const WEB = "/tts/native";
const UA = "Idolingo/1.0 (Korean learning app; audio sourcing; contact newsarmat1.5@gmail.com)";
const AUDIO_RE = /\.(wav|ogg|oga|flac|mp3)$/i;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const exists = (p) => access(p).then(() => true).catch(() => false);

async function api(params) {
  const url = "https://commons.wikimedia.org/w/api.php?format=json&origin=*&" +
    new URLSearchParams(params).toString();
  const r = await fetch(url, { headers: { "User-Agent": UA } });
  if (!r.ok) throw new Error(`API ${r.status}`);
  return r.json();
}

/** Ищет на Commons файл Lingua Libre (kor) с ТОЧНЫМ словом в конце имени. */
async function findNative(word) {
  const j = await api({
    action: "query", list: "search", srnamespace: "6", srlimit: "20",
    srsearch: `intitle:(kor) intitle:${word}`,
  });
  const hits = (j?.query?.search || []).map((s) => s.title).filter((t) => AUDIO_RE.test(t));
  // точное совпадение: имя оканчивается на "-<word>.<ext>"
  const exact = hits.find((t) => {
    const base = t.replace(/^File:/, "").replace(AUDIO_RE, "");
    const tail = base.split("-").pop();
    return tail === word;
  });
  return exact || null;
}

/** url + автор + лицензия файла. */
async function fileInfo(title) {
  const j = await api({
    action: "query", titles: title, prop: "imageinfo",
    iiprop: "url|extmetadata",
  });
  const pages = j?.query?.pages || {};
  const page = Object.values(pages)[0];
  const ii = page?.imageinfo?.[0];
  if (!ii) return null;
  const em = ii.extmetadata || {};
  const strip = (h) => (h ? String(h).replace(/<[^>]+>/g, "").trim() : "");
  return {
    url: ii.url,
    author: strip(em.Artist?.value) || "Lingua Libre contributor",
    license: em.LicenseShortName?.value || "CC BY-SA",
    licenseUrl: em.LicenseUrl?.value || "",
    descUrl: ii.descriptionurl || "",
  };
}

function ffmpeg(args) {
  return new Promise((res, rej) => {
    const p = spawn(ffmpegPath, args, { stdio: ["ignore", "ignore", "pipe"] });
    let err = "";
    p.stderr.on("data", (d) => (err += d));
    p.on("close", (c) => (c === 0 ? res() : rej(new Error(err.slice(-200)))));
  });
}

async function main() {
  await mkdir(DIR, { recursive: true });
  const manifest = JSON.parse(await readFile(MANIFEST, "utf8").catch(() => "{}"));
  const credits = JSON.parse(await readFile(CREDITS, "utf8").catch(() => "{}"));

  // слова курса из curriculum.js (без импорта — это браузерный ESM)
  const src = await readFile(path.join(ROOT, "public", "curriculum.js"), "utf8");
  const words = new Set();
  for (const re of [/\bkr:\s*'([^']+)'/g, /\bsay:\s*'([^']+)'/g]) {
    for (const m of src.matchAll(re)) words.add(m[1]);
  }
  // кандидаты на живое аудио: одиночные слова, без пробелов и '?'
  const candidates = [...words].filter(
    (w) => /^[가-힣]+$/.test(w) && w.length >= 1 && w.length <= 5
  );

  let made = 0, skipped = 0, missing = 0, failed = 0;
  const gaps = [];
  for (const word of candidates) {
    const key = ttsKey(word);
    const outMp3 = path.join(DIR, `${key}.mp3`);
    if (!FORCE && (await exists(outMp3))) {
      manifest[key] = `${WEB}/${key}.mp3`;
      skipped++;
      continue;
    }
    try {
      await sleep(350);
      const title = await findNative(word);
      if (!title) { missing++; gaps.push(word); console.log(`— ${word}: живого нет`); continue; }
      await sleep(250);
      const info = await fileInfo(title);
      if (!info?.url) { missing++; gaps.push(word); continue; }
      const tmp = path.join(DIR, `_${key}.src`);
      const audio = await fetch(info.url, { headers: { "User-Agent": UA } });
      if (!audio.ok) throw new Error(`download ${audio.status}`);
      await writeFile(tmp, Buffer.from(await audio.arrayBuffer()));
      // моно, 24кГц, срезать тишину по краям, нормализовать, mp3 — для iOS и размера
      await ffmpeg([
        "-y", "-i", tmp,
        "-ac", "1", "-ar", "24000",
        "-af", "silenceremove=start_periods=1:start_silence=0.05:start_threshold=-45dB:detection=peak,areverse,silenceremove=start_periods=1:start_silence=0.05:start_threshold=-45dB:detection=peak,areverse,loudnorm=I=-16:TP=-1.5",
        "-codec:a", "libmp3lame", "-q:a", "5",
        outMp3,
      ]);
      await import("node:fs/promises").then((fs) => fs.unlink(tmp).catch(() => {}));
      manifest[key] = `${WEB}/${key}.mp3`;
      credits[word] = { file: title, author: info.author, license: info.license, source: info.descUrl };
      made++;
      console.log(`✓ ${word} → ${info.author} (${info.license})`);
    } catch (e) {
      failed++;
      console.log(`✗ ${word}: ${e.message}`);
    }
  }

  manifest.__native_built = new Date().toISOString().slice(0, 10);
  await writeFile(MANIFEST, JSON.stringify(manifest, null, 0));
  await writeFile(CREDITS, JSON.stringify(credits, null, 2));
  console.log(`\nживое аудио: скачано ${made}, было ${skipped}, нет записи ${missing}, ошибок ${failed}`);
  console.log(`кандидатов-слов: ${candidates.length}`);
  if (gaps.length) console.log(`без живого (уйдут в TTS): ${gaps.join(" ")}`);
}
main();
