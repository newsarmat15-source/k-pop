import { supabase } from "../lib/supabase.js";

const db = supabase();
const { data, error, count } = await db.from("idols").select("*", { count: "exact" });
if (error) {
  console.error("FAIL:", error.message);
  process.exit(1);
}
console.log(`OK — connected. Rows in "idols": ${count}`);
