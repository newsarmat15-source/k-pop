// Сторож пульта на push из базы. Никакого опроса по таймеру: Postgres сам шлёт
// событие через логическую репликацию, задержка — доли секунды.
// Каждая напечатанная строка будит Claude в живой сессии.
//
// Реагируем на два сигнала:
//   ops_batches INSERT            — нажата «Применить всё», пачка готова целиком
//   ops_items   UPDATE → saved    — правка просто сохранена, кнопку жать необязательно
//
// запуск: node --env-file=.env scripts/ops-watch.mjs
import { createClient } from "@supabase/supabase-js";

const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
  realtime: { params: { eventsPerSecond: 20 } },
});

// Догоняем то, что накопилось, пока сессии не было.
const { data: pending } = await db.from("ops_batches").select("id,items").is("picked_at", null);
for (const b of pending || []) {
  console.log(`ПАЧКА ЖДАЛА: правок ${(b.items || []).length} — ${(b.items || []).map((i) => i.title).join("; ")}`);
}

// Правку, сохранённую и тут же применённую, иначе объявим дважды.
const announced = new Map();
const fresh = (key) => {
  const now = Date.now();
  for (const [k, t] of announced) if (now - t > 90000) announced.delete(k);
  if (announced.has(key)) return false;
  announced.set(key, now);
  return true;
};

db.channel("ops-pult")
  .on("postgres_changes", { event: "INSERT", schema: "public", table: "ops_batches" }, (p) => {
    const items = p.new?.items || [];
    if (!fresh("batch:" + p.new?.id)) return;
    console.log(`ПРИМЕНЕНО В ПУЛЬТЕ: правок ${items.length} — ${items.map((i) => i.title).join("; ")}`);
  })
  .on("postgres_changes", { event: "UPDATE", schema: "public", table: "ops_items" }, (p) => {
    const n = p.new || {}, o = p.old || {};
    // Только момент сохранения правки Сарматом. Свои же записи отчётов игнорируем.
    if (n.status !== "saved" || o.status === "saved") return;
    if (!n.draft || n.draft === o.draft) return;
    if (!fresh("item:" + n.id + ":" + n.draft.length)) return;
    console.log(`СОХРАНЕНА ПРАВКА: «${n.title}» — ${String(n.draft).slice(0, 160)}`);
  })
  .subscribe((status, err) => {
    // Молча падать нельзя: если канал умер, пульт выглядит рабочим, а сигналов нет.
    if (status === "SUBSCRIBED") console.log("СТОРОЖ ПУЛЬТА: подписан на события базы, опрос по таймеру больше не нужен");
    if (status === "CHANNEL_ERROR") console.log("СТОРОЖ ПУЛЬТА: ошибка канала — " + (err?.message || "без деталей"));
    if (status === "TIMED_OUT") console.log("СТОРОЖ ПУЛЬТА: подписка отвалилась по таймауту");
    if (status === "CLOSED") console.log("СТОРОЖ ПУЛЬТА: канал закрыт");
  });

process.stdin.resume();
