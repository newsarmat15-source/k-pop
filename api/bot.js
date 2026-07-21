// Единый шлюз мессенджеров (омниканальность). Все каналы — тонкие окна в ОДИН тред
// chat_messages через общее ядро lib/reply.js. Диспетчер по ?action= / ?platform=:
//   POST ?platform=line            — вебхук LINE (входящий текст от юзера)
//   POST ?action=ingest&platform=  — приём от транспортов без вебхука (Discord 24/7-воркер)
//   GET  ?action=discord-oauth     — старт/колбэк OAuth-привязки Discord
//   POST ?action=link-token        — сгенерить одноразовый код привязки (LINE/Telegram), нужна сессия
//   GET  ?action=links             — какие каналы привязаны у юзера (для UI), нужна сессия
//
// bodyParser выключен: LINE подписывает СЫРОЕ тело — парсим сами.
import { createHmac, timingSafeEqual, randomBytes } from "crypto";
import { supabase } from "../lib/supabase.js";
import { readUserId } from "../lib/session.js";
import { ownIdolByUser, resolveLinkedIdol, generateReply, generateProactive, idolById } from "../lib/reply.js";

export const config = { api: { bodyParser: false }, maxDuration: 60 };

const APP_URL = process.env.APP_URL || "https://k-pop-black.vercel.app";

// Проактив: кап и пороги (часы). Правятся env при желании.
const PROACTIVE_CAP_H = parseInt(process.env.PROACTIVE_CAP_H || "20", 10); // не чаще 1 раза в N ч на айдола
const REENGAGE_H = parseInt(process.env.PROACTIVE_REENGAGE_H || "48", 10); // «скучала» после N ч тишины
const STREAK_H = parseInt(process.env.PROACTIVE_STREAK_H || "16", 10); // спасти стрик после N ч тишины

function readRaw(req) {
  return new Promise((resolve, reject) => {
    let d = "";
    req.on("data", (c) => (d += c));
    req.on("end", () => resolve(d));
    req.on("error", reject);
  });
}

// ── LINE ────────────────────────────────────────────────────────────────────
function verifyLineSignature(raw, header) {
  const secret = process.env.LINE_CHANNEL_SECRET;
  if (!secret || !header) return false;
  const expected = createHmac("sha256", secret).update(raw).digest("base64");
  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

async function lineReply(replyToken, text) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) throw new Error("LINE_CHANNEL_ACCESS_TOKEN не задан");
  await fetch("https://api.line.me/v2/bot/message/reply", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ replyToken, messages: [{ type: "text", text: text.slice(0, 4900) }] }),
  });
}

async function lineWebhook(req, res) {
  const raw = await readRaw(req);
  if (!verifyLineSignature(raw, req.headers["x-line-signature"])) {
    return res.status(401).json({ error: "bad signature" });
  }
  let body;
  try { body = JSON.parse(raw); } catch { return res.status(200).json({ ok: true }); }
  const db = supabase();

  for (const ev of body.events || []) {
    if (ev.type !== "message" || ev.message?.type !== "text") continue;
    const userId = ev.source?.userId;
    const text = ev.message.text || "";
    if (!userId || !ev.replyToken) continue;
    try {
      const reply = await routeIncoming(db, "line", userId, text);
      await lineReply(ev.replyToken, reply);
    } catch (e) {
      try { await lineReply(ev.replyToken, "Секунду, что-то пошло не так — попробуй ещё раз 🥲"); } catch {}
      console.error("[line]", String(e?.message || e));
    }
  }
  return res.status(200).json({ ok: true });
}

// ── TELEGRAM ────────────────────────────────────────────────────────────────
// Вебхук на Vercel = уже 24/7, хост не нужен (как LINE). Бэкенд шлёт напрямую
// через sendMessage, поэтому Telegram НЕ нуждается в outbox/воркере.
// Привязка — deep-link https://t.me/<bot>?start=<token> → приходит "/start <token>".
async function telegramSend(chatId, text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return false;
  const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text: String(text).slice(0, 4000) }),
  });
  return r.ok;
}

