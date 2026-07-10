import { supabase } from "../lib/supabase.js";
import { readUserId } from "../lib/session.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST" });
  const uid = readUserId(req);
  if (!uid) return res.status(401).json({ error: "Нужно войти в аккаунт" });

  const { clipId, status, videoUrl, durationSec, costUsd, error: errMsg } = req.body || {};
  if (!clipId || !status) return res.status(400).json({ error: "Нужны clipId и status" });
  if (!["done", "failed"].includes(status)) return res.status(400).json({ error: "status должен быть done или failed" });

  const db = supabase();
  // клип принадлежит айдолу текущего юзера — проверяем через join, чтобы чужой не мог дописать себе видео
  const { data: clip } = await db.from("clips").select("id,idol_id,idols(owner_id)").eq("id", clipId).maybeSingle();
  if (!clip || clip.idols?.owner_id !== uid) return res.status(404).json({ error: "Клип не найден" });

  const patch = { status };
  if (videoUrl) patch.video_url = videoUrl;
  if (durationSec) patch.duration_sec = durationSec;
  if (costUsd) patch.cost_usd = costUsd;
  if (errMsg) patch.error = errMsg;

  const { error } = await db.from("clips").update(patch).eq("id", clipId);
  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ ok: true });
}
