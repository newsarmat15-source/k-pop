-- Разделяем две вещи, которые в 0012 были свалены в одно поле status и путали:
--   status   — жизнь ПРАВКИ Сармата (черновик → сохранена → отдана в работу)
--   progress — ИСПОЛНЕНИЕ пункта Claude (не начато → в работе → выполнено/частично/снято)
-- Плюс report: отчёт Claude словами — что сделано, что не сделано и почему.

alter table ops_items
  add column if not exists progress  text not null default 'none'
    check (progress in ('none','doing','done','partial','dropped')),
  add column if not exists report    text not null default '',
  add column if not exists report_at timestamptz;

create index if not exists ops_items_progress_idx on ops_items (progress);
