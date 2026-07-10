import { supabase } from "../lib/supabase.js";
import { readUserId } from "../lib/session.js";

const REST_MS = 4 * 60 * 60 * 1000;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST" });
  const uid = readUserId(req);
  if (!uid) return res.status(401).json({ error: "Нужно войти в аккаунт" });

  const { kind } = req.body || {};
  if (kind !== "lang" && kind !== "dance") return res.status(400).json({ error: "kind должен быть lang или dance" });

  const db = supabase();
  const { data: idol, error: idolErr } = await db.from("idols").select("id").eq("owner_id", uid).limit(1).maybeSingle();
  if (idolErr) return res.status(500).json({ error: idolErr.message });
  if (!idol) return res.status(400).json({ error: "У тебя ещё нет айдола" });

  const { data: ts, error: tsErr } = await db.from("training_stats").select("*").eq("idol_id", idol.id).single();
  if (tsErr) return res.status(500).json({ error: tsErr.message });

  const cooldownField = kind === "lang" ? "language_cooldown_until" : "dance_cooldown_until";
  const now = Date.now();
  const cur = ts[cooldownField] ? new Date(ts[cooldownField]).getTime() : 0;
  if (cur > now) return res.status(400).json({ error: "Нужен отдых перед следующим занятием" });

  const patch = { [cooldownField]: new Date(now + REST_MS).toISOString(), updated_at: new Date().toISOString() };
  if (kind === "lang") patch.language_pct = Math.min(100, ts.language_pct + 10);
  else patch.dance_moves_learned = ts.dance_moves_learned + 1;

  const { data: updated, error: updErr } = await db.from("training_stats").update(patch).eq("idol_id", idol.id).select().single();
  if (updErr) return res.status(500).json({ error: updErr.message });

  return res.status(200).json({ ok: true, training: updated });
}
