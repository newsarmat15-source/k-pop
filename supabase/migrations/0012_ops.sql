-- Операционный пульт (CRM Сармата). Живёт на /ops, пишется через api/ops.js под ключом OPS_KEY.
-- Смысл: заменить артефакт, который физически не мог хранить ввод (localStorage в песочнице бросает).
-- Здесь ввод хранится в Postgres, поэтому кнопка «Сохранить» — не декорация.

create table if not exists ops_items (
  id          uuid primary key default gen_random_uuid(),
  kind        text not null check (kind in ('roadmap','today','fix','agent')),
  title       text not null,
  body        text not null default '',   -- описание от Claude: что это и что предполагается сделать
  draft       text not null default '',   -- корректировка Сармата
  -- idle: правок нет | saved: правка сохранена, но не применена | queued: отдана в работу
  -- done: сделано | dropped: снято
  status      text not null default 'idle' check (status in ('idle','saved','queued','done','dropped')),
  priority    text,                       -- P0..P3 для fix, «этап 0..3» для roadmap
  owner       text,                       -- агент-ответственный
  due         text,                       -- срок словами: «до 25.07»
  metric      text,                       -- как поймём, что получилось / провалилось
  sort        int  not null default 0,
  saved_at    timestamptz,
  applied_at  timestamptz,
  done_at     timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists ops_items_kind_sort_idx on ops_items (kind, sort);
create index if not exists ops_items_status_idx    on ops_items (status);

-- Пачка правок, отданная кнопкой «Применить всё». Claude читает последнюю непринятую.
create table if not exists ops_batches (
  id         uuid primary key default gen_random_uuid(),
  note       text not null default '',
  items      jsonb not null default '[]'::jsonb,  -- снимок правок на момент нажатия
  created_at timestamptz not null default now(),
  picked_at  timestamptz                          -- когда Claude взял в работу
);

-- RLS включён без политик: анонимный ключ не читает ничего, service_role обходит.
alter table ops_items   enable row level security;
alter table ops_batches enable row level security;
