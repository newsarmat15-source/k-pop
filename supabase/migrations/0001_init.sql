-- StageOne — базовая схема (2026-07-09).
-- Покрывает: аккаунты, айдолов, тренировки, клипы (с очередью/статусом), фотокарточки,
-- голосования, подписки-фанатов (стрик/лестница), чат+голосовые с айдолом, платную подписку.
-- RLS включён на всех таблицах, но политик доступа пока нет — единственный путь к данным
-- сейчас через серверные api/*.js с service_role ключом (обходит RLS). Публичные политики
-- (например, для realtime графика/чата из браузера) добавим отдельной миграцией, когда
-- реально понадобится прямой доступ из клиента.

-- 1. Профиль поверх auth.users (встроенная авторизация Supabase)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  hearts_balance int not null default 0,
  energy_balance int not null default 0,
  created_at timestamptz not null default now()
);

-- 2. Айдолы
create table idols (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  name_kr text,
  bio text,
  portrait_url text,
  voice_id text,              -- ElevenLabs voice id — общий и для пения в клипах, и для голосовых в чате
  dance_style text,           -- ключ из DANCE в api/generate.js (lesserafim, aespa, ...)
  gender text,
  league text not null default 'Coral I',
  fanbase_count bigint not null default 0,
  created_at timestamptz not null default now()
);
create index idols_owner_idx on idols(owner_id);

-- 3. Тренировки (язык/танец) — сейчас косметика в UI, эта таблица делает прогресс реальным
create table training_stats (
  idol_id uuid primary key references idols(id) on delete cascade,
  language_pct int not null default 0 check (language_pct between 0 and 100),
  dance_pct int not null default 0 check (dance_pct between 0 and 100),
  dance_moves_learned int not null default 0, -- сколько движений из банка группы разблокировано
  cooldown_until timestamptz,
  updated_at timestamptz not null default now()
);

-- 4. Клипы — со статусом, чтобы генерация была очередью с ретраями, а не синхронным вызовом
create table clips (
  id uuid primary key default gen_random_uuid(),
  idol_id uuid not null references idols(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','processing','done','failed')),
  video_url text,
  duration_sec int,
  cost_usd numeric(10,4),
  fal_request_id text,
  error text,
  created_at timestamptz not null default now()
);
create index clips_idol_idx on clips(idol_id);

-- 5. Фотокарточки
create table photocards (
  id uuid primary key default gen_random_uuid(),
  idol_id uuid not null references idols(id) on delete cascade,
  image_url text not null,
  batch_id uuid,
  created_at timestamptz not null default now()
);
create index photocards_idol_idx on photocards(idol_id);

-- 6. Голоса чарта (публичные, не свои — "форсим чужого айдола")
create table votes (
  id bigint generated always as identity primary key,
  idol_id uuid not null references idols(id) on delete cascade,
  voter_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index votes_idol_idx on votes(idol_id);

-- 7. Подписка фаната на чужого айдола — стрик + лестница лояльности
create table follows (
  follower_id uuid not null references profiles(id) on delete cascade,
  idol_id uuid not null references idols(id) on delete cascade,
  streak_count int not null default 0,
  last_support_date date,
  started_at timestamptz not null default now(),
  primary key (follower_id, idol_id)
);

-- 8. Переписка с собственным айдолом (текст + голосовые) — "друг в телефоне"
create table chat_messages (
  id uuid primary key default gen_random_uuid(),
  idol_id uuid not null references idols(id) on delete cascade,
  sender text not null check (sender in ('owner','idol')),
  content text not null,
  is_voice boolean not null default false,
  audio_url text,
  created_at timestamptz not null default now()
);
create index chat_messages_idol_idx on chat_messages(idol_id, created_at);

-- 9. Платная подписка владельца (готово под Stripe, само подключение — отдельный шаг)
create table subscriptions (
  profile_id uuid primary key references profiles(id) on delete cascade,
  tier text not null default 'base' check (tier in ('base','premium')),
  status text not null default 'inactive',
  stripe_customer_id text,
  stripe_subscription_id text,
  current_period_end timestamptz
);

alter table profiles enable row level security;
alter table idols enable row level security;
alter table training_stats enable row level security;
alter table clips enable row level security;
alter table photocards enable row level security;
alter table votes enable row level security;
alter table follows enable row level security;
alter table chat_messages enable row level security;
alter table subscriptions enable row level security;
