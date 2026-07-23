#!/usr/bin/env node
/**
 * Реестр захватов зон. Единственный источник правды о том, кто что правит.
 *
 * Зачем: агенты и параллельные сессии пишут в одни файлы (public/app.js — 200 КБ
 * монолит). Договориться промптами нельзя: это разные процессы. Пересечение
 * задач должно вычисляться механически, а не выясняться после порчи файла.
 *
 * Команды:
 *   node scripts/claim.mjs claim  --who <имя> --task "<что делаю>" --paths "<файл[#якорь|:строки]>,..."
 *   node scripts/claim.mjs check  --paths "<...>"          # только проверка, без захвата
 *   node scripts/claim.mjs status [--json]
 *   node scripts/claim.mjs beat   --who <имя>              # продлить, чтобы не протух
 *   node scripts/claim.mjs release --who <имя>
 *
 * Код возврата claim/check: 0 — свободно, 1 — конфликт (в stdout список держателей).
 */
import fs from "fs";
import path from "path";

const ROOT = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const DIR = path.join(ROOT, ".claude");
const FILE = path.join(DIR, "claims.json");
const LOCKDIR = path.join(DIR, ".claims.lock");
// Захват без продления считается брошенным: агент упал или сессия закрыта.
const STALE_MIN = Number(process.env.CLAIM_STALE_MIN || 45);

// ---------- атомарность между процессами ----------
// mkdir атомарен на всех ФС, в отличие от «проверил-записал».
function withLock(fn) {
  const deadline = Date.now() + 5000;
  for (;;) {
    try { fs.mkdirSync(LOCKDIR); break; }
    catch {
      if (Date.now() > deadline) {
        // Замок протух — процесс, взявший его, умер.
        try {
          if (Date.now() - fs.statSync(LOCKDIR).mtimeMs > 30000) fs.rmSync(LOCKDIR, { recursive: true, force: true });
        } catch {}
        try { fs.mkdirSync(LOCKDIR); break; } catch { throw new Error("не удалось взять замок реестра"); }
      }
      const t = Date.now() + 40; while (Date.now() < t); // короткое ожидание без async
    }
  }
  try { return fn(); } finally { try { fs.rmSync(LOCKDIR, { recursive: true, force: true }); } catch {} }
}

function load() {
  try { return JSON.parse(fs.readFileSync(FILE, "utf8")); } catch { return { claims: [] }; }
}
function save(db) {
  fs.mkdirSync(DIR, { recursive: true });
  fs.writeFileSync(FILE + ".tmp", JSON.stringify(db, null, 2), "utf8");
  fs.renameSync(FILE + ".tmp", FILE);
}
function alive(c) {
  return c.status === "active" && (Date.now() - new Date(c.beat || c.created).getTime()) / 60000 < STALE_MIN;
}

