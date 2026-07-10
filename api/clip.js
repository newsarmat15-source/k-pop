// Объединено: clip-create + clip-list + clip-update — было 3 функции, схлопнуто в одну
// ради лимита в 12 функций на Vercel Hobby (см. PROGRESS.md).
// GET ?idolId= = список. POST без body.clipId = создать. POST с body.clipId = обновить статус.
import { supabase } from "../lib/supabase.js";
import { readUserId } from "../lib/session.js";

async function handleList(req, res) {
  const idolId = req.query.idolId;
  if (!idolId) return res.status(400).json({ error: "Нужен ?idolId=" });

  const db = supabase();
  const { data: clips, error } = await db.from("clips")
    .select("id,status,video_url,duration_sec,created_at")
    .eq("idol_id", idolId).order("created_at", { ascending: false }).limit(12);
  if (error) return res.status(500).json({ error: error.message });

  return res.status(200).json({ ok: true, clips: clips || [] });
}

// Открывает строку клипа со статусом pending ДО начала генерации — оркестрация всё ещё идёт
// в браузере (не в serverless, там лимит по времени), но теперь есть честная запись в базе,
// а не только то, что видно в текущей вкладке.
async function handleCreate(req, res) {
  const uid = readUserId(req);
  if (!uid) return res.status(401).json({ error: "Нужно войти в аккаунт" });

  const db = supabase();
  const { data: idol } = await db.from("idols").select("id,owner_id").eq("owner_id", uid).maybeSingle();
  if (!idol) return res.status(400).json({ error: "У тебя ещё нет айдола" });

  const { data: clip, error } = await db.from("clips").insert({ idol_id: idol.id, status: "processing" }).select().single();
  if (error) return res.status(500).json({ error: error.message });

  return res.status(200).json({ ok: true, clipId: clip.id });
}

async function handleUpdate(req, res) {
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

export default async function handler(req, res) {
  if (req.method === "GET") return handleList(req, res);
  if (req.method !== "POST") return res.status(405).json({ error: "Use GET or POST" });
  if (req.body && req.body.clipId) return handleUpdate(req, res);
  return handleCreate(req, res);
}
