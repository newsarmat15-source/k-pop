/* ===================== УЧЕБНАЯ ПРОГРАММА КОРЕЙСКОГО =====================
   Скелет уровня TOPIK 1 (начинающий) по образцу King Sejong Institute
   «Sejong Korean» 1: Хангыль → первые слова → числа → каждый день.
   Порядок соответствует стандартной беginner-последовательности.

   Блоки урока (type): text | hangul{char,rom,ru,en} | example{kr,rom,ru,en} | tip
   vocab[] — слова в Рабочую тетрадь при завершении.
   Проверочная генерируется автоматически по буквам/словам (см. buildQuiz).
========================================================================= */
window.CURRICULUM = {
  units: [
    {
      id: 'u1', title: { ru: 'Хангыль', en: 'Hangul' },
      lessons: [
        {
          id: 'l1', title: { ru: 'Гласные', en: 'Vowels' },
          goal: { ru: 'Читать 8 базовых гласных', en: 'Read 8 basic vowels' },
          blocks: [
            { type: 'text', ru: 'Корейский пишется слогами-блоками: один блок = один слог. Начнём с гласных — сердца каждого слога.', en: 'Korean is written in syllable blocks: one block = one syllable. We start with vowels — the heart of every syllable.' },
            { type: 'hangul', char: 'ㅏ', rom: 'a', ru: 'как «а»', en: 'like "a" in father' },
            { type: 'hangul', char: 'ㅓ', rom: 'eo', ru: 'открытое «о»', en: 'open "o", like "u" in cup' },
            { type: 'hangul', char: 'ㅗ', rom: 'o', ru: 'как «о»', en: 'like "o" in go' },
            { type: 'hangul', char: 'ㅜ', rom: 'u', ru: 'как «у»', en: 'like "oo" in moon' },
            { type: 'hangul', char: 'ㅡ', rom: 'eu', ru: 'как «ы»', en: 'like "eu", tight lips' },
            { type: 'hangul', char: 'ㅣ', rom: 'i', ru: 'как «и»', en: 'like "ee" in see' },
            { type: 'hangul', char: 'ㅐ', rom: 'ae', ru: 'как «э»', en: 'like "e" in bed' },
            { type: 'hangul', char: 'ㅔ', rom: 'e', ru: 'тоже «э»', en: 'also "e"' },
            { type: 'tip', ru: 'Гласная не пишется одна — впереди немой ㅇ: «а» → 아, «и» → 이.', en: 'A vowel never stands alone — a silent ㅇ goes in front: "a" → 아, "i" → 이.' },
            { type: 'example', kr: '아이', rom: 'a-i', ru: 'ребёнок', en: 'child' },
            { type: 'example', kr: '오이', rom: 'o-i', ru: 'огурец', en: 'cucumber' }
          ],
          vocab: [{ kr: '아이', rom: 'a-i', ru: 'ребёнок', en: 'child' }, { kr: '오이', rom: 'o-i', ru: 'огурец', en: 'cucumber' }]
        },
        {
          id: 'l2', title: { ru: 'Согласные', en: 'Consonants' },
          goal: { ru: 'Собирать слоги согласная + гласная', en: 'Build consonant + vowel syllables' },
          blocks: [
            { type: 'text', ru: 'Слог строится согласная + гласная: 나 = ㄴ(n) + ㅏ(a) = «на».', en: 'A syllable is consonant + vowel: 나 = ㄴ(n) + ㅏ(a) = "na".' },
            { type: 'hangul', char: 'ㄱ', rom: 'g', ru: 'как «г»', en: 'like "g"' },
            { type: 'hangul', char: 'ㄴ', rom: 'n', ru: 'как «н»', en: 'like "n"' },
            { type: 'hangul', char: 'ㄷ', rom: 'd', ru: 'как «д»', en: 'like "d"' },
            { type: 'hangul', char: 'ㄹ', rom: 'r', ru: 'между «р» и «л»', en: 'between "r" and "l"' },
            { type: 'hangul', char: 'ㅁ', rom: 'm', ru: 'как «м»', en: 'like "m"' },
            { type: 'hangul', char: 'ㅂ', rom: 'b', ru: 'как «б»', en: 'like "b"' },
            { type: 'hangul', char: 'ㅅ', rom: 's', ru: 'как «с»', en: 'like "s"' },
            { type: 'hangul', char: 'ㅈ', rom: 'j', ru: 'как «дж»', en: 'like "j"' },
            { type: 'hangul', char: 'ㅎ', rom: 'h', ru: 'как «х»', en: 'like "h"' },
            { type: 'example', kr: '나', rom: 'na', ru: 'я', en: 'I' },
            { type: 'example', kr: '하나', rom: 'ha-na', ru: 'один', en: 'one' },
            { type: 'example', kr: '가방', rom: 'ga-bang', ru: 'сумка', en: 'bag' }
          ],
          vocab: [{ kr: '나', rom: 'na', ru: 'я (неформ.)', en: 'I (casual)' }, { kr: '하나', rom: 'ha-na', ru: 'один', en: 'one' }, { kr: '가방', rom: 'ga-bang', ru: 'сумка', en: 'bag' }]
        },
        {
          id: 'l3', title: { ru: 'Йотированные гласные', en: 'Y-vowels' },
          goal: { ru: 'Читать гласные со звуком «й»', en: 'Read the y-vowels' },
          blocks: [
            { type: 'text', ru: 'Добавь чёрточку — и к гласной добавляется звук «й».', en: 'Add a stroke and the vowel gains a "y" sound.' },
            { type: 'hangul', char: 'ㅑ', rom: 'ya', ru: 'я', en: 'ya' },
            { type: 'hangul', char: 'ㅕ', rom: 'yeo', ru: 'йо (открытое)', en: 'yeo' },
            { type: 'hangul', char: 'ㅛ', rom: 'yo', ru: 'йо', en: 'yo' },
            { type: 'hangul', char: 'ㅠ', rom: 'yu', ru: 'ю', en: 'yu' },
            { type: 'hangul', char: 'ㅖ', rom: 'ye', ru: 'йе', en: 'ye' },
            { type: 'example', kr: '야구', rom: 'ya-gu', ru: 'бейсбол', en: 'baseball' },
            { type: 'example', kr: '여자', rom: 'yeo-ja', ru: 'женщина', en: 'woman' },
            { type: 'example', kr: '우유', rom: 'u-yu', ru: 'молоко', en: 'milk' }
          ],
          vocab: [{ kr: '여자', rom: 'yeo-ja', ru: 'женщина', en: 'woman' }, { kr: '우유', rom: 'u-yu', ru: 'молоко', en: 'milk' }, { kr: '야구', rom: 'ya-gu', ru: 'бейсбол', en: 'baseball' }]
        },
        {
          id: 'l4', title: { ru: 'Двойные согласные', en: 'Double consonants' },
          goal: { ru: 'Читать напряжённые согласные', en: 'Read the tense consonants' },
          blocks: [
            { type: 'text', ru: 'Двойная буква = напряжённый, резкий звук (без придыхания).', en: 'A doubled letter = a tense, sharp sound (no breath).' },
            { type: 'hangul', char: 'ㄲ', rom: 'kk', ru: 'напряжённое «к»', en: 'tense k' },
            { type: 'hangul', char: 'ㄸ', rom: 'tt', ru: 'напряжённое «т»', en: 'tense t' },
            { type: 'hangul', char: 'ㅃ', rom: 'pp', ru: 'напряжённое «п»', en: 'tense p' },
            { type: 'hangul', char: 'ㅆ', rom: 'ss', ru: 'напряжённое «с»', en: 'tense s' },
            { type: 'hangul', char: 'ㅉ', rom: 'jj', ru: 'напряжённое «чж»', en: 'tense j' },
            { type: 'example', kr: '오빠', rom: 'o-ppa', ru: 'старший брат (для девушки)', en: 'older brother (girl→boy)' },
            { type: 'example', kr: '아빠', rom: 'a-ppa', ru: 'папа', en: 'dad' },
            { type: 'example', kr: '꿈', rom: 'kkum', ru: 'мечта / сон', en: 'dream' }
          ],
          vocab: [{ kr: '오빠', rom: 'o-ppa', ru: 'старший брат (девушке)', en: 'older brother (to a girl)' }, { kr: '아빠', rom: 'a-ppa', ru: 'папа', en: 'dad' }, { kr: '꿈', rom: 'kkum', ru: 'мечта / сон', en: 'dream' }]
        },
        {
          id: 'l5', title: { ru: 'Патчхим (нижняя буква)', en: 'Batchim (final)' },
          goal: { ru: 'Читать согласную в конце слога', en: 'Read a final consonant' },
          blocks: [
            { type: 'text', ru: 'Согласная внизу блока = патчхим, звучит в конце слога: 밥 = ㅂ+ㅏ+ㅂ = «пап».', en: 'A consonant at the bottom of the block = batchim, sounded at the syllable end: 밥 = ㅂ+ㅏ+ㅂ = "bap".' },
            { type: 'tip', ru: 'В конце слога звук приглушается: ㄱ/ㅋ/ㄲ → «к», ㅂ/ㅍ → «п», ㄷ/ㅅ/ㅈ/ㅊ/ㅌ/ㅎ → «т».', en: 'At the syllable end sounds are muted: ㄱ/ㅋ/ㄲ → k, ㅂ/ㅍ → p, ㄷ/ㅅ/ㅈ/ㅊ/ㅌ/ㅎ → t.' },
            { type: 'example', kr: '밥', rom: 'bap', ru: 'рис / еда', en: 'rice / meal' },
            { type: 'example', kr: '책', rom: 'chaek', ru: 'книга', en: 'book' },
            { type: 'example', kr: '집', rom: 'jip', ru: 'дом', en: 'house' },
            { type: 'example', kr: '문', rom: 'mun', ru: 'дверь', en: 'door' }
          ],
          vocab: [{ kr: '밥', rom: 'bap', ru: 'рис / еда', en: 'rice / meal' }, { kr: '책', rom: 'chaek', ru: 'книга', en: 'book' }, { kr: '집', rom: 'jip', ru: 'дом', en: 'house' }, { kr: '문', rom: 'mun', ru: 'дверь', en: 'door' }]
        }
      ]
    },
    {
      id: 'u2', title: { ru: 'Первые слова', en: 'First words' },
      lessons: [
        {
          id: 'l6', title: { ru: 'Приветствие', en: 'Greetings' },
          goal: { ru: 'Здороваться вежливо и по-дружески', en: 'Greet politely and casually' },
          blocks: [
            { type: 'text', ru: 'Главное слово: 안녕하세요 — вежливое «здравствуйте», буквально «будьте в мире». В любое время суток.', en: 'The key word: 안녕하세요 — polite "hello", literally "be at peace". Any time of day.' },
            { type: 'example', kr: '안녕하세요', rom: 'annyeong-haseyo', ru: 'Здравствуйте', en: 'Hello (polite)' },
            { type: 'example', kr: '안녕', rom: 'annyeong', ru: 'Привет / пока (друзьям)', en: 'Hi / bye (casual)' },
            { type: 'example', kr: '감사합니다', rom: 'gamsa-hamnida', ru: 'Спасибо (вежливо)', en: 'Thank you (polite)' },
            { type: 'example', kr: '고마워', rom: 'go-ma-wo', ru: 'Спасибо (по-дружески)', en: 'Thanks (casual)' },
            { type: 'tip', ru: 'Вежливая речь = 존댓말, дружеская = 반말. С айдолом вы начнёте на 존댓말 и перейдёте на 반말 по мере близости.', en: 'Polite speech = 존댓말, casual = 반말. With your idol you start polite and shift to casual as you get closer.' }
          ],
          vocab: [{ kr: '안녕하세요', rom: 'annyeonghaseyo', ru: 'здравствуйте', en: 'hello (polite)' }, { kr: '안녕', rom: 'annyeong', ru: 'привет / пока', en: 'hi / bye' }, { kr: '감사합니다', rom: 'gamsahamnida', ru: 'спасибо (вежл.)', en: 'thank you (polite)' }, { kr: '고마워', rom: 'gomawo', ru: 'спасибо (друж.)', en: 'thanks (casual)' }]
        },
        {
          id: 'l7', title: { ru: 'Я и моё имя', en: 'Me and my name' },
          goal: { ru: 'Представиться по-корейски', en: 'Introduce yourself' },
          blocks: [
            { type: 'text', ru: '«Я ___» = 저는 ___이에요/예요. 저 — вежливое «я». После согласной — 이에요, после гласной — 예요.', en: '"I am ___" = 저는 ___이에요/예요. 저 is polite "I". After a consonant — 이에요, after a vowel — 예요.' },
            { type: 'example', kr: '저는 하루예요', rom: 'jeoneun Haru-yeyo', ru: 'Я Хару', en: "I'm Haru" },
            { type: 'example', kr: '저는 민준이에요', rom: 'jeoneun Minjun-ieyo', ru: 'Я Минджун', en: "I'm Minjun" },
            { type: 'example', kr: '이름이 뭐예요?', rom: 'ireum-i mwo-yeyo', ru: 'Как тебя зовут?', en: "What's your name?" },
            { type: 'tip', ru: 'Открой чат с айдолом и напиши: 저는 [имя]예요.', en: 'Open the chat and type: 저는 [name]예요.' }
          ],
          vocab: [{ kr: '저', rom: 'jeo', ru: 'я (вежл.)', en: 'I (polite)' }, { kr: '이름', rom: 'ireum', ru: 'имя', en: 'name' }, { kr: '뭐', rom: 'mwo', ru: 'что', en: 'what' }]
        },
        {
          id: 'l8', title: { ru: 'Откуда ты', en: 'Where are you from' },
          goal: { ru: 'Сказать про страну и людей', en: 'Talk about country and people' },
          blocks: [
            { type: 'text', ru: 'Страна + 사람 = человек оттуда: 한국 사람 = кореец.', en: 'Country + 사람 = person from there: 한국 사람 = a Korean.' },
            { type: 'example', kr: '한국', rom: 'han-guk', ru: 'Корея', en: 'Korea' },
            { type: 'example', kr: '사람', rom: 'sa-ram', ru: 'человек', en: 'person' },
            { type: 'example', kr: '나라', rom: 'na-ra', ru: 'страна', en: 'country' },
            { type: 'example', kr: '어느 나라 사람이에요?', rom: 'eoneu nara saram-ieyo', ru: 'Из какой ты страны?', en: 'Which country are you from?' }
          ],
          vocab: [{ kr: '한국', rom: 'han-guk', ru: 'Корея', en: 'Korea' }, { kr: '사람', rom: 'sa-ram', ru: 'человек', en: 'person' }, { kr: '나라', rom: 'na-ra', ru: 'страна', en: 'country' }]
        },
        {
          id: 'l9', title: { ru: 'Да, нет, извини', en: 'Yes, no, sorry' },
          goal: { ru: 'Базовые ответы вежливо', en: 'Basic polite responses' },
          blocks: [
            { type: 'example', kr: '네', rom: 'ne', ru: 'да', en: 'yes' },
            { type: 'example', kr: '아니요', rom: 'a-ni-yo', ru: 'нет', en: 'no' },
            { type: 'example', kr: '죄송합니다', rom: 'joe-song-hamnida', ru: 'извините (вежливо)', en: 'sorry (polite)' },
            { type: 'example', kr: '괜찮아요', rom: 'gwaen-chan-ayo', ru: 'всё в порядке', en: "it's okay" },
            { type: 'tip', ru: '네 также значит «слушаю/понял» — корейцы часто повторяют 네, 네.', en: '네 also means "yes, I hear you" — Koreans often repeat 네, 네.' }
          ],
          vocab: [{ kr: '네', rom: 'ne', ru: 'да', en: 'yes' }, { kr: '아니요', rom: 'aniyo', ru: 'нет', en: 'no' }, { kr: '죄송합니다', rom: 'joesonghamnida', ru: 'извините', en: 'sorry' }, { kr: '괜찮아요', rom: 'gwaenchanayo', ru: 'всё в порядке', en: "it's okay" }]
        }
      ]
    },
    {
      id: 'u3', title: { ru: 'Числа', en: 'Numbers' },
      lessons: [
        {
          id: 'l10', title: { ru: 'Родные числа 1–10', en: 'Native numbers 1–10' },
          goal: { ru: 'Считать до десяти', en: 'Count to ten' },
          blocks: [
            { type: 'text', ru: 'Родными числами считают предметы, людей, возраст, часы.', en: 'Native numbers count things, people, age, hours.' },
            { type: 'example', kr: '하나', rom: 'hana', ru: 'один', en: 'one' },
            { type: 'example', kr: '둘', rom: 'dul', ru: 'два', en: 'two' },
            { type: 'example', kr: '셋', rom: 'set', ru: 'три', en: 'three' },
            { type: 'example', kr: '넷', rom: 'net', ru: 'четыре', en: 'four' },
            { type: 'example', kr: '다섯', rom: 'daseot', ru: 'пять', en: 'five' },
            { type: 'example', kr: '여섯', rom: 'yeoseot', ru: 'шесть', en: 'six' },
            { type: 'example', kr: '일곱', rom: 'ilgop', ru: 'семь', en: 'seven' },
            { type: 'example', kr: '여덟', rom: 'yeodeol', ru: 'восемь', en: 'eight' },
            { type: 'example', kr: '아홉', rom: 'ahop', ru: 'девять', en: 'nine' },
            { type: 'example', kr: '열', rom: 'yeol', ru: 'десять', en: 'ten' }
          ],
          vocab: [{ kr: '하나', rom: 'hana', ru: 'один', en: 'one' }, { kr: '둘', rom: 'dul', ru: 'два', en: 'two' }, { kr: '셋', rom: 'set', ru: 'три', en: 'three' }, { kr: '다섯', rom: 'daseot', ru: 'пять', en: 'five' }, { kr: '열', rom: 'yeol', ru: 'десять', en: 'ten' }]
        },
        {
          id: 'l11', title: { ru: 'Китайские числа', en: 'Sino-Korean numbers' },
          goal: { ru: 'Числа для денег, дат, телефонов', en: 'Numbers for money, dates, phones' },
          blocks: [
            { type: 'text', ru: 'Второй набор — китайского происхождения. Ими называют деньги, даты, номера, минуты.', en: 'The second set is Sino-Korean. Used for money, dates, phone numbers, minutes.' },
            { type: 'example', kr: '일', rom: 'il', ru: 'один (1)', en: 'one (1)' },
            { type: 'example', kr: '이', rom: 'i', ru: 'два (2)', en: 'two (2)' },
            { type: 'example', kr: '삼', rom: 'sam', ru: 'три (3)', en: 'three (3)' },
            { type: 'example', kr: '사', rom: 'sa', ru: 'четыре (4)', en: 'four (4)' },
            { type: 'example', kr: '오', rom: 'o', ru: 'пять (5)', en: 'five (5)' },
            { type: 'example', kr: '십', rom: 'sip', ru: 'десять (10)', en: 'ten (10)' },
            { type: 'example', kr: '백', rom: 'baek', ru: 'сто (100)', en: 'hundred (100)' },
            { type: 'example', kr: '천', rom: 'cheon', ru: 'тысяча (1000)', en: 'thousand (1000)' }
          ],
          vocab: [{ kr: '일', rom: 'il', ru: 'один (кит.)', en: 'one (Sino)' }, { kr: '이', rom: 'i', ru: 'два (кит.)', en: 'two (Sino)' }, { kr: '삼', rom: 'sam', ru: 'три (кит.)', en: 'three (Sino)' }, { kr: '백', rom: 'baek', ru: 'сто', en: 'hundred' }, { kr: '천', rom: 'cheon', ru: 'тысяча', en: 'thousand' }]
        },
        {
          id: 'l12', title: { ru: 'Возраст и время', en: 'Age and time' },
          goal: { ru: 'Спросить возраст и который час', en: 'Ask age and the time' },
          blocks: [
            { type: 'text', ru: 'Возраст и часы — родными числами + счётчик 살 (лет), 시 (час).', en: 'Age and hours use native numbers + counters 살 (years), 시 (o’clock).' },
            { type: 'example', kr: '몇 살이에요?', rom: 'myeot sal-ieyo', ru: 'Сколько тебе лет?', en: 'How old are you?' },
            { type: 'example', kr: '스무 살', rom: 'seu-mu sal', ru: '20 лет', en: '20 years old' },
            { type: 'example', kr: '몇 시예요?', rom: 'myeot si-yeyo', ru: 'Который час?', en: 'What time is it?' },
            { type: 'example', kr: '지금', rom: 'ji-geum', ru: 'сейчас', en: 'now' }
          ],
          vocab: [{ kr: '몇', rom: 'myeot', ru: 'сколько', en: 'how many' }, { kr: '살', rom: 'sal', ru: 'лет (счётчик)', en: 'years old (counter)' }, { kr: '시', rom: 'si', ru: 'час', en: "o'clock" }, { kr: '지금', rom: 'ji-geum', ru: 'сейчас', en: 'now' }]
        }
      ]
    },
    {
      id: 'u4', title: { ru: 'Каждый день', en: 'Everyday' },
      lessons: [
        {
          id: 'l13', title: { ru: 'Это и то', en: 'This and that' },
          goal: { ru: 'Показывать на предметы', en: 'Point at things' },
          blocks: [
            { type: 'text', ru: '이거 — это (у меня), 그거 — то (у тебя), 저거 — то (вдалеке).', en: '이거 — this (by me), 그거 — that (by you), 저거 — that (over there).' },
            { type: 'example', kr: '이거', rom: 'i-geo', ru: 'это', en: 'this' },
            { type: 'example', kr: '그거', rom: 'geu-geo', ru: 'то (рядом с тобой)', en: 'that (by you)' },
            { type: 'example', kr: '저거', rom: 'jeo-geo', ru: 'то (вдалеке)', en: 'that (over there)' },
            { type: 'example', kr: '이거 뭐예요?', rom: 'i-geo mwo-yeyo', ru: 'Что это?', en: 'What is this?' }
          ],
          vocab: [{ kr: '이거', rom: 'i-geo', ru: 'это', en: 'this' }, { kr: '그거', rom: 'geu-geo', ru: 'то (у тебя)', en: 'that (by you)' }, { kr: '저거', rom: 'jeo-geo', ru: 'то (вдалеке)', en: 'that (yonder)' }]
        },
        {
          id: 'l14', title: { ru: 'Есть и нет', en: 'Have and don’t have' },
          goal: { ru: 'Сказать «есть» / «нет»', en: 'Say there is / isn’t' },
          blocks: [
            { type: 'text', ru: '있어요 — есть / имеется, 없어요 — нет / отсутствует. Одна пара на всё.', en: '있어요 — there is / I have, 없어요 — there isn’t / I don’t have. One pair for everything.' },
            { type: 'example', kr: '있어요', rom: 'iss-eoyo', ru: 'есть / имеется', en: 'there is / have' },
            { type: 'example', kr: '없어요', rom: 'eops-eoyo', ru: 'нет / отсутствует', en: "there isn't / don't have" },
            { type: 'example', kr: '시간 있어요?', rom: 'sigan iss-eoyo', ru: 'Есть время?', en: 'Do you have time?' },
            { type: 'example', kr: '물', rom: 'mul', ru: 'вода', en: 'water' }
          ],
          vocab: [{ kr: '있어요', rom: 'isseoyo', ru: 'есть / имеется', en: 'there is / have' }, { kr: '없어요', rom: 'eopseoyo', ru: 'нет / отсутствует', en: "isn't / don't have" }, { kr: '물', rom: 'mul', ru: 'вода', en: 'water' }]
        },
        {
          id: 'l15', title: { ru: 'Простые глаголы', en: 'Simple verbs' },
          goal: { ru: 'Настоящее время -아요/어요', en: 'Present tense -아요/어요' },
          blocks: [
            { type: 'text', ru: 'Вежливое настоящее время: основа + 아요/어요. 가다 (идти) → 가요.', en: 'Polite present: stem + 아요/어요. 가다 (to go) → 가요.' },
            { type: 'example', kr: '가요', rom: 'ga-yo', ru: 'иду / идёт', en: 'go / goes' },
            { type: 'example', kr: '먹어요', rom: 'meog-eoyo', ru: 'ем / ест', en: 'eat / eats' },
            { type: 'example', kr: '해요', rom: 'hae-yo', ru: 'делаю / делает', en: 'do / does' },
            { type: 'example', kr: '자요', rom: 'ja-yo', ru: 'сплю / спит', en: 'sleep / sleeps' },
            { type: 'tip', ru: 'Одна форма — и «я», и «ты», и «он»: контекст решает. Порядок слов: кто → что → глагол в конце.', en: 'One form covers I / you / he — context decides. Word order: who → what → verb last.' }
          ],
          vocab: [{ kr: '가요', rom: 'ga-yo', ru: 'идти', en: 'to go' }, { kr: '먹어요', rom: 'meog-eoyo', ru: 'есть (кушать)', en: 'to eat' }, { kr: '해요', rom: 'hae-yo', ru: 'делать', en: 'to do' }, { kr: '자요', rom: 'ja-yo', ru: 'спать', en: 'to sleep' }]
        }
      ]
    }
  ]
};
