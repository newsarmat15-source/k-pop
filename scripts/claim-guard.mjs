#!/usr/bin/env node
/**
 * PreToolUse-страж: не даёт править защищённый файл без живого захвата зоны.
 *
 * Почему запрет, а не просьба: правило в промпте модель размывает за несколько
 * обменов, а хук выполняется всегда и его нельзя уговорить. Тот же приём, что
 * с код-гейтом против учебной повестки в чате.
 *
 * Что делает:
 *   - правка файла из PROTECTED без активного захвата  -> ЗАПРЕТ с объяснением
 *   - правка файла, захваченного другим                -> ЗАПРЕТ с именем держателя
 *   - всё остальное                                    -> пропуск
 *
 * Отключить на один вызов: CLAIM_GUARD=off
 */
import fs from "fs";
import path from "path";

const ROOT = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const FILE = path.join(ROOT, ".claude", "claims.json");
const STALE_MIN = Number(process.env.CLAIM_STALE_MIN || 45);

// Файлы, которые правят несколько агентов сразу. Мелочь не сторожим —
// страж должен мешать только там, где реально бьются.
const PROTECTED = [
  "public/app.js",
  "public/style.css",
  "public/index.html",
  "public/curriculum.js",
  "public/songs.js",
  "lib/reply.js",
  "api/song.js",
  "api/chat.js",
  "api/bot.js",
];

const allow = () => process.exit(0);

// process.stdout.write + немедленный exit обрезает вывод, когда stdout это пайп
// (запись асинхронная). Хук всегда работает через пайп, поэтому пишем синхронно
// в дескриптор 1 — иначе запрет молча теряется и страж выглядит рабочим, не будучи им.
function emit(obj) {
  fs.writeSync(1, JSON.stringify(obj));
  process.exit(0);
}
function deny(reason) {
  // Текст уходит модели как результат инструмента: он должен объяснять, что делать дальше.
  emit({
    hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision: "deny", permissionDecisionReason: reason },
  });
}

if (process.env.CLAIM_GUARD === "off") allow();

let raw = "";
process.stdin.setEncoding("utf8");
for await (const chunk of process.stdin) raw += chunk;

if (process.env.CLAIM_DEBUG) fs.writeSync(2, `[claim-guard] stdin bytes=${raw.length}\n[claim-guard] stdin=${raw.slice(0, 200)}\n`);

let ev = {};
try { ev = JSON.parse(raw || "{}"); } catch { allow(); }

const ti = ev.tool_input || {};
const target = ti.file_path || ti.path || ti.notebook_path;
if (!target) allow();

const rel = path.relative(ROOT, path.resolve(target)).replace(/\\/g, "/");

// Самопроверка: показывает, что страж увидел. Без неё молчаливый пропуск
// неотличим от рабочего стража — на этом я уже один раз обжёгся.
if (process.env.CLAIM_DEBUG) {
  fs.writeSync(2, `[claim-guard] ROOT=${ROOT}\n[claim-guard] target=${target}\n[claim-guard] rel=${rel}\n[claim-guard] protected=${PROTECTED.includes(rel)}\n`);
}

if (!PROTECTED.includes(rel)) allow();

let db = { claims: [] };
try { db = JSON.parse(fs.readFileSync(FILE, "utf8")); } catch {}
const live = (db.claims || []).filter(
  (c) => c.status === "active" && (Date.now() - new Date(c.beat || c.created).getTime()) / 60000 < STALE_MIN
);

const holders = live.filter((c) => (c.paths || []).some((p) => String(p).replace(/\\/g, "/").split(/[#:]/)[0] === rel));

if (!holders.length) {
  deny(
    `Файл ${rel} правят несколько агентов одновременно, поэтому он под охраной реестра зон.\n\n` +
    `Захвати зону, прежде чем править:\n` +
    `  node scripts/claim.mjs claim --who "<твоё имя>" --task "<что делаешь>" --paths "${rel}#<участок>"\n\n` +
    `Команда сама покажет конфликт, если участок уже занят. Кто что держит сейчас:\n` +
    `  node scripts/claim.mjs status\n\n` +
    `Протокол целиком: docs/AGENT_COORDINATION.md`
  );
}

// Держатель есть. Свой ли — из payload надёжно не выяснить (субагенты одной
// сессии неразличимы), поэтому решает объявленное имя, а не догадка.
const mine = process.env.CLAIM_WHO;
if (mine && holders.some((c) => c.who === mine)) allow();

const list = holders.map((c) => `  ${c.who} — ${c.task}\n    зоны: ${(c.paths || []).join(", ")}`).join("\n");
if (!mine) {
  // Имя не объявлено: пропускаем, но говорим вслух, чей это участок.
  emit({
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      additionalContext:
        `Внимание: ${rel} сейчас держат другие. Правь только свой участок, Write на этот файл не применяй.\n${list}\n` +
        `Объяви себя переменной CLAIM_WHO, чтобы страж отличал твои правки от чужих.`,
    },
  });
}

deny(
  `Зона ${rel} захвачена другим агентом. Правку отклонил.\n\n${list}\n\n` +
  `Ты представился как «${mine}» и захвата на этот файл не имеешь.\n` +
  `Если участки разные — захвати свой явно:\n` +
  `  node scripts/claim.mjs claim --who "${mine}" --task "<что делаешь>" --paths "${rel}#<твой участок>"\n` +
  `Если участок тот же — это настоящее пересечение. Не правь, сообщи ведущему.`
);
