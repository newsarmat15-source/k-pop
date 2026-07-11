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
/* ============================================================================
 * ТАНЦЕВАЛЬНАЯ СИСТЕМА (взаимозависимая: жанр песни ↔ стиль группы ↔ пул движений)
 * ----------------------------------------------------------------------------
 * Kling ест только текст. Это СЛОВАРЬ энергетики/сигнатуры, не покадровая копия
 * чужой хореографии (CLAUDE.md §5, корейский дипфейк/закон о схожести): во фразах
 * НЕТ ни названий групп, ни названий песен — только обобщённые движения (finger
 * guns, hip sway, tutting и т.п.), которые сами по себе не охраняются.
 *
 * 5 унифицированных жанров = 5 однозначных танцевальных энергий (см. GENRE_ALIAS).
 * Каждое движение тегается: genres[], fam[] (семья стиля), phase, sig (фирменное).
 * selectDance(genre, group, seed) детерминированно (seed) собирает 3-фазный
 * таймлайн: сначала ВСЕ фирменные point-движения группы, добор — филлер по жанру.
 * Разный seed (разный айдол/юзер) → разные комбинации, без повторов, всё популярное.
 * ============================================================================ */

// Жанр песни → канонический танцевальный жанр. Старые ключи фронта тоже резолвятся
// (обратная совместимость, чтобы холодный/старый клиент не падал).
const GENRE_ALIAS = {
  ballad:"ballad",
  girlcrush:"girlcrush", rock:"girlcrush", darktrap:"girlcrush",
  retro:"retro", citypop:"retro", rnb:"retro",
  future:"future", hyperpop:"future",
  easy:"easy",
};
const resolveGenre = (g) => GENRE_ALIAS[g] || "girlcrush";

// Стиль каждой из 9 женских групп: семья движений (fam) + родные жанры.
const GROUP_STYLE = {
  lesserafim:{ fam:"crush",   genres:["girlcrush","future"] },
  aespa:     { fam:"future",  genres:["future","girlcrush"] },
  ive:       { fam:"elegant", genres:["retro","easy"] },
  idle:      { fam:"crush",   genres:["girlcrush","retro"] },
  babymonster:{fam:"crush",   genres:["girlcrush","future"] },
  katseye:   { fam:"easy",    genres:["easy","future"] },
  blackpink: { fam:"crush",   genres:["girlcrush","retro"] },
  newjeans:  { fam:"easy",    genres:["easy","retro"] },
  twice:     { fam:"retro",   genres:["retro","easy"] },
};

const STYLE_TONE = {
  crush:  "Athletic, powerful, hard-hitting attitude throughout — every hit committed and grounded.",
  future: "Futuristic, sharp and robotic — precise isolations with cool controlled attitude.",
  retro:  "Groovy, playful retro energy — bouncy, swingy and confident.",
  easy:   "Effortless, natural and youthful — relaxed but precise, never stiff or forced.",
  elegant:"Refined and confident — full-amplitude lines with elegant control.",
};
const BALLAD_TONE = "Minimal, slow and emotional — restrained flowing movement, only a few gestures, lots of expressive stillness, never busy.";