async function telegramWebhook(req, res) {
  // Telegram шлёт заданный при setWebhook секрет заголовком — защита от чужих запросов.
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (secret && req.headers["x-telegram-bot-api-secret-token"] !== secret) {
    return res.status(401).json({ error: "bad secret" });
  }
  const raw = await readRaw(req);
  let body;
  try { body = JSON.parse(raw); } catch { return res.status(200).json({ ok: true }); }

  const msg = body.message || body.edited_message;
  const chatId = msg?.chat?.id;
  let text = msg?.text || "";
  if (!chatId || !text) return res.status(200).json({ ok: true });

  // Deep-link: "/start ABC12345" → достаём код привязки; голый "/start" отдаём как есть
  // (routeIncoming ответит инструкцией, как связать аккаунт).
  if (text.startsWith("/start")) {
    const payload = text.slice("/start".length).trim();
    if (payload) text = payload;
  }

  const db = supabase();
  try {
    const reply = await routeIncoming(db, "telegram", chatId, text);
    await telegramSend(chatId, reply);
  } catch (e) {
    console.error("[telegram]", String(e?.message || e));
    try { await telegramSend(chatId, "Секунду, что-то пошло не так — попробуй ещё раз 🥲"); } catch {}
  }
  return res.status(200).json({ ok: true });
}

// ── INGEST (Discord-воркер и любой транспорт без вебхука) ─────────────────────
async function ingest(req, res) {
  const secret = process.env.INGEST_SECRET;
  if (!secret || req.headers["x-ingest-secret"] !== secret) {
    return res.status(401).json({ error: "unauthorized" });
  }
  const platform = req.query.platform;
  if (!["discord", "telegram", "line"].includes(platform)) {
    return res.status(400).json({ error: "bad platform" });
  }
  const raw = await readRaw(req);
  let payload;
  try { payload = JSON.parse(raw); } catch { return res.status(400).json({ error: "bad json" }); }
  const { platform_user_id, text } = payload || {};
  if (!platform_user_id || !text) return res.status(400).json({ error: "missing fields" });

  const db = supabase();
  const link = await resolveLinkedIdol(db, platform, platform_user_id);
  if (!link) return res.status(200).json({ ok: true, unlinked: true });

  const out = await generateReply({ db, idol: link.idol, text, lang: link.lang, channel: platform });
  if (out.over) return res.status(429).json({ over: true, limit: out.limit });
  if (out.error) return res.status(502).json({ error: out.error });
  return res.status(200).json({ ok: true, reply: out.reply.content });
}

// ── Общая маршрутизация входящего (LINE и др. вебхуки): привязка кодом или чат ──
async function routeIncoming(db, platform, platformUserId, text) {
  const link = await resolveLinkedIdol(db, platform, platformUserId);
  if (link) {
    const out = await generateReply({ db, idol: link.idol, text, lang: link.lang, channel: platform });
    if (out.over) return `Дневной лимит сообщений (${out.limit}) исчерпан 🙈 Продолжим завтра!`;
    if (out.error) return "Секунду, что-то пошло не так — попробуй ещё раз 🥲";
    return out.reply.content;
  }
  // Не привязан: возможно, юзер прислал код привязки из приложения.
  const code = (text || "").trim().toUpperCase();
  const linked = await tryConsumeToken(db, platform, platformUserId, code);
  if (linked) return `Готово, мы связаны! 🩷 Теперь пиши мне прямо здесь — это тот же наш разговор, что и в приложении. 안녕!`;
  return `안녕! Сначала свяжи аккаунт: открой приложение Idolingo → своего айдола → «Подключить мессенджер», получи код и пришли его мне сюда. ${APP_URL}`;
}

// При первой привязке делаем этот канал основным для проактива (пуши идут ровно в один).
// Если primary уже выбран (не 'web') — не перебиваем: юзер уже «переехал» куда-то.
async function setPrimaryChannel(db, idolId, platform) {
  await db.from("training_stats").update({ primary_channel: platform }).eq("idol_id", idolId).eq("primary_channel", "web");
}

