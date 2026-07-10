-- Раздельные кулдауны языка/танца — в UI это две независимые кнопки, значит и в базе два поля.
alter table training_stats rename column cooldown_until to language_cooldown_until;
alter table training_stats add column dance_cooldown_until timestamptz;
