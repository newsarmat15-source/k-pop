// StageOne — забор готового видео. Прямой fetch на fal queue.
// Общий для видео (fal-ai/kling-video) и липсинка (fal-ai/kling-video/lipsync) — передаётся ?app=.
import { fetchWithRetry } from "../lib/fal-fetch.js";

export default async function handler(req, res) {
  const KEY = process.env.FAL_KEY;
  if (!KEY) return res.status(500).json({ error: "FAL_KEY не задан" });
  const id = req.query.id;
  const app = req.query.app || "fal-ai/kling-video";
  if (!id) return res.status(400).json({ error: "Нужен ?id=" });
  try {
    const url = `https://queue.fal.run/${app}/requests/${id}`;
    const r = await fetchWithRetry(url, { headers: { Authorization: `Key ${KEY}` } });
    const txt = await r.text();
    let data; try { data = JSON.parse(txt); } catch { data = { raw: txt }; }
    if (!r.ok) return res.status(200).json({ ok:false, error:`fal ${r.status}`, detail:data });
    const v = data?.video;
    const videoUrl = (typeof v === "string") ? v : (v?.url || null);
    if (!videoUrl) return res.status(200).json({ ok:false, error:"Видео пустое", raw:data });
    return res.status(200).json({ ok:true, videoUrl });
  } catch (e) {
    return res.status(200).json({ ok:false, error:String(e?.message||e) });
  }
}
