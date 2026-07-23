// Чтение пульта из локальной сессии Claude — чтобы не гонять правки через копипаст.
//   node scripts/ops.mjs            — что отдано в работу (queued) + непринятая пачка
//   node scripts/ops.mjs all        — все пункты по вкладкам
//   node scripts/ops.mjs pick <id>  — отметить пачку принятой
//   node scripts/ops.mjs done <id>  — закрыть пункт
// запуск: node --env-file=.env scripts/ops.mjs [all|pick <id>|done <id>]
import { createClient } from "@supabase/supabase-js";

const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const [cmd = "pending", arg] = process.argv.slice(2);

const K = { today: "СЕГОДНЯ", roadmap: "КАРТА", fix: "ПРАВКИ", agent: "АГЕНТЫ" };

if (cmd === "pick") {
  const { error } = await db.from("ops_batches").update({ picked_at: new Date().toISOString() }).eq("id", arg);
  console.log(error ? error.message : "пачка принята");
} else if (cmd === "done") {
  const { error } = await db.from("ops_items").update({ status: "done", done_at: new Date().toISOString() }).eq("id", arg);
  console.log(error ? error.message : "закрыто");
} else {
  const { data: batches } = await db.from("ops_batches").select("*").is("picked_at", null).order("created_at");
  const { data: all } = await db.from("ops_items").select("*").order("kind").order("sort");
  const show = cmd === "all" ? all : all.filter((i) => i.status === "queued" || i.status === "saved");

  if (batches?.length) console.log(`\n=== НЕПРИНЯТЫХ ПАЧЕК: ${batches.length} ===\n` + batches.map((b) => `  ${b.id}  ${b.created_at}  правок: ${b.items.length}`).join("\n"));
  let kind = null;
  for (const i of show) {
    if (i.kind !== kind) { kind = i.kind; console.log(`\n=== ${K[kind] || kind} ===`); }
    console.log(`\n[${i.status}] ${i.priority ? i.priority + " " : ""}${i.title}   (${i.id})`);
    if (i.body) console.log("  · " + i.body.replace(/\n/g, "\n  "));
    if (i.draft) console.log("  ПРАВКА СAРМАТА: " + i.draft.replace(/\n/g, "\n  "));
  }
  if (!show.length) console.log("\nНичего не отдано в работу.");
  console.log("");
}
