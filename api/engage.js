// Объединено: vote + follow + chart + train — было 4 функции, схлопнуто в одну
// ради лимита в 12 функций на Vercel Hobby (см. PROGRESS.md).
// GET (или ?action=chart) = чарт. POST ?action=vote|follow|train.
import { supabase } from "../lib/supabase.js";
import { readUserId } from "../lib/session.js";

function ymd(d) { return new Date(d).toISOString().slice(0, 10); }

async function handleChart(req, res) {
  const db = supabase();
  const { data: idols, error: idolErr } = await db
    .from("idols")
    .select("id,name,concept,portrait_url,gender,league,owner_id,created_at,profiles!owner_id(username)");
  if (idolErr) return res.status(500).json({ error: idolErr.message });

  const { data: votes, error: voteErr } = await db.from("votes").select("idol_id,created_at");
  if (voteErr) return res.status(500).json({ error: voteErr.message });

  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const counts = {};
  for (const idol of idols) counts[idol.id] = { total: 0, recent: 0 };
  for (const v of votes) {
    if (!counts[v.idol_id]) continue;
    counts[v.idol_id].total++;
    if (new Date(v.created_at).getTime() > weekAgo) counts[v.idol_id].recent++;
  }

  // growth% = недавние голоса относительно голосов ДО этой недели — "виральный" рост, не абсолютная величина
  const entries = idols.map((idol) => {
    const c = counts[idol.id] || { total: 0, recent: 0 };
    const older = c.total - c.recent;
    const growth = older > 0 ? Math.round((c.recent / older) * 100) : c.recent > 0 ? 100 : 0;
    return {
      idol: { id: idol.id, name: idol.name, concept: idol.concept, img: idol.portrait_url, gender: idol.gender, created_at: idol.created_at },
      owner: idol.profiles?.username || "продюсер",
      league: idol.league,
      votes: c.total,
      growth,
    };
  }).sort((a, b) => b.votes - a.votes);

  return res.status(200).json({ ok: true, entries });
}

async function handleVote(req, res) {
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

async function handleFollow(req, res) {
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

const REST_MS = 4 * 60 * 60 * 1000;
async function handleTrain(req, res) {
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

// Настоящий стрик учёбы: засчитывает "занимался сегодня" (урок / проверочная / чат).
// Идёт подряд, если занимался вчера; иначе сбрасывается на 1. Один зачёт в день.
async function handleStudy(req, res) {
  const uid = readUserId(req);
  if (!uid) return res.status(401).json({ error: "Нужно войти в аккаунт" });

  const db = supabase();
  const { data: idol, error: idolErr } = await db.from("idols").select("id").eq("owner_id", uid).limit(1).maybeSingle();
  if (idolErr) return res.status(500).json({ error: idolErr.message });
  if (!idol) return res.status(400).json({ error: "У тебя ещё нет айдола" });

  const { data: ts, error: tsErr } = await db.from("training_stats")
    .select("study_streak,best_streak,last_study_date").eq("idol_id", idol.id).single();
  if (tsErr) return res.status(500).json({ error: tsErr.message });

  const today = ymd(Date.now());
  if (ts.last_study_date === today) {
    return res.status(200).json({ ok: true, streak: ts.study_streak || 0, best: ts.best_streak || 0, already: true });
  }
  const yesterday = ymd(Date.now() - 86400000);
  const streak = ts.last_study_date === yesterday ? (ts.study_streak || 0) + 1 : 1;
  const best = Math.max(ts.best_streak || 0, streak);

  const { data: updated, error: updErr } = await db.from("training_stats")
    .update({ study_streak: streak, best_streak: best, last_study_date: today, updated_at: new Date().toISOString() })
    .eq("idol_id", idol.id).select("study_streak,best_streak,last_study_date").single();
  if (updErr) return res.status(500).json({ error: updErr.message });

  return res.status(200).json({ ok: true, streak: updated.study_streak, best: updated.best_streak });
}

export default async function handler(req, res) {
  const action = req.query.action;
  if (req.method === "GET" || action === "chart") return handleChart(req, res);
  if (req.method !== "POST") return res.status(405).json({ error: "Use GET or POST" });
  if (action === "vote") return handleVote(req, res);
  if (action === "follow") return handleFollow(req, res);
  if (action === "train") return handleTrain(req, res);
  if (action === "study") return handleStudy(req, res);
  return res.status(400).json({ error: "Неизвестный action" });
}
