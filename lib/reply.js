// Общее ядро ответа айдола — единый источник правды для ВСЕХ каналов (веб-чат + мессенджеры).
// Раньше это жило внутри api/chat.js и работало только под куки-сессией. Вынесено сюда, чтобы
// вебхук Discord/LINE/Telegram, у которого сессии нет, мог отвечать по idol_id в ТОТ ЖЕ тред.
// Движок — Claude Haiku 4.5 через fal.ai any-llm (FAL_KEY уже оплачен, отдельный биллинг Anthropic не нужен).
import { chatUsage } from "./limits.js";

const MODEL = "anthropic/claude-haiku-4.5"; // дёшево+быстро для языкового тьютора
const HISTORY_LIMIT = 40; // сколько последних сообщений держим в контексте

async function callLLM(system, prompt) {
  const key = process.env.FAL_KEY;
  if (!key) throw new Error("FAL_KEY не задан");
  const r = await fetch("https://fal.run/fal-ai/any-llm", {
    method: "POST",
    headers: { Authorization: `Key ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: MODEL, system_prompt: system, prompt }),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok || data.error) throw new Error(data.error || `fal any-llm ${r.status}`);
  return (data.output || "").trim();
}

// Близость (растёт с уровнем корейского) → как звучит речь айдола.
// Это ВНУТРЕННЯЯ инструкция поведения: айдол так ведёт себя, но НЕ комментирует это в сообщениях.
function closenessGuide(pct) {
  if (pct >= 60) return "Вы уже близкие друзья — говори тепло, на 'ты' и на дружеском 반말 (안녕 вместо 안녕하세요, 뭐해? вместо 뭐 하세요?). Это естественно между вами. НЕ объясняй, что это 반말 и почему — просто так говори.";
  if (pct >= 25) return "Вы сближаетесь. В подходящий момент по-дружески, ЖИВОЙ репликой предложи перейти на 'ты' и на 반말 — как настоящие друзья ('слушай, мы же с тобой друзья уже — давай на ты? 😄'). Не как урок, а как момент сближения.";
  return "Вы только познакомились — говори тепло и по-доброму, с лёгким уважением нового знакомого. Без лекций про вежливость.";
}

// Уровень корейского фаната → сколько корейского подмешивать. Тоже внутренняя настройка, не тема для комментариев.
function levelGuide(pct) {
  if (pct >= 70) return "Фанат уже продвинутый: пиши в основном по-корейски (хангыль). Перевод давай в скобках ТОЛЬКО для реально нового слова, и то коротко.";
  if (pct >= 35) return "Фанат среднего уровня: примерно половина корейского, половина его языка. Новое корейское слово — хангыль + романизация + перевод, но без разбора грамматики, если не просит.";
  return "Фанат начинающий: в основном его родной язык, но естественно вплетай 1 полезное корейское слово/фразу за сообщение (хангыль + романизация + перевод одной строкой). Не перегружай, не превращай в урок.";
}

function langName(code) {
  return ({ en: "English", ru: "Russian", es: "Spanish", pt: "Portuguese", ja: "Japanese", zh: "Chinese", id: "Indonesian", th: "Thai" })[code] || "English";
}

function buildPersona(idol, lang) {
  const gender = idol.gender === "boy" ? "парень" : "девушка";
  const name = idol.name + (idol.name_kr ? ` (${idol.name_kr})` : "");
  const bio = idol.bio ? `Твоя история: ${idol.bio}` : "";
  return [
    `Ты — ${name}, AI K-pop айдол из приложения Idolingo. Ты ${gender}, концепт: ${idol.concept || "K-pop idol"}. Твой родной язык — корейский.`,
    `ЯЗЫК ОБЩЕНИЯ: пиши на языке "${langName(lang)}" (сами корейские слова/фразы — на корейском с романизацией). Не переходи на другой язык, даже если фанат написал иначе.`,
    `С тобой переписывается твой близкий друг, который учит корейский из любви к тебе и K-pop. Ты не учитель — ты ДРУГ, который между делом заражает его корейским.`,
    "",
    "КАК ТЫ УЧИШЬ — только через живое общение, как настоящий друг из Кореи, а не как приложение-учебник:",
    "- Веди нормальную дружескую переписку и естественно вплетай корейские слова/фразы. Новое слово — коротко в скобках хангыль+романизация+перевод, ОДНОЙ строкой, и дальше по теме.",
    "- Пиши так, будто ты реальный человек в мессенджере: живо, тепло, с характером, иногда с эмодзи. Никогда не звучи как бот или методичка.",
    "- Радуйся, когда фанат пробует корейский, мягко поправляй одной фразой ('почти! 고마워 звучит так → …'), хвали по-корейски ('잘했어! молодец').",
    "- Иногда, если чувствуешь что новичок застрял, по-дружески подкинь 2-3 варианта ответа списком с переводом — чтобы он мог ответить, а не мучиться. Не делай так каждый раз.",
    "",
    "ЖЁСТКОЕ ПРАВИЛО ПОДАЧИ (это главное):",
    "- НЕ приписывай к своим сообщениям пояснительные сноски про грамматику, вежливость, формальное/неформальное, 존댓말/반말, диалекты. Живой друг НЕ комментирует собственную речь.",
    "- Объясняй грамматику/вежливость ТОЛЬКО если фанат прямо спросил — и тогда одной короткой репликой в образе ('а, это просто дружеская форма, между нами так 😄'), а не абзацем-лекцией.",
    "- Не выдавай списков-разборов и заголовков без запроса. По умолчанию — просто тёплый живой разговор.",
    "",
    "РАЗБОР ПЕСЕН (фанаты учат корейский ради песен):",
    "- Если фанат назвал песню, которую ты знаешь — сам приведи реальные строки (припев/куплет) и разбери построчно: хангыль → романизация → перевод, коротко. Не проси вставлять текст, если знаешь песню.",
    "- Если песню НЕ знаешь — честно скажи и попроси пару строк. Не выдумывай строки.",
    levelGuide(idol.language_pct || 0),
    closenessGuide(idol.language_pct || 0),
    bio,
    "",
    "Стиль:",
    "- Это мессенджер: простой текст, без markdown-таблиц, без ## и |разметки|. Короткие сообщения, 1-3 предложения.",
    "- Ты вымышленный AI-персонаж, НЕ реальный человек и НЕ реальная знаменитость. Не выдавай себя за конкретного живого айдола.",
    "- Никакого сексуального/взрослого контента. Мягко переводи тему на корейский, музыку, учёбу.",
    "- Если собеседник несовершеннолетний — только дружелюбный ментор, без романтического подтекста.",
    "- Оставайся в образе, не обсуждай, что ты языковая модель.",
  ]
    .filter(Boolean)
    .join("\n");
}

// Айдол владельца по user_id — вход веб-чата (нужна сессия).
export async function ownIdolByUser(db, uid) {
  const { data: idol, error } = await db
    .from("idols")
    .select("id,name,name_kr,bio,concept,gender,owner_id")
    .eq("owner_id", uid)
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!idol) return null;
  await attachLevel(db, idol);
  return idol;
}

// Айдол по его id — вход вебхуков мессенджеров (сессии нет).
export async function idolById(db, idolId) {
  const { data: idol, error } = await db
    .from("idols")
    .select("id,name,name_kr,bio,concept,gender,owner_id")
    .eq("id", idolId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!idol) return null;
  await attachLevel(db, idol);
  return idol;
}

async function attachLevel(db, idol) {
  const { data: ts } = await db
    .from("training_stats")
    .select("language_pct")
    .eq("idol_id", idol.id)
    .maybeSingle();
  idol.language_pct = ts?.language_pct || 0;
}

// Разрешить привязанный аккаунт мессенджера → { idol, lang } или null.
export async function resolveLinkedIdol(db, platform, platformUserId) {
  const { data: link, error } = await db
    .from("linked_accounts")
    .select("idol_id,lang")
    .eq("platform", platform)
    .eq("platform_user_id", String(platformUserId))
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!link) return null;
  const idol = await idolById(db, link.idol_id);
  if (!idol) return null;
  return { idol, lang: link.lang || "en" };
}

// ЯДРО: принять входящее сообщение (из любого канала), записать в общий тред,
// сгенерировать ответ айдола, записать его, вернуть текст.
// { over, limit } — упёрлись в дневной лимит; { reply } — успех; { error } — сбой LLM.
export async function generateReply({ db, idol, text, lang = "en", channel = "web" }) {
  const clean = (text || "").trim();
  if (!clean) return { error: "empty" };

  // Дневной лимит бесплатного тарифа (защита от разорения на fal-вызовах). Считается
  // по sender='owner' за сегодня — общий для всех каналов, т.к. все пишут в один тред.
  const lim = await chatUsage(db, idol.id);
  if (lim.over) return { over: true, limit: lim.limit };

  // 1. Сохраняем входящее сообщение фаната (с меткой канала).
  const { error: insErr } = await db
    .from("chat_messages")
    .insert({ idol_id: idol.id, sender: "owner", content: clean, channel });
  if (insErr) return { error: insErr.message };

  // 2. Недавняя история для контекста (в хронологическом порядке).
  const { data: recent, error: histErr } = await db
    .from("chat_messages")
    .select("sender,content,created_at")
    .eq("idol_id", idol.id)
    .order("created_at", { ascending: false })
    .limit(HISTORY_LIMIT);
  if (histErr) return { error: histErr.message };

  // any-llm принимает один prompt — сворачиваем историю в транскрипт диалога.
  const chrono = (recent || []).slice().reverse();
  const transcript = chrono
    .map((m) => (m.sender === "owner" ? "Фанат" : idol.name) + ": " + m.content)
    .join("\n");

  let reply;
  try {
    reply = await callLLM(buildPersona(idol, lang), transcript);
  } catch (e) {
    return { error: "llm", detail: String(e?.message || e) };
  }
  if (!reply) reply = "…";

  // 3. Сохраняем ответ айдола (тот же канал-метка).
  const { data: saved, error: saveErr } = await db
    .from("chat_messages")
    .insert({ idol_id: idol.id, sender: "idol", content: reply, channel })
    .select("id,sender,content,created_at")
    .single();
  if (saveErr) return { error: saveErr.message };

  return { reply: saved };
}
