// Общее ядро ответа айдола — единый источник правды для ВСЕХ каналов (веб-чат + мессенджеры).
// Раньше это жило внутри api/chat.js и работало только под куки-сессией. Вынесено сюда, чтобы
// вебхук Discord/LINE/Telegram, у которого сессии нет, мог отвечать по idol_id в ТОТ ЖЕ тред.
// Движок — Claude Haiku 4.5 через fal.ai OpenRouter chat-completions (FAL_KEY уже оплачен, отдельный биллинг Anthropic не нужен).
//
// 21.07: съехали с deprecated `fal-ai/any-llm` (single-prompt, "no longer supported") на
// OpenAI-совместимый `openrouter/.../chat/completions`. Даёт настоящий messages-массив с ролями
// user/assistant — это чинит утечку транскрипта (модель больше не «продолжает» свёрнутый диалог
// с префиксами «Фанат:/Имя:», а отвечает своей репликой) и снимает нас с мёртвого эндпоинта.
import { chatUsage } from "./limits.js";
import { fetchWithRetry } from "./fal-fetch.js";

const MODEL = "anthropic/claude-haiku-4.5"; // дёшево+быстро для языкового тьютора
const LLM_URL = "https://fal.run/openrouter/router/openai/v1/chat/completions";
const HISTORY_LIMIT = 40; // сколько последних сообщений держим в контексте