// Библиотека мув-фраз. sig=<ключ группы> → обязательное фирменное point-движение.
// sig=null → филлер (добор по жанру/семье). phase: open|mid|close|any.
const MOVES = [
  // ---- Фирменные (point) движения групп — обобщённые, без копирования ----
  { id:"ls_o", sig:"lesserafim", phase:"open",  fam:["crush"],  genres:["girlcrush","future"], phrase:"sharp diagonal arm slashes snapping out to full extension on each beat" },
  { id:"ls_m", sig:"lesserafim", phase:"mid",   fam:["crush"],  genres:["girlcrush"],          phrase:"an athletic hip snap freezing into a cocky attitude pose, switching direction on the hit" },
  { id:"ls_c", sig:"lesserafim", phase:"close", fam:["crush"],  genres:["girlcrush"],          phrase:"fanning both hands past the head then flicking them up into raised pointed fingers" },

  { id:"ae_o", sig:"aespa", phase:"open",  fam:["future"], genres:["future"],           phrase:"crisp tutting hand isolations tracing sharp geometric angles in the air" },
  { id:"ae_m", sig:"aespa", phase:"mid",   fam:["future"], genres:["future","girlcrush"],phrase:"flicking the fingers side to side with a cool dismissive attitude" },
  { id:"ae_c", sig:"aespa", phase:"close", fam:["future"], genres:["future","girlcrush"],phrase:"a hard robotic freeze locking into a low grounded power stance" },

  { id:"iv_o", sig:"ive", phase:"open",  fam:["elegant"], genres:["retro","easy"], phrase:"an elegant sweeping full-arm extension with a confident lifted chin" },
  { id:"iv_m", sig:"ive", phase:"mid",   fam:["elegant"], genres:["retro"],        phrase:"lifting one hand beside the face and gazing into it like an imaginary mirror with a self-adoring tilt" },
  { id:"iv_c", sig:"ive", phase:"close", fam:["elegant"], genres:["retro","easy"], phrase:"a smooth retro shoulder groove rolling into a playful hip pop" },

  { id:"id_o", sig:"idle", phase:"open",  fam:["crush"], genres:["girlcrush","retro"], phrase:"a slow confident strut punctuated by a bold chest pop" },
  { id:"id_m", sig:"idle", phase:"mid",   fam:["crush"], genres:["girlcrush","retro"], phrase:"a sensual hip roll melting into a fierce point-and-hold" },
  { id:"id_c", sig:"idle", phase:"close", fam:["crush"], genres:["girlcrush"],         phrase:"a sassy hand-on-hip snap with a defiant head turn to camera" },

  { id:"bm_o", sig:"babymonster", phase:"open",  fam:["crush"], genres:["girlcrush","future"], phrase:"aggressive grounded stomps driven by hard shoulder pops" },
  { id:"bm_m", sig:"babymonster", phase:"mid",   fam:["crush"], genres:["girlcrush","future"], phrase:"an explosive full-body point throwing both arms and one leg outward on the beat" },
  { id:"bm_c", sig:"babymonster", phase:"close", fam:["crush"], genres:["girlcrush"],          phrase:"a rapid arm-pump combo dropping into a low wide power stance" },

  { id:"ka_o", sig:"katseye", phase:"open",  fam:["easy"], genres:["easy","future"], phrase:"a bouncy playful step with a bright wide arm wave" },
  { id:"ka_m", sig:"katseye", phase:"mid",   fam:["easy"], genres:["future","easy"], phrase:"a staccato hyperpop body-pop with a cheeky attitude flick" },
  { id:"ka_c", sig:"katseye", phase:"close", fam:["easy"], genres:["easy"],          phrase:"a confident global-pop strut spinning into a photo-ready pose" },

  { id:"bp_o", sig:"blackpink", phase:"open",  fam:["crush"], genres:["girlcrush","retro"], phrase:"a slow sultry hip-hop strut led by the shoulders with effortless swagger" },
  { id:"bp_m", sig:"blackpink", phase:"mid",   fam:["crush"], genres:["girlcrush"],         phrase:"double finger-guns thrust forward snapping on the beat with a badass smirk" },
  { id:"bp_c", sig:"blackpink", phase:"close", fam:["crush"], genres:["girlcrush"],         phrase:"a sharp arrow-like arm line cutting straight across the body into a power stance" },

  { id:"nj_o", sig:"newjeans", phase:"open",  fam:["easy"], genres:["easy","retro"], phrase:"a relaxed hip sway rolling into a soft shoulder shimmy and a casual point" },
  { id:"nj_m", sig:"newjeans", phase:"mid",   fam:["easy"], genres:["easy"],         phrase:"an easy natural two-step bounce with a light head tilt and a smile" },
  { id:"nj_c", sig:"newjeans", phase:"close", fam:["easy"], genres:["easy","retro"], phrase:"breezy footwork gliding into a laid-back finishing groove, arms loose" },

  { id:"tw_o", sig:"twice", phase:"open",  fam:["retro"], genres:["retro","easy"], phrase:"cheerful hands framing the face in a shy peek-a-boo gesture" },
  { id:"tw_m", sig:"twice", phase:"mid",   fam:["retro"], genres:["retro","easy"], phrase:"playful arms sweeping overhead to draw a soft letter shape" },
  { id:"tw_c", sig:"twice", phase:"close", fam:["retro"], genres:["retro"],        phrase:"a bright bouncy step snapping into a crisp finger point at camera" },

  // ---- Филлер по жанру (любая группа добирает вариативность) ----
  { id:"gc_o", sig:null, phase:"open",  fam:["crush"],           genres:["girlcrush"], phrase:"a commanding wide-legged entrance with a slow head roll up to camera" },
  { id:"gc_m", sig:null, phase:"mid",   fam:["crush"],           genres:["girlcrush"], phrase:"a heavy groove bounce with sharp shoulder shrugs on the offbeat" },
  { id:"gc_c", sig:null, phase:"close", fam:["crush","future"],  genres:["girlcrush"], phrase:"dropping low into a wide stance with fists pulled in tight" },
  { id:"gc_a", sig:null, phase:"any",   fam:["crush","future"],  genres:["girlcrush"], phrase:"a powerful cross-body arm swipe snapping to a hard stop" },

  { id:"fu_o", sig:null, phase:"open",  fam:["future"],          genres:["future"], phrase:"precise mechanical footwork with snapping wrist isolations" },
  { id:"fu_m", sig:null, phase:"mid",   fam:["future"],          genres:["future"], phrase:"a full-body wave flowing from the fingertips through the hips" },
  { id:"fu_c", sig:null, phase:"close", fam:["future","crush"],  genres:["future"], phrase:"a sudden pop-and-lock freeze holding a sharp angular shape" },
  { id:"fu_a", sig:null, phase:"any",   fam:["future","crush"],  genres:["future"], phrase:"quick locking arm hits freezing between each beat" },

  { id:"re_o", sig:null, phase:"open",  fam:["retro","elegant"],       genres:["retro"], phrase:"a swingy side-step with a playful hand roll" },
  { id:"re_m", sig:null, phase:"mid",   fam:["retro","easy"],          genres:["retro"], phrase:"a funky hip swing with a loose finger-snap on the beat" },
  { id:"re_c", sig:null, phase:"close", fam:["retro","elegant","easy"],genres:["retro"], phrase:"a smooth spin settling into a hip-cocked pose with a wink" },
  { id:"re_a", sig:null, phase:"any",   fam:["retro","elegant","easy"],genres:["retro"], phrase:"a bouncy disco groove with alternating shoulder rolls" },

  { id:"ea_o", sig:null, phase:"open",  fam:["easy","retro"], genres:["easy"], phrase:"easygoing sways with a gentle head bob and a smile" },
  { id:"ea_m", sig:null, phase:"mid",   fam:["easy"],         genres:["easy"], phrase:"a soft body bounce with a casual point and a shoulder shimmy" },
  { id:"ea_c", sig:null, phase:"close", fam:["easy","retro"], genres:["easy"], phrase:"a breezy little spin into a relaxed natural pose" },
  { id:"ea_a", sig:null, phase:"any",   fam:["easy","retro"], genres:["easy"], phrase:"a light two-step bounce with relaxed swinging arms" },

  // доп. филлер для вариативности (шире пул → меньше совпадений между юзерами)
  { id:"gc_a2", sig:null, phase:"any", fam:["crush"],            genres:["girlcrush"], phrase:"a hard chest pop snapping the shoulders back with attitude" },
  { id:"gc_a3", sig:null, phase:"any", fam:["crush","future"],   genres:["girlcrush"], phrase:"a fierce grounded body roll punching forward on the drop" },
  { id:"fu_a2", sig:null, phase:"any", fam:["future"],           genres:["future"],    phrase:"rapid finger-tutting flicking into a sharp arm freeze" },
  { id:"fu_a3", sig:null, phase:"any", fam:["future","crush"],   genres:["future"],    phrase:"a mechanical shoulder isolation ticking across the beat" },
  { id:"re_a2", sig:null, phase:"any", fam:["retro","easy"],     genres:["retro"],     phrase:"a retro two-step shuffle with a playful shoulder shimmy" },
  { id:"re_a3", sig:null, phase:"any", fam:["retro","elegant"],  genres:["retro"],     phrase:"a groovy body wave sliding into a finger-snap point" },
  { id:"ea_a2", sig:null, phase:"any", fam:["easy"],             genres:["easy"],      phrase:"a soft sway with a lazy arm wave and a wink" },
  { id:"ea_a3", sig:null, phase:"any", fam:["easy","retro"],     genres:["easy"],      phrase:"a light hop-step with a relaxed clap on the beat" },

  // ---- Балладный пул: минимум движений, плавно, энергия низкая (для всех групп) ----
  { id:"ba_o", sig:null, phase:"open",  fam:[], genres:["ballad"], phrase:"a slow expressive arm reach unfolding outward with the breath" },
  { id:"ba_m", sig:null, phase:"mid",   fam:[], genres:["ballad"], phrase:"a gentle body sway with one hand drawn softly to the chest" },
  { id:"ba_c", sig:null, phase:"close", fam:[], genres:["ballad"], phrase:"a delicate final pose, one arm lifted, head tilted with emotion" },
  { id:"ba_a", sig:null, phase:"any",   fam:[], genres:["ballad"], phrase:"a graceful turn with the gaze following one slowly extended hand" },

  /* ===== Ресёрч топ-женских 2024–2026 (упор на кульминацию/дроп/хук) =====
   * Источники: The Bias List «Top-10 choreo 2025»; kpopecho/txdonut «viral challenges 2026»;
   * Bandwagon «15 iconic girl-group moves»; Koreaboo (Gashina/Love Dive/DDU-DU/ITZY);
   * allkpop; Soompi. Всё обобщено (без названий групп/песен, без покадрового копирования, §5).
   * sig=наша группа (углубляем её пул); sig=null → иконный хук другой группы как филлер. */

  // --- углубление фирменных наших 9 групп (новые point-моменты) ---
  { id:"ls_o2", sig:"lesserafim", phase:"open",  fam:["crush"], genres:["girlcrush","future"], phrase:"a low crouched fierce opening pose exploding upward on the first beat" },
  { id:"ls_m2", sig:"lesserafim", phase:"mid",   fam:["crush"], genres:["girlcrush","retro"],  phrase:"sharp sassy hand-twirls winding in front of the chest with a fierce glare" },
  { id:"ls_c2", sig:"lesserafim", phase:"close", fam:["crush"], genres:["girlcrush"],          phrase:"rapid isolated hip sways accelerating with the beat, core locked tight" },
  { id:"ae_o2", sig:"aespa", phase:"open", fam:["future"], genres:["future"],           phrase:"a smooth wrist hand-spin rolling out then snapping the arm to a hard stop" },
  { id:"ae_m2", sig:"aespa", phase:"mid",  fam:["future"], genres:["future","girlcrush"],phrase:"cool cross-stepping heel taps with sliding controlled footwork" },
  { id:"id_o2", sig:"idle", phase:"open", fam:["crush"], genres:["retro","girlcrush"], phrase:"a cheeky playful bounce with wiggling arms and a mischievous shoulder shimmy" },
  { id:"id_m2", sig:"idle", phase:"mid",  fam:["crush"], genres:["girlcrush","retro"], phrase:"latin-tinged street steps rolling the hips with a sharp attitude snap" },
  { id:"iv_o2", sig:"ive", phase:"open", fam:["elegant"], genres:["retro","easy"], phrase:"a graceful fan-like arm sweep arcing across the body with an elegant wrist flick" },
  { id:"bm_c2", sig:"babymonster", phase:"close", fam:["crush"], genres:["girlcrush","future"], phrase:"explosive rapid footwork snapping into a fierce clawed-hand gesture held to camera" },
  { id:"ka_m2", sig:"katseye", phase:"mid", fam:["easy"], genres:["future","easy"], phrase:"quirky off-kilter body pops with an exaggerated playful attitude" },
  { id:"bp_o2", sig:"blackpink", phase:"open", fam:["crush"], genres:["girlcrush","retro"], phrase:"loose hip-hop isolations rolling through the shoulders with charismatic swagger" },
  { id:"tw_m2", sig:"twice", phase:"mid", fam:["retro"], genres:["retro","easy"], phrase:"crisp small chorus hand accents snapping precisely on the beat with a bright pop" },
  { id:"nj_m2", sig:"newjeans", phase:"mid", fam:["easy"], genres:["easy","retro"], phrase:"a soft point-and-step with a gentle shoulder shimmy and a natural head bob" },

  // --- girlcrush: иконные жёсткие хуки/дропы (филлер) ---
  { id:"gc_f1", sig:null, phase:"any",   fam:["crush"],          genres:["girlcrush"], phrase:"a fierce finger-gun point thrown forward with a defiant chin lift" },
  { id:"gc_f2", sig:null, phase:"mid",   fam:["crush","future"], genres:["girlcrush"], phrase:"a powerful stop-and-go burst — a sharp arm cut then a sudden level drop" },
  { id:"gc_f3", sig:null, phase:"close", fam:["crush"],          genres:["girlcrush"], phrase:"a bold self-crowning gesture over the head snapping into a power stance" },
  { id:"gc_f4", sig:null, phase:"any",   fam:["crush"],          genres:["girlcrush"], phrase:"a sharp chest rotation with a dismissive go-away hand flick" },
  { id:"gc_f5", sig:null, phase:"mid",   fam:["crush"],          genres:["girlcrush"], phrase:"a hard cross-body arm slice snapping to a dead stop on the drop" },
  { id:"gc_f6", sig:null, phase:"close", fam:["crush","future"], genres:["girlcrush"], phrase:"dropping to one knee with a sharp arm thrust forward" },
  { id:"gc_f7", sig:null, phase:"open",  fam:["crush"],          genres:["girlcrush"], phrase:"a slow menacing shoulder-led walk toward camera with a cold stare" },
  { id:"gc_f8", sig:null, phase:"open",  fam:["crush"],          genres:["girlcrush"], phrase:"an acrobatic spinning entrance whipping into a bold grounded stance" },

  // --- future: EDM/тутинг/робо (филлер) ---
  { id:"fu_f1", sig:null, phase:"any",   fam:["future","easy"],  genres:["future"], phrase:"rapid finger-tutting articulations rippling like a glitch effect" },
  { id:"fu_f2", sig:null, phase:"open",  fam:["future","crush"], genres:["future"], phrase:"sharp chasing footwork darting side to side with quick directional arm points" },
  { id:"fu_f3", sig:null, phase:"mid",   fam:["future"],         genres:["future"], phrase:"stiff mannequin arm isolations moving in wooden right-angle snaps" },
  { id:"fu_f4", sig:null, phase:"close", fam:["future","crush"], genres:["future"], phrase:"a robotic body-lock freeze ticking into a sharp geometric shape" },
  { id:"fu_f5", sig:null, phase:"mid",   fam:["future"],         genres:["future"], phrase:"a fast double arm-wave rippling shoulder to shoulder then a hard lock" },
  { id:"fu_f6", sig:null, phase:"any",   fam:["future","easy"],  genres:["future"], phrase:"quick staccato hand claps punctuated by a sharp head snap" },
  { id:"fu_f7", sig:null, phase:"close", fam:["future","crush"], genres:["future"], phrase:"a sudden freeze splitting the arms into a sharp X-shape" },

  // --- retro: фанк/диско/грув хуки (филлер) ---
  { id:"re_f1", sig:null, phase:"mid",   fam:["retro","easy"],           genres:["retro"], phrase:"a sassy shoulder-brush flowing into quick rhythmic hand-sign gestures" },
  { id:"re_f2", sig:null, phase:"any",   fam:["retro","elegant"],        genres:["retro"], phrase:"a smooth disco shoulder-roll groove stepping side to side" },
  { id:"re_f3", sig:null, phase:"close", fam:["retro","easy"],           genres:["retro"], phrase:"a bright bouncy chorus step with a playful knees-together shuffle" },
  { id:"re_f4", sig:null, phase:"mid",   fam:["retro"],                  genres:["retro"], phrase:"a funky body roll rippling down through the hips into a groove" },
  { id:"re_f5", sig:null, phase:"mid",   fam:["retro","easy"],           genres:["retro"], phrase:"a swingy hip pop with a finger-snap rolling side to side" },
  { id:"re_f6", sig:null, phase:"close", fam:["retro","elegant"],        genres:["retro"], phrase:"a smooth spin settling with a wink and a cocked hip" },
  { id:"re_f7", sig:null, phase:"any",   fam:["retro"],                  genres:["retro"], phrase:"a bouncy two-step with alternating shoulder shrugs on the offbeat" },

  // --- easy: Y2K/баблгам/натуральные хуки (филлер) ---
  { id:"ea_f1", sig:null, phase:"mid",   fam:["easy","crush"], genres:["easy","girlcrush"], phrase:"a bratty little stomp with a finger-to-lips shush bursting into a jump" },
  { id:"ea_f2", sig:null, phase:"any",   fam:["easy","retro"], genres:["easy"], phrase:"a cute standout point tucked into a bouncy relaxed groove" },
  { id:"ea_f3", sig:null, phase:"open",  fam:["easy"],         genres:["easy"], phrase:"an easy push-and-pull hip sway with soft rolling arms" },
  { id:"ea_f4", sig:null, phase:"close", fam:["easy","retro"], genres:["easy"], phrase:"a light galloping side-step with a playful bounce" },
  { id:"ea_f5", sig:null, phase:"mid",   fam:["easy"],         genres:["easy"], phrase:"a relaxed body bounce with a lazy point and a soft smile" },
  { id:"ea_f6", sig:null, phase:"any",   fam:["easy","retro"], genres:["easy"], phrase:"an effortless sway gliding into a casual hair-flick" },

  // --- ballad: кульминация = крупный сдержанный жест (филлер) ---
  { id:"ba_f1", sig:null, phase:"close", fam:[], genres:["ballad"], phrase:"a sweeping emotional arm reach opening wide to the sky on the swell" },
  { id:"ba_f2", sig:null, phase:"mid",   fam:[], genres:["ballad"], phrase:"a slow expressive turn with a hand pressed to the heart" },
];