// Одноразовый код привязки: сверяем присланный текст с невыгоревшим link_tokens.
async function tryConsumeToken(db, platform, platformUserId, code) {
  if (!/^[A-Z0-9]{6,10}$/.test(code)) return false;
  const { data: tok } = await db
    .from("link_tokens")
    .select("token,profile_id,idol_id,lang,platform,used_at,created_at")
    .eq("token", code)
    .maybeSingle();
  if (!tok || tok.used_at) return false;
  if (tok.platform && tok.platform !== platform) return false;
  // Токен живёт 30 минут.
  if (Date.now() - new Date(tok.created_at).getTime() > 30 * 60 * 1000) return false;

  const { error } = await db.from("linked_accounts").upsert(
    { platform, platform_user_id: String(platformUserId), profile_id: tok.profile_id, idol_id: tok.idol_id, lang: tok.lang },
    { onConflict: "platform,platform_user_id" }
  );
  if (error) { console.error("[link]", error.message); return false; }
  await db.from("link_tokens").update({ used_at: new Date().toISOString() }).eq("token", code);
  await setPrimaryChannel(db, tok.idol_id, platform);
  return true;
}

// ── ПРОАКТИВ: айдол пишет первой ──────────────────────────────────────────────
// Тик вызывается планировщиком на VPS (ежечасно) с секретом. Сканирует привязанные
// аккаунты, решает по неактивности/стрику, кому написать, генерит опенер и ставит в доставку.
// LINE → прямой push; Discord/Telegram → outbox (воркер поллит). TZ пока не учитываем —
// триггеры по неактивности сами разнесены во времени, кап 1/сутки страхует от спама.
async function linePush(userId, text) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) return false; // не провижинили LINE — вернём false, ляжет в outbox как фолбэк
  const r = await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ to: userId, messages: [{ type: "text", text: text.slice(0, 4900) }] }),
  });
  return r.ok;
}

async function lastOwnerActivity(db, idolId) {
  const { data } = await db
    .from("chat_messages")
    .select("created_at")
    .eq("idol_id", idolId)
    .eq("sender", "owner")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.created_at ? new Date(data.created_at).getTime() : null;
}

// Решаем повод написать (или null). Чистая функция — легко тестировать/дай-ранить.
function decideReason({ nowMs, lastOwnerMs, lastProactiveMs, studyStreak, lastStudyDate }) {
  if (lastOwnerMs == null) return null; // ни разу не писал — не «холодим» незнакомца
  if (lastProactiveMs != null && nowMs - lastProactiveMs < PROACTIVE_CAP_H * 3600e3) return null; // кап
  const hoursOwner = (nowMs - lastOwnerMs) / 3600e3;
  const today = new Date(nowMs).toISOString().slice(0, 10);
  if (hoursOwner >= REENGAGE_H) return "reengage";
  if (studyStreak > 0 && lastStudyDate && lastStudyDate < today && hoursOwner >= STREAK_H) return "streak";
  return null;
}

// force — тестовый/демо-путь: минуя пороги и кап, шлёт заданный повод (по умолчанию reengage).
// only — ограничить одним idol_id. Оба секрет-gated (вызов только с INGEST_SECRET).
async function runProactiveTick(db, { dry = false, force = false, forceReason = "reengage", only = null } = {}) {
  const nowMs = Date.now();
  let q = db.from("linked_accounts").select("platform,platform_user_id,idol_id,lang");
  if (only) q = q.eq("idol_id", only);
  const { data: links, error } = await q;
  if (error) throw new Error(error.message);

  const results = [];
  for (const la of links || []) {
    const { data: ts } = await db
      .from("training_stats")
      .select("study_streak,last_study_date,last_proactive_at,primary_channel")
      .eq("idol_id", la.idol_id)
      .maybeSingle();
    // Ровно ОДИН канал на юзера: шлём только в primary. Если primary ещё 'web'
    // (привязка до этой миграции) — берём платформу самой привязки как основную.
    const primary = ts?.primary_channel && ts.primary_channel !== "web" ? ts.primary_channel : la.platform;
    if (la.platform !== primary) { results.push({ idol_id: la.idol_id, platform: la.platform, skipped: "not-primary" }); continue; }
    const lastOwnerMs = await lastOwnerActivity(db, la.idol_id);
    const reason = force
      ? forceReason
      : decideReason({
          nowMs,
          lastOwnerMs,
          lastProactiveMs: ts?.last_proactive_at ? new Date(ts.last_proactive_at).getTime() : null,
          studyStreak: ts?.study_streak || 0,
          lastStudyDate: ts?.last_study_date || null,
        });
    if (!reason) { results.push({ idol_id: la.idol_id, platform: la.platform, skipped: true }); continue; }
    if (dry) { results.push({ idol_id: la.idol_id, platform: la.platform, reason, dry: true }); continue; }

    const idol = await idolById(db, la.idol_id);
    if (!idol) { results.push({ idol_id: la.idol_id, error: "no idol" }); continue; }
    idol.study_streak = ts?.study_streak || 0;

    const out = await generateProactive({ db, idol, lang: la.lang, reason, channel: la.platform });
    if (out.error) { results.push({ idol_id: la.idol_id, reason, error: out.error }); continue; }
    const text = out.reply.content;

    // Доставка: LINE/Telegram — прямой пуш с бэкенда (у них вебхук, хост не нужен).
    // Discord — в outbox: bot-token живёт только на VPS-воркере, он и доставит.
    let delivered = false;
    if (la.platform === "line") delivered = await linePush(la.platform_user_id, text);
    else if (la.platform === "telegram") delivered = await telegramSend(la.platform_user_id, text);
    if (!delivered) {
      await db.from("outbox").insert({
        platform: la.platform, platform_user_id: la.platform_user_id,
        idol_id: la.idol_id, content: text, reason,
      });
    }
    // Кап: помечаем время последнего проактива.
    await db.from("training_stats").update({ last_proactive_at: new Date(nowMs).toISOString() }).eq("idol_id", la.idol_id);
    results.push({ idol_id: la.idol_id, platform: la.platform, reason, delivered: delivered ? "push" : "outbox" });
  }
  return results;
}

