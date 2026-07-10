// Объединено: signup + login + logout + me — было 4 отдельные serverless-функции,
// схлопнуто в одну ради лимита в 12 функций на Vercel Hobby (см. PROGRESS.md).
// Диспетчер по ?action=.
import { supabase, supabaseAnon } from "../lib/supabase.js";
import { createSessionCookie, clearSessionCookie, readUserId } from "../lib/session.js";

async function handleSignup(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST" });
  const { email, password, username } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: "Нужны email и password" });
  if (password.length < 8) return res.status(400).json({ error: "Пароль минимум 8 символов" });

  const db = supabase();
  const { data: created, error: createErr } = await db.auth.admin.createUser({
    email, password, email_confirm: true,
  });
  if (createErr) return res.status(400).json({ error: createErr.message });

  const userId = created.user.id;
  const { data: profile, error: profileErr } = await db
    .from("profiles")
    .insert({ id: userId, username: username || null })
    .select()
    .single();
  if (profileErr) {
    await db.auth.admin.deleteUser(userId);
    return res.status(400).json({ error: profileErr.message });
  }

  res.setHeader("Set-Cookie", createSessionCookie(userId));
  return res.status(200).json({ ok: true, profile });
}

async function handleLogin(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST" });
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: "Нужны email и password" });

  const { data, error } = await supabaseAnon().auth.signInWithPassword({ email, password });
  if (error) return res.status(401).json({ error: "Неверный email или пароль" });

  const { data: profile, error: profileErr } = await supabase()
    .from("profiles")
    .select("*")
    .eq("id", data.user.id)
    .single();
  if (profileErr) return res.status(500).json({ error: profileErr.message });

  res.setHeader("Set-Cookie", createSessionCookie(data.user.id));
  return res.status(200).json({ ok: true, profile });
}

async function handleLogout(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST" });
  res.setHeader("Set-Cookie", clearSessionCookie());
  return res.status(200).json({ ok: true });
}

async function handleMe(req, res) {
  const uid = readUserId(req);
  if (!uid) return res.status(200).json({ ok: true, user: null });

  const { data: profile, error } = await supabase().from("profiles").select("*").eq("id", uid).single();
  if (error) return res.status(200).json({ ok: true, user: null });
  return res.status(200).json({ ok: true, user: profile });
}

export default async function handler(req, res) {
  const action = req.query.action;
  if (action === "signup") return handleSignup(req, res);
  if (action === "login") return handleLogin(req, res);
  if (action === "logout") return handleLogout(req, res);
  if (action === "me") return handleMe(req, res);
  return res.status(400).json({ error: "Неизвестный action" });
}
