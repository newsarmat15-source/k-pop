/* ===================== РАЗБОР ПЕСЕН =====================
   Каталог курируемых песен для построчного разбора.
   Текст и перевод — из открытых источников (см. note_src), романизация
   сгенерирована по правилам (Revised Romanization). Excerpt — учебный,
   несколько строк на песню (не полный текст).

   Схема строки:
     kr    — строка на корейском
     rom   — романизация
     tr    — {ru,en} перевод
     note  — {ru,en} заметка учителя (грамматика/смысл/сленг/происхождение)
     vocab — необяз. {kr,rom,ru,en,slang} слово/фраза для сохранения в тетрадь
             slang:true → падает во вкладку «Сленг», иначе → «Слова»

   Авто-пауза по фразам (синхронно с видео) = фаза 2 (нужен YouTube IFrame
   API + выверенные тайминги). Сейчас — видео + пошаговый разбор строк.
========================================================================= */
window.SONGS = [
  {
    id: 'spring_day',
    title: '봄날 (Spring Day)',
    artist: 'BTS',
    ytId: 'xEeFrLSkMm8',
    level: { ru: 'средний', en: 'intermediate' },
    note_src: 'doolsetbangtan.wordpress.com',
    lines: [
      {
        kr: '보고 싶다',
        rom: 'bogo sipda',
        tr: { ru: 'Скучаю по тебе', en: 'I miss you' },
        note: { ru: 'Дословно «хочу видеть»: 보다 (видеть) + -고 싶다 (хотеть). Форма без вежливого окончания — чувство вырвалось само, не обращено к кому-то конкретно.', en: 'Literally “want to see”: 보다 (see) + -고 싶다 (want to). No polite ending — the longing bursts out on its own, not aimed at a listener.' },
        vocab: { kr: '보고 싶다', rom: 'bogo sipda', ru: 'скучаю / хочу видеть', en: 'I miss you / want to see', slang: false }
      },
      {
        kr: '이렇게 말하니까 더 보고 싶다',
        rom: 'ireoke malhanikka deo bogo sipda',
        tr: { ru: 'Оттого что говорю это вслух — скучаю ещё сильнее', en: 'Saying it out loud makes me miss you even more' },
        note: { ru: '-니까 = «потому что / раз уж». 더 = «больше, сильнее». Само произнесение чувства усиливает его.', en: '-니까 = “because / since”. 더 = “more”. Voicing the feeling intensifies it.' },
        vocab: { kr: '더', rom: 'deo', ru: 'больше / ещё', en: 'more', slang: false }
      },
      {
        kr: '너희 사진을 보고 있어도',
        rom: 'neohui sajineul bogo isseodo',
        tr: { ru: 'Даже когда смотрю на ваше фото', en: 'Even while I’m looking at your picture' },
        note: { ru: '너희 = «вы / ваши» (мн. ч.) — намёк, что обращается к нескольким. -아/어도 = «даже если».', en: '너희 = “you / your” (plural) — a hint it’s addressed to several people. -아/어도 = “even if / even though”.' },
        vocab: { kr: '사진', rom: 'sajin', ru: 'фотография', en: 'photo', slang: false }
      },
      {
        kr: '보고 싶다',
        rom: 'bogo sipda',
        tr: { ru: 'Всё равно скучаю', en: 'I still miss you' },
        note: { ru: 'Повтор рефрена — приём, который ты будешь слышать в припевах постоянно.', en: 'The refrain repeats — a device you’ll hear in choruses constantly.' }
      },
      {
        kr: '너무 야속한 시간',
        rom: 'neomu yasokan sigan',
        tr: { ru: 'Такое безжалостное время', en: 'Time is so cruel' },
        note: { ru: '야속하다 = «бессердечный, жестокий» (о времени или человеке, что подводит). 너무 = «слишком».', en: '야속하다 = “heartless, cruel” (of time or a person who lets you down). 너무 = “too / so”.' },
        vocab: { kr: '시간', rom: 'sigan', ru: 'время', en: 'time', slang: false }
      },
      {
        kr: '나는 우리가 밉다',
        rom: 'naneun uriga mipda',
        tr: { ru: 'Мне досадно за нас', en: 'I hate us' },
        note: { ru: '밉다 = «быть противным / досадным». Не «ненависть-злоба», а горькая обида. 우리 = «мы / нас».', en: '밉다 = “to be resentful / hateful toward”. Not rage — bitter reproach. 우리 = “we / us”.' },
        vocab: { kr: '밉다', rom: 'mipda', ru: 'быть противным / досадным', en: 'to resent / find hateful', slang: false }
      }
    ]
  }
];