async function proactiveTick(req, res) {
  if (req.headers["x-ingest-secret"] !== process.env.INGEST_SECRET || !process.env.INGEST_SECRET) {
    return res.status(401).json({ error: "unauthorized" });
  }
  const dry = req.query.dry === "1";
  const force = req.query.force === "1";
  const forceReason = req.query.reason || "reengage";
  const only = req.query.only || null;
  const results = await runProactiveTick(supabase(), { dry, force, forceReason, only });
  const sent = results.filter((r) => r.delivered).length;
  return res.status(200).json({ ok: true, dry, sent, count: results.length, results });
}

// ── OUTBOX: воркер без прямого пуша забирает недоставленные проактивы ──────────
async function outboxPending(req, res) {
  if (req.headers["x-ingest-secret"] !== process.env.INGEST_SECRET || !process.env.INGEST_SECRET) {
    return res.status(401).json({ error: "unauthorized" });
  }
  const platform = req.query.platform;
  if (!["discord", "telegram"].includes(platform)) return res.status(400).json({ error: "bad platform" });
  const db = supabase();
  const { data, error } = await db
    .from("outbox")
    .select("id,platform_user_id,content")
    .eq("platform", platform)
    .is("delivered_at", null)
    .order("created_at", { ascending: true })
    .limit(20);
  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ ok: true, messages: data || [] });
}

async function outboxAck(req, res) {
  if (req.headers["x-ingest-secret"] !== process.env.INGEST_SECRET || !process.env.INGEST_SECRET) {
    return res.status(401).json({ error: "unauthorized" });
  }
  const raw = await readRaw(req);
  let ids = [];
  try { ids = JSON.parse(raw || "{}").ids || []; } catch {}
  if (!Array.isArray(ids) || !ids.length) return res.status(400).json({ error: "no ids" });
  const db = supabase();
  const { error } = await db.from("outbox").update({ delivered_at: new Date().toISOString() }).in("id", ids);
  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ ok: true, acked: ids.length });
}

// ── Генерация кода привязки для deep-link каналов (LINE/Telegram) ──────────────
async function createLinkToken(req, res) {
  const uid = readUserId(req);
  if (!uid) return res.status(401).json({ error: "Нужно войти" });
  const raw = await readRaw(req);
  let lang = "en";
  let platform = null;
  try {
    const b = JSON.parse(raw || "{}");
    lang = b.lang || "en";
    platform = b.platform || null;
  } catch {}

  const db = supabase();
  const idol = await ownIdolByUser(db, uid);
  if (!idol) return res.status(400).json({ error: "У тебя ещё нет айдола" });

  const code = randomBytes(4).toString("hex").toUpperCase().slice(0, 8); // 8-символьный код
  const { error } = await db.from("link_tokens").insert({ token: code, profile_id: uid, idol_id: idol.id, lang, platform });
  if (error) return res.status(500).json({ error: error.message });

  // Telegram умеет deep-link: одна ссылка вместо ручного ввода кода.
  const tgUser = process.env.TELEGRAM_BOT_USERNAME;
  const deeplink = platform === "telegram" && tgUser ? `https://t.me/${tgUser}?start=${code}` : null;
  return res.status(200).json({ ok: true, code, deeplink });
}

