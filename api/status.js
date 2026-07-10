// StageOne — статус через прямой fetch на fal queue.
// Общий для видео (fal-ai/kling-video) и липсинка (fal-ai/kling-video/lipsync) — передаётся ?app=.
import { fetchWithRetry } from "../lib/fal-fetch.js";

export default async function handler(req, res) {
  const KEY = process.env.FAL_KEY;
  if (!KEY) return res.status(500).json({ error: "FAL_KEY не задан" });
  const id = req.query.id;
  const app = req.query.app || "fal-ai/kling-video";
  if (!id) return res.status(400).json({ error: "Нужен ?id=" });
  try {
    const url = `https://queue.fal.run/${app}/requests/${id}/status`;
    const r = await fetchWithRetry(url, { headers: { Authorization: `Key ${KEY}` } });
    const txt = await r.text();
    let data; try { data = JSON.parse(txt); } catch { data = { raw: txt }; }
    if (!r.ok) return res.status(200).json({ ok:true, status:"ERROR", error:`fal ${r.status}`, detail:data });
    return res.status(200).json({ ok:true, status:data.status, queuePosition:data.queue_position ?? null });
  } catch (e) {
    return res.status(200).json({ ok:true, status:"ERROR", error:String(e?.message||e) });
  }
}
