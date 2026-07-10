// Объединено: create-idol + my-idol + публичный просмотр чужого айдола — было 3 функции,
// схлопнуто в одну ради лимита в 12 функций на Vercel Hobby (см. PROGRESS.md).
// POST = создать своего айдола. GET ?id= = публичная карточка чужого. GET без ?id= = свой айдол.
import { supabase } from "../lib/supabase.js";
import { readUserId } from "../lib/session.js";

async function handleCreate(req, res) {
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

async function handleMyIdol(req, res) {
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

// Публичный просмотр ЧУЖОГO айдола — карточка продюсера, стрик поддержки, топ-саппортер, пульс голосов.
// Приватный прогресс тренировок (% в моменте) сюда не отдаём — только стрик и общее число движений,
// это осознанное решение (см. память проекта: "public profiles show streak + total moves, not the bar").
async function handlePublicView(req, res) {
  const idolId = req.query.id;
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

export default async function handler(req, res) {
  if (req.method === "POST") return handleCreate(req, res);
  if (req.query.id) return handlePublicView(req, res);
  return handleMyIdol(req, res);
}
