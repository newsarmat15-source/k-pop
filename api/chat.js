// Веб-чат с собственным айдолом — тонкий адаптер над общим ядром lib/reply.js.
// Диспетчер по ?action=: history (GET) / send (POST). Вход — куки-сессия.
// Вся генерация персоны/ответа и запись в общий тред живут в lib/reply.js,
// чтобы мессенджеры (Discord/LINE/Telegram) отвечали в ТОТ ЖЕ тред тем же ядром.
import { supabase } from "../lib/supabase.js";
import { readUserId } from "../lib/session.js";
import { ownIdolByUser, generateReply, generateFirstMessage, firstMessageDue } from "../lib/reply.js";

// Язык для первого сообщения. В GET-истории клиент язык не передаёт (менять public/app.js
// нельзя), поэтому берём то, что и так есть: привязанный мессенджер → заголовок браузера → en.
const SUPPORTED = ["en", "ru", "es", "pt", "ja", "zh", "id", "th"];
async function guessLang(db, idolId, req) {
  const { data: link } = await db.from("linked_accounts").select("lang").eq("idol_id", idolId).limit(1).maybeSingle();
  if (link?.lang && SUPPORTED.includes(link.lang)) return link.lang;
  const header = String(req.headers["accept-language"] || "");
  for (const part of header.split(",")) {
    const code = part.trim().slice(0, 2).toLowerCase();
    if (SUPPORTED.includes(code)) return code;
  }
  return "en";
}

async function handleHistory(req, res) {
  const uid = readUserId(req);
  if (!uid) return res.status(401).json({ error: "Нужно войти в аккаунт" });
  const db = supabase();
  const idol = await ownIdolByUser(db, uid);
  if (!idol) return res.status(200).json({ ok: true, idol: null, messages: [] });

  const load = () =>
    db
      .from("chat_messages")
      .select("id,sender,content,is_voice,audio_url,created_at")
      .eq("idol_id", idol.id)
      .order("created_at", { ascending: true })
      .limit(200);

  let { data: rows, error } = await load();
  if (error) return res.status(500).json({ error: error.message });

  // ХУК ПЕРВОГО СООБЩЕНИЯ, быстрый путь. Тред пуст и айдол «отлежался» — значит фанат
  // выбрал айдола и пришёл, а тот ему ещё не написал. Пишем прямо сейчас, чтобы он увидел
  // сообщение, а не пустой экран: пустой чат при первом заходе — это ровно тот момент,
  // где теряется вторая сессия. Идемпотентность держит замок first_msg_at внутри ядра,
  // поэтому параллельные вкладки/устройства дубля не создадут.
  if (!rows?.length && firstMessageDue(idol.created_at)) {
    const lang = await guessLang(db, idol.id, req);
    const first = await generateFirstMessage({ db, idol, lang, channel: "web" });
    if (first.reply) {
      const again = await load();
      if (!again.error) rows = again.data;
    }
  }

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
