import { supabase } from "../lib/supabase.js";
import { readUserId } from "../lib/session.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST" });
  const uid = readUserId(req);
  if (!uid) return res.status(401).json({ error: "Нужно войти в аккаунт" });

  const { name, concept, portraitUrl, gender } = req.body || {};
  if (!name || !portraitUrl) return res.status(400).json({ error: "Нужны name и portraitUrl" });

  const db = supabase();
  // MVP-правило по экономике: 1 бесплатный айдол на аккаунт, второй — за деньги (см. Stripe, ещё не подключён)
  const { data: existing, error: existErr } = await db.from("idols").select("id").eq("owner_id", uid).limit(1);
  if (existErr) return res.status(500).json({ error: existErr.message });
  if (existing && existing.length) return res.status(400).json({ error: "У тебя уже есть айдол — доп. айдол появится вместе с платежами" });

  const { data: idol, error } = await db.from("idols")
    .insert({ owner_id: uid, name, concept: concept || null, portrait_url: portraitUrl, gender: gender || null })
    .select().single();
  if (error) return res.status(400).json({ error: error.message });

  const { error: tsErr } = await db.from("training_stats").insert({ idol_id: idol.id });
  if (tsErr) return res.status(400).json({ error: tsErr.message });

  return res.status(200).json({ ok: true, idol, training: { language_pct: 0, dance_pct: 0, dance_moves_learned: 0 } });
}
