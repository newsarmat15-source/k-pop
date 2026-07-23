/* ===================== РАЗБОР ПЕСЕН (караоке, по слогам) =====================
   Тайминги строк (t, сек) — из синхронизированного текста lrclib.net (тайминг
   альбомной дорожки; сдвиг клипа правится синхронизацией в один тап).
   Перевод — doolsetbangtan + разбор смысла.

   ТРАНСКРИПЦИЯ (правка 23.07): пишем НЕ по правилам романизации из учебника,
   а ровно так, как слог звучит у артиста — после корейских звуковых правил
   (озвончение, ассимиляция, напряжение, перенос патчхима). Слоги разделяем «·».
     보고 싶다  → bo·go·sip·tta   (не «sipda»: ㅂ+ㄷ даёт напряжённое [따])
     말하니까   → ma·ra·ni·kka    (ㄹ+ㅎ съедается → [마라니까])
     설국열차   → seol·gung·nyeol·cha (ㄱ+ㅇ+ㅕ → [설궁녈차])
     8월에도    → pa·rwo·re·do    (팔월에도 → [파뤄레도])
   r  — латиница по слогам (для en и всех нелатинских языков)
   rr — кириллица по слогам (для ru; система Концевича, она и есть про звучание)

   Схема:
     ytId        — id клипа на YouTube (IFrame API)
     videoOffset — базовый сдвиг клип↔дорожка (сек); пользователь садит точно
                   одним тапом (karaTapSync), результат в so_songoff_<id>.
     verses[]    — куплеты.
       end       — конец куплета (сек)
       tr        — {ru,en} СМЫСЛОВОЙ перевод куплета
       lit       — {ru,en} ДОСЛОВНЫЙ перевод (слово за словом, коряво — так и надо)
       why       — {ru,en} почему дословный расходится со смысловым:
                   слово А значит одно, слово Б другое, а вместе — третье
       note      — {ru,en} культурная заметка
       lines[]   — {t, w:[{k,r,rr,ru,en}]}: строка с таймкодом + разбор
                   k=слово, r/rr=транскрипция по слогам, ru/en=перевод слова
========================================================================= */
window.SONGS = [
  {
    id: 'spring_day',
    title: '봄날 (Spring Day)',
    artist: 'BTS',
    ytId: 'xEeFrLSkMm8',
    duration: 274,
    videoOffset: 31.0, // киноинтро клипа около 31с (по корейской ASR-дорожке YouTube: первый вокал на 48.0с vs 17.13с в дорожке)
    level: { ru: 'средний', en: 'intermediate' },
    src: 'lrclib.net (тайминг) · doolsetbangtan (перевод)',
    verses: [
      {
        end: 34.89,
        tr: { ru: 'Скучаю — и оттого что говорю это вслух, скучаю ещё сильнее. Смотрю на ваше фото — всё равно скучаю. Такое безжалостное время; мне досадно за нас — за нас, кому теперь даже увидеться хоть раз стало трудно.', en: 'I miss you — and saying it out loud makes me miss you more. Even looking at your picture, I still miss you. Time is so cruel; I resent us — us, who now find it hard to even see each other once.' },
        lit: { ru: 'Видеть хочется — вот так говорю потому ещё видеть хочется. Ваше фото смотрю даже — видеть хочется. Слишком безжалостное время, я нас ненавижу. Теперь лицо один раз видение даже трудным ставшие мы.', en: 'Want-to-see — because I say it like this, want-to-see more. Even though looking at your photo, want-to-see. Too cruel time, I hate us. Now, us who became hard even the seeing of a face once.' },
        why: { ru: '보다 (по·да) — «смотреть». 싶다 (сип·та) — «хотеть». Порознь это «хочу посмотреть», как на фильм. Вместе 보고 싶다 — «скучаю»: в корейском тоска выражается не чувством, а желанием увидеть. И 밉다 (мип·та) в словаре — «противен, ненавистен», но здесь это не ненависть, а досада на самих себя: «сами виноваты, что так вышло».', en: '보다 (bo·da) is “to look”, 싶다 (sip·da) is “to want”. Apart they give “I want to watch”, like a film. Together 보고 싶다 means “I miss you”: Korean says longing as a wish to see. And 밉다 (mip·da) is dictionary-“hateful”, but here it is not hatred — it is resentment at themselves for letting it come to this.' },
        note: { ru: 'Тут нет вежливых окончаний — чувство вырывается само. Фраза 보고 싶다 (по·го·сип·та) «скучаю» — рефрен всей песни, услышишь её десятки раз.', en: 'No polite endings here — the longing bursts out on its own. 보고 싶다 (bo·go·sip·tta) “I miss you” is the song’s refrain — you’ll hear it dozens of times.' },
        lines: [
          { t: 17.13, w: [
            { k: '보고 싶다', r: 'bo·go·sip·tta', rr: 'по·го·сип·та', ru: 'скучаю', en: 'miss you' },
            { k: '이렇게', r: 'i·reo·ke', rr: 'и·ро·кхе', ru: 'вот так', en: 'like this' },
            { k: '말하니까', r: 'ma·ra·ni·kka', rr: 'ма·ра·ни·кка', ru: 'раз говорю', en: 'because I say it' },
            { k: '더', r: 'deo', rr: 'то', ru: 'ещё больше', en: 'more' },
            { k: '보고 싶다', r: 'bo·go·sip·tta', rr: 'по·го·сип·та', ru: 'скучаю', en: 'miss you' }
          ] },
          { t: 23.74, w: [
            { k: '너희', r: 'neo·hi', rr: 'но·хи', ru: 'ваше', en: 'your (pl.)' },
            { k: '사진을', r: 'sa·ji·neul', rr: 'са·джи·ныль', ru: 'фото', en: 'photo' },
            { k: '보고 있어도', r: 'bo·go·i·sseo·do', rr: 'по·го·и·ссо·до', ru: 'даже смотря', en: 'even looking' },
            { k: '보고 싶다', r: 'bo·go·sip·tta', rr: 'по·го·сип·та', ru: 'скучаю', en: 'miss you' }
          ] },
          { t: 27.86, w: [
            { k: '너무', r: 'neo·mu', rr: 'но·му', ru: 'слишком', en: 'too' },
            { k: '야속한', r: 'ya·so·kan', rr: 'я·со·кхан', ru: 'безжалостное', en: 'cruel' },
            { k: '시간', r: 'si·gan', rr: 'щи·ган', ru: 'время', en: 'time' },
            { k: '나는', r: 'na·neun', rr: 'на·нын', ru: 'я', en: 'I' },
            { k: '우리가', r: 'u·ri·ga', rr: 'у·ри·га', ru: 'нас', en: 'us' },
            { k: '밉다', r: 'mip·tta', rr: 'мип·та', ru: 'досадно', en: 'resent' }
          ] },
          { t: 31.77, w: [
            { k: '이젠', r: 'i·jen', rr: 'и·джен', ru: 'теперь', en: 'now' },
            { k: '얼굴', r: 'eol·gul', rr: 'оль·гуль', ru: 'лицо', en: 'face' },
            { k: '한 번', r: 'han·beon', rr: 'хан·бон', ru: 'один раз', en: 'once' },
            { k: '보는 것조차', r: 'bo·neun·geot·jjo·cha', rr: 'по·нын·гот·чо·ча', ru: 'даже увидеть', en: 'even seeing' },
            { k: '힘들어진', r: 'him·deu·reo·jin', rr: 'хим·ды·ро·джин', ru: 'стало трудно', en: 'became hard' },
            { k: '우리가', r: 'u·ri·ga', rr: 'у·ри·га', ru: 'нам', en: 'us' }
          ] }
        ]
      },
      {
        end: 53.58,
        tr: { ru: 'Здесь сплошная зима — даже в августе приходит зима. Сердце мчится сквозь время — одинокий «Сквозь снег». Взял бы тебя за руку и ушёл на другой конец Земли, лишь бы кончить эту зиму. Сколько тоски должно выпасть, как снег, чтобы пришёл тот весенний день, friend?', en: 'It’s all winter here — even in August, winter comes. My heart races through time — a Snowpiercer left all alone. Holding your hand I’d go to the other side of the Earth to end this winter. How much longing must fall like snow before that spring day comes, friend?' },
        lit: { ru: 'Здесь сплошь зима только. И в августе зима приходит. Сердце время бежит. В одиночестве оставшийся снежной страны поезд. Твою руку взяв, Земли обратной стороны до иду — эту зиму закончить хочется. Тоски сколько как снег выпасть должно, тот весны день придёт ли, friend?', en: 'Here it is all winter only. Even in August winter comes. Heart runs time. Snow-country train left alone. Taking your hand, I go up to the opposite side of the Earth — want to finish this winter. How much longing must fall like snow, will that day of spring come, friend?' },
        why: { ru: '설국 (соль·гук) — «снежная страна», 열차 (ёль·ча) — «поезд». Порознь получается бессмыслица. Вместе 설국열차 — корейское название фильма «Сквозь снег» (Пон Джун-хо, 2013): поезд, вечно кружащий по замёрзшей планете. Одно слово вместо целого абзаца про «застрял в бесконечной зиме и не могу выйти». И 봄날 (пом·наль) — не «весенний день» из прогноза погоды: 봄 «весна» + 날 «день» вместе значат «пора, когда снова станет тепло между людьми».', en: '설국 (seol·guk) is “snow country”, 열차 (yeol·cha) is “train”. Apart it is nonsense. Together 설국열차 is the Korean title of Snowpiercer (Bong Joon-ho, 2013): a train circling a frozen planet forever. One word instead of a paragraph about being stuck in an endless winter. And 봄날 (bom·nal) is not a weather-forecast “spring day”: 봄 “spring” + 날 “day” together mean “the time when things get warm between people again”.' },
        note: { ru: '«Зима в августе» перекликается с корейским фильмом «Рождество в августе». 8월에도 читается [파뤄레도] — патчхим ㄹ переезжает в следующий слог, поэтому пишем pa·rwo·re·do.', en: '“Winter in August” echoes the Korean film “Christmas in August”. 8월에도 is pronounced [파뤄레도] — the ㄹ patchim slides into the next syllable, hence pa·rwo·re·do.' },
        lines: [
          { t: 34.89, w: [
            { k: '여긴', r: 'yeo·gin', rr: 'ё·гин', ru: 'здесь', en: 'here' },
            { k: '온통', r: 'on·tong', rr: 'он·тхон', ru: 'сплошь', en: 'all over' },
            { k: '겨울', r: 'gyeo·ul', rr: 'кё·уль', ru: 'зима', en: 'winter' },
            { k: '뿐이야', r: 'ppu·ni·ya', rr: 'пу·ни·я', ru: 'только', en: 'is only' },
            { k: '8월에도', r: 'pa·rwo·re·do', rr: 'па·рво·ре·до', ru: 'даже в августе', en: 'even in August' },
            { k: '겨울이 와', r: 'gyeo·u·ri·wa', rr: 'кё·у·ри·ва', ru: 'приходит зима', en: 'winter comes' }
          ] },
          { t: 39.58, w: [
            { k: '마음은', r: 'ma·eu·meun', rr: 'ма·ы·мын', ru: 'сердце', en: 'my heart' },
            { k: '시간을', r: 'si·ga·neul', rr: 'щи·га·ныль', ru: 'время', en: 'time' },
            { k: '달려가네', r: 'dal·lyeo·ga·ne', rr: 'таль·лё·га·не', ru: 'мчится', en: 'races' },
            { k: '홀로', r: 'hol·lo', rr: 'холь·ло', ru: 'в одиночку', en: 'alone' },
            { k: '남은', r: 'na·meun', rr: 'на·мын', ru: 'оставшийся', en: 'left' },
            { k: '설국열차', r: 'seol·gung·nyeol·cha', rr: 'соль·гун·нёль·ча', ru: '«Сквозь снег»', en: 'Snowpiercer' }
          ] },
          { t: 43.82, w: [
            { k: '니 손', r: 'ni·son', rr: 'ни·сон', ru: 'твою руку', en: 'your hand' },
            { k: '잡고', r: 'jap·kko', rr: 'чап·ко', ru: 'взяв', en: 'holding' },
            { k: '지구', r: 'ji·gu', rr: 'чи·гу', ru: 'Земля', en: 'the Earth' },
            { k: '반대편까지', r: 'ban·dae·pyeon·kka·ji', rr: 'пан·дэ·пхён·кка·джи', ru: 'до другого края', en: 'to the far side' },
            { k: '가', r: 'ga', rr: 'ка', ru: 'иду', en: 'go' },
            { k: '이 겨울을', r: 'i·gyeo·u·reul', rr: 'и·кё·у·рыль', ru: 'эту зиму', en: 'this winter' },
            { k: '끝내고파', r: 'kkeun·nae·go·pa', rr: 'кын·нэ·го·пха', ru: 'хочу закончить', en: 'want to end' }
          ] },
          { t: 49.02, w: [
            { k: '그리움들이', r: 'geu·ri·um·deu·ri', rr: 'кы·ри·ум·ды·ри', ru: 'тоска', en: 'longings' },
            { k: '얼마나', r: 'eol·ma·na', rr: 'оль·ма·на', ru: 'сколько', en: 'how much' },
            { k: '눈처럼', r: 'nun·cheo·reom', rr: 'нун·чо·ром', ru: 'как снег', en: 'like snow' },
            { k: '내려야', r: 'nae·ryeo·ya', rr: 'нэ·рё·я', ru: 'должно выпасть', en: 'must fall' },
            { k: '그 봄날이', r: 'geu·bom·na·ri', rr: 'кы·пом·на·ри', ru: 'тот весенний день', en: 'that spring day' },
            { k: '올까', r: 'ol·kka', rr: 'оль·кка', ru: 'придёт ли', en: 'will come' },
            { k: 'friend?', r: 'friend', rr: 'фрэнд', ru: 'друг', en: 'friend' }
          ] }
        ]
      },
      {
        end: 70.71,
        tr: { ru: 'Как крошечная пылинка, блуждающая в пустоте, как крошечная пылинка. Будь я летящим снегом — я бы добрался до тебя чуть быстрее.', en: 'Like a tiny speck of dust drifting in the void, like a tiny speck of dust. If I were the flurrying snow, I could reach you a little faster.' },
        lit: { ru: 'Пустоту блуждающая маленькая пыль как, маленькая пыль как. Летящий снег если бы я был, чуть больше быстро к тебе достичь мочь было бы, а вот.', en: 'The void drifting tiny dust like, tiny dust like. If I were the flying snow, a little more quickly to you reach could be — but.' },
        why: { ru: 'Хвост 닿을 수 있을 텐데 — это три куска: 닿다 (та·да) «дотронуться», -ㄹ 수 있다 «мочь», -텐데 «было бы, да…». Первые два вместе дают «смог бы дотянуться». А -텐데 добавляет то, чего нет ни в одном слове по отдельности: сожаление и невозможность. Смысл всей фразы: «дотянулся бы… но я не снег». Русский перевод «смог бы дотянуться» теряет этот вздох в конце — поэтому дословный и смысловой расходятся.', en: 'The tail 닿을 수 있을 텐데 is three pieces: 닿다 (da·da) “to touch/reach”, -ㄹ 수 있다 “to be able”, -텐데 “it would be, but…”. The first two give “I could reach you”. -텐데 adds what neither word carries alone: regret and impossibility. The real meaning is “I would reach you… but I am not snow.” English “could reach you” drops that sigh — which is exactly why the literal and the real reading differ.' },
        note: { ru: 'Снег и пылинка (먼지, мон·джи) — тоска, что хочет долететь до другого. Песня негласно оплакивает трагедию парома «Севоль» (подтверждено продюсерами).', en: 'Snow and dust (먼지, meon·ji) — a longing that wants to reach someone far away. The song quietly mourns the Sewol ferry tragedy (later confirmed by the producers).' },
        lines: [
          { t: 53.58, w: [
            { k: '허공을', r: 'heo·gong·eul', rr: 'хо·гон·ыль', ru: 'в пустоте', en: 'the void' },
            { k: '떠도는', r: 'tteo·do·neun', rr: 'тто·до·нын', ru: 'блуждающая', en: 'drifting' },
            { k: '작은', r: 'ja·geun', rr: 'ча·гын', ru: 'маленькая', en: 'tiny' },
            { k: '먼지처럼', r: 'meon·ji·cheo·reom', rr: 'мон·джи·чо·ром', ru: 'как пылинка', en: 'like dust' },
            { k: '작은 먼지처럼', r: 'ja·geun·meon·ji·cheo·reom', rr: 'ча·гын·мон·джи·чо·ром', ru: 'как крошечная пылинка', en: 'like a tiny speck' }
          ] },
          { t: 62.38, w: [
            { k: '날리는', r: 'nal·li·neun', rr: 'наль·ли·нын', ru: 'летящий', en: 'flurrying' },
            { k: '눈이', r: 'nu·ni', rr: 'ну·ни', ru: 'снег', en: 'snow' },
            { k: '나라면', r: 'na·ra·myeon', rr: 'на·ра·мён', ru: 'будь я', en: 'if I were' },
            { k: '조금 더', r: 'jo·geum·deo', rr: 'чо·гым·до', ru: 'чуть больше', en: 'a little more' },
            { k: '빨리', r: 'ppal·li', rr: 'ппаль·ли', ru: 'быстрее', en: 'faster' },
            { k: '네게', r: 'ne·ge', rr: 'не·ге', ru: 'до тебя', en: 'to you' },
            { k: '닿을 수 있을 텐데', r: 'da·eul·ssu·i·sseul·ten·de', rr: 'та·ыль·су·и·ссыль·тхен·де', ru: 'смог бы дотянуться', en: 'could reach' }
          ] }
        ]
      }
    ]
  }
];
