// Сторож пульта. Смотрит на непринятые пачки и печатает строку, как только появляется новая.
// Каждая напечатанная строка будит Claude в живой сессии — это и есть «кнопка сразу запускает работу».
// Молчит, пока нажатий нет: пустой вывод не тревожит сессию.
// запуск: node --env-file=.env scripts/ops-watch.mjs
import { createClient } from "@supabase/supabase-js";

const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const seen = new Set();
let firstPass = true;
let failStreak = 0;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

while (true) {
  try {
    const { data, error } = await db.from("ops_batches")
      .select("id,created_at,items").is("picked_at", null).order("created_at");
    if (error) throw new Error(error.message);

    for (const b of data || []) {
      if (seen.has(b.id)) continue;
      seen.add(b.id);
      const titles = (b.items || []).map((i) => i.title).join("; ");
      // На первом проходе тоже сообщаем: значит, пачка висела ещё до запуска сторожа.
      const tag = firstPass ? "ПАЧКА ЖДАЛА" : "НАЖАТА КНОПКА «ПРИМЕНИТЬ ВСЁ»";
      console.log(`${tag}: правок ${(b.items || []).length} — ${titles}. Забери командой: node --env-file=.env scripts/ops.mjs`);
    }
    firstPass = false;
    failStreak = 0;
  } catch (e) {
    // Об обрыве сети сообщаем только когда он стал стабильным, чтобы не сыпать шумом.
    failStreak++;
    if (failStreak === 5) console.log("СТОРОЖ ПУЛЬТА: связь с базой не восстанавливается, " + e.message);
  }
  await sleep(15000);
}
