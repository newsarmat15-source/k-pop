// Список корейских голосов Inworld — чтобы не гадать voiceId, а спросить вендора.
// На fal голоса назывались «Minji (ko)» и «Yoona (ko)»; у прямого API имя другое,
// и документация корейских примеров не приводит. Отсюда этот скрипт.
//
//   node --env-file=.env scripts/tts-voices.mjs          — корейские
//   node --env-file=.env scripts/tts-voices.mjs all      — все
//
// Нужен INWORLD_API_KEY (base64-строка из портала, Settings → API Keys).
const key = process.env.INWORLD_API_KEY;
if (!key) {
  console.error("Не задан INWORLD_API_KEY. Портал: platform.inworld.ai → Settings → API Keys, скопировать Base64.");
  process.exit(1);
}
const all = process.argv[2] === "all";
const url = "https://api.inworld.ai/tts/v1/voices" + (all ? "" : "?filter=" + encodeURIComponent("language=ko"));

const r = await fetch(url, { headers: { Authorization: `Basic ${key}` } });
if (!r.ok) {
  console.error(`${r.status}: ${(await r.text().catch(() => "")).slice(0, 300)}`);
  process.exit(1);
}
const d = await r.json().catch(() => ({}));
const voices = d.voices || [];
if (!voices.length) {
  console.log(all ? "Голосов не вернулось." : "Корейских голосов не вернулось — попробуй `all` и посмотри поле languages.");
  process.exit(0);
}
for (const v of voices) {
  console.log([v.voiceId, v.displayName || "", (v.languages || []).join("/"), (v.tags || []).join(",")].filter(Boolean).join("  |  "));
}
console.log(`\nвсего: ${voices.length}. Выбранный класть в .env как INWORLD_VOICE_ID.`);
