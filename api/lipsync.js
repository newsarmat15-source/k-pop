// StageOne — склейка готового видео (Kling, без звука) с готовой песней (ElevenLabs) через Kling LipSync.
import { fetchWithRetry } from "../lib/fal-fetch.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST" });
  const KEY = process.env.FAL_KEY;
  if (!KEY) return res.status(500).json({ error: "FAL_KEY не задан" });

  try {
    const { videoUrl, songUrl } = req.body || {};
    if (!videoUrl || !songUrl) return res.status(400).json({ error: "Нужны videoUrl и songUrl" });

    const r = await fetchWithRetry("https://queue.fal.run/fal-ai/kling-video/lipsync/audio-to-video", {
      method: "POST",
      headers: { Authorization: `Key ${KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ video_url: videoUrl, audio_url: songUrl }),
    });
    const txt = await r.text();
    let data; try { data = JSON.parse(txt); } catch { data = { raw: txt }; }
    if (!r.ok) return res.status(200).json({ ok: false, error: `fal ${r.status}`, detail: data });

    const requestId = data.request_id || data.requestId;
    if (!requestId) return res.status(200).json({ ok: false, error: "Нет request_id", raw: data });
    return res.status(200).json({ ok: true, requestId });
  } catch (e) {
    return res.status(500).json({ error: String(e?.message || e) });
  }
}
