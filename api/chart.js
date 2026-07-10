import { supabase } from "../lib/supabase.js";

export default async function handler(req, res) {
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