// ---------- разбор зоны ----------
// "public/app.js"            — файл целиком
// "public/app.js#renderCabinet" — именованный участок (якорь)
// "public/app.js:800-950"    — диапазон строк
function parseSpec(raw) {
  const s = raw.trim().replace(/\\/g, "/");
  if (!s) return null;
  let file = s, anchor = null, lines = null;
  const hash = s.indexOf("#");
  if (hash > -1) { file = s.slice(0, hash); anchor = s.slice(hash + 1); }
  else {
    const m = s.match(/^(.*):(\d+)-(\d+)$/);
    if (m) { file = m[1]; lines = [Number(m[2]), Number(m[3])]; }
  }
  return { file: file.replace(/^\.\//, ""), anchor, lines };
}

// Пересечение считается механически, а не на глаз.
function overlaps(a, b) {
  if (a.file !== b.file) return false;
  const aWhole = !a.anchor && !a.lines, bWhole = !b.anchor && !b.lines;
  if (aWhole || bWhole) return true;                       // файл целиком бьётся с чем угодно в нём
  if (a.anchor && b.anchor) return a.anchor === b.anchor;
  if (a.lines && b.lines) return a.lines[0] <= b.lines[1] && b.lines[0] <= a.lines[1];
  return true;                                             // якорь против строк — не сопоставить, считаем конфликтом
}

function conflicts(db, specs, who) {
  const out = [];
  for (const c of db.claims.filter(alive)) {
    if (c.who === who) continue;
    for (const mine of specs) for (const theirs of c.paths.map(parseSpec)) {
      if (theirs && overlaps(mine, theirs)) {
        out.push({ who: c.who, task: c.task, path: `${theirs.file}${theirs.anchor ? "#" + theirs.anchor : theirs.lines ? ":" + theirs.lines.join("-") : ""}`, since: c.created });
      }
    }
  }
  return out;
}

// ---------- CLI ----------
const argv = process.argv.slice(2);
const cmd = argv[0];
const arg = (n) => { const i = argv.indexOf("--" + n); return i > -1 ? argv[i + 1] : null; };
const has = (n) => argv.includes("--" + n);

const who = arg("who");
const specsRaw = (arg("paths") || "").split(",").map((s) => s.trim()).filter(Boolean);
const specs = specsRaw.map(parseSpec).filter(Boolean);

if (cmd === "status") {
  const db = load();
  const live = db.claims.filter(alive);
  if (has("json")) { console.log(JSON.stringify(live, null, 2)); process.exit(0); }
  if (!live.length) { console.log("Активных захватов нет — все зоны свободны."); process.exit(0); }
  console.log(`Активных захватов: ${live.length}\n`);
  for (const c of live) {
    const mins = Math.round((Date.now() - new Date(c.created).getTime()) / 60000);
    console.log(`  ${c.who}  (${mins} мин)\n    задача: ${c.task}\n    зоны:   ${c.paths.join("\n            ")}\n`);
  }
  process.exit(0);
}

if (cmd === "check" || cmd === "claim") {
  if (!specs.length) { console.error("нужен --paths"); process.exit(2); }
  if (cmd === "claim" && (!who || !arg("task"))) { console.error("нужны --who и --task"); process.exit(2); }

  const result = withLock(() => {
    const db = load();
    const bad = conflicts(db, specs, who || "__check__");
    if (bad.length) return { ok: false, bad };
    if (cmd === "claim") {
      db.claims = db.claims.filter((c) => !(c.who === who && c.status === "active"));
      db.claims.push({
        who, task: arg("task"), paths: specsRaw,
        created: new Date().toISOString(), beat: new Date().toISOString(), status: "active",
      });
      save(db);
    }
    return { ok: true };
  });

  if (!result.ok) {
    console.log("КОНФЛИКТ. Эти зоны уже заняты:\n");
    for (const b of result.bad) console.log(`  ${b.path}\n    держит: ${b.who}\n    задача: ${b.task}\n`);
    console.log("Не правь их. Варианты: сузить свою зону, взять другую задачу или дождаться освобождения.");
    console.log("Свободные зоны смотри: node scripts/claim.mjs status");
    process.exit(1);
  }
  console.log(cmd === "claim" ? `Зоны захвачены за «${who}». Продлевай: claim.mjs beat --who ${who}` : "Свободно.");
  process.exit(0);
}

if (cmd === "beat" || cmd === "release") {
  if (!who) { console.error("нужен --who"); process.exit(2); }
  withLock(() => {
    const db = load();
    for (const c of db.claims) {
      if (c.who !== who || c.status !== "active") continue;
      if (cmd === "beat") c.beat = new Date().toISOString();
      else { c.status = "released"; c.released = new Date().toISOString(); }
    }
    save(db);
  });
  console.log(cmd === "beat" ? "продлено" : "освобождено");
  process.exit(0);
}

console.log(`Реестр захватов зон.

  claim   --who <имя> --task "<что делаю>" --paths "<зоны>"
  check   --paths "<зоны>"
  status  [--json]
  beat    --who <имя>
  release --who <имя>

Формат зоны:
  public/app.js                 весь файл
  public/app.js#renderCabinet   именованный участок
  public/app.js:800-950         диапазон строк

Коды возврата claim и check: 0 свободно, 1 конфликт.`);
process.exit(0);
