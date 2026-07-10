-- Короткий тег концепции айдола из витрины (напр. "luxe editorial") — отдельно от bio
-- (bio это свободный текст продюсера, concept — фиксированный ярлык шаблона).
alter table idols add column concept text;
