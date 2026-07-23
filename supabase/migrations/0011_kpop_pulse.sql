-- Курируемый блок «что сейчас в K-pop» (2026-07-23).
-- Айдол, который живёт K-pop, но не знает, что происходит в 2026 — провал достоверности.
-- RAG для этого не нужен: релевантных фактов 6-10 штук (около 400 токенов), retrieval стоил бы
-- дороже, чем просто держать их в системном промпте (docs/IDOL_BRAIN_SPEC.md §5).
--
-- Почему таблица, а не файл в репозитории: облачный агент trend-scout присылает отчёты
-- ежечасно, но локальные файлы и деплой ему недоступны. Строка в БД правится снаружи
-- одним HTTP-запросом, без релиза:
--   POST /api/bot?action=pulse  (заголовок x-ingest-secret)  { "items": [...], "source": "trend-scout 23.07" }
--   GET  /api/bot?action=pulse  (тот же заголовок) — посмотреть, что сейчас лежит
-- Если таблицы/строки нет — код падает на зашитый SEED_PULSE в lib/reply.js, чат не ломается.
create table if not exists kpop_pulse (
  id smallint primary key default 1 check (id = 1),   -- ровно одна строка, обновляется на месте
  items jsonb not null default '[]'::jsonb,           -- массив коротких строк-фактов
  source text,                                        -- откуда взято (для доверия к содержимому)
  updated_at timestamptz not null default now()
);

alter table kpop_pulse enable row level security;      -- доступ только через service_role в api/*

-- Стартовое наполнение: отбор Billboard «25 Best K-Pop Songs of 2026 (So Far)» от 15.07.2026
-- плюс факт про спрос на корейский (Duolingo/KPop Demon Hunters). Держать коротко: это фон
-- осведомлённости, а не справочник — айдол должен звучать как живущий в этом мире, а не как вики.
insert into kpop_pulse (id, items, source)
values (
  1,
  '[
    "BTS вернулись: альбом ARIRANG (№1 Billboard 200), сингл SWIM — их 7-й №1 в Hot 100, стадионный тур распродан",
    "BLACKPINK — 10 лет группе, сингл GO (соавторы Chris Martin и Danny Chung)",
    "EXO вернулись после армии: альбом Reverxe, сингл CROWN",
    "aespa — альбом LEMONADE и мировой тур",
    "На слуху новички: KiiiKiii (404 New Era), Hearts2Hearts (RUDE!), CORTIS (REDRED), NCT WISH (Sticky), RIIZE (SOAR)",
    "Сольно: WOODZ (Cinema), TAEYONG (WYLD), YENA (Catch Catch), P1Harmony (UNIQUE)",
    "KPop Demon Hunters всё ещё гонит людей учить корейский — у Duolingo плюс 22% учащихся за год"
  ]'::jsonb,
  'Billboard 15.07.2026 + Duolingo (через NYT 31.01.2026)'
)
on conflict (id) do nothing;
