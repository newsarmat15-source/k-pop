import { supabase } from "../lib/supabase.js";
import { readUserId } from "../lib/session.js";

export default async function handler(req, res) {
  const uid = readUserId(req);
  if (!uid) return res.status(200).json({ ok: true, idol: null, training: null });

  const db = supabase();
  const { data: idol, error } = await db.from("idols").select("*").eq("owner_id", uid).limit(1).maybeSingle();
  if (error) return res.status(500).json({ error: error.message });
  if (!idol) return res.status(200).json({ ok: true, idol: null, training: null });

  const { data: training } = await db.from("training_stats").select("*").eq("idol_id", idol.id).maybeSingle();
  return res.status(200).json({
    ok: true, idol,
    training: training || { language_pct: 0, dance_pct: 0, dance_moves_learned: 0 },
  });
}
