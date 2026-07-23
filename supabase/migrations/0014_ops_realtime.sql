-- Пульт больше не опрашивается по таймеру: база сама шлёт событие в сессию Claude.
-- Postgres → логическая репликация → Realtime → WebSocket. Задержка вместо 15 секунд
-- становится долей секунды, и пустых запросов «а нет ли чего» больше нет вообще.
alter publication supabase_realtime add table ops_batches;
alter publication supabase_realtime add table ops_items;

-- Для событий UPDATE нужно, чтобы в поток попадала не только новая строка, но и
-- прежние значения — иначе не отличить «правку сохранили» от любого другого изменения.
alter table ops_items replica identity full;
