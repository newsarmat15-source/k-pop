/* ===================== РАЗБОР ПЕСЕН (караоке, пословно) =====================
   Тайминги строк (t, сек) — из синхронизированного текста lrclib.net (тайминг
   альбомной дорожки; сдвиг клипа правится синхронизацией в один тап).
   Перевод — doolsetbangtan. Романизация — Revised Romanization.

   Схема:
     ytId        — id клипа на YouTube (IFrame API)
     videoOffset — базовый сдвиг клип↔дорожка (сек); пользователь садит точно
                   одним тапом (karaTapSync), результат в so_songoff_<id>.
     verses[]    — куплеты. В конце каждого — авто-пауза.
       end       — конец куплета (сек), точка паузы
       tr        — {ru,en} перевод всего куплета (на паузе)
       note      — {ru,en} заметка учителя (каждое корейское слово с транскрипцией)
       vocab[]   — слова в тетрадь (slang:true → вкладка «Сленг»)
       lines[]   — {t, w:[{k,r,ru,en}]}: строка с таймкодом + пословный разбор
                   k=слово, r=транскрипция, ru/en=перевод этого слова
========================================================================= */
window.SONGS = [
  {
    id: 'spring_day',
    title: '봄날 (Spring Day)',
    artist: 'BTS',
    ytId: 'xEeFrLSkMm8',
    duration: 274,
    videoOffset: 31.0, // киноинтро клипа ~31с (вычислено по корейской ASR-дорожке YouTube: первый вокал на 48.0с vs 17.13с в дорожке)
    level: { ru: 'средний', en: 'intermediate' },
    src: 'lrclib.net (тайминг) · doolsetbangtan (перевод)',
    verses: [
      {
        end: 34.89,
        tr: { ru: 'Скучаю — и оттого что говорю это вслух, скучаю ещё сильнее. Смотрю на ваше фото — всё равно скучаю. Такое безжалостное время; мне досадно за нас — за нас, кому теперь даже увидеться хоть раз стало трудно.', en: 'I miss you — and saying it out loud makes me miss you more. Even looking at your picture, I still miss you. Time is so cruel; I resent us — us, who now find it hard to even see each other once.' },
        note: { ru: 'Тут нет вежливых окончаний — чувство вырывается само. Фраза 보고 싶다 (bogo sipda) «скучаю» — рефрен всей песни, услышишь её десятки раз.', en: 'No polite endings here — the longing bursts out on its own. 보고 싶다 (bogo sipda) “I miss you” is the song’s refrain — you’ll hear it dozens of times.' },
        vocab: [
          { kr: '보고 싶다', rom: 'bogo sipda', ru: 'скучаю / хочу видеть', en: 'I miss you / want to see' },
          { kr: '시간', rom: 'sigan', ru: 'время', en: 'time' }
        ],
        lines: [
          { t: 17.13, w: [
            { k: '보고 싶다', r: 'bogo sipda', ru: 'скучаю', en: 'miss you' },
            { k: '이렇게', r: 'ireoke', ru: 'вот так', en: 'like this' },
            { k: '말하니까', r: 'malhanikka', ru: 'раз говорю', en: 'because I say it' },
            { k: '더', r: 'deo', ru: 'ещё больше', en: 'more' },
            { k: '보고 싶다', r: 'bogo sipda', ru: 'скучаю', en: 'miss you' }
          ] },
          { t: 23.74, w: [
            { k: '너희', r: 'neohui', ru: 'ваше', en: 'your (pl.)' },
            { k: '사진을', r: 'sajineul', ru: 'фото', en: 'photo' },
            { k: '보고 있어도', r: 'bogo isseodo', ru: 'даже смотря', en: 'even looking' },
            { k: '보고 싶다', r: 'bogo sipda', ru: 'скучаю', en: 'miss you' }
          ] },
          { t: 27.86, w: [
            { k: '너무', r: 'neomu', ru: 'слишком', en: 'too' },
            { k: '야속한', r: 'yasokan', ru: 'безжалостное', en: 'cruel' },
            { k: '시간', r: 'sigan', ru: 'время', en: 'time' },
            { k: '나는', r: 'naneun', ru: 'я', en: 'I' },
            { k: '우리가', r: 'uriga', ru: 'нас', en: 'us' },
            { k: '밉다', r: 'mipda', ru: 'досадно', en: 'resent' }
          ] },
          { t: 31.77, w: [
            { k: '이젠', r: 'ijen', ru: 'теперь', en: 'now' },
            { k: '얼굴', r: 'eolgul', ru: 'лицо', en: 'face' },
            { k: '한 번', r: 'han beon', ru: 'один раз', en: 'once' },
            { k: '보는 것조차', r: 'boneun geotjocha', ru: 'даже увидеть', en: 'even seeing' },
            { k: '힘들어진', r: 'himdeureojin', ru: 'стало трудно', en: 'became hard' },
            { k: '우리가', r: 'uriga', ru: 'нам', en: 'us' }
          ] }
        ]
      },
      {
        end: 53.58,
        tr: { ru: 'Здесь сплошная зима — даже в августе приходит зима. Сердце мчится сквозь время — одинокий «Сквозь снег». Взял бы тебя за руку и ушёл на другой конец Земли, лишь бы кончить эту зиму. Сколько тоски должно выпасть, как снег, чтобы пришёл тот весенний день, friend?', en: 'It’s all winter here — even in August, winter comes. My heart races through time — a Snowpiercer left all alone. Holding your hand I’d go to the other side of the Earth to end this winter. How much longing must fall like snow before that spring day comes, friend?' },
        note: { ru: '설국열차 (seolgugyeolcha) — «Сквозь снег» (Snowpiercer, фильм Пон Джун-хо, 2013): образ вечной зимы и одиночества. «Зима в августе» перекликается с фильмом «Рождество в августе».', en: '설국열차 (seolgugyeolcha) — Snowpiercer (Bong Joon-ho’s 2013 film): a metaphor for endless winter and isolation. “Winter in August” echoes the film “Christmas in August”.' },
        vocab: [
          { kr: '겨울', rom: 'gyeoul', ru: 'зима', en: 'winter' },
          { kr: '설국열차', rom: 'seolgugyeolcha', ru: '«Сквозь снег» (Snowpiercer) — образ', en: 'Snowpiercer — a metaphor', slang: true }
        ],
        lines: [
          { t: 34.89, w: [
            { k: '여긴', r: 'yeogin', ru: 'здесь', en: 'here' },
            { k: '온통', r: 'ontong', ru: 'сплошь', en: 'all over' },
            { k: '겨울', r: 'gyeoul', ru: 'зима', en: 'winter' },
            { k: '뿐이야', r: 'ppuniya', ru: 'только', en: 'is only' },
            { k: '8월에도', r: 'parworedo', ru: 'даже в августе', en: 'even in August' },
            { k: '겨울이 와', r: 'gyeouri wa', ru: 'приходит зима', en: 'winter comes' }
          ] },
          { t: 39.58, w: [
            { k: '마음은', r: 'maeumeun', ru: 'сердце', en: 'my heart' },
            { k: '시간을', r: 'siganeul', ru: 'время', en: 'time' },
            { k: '달려가네', r: 'dallyeogane', ru: 'мчится', en: 'races' },
            { k: '홀로', r: 'hollo', ru: 'в одиночку', en: 'alone' },
            { k: '남은', r: 'nameun', ru: 'оставшийся', en: 'left' },
            { k: '설국열차', r: 'seolgugyeolcha', ru: '«Сквозь снег»', en: 'Snowpiercer' }
          ] },
          { t: 43.82, w: [
            { k: '니 손', r: 'ni son', ru: 'твою руку', en: 'your hand' },
            { k: '잡고', r: 'japgo', ru: 'взяв', en: 'holding' },
            { k: '지구', r: 'jigu', ru: 'Земля', en: 'the Earth' },
            { k: '반대편까지', r: 'bandaepyeonkkaji', ru: 'до другого края', en: 'to the far side' },
            { k: '가', r: 'ga', ru: 'иду', en: 'go' },
            { k: '이 겨울을', r: 'i gyeoureul', ru: 'эту зиму', en: 'this winter' },
            { k: '끝내고파', r: 'kkeutnaegopa', ru: 'хочу закончить', en: 'want to end' }
          ] },
          { t: 49.02, w: [
            { k: '그리움들이', r: 'geuriumdeuri', ru: 'тоска', en: 'longings' },
            { k: '얼마나', r: 'eolmana', ru: 'сколько', en: 'how much' },
            { k: '눈처럼', r: 'nuncheoreom', ru: 'как снег', en: 'like snow' },
            { k: '내려야', r: 'naeryeoya', ru: 'должно выпасть', en: 'must fall' },
            { k: '그 봄날이', r: 'geu bomnari', ru: 'тот весенний день', en: 'that spring day' },
            { k: '올까', r: 'olkka', ru: 'придёт ли', en: 'will come' },
            { k: 'friend?', r: 'friend', ru: 'друг', en: 'friend' }
          ] }
        ]
      },
      {
        end: 70.71,
        tr: { ru: 'Как крошечная пылинка, блуждающая в пустоте, как крошечная пылинка. Будь я летящим снегом — я бы добрался до тебя чуть быстрее.', en: 'Like a tiny speck of dust drifting in the void, like a tiny speck of dust. If I were the flurrying snow, I could reach you a little faster.' },
        note: { ru: 'Снег и пылинка (먼지, meonji) — тоска, что хочет долететь до другого. Песня негласно оплакивает трагедию парома «Севоль» (подтверждено продюсерами).', en: 'Snow and dust (먼지, meonji) — a longing that wants to reach someone far away. The song quietly mourns the Sewol ferry tragedy (later confirmed by the producers).' },
        vocab: [
          { kr: '먼지', rom: 'meonji', ru: 'пыль / пылинка', en: 'dust / speck' },
          { kr: '눈', rom: 'nun', ru: 'снег', en: 'snow' }
        ],
        lines: [
          { t: 53.58, w: [
            { k: '허공을', r: 'heogongeul', ru: 'в пустоте', en: 'the void' },
            { k: '떠도는', r: 'tteodoneun', ru: 'блуждающая', en: 'drifting' },
            { k: '작은', r: 'jageun', ru: 'маленькая', en: 'tiny' },
            { k: '먼지처럼', r: 'meonjicheoreom', ru: 'как пылинка', en: 'like dust' },
            { k: '작은 먼지처럼', r: 'jageun meonjicheoreom', ru: 'как крошечная пылинка', en: 'like a tiny speck' }
          ] },
          { t: 62.38, w: [
            { k: '날리는', r: 'nallineun', ru: 'летящий', en: 'flurrying' },
            { k: '눈이', r: 'nuni', ru: 'снег', en: 'snow' },
            { k: '나라면', r: 'naramyeon', ru: 'будь я', en: 'if I were' },
            { k: '조금 더', r: 'jogeum deo', ru: 'чуть больше', en: 'a little more' },
            { k: '빨리', r: 'ppalli', ru: 'быстрее', en: 'faster' },
            { k: '네게', r: 'nege', ru: 'до тебя', en: 'to you' },
            { k: '닿을 수 있을 텐데', r: 'daheul su isseul tende', ru: 'смог бы дотянуться', en: 'could reach' }
          ] }
        ]
      }
    ]
  }
];
