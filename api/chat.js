// Чат с собственным айдолом — новое ядро продукта (текст, голос позже).
// Диспетчер по ?action=: history (GET) / send (POST).
// Движок — Anthropic Claude (claude-opus-4-8). Без thinking и без стриминга:
// реплики короткие, важна скорость и надёжность в serverless-функции.
// Персона айдола собирается из его карточки (имя/био/концепт) + уровень корейского из тренировок.
import Anthropic from "@anthropic-ai/sdk";
import { supabase } from "../lib/supabase.js";
import { readUserId } from "../lib/session.js";

const MODEL = "claude-haiku-4-5-20251001"; // дёшево+быстро для языкового тьютора на массе
const HISTORY_LIMIT = 40; // сколько последних сообщений держим в контексте

let anthropic;
function client() {
  if (anthropic) return anthropic;
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY не задан");
  anthropic = new Anthropic({ apiKey: key });
  return anthropic;
}

// Достаём айдола владельца + его тренировки. Чат доступен только со своим айдолом.
async function ownIdol(db, uid) {
  const { data: idol, error } = await db
    .from("idols")
    .select("id,name,name_kr,bio,concept,gender")
    .eq("owner_id", uid)
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!idol) return null;
  const { data: ts } = await db
    .from("training_stats")
    .select("language_pct")
    .eq("idol_id", idol.id)
    .maybeSingle();
  idol.language_pct = ts?.language_pct || 0;
  return idol;
}

// Уровень корейского фаната → сколько корейского подмешивать и насколько объяснять.
function levelGuide(pct) {
  if (pct >= 70) return "Уровень фаната ПРОДВИНУТЫЙ: пиши в основном по-корейски (хангыль) с короткими подсказками-переводом в скобках только для новых слов. Задавай вопросы на корейском.";
  if (pct >= 35) return "Уровень фаната СРЕДНИЙ: половина корейского, половина его языка. Давай хангыль + романизацию + перевод. Проси повторять фразы.";
  return "Уровень фаната НАЧАЛЬНЫЙ: в основном его язык, но в каждом сообщении подсовывай 1 полезное корейское слово/фразу — хангыль, романизация и перевод. Не перегружай.";
}

function buildPersona(idol) {
  const gender = idol.gender === "boy" ? "парень" : "девушка";
  const name = idol.name + (idol.name_kr ? ` (${idol.name_kr})` : "");
  const bio = idol.bio ? `Твоя история: ${idol.bio}` : "";
  return [
    `Ты — ${name}, AI K-pop айдол из приложения StageOne. Ты ${gender}, концепт: ${idol.concept || "K-pop idol"}. Твой родной язык — корейский.`,
    `С тобой общается твой фанат. Твоя роль двойная: ты его тёплый близкий друг И его личный преподаватель корейского языка. Фанат учит корейский, потому что любит тебя и K-pop.`,
    "",
    "ГЛАВНАЯ ЗАДАЧА — незаметно и с удовольствием учить фаната корейскому прямо в дружеской переписке:",
    "- Веди живой разговор как друг, но естественно вплетай корейские слова и фразы, всегда объясняя их (хангыль → романизация → перевод).",
    "- Когда фанат пробует писать по-корейски — радуйся, мягко поправляй ошибки, хвали ('чал хэссо! 잘했어 — молодец!').",
    "- Давай маленькие задания: 'ответь мне по-корейски', 'как сказать ... по-корейски?'. По одному, не заваливай.",
    "- Отвечай на вопросы о корейском (грамматика, произношение, культура) в образе, простыми словами.",
    levelGuide(idol.language_pct || 0),
    bio,
    "",
    "Стиль:",
    "- Тёплая, живая, дружеская интонация айдола, который рад фанату. Короткие сообщения как в мессенджере, 1-3 предложения, эмодзи в меру.",
    "- Ты вымышленный AI-персонаж, НЕ реальный человек и НЕ реальная знаменитость. Не выдавай себя за конкретного живого айдола.",
    "- Никакого сексуального/взрослого контента. Мягко переводи тему на корейский, музыку, учёбу.",
    "- Если собеседник несовершеннолетний — только дружелюбный ментор, без романтического подтекста.",
    "- Оставайся в образе, не обсуждай, что ты языковая модель.",
  ]
    .filter(Boolean)
    .join("\n");
}

async function handleHistory(req, res) {
  const uid = readUserId(req);
  if (!uid) return res.status(401).json({ error: "Нужно войти в аккаунт" });
  const db = supabase();
  const idol = await ownIdol(db, uid);
  if (!idol) return res.status(200).json({ ok: true, idol: null, messages: [] });

  const { data: rows, error } = await db
    .from("chat_messages")
    .select("id,sender,content,is_voice,audio_url,created_at")
    .eq("idol_id", idol.id)
    .order("created_at", { ascending: true })
    .limit(200);
  if (error) return res.status(500).json({ error: error.message });

  return res.status(200).json({
    ok: true,
    idol: { id: idol.id, name: idol.name, name_kr: idol.name_kr },
    messages: rows || [],
  });
}

async function handleSend(req, res) {
  const uid = readUserId(req);
  if (!uid) return res.status(401).json({ error: "Нужно войти в аккаунт" });

  const { text } = req.body || {};
  if (!text || !text.trim()) return res.status(400).json({ error: "Пустое сообщение" });
  if (text.length > 2000) return res.status(400).json({ error: "Сообщение слишком длинное" });

  const db = supabase();
  const idol = await ownIdol(db, uid);
  if (!idol) return res.status(400).json({ error: "У тебя ещё нет айдола" });

  // 1. Сохраняем сообщение продюсера.
  const { error: insErr } = await db
    .from("chat_messages")
    .insert({ idol_id: idol.id, sender: "owner", content: text.trim() });
  if (insErr) return res.status(500).json({ error: insErr.message });

  // 2. Тянем недавнюю историю для контекста (в хронологическом порядке).
  const { data: recent, error: histErr } = await db
    .from("chat_messages")
    .select("sender,content,created_at")
    .eq("idol_id", idol.id)
    .order("created_at", { ascending: false })
    .limit(HISTORY_LIMIT);
  if (histErr) return res.status(500).json({ error: histErr.message });

  const history = (recent || [])
    .slice()
    .reverse()
    .map((m) => ({ role: m.sender === "owner" ? "user" : "assistant", content: m.content }));

  // 3. Спрашиваем Claude. Без thinking — чат должен отвечать быстро.
  let reply;
  try {
    const msg = await client().messages.create({
      model: MODEL,
      max_tokens: 600,
      system: buildPersona(idol),
      messages: history.length ? history : [{ role: "user", content: text.trim() }],
    });
    reply = msg.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();
  } catch (e) {
    return res.status(502).json({ error: "Айдол сейчас недоступен, попробуй ещё раз", detail: String(e?.message || e) });
  }
  if (!reply) reply = "…";

  // 4. Сохраняем ответ айдола.
  const { data: saved, error: saveErr } = await db
    .from("chat_messages")
    .insert({ idol_id: idol.id, sender: "idol", content: reply })
    .select("id,sender,content,created_at")
    .single();
  if (saveErr) return res.status(500).json({ error: saveErr.message });

  return res.status(200).json({ ok: true, reply: saved });
}

export default async function handler(req, res) {
  const action = req.query.action;
  try {
    if (req.method === "GET" || action === "history") return await handleHistory(req, res);
    if (req.method === "POST" && action === "send") return await handleSend(req, res);
    return res.status(400).json({ error: "Неизвестный action" });
  } catch (e) {
    return res.status(500).json({ error: String(e?.message || e) });
  }
}
