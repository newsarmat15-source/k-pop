/**
 * lib/tts-ko.js — ЕДИНСТВЕННАЯ точка смены движка озвучки.
 *
 * Меняешь движок = меняешь env TTS_ENGINE. Больше нигде править не нужно:
 * этим модулем пользуются и серверный `api/pipeline.js?action=tts`,
 * и скрипт пре-генерации кэша `scripts/tts-build-cache.mjs`.
 *
 * Здесь же живёт нормализация хангыля — без неё ЛЮБОЙ движок звучит роботом
 * на отдельной букве: модели обучены на предложениях, у голой чамо (ㅏ, ㄹ)
 * нет просодического контекста, движок тянет её или глотает.
 */

/* ===================== 1. НОРМАЛИЗАЦИЯ ХАНГЫЛЯ ===================== */

// Гласная-чамо → слог с немой ㅇ. Именно так кореец произносит букву.
const VOWEL = {
  "ㅏ": "아", "ㅑ": "야", "ㅓ": "어", "ㅕ": "여", "ㅗ": "오", "ㅛ": "요",
  "ㅜ": "우", "ㅠ": "유", "ㅡ": "으", "ㅣ": "이", "ㅐ": "애", "ㅒ": "얘",
  "ㅔ": "에", "ㅖ": "예", "ㅘ": "와", "ㅙ": "왜", "ㅚ": "외", "ㅝ": "워",
  "ㅞ": "웨", "ㅟ": "위", "ㅢ": "의",
};

// Согласная-чамо → [имя буквы, демо-слог]. Голая ㄹ непроизносима в принципе.
// Демо-слог несёт НЕЙТРАЛЬНУЮ ㅡ, а не ㅏ (ㄱ→그, не 가). Причина ниже, в toSpeakable.
const CONS = {
  "ㄱ": ["기역", "그"], "ㄴ": ["니은", "느"], "ㄷ": ["디귿", "드"], "ㄹ": ["리을", "르"],
  "ㅁ": ["미음", "므"], "ㅂ": ["비읍", "브"], "ㅅ": ["시옷", "스"], "ㅇ": ["이응", "으"],
  "ㅈ": ["지읒", "즈"], "ㅊ": ["치읓", "츠"], "ㅋ": ["키읔", "크"], "ㅌ": ["티읕", "트"],
  "ㅍ": ["피읖", "프"], "ㅎ": ["히읗", "흐"],
  "ㄲ": ["쌍기역", "끄"], "ㄸ": ["쌍디귿", "뜨"], "ㅃ": ["쌍비읍", "쁘"],
  "ㅆ": ["쌍시옷", "쓰"], "ㅉ": ["쌍지읒", "쯔"],
};

export const isJamo = (s) => s.length === 1 && !!(VOWEL[s] || CONS[s]);

/**
 * Превращает то, что просит UI, в то, что реально надо синтезировать.
 *
 * ПРАВКА 24.07 — СОГЛАСНАЯ ОЗВУЧИВАЕТСЯ ЗВУКОМ, А НЕ ИМЕНЕМ.
 * Было: тап по ㄱ проигрывал «기역», по ㅋ — «키읔», по ㄸ — «쌍디귿». Это правильные
 * школьные НАЗВАНИЯ букв, но человек, который жмёт на букву, хочет услышать её ЗВУК.
 * Дословно с проверки: «нажал на К — она вообще на японском что ли говорит»,
 * «напряжённые — сам дял, вообще неправильно» (это 쌍디귿). У гласных такой проблемы
 * не было ровно потому, что ㅏ и так озвучивалась слогом 아 — и они «звучат правильно».
 * Стало: согласная → её демо-слог, то есть ровно тот звук, который написан
 * на плитке кириллицей. Имя буквы осталось доступно через opts.name — оно нужно,
 * когда буква называется, а не произносится.
 *
 * ПРАВКА 24.07 (2) — НОСИТЕЛЬ ГЛАСНАЯ ㅏ → НЕЙТРАЛЬНАЯ ㅡ (ㄱ → 그, не 가).
 * Дословно с проверки: «говорит не k, а ka... убрать этот последний звук А, по всем
 * буквам». У демо-слога с ㅏ громкий низкий хвост «а» глушит саму согласную —
 * особенно у взрывных, где согласная это лишь короткий щелчок. Голый корейский
 * взрывной [k̚/t̚/p̚] не выговаривает НИ ОДИН TTS (потому и существует §7.5 —
 * живая начитка). Программно чистой буквы не сделать; можно лишь заменить громкую
 * «а» на минимальную гласную. Взята ㅡ [ɯ] — стандартная лингвистическая citation-
 * форма и вставная (epenthetic) гласная корейского: именно её корейский добавляет к
 * голому согласному в заимствованиях (McDonald's → 맥도날드, конец -드). После глухих
 * она к тому же оглушается почти до шёпота, так что хвост минимален: 크/트/프/스 ближе
 * к «кх/тх/пх/с», чем 카/타/파/사 к «ка». Пары остаются различимы: плоский/придых/
 * напряжённый 즈/츠/쯔, 그/크/끄 — тот же тройной контраст, что и с ㅏ.
 * ЧЕСТНО: это НЕ чистая буква, а согласная + тихая «ы». Убрать гласную совсем нельзя.
 *
 * @param {string} text сырой текст из интерфейса (может быть голой чамо)
 * @param {{name?:boolean, demo?:boolean}} opts name=true → произнести НАЗВАНИЕ буквы;
 *        demo=true → название и следом демо-слог («기역. 가.»)
 * @returns {{speak:string, kind:'vowel'|'consonant'|'text'}}
 */
