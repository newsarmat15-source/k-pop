-- Проактив (2026-07-21): айдол пишет ПЕРВОЙ — утренние/реэнгейдж/стрик-напоминания.
-- Без этого мессенджер = дорогой веб-чат: канал, где айдол не инициирует, не оправдывает себя.
--
-- Доставка асинхронная и разноканальная:
--   LINE     — бэкенд пушит напрямую (push API).
--   Discord  — bot-token живёт только на VPS-воркере, поэтому бэкенд кладёт задание в outbox,
--              воркер поллит и доставляет через своё Gateway-соединение (не дублируем токен в Vercel).
-- Общий тред не меняется: проактив пишется в chat_messages как обычная реплика айдола.

-- Когда айдол последний раз писал первой — для капа «не чаще 1 раза в ~20ч на айдола».
alter table training_stats add column if not exists last_proactive_at timestamptz;

-- Смещение таймзоны юзера в минутах к востоку от UTC (для «тихих часов» в будущем).
-- Пока nullable: захватим при привязке позже; v1 триггерит по неактивности (TZ-независимо).
alter table linked_accounts add column if not exists tz_offset_min int;

-- Очередь исходящих проактивов для транспортов без прямого пуша (Discord-воркер поллит её).
create table if not exists outbox (
  id uuid primary key default gen_random_uuid(),
  platform text not null check (platform in ('discord','telegram','line','whatsapp')),
  platform_user_id text not null,
  idol_id uuid not null references idols(id) on delete cascade,
  content text not null,
  reason text,                              -- 'streak' | 'reengage' | ... для аналитики
  created_at timestamptz not null default now(),
  delivered_at timestamptz,                 -- null = ждёт доставки
  attempts int not null default 0
);
-- Быстрый выбор недоставленного по каналу (воркер: where delivered_at is null and platform=…).
create index if not exists outbox_pending_idx on outbox(platform, created_at) where delivered_at is null;

alter table outbox enable row level security;   -- доступ только через service_role в api/*