// Детерминированный PRNG по seed (mulberry32) — стабильно per (айдол×группа×жанр),
// разнообразно между разными юзерами.
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Собирает УПОРЯДОЧЕННУЮ последовательность движений на ВЕСЬ клип (open→close),
// все различны, без повторов. Для упбита ~6 движений, для баллады 3.
function buildClipMoves(genre, groupKey, seed) {
  const style = GROUP_STYLE[groupKey];
  const rand = mulberry32(((seed >>> 0) ^ hashStr(`${groupKey}|${genre}`)) >>> 0);
  const used = new Set();
  const take = (cands) => {
    const pool = cands.filter((m) => !used.has(m.id));
    if (!pool.length) return null;
    const m = pool[Math.floor(rand() * pool.length)];
    used.add(m.id);
    return m;
  };
  const phases = ["open", "mid", "close"];

  if (genre === "ballad") {
    const bal = MOVES.filter((m) => m.genres.includes("ballad"));
    const seq = [];
    for (const p of phases) {
      const m = take(bal.filter((x) => x.phase === p || x.phase === "any")) || take(bal);
      if (m) seq.push(m);
    }
    return seq;
  }

  const sigs = MOVES.filter((m) => m.sig === groupKey); // 3 фирменных, по одному на фазу
  const genreFiller = MOVES.filter((m) => !m.sig && m.genres.includes(genre));
  const famFiller = MOVES.filter((m) => !m.sig && m.fam.includes(style.fam));
  const fillFor = (p) =>
    take(genreFiller.filter((x) => x.phase === p || x.phase === "any")) ||
    take(genreFiller) ||
    take(famFiller.filter((x) => x.phase === p || x.phase === "any")) ||
    take(famFiller);

  // порядок: [openSig, openFill, midSig, midFill, closeSig, closeFill] — все разные.
  // При разросшемся пуле фирменных берём сид-подмножество (1 на фазу) → разнообразие
  // между сидами, а не раздувание клипа. Все движения остаются в пуле.
  const seq = [];
  for (const p of phases) {
    const s = take(sigs.filter((x) => x.phase === p));
    if (s) seq.push(s);
    const f = fillFor(p);
    if (f) seq.push(f);
  }
  return seq;
}

