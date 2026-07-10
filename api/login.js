import { supabase, supabaseAnon } from "../lib/supabase.js";
import { createSessionCookie } from "../lib/session.js";

export default async function handler(req, res) {
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
