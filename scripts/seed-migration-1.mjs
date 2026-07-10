import { dbClient } from "../lib/db.js";

const c = dbClient();
await c.connect();
await c.query("create table if not exists _migrations (name text primary key, applied_at timestamptz default now())");
await c.query("insert into _migrations(name) values ('0001_init.sql') on conflict do nothing");
console.log("connected ok, seeded 0001");
await c.end();
