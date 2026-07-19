-- Омниканальность (2026-07-18): мессенджеры = тонкие окна в ОДИН тред chat_messages.
-- Фаза 0 — общий фундамент для Discord/LINE/Telegram, без привязки к конкретному каналу.

-- Метка канала на каждом сообщении общего треда (web/discord/line/telegram/whatsapp).
-- default 'web' — существующие строки и веб-чат остаются как были.
alter table chat_messages add column if not exists channel text not null default 'web';

-- Привязка аккаунта мессенджера к айдолу пользователя.
-- Один platform_user_id = один айдол (у юзера один айдол). Через это вебхук без сессии
-- находит, в чей тред писать. profile_id дублируется для лимитов/аналитики/каскада.
create table if not exists linked_accounts (
  id uuid primary key default gen_random_uuid(),
  platform text not null check (platform in ('discord','telegram','line','whatsapp')),
  platform_user_id text not null,
  profile_id uuid not null references profiles(id) on delete cascade,
  idol_id uuid not null references idols(id) on delete cascade,
  lang text not null default 'en',       -- язык обучения этого юзера (для персоны)
  created_at timestamptz not null default now(),
  unique (platform, platform_user_id)     -- один аккаунт мессенджера привязан один раз
);
create index if not exists linked_accounts_idol_idx on linked_accounts(idol_id);
create index if not exists linked_accounts_profile_idx on linked_accounts(profile_id);

-- Одноразовые токены привязки для deep-link каналов (Telegram /start <token>, LINE).
-- В приложении жмут «привязать» → генерим токен → юзер открывает бота с ним → webhook
-- связывает platform_user_id ↔ idol_id и помечает used_at. Discord идёт через OAuth,
-- токен ему не нужен, но таблица общая на случай единого флоу.
create table if not exists link_tokens (
  token text primary key,
  profile_id uuid not null references profiles(id) on delete cascade,
  idol_id uuid not null references idols(id) on delete cascade,
  lang text not null default 'en',
  platform text,                          -- под какой канал выдан (может быть null = любой)
  used_at timestamptz,
  created_at timestamptz not null default now()
);

alter table linked_accounts enable row level security;
alter table link_tokens enable row level security;
