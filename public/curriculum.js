/* ===================== УЧЕБНАЯ ПРОГРАММА КОРЕЙСКОГО =====================
   Скелет уровня TOPIK 1 / начало (хангыль → приветствия → представление → числа).
   Последовательность соответствует стандартному порядку начинающего
   (Sejong Korean / TTMIK level 1 / TOPIK I). Расширяется юнитами.

   Схема блока урока (type):
     text     — объяснение учителя
     hangul   — крупный символ: {char, rom, ru, en}
     example  — пример: {kr, rom, ru, en}
     tip      — заметка/лайфхак
   vocab[] — слова, которые падают в Рабочую тетрадь при завершении урока
   quiz[]  — мини-проверка: {q:{ru,en}, opts:[...], answer:index}
========================================================================= */
window.CURRICULUM = {
  units: [
    {
      id: 'u1',
      title: { ru: 'Основы', en: 'Basics' },
      lessons: [
        {
          id: 'l1',
          title: { ru: 'Хангыль: гласные', en: 'Hangul: vowels' },
          goal: { ru: 'Читать 8 базовых гласных', en: 'Read 8 basic vowels' },
          blocks: [
            { type: 'text', ru: 'Корейский пишется не буквами в ряд, а слогами-блоками. Один блок = один слог. Начнём с гласных — это сердце каждого слога.', en: 'Korean is written in syllable blocks, not letters in a row. One block = one syllable. We start with vowels — the heart of every syllable.' },
            { type: 'hangul', char: 'ㅏ', rom: 'a', ru: 'как «а» в «мама»', en: 'like "a" in "father"' },
            { type: 'hangul', char: 'ㅓ', rom: 'eo', ru: 'среднее между «о» и «а»', en: 'open "o", like "u" in "cup"' },
            { type: 'hangul', char: 'ㅗ', rom: 'o', ru: 'как «о» в «кот»', en: 'like "o" in "go"' },
            { type: 'hangul', char: 'ㅜ', rom: 'u', ru: 'как «у» в «зуб»', en: 'like "oo" in "moon"' },
            { type: 'hangul', char: 'ㅡ', rom: 'eu', ru: 'как «ы», но глубже в горле', en: 'like "eu", tight lips' },
            { type: 'hangul', char: 'ㅣ', rom: 'i', ru: 'как «и» в «мир»', en: 'like "ee" in "see"' },
            { type: 'hangul', char: 'ㅐ', rom: 'ae', ru: 'как «э»', en: 'like "e" in "bed"' },
            { type: 'hangul', char: 'ㅔ', rom: 'e', ru: 'тоже «э» (почти как ㅐ)', en: 'also "e" (nearly same as ㅐ)' },
            { type: 'tip', ru: 'Гласная не пишется одна — впереди ставят немой кружок ㅇ. Так «а» становится 아, «и» → 이.', en: 'A vowel never stands alone — a silent ㅇ goes in front. So "a" becomes 아, "i" → 이.' },
            { type: 'example', kr: '아이', rom: 'a-i', ru: 'ребёнок', en: 'child' }
          ],
          vocab: [{ kr: '아이', rom: 'a-i', ru: 'ребёнок', en: 'child' }],
          quiz: [
            { q: { ru: 'Как читается ㅏ?', en: 'How is ㅏ read?' }, opts: ['a', 'o', 'u'], answer: 0 },
            { q: { ru: 'Зачем немой ㅇ перед гласной?', en: 'Why the silent ㅇ before a vowel?' }, opts: [{ ru: 'Гласная не пишется одна', en: 'A vowel can’t stand alone' }, { ru: 'Это буква «н»', en: 'It’s the letter "n"' }, { ru: 'Для красоты', en: 'Just decoration' }], answer: 0 }
          ]
        },
        {
          id: 'l2',
          title: { ru: 'Хангыль: согласные', en: 'Hangul: consonants' },
          goal: { ru: 'Собирать слоги из согласной + гласной', en: 'Build syllables from consonant + vowel' },
          blocks: [
            { type: 'text', ru: 'Теперь согласные. Слог строится слева-направо или сверху-вниз: согласная + гласная. 나 = ㄴ(n) + ㅏ(a) = «на».', en: 'Now consonants. A syllable is built left-to-right or top-to-bottom: consonant + vowel. 나 = ㄴ(n) + ㅏ(a) = "na".' },
            { type: 'hangul', char: 'ㄱ', rom: 'g/k', ru: 'как «г», в конце слога «к»', en: 'like "g", "k" at syllable end' },
            { type: 'hangul', char: 'ㄴ', rom: 'n', ru: 'как «н»', en: 'like "n"' },
            { type: 'hangul', char: 'ㄷ', rom: 'd/t', ru: 'как «д»', en: 'like "d"' },
            { type: 'hangul', char: 'ㄹ', rom: 'r/l', ru: 'между «р» и «л»', en: 'between "r" and "l"' },
            { type: 'hangul', char: 'ㅁ', rom: 'm', ru: 'как «м»', en: 'like "m"' },
            { type: 'hangul', char: 'ㅂ', rom: 'b/p', ru: 'как «б»', en: 'like "b"' },
            { type: 'hangul', char: 'ㅅ', rom: 's', ru: 'как «с»', en: 'like "s"' },
            { type: 'hangul', char: 'ㅎ', rom: 'h', ru: 'как «х»', en: 'like "h"' },
            { type: 'example', kr: '나', rom: 'na', ru: 'я', en: 'I / me' },
            { type: 'example', kr: '하나', rom: 'ha-na', ru: 'один', en: 'one' },
            { type: 'tip', ru: 'Читай вслух: 가 ga, 다 da, 마 ma, 사 sa. Ты уже читаешь по-корейски!', en: 'Read aloud: 가 ga, 다 da, 마 ma, 사 sa. You are already reading Korean!' }
          ],
          vocab: [
            { kr: '나', rom: 'na', ru: 'я (неформ.)', en: 'I (casual)' },
            { kr: '하나', rom: 'ha-na', ru: 'один', en: 'one' }
          ],
          quiz: [
            { q: { ru: 'Как читается 나?', en: 'How is 나 read?' }, opts: ['na', 'ma', 'ga'], answer: 0 },
            { q: { ru: 'Какая буква звучит как «м»?', en: 'Which letter sounds like "m"?' }, opts: ['ㅁ', 'ㄴ', 'ㅅ'], answer: 0 }
          ]
        },
        {
          id: 'l3',
          title: { ru: 'Приветствие', en: 'Greetings' },
          goal: { ru: 'Здороваться вежливо и по-дружески', en: 'Greet politely and casually' },
          blocks: [
            { type: 'text', ru: 'Главное слово в Корее: 안녕하세요 (annyeonghaseyo) — вежливое «здравствуйте», буквально «будьте в мире». Работает в любое время суток.', en: 'The key Korean word: 안녕하세요 (annyeonghaseyo) — polite "hello", literally "be at peace". Works any time of day.' },
            { type: 'example', kr: '안녕하세요!', rom: 'annyeong-haseyo', ru: 'Здравствуйте!', en: 'Hello! (polite)' },
            { type: 'example', kr: '안녕!', rom: 'annyeong', ru: 'Привет! (друзьям)', en: 'Hi! (to friends)' },
            { type: 'example', kr: '감사합니다', rom: 'gamsa-hamnida', ru: 'Спасибо (вежливо)', en: 'Thank you (polite)' },
            { type: 'example', kr: '고마워', rom: 'gomawo', ru: 'Спасибо (по-дружески)', en: 'Thanks (casual)' },
            { type: 'tip', ru: 'Вежливая речь = 존댓말, дружеская = 반말. С айдолом вы начнёте на 존댓말, а по мере близости перейдёте на 반말 — это и есть рост ваших отношений.', en: 'Polite speech = 존댓말, casual = 반말. With your idol you start on 존댓말 and shift to 반말 as you get closer — that shift IS your growing bond.' }
          ],
          vocab: [
            { kr: '안녕하세요', rom: 'annyeonghaseyo', ru: 'здравствуйте', en: 'hello (polite)' },
            { kr: '안녕', rom: 'annyeong', ru: 'привет / пока', en: 'hi / bye (casual)' },
            { kr: '감사합니다', rom: 'gamsahamnida', ru: 'спасибо (вежл.)', en: 'thank you (polite)' },
            { kr: '고마워', rom: 'gomawo', ru: 'спасибо (друж.)', en: 'thanks (casual)' },
            { kr: '네', rom: 'ne', ru: 'да', en: 'yes' },
            { kr: '아니요', rom: 'aniyo', ru: 'нет', en: 'no' }
          ],
          quiz: [
            { q: { ru: 'Как поздороваться с другом?', en: 'How do you greet a friend?' }, opts: ['안녕', '안녕하세요', '감사합니다'], answer: 0 },
            { q: { ru: '감사합니다 значит…', en: '감사합니다 means…' }, opts: [{ ru: 'Спасибо', en: 'Thank you' }, { ru: 'Привет', en: 'Hello' }, { ru: 'Нет', en: 'No' }], answer: 0 }
          ]
        },
        {
          id: 'l4',
          title: { ru: 'Я и моё имя', en: 'Me and my name' },
          goal: { ru: 'Представиться по-корейски', en: 'Introduce yourself in Korean' },
          blocks: [
            { type: 'text', ru: 'Представиться просто: 저는 ___이에요/예요 = «Я ___». 저 (jeo) — вежливое «я». Окончание зависит от последнего звука имени: после согласной — 이에요, после гласной — 예요.', en: 'Introducing yourself is easy: 저는 ___이에요/예요 = "I am ___". 저 (jeo) is the polite "I". The ending depends on the name’s last sound: after a consonant — 이에요, after a vowel — 예요.' },
            { type: 'example', kr: '저는 하루예요', rom: 'jeoneun Haru-yeyo', ru: 'Я Хару (имя на гласную)', en: 'I’m Haru (name ends in a vowel)' },
            { type: 'example', kr: '저는 민준이에요', rom: 'jeoneun Minjun-ieyo', ru: 'Я Минджун (имя на согласную)', en: 'I’m Minjun (name ends in a consonant)' },
            { type: 'example', kr: '이름이 뭐예요?', rom: 'ireum-i mwoyeyo', ru: 'Как тебя зовут? (букв. «имя что?»)', en: 'What’s your name? (lit. "name is what?")' },
            { type: 'tip', ru: 'Открой чат с айдолом и напиши: 저는 [твоё имя]예요. Он ответит и спросит своё.', en: 'Open the chat with your idol and type: 저는 [your name]예요. He’ll reply and ask back.' }
          ],
          vocab: [
            { kr: '저', rom: 'jeo', ru: 'я (вежл.)', en: 'I (polite)' },
            { kr: '이름', rom: 'ireum', ru: 'имя', en: 'name' },
            { kr: '뭐', rom: 'mwo', ru: 'что', en: 'what' },
            { kr: '이에요/예요', rom: 'ieyo/yeyo', ru: '«есть / являюсь»', en: '"am / is"' }
          ],
          quiz: [
            { q: { ru: '«Я Хару» (имя на гласную) — это…', en: '"I’m Haru" (vowel-ending) is…' }, opts: ['저는 하루예요', '저는 하루이에요', '이름이 뭐예요'], answer: 0 },
            { q: { ru: '이름 значит…', en: '이름 means…' }, opts: [{ ru: 'Имя', en: 'Name' }, { ru: 'Что', en: 'What' }, { ru: 'Я', en: 'I' }], answer: 0 }
          ]
        },
        {
          id: 'l5',
          title: { ru: 'Числа 1–5', en: 'Numbers 1–5' },
          goal: { ru: 'Считать до пяти (родные числа)', en: 'Count to five (native numbers)' },
          blocks: [
            { type: 'text', ru: 'В корейском два набора чисел. Начнём с родных — ими считают предметы, возраст, часы. Вот первые пять.', en: 'Korean has two number sets. We start with native numbers — used for counting things, age, hours. Here are the first five.' },
            { type: 'example', kr: '하나', rom: 'hana', ru: 'один', en: 'one' },
            { type: 'example', kr: '둘', rom: 'dul', ru: 'два', en: 'two' },
            { type: 'example', kr: '셋', rom: 'set', ru: 'три', en: 'three' },
            { type: 'example', kr: '넷', rom: 'net', ru: 'четыре', en: 'four' },
            { type: 'example', kr: '다섯', rom: 'daseot', ru: 'пять', en: 'five' },
            { type: 'tip', ru: 'Считай пальцы вслух: 하나, 둘, 셋, 넷, 다섯. Эти числа услышишь в песнях на счёт «раз-два-три».', en: 'Count your fingers aloud: 하나, 둘, 셋, 넷, 다섯. You’ll hear these in songs counting "one-two-three".' }
          ],
          vocab: [
            { kr: '하나', rom: 'hana', ru: 'один', en: 'one' },
            { kr: '둘', rom: 'dul', ru: 'два', en: 'two' },
            { kr: '셋', rom: 'set', ru: 'три', en: 'three' },
            { kr: '넷', rom: 'net', ru: 'четыре', en: 'four' },
            { kr: '다섯', rom: 'daseot', ru: 'пять', en: 'five' }
          ],
          quiz: [
            { q: { ru: 'Как будет «три»?', en: 'How do you say "three"?' }, opts: ['셋', '둘', '다섯'], answer: 0 },
            { q: { ru: '다섯 — это…', en: '다섯 is…' }, opts: [{ ru: 'Пять', en: 'Five' }, { ru: 'Два', en: 'Two' }, { ru: 'Один', en: 'One' }], answer: 0 }
          ]
        }
      ]
    }
  ]
};