function fmtThirds(moves) {
  const j = (a) => a.map((m) => m.phrase).join(", then ");
  let a, b, c;
  if (moves.length >= 3) { a = [moves[0]]; b = [moves[1]]; c = moves.slice(2); }
  else if (moves.length === 2) { a = [moves[0]]; b = []; c = [moves[1]]; }
  else { a = []; b = moves; c = []; }
  const seg = [];
  if (a.length) seg.push(`first third — ${j(a)}`);
  if (b.length) seg.push(`middle third — ${j(b)}`);
  if (c.length) seg.push(`final third — ${j(c)}`);
  return seg.join("; ");
}

// Адаптер. part/parts делят единый набор движений между сегментами клипа так,
// что во второй половине НЕ повторяются движения первой. Возврат {timeline,...} | null.
function selectDance(genreRaw, groupKey, seed, part = 0, parts = 1) {
  const style = GROUP_STYLE[groupKey];
  if (!style) return null; // не из 9 женских — вызывающий откатится на LEGACY
  const genre = resolveGenre(genreRaw);
  const all = buildClipMoves(genre, groupKey, seed);
  const per = Math.max(1, Math.ceil(all.length / Math.max(1, parts)));
  const slice = parts > 1 ? all.slice(part * per, part * per + per) : all;
  const timeline =
    `Choreography timeline: ${fmtThirds(slice.length ? slice : all)}. ` +
    (genre === "ballad" ? BALLAD_TONE : STYLE_TONE[style.fam]);
  return { timeline, gender: "girl", genre, fam: style.fam };
}

