// Сторож пульта. Гибрид: push из базы для мгновенной реакции + тихая догоняющая
// проверка как пол надёжности. Каждая напечатанная строка будит Claude в сессии.
//
// Почему гибрид, а не чистый realtime: WebSocket Supabase на этой машине
// периодически рвётся (socket 1006) и переподключается. Сам по себе разрыв
// безвреден, но в окне между «упал» и «поднялся» INSERT пачки мог бы
// проскочить мимо подписки. Догоняющий запрос раз в 20 секунд ловит всё, что
// подписка пропустила, и объявляет один раз — realtime и опрос делят общий
// дедуп, поэтому двойных сигналов нет.
//
// Служебные статусы канала на stdout НЕ печатаем (каждая строка = уведомление
// в сессию, а флап канала — это шум). О недоступности сообщаем только если
// связь не восстанавливается дольше минуты, потому что тогда молчание опасно.
//
// запуск: node --env-file=.env scripts/ops-watch.mjs
import { createClient } from "@supabase/supabase-js";

const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
  realtime: { params: { eventsPerSecond: 20 } },
});

// Общий дедуп для обоих источников: один сигнал не объявляем дважды.
const announced = new Map();
const fresh = (key) => {
  const now = Date.now();
  for (const [k, t] of announced) if (now - t > 180000) announced.delete(k);
  if (announced.has(key)) return false;
  announced.set(key, now);
  return true;
};

function announceBatch(b, tag) {
  if (!fresh("batch:" + b.id)) return;
  const items = b.items || [];
  console.log(`${tag}: правок ${items.length} — ${items.map((i) => i.title).join("; ")}. Забери: node --env-file=.env scripts/ops.mjs`);
}

// ── Пол надёжности: догоняющая проверка непринятых пачек ──────────────────────
// Работает независимо от состояния сокета. На старте объявляет всё, что ждало.
let firstSweep = true;
let sweepFails = 0;
async function sweep() {
  try {
    const { data, error } = await db.from("ops_batches").select("id,items").is("picked_at", null).order("created_at");
    if (error) throw new Error(error.message);
    for (const b of data || []) announceBatch(b, firstSweep ? "ПАЧКА ЖДАЛА" : "ПРИМЕНЕНО В ПУЛЬТЕ");
    firstSweep = false;
    sweepFails = 0;
  } catch (e) {
    // О сбое базы говорим только когда он стал устойчивым — единичный не шумим.
    if (++sweepFails === 3) console.log("СТОРОЖ ПУЛЬТА: база не отвечает уже минуту — " + e.message);
  }
}
await sweep();
setInterval(sweep, 20000);

// ── Мгновенный слой: push из базы ────────────────────────────────────────────
db.channel("ops-pult")
  .on("postgres_changes", { event: "INSERT", schema: "public", table: "ops_batches" }, (p) => {
    if (p.new) announceBatch(p.new, "ПРИМЕНЕНО В ПУЛЬТЕ");
  })
  .on("postgres_changes", { event: "UPDATE", schema: "public", table: "ops_items" }, (p) => {
    const n = p.new || {}, o = p.old || {};
    // Только момент сохранения правки Сарматом. Свои же записи отчётов игнорируем.
    if (n.status !== "saved" || o.status === "saved") return;
    if (!n.draft || n.draft === o.draft) return;
    if (!fresh("item:" + n.id + ":" + n.draft.length)) return;
    console.log(`СОХРАНЕНА ПРАВКА: «${n.title}» — ${String(n.draft).slice(0, 160)}`);
  })
  .subscribe();

// Служебные статусы канала не печатаем, но следим за устойчивой недоступностью.
// Если realtime не в строю дольше минуты — сообщаем один раз; догоняющий опрос
// при этом всё равно ловит пачки, продукт не слепнет.
let downSince = 0, downReported = false;
setInterval(() => {
  const st = db.realtime.connectionState?.() || (db.realtime.isConnected?.() ? "open" : "closed");
  if (st === "open") { downSince = 0; downReported = false; return; }
  if (!downSince) downSince = Date.now();
  else if (!downReported && Date.now() - downSince > 60000) {
    console.log("СТОРОЖ ПУЛЬТА: realtime не поднимается больше минуты, работаю на догоняющем опросе раз в 20 секунд");
    downReported = true;
  }
}, 15000);

process.stdin.resume();
