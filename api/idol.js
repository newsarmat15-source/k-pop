// Публичный просмотр ЧУЖОГO айдола — карточка продюсера, стрик поддержки, топ-саппортер, пульс голосов.
// Приватный прогресс тренировок (% в моменте) сюда не отдаём — только стрик и общее число движений,
// это осознанное решение (см. память проекта: "public profiles show streak + total moves, not the bar").
import { supabase } from "../lib/supabase.js";
import { readUserId } from "../lib/session.js";

export default async function handler(req, res) {
  const idolId = req.query.id;
  if (!idolId) return res.status(400).json({ error: "Нужен ?id=" });
  const db = supabase();

  const { data: idol, error: idolErr } = await db.from("idols")
    .select("id,name,concept,portrait_url,gender,league,owner_id,created_at,profiles!owner_id(username)")
    .eq("id", idolId).maybeSingle();
  if (idolErr) return res.status(500).json({ error: idolErr.message });
  if (!idol) return res.status(404).json({ error: "Айдол не найден" });

  const { data: training } = await db.from("training_stats").select("dance_moves_learned").eq("idol_id", idolId).maybeSingle();
  const { data: clips } = await db.from("clips").select("id,status,video_url,created_at").eq("idol_id", idolId).order("created_at", { ascending: false }).limit(12);

  const { count: votes } = await db.from("votes").select("*", { count: "exact", head: true }).eq("idol_id", idolId);
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count: pulseHour } = await db.from("votes").select("*", { count: "exact", head: true }).eq("idol_id", idolId).gte("created_at", hourAgo);

  const { data: followers } = await db.from("follows").select("follower_id,streak_count,profiles!follower_id(username)").eq("idol_id", idolId).order("streak_count", { ascending: false });
  const topSupporter = followers && followers.length ? { username: followers[0].profiles?.username, streak: followers[0].streak_count } : null;

  let myFollow = null;
  const uid = readUserId(req);
  if (uid) {
    const { data: f } = await db.from("follows").select("streak_count,last_support_date").eq("idol_id", idolId).eq("follower_id", uid).maybeSingle();
    myFollow = f ? { following: true, streak: f.streak_count } : { following: false, streak: 0 };
  }

  return res.status(200).json({
    ok: true,
    idol: { id: idol.id, name: idol.name, concept: idol.concept, img: idol.portrait_url, gender: idol.gender, league: idol.league, created_at: idol.created_at },
    owner: idol.profiles?.username || "продюсер",
    ownerId: idol.owner_id,
    movesLearned: training?.dance_moves_learned || 0,
    clips: clips || [],
    votes: votes || 0,
    pulseHour: pulseHour || 0,
    topSupporter,
    myFollow,
  });
}
