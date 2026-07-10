import { supabase } from "../lib/supabase.js";

export default async function handler(req, res) {
  const idolId = req.query.idolId;
  if (!idolId) return res.status(400).json({ error: "Нужен ?idolId=" });

  const db = supabase();
  const { data: clips, error } = await db.from("clips")
    .select("id,status,video_url,duration_sec,created_at")
    .eq("idol_id", idolId).order("created_at", { ascending: false }).limit(12);
  if (error) return res.status(500).json({ error: error.message });

  return res.status(200).json({ ok: true, clips: clips || [] });
}
