import { supabase } from "../lib/supabase.js";
import { readUserId } from "../lib/session.js";

export default async function handler(req, res) {
  const uid = readUserId(req);
  if (!uid) return res.status(200).json({ ok: true, user: null });

  const { data: profile, error } = await supabase().from("profiles").select("*").eq("id", uid).single();
  if (error) return res.status(200).json({ ok: true, user: null });
  return res.status(200).json({ ok: true, user: profile });
}
