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
import { ownIdolByUser, resolveLinkedIdol, generateReply } from "../lib/reply.js";

export const config = { api: { bodyParser: false } };

const APP_URL = process.env.APP_URL || "https://k-pop-black.vercel.app";

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
  return true;
}

// ── Генерация кода привязки для deep-link каналов (LINE/Telegram) ──────────────
async function createLinkToken(req, res) {
  const uid = readUserId(req);
  if (!uid) return res.status(401).json({ error: "Нужно войти" });
  const raw = await readRaw(req);
  let lang = "en";
  try { lang = (JSON.parse(raw || "{}").lang) || "en"; } catch {}

  const db = supabase();
  const idol = await ownIdolByUser(db, uid);
  if (!idol) return res.status(400).json({ error: "У тебя ещё нет айдола" });

  const code = randomBytes(4).toString("hex").toUpperCase().slice(0, 8); // 8-символьный код
  const { error } = await db.from("link_tokens").insert({ token: code, profile_id: uid, idol_id: idol.id, lang });
  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ ok: true, code });
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
    if (action === "ingest" && req.method === "POST") return await ingest(req, res);
    if (action === "discord-oauth") return await discordOauth(req, res);
    if (action === "link-token" && req.method === "POST") return await createLinkToken(req, res);
    if (action === "links") return await listLinks(req, res);
    return res.status(400).json({ error: "Неизвестный маршрут" });
  } catch (e) {
    console.error("[bot]", String(e?.stack || e));
    return res.status(500).json({ error: String(e?.message || e) });
  }
}