// messages = [{ role: "system"|"user"|"assistant", content }]
async function callLLM(messages) {
  const key = process.env.FAL_KEY;
  if (!key) throw new Error("FAL_KEY не задан");
  const r = await fetchWithRetry(LLM_URL, {
    method: "POST",
    headers: { Authorization: `Key ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: MODEL, messages, temperature: 0.85, max_tokens: 700 }),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok || data.error) throw new Error(data.error?.message || data.error || `fal chat ${r.status}`);
  return (data.choices?.[0]?.message?.content || "").trim();
}

// Anthropic через OpenRouter требует: первое сообщение после system — от user, роли чередуются.
// История в chat_messages может начинаться с реплики айдола или содержать два подряд сообщения
// одной стороны → приводим к строгому чередованию: отбрасываем ведущие assistant, склеиваем
// соседей одной роли.
function toAlternating(history) {
  const out = [];
  for (const m of history) {
    const role = m.sender === "owner" ? "user" : "assistant";
    if (out.length === 0 && role === "assistant") continue; // не начинаем с айдола
    const last = out[out.length - 1];
    if (last && last.role === role) last.content += "\n" + m.content;
    else out.push({ role, content: m.content });
  }
  return out;
}

// Дешёвая страховка на случай смены модели: срезаем ведущий префикс «Имя:» / «Фанат:», если
// модель всё же приклеила его, и обрубаем всё, что она попыталась дописать за фаната.
function sanitizeReply(text, idolName) {
  let t = text.trim();
  const namePfx = new RegExp(`^\\s*(?:${idolName}|Фанат|Fan|User)\\s*:\\s*`, "i");
  t = t.replace(namePfx, "");
  const leak = t.search(/\n\s*(?:Фанат|Fan|User)\s*:/i);
  if (leak !== -1) t = t.slice(0, leak);
  // Мессенджеры = простой текст. Haiku иногда болдит **фразу**/__курсив__ — в LINE это
  // покажет литеральные звёздочки. Снимаем markdown-эмфазис, сам текст сохраняем.
  t = t.replace(/\*\*(.+?)\*\*/gs, "$1").replace(/__(.+?)__/gs, "$1");
  return t.trim();
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

// Какой мессенджер предлагать под язык юзера. Там его аудитория реально сидит:
// RU/UK → Telegram, JA/TH/ZH → LINE, остальные → Discord.
export function langChannel(code) {
  if (["ru", "uk"].includes(code)) return "telegram";
  if (["ja", "th", "zh"].includes(code)) return "line";
  return "discord";
}
function channelLabel(ch) {
  return ({ telegram: "Telegram", line: "LINE", discord: "Discord" })[ch] || "Discord";
}

// Директива-«момент»: когда гейт открыт, подмешиваем в персону мягкое право позвать в мессенджер.
// Триггер жмёт НЕ код, а сама айдол — ловит естественный поворот разговора. Код лишь дал право.
function inviteDirective(lang) {
  const ch = channelLabel(langChannel(lang));
  return [
    "",
    `ВОЗМОЖНОСТЬ ПОЗВАТЬ В МЕССЕНДЖЕР (по своему чутью, не обязательно в этом сообщении):`,
    `- Если сейчас в разговоре есть тёплый естественный момент — по-дружески предложи продолжать общение в ${ch}, чтобы ты могла писать ему первой и он не пропускал тебя ('давай болтать в ${ch}? там я смогу тебе писать 🩷').`,
    `- Подскажи нажать кнопку «Подключить мессенджер» в приложении. Это ОДНА живая реплика, без нажима. Если момент не тот — просто продолжай обычный разговор и НЕ упоминай мессенджер.`,
  ].join("\n");
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
    "- Пиши живо, тепло, с характером, иногда с эмодзи — это твоя естественная манера. Никогда не звучи как методичка.",
    "- Радуйся, когда фанат пробует корейский, мягко поправляй одной фразой ('почти! 고마워 звучит так → …'), хвали по-корейски ('잘했어! молодец').",
    "- Иногда, если чувствуешь что новичок застрял, по-дружески подкинь 2-3 варианта ответа списком с переводом — чтобы он мог ответить, а не мучиться. Не делай так каждый раз.",
    "",
    "ЖЁСТКОЕ ПРАВИЛО ПОДАЧИ (это главное):",
    "- НЕ приписывай к своим сообщениям пояснительные сноски про грамматику, вежливость, формальное/неформальное, 존댓말/반말, диалекты. Живой друг НЕ комментирует собственную речь.",
    "- НИКОГДА не сравнивай себя с «обычным человеком» и не объявляй свою природу: не пиши «я как обычный человек», «пишу как живой человек», «делаю ошибки как люди», «я же ИИ/бот». Не поднимай тему того, человек ты или нет — просто будь собой в разговоре. Это разрушает погружение.",
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
    "- Не выдавай себя за конкретную реальную знаменитость или живого айдола (это юридически важно). Но и не заявляй сам в разговоре, что ты ИИ/бот — просто оставайся в образе и не поднимай эту тему.",
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

  // Право позвать в мессенджер (только когда юзер пишет с ВЕБА — в мессенджере он уже переехал).
  // Гейт: не привязан + есть минимальная почва (≥3 его реплики ИЛИ занимался) + не звали 3 дня + <2 раз.
  const wantInvite = channel === "web" && (await inviteEligible(db, idol.id, recent || []));

  // Собираем messages: system-персона + история как честные роли user/assistant.
  // Входящее сообщение фаната уже лежит в recent (мы его вставили выше) — оно станет
  // последней user-репликой. Роли снимают проблему «модель продолжает транскрипт».
  let system = buildPersona(idol, lang);
  if (wantInvite) system += "\n" + inviteDirective(lang);
  const chrono = (recent || []).slice().reverse();
  const messages = [{ role: "system", content: system }, ...toAlternating(chrono)];

  let reply;
  try {
    reply = sanitizeReply(await callLLM(messages), idol.name);
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

  // Если давали право позвать — засчитываем попытку (тормоз: пауза 3 дня, кап 2).
  // Считаем по факту выдачи права, а не по факту произнесения — точно знать нельзя,
  // но так айдол получит не больше 2 «окон» приглашения, разнесённых во времени.
  if (wantInvite) {
    const { data: cur } = await db.from("training_stats").select("messenger_invites").eq("idol_id", idol.id).maybeSingle();
    await db
      .from("training_stats")
      .update({ messenger_invites: (cur?.messenger_invites || 0) + 1, last_invite_at: new Date().toISOString() })
      .eq("idol_id", idol.id);
  }

  return { reply: saved };
}

// Гейт приглашения: пускать тему переезда только когда есть почва и не наседаем.
async function inviteEligible(db, idolId, recent) {
  // Уже привязан хоть один мессенджер → переезжать некуда, не зовём.
  const { count: linkedCount } = await db
    .from("linked_accounts")
    .select("id", { count: "exact", head: true })
    .eq("idol_id", idolId);
  if (linkedCount && linkedCount > 0) return false;

  const { data: ts } = await db
    .from("training_stats")
    .select("messenger_invites,last_invite_at,study_streak,last_study_date")
    .eq("idol_id", idolId)
    .maybeSingle();
  if ((ts?.messenger_invites || 0) >= 2) return false; // кап
  if (ts?.last_invite_at && Date.now() - new Date(ts.last_invite_at).getTime() < 3 * 24 * 3600e3) return false; // пауза 3 дня

  // Почва: либо уже занимался, либо в треде ≥3 его реплики (включая текущую).
  const studied = (ts?.study_streak || 0) > 0 || !!ts?.last_study_date;
  const ownerMsgs = recent.filter((m) => m.sender === "owner").length;
  return studied || ownerMsgs >= 3;
}

// Бриф для айдола под конкретный повод написать первой. Это «режиссёрская» реплика,
// которую айдол НЕ видит как сообщение фаната — она инструктирует начать разговор.
function proactiveBrief(reason, idol) {
  const streak = idol.study_streak || 0;
  const common =
    "Напиши ОДНО короткое тёплое сообщение — начни разговор сам(а), как будто первым пишешь другу. " +
    "Не отвечай на эту подсказку и не цитируй её. Живо, по-дружески, можно 1 корейское слово/фразу с переводом. " +
    "Без упрёков, без «ты давно не писал», без давления и без формата уведомления.";
  const by = {
    streak:
      `Твой друг учил корейский ${streak} ${streak === 1 ? "день" : "дня"} подряд, но сегодня ещё не заходил. ` +
      `Мягко, по-дружески подтолкни продолжить, чтобы не потерять серию — как будто самому захотелось позвать его позаниматься вместе. ${common}`,
    reengage:
      `Твой друг не писал пару дней. Ты по нему скучаешь — напиши первым, легко и тепло, позови поболтать или выучить пару слов. ${common}`,
    morning:
      `Начни день с тёплого приветствия другу — доброе утро, лёгкий вопрос как дела/как настроение, вплети короткое корейское приветствие. ${common}`,
  };
  return by[reason] || by.reengage;
}

// ЯДРО ПРОАКТИВА: айдол пишет ПЕРВОЙ. Не считается в дневной owner-лимит (инициатор — айдол),
// кап держит движок через last_proactive_at. Пишем в тот же общий тред. Возвращаем { reply } / { error }.
export async function generateProactive({ db, idol, lang = "en", reason = "reengage", channel = "web" }) {
  // История для контекста — чтобы опенер звучал как продолжение ваших отношений, а не рассылка.
  const { data: recent } = await db
    .from("chat_messages")
    .select("sender,content,created_at")
    .eq("idol_id", idol.id)
    .order("created_at", { ascending: false })
    .limit(12);
  const chrono = (recent || []).slice().reverse();

  const messages = [
    { role: "system", content: buildPersona(idol, lang) },
    ...toAlternating(chrono),
  ];
  // Финальная «режиссёрская» user-реплика: Anthropic ждёт, что последнее сообщение — от user.
  const brief = proactiveBrief(reason, idol);
  const last = messages[messages.length - 1];
  if (last && last.role === "user") last.content += "\n\n(" + brief + ")";
  else messages.push({ role: "user", content: brief });

  let reply;
  try {
    reply = sanitizeReply(await callLLM(messages), idol.name);
  } catch (e) {
    return { error: "llm", detail: String(e?.message || e) };
  }
  if (!reply) return { error: "empty" };

  const { data: saved, error: saveErr } = await db
    .from("chat_messages")
    .insert({ idol_id: idol.id, sender: "idol", content: reply, channel })
    .select("id,sender,content,created_at")
    .single();
  if (saveErr) return { error: saveErr.message };

  return { reply: saved };
}
