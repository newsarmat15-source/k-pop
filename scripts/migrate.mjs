// Прогоняет supabase/migrations/*.sql по порядку, пропуская уже применённые (учёт в _migrations).
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dbClient } from "../lib/db.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIR = path.join(__dirname, "..", "supabase", "migrations");

const client = dbClient();
await client.connect();
await client.query(`create table if not exists _migrations (name text primary key, applied_at timestamptz default now())`);

const { rows } = await client.query(`select name from _migrations`);
const applied = new Set(rows.map((r) => r.name));

const files = fs.readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();
for (const f of files) {
  if (applied.has(f)) { console.log("skip (already applied):", f); continue; }
  const sql = fs.readFileSync(path.join(DIR, f), "utf8");
  console.log("applying:", f);
  await client.query(sql);
  await client.query(`insert into _migrations(name) values ($1)`, [f]);
  console.log("OK:", f);
}
await client.end();
console.log("done.");
