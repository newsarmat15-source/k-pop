import { supabase } from "../lib/supabase.js";
import { readUserId } from "../lib/session.js";

function ymd(d) { return new Date(d).toISOString().slice(0, 10); }

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST" });
  const uid = readUserId(req);
  if (!uid) return res.status(401).json({ error: "Нужно войти в аккаунт" });

  const { idolId, action } = req.body || {};
  if (!idolId || (action !== "follow" && action !== "unfollow")) return res.status(400).json({ error: "Нужны idolId и action" });

  const db = supabase();
  const { data: idol } = await db.from("idols").select("id,owner_id").eq("id", idolId).maybeSingle();
  if (!idol) return res.status(404).json({ error: "Айдол не найден" });
  if (idol.owner_id === uid) return res.status(400).json({ error: "Нельзя подписаться на своего айдола" });

  if (action === "unfollow") {
    await db.from("follows").delete().eq("idol_id", idolId).eq("follower_id", uid);
    return res.status(200).json({ ok: true, following: false, streak: 0 });
  }

  const today = ymd(Date.now());
  const { data: existing } = await db.from("follows").select("*").eq("idol_id", idolId).eq("follower_id", uid).maybeSingle();

  if (!existing) {
    await db.from("follows").insert({ follower_id: uid, idol_id: idolId, streak_count: 1, last_support_date: today });
    return res.status(200).json({ ok: true, following: true, streak: 1 });
  }

  // уже подписан — считаем как ежедневный чек-ин: подряд, если заходил вчера; иначе стрик сбрасывается на 1
  if (existing.last_support_date === today) return res.status(200).json({ ok: true, following: true, streak: existing.streak_count });
  const yesterday = ymd(Date.now() - 86400000);
  const nextStreak = existing.last_support_date === yesterday ? existing.streak_count + 1 : 1;
  await db.from("follows").update({ streak_count: nextStreak, last_support_date: today }).eq("idol_id", idolId).eq("follower_id", uid);
  return res.status(200).json({ ok: true, following: true, streak: nextStreak });
}
