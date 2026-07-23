// Пересчитывает транскрипцию во всех уже разобранных песнях по движку произношения.
// Меняет только r/rr/p у слов и rr в словаре куплета — тайминги, переводы и
// смысловые блоки не трогает.
//   node --env-file=.env scripts/resync-transcription.mjs --dry   (показать, не писать)
//   node --env-file=.env scripts/resync-transcription.mjs
import { createClient } from "@supabase/supabase-js";
import { transcribeLatin, transcribeCyrillic, pronounce } from "../lib/ko-g2p.js";

const dry = process.argv.includes("--dry");
const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const hangul = (s) => /[가-힣]/.test(String(s || ""));
let changed = 0, kept = 0;
const samples = [];

function fixWord(w) {
  const k = w.k || w.kr || "";
  if (!hangul(k)) return w;
  const r = transcribeLatin(k), rr = transcribeCyrillic(k), p = pronounce(k);
  if (w.r !== r || w.rr !== rr) {
    if (samples.length < 12 && w.r !== r) samples.push(`${k}: ${w.r || "—"} → ${r}   |   ${w.rr || "—"} → ${rr}`);
    changed++;
  } else kept++;
  return { ...w, ...(w.k !== undefined ? { r, rr } : { rom: r, rr }), p };
}

const { data: songs, error } = await db.from("songs").select("id,title,artist,data");
if (error) { console.error(error.message); process.exit(1); }

for (const s of songs) {
  const d = s.data;
  for (const v of d.verses || []) {
    for (const l of v.lines || []) l.w = (l.w || []).map(fixWord);
    v.vocab = (v.vocab || []).map(fixWord);
  }
  if (!dry) {
    const { error: e } = await db.from("songs").update({ data: d }).eq("id", s.id);
    if (e) { console.error(s.id, e.message); continue; }
  }
  console.log(`${dry ? "[проба] " : ""}${s.artist} — ${s.title}`);
}

console.log(`\nисправлено слов: ${changed}, уже верных: ${kept}`);
if (samples.length) console.log("\nпримеры правок:\n" + samples.map((x) => "  " + x).join("\n"));
if (dry) console.log("\nэто была проба, в базу ничего не записано");
