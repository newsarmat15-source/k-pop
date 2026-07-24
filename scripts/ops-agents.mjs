// Штат агентов в пульте: постоянные четверо вместо разовых карточек.
// Раньше каждая смена заводила свою карточку («Агент: озвучка», «Агент: тетрадь»),
// и вкладка превращалась в журнал вместо схемы управления. Теперь карточка = человек,
// а смена видна строкой «сейчас» внутри неё.
//
//   node --env-file=.env scripts/ops-agents.mjs              — показать штат
//   node --env-file=.env scripts/ops-agents.mjs seed         — пересобрать штат (разовые карточки удаляются)
//   node --env-file=.env scripts/ops-agents.mjs busy   designer "визуальный язык"
//   node --env-file=.env scripts/ops-agents.mjs wait   cmo      "нужен твой ответ по цене"
//   node --env-file=.env scripts/ops-agents.mjs free   tutor    "итог работы"
//   node --env-file=.env scripts/ops-agents.mjs report lead     "итог, задачу не снимаю"
//
// Поля ops_items под агента: title — имя, owner — техническое имя и модель,
// due — что делает сейчас, body — зона ответственности, report — последний отчёт,
// progress — свободен/в работе/ждёт решения/закрыта/выключен, draft — поручение от Сармата.
import { createClient } from "@supabase/supabase-js";

const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const ROSTER = [
  {
    key: "lead", sort: 10,
    title: "Ведущий",
    owner: "живая сессия Claude Code · не подагент",
    body: "Поручать: код, база, конвейер разбора песни, озвучка, деплой, сведение веток. "
        + "И любую задачу, когда не знаешь, кому её отдать: разложу на стадии, раздам и отчитаюсь, кому и почему.\n"
        + "Не его: решать за тебя стратегию, цену и что показывать людям.",
  },
  {
    key: "cmo", sort: 20,
    title: "Маркетолог",
    owner: "idolingo-cmo · opus",
    body: "Поручать: каналы и площадки, гео, аудитория, позиционирование, цена, запуск оплаты, удержание, метрики, дорожная карта.\n"
        + "Не его: код, экраны, механика урока.",
  },
  {
    key: "designer", sort: 30,
    title: "Дизайнер",
    owner: "idolingo-designer · opus",
    body: "Поручать: экраны, визуальный язык, типографика, анимация, доступность, поиск эталонных интерфейсов на рынке. Вёрстку правит сам.\n"
        + "Не его: деньги и каналы, механика обучения, коммиты и деплой.",
  },
  {
    key: "tutor", sort: 40,
    title: "Методист",
    owner: "idolingo-tutor · opus",
    body: "Поручать: механика урока и заданий, порядок подачи материала, повторение, критерий усвоения, разбор чужих методик по данным, а не по популярности.\n"
        + "Не его: вёрстка, каналы, инфраструктура.",
  },
  {
    key: "linguist", sort: 50,
    title: "Лингвист",
    owner: "idolingo-linguist · opus",
    body: "Поручать ТОЛЬКО произношение корейского: как реально звучит буква, слог, слово, строка; правильность нашего TTS и транскрипции; поиск эталонного звучания (носители, официальные видео на YouTube, словари с аудио).\n"
        + "Не его: вёрстка, каналы, механика урока, инфраструктура и деплой.",
  },
];

const PG = { none: "свободен", doing: "в работе", partial: "ждёт твоего решения", done: "задача закрыта", dropped: "выключен" };
const byKey = (k) => ROSTER.find((r) => r.key === k);

async function fetchAgents() {
  const { data, error } = await db.from("ops_items").select("*").eq("kind", "agent").order("sort");
  if (error) { console.error(error.message); process.exit(1); }
  return data || [];
}

async function show() {
  const rows = await fetchAgents();
  if (!rows.length) return console.log("Штат пуст. Прогони: node --env-file=.env scripts/ops-agents.mjs seed");
  for (const a of rows) {
    console.log(`\n${a.title}  [${PG[a.progress] || PG.none}]   ${a.owner || ""}`);
    if (a.due) console.log(`  сейчас: ${a.due}`);
    if (a.draft) console.log(`  ПОРУЧЕНИЕ ОТ САРМАТА: ${a.draft}`);
    if (a.report) console.log(`  отчёт: ${a.report.split("\n")[0].slice(0, 160)}`);
  }
  console.log("");
}

async function seed() {
  const rows = await fetchAgents();
  const keep = new Set();

  for (const r of ROSTER) {
    const found = rows.find((x) => x.title === r.title);
    const patch = { kind: "agent", title: r.title, owner: r.owner, body: r.body, sort: r.sort, updated_at: new Date().toISOString() };
    if (found) {
      keep.add(found.id);
      const { error } = await db.from("ops_items").update(patch).eq("id", found.id);
      if (error) { console.error(r.title, error.message); continue; }
      console.log("обновлён:", r.title);
    } else {
      patch.progress = "none";
      patch.status = "idle";
      const { data, error } = await db.from("ops_items").insert(patch).select().single();
      if (error) { console.error(r.title, error.message); continue; }
      keep.add(data.id);
      console.log("заведён:", r.title);
    }
  }

  // Разовые карточки прошлых смен: их содержание уже перенесено в отчёты по пунктам,
  // на вкладке они только мешают увидеть, кто есть кто.
  const stale = rows.filter((x) => !keep.has(x.id));
  for (const s of stale) {
    const { error } = await db.from("ops_items").delete().eq("id", s.id);
    console.log(error ? `не удалось убрать: ${s.title} (${error.message})` : `убрана разовая карточка: ${s.title}`);
  }
}

async function setState(key, progress, text) {
  const r = byKey(key);
  if (!r) { console.error("Кто это? Ключи:", ROSTER.map((x) => x.key).join(", ")); process.exit(1); }
  const rows = await fetchAgents();
  const found = rows.find((x) => x.title === r.title);
  if (!found) { console.error("Карточки нет, прогони seed"); process.exit(1); }

  const now = new Date().toISOString();
  const patch = { progress, updated_at: now };
  if (progress === "doing") patch.due = text || null;
  if (progress === "none" || progress === "done") { patch.due = null; if (text) { patch.report = text; patch.report_at = now; } }
  if (progress === "partial") { patch.due = text || found.due; if (text) { patch.report = text; patch.report_at = now; } }
  if (progress === null) { delete patch.progress; patch.report = text; patch.report_at = now; }

  const { error } = await db.from("ops_items").update(patch).eq("id", found.id);
  if (error) { console.error(error.message); process.exit(1); }
  console.log(`${r.title}: ${progress ? (PG[progress] || progress) : "отчёт обновлён"}${text ? ` — ${text.split("\n")[0].slice(0, 90)}` : ""}`);
}

const [cmd, key, ...rest] = process.argv.slice(2);
const text = rest.join(" ");

if (!cmd) await show();
else if (cmd === "seed") { await seed(); await show(); }
else if (cmd === "busy") await setState(key, "doing", text);
else if (cmd === "wait") await setState(key, "partial", text);
else if (cmd === "free") await setState(key, "none", text);
else if (cmd === "report") await setState(key, null, text);
else { console.error("Команды: seed | busy | wait | free | report"); process.exit(1); }
