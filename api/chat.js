// Веб-чат с собственным айдолом — тонкий адаптер над общим ядром lib/reply.js.
// Диспетчер по ?action=: history (GET) / send (POST). Вход — куки-сессия.
// Вся генерация персоны/ответа и запись в общий тред живут в lib/reply.js,
// чтобы мессенджеры (Discord/LINE/Telegram) отвечали в ТОТ ЖЕ тред тем же ядром.
import { supabase } from "../lib/supabase.js";
import { readUserId } from "../lib/session.js";
import { ownIdolByUser, generateReply } from "../lib/reply.js";

async function handleHistory(req, res) {
  const uid = readUserId(req);
  if (!uid) return res.status(401).json({ error: "Нужно войти в аккаунт" });
  const db = supabase();
  const idol = await ownIdolByUser(db, uid);
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

  const { text, lang } = req.body || {};
  if (!text || !text.trim()) return res.status(400).json({ error: "Пустое сообщение" });
  if (text.length > 2000) return res.status(400).json({ error: "Сообщение слишком длинное" });

  const db = supabase();
  const idol = await ownIdolByUser(db, uid);
  if (!idol) return res.status(400).json({ error: "У тебя ещё нет айдола" });

  const out = await generateReply({ db, idol, text, lang: lang || "en", channel: "web" });
  if (out.over) return res.status(429).json({
    error: `Дневной лимит сообщений (${out.limit}) исчерпан. Возвращайся завтра 🙂`, limit: out.limit });
  if (out.error === "llm") return res.status(502).json({ error: "Айдол сейчас недоступен, попробуй ещё раз", detail: out.detail });
  if (out.error) return res.status(500).json({ error: out.error });

  return res.status(200).json({ ok: true, reply: out.reply });
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
