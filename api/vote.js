import { supabase } from "../lib/supabase.js";
import { readUserId } from "../lib/session.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST" });
  const uid = readUserId(req);
  if (!uid) return res.status(401).json({ error: "Нужно войти в аккаунт" });

  const { idolId } = req.body || {};
  if (!idolId) return res.status(400).json({ error: "Нужен idolId" });

  const db = supabase();
  const { data: idol, error: idolErr } = await db.from("idols").select("id,owner_id").eq("id", idolId).maybeSingle();
  if (idolErr) return res.status(500).json({ error: idolErr.message });
  if (!idol) return res.status(404).json({ error: "Айдол не найден" });
  if (idol.owner_id === uid) return res.status(400).json({ error: "Нельзя голосовать за своего айдола" });

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const { data: already, error: checkErr } = await db.from("votes").select("id")
    .eq("idol_id", idolId).eq("voter_id", uid).gte("created_at", todayStart.toISOString()).limit(1);
  if (checkErr) return res.status(500).json({ error: checkErr.message });
  if (already && already.length) return res.status(400).json({ error: "Уже голосовал за этого айдола сегодня" });

  const { error: insErr } = await db.from("votes").insert({ idol_id: idolId, voter_id: uid });
  if (insErr) return res.status(500).json({ error: insErr.message });

  // +1 энергия голосующему — см. экономику StageOne ("голос за чужого = валюта в свою прокачку")
  const { data: profile } = await db.from("profiles").select("energy_balance").eq("id", uid).single();
  await db.from("profiles").update({ energy_balance: (profile?.energy_balance || 0) + 1 }).eq("id", uid);

  const { count: newTotal } = await db.from("votes").select("*", { count: "exact", head: true }).eq("idol_id", idolId);

  return res.status(200).json({ ok: true, votes: newTotal });
}
