/**
 * Пре-генерация озвучки. Алфавит конечен — платим один раз, дальше отдаём статику.
 *
 *   node --env-file=.env scripts/tts-build-cache.mjs            # только новое (инкрементально)
 *   node --env-file=.env scripts/tts-build-cache.mjs --force    # перегенерить всё
 *   TTS_ENGINE=inworld-minji node --env-file=.env scripts/tts-build-cache.mjs
 *
 * Кладёт mp3 в public/tts/ и пишет public/tts/manifest.json (ключ → путь),
 * который читает public/tts-engine.js. Смена движка = смена env + один прогон.
 */
import { readFile, writeFile, mkdir, access } from "node:fs/promises";
import path from "node:path";
import { synthesize, ttsKey, toSpeakable, isJamo, JAMO_CACHE_TAG, DEFAULT_ENGINE } from "../lib/tts-ko.js";

const FORCE = process.argv.includes("--force");
const ENGINE = process.env.TTS_ENGINE || DEFAULT_ENGINE;
/* Новый кэш кладём В ОТДЕЛЬНУЮ ПАПКУ, старый MiniMax-кэш не трогаем:
   так можно сравнить A/B и откатиться, не восстанавливая файлы из git. */
const DIR = path.join(process.cwd(), "public", "tts", "v2", ENGINE);
const MANIFEST = path.join(process.cwd(), "public", "tts", "manifest.json");
const WEB = `/tts/v2/${ENGINE}`;

/* ---- что озвучиваем ---- */
const VOWELS = ["ㅏ","ㅑ","ㅓ","ㅕ","ㅗ","ㅛ","ㅜ","ㅠ","ㅡ","ㅣ","ㅐ","ㅒ","ㅔ","ㅖ","ㅘ","ㅙ","ㅚ","ㅝ","ㅞ","ㅟ","ㅢ"];
const CONSONANTS = ["ㄱ","ㄴ","ㄷ","ㄹ","ㅁ","ㅂ","ㅅ","ㅇ","ㅈ","ㅊ","ㅋ","ㅌ","ㅍ","ㅎ","ㄲ","ㄸ","ㅃ","ㅆ","ㅉ"];

/** вытаскивает корейские строки из curriculum.js без его импорта (это ESM для браузера) */
async function fromCurriculum() {
  const src = await readFile(path.join(process.cwd(), "public", "curriculum.js"), "utf8");
  const out = new Set();
  for (const m of src.matchAll(/\bchar:\s*'([^']+)'/g)) out.add(m[1]);
  for (const m of src.matchAll(/\bkr:\s*'([^']+)'/g)) out.add(m[1]);
  for (const m of src.matchAll(/\bsay:\s*'([^']+)'/g)) out.add(m[1]);
  return [...out].filter((s) => /[ᄀ-ᇿ㄰-㆏가-힯]/.test(s));
}

const exists = (p) => access(p).then(() => true).catch(() => false);

async function main() {
  await mkdir(DIR, { recursive: true });
  const manifest = JSON.parse(await readFile(MANIFEST, "utf8").catch(() => "{}"));

  const items = [];
  for (const v of VOWELS) items.push({ text: v, slow: false });
  for (const c of CONSONANTS) items.push({ text: c, slow: false });
  for (const t of await fromCurriculum()) items.push({ text: t, slow: false });
  // замедленные версии букв — движки без speed отдадут то же самое, это нормально
  for (const v of VOWELS) items.push({ text: v, slow: true });
  for (const c of CONSONANTS) items.push({ text: c, slow: true });

  let made = 0, skipped = 0, failed = 0;
  for (const it of items) {
    // Метка версии у чамо: с 24.07 буква озвучивается ЗВУКОМ (ㄱ → 가), а не названием
    // (기역). Ключ считается от того же символа, поэтому без метки новый файл лёг бы
    // поверх старого только с --force, а браузеры продолжили бы играть закэшированный.
    const key = ttsKey(it.text) + (isJamo(it.text) ? JAMO_CACHE_TAG : "") + (it.slow ? "-slow" : "");
    // Живое аудио носителя (scripts/tts-native.mjs) главнее TTS: не перетираем и не платим.
    if (manifest[key] && String(manifest[key]).startsWith("/tts/native/")) { skipped++; continue; }
    // расширение — по факту, а не по вере: Inworld отдаёт wav, MiniMax mp3.
    // Отдавать wav под именем .mp3 нельзя, Safari на этом спотыкается.
    const already = (await exists(path.join(DIR, `${key}.mp3`))) ? "mp3"
      : (await exists(path.join(DIR, `${key}.wav`))) ? "wav" : null;
    if (!FORCE && already) { manifest[key] = `${WEB}/${key}.${already}`; skipped++; continue; }
    try {
      const buf = await synthesize(it.text, { slow: it.slow, engine: ENGINE });
      const ext = buf.slice(0, 4).toString("latin1") === "RIFF" ? "wav" : "mp3";
      await writeFile(path.join(DIR, `${key}.${ext}`), buf);
      manifest[key] = `${WEB}/${key}.${ext}`;
      made++;
      console.log(`✓ ${it.text}${it.slow ? " (медленно)" : ""} → «${toSpeakable(it.text).speak}» ${buf.length}b`);
    } catch (e) {
      failed++;
      console.log(`✗ ${it.text}: ${e.message}`);
    }
  }

  manifest.__engine = ENGINE;
  manifest.__built = new Date().toISOString().slice(0, 10);
  await writeFile(MANIFEST, JSON.stringify(manifest, null, 0));
  const chars = items.reduce((s, i) => s + toSpeakable(i.text).speak.length, 0);
  console.log(`\nдвижок ${ENGINE}: создано ${made}, пропущено ${skipped}, ошибок ${failed}`);
  console.log(`всего символов в синтезе: ${chars} (единоразово; дальше кэш отдаётся бесплатно)`);
}
main();