// Боевой фолбэк для мужских групп (танцевальная система пока только женская).
const DANCE_LEGACY = {
  straykids:"Choreography timeline: first third — sharp complex footwork with hard-hitting arm accents; middle third — rapid-fire grounded power hits and sharp direction changes; final third — an explosive full-body combo dropping into a powerful held stance. Intense, technical hip-hop.",
  ateez:"Choreography timeline: first third — a theatrical grounded entrance with sharp street isolations; middle third — powerful wide-stance hits building in intensity; final third — an explosive theatrical finish, arms thrown wide. Theatrical street-dance grit.",
  enhypen:"Choreography timeline: first third — smooth moody isolations building slowly; middle third — sharp accents woven through fluid transitions; final third — a dramatic sharp finishing line held with brooding intensity. Atmospheric, moody power.",
  txt:"Choreography timeline: first third — light bouncy footwork with playful arm swings; middle third — bright sharp claps and easy hip sways; final third — a big joyful finish, arms thrown up. Light, youthful, summery.",
};
const DANCE_GENDER = {
  lesserafim:"girl", aespa:"girl", ive:"girl", idle:"girl", babymonster:"girl", katseye:"girl",
  blackpink:"girl", newjeans:"girl", twice:"girl",
  straykids:"boy", ateez:"boy", enhypen:"boy", txt:"boy",
};
// Разделено: база (лицо/качество) всегда; анти-вялость — только для НЕ-баллады,
// иначе negative давит нужную баллады минимальность.
const NEG_BASE = "blur, distort, low quality, extra fingers, deformed hands, face turned away, back of head to camera, full profile silhouette, face hidden, obscured face, repetitive looping motion";
const NEG_ENERGY = "weak movement, minimal movement, half-hearted gestures, barely moving, low energy, static, stiff, timid, small amplitude";

