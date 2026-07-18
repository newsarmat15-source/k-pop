-- Настоящий стрик учёбы: сколько дней ПОДРЯД фанат занимался (урок / проверочная / чат).
-- Это НЕ "дни вместе" (дни с создания айдола) и НЕ follows.streak_count (подписка на чужих).
-- Основа для проактивных пуш-напоминаний: cron читает last_study_date, чтобы понять, кого подтолкнуть.
alter table training_stats add column if not exists study_streak int not null default 0;
alter table training_stats add column if not exists best_streak int not null default 0;
alter table training_stats add column if not exists last_study_date date;
