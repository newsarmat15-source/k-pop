import { supabase } from "../lib/supabase.js";
import { readUserId } from "../lib/session.js";

// Открывает строку клипа со статусом pending ДО начала генерации — оркестрация всё ещё идёт
// в браузере (не в serverless, там лимит по времени), но теперь есть честная запись в базе,
// а не только то, что видно в текущей вкладке.
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST" });
  const uid = readUserId(req);
  if (!uid) return res.status(401).json({ error: "Нужно войти в аккаунт" });

  const db = supabase();
  const { data: idol } = await db.from("idols").select("id,owner_id").eq("owner_id", uid).maybeSingle();
  if (!idol) return res.status(400).json({ error: "У тебя ещё нет айдола" });

  const { data: clip, error } = await db.from("clips").insert({ idol_id: idol.id, status: "processing" }).select().single();
  if (error) return res.status(500).json({ error: error.message });

  return res.status(200).json({ ok: true, clipId: clip.id });
}