async function handleGenerate(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST" });
  if (!readUserId(req)) return res.status(401).json({ error: "Нужно войти в аккаунт" });
  const KEY = process.env.FAL_KEY;
  if (!KEY) return res.status(500).json({ error: "FAL_KEY не задан в Vercel" });

  try {
    const b = req.body || {};
    const { imageUrl, theme = "girlcrush", dance = "lesserafim", genre = "girlcrush", memberName = "", angle = "front", seed, part = 0, parts = 1, startImageUrl, wardrobe = "" } = b;
    const wardrobeLine = wardrobe.trim() ? `Wardrobe: styled in ${wardrobe.trim()} (keep the same face and identity, change only the outfit). ` : "";
    if (!imageUrl) return res.status(400).json({ error: "Нужен imageUrl" });

    const clipScene = CLIP[theme] || CLIP.girlcrush;
    // seed стабилен на весь клип; part/parts дают КАЖДОМУ сегменту свой кусок танца
    // (во 2-й половине не повторяются движения 1-й).
    const danceSeed = seed != null ? Number(seed) : hashStr(`${memberName}|${dance}|${resolveGenre(genre)}`);
    const picked = selectDance(genre, dance, danceSeed, Number(part) || 0, Number(parts) || 1);
    const danceStyle = picked ? picked.timeline : (DANCE_LEGACY[dance] || DANCE_LEGACY.straykids);
    const effGenre = picked ? picked.genre : resolveGenre(genre);
    const gender = DANCE_GENDER[dance] || "girl";
    const pronoun = gender === "boy" ? "his" : "her";
    const heShe = gender === "boy" ? "he" : "she";
    const who = memberName ? `${memberName}, a K-pop idol,` : "a K-pop idol";
    const angleLine = angle === "side"
      ? "Camera: three-quarter angle about 30 degrees off-center, a different framing than a straight front shot but with the face kept clearly visible toward camera at all times — like a new camera setup in a real music video edit. "
      : "Camera: straight-on front angle, clean and centered. ";
    const energyLine = effGenre === "ballad"
      ? "Restrained, emotional, minimal choreography — slow controlled movement with expressive stillness, only a few gestures. The routine keeps progressing forward through these 10 seconds and never loops back to an earlier pose. "
      : "High-amplitude, full-extension, high-energy professional K-pop choreography — every movement committed and forceful, like a real K-pop comeback stage. Each beat introduces a brand-new movement; the routine constantly progresses forward and NEVER loops, repeats, or returns to any earlier pose within these 10 seconds. ";

    const prompt =
      `This is ${who} performing a dance video. Keep ${pronoun} face and identity exactly consistent with the reference image. ` +
      `${angleLine}` +
      `Scene: ${clipScene}. ${wardrobeLine}${danceStyle} ` +
      energyLine +
      `Shot sequence: open on a wide full-body shot already mid-dance, then brief close-ups and dynamic angles while she keeps dancing — no static posing or held portrait at any moment, continuous full-body movement from the very first second. ` +
      `Professional K-pop music video, cinematic lighting, smooth continuous motion throughout, no stutters, no freezing, sharp detail. ` +
      `${heShe.charAt(0).toUpperCase() + heShe.slice(1)} performs with full commitment and confidence.`;

    const r = await fetchWithRetry("https://queue.fal.run/fal-ai/kling-video/v3/standard/image-to-video", {
      method: "POST",
      headers: { Authorization: `Key ${KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt,
        start_image_url: startImageUrl || imageUrl,
        duration: "10",
        generate_audio: false,
        negative_prompt: effGenre === "ballad" ? NEG_BASE : `${NEG_BASE}, ${NEG_ENERGY}`,
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
// 5 унифицированных жанров (те же ключи, что и танец). Старые ключи фронта
// (rnb/citypop/hyperpop/rock/darktrap) резолвятся через resolveGenre — не ломается.
const SONG = {
  ballad:   "slow emotional ballad tempo, soft minor-key piano and strings, tender vocal, punchy kick",
  girlcrush:"hard-hitting girl-crush beat, heavy trap 808 bass, dark brass stabs, fierce confident energy",
  retro:    "retro funk-disco groove, warm slap bass, bright synth stabs, groovy city-pop shimmer",
  future:   "futuristic EDM hyperpop beat, punchy synths, explosive drop, crisp hi-hats",
  easy:     "light Y2K bubblegum-pop bounce, mellow drums, airy synths, easy breezy groove",
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
  const partPaths = [];

  try {
    const { song = "ballad", lengthMs = 10000, parts = 1, language = "ko", memberName = "", gender = "girl", lyrics = "", style = "" } = req.body || {};
    const styleLine = style.trim() ? ` Vocal delivery style: ${style.trim()}.` : "";
    const partN = Math.max(1, Math.min(4, Number(parts) || 1));
    const effGenre = resolveGenre(song);
    const songVibe = SONG[effGenre] || SONG.ballad;
    const langName = LANGUAGE[language] || LANGUAGE.ko;
    // Реальные слова: передаём готовый текст, иначе модель поёт псевдоязык (кашу).
    const lyricLine = lyrics.trim()
      ? ` Sing these exact ${langName} lyrics word for word, do not invent or replace any words: "${lyrics.trim()}".`
      : "";
    const partSec = lengthMs / 1000;   // длина ОДНОЙ части (сегмента клипа)
    const fullSec = partSec * partN;   // одна непрерывная песня на весь клип
    const bufferSec = fullSec + 10;    // запас на тихие края
    const { descriptor: voiceDescriptor, seed } = voiceProfileFor(memberName, gender);

    const elevenlabs = new ElevenLabsClient({ apiKey: ELEVEN_KEY });
    // seed нельзя передавать вместе с prompt (ElevenLabs Music v2 → 422 unprocessable_entity).
    const track = await elevenlabs.music.compose({
      prompt:
        `${effGenre === "ballad" ? "Emotional K-pop ballad" : "Upbeat K-pop chorus hook"}, ${voiceDescriptor} vocals singing in ${langName}, ${songVibe}, ` +
        "catchy, modern K-pop production, ONE continuous song from start to finish, no abrupt style or key change." +
        styleLine +
        lyricLine,
      musicLengthMs: Math.round(bufferSec * 1000),
      modelId: "music_v2",
    });
    const rawBuf = Buffer.isBuffer(track) ? track : await streamToBuffer(track);
    await writeFile(rawPath, rawBuf);

    const totalSec = (await getDurationSec(rawPath)) || bufferSec;
    const silences = await detectSilences(rawPath);
    const startSec = findBestWindow(silences, totalSec, fullSec);

    // вырезаем ВСЮ песню, затем режем её на partN подряд идущих кусков —
    // так части клипа получают ОДНУ песню, а не разные (баг #2).
    await trimAudio(rawPath, cutPath, startSec, fullSec);

    const songUrls = [];
    for (let i = 0; i < partN; i++) {
      const pp = path.join(os.tmpdir(), `song-part-${tag}-${i}.mp3`);
      partPaths.push(pp);
      await trimAudio(cutPath, pp, i * partSec, partSec);
      const buf = await readFile(pp);
      songUrls.push(await uploadToFalCdn(buf, FAL_KEY, "audio/mpeg", `song-${tag}-${i}.mp3`));
    }
    return res.status(200).json({ ok: true, songUrl: songUrls[0], songUrls, debug: { totalSec, chosenStart: startSec, fullSec, partN, voiceDescriptor, seed, lyricsUsed: !!lyricLine, styleUsed: !!styleLine } });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e?.message || e) });
  } finally {
    await unlink(rawPath).catch(() => {});
    await unlink(cutPath).catch(() => {});
    for (const pp of partPaths) await unlink(pp).catch(() => {});
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

/* ===================== LASTFRAME (последний кадр сегмента → старт следующего) ===================== */
// Часть 2 стартует с последнего кадра части 1 → сцена/костюм/лицо продолжаются (баги #3/#4).
async function handleLastframe(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST" });
  if (!readUserId(req)) return res.status(401).json({ error: "Нужно войти в аккаунт" });
  const FAL_KEY = process.env.FAL_KEY;
  if (!FAL_KEY) return res.status(500).json({ error: "FAL_KEY не задан" });

  const tag = Date.now();
  const inPath = path.join(os.tmpdir(), `lf-in-${tag}.mp4`);
  const outPath = path.join(os.tmpdir(), `lf-out-${tag}.jpg`);

  try {
    const { videoUrl } = req.body || {};
    if (!videoUrl) return res.status(400).json({ error: "Нужен videoUrl" });

    const buf = await withRetry(async () => {
      const r = await fetchWithRetry(videoUrl);
      if (!r.ok) throw new Error(`не удалось скачать videoUrl: ${r.status}`);
      return Buffer.from(await r.arrayBuffer());
    });
    await writeFile(inPath, buf);

    // берём кадр за ~0.3с до конца (самый конец бывает подмороженный)
    await runFfmpeg(["-y", "-sseof", "-0.4", "-i", inPath, "-frames:v", "1", "-q:v", "2", "-update", "1", outPath]);
    const frameBuf = await readFile(outPath);
    const imageUrl = await uploadToFalCdn(frameBuf, FAL_KEY, "image/jpeg", `lastframe-${tag}.jpg`);
    return res.status(200).json({ ok: true, imageUrl });
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
  if (action === "lastframe") return handleLastframe(req, res);
  if (action === "tts") return handleTts(req, res);
  return res.status(400).json({ error: "Неизвестный action" });
}
