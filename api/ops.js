// Операционный пульт: /ops. Один роут на все действия (лимит Vercel Hobby — 12 функций).
// Доступ — по ключу OPS_KEY (заголовок x-ops-key или ?k=). Это личный пульт основателя,
// пользовательской сессии здесь нет и быть не должно.
import { supabase } from "../lib/supabase.js";

const KINDS = ["roadmap", "today", "fix", "agent"];
const STATUSES = ["idle", "saved", "queued", "done", "dropped"];

function authed(req) {
  const key = process.env.OPS_KEY;
  if (!key) return false; // fail-closed: без секрета пульт закрыт целиком
  const got = req.headers["x-ops-key"] || req.query.k;
  return typeof got === "string" && got === key;
}

const PROGRESS = ["none", "doing", "done", "partial", "dropped"];
const FIELDS = ["kind", "title", "body", "draft", "status", "priority", "owner", "due", "metric", "sort", "progress", "report"];

export default async function handler(req, res) {
  if (!authed(req)) return res.status(401).json({ error: "Нет доступа" });

  const action = req.query.action || (req.method === "GET" ? "list" : "");
  const db = supabase();

  try {
    if (action === "list") {
      const { data, error } = await db.from("ops_items").select("*").order("kind").order("sort");
      if (error) throw error;
      const { data: batch } = await db.from("ops_batches")
        .select("id,created_at,picked_at").is("picked_at", null)
        .order("created_at", { ascending: false }).limit(1).maybeSingle();
      return res.status(200).json({ ok: true, items: data || [], pendingBatch: batch || null, now: new Date().toISOString() });
    }

    if (req.method !== "POST") return res.status(405).json({ error: "Только POST" });
    const b = req.body || {};

    // Сохранить корректировку по одному пункту. Пустая правка снимает статус обратно в idle,
    // чтобы «Применить всё» не тащило в работу пустышки.
    if (action === "save") {
      if (!b.id) return res.status(400).json({ error: "Нужен id" });
      const draft = String(b.draft ?? "");
      const filled = draft.trim().length > 0;
      const patch = { draft, updated_at: new Date().toISOString() };
      // Уже отданное в работу не откатываем этой кнопкой — только текст обновляем.
      const { data: cur, error: curErr } = await db.from("ops_items").select("status").eq("id", b.id).maybeSingle();
      if (curErr) throw curErr;
      if (!cur) return res.status(404).json({ error: "Пункт не найден" });
      if (cur.status === "idle" || cur.status === "saved") {
        patch.status = filled ? "saved" : "idle";
        patch.saved_at = filled ? new Date().toISOString() : null;
      }
      const { data, error } = await db.from("ops_items").update(patch).eq("id", b.id).select().single();
      if (error) throw error;
      return res.status(200).json({ ok: true, item: data });
    }

    // Применить всё: снимок всех сохранённых правок → пачка, статусы → queued.
    if (action === "apply") {
      const { data: saved, error } = await db.from("ops_items")
        .select("*").eq("status", "saved").order("kind").order("sort");
      if (error) throw error;
      if (!saved || !saved.length) return res.status(200).json({ ok: true, applied: 0, batch: null });

      const snapshot = saved.map((i) => ({ id: i.id, kind: i.kind, title: i.title, draft: i.draft, priority: i.priority }));
      const { data: batch, error: bErr } = await db.from("ops_batches")
        .insert({ note: String(b.note || ""), items: snapshot }).select().single();
      if (bErr) throw bErr;

      const now = new Date().toISOString();
      const { error: uErr } = await db.from("ops_items")
        .update({ status: "queued", applied_at: now, updated_at: now })
        .in("id", saved.map((i) => i.id));
      if (uErr) throw uErr;

      return res.status(200).json({ ok: true, applied: saved.length, batch });
    }

    // Создать / изменить пункт. Пользуется и UI («новый пункт»), и Claude при обновлении карты.
    if (action === "item") {
      const patch = {};
      for (const f of FIELDS) if (b[f] !== undefined) patch[f] = b[f];
      if (patch.kind && !KINDS.includes(patch.kind)) return res.status(400).json({ error: "Неизвестный kind" });
      if (patch.status && !STATUSES.includes(patch.status)) return res.status(400).json({ error: "Неизвестный status" });
      if (patch.progress && !PROGRESS.includes(patch.progress)) return res.status(400).json({ error: "Неизвестный progress" });
      patch.updated_at = new Date().toISOString();
      if (patch.report !== undefined) patch.report_at = new Date().toISOString();

      if (b.id) {
        const { data, error } = await db.from("ops_items").update(patch).eq("id", b.id).select().single();
        if (error) throw error;
        return res.status(200).json({ ok: true, item: data });
      }
      if (!patch.kind || !patch.title) return res.status(400).json({ error: "Нужны kind и title" });
      const { data, error } = await db.from("ops_items").insert(patch).select().single();
      if (error) throw error;
      return res.status(200).json({ ok: true, item: data });
    }

    if (action === "status") {
      if (!b.id || !STATUSES.includes(b.status)) return res.status(400).json({ error: "Нужны id и корректный status" });
      const now = new Date().toISOString();
      const patch = { status: b.status, updated_at: now };
      if (b.status === "done") patch.done_at = now;
      const { data, error } = await db.from("ops_items").update(patch).eq("id", b.id).select().single();
      if (error) throw error;
      return res.status(200).json({ ok: true, item: data });
    }

    // Исполнение пункта. Обычно ставит Claude вместе с отчётом; кнопкой ✓ в пульте
    // Сармат закрывает то, что решил или сделал сам.
    if (action === "progress") {
      if (!b.id || !PROGRESS.includes(b.progress)) return res.status(400).json({ error: "Нужны id и корректный progress" });
      const now = new Date().toISOString();
      const patch = { progress: b.progress, updated_at: now };
      if (b.report !== undefined) { patch.report = String(b.report); patch.report_at = now; }
      if (b.progress === "done" || b.progress === "partial") patch.done_at = now;
      const { data, error } = await db.from("ops_items").update(patch).eq("id", b.id).select().single();
      if (error) throw error;
      return res.status(200).json({ ok: true, item: data });
    }

    if (action === "delete") {
      if (!b.id) return res.status(400).json({ error: "Нужен id" });
      const { error } = await db.from("ops_items").delete().eq("id", b.id);
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }

    // Claude отмечает, что пачку забрал в работу.
    if (action === "pick") {
      if (!b.batchId) return res.status(400).json({ error: "Нужен batchId" });
      const { data, error } = await db.from("ops_batches")
        .update({ picked_at: new Date().toISOString() }).eq("id", b.batchId).select().single();
      if (error) throw error;
      return res.status(200).json({ ok: true, batch: data });
    }

    return res.status(400).json({ error: "Неизвестный action" });
  } catch (e) {
    return res.status(500).json({ error: e.message || String(e) });
  }
}
