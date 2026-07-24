// Разовая проверка: пересобрать песню НОВЫМ кодом api/song.js и показать, что вышло.
//   node --env-file=.env scratch_rebuild_song.mjs "BABYMONSTER" "PSYCHO" [--keep]
// Без --keep старая запись из каталога удаляется, иначе вернётся кэш и проверять нечего.
import handler from "./api/song.js";
import { createSessionCookie } from "./lib/session.js";
import { supabase } from "./lib/supabase.js";

const [artist, track] = process.argv.slice(2);
const keep = process.argv.includes("--keep");
const db = supabase();

// Владелец записи — любой существующий пользователь: сборка требует сессию.
const { data: users } = await db.from("profiles").select("id").limit(1);
const uid = users?.[0]?.id;
if (!uid) { console.log("нет ни одного пользователя в базе"); process.exit(1); }

if (!keep) {
  const { data: old } = await db.from("songs").select("id,title").ilike("title", `%${track}%`);
  for (const o of old || []) { await db.from("songs").delete().eq("id", o.id); console.log("удалена старая запись:", o.id, o.title); }
}

const req = { query: { action: "build", artist, track }, method: "GET", headers: { cookie: createSessionCookie(uid) } };
let out = null;
const res = { status(c) { this._c = c; return this; }, json(b) { out = { code: this._c, body: b }; return this; } };

const t0 = Date.now();
await handler(req, res);
console.log(`сборка заняла ${((Date.now() - t0) / 1000).toFixed(1)}с, код ${out.code}`);
if (!out.body?.song) { console.log(JSON.stringify(out.body).slice(0, 600)); process.exit(1); }

const s = out.body.song;
const lines = s.verses.flatMap((v) => v.lines);
const ko = lines.filter((l) => !l.x);
const last = Math.max(...s.verses.map((v) => v.end));
console.log(`\n${s.artist} — ${s.title}`);
console.log(`клип: youtube.com/watch?v=${s.ytId} | длительность записи ${s.duration}с`);
console.log(`куплетов ${s.verses.length}, строк ${lines.length} (корейских ${ko.length}, прочих ${lines.length - ko.length})`);
console.log(`разбор кончается на ${last.toFixed(1)}с из ${s.duration}с = ${Math.round((last / s.duration) * 100)}% песни`);
console.log(`куплетов со смыслом целиком (lit/why): ${s.verses.filter((v) => v.lit || v.why).length}`);

console.log(`\nПЕРВЫЕ ДВА КУПЛЕТА — сверяем, что смысл стоит НА СВОИХ строках:`);
for (const v of s.verses.slice(0, 2)) {
  console.log(`\n─ куплет: ${(v.tr?.ru || "").slice(0, 140)}`);
  for (const l of v.lines) {
    const txt = l.w.map((w) => w.k).join(" ");
    console.log(`   ${String(l.t).padStart(6)} ${l.x ? "·" : "★"} ${txt}`);
    if (l.s?.ru) console.log(`          → ${l.s.ru}`);
    if (l.c?.ru) console.log(`          🔗 ${l.c.ru.slice(0, 120)}`);
  }
  if (v.why?.ru) console.log(`   почему: ${v.why.ru.slice(0, 200)}`);
}
console.log(`\nВСЕ СТРОКИ (метка ★ = разбирается, · = поётся не по-корейски):`);
for (const l of lines) console.log(`  ${String(l.t).padStart(6)} ${l.x ? "·" : "★"} ${l.w.map((w) => w.k).join(" ")}`);
