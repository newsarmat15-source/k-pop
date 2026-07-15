/* ===================== РАЗБОР ПЕСЕН (караоке) =====================
   Каталог курируемых песен для караоке-разбора.
   Тайминги строк (t, сек) — из синхронизированного текста lrclib.net
   (тайминг альбомной дорожки). Перевод — doolsetbangtan (уважаемый
   переводческий блог). Романизация — по правилам (Revised Romanization).
   Excerpt учебный: первые куплеты, не весь текст.

   Схема:
     ytId        — id клипа на YouTube (встраивается через IFrame API)
     videoOffset — сдвиг видео против тайминга дорожки (сек). 0 по умолчанию;
                   пользователь донастраивает вживую кнопками «синхрон −/+»
                   (сохраняется в so_songoff_<id>), т.к. интро клипа ≠ альбом.
     verses[]    — куплеты. Пауза ставится в конце каждого куплета.
       end       — конец куплета в сек (точка авто-паузы)
       tr        — {ru,en} перевод куплета целиком (показывается на паузе)
       note      — {ru,en} культурная/грамматическая заметка учителя
       vocab[]   — слова для сохранения в тетрадь (slang:true → вкладка «Сленг»)
       lines[]   — {t, kr, rom} строки с таймкодом (t = старт в сек)
========================================================================= */
window.SONGS = [
  {
    id: 'spring_day',
    title: '봄날 (Spring Day)',
    artist: 'BTS',
    ytId: 'xEeFrLSkMm8',
    duration: 274,
    videoOffset: 0,
    level: { ru: 'средний', en: 'intermediate' },
    src: 'lrclib.net (тайминг) · doolsetbangtan (перевод)',
    verses: [
      {
        end: 34.89,
        tr: { ru: 'Скучаю по тебе — и оттого что говорю это вслух, скучаю ещё сильнее. Смотрю на ваше фото — всё равно скучаю. Такое безжалостное время; мне досадно за нас — за нас, кому теперь даже увидеться хоть раз стало трудно.', en: 'I miss you — and saying it out loud makes me miss you more. Even looking at your picture, I still miss you. Time is so cruel; I resent us — us, who now find it hard to even see each other once.' },
        note: { ru: 'Вежливых окончаний (존댓말) нет — чувство вырывается само. 보고 싶다 («скучаю») — рефрен всей песни, услышишь его десятки раз.', en: 'No polite endings (존댓말) — the longing bursts out on its own. 보고 싶다 (“I miss you”) is the song’s refrain — you’ll hear it dozens of times.' },
        vocab: [
          { kr: '보고 싶다', rom: 'bogo sipda', ru: 'скучаю / хочу видеть', en: 'I miss you / want to see' },
          { kr: '시간', rom: 'sigan', ru: 'время', en: 'time' }
        ],
        lines: [
          { t: 17.13, kr: '보고 싶다, 이렇게 말하니까 더 보고 싶다', rom: 'bogo sipda, ireoke malhanikka deo bogo sipda' },
          { t: 23.74, kr: '너희 사진을 보고 있어도 보고 싶다', rom: 'neohui sajineul bogo isseodo bogo sipda' },
          { t: 27.86, kr: '너무 야속한 시간 나는 우리가 밉다', rom: 'neomu yasokan sigan naneun uriga mipda' },
          { t: 31.77, kr: '이젠 얼굴 한 번 보는 것조차 힘들어진 우리가', rom: 'ijen eolgul han beon boneun geotjocha himdeureojin uriga' }
        ]
      },
      {
        end: 53.58,
        tr: { ru: 'Здесь сплошная зима — даже в августе приходит зима. Сердце мчится сквозь время — одинокий «Сквозь снег». Взял бы тебя за руку и ушёл на другой конец Земли, лишь бы кончить эту зиму. Сколько тоски должно выпасть, как снег, чтобы пришёл тот весенний день, friend?', en: 'It’s all winter here — even in August, winter comes. My heart races through time — a Snowpiercer left all alone. Holding your hand I’d go to the other side of the Earth to end this winter. How much longing must fall like snow before that spring day comes, friend?' },
        note: { ru: '설국열차 = «Сквозь снег» (Snowpiercer, фильм Пон Джун-хо, 2013) — образ вечной зимы и изоляции. «Зима в августе» перекликается с корейским фильмом «Рождество в августе».', en: '설국열차 = Snowpiercer (Bong Joon-ho’s 2013 film) — a metaphor for endless winter and isolation. “Winter in August” echoes the Korean film “Christmas in August”.' },
        vocab: [
          { kr: '겨울', rom: 'gyeoul', ru: 'зима', en: 'winter' },
          { kr: '설국열차', rom: 'seolgugyeolcha', ru: '«Сквозь снег» (Snowpiercer) — образ', en: 'Snowpiercer — a metaphor', slang: true }
        ],
        lines: [
          { t: 34.89, kr: '여긴 온통 겨울 뿐이야 8월에도 겨울이 와', rom: 'yeogin ontong gyeoul ppuniya parworedo gyeouri wa' },
          { t: 39.58, kr: '마음은 시간을 달려가네 홀로 남은 설국열차', rom: 'maeumeun siganeul dallyeogane hollo nameun seolgugyeolcha' },
          { t: 43.82, kr: '니 손 잡고 지구 반대편까지 가 이 겨울을 끝내고파', rom: 'ni son japgo jigu bandaepyeonkkaji ga i gyeoureul kkeutnaegopa' },
          { t: 49.02, kr: '그리움들이 얼마나 눈처럼 내려야 그 봄날이 올까, friend?', rom: 'geuriumdeuri eolmana nuncheoreom naeryeoya geu bomnari olkka, friend?' }
        ]
      },
      {
        end: 70.71,
        tr: { ru: 'Как крошечная пылинка, блуждающая в пустоте, как крошечная пылинка. Будь я летящим снегом — я бы добрался до тебя чуть быстрее.', en: 'Like a tiny speck of dust drifting in the void, like a tiny speck of dust. If I were the flurrying snow, I could reach you a little faster.' },
        note: { ru: 'Снег и пылинка — тоска, что хочет долететь до другого. Песня негласно оплакивает трагедию парома «Севоль» (подтверждено продюсерами и участниками).', en: 'Snow and dust — a longing that wants to reach someone far away. The song quietly mourns the Sewol ferry tragedy (later confirmed by the producers and members).' },
        vocab: [
          { kr: '먼지', rom: 'meonji', ru: 'пыль / пылинка', en: 'dust / speck' },
          { kr: '눈', rom: 'nun', ru: 'снег', en: 'snow' }
        ],
        lines: [
          { t: 53.58, kr: '허공을 떠도는 작은 먼지처럼, 작은 먼지처럼', rom: 'heogongeul tteodoneun jageun meonjicheoreom, jageun meonjicheoreom' },
          { t: 62.38, kr: '날리는 눈이 나라면 조금 더 빨리 네게 닿을 수 있을 텐데?', rom: 'nallineun nuni naramyeon jogeum deo ppalli nege daheul su isseul tende?' }
        ]
      }
    ]
  }
];
