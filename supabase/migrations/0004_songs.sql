-- Общий каталог разобранных песен (шарится между всеми пользователями).
-- Собирается один раз (lrclib + LLM + клип), кладётся сюда, дальше все берут готовое.
create table if not exists songs (
  id text primary key,                        -- 'usr_<lrclibId>' или курируемый id
  title text not null,
  artist text not null,
  yt_id text,
  duration real,
  video_offset real not null default 0,       -- сдвиг клипа (0 пока не посчитан воркером)
  aligned boolean not null default false,      -- посчитан ли точный синхрон воркером
  data jsonb not null,                        -- полный объект песни (verses и т.д.)
  added_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists songs_search_idx on songs (lower(title), lower(artist));
