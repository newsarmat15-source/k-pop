// Разовая проверка экстрактора фактов на РЕАЛЬНОЙ переписке из базы.
//   node --env-file=.env scratch_mem_test.mjs
import { supabase } from "./lib/supabase.js";
import { extractMemory } from "./lib/reply.js";

const db = supabase();
const { data: idols } = await db.from("idols").select("id,name").order("created_at", { ascending: false });
for (const idol of idols || []) {
  const { data: msgs } = await db
    .from("chat_messages").select("sender,content,created_at")
    .eq("idol_id", idol.id).order("created_at", { ascending: true });
  if (!msgs?.length) continue;
  console.log(`\n=== ${idol.name} (${idol.id.slice(0, 8)}), сообщений ${msgs.length} ===`);
  // Прогоняем окном по 8 сообщений — так же, как это делает живой чат на каждом ответе.
  for (let end = 1; end <= msgs.length; end++) {
    await extractMemory(db, idol, msgs.slice(0, end));
  }
  const { data: facts } = await db
    .from("idol_facts").select("kind,slot,value,hits")
    .eq("idol_id", idol.id).order("kind").order("hits", { ascending: false });
  for (const f of facts || []) console.log(`  [${f.kind}] ${f.slot} = ${f.value}  (x${f.hits})`);
  if (!facts?.length) console.log("  ничего не извлечено");
}