export function toSpeakable(text, opts = {}) {
  const t = String(text || "").trim();
  if (!t) return { speak: "", kind: "text" };
  if (VOWEL[t]) return { speak: VOWEL[t], kind: "vowel" };
  if (CONS[t]) {
    const [name, demo] = CONS[t];
    const speak = opts.demo ? `${name}. ${demo}.` : opts.name ? name : demo;
    return { speak, kind: "consonant" };
  }
  return { speak: t, kind: "text" };
}

/**
 * Ключ кэша для чамо помечен версией: файлы старого кэша под теми же ключами содержат
 * НАЗВАНИЯ букв, и без метки браузер продолжил бы играть их вечно. ДОЛЖНО совпадать
 * с тем же правилом в public/tts-engine.js.
 */
export const JAMO_CACHE_TAG = "-s2";

/* ===================== 2. ТАБЛИЦА ДВИЖКОВ ===================== */
/**
 * Каждый движок = {url, headers, body, pick}. Добавить нового = дописать сюда строку.
 * Все ходят через fal.ai (проверено: работает из РФ), кроме прямого ElevenLabs и Typecast.
 */
const ENGINES = {
  /* Inworld ПРЯМЫМ API — то, ради чего затевался переезд 23.07.
   *
   * Причина: обёртка fal принимает у Inworld ровно три поля (text, voice,
   * sample_rate_hertz) и режет всё остальное. Отсюда и родилась запись в контракте
   * «у Inworld нет замедления» — она НЕВЕРНА. У самого вендора есть speakingRate
   * в диапазоне [0.5, 1.5] и модель нового поколения inworld-tts-2.
   *   [docs.inworld.ai/api-reference/ttsAPI/texttospeech/synthesize-speech, 23.07.2026]
   *
   * POST https://api.inworld.ai/tts/v1/voice, заголовок `Authorization: Basic <ключ>`
   * (ключ уже в base64, из портала — второй раз кодировать НЕ надо).
   * Ответ — JSON с полем audioContent в base64, а не ссылка и не тело-аудио.
   *
   * voiceId корейских голосов документация примерами не показывает: на fal они
   * назывались «Minji (ko)» и «Yoona (ko)», прямому API скобка-суффикс не нужен.
   * Поэтому имя берётся из env, а проверяется скриптом scripts/tts-voices.mjs —
   * гадать в проде нечего, список отдаёт сам вендор.
   */
  "inworld-direct": {
    url: "https://api.inworld.ai/tts/v1/voice",
    auth: (env) => ({ Authorization: `Basic ${env.INWORLD_API_KEY}` }),
    needs: ["INWORLD_API_KEY"],
    b64: "audioContent",
    body: (speak, o, env) => ({
      text: speak,
      voiceId: o.voiceId || env.INWORLD_VOICE_ID || "Minji",
      modelId: env.INWORLD_MODEL_ID || "inworld-tts-2",
      language: "ko-KR",
      applyTextNormalization: "ON",
      audioConfig: {
        audioEncoding: "MP3",
        sampleRateHertz: 24000,
        // Медленно = 0.5, ниже вендор не пускает. Это настоящее замедление движком,
        // а не растянутый ffmpeg-ом файл: интонация слога остаётся живой.
        speakingRate: o.slow ? 0.5 : 1.0,
      },
    }),
  },
  // Inworld TTS-1.5 Max ЧЕРЕЗ FAL — то, что стоит сейчас. Обёртка режет скорость,
  // поэтому замедление тут возможно только пре-рендером. Держим для отката.
  "inworld-minji": {
    url: "https://fal.run/fal-ai/inworld-tts",
    auth: (env) => ({ Authorization: `Key ${env.FAL_KEY}` }),
    body: (speak) => ({ text: speak, voice: "Minji (ko)", sample_rate_hertz: 24000 }),
  },
  "inworld-yoona": {
    url: "https://fal.run/fal-ai/inworld-tts",
    auth: (env) => ({ Authorization: `Key ${env.FAL_KEY}` }),
    body: (speak) => ({ text: speak, voice: "Yoona (ko)", sample_rate_hertz: 24000 }),
  },
  // MiniMax 2.8 HD — есть speed/pitch/emotion/паузы. Дороже ($0.10/1K), корейский неродной.
  "minimax-28hd": {
    url: "https://fal.run/fal-ai/minimax/speech-2.8-hd",
    auth: (env) => ({ Authorization: `Key ${env.FAL_KEY}` }),
    body: (speak, o) => ({
      prompt: speak,
      voice_setting: { voice_id: "Korean_SweetGirl", speed: o.slow ? 0.75 : 1.0 },
      language_boost: "Korean",
      output_format: "url",
    }),
  },
  // ТО, ЧТО СТОЯЛО ДО 23.07 — оставлено для отката, не для нового кэша.
  "minimax-02hd-legacy": {
    url: "https://fal.run/fal-ai/minimax/speech-02-hd",
    auth: (env) => ({ Authorization: `Key ${env.FAL_KEY}` }),
    body: (speak, o) => ({
      text: speak,
      voice_setting: { voice_id: "Korean_SweetGirl", speed: o.slow ? 0.9 : 1.2 },
      language_boost: "Korean",
      output_format: "url",
    }),
  },
  // Typecast SSFM-3.0 — корейский вендор, tempo/pitch/seed. Нужен TYPECAST_API_KEY.
  // Бесплатный тариф 30k символов/мес закрывает весь алфавит с запасом.
  typecast: {
    url: "https://api.typecast.ai/v1/text-to-speech",
    auth: (env) => ({ "X-API-KEY": env.TYPECAST_API_KEY }),
    direct: true, // отдаёт аудио телом ответа, не ссылкой
    body: (speak, o) => ({
      text: speak,
      model: "ssfm-v30",
      voice_id: o.voiceId || process.env.TYPECAST_VOICE_ID,
      language: "kor",
      prompt: { emotion_preset: "normal" },
      output: { volume: 100, audio_pitch: 0, audio_tempo: o.slow ? 0.75 : 1, audio_format: "mp3" },
      seed: 42, // повторяемость: один и тот же слог звучит одинаково всегда
    }),
  },
  // Прямой ElevenLabs — англоязычные пресеты, корейский с акцентом. Только для голосовых айдола.
  elevenlabs: {
    url: null,
    auth: (env) => ({ "xi-api-key": env.ELEVENLABS_API_KEY }),
    direct: true,
    build: (speak, o, env) => ({
      url: `https://api.elevenlabs.io/v1/text-to-speech/${o.voiceId || env.ELEVENLABS_KO_VOICE_ID || "21m00Tcm4TlvDq8ikWAM"}`,
      body: { text: speak, model_id: "eleven_multilingual_v2", voice_settings: { stability: 0.5, similarity_boost: 0.75 } },
    }),
  },
};

