// Скачивает готовые клипы Сармата (по его email из auth.users) с продакшена в clips/sarmat/.
// Запуск: node --env-file=.env scripts/pull-clips.mjs [лимит=5]
import pg from "pg";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

const SARMAT_EMAIL = "newsarmat1.5@gmail.com";
const limit = Number(process.argv[2]) || 5;
const OUT_DIR = path.join(process.cwd(), "clips", "sarmat");

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

const { rows } = await client.query(
  `select c.id, c.video_url, c.created_at, i.name as idol_name
   from clips c
   join idols i on i.id = c.idol_id
   join profiles p on p.id = i.owner_id
   join auth.users u on u.id = p.id
   where u.email = $1 and c.status = 'done' and c.video_url is not null
   order by c.created_at desc
   limit $2`,
  [SARMAT_EMAIL, limit]
);
await client.end();

if (!rows.length) {
  console.log("Готовых клипов не найдено.");
  process.exit(0);
}

await mkdir(OUT_DIR, { recursive: true });

for (const r of rows) {
  const stamp = new Date(r.created_at).toISOString().replace(/[:.]/g, "-");
  const fname = `${stamp}_${r.idol_name}_${r.id.slice(0, 8)}.mp4`;
  const dest = path.join(OUT_DIR, fname);
  console.log(`Скачиваю ${r.idol_name} (${r.created_at}) -> ${fname}`);
  const resp = await fetch(r.video_url);
  if (!resp.ok) { console.error(`  не удалось скачать: HTTP ${resp.status}`); continue; }
  const buf = Buffer.from(await resp.arrayBuffer());
  await writeFile(dest, buf);
  console.log(`  готово, ${(buf.length / 1e6).toFixed(1)} MB`);
}
