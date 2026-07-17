// Простые подписанные сессии-куки — без библиотек JWT, всё через встроенный crypto.
// Архитектура сервера: браузер никогда не видит ключи Supabase, только этот cookie.
import { createHmac, timingSafeEqual } from "crypto";

const COOKIE_NAME = "s1_session";
const TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 дней

function sign(payload) {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET не задан");
  return createHmac("sha256", secret).update(payload).digest("hex");
}

export function createSessionCookie(userId) {
  const body = Buffer.from(JSON.stringify({ uid: userId, exp: Date.now() + TTL_MS })).toString("base64url");
  const sig = sign(body);
  const value = `${body}.${sig}`;
  const maxAge = Math.floor(TTL_MS / 1000);
  // Secure — на HTTPS-проде (Vercel) браузеры надёжнее сохраняют persistent-cookie; на localhost
  // Secure тоже отдаётся (localhost = secure context). Expires дублирует Max-Age для старых Safari.
  const expires = new Date(Date.now() + TTL_MS).toUTCString();
  return `${COOKIE_NAME}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}; Expires=${expires}`;
}

export function clearSessionCookie() {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

export function readUserId(req) {
  const raw = req.headers.cookie || "";
  const match = raw.split(";").map((s) => s.trim()).find((s) => s.startsWith(COOKIE_NAME + "="));
  if (!match) return null;
  const value = match.slice(COOKIE_NAME.length + 1);
  const [body, sig] = value.split(".");
  if (!body || !sig) return null;
  let expected;
  try {
    expected = sign(body);
  } catch {
    return null;
  }
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const { uid, exp } = JSON.parse(Buffer.from(body, "base64url").toString());
    if (!uid || Date.now() > exp) return null;
    return uid;
  } catch {
    return null;
  }
}