export const ENGINE_NAMES = Object.keys(ENGINES);
export const DEFAULT_ENGINE = "inworld-minji";

const pickUrl = (j) =>
  (typeof j?.audio === "string" && j.audio) || j?.audio?.url || j?.audio_url?.url ||
  (typeof j?.audio_url === "string" && j.audio_url) || j?.audio_file?.url || null;

/**
 * Синтез. Возвращает Buffer с mp3/wav.
 * @param {string} text сырой текст (нормализация внутри)
 * @param {{slow?:boolean, demo?:boolean, engine?:string, voiceId?:string}} opts
 * @param {object} env process.env
 */
export async function synthesize(text, opts = {}, env = process.env) {
  const name = opts.engine || env.TTS_ENGINE || DEFAULT_ENGINE;
  const eng = ENGINES[name];
  if (!eng) throw new Error(`Неизвестный движок озвучки: ${name}`);

  const { speak } = toSpeakable(text, opts);
  if (!speak) throw new Error("Пустой текст");

  let url = eng.url;
  let body = eng.body ? eng.body(speak, opts, env) : null;
  if (eng.build) { const b = eng.build(speak, opts, env); url = b.url; body = b.body; }

  const missing = eng.needs && eng.needs.find((k) => !env[k]);
  if (missing) throw new Error(`${name}: не задан ${missing}`);

  const r = await fetch(url, {
    method: "POST",
    headers: { ...eng.auth(env), "Content-Type": "application/json", Accept: eng.direct ? "audio/mpeg" : "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`${name}: ${r.status} ${(await r.text().catch(() => "")).slice(0, 200)}`);

  if (eng.direct) return Buffer.from(await r.arrayBuffer());
  // Аудио пришло base64-строкой внутри JSON (так отдаёт прямой API Inworld).
  if (eng.b64) {
    const j = await r.json();
    const a = j?.[eng.b64];
    if (!a) throw new Error(`${name}: в ответе нет поля ${eng.b64}`);
    return Buffer.from(a, "base64");
  }
  const audioUrl = pickUrl(await r.json());
  if (!audioUrl) throw new Error(`${name}: движок не вернул ссылку на аудио`);
  return Buffer.from(await (await fetch(audioUrl)).arrayBuffer());
}

/** Ключ кэша. ДОЛЖЕН совпадать с ttsKey() во фронте — djb2, base36. */
export function ttsKey(s) {
  let h = 5381;
  const t = String(s);
  for (let i = 0; i < t.length; i++) h = ((h << 5) + h + t.charCodeAt(i)) >>> 0;
  return h.toString(36);
}