// ── Discord OAuth: старт (нет code) → редирект; колбэк (есть code) → привязка ──
async function discordOauth(req, res) {
  const clientId = process.env.DISCORD_CLIENT_ID;
  const clientSecret = process.env.DISCORD_CLIENT_SECRET;
  const redirectUri = `${APP_URL}/api/bot?action=discord-oauth`;
  const db = supabase();

  // Колбэк от Discord.
  if (req.query.code) {
    const state = req.query.state;
    const { data: tok } = await db
      .from("link_tokens")
      .select("token,profile_id,idol_id,lang,used_at,created_at")
      .eq("token", state)
      .maybeSingle();
    if (!tok || tok.used_at) return res.redirect(302, `${APP_URL}/?link=discord_expired`);

    // Обмен кода на токен.
    const tr = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId, client_secret: clientSecret, grant_type: "authorization_code",
        code: req.query.code, redirect_uri: redirectUri,
      }),
    });
    const td = await tr.json().catch(() => ({}));
    if (!tr.ok || !td.access_token) return res.redirect(302, `${APP_URL}/?link=discord_fail`);

    const ur = await fetch("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${td.access_token}` },
    });
    const ud = await ur.json().catch(() => ({}));
    if (!ud.id) return res.redirect(302, `${APP_URL}/?link=discord_fail`);

    await db.from("linked_accounts").upsert(
      { platform: "discord", platform_user_id: String(ud.id), profile_id: tok.profile_id, idol_id: tok.idol_id, lang: tok.lang },
      { onConflict: "platform,platform_user_id" }
    );
    await db.from("link_tokens").update({ used_at: new Date().toISOString() }).eq("token", state);
    await setPrimaryChannel(db, tok.idol_id, "discord");
    return res.redirect(302, `${APP_URL}/?link=discord_ok`);
  }

  // Старт: нужна сессия, создаём state-токен и уводим на Discord.
  const uid = readUserId(req);
  if (!uid) return res.redirect(302, `${APP_URL}/?link=need_login`);
  const idol = await ownIdolByUser(db, uid);
  if (!idol) return res.redirect(302, `${APP_URL}/?link=no_idol`);
  const lang = req.query.lang || "en";
  const code = randomBytes(8).toString("hex");
  await db.from("link_tokens").insert({ token: code, profile_id: uid, idol_id: idol.id, lang, platform: "discord" });

  const auth = new URL("https://discord.com/api/oauth2/authorize");
  auth.searchParams.set("client_id", clientId || "");
  auth.searchParams.set("redirect_uri", redirectUri);
  auth.searchParams.set("response_type", "code");
  auth.searchParams.set("scope", "identify");
  auth.searchParams.set("state", code);
  return res.redirect(302, auth.toString());
}

// ── Список привязанных каналов (для UI) ───────────────────────────────────────
async function listLinks(req, res) {
  const uid = readUserId(req);
  if (!uid) return res.status(401).json({ error: "Нужно войти" });
  const db = supabase();
  const { data, error } = await db
    .from("linked_accounts")
    .select("platform,created_at")
    .eq("profile_id", uid);
  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ ok: true, links: data || [] });
}

export default async function handler(req, res) {
  const { action, platform } = req.query;
  try {
    if (platform === "line" && req.method === "POST" && !action) return await lineWebhook(req, res);
    if (platform === "telegram" && req.method === "POST" && !action) return await telegramWebhook(req, res);
    if (action === "ingest" && req.method === "POST") return await ingest(req, res);
    if (action === "proactive-tick" && req.method === "POST") return await proactiveTick(req, res);
    if (action === "outbox" && req.method === "GET") return await outboxPending(req, res);
    if (action === "outbox-ack" && req.method === "POST") return await outboxAck(req, res);
    if (action === "discord-oauth") return await discordOauth(req, res);
    if (action === "link-token" && req.method === "POST") return await createLinkToken(req, res);
    if (action === "links") return await listLinks(req, res);
    return res.status(400).json({ error: "Неизвестный маршрут" });
  } catch (e) {
    console.error("[bot]", String(e?.stack || e));
    return res.status(500).json({ error: String(e?.message || e) });
  }
}
