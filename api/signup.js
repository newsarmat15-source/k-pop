import { supabase } from "../lib/supabase.js";
import { createSessionCookie } from "../lib/session.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST" });
  const { email, password, username } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: "Нужны email и password" });
  if (password.length < 8) return res.status(400).json({ error: "Пароль минимум 8 символов" });

  const db = supabase();
  // email_confirm:true — пропускаем письмо-подтверждение, для MVP это лишний барьер входа.
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
    // профиль не создался — откатываем юзера, чтобы не плодить сирот в auth.users
    await db.auth.admin.deleteUser(userId);
    return res.status(400).json({ error: profileErr.message });
  }

  res.setHeader("Set-Cookie", createSessionCookie(userId));
  return res.status(200).json({ ok: true, profile });
}
