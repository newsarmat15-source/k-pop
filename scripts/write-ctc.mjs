// Состыковывает CTC-выход (модель могла разбить слово с пробелами на токены) с
// нашими словами песни и пишет .t каждому слову в БД. wordAligned=true, offset=0.
// node scripts/write-ctc.mjs <songId> <ctc.json> [dry|write]
import { readFileSync } from "fs";
import pg from "pg";

const DBURL = (readFileSync(".env", "utf8").match(/DATABASE_URL=(.+)/) || [])[1].trim().replace(/^["']|["']$/g, "");
const [songId, ctcFile, mode = "dry"] = process.argv.slice(2);
const out = JSON.parse(readFileSync(ctcFile, "utf8")).words; // [{kr,t,end}]

const clean = (s) => (s || "").toLowerCase().replace(/[^가-힣a-z0-9]/g, "");

// Каждому нашему слову — начало (t) и конец (te). Если слово с пробелами разбилось
// на N токенов, склеиваем: начало = t первого, конец = end последнего.
function mapTimes(inp) {
  const times = new Array(inp.length).fill(null);
  const ends = new Array(inp.length).fill(null);
  let j = 0;
  for (let i = 0; i < inp.length; i++) {
    const target = clean(inp[i]);
    if (!target) { times[i] = j < out.length ? out[j].t : (times[i - 1] ?? 0); ends[i] = j < out.length ? out[j].end : times[i]; continue; }
    let acc = "", start = null, end = null;
    while (j < out.length) {
      if (start === null) start = out[j].t;
      end = out[j].end; acc += clean(out[j].kr); j++;
      if (acc.length >= target.length) break;
    }
    times[i] = start != null ? start : (times[i - 1] ?? 0);
    ends[i] = end != null ? end : times[i];
  }
  return { times, ends };
}

const db = new pg.Client({ connectionString: DBURL, ssl: { rejectUnauthorized: false } });
await db.connect();
const { rows } = await db.query("select id,title,data from songs where id=$1", [songId]);
if (!rows.length) { console.log("нет песни", songId); process.exit(1); }
const song = rows[0].data;
const refs = [];
for (const v of song.verses || []) for (const ln of v.lines || []) for (const w of ln.w || []) refs.push(w);
const { times, ends } = mapTimes(refs.map((w) => w.k));

// контроль монотонности
let back = 0;
for (let i = 1; i < times.length; i++) if (times[i] < times[i - 1] - 0.01) back++;
console.log(`${rows[0].title}: наших слов ${refs.length}, CTC-токенов ${out.length}, обратных скачков ${back}`);
console.log(`t[0]=${times[0]}  t[конец]=${times[times.length - 1]}`);
console.log("контроль (каждое 20-е): idx t слово");
for (let i = 0; i < refs.length; i += 20) console.log(`  ${i}\t${times[i]}\t${refs[i].k}`);

if (mode === "write") {
  refs.forEach((w, i) => { if (times[i] != null) w.t = times[i]; if (ends[i] != null) w.te = ends[i]; });
  song.videoOffset = 0;
  song.wordAligned = true;
  await db.query("update songs set data=$1, aligned=true, video_offset=0 where id=$2", [song, songId]);
  console.log("✓ записано пословно (CTC) в БД");
}
await db.end();
