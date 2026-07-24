/* ===================== УЧЕБНАЯ ПРОГРАММА КОРЕЙСКОГО =====================
   Скелет уровня TOPIK I (начинающий) по образцу King Sejong Institute
   «Sejong Korean» 1: Хангыль → первые слова → числа → каждый день.

   Хангыль разбит на СЕКТОРЫ (sector), а не на «просто уроки». Сектор — это
   единица карты алфавита (см. openHangulMap в app.js): пользователь видит все
   40 букв сразу и своё положение на них. Порядок секторов — стандартная
   последовательность Sejong: простые гласные → простые согласные →
   йотированные → придыхательные → напряжённые → дифтонги → патчхим.

   Всего 40 букв-чамо: 21 гласная + 19 согласных.
     v-basic  8   ㅏㅓㅗㅜㅡㅣㅐㅔ
     c-plain 10   ㄱㄴㄷㄹㅁㅂㅅㅇㅈㅎ
     v-y      6   ㅑㅕㅛㅠㅒㅖ
     c-asp    4   ㅋㅌㅍㅊ
     c-tense  5   ㄲㄸㅃㅆㅉ
     v-diph   7   ㅘㅙㅚㅝㅞㅟㅢ
     batchim  —   не новые буквы, а позиция: сектор правил (7 финальных звуков)

   Блоки урока (type):
     text | hangul{char,rom,cyr,ru,en,ex} | example{kr,rom,cyr,ru,en} | tip |
     win{ru,en}         — «что ты теперь умеешь», ощутимый результат
     batchim{g,chars,ru,en} — группа финальных звуков

   ТРАНСКРИПЦИЯ. rom — латиница, cyr — кириллица. Оба поля НЕ придуманы руками:
   значения сняты с движка произношения lib/ko-g2p.js (transcribeLatin /
   transcribeCyrillic) — того же, что размечает строки песен. Отличие одно,
   косметическое: движок разделяет слоги «·», здесь «-» (так исторически
   записаны примеры в курсе). Если правишь пример — прогоняй слово через
   движок, а не пиши на слух, иначе урок и песня разойдутся.
   cyr у буквы — звук в НАЧАЛЕ слога (как в CYR_CHO/CYR_JUNG движка);
   позиционные оговорки («в конце слога — к») вынесены в пояснение ru.
   ex{kr,rom,cyr,ru,en} — слово-пример на конкретную букву. В интервальное
   повторение эти слова НЕ заводятся намеренно: 40 новых слов утопили бы
   очередь распевки из 5 карточек. Учебные слова идут через vocab[].
   vocab[] — слова в Рабочую тетрадь при завершении.
   Проверочная генерируется автоматически по буквам/словам (см. buildQuiz).
========================================================================= */
window.CURRICULUM = {
  units: [
    {
      id: 'u1', title: { ru: 'Хангыль', en: 'Hangul' },
      lessons: [
        {
          id: 'l1', sector: 'v-basic', title: { ru: 'Простые гласные', en: 'Basic vowels' },
          goal: { ru: 'Читать 8 базовых гласных', en: 'Read 8 basic vowels' },
          blocks: [
            { type: 'text', ru: 'Корейский пишется слогами-блоками: один блок = один слог. Начнём с гласных — сердца каждого слога.', en: 'Korean is written in syllable blocks: one block = one syllable. We start with vowels — the heart of every syllable.' },
            { type: 'hangul', char: 'ㅏ', rom: 'a', cyr: 'а', ru: 'как «а»', en: 'like "a" in father', ex: { kr: '아이', rom: 'a-i', cyr: 'а-и', ru: 'ребёнок', en: 'child' } },
            { type: 'hangul', char: 'ㅓ', rom: 'eo', cyr: 'о', ru: 'открытое «о»: рот шире, губы не округляй', en: 'open "o", like "u" in cup', ex: { kr: '어디', rom: 'eo-di', cyr: 'о-ди', ru: 'где', en: 'where' } },
            { type: 'hangul', char: 'ㅗ', rom: 'o', cyr: 'о', ru: 'как «о», губы округлены', en: 'like "o" in go', ex: { kr: '오이', rom: 'o-i', cyr: 'о-и', ru: 'огурец', en: 'cucumber' } },
            { type: 'hangul', char: 'ㅜ', rom: 'u', cyr: 'у', ru: 'как «у»', en: 'like "oo" in moon', ex: { kr: '우유', rom: 'u-yu', cyr: 'у-ю', ru: 'молоко', en: 'milk' } },
            { type: 'hangul', char: 'ㅡ', rom: 'eu', cyr: 'ы', ru: 'как «ы», губы растянуты', en: 'like "eu", tight lips', ex: { kr: '그림', rom: 'geu-rim', cyr: 'кы-рим', ru: 'рисунок', en: 'picture' } },
            { type: 'hangul', char: 'ㅣ', rom: 'i', cyr: 'и', ru: 'как «и»', en: 'like "ee" in see', ex: { kr: '이름', rom: 'i-reum', cyr: 'и-рым', ru: 'имя', en: 'name' } },
            { type: 'hangul', char: 'ㅐ', rom: 'ae', cyr: 'э', ru: 'как «э» в «этот»', en: 'like "e" in bed', ex: { kr: '개', rom: 'gae', cyr: 'кэ', ru: 'собака', en: 'dog' } },
            { type: 'hangul', char: 'ㅔ', rom: 'e', cyr: 'е', ru: 'тоже «э» — на слух от ㅐ не отличается', en: 'also "e"', ex: { kr: '네', rom: 'ne', cyr: 'не', ru: 'да', en: 'yes' } },
            { type: 'tip', ru: 'Гласная не пишется одна — впереди немой ㅇ: «а» → 아, «и» → 이.', en: 'A vowel never stands alone — a silent ㅇ goes in front: "a" → 아, "i" → 이.' },
            { type: 'example', kr: '아이', rom: 'a-i', cyr: 'а-и', ru: 'ребёнок', en: 'child' },
            { type: 'example', kr: '오이', rom: 'o-i', cyr: 'о-и', ru: 'огурец', en: 'cucumber' },
            { type: 'win', ru: 'Половина любого корейского слога — гласная. Ты только что закрыл(а) эту половину для 8 самых частых звуков.', en: 'Half of every Korean syllable is a vowel. You just covered that half for the 8 most common sounds.' }
          ],
          vocab: [{ kr: '아이', rom: 'a-i', ru: 'ребёнок', en: 'child' }, { kr: '오이', rom: 'o-i', ru: 'огурец', en: 'cucumber' }]
        },
        {
          id: 'l2', sector: 'c-plain', title: { ru: 'Простые согласные', en: 'Plain consonants' },
          goal: { ru: 'Собирать слоги согласная + гласная', en: 'Build consonant + vowel syllables' },
          blocks: [
            { type: 'text', ru: 'Слог строится согласная + гласная: 나 = ㄴ(n) + ㅏ(a) = «на».', en: 'A syllable is consonant + vowel: 나 = ㄴ(n) + ㅏ(a) = "na".' },
            { type: 'hangul', char: 'ㄱ', rom: 'g', cyr: 'к', ru: 'в начале слова и отдельно — глухая «к» (без голоса); между гласными звончает в «г»; в конце слога — «к»', en: 'voiceless "k" at the start of a word; softens to "g" between vowels; "k" at the end of a syllable', ex: { kr: '가방', rom: 'ga-bang', cyr: 'ка-бан', ru: 'сумка', en: 'bag' } },
            { type: 'hangul', char: 'ㄴ', rom: 'n', cyr: 'н', ru: 'как «н»', en: 'like "n"', ex: { kr: '나', rom: 'na', cyr: 'на', ru: 'я', en: 'I' } },
            { type: 'hangul', char: 'ㄷ', rom: 'd', cyr: 'т', ru: 'в начале слова и отдельно — глухая «т»; между гласными звончает в «д»; в конце слога — «т»', en: 'voiceless "t" at the start of a word; softens to "d" between vowels; "t" at the end of a syllable', ex: { kr: '다리', rom: 'da-ri', cyr: 'та-ри', ru: 'нога / мост', en: 'leg / bridge' } },
            { type: 'hangul', char: 'ㄹ', rom: 'r', cyr: 'р', ru: 'между «р» и «л»; в конце слога — мягкое «ль»', en: 'between "r" and "l"; soft "l" at the end', ex: { kr: '라면', rom: 'ra-myeon', cyr: 'ра-мён', ru: 'рамён (лапша)', en: 'ramyeon' } },
            { type: 'hangul', char: 'ㅁ', rom: 'm', cyr: 'м', ru: 'как «м»', en: 'like "m"', ex: { kr: '물', rom: 'mul', cyr: 'муль', ru: 'вода', en: 'water' } },
            { type: 'hangul', char: 'ㅂ', rom: 'b', cyr: 'п', ru: 'в начале слова и отдельно — глухая «п»; между гласными звончает в «б»; в конце слога — «п»', en: 'voiceless "p" at the start of a word; softens to "b" between vowels; "p" at the end of a syllable', ex: { kr: '밥', rom: 'bap', cyr: 'пап', ru: 'рис / еда', en: 'rice / meal' } },
            { type: 'hangul', char: 'ㅅ', rom: 's', cyr: 'с', ru: 'как «с»; перед «и» смягчается в «щ»', en: 'like "s"; softens to "sh" before "i"', ex: { kr: '사람', rom: 'sa-ram', cyr: 'са-рам', ru: 'человек', en: 'person' } },
            { type: 'hangul', char: 'ㅇ', rom: 'ng', cyr: '—', ru: 'в начале слога не читается, внизу — носовое «н»', en: 'silent on top, "ng" at the bottom', ex: { kr: '사랑', rom: 'sa-rang', cyr: 'са-ран', ru: 'любовь', en: 'love' } },
            { type: 'hangul', char: 'ㅈ', rom: 'j', cyr: 'ч', ru: 'в начале слова и отдельно — глухая «ч» (тя); между гласными звончает в «дж»', en: 'voiceless "ch" (as in "cheese") at the start of a word; softens to "j" between vowels', ex: { kr: '지금', rom: 'ji-geum', cyr: 'чи-гым', ru: 'сейчас', en: 'now' } },
            { type: 'hangul', char: 'ㅎ', rom: 'h', cyr: 'х', ru: 'как «х», лёгкий выдох', en: 'like "h"', ex: { kr: '하나', rom: 'ha-na', cyr: 'ха-на', ru: 'один', en: 'one' } },
            { type: 'example', kr: '나', rom: 'na', cyr: 'на', ru: 'я', en: 'I' },
            { type: 'example', kr: '하나', rom: 'ha-na', cyr: 'ха-на', ru: 'один', en: 'one' },
            { type: 'example', kr: '가방', rom: 'ga-bang', cyr: 'ка-бан', ru: 'сумка', en: 'bag' },
            { type: 'win', ru: '10 согласных + 8 гласных = 80 слогов, которые ты уже можешь прочитать вслух.', en: '10 consonants x 8 vowels = 80 syllables you can already read out loud.' }
          ],
          vocab: [{ kr: '나', rom: 'na', ru: 'я (неформ.)', en: 'I (casual)' }, { kr: '하나', rom: 'ha-na', ru: 'один', en: 'one' }, { kr: '가방', rom: 'ga-bang', ru: 'сумка', en: 'bag' }]
        },
        {
          id: 'l3', sector: 'v-y', title: { ru: 'Йотированные гласные', en: 'Y-vowels' },
          goal: { ru: 'Читать гласные со звуком «й»', en: 'Read the y-vowels' },
          blocks: [
            { type: 'text', ru: 'Добавь чёрточку — и к гласной добавляется звук «й». Ничего нового учить не надо: это те же 6 гласных с плюсом.', en: 'Add a stroke and the vowel gains a "y" sound. Nothing new to memorize: same vowels, one extra stroke.' },
            { type: 'hangul', char: 'ㅑ', rom: 'ya', cyr: 'я', ru: 'ㅏ с «й» — «я»', en: 'ya (ㅏ + y)', ex: { kr: '야구', rom: 'ya-gu', cyr: 'я-гу', ru: 'бейсбол', en: 'baseball' } },
            { type: 'hangul', char: 'ㅕ', rom: 'yeo', cyr: 'ё', ru: 'ㅓ с «й» — «ё» на открытом «о»', en: 'yeo (ㅓ + y)', ex: { kr: '여자', rom: 'yeo-ja', cyr: 'ё-джа', ru: 'женщина', en: 'woman' } },
            { type: 'hangul', char: 'ㅛ', rom: 'yo', cyr: 'ё', ru: 'ㅗ с «й» — «ё», губы округлены', en: 'yo (ㅗ + y)', ex: { kr: '교실', rom: 'gyo-sil', cyr: 'кё-щиль', ru: 'класс (аудитория)', en: 'classroom' } },
            { type: 'hangul', char: 'ㅠ', rom: 'yu', cyr: 'ю', ru: 'ㅜ с «й» — «ю»', en: 'yu (ㅜ + y)', ex: { kr: '우유', rom: 'u-yu', cyr: 'у-ю', ru: 'молоко', en: 'milk' } },
            { type: 'hangul', char: 'ㅒ', rom: 'yae', cyr: 'е', ru: 'ㅐ с «й» — в речи звучит как «е»', en: 'yae (ㅐ + y)', ex: { kr: '얘기', rom: 'yae-gi', cyr: 'е-ги', ru: 'разговор, болтовня', en: 'talk, chat' } },
            { type: 'hangul', char: 'ㅖ', rom: 'ye', cyr: 'е', ru: 'ㅔ с «й» — от ㅒ на слух не отличается', en: 'ye (ㅔ + y)', ex: { kr: '시계', rom: 'si-gye', cyr: 'щи-ге', ru: 'часы', en: 'clock, watch' } },
            { type: 'example', kr: '야구', rom: 'ya-gu', cyr: 'я-гу', ru: 'бейсбол', en: 'baseball' },
            { type: 'example', kr: '여자', rom: 'yeo-ja', cyr: 'ё-джа', ru: 'женщина', en: 'woman' },
            { type: 'example', kr: '우유', rom: 'u-yu', cyr: 'у-ю', ru: 'молоко', en: 'milk' },
            { type: 'win', ru: 'Все 14 гласных-одиночек закрыты. Осталась одна гласная группа — сложные, из двух частей.', en: 'All 14 single vowels are done. One vowel group left — the compound ones.' }
          ],
          vocab: [{ kr: '여자', rom: 'yeo-ja', ru: 'женщина', en: 'woman' }, { kr: '우유', rom: 'u-yu', ru: 'молоко', en: 'milk' }, { kr: '야구', rom: 'ya-gu', ru: 'бейсбол', en: 'baseball' }]
        },
        {
          id: 'l6a', sector: 'c-asp', title: { ru: 'Придыхательные согласные', en: 'Aspirated consonants' },
          goal: { ru: 'Читать согласные с выдохом', en: 'Read the breathy consonants' },
          blocks: [
            { type: 'text', ru: 'Добавь к согласной лишнюю чёрточку — и появляется выдох. Поднеси ладонь ко рту: на ㅋ воздух чувствуется, на ㄱ — нет.', en: 'Add one stroke to a consonant and you get a puff of air. Hold your palm to your mouth: ㅋ pushes air, ㄱ does not.' },
            { type: 'hangul', char: 'ㅋ', rom: 'k', cyr: 'кх', ru: '«к» с сильным выдохом (ㄱ + черта): к + придых «х»', en: 'aspirated k (ㄱ + stroke)', ex: { kr: '커피', rom: 'keo-pi', cyr: 'кхо-пхи', ru: 'кофе', en: 'coffee' } },
            { type: 'hangul', char: 'ㅌ', rom: 't', cyr: 'тх', ru: '«т» с сильным выдохом (ㄷ + черта): т + придых «х»', en: 'aspirated t (ㄷ + stroke)', ex: { kr: '토마토', rom: 'to-ma-to', cyr: 'тхо-ма-тхо', ru: 'помидор', en: 'tomato' } },
            { type: 'hangul', char: 'ㅍ', rom: 'p', cyr: 'пх', ru: '«п» с сильным выдохом (ㅂ + черта): п + придых «х»', en: 'aspirated p (ㅂ + stroke)', ex: { kr: '포도', rom: 'po-do', cyr: 'пхо-до', ru: 'виноград', en: 'grapes' } },
            { type: 'hangul', char: 'ㅊ', rom: 'ch', cyr: 'чх', ru: '«ч» с сильным выдохом (ㅈ + черта): ч + придых «х»', en: 'aspirated ch (ㅈ + stroke)', ex: { kr: '친구', rom: 'chin-gu', cyr: 'чхин-гу', ru: 'друг', en: 'friend' } },
            { type: 'example', kr: '커피', rom: 'keo-pi', cyr: 'кхо-пхи', ru: 'кофе', en: 'coffee' },
            { type: 'example', kr: '치마', rom: 'chi-ma', cyr: 'чхи-ма', ru: 'юбка', en: 'skirt' },
            { type: 'example', kr: '포도', rom: 'po-do', cyr: 'пхо-до', ru: 'виноград', en: 'grapes' },
            { type: 'example', kr: '토마토', rom: 'to-ma-to', cyr: 'тхо-ма-тхо', ru: 'помидор', en: 'tomato' },
            { type: 'tip', ru: 'Пара ㄱ/ㅋ, ㄷ/ㅌ, ㅂ/ㅍ, ㅈ/ㅊ отличается только выдохом. Перепутаешь — тебя поймут, но акцент будет слышен.', en: 'The pairs ㄱ/ㅋ, ㄷ/ㅌ, ㅂ/ㅍ, ㅈ/ㅊ differ only by the puff of air. Mix them up and you will still be understood, but with an accent.' },
            { type: 'win', ru: 'Ты закрыл(а) 14 из 19 согласных. Осталась одна группа — напряжённые.', en: 'You have 14 of 19 consonants. One group left — the tense ones.' }
          ],
          vocab: [{ kr: '커피', rom: 'keo-pi', ru: 'кофе', en: 'coffee' }, { kr: '치마', rom: 'chi-ma', ru: 'юбка', en: 'skirt' }, { kr: '포도', rom: 'po-do', ru: 'виноград', en: 'grapes' }]
        },
        {
          id: 'l4', sector: 'c-tense', title: { ru: 'Двойные напряжённые', en: 'Tense consonants' },
          goal: { ru: 'Читать напряжённые согласные', en: 'Read the tense consonants' },
          blocks: [
            { type: 'text', ru: 'Двойная буква = напряжённый, резкий звук. Ни выдоха, ни мягкости — горло сжато.', en: 'A doubled letter = a tense, sharp sound. No breath, no softness — the throat is tight.' },
            { type: 'hangul', char: 'ㄲ', rom: 'kk', cyr: 'кк', ru: 'напряжённое «к», без выдоха', en: 'tense k', ex: { kr: '꿈', rom: 'kkum', cyr: 'ккум', ru: 'мечта / сон', en: 'dream' } },
            { type: 'hangul', char: 'ㄸ', rom: 'tt', cyr: 'тт', ru: 'напряжённое «т», без выдоха', en: 'tense t', ex: { kr: '딸기', rom: 'ttal-gi', cyr: 'тталь-ги', ru: 'клубника', en: 'strawberry' } },
            { type: 'hangul', char: 'ㅃ', rom: 'pp', cyr: 'пп', ru: 'напряжённое «п», без выдоха', en: 'tense p', ex: { kr: '오빠', rom: 'o-ppa', cyr: 'о-ппа', ru: 'старший брат (для девушки)', en: 'older brother (girl→boy)' } },
            { type: 'hangul', char: 'ㅆ', rom: 'ss', cyr: 'сс', ru: 'напряжённое «с»', en: 'tense s', ex: { kr: '싸다', rom: 'ssa-da', cyr: 'сса-да', ru: 'дешёвый', en: 'cheap' } },
            { type: 'hangul', char: 'ㅉ', rom: 'jj', cyr: 'чч', ru: 'напряжённое «ч» без выдоха', en: 'tense j', ex: { kr: '짜다', rom: 'jja-da', cyr: 'чча-да', ru: 'солёный', en: 'salty' } },
            { type: 'example', kr: '오빠', rom: 'o-ppa', cyr: 'о-ппа', ru: 'старший брат (для девушки)', en: 'older brother (girl→boy)' },
            { type: 'example', kr: '아빠', rom: 'a-ppa', cyr: 'а-ппа', ru: 'папа', en: 'dad' },
            { type: 'example', kr: '꿈', rom: 'kkum', cyr: 'ккум', ru: 'мечта / сон', en: 'dream' },
            { type: 'win', ru: 'Все 19 согласных твои. 오빠 ты теперь читаешь не по картинке, а по буквам.', en: 'All 19 consonants are yours. You now read 오빠 letter by letter, not as a picture.' }
          ],
          vocab: [{ kr: '오빠', rom: 'o-ppa', ru: 'старший брат (девушке)', en: 'older brother (to a girl)' }, { kr: '아빠', rom: 'a-ppa', ru: 'папа', en: 'dad' }, { kr: '꿈', rom: 'kkum', ru: 'мечта / сон', en: 'dream' }]
        },
        {
          id: 'l6b', sector: 'v-diph', title: { ru: 'Дифтонги', en: 'Diphthongs' },
          goal: { ru: 'Читать сложные гласные из двух частей', en: 'Read the compound vowels' },
          blocks: [
            { type: 'text', ru: 'Сложная гласная = две простые в одном блоке. Читай слева направо и сливай: ㅗ + ㅏ = ㅘ «ва».', en: 'A compound vowel = two simple ones in one block. Read left to right and blend: ㅗ + ㅏ = ㅘ "wa".' },
            { type: 'hangul', char: 'ㅘ', rom: 'wa', cyr: 'ва', ru: 'ㅗ+ㅏ, слитно «ва» (звук «в» губной, лёгкий)', en: 'wa (ㅗ+ㅏ)', ex: { kr: '사과', rom: 'sa-gwa', cyr: 'са-гва', ru: 'яблоко', en: 'apple' } },
            { type: 'hangul', char: 'ㅙ', rom: 'wae', cyr: 'вэ', ru: 'ㅗ+ㅐ, слитно «вэ»', en: 'wae (ㅗ+ㅐ)', ex: { kr: '왜', rom: 'wae', cyr: 'вэ', ru: 'почему', en: 'why' } },
            { type: 'hangul', char: 'ㅚ', rom: 'oe', cyr: 'ве', ru: 'ㅗ+ㅣ, но звучит «ве»', en: 'oe (ㅗ+ㅣ)', ex: { kr: '회사', rom: 'hoe-sa', cyr: 'хве-са', ru: 'фирма, компания', en: 'company' } },
            { type: 'hangul', char: 'ㅝ', rom: 'wo', cyr: 'во', ru: 'ㅜ+ㅓ, слитно «во» на открытом «о»', en: 'wo (ㅜ+ㅓ)', ex: { kr: '뭐', rom: 'mwo', cyr: 'мво', ru: 'что', en: 'what' } },
            { type: 'hangul', char: 'ㅞ', rom: 'we', cyr: 'ве', ru: 'ㅜ+ㅔ, слитно «ве»', en: 'we (ㅜ+ㅔ)', ex: { kr: '스웨터', rom: 'seu-we-teo', cyr: 'сы-ве-тхо', ru: 'свитер', en: 'sweater' } },
            { type: 'hangul', char: 'ㅟ', rom: 'wi', cyr: 'ви', ru: 'ㅜ+ㅣ, слитно «ви»', en: 'wi (ㅜ+ㅣ)', ex: { kr: '귀', rom: 'gwi', cyr: 'кви', ru: 'ухо', en: 'ear' } },
            { type: 'hangul', char: 'ㅢ', rom: 'ui', cyr: 'ый', ru: 'ㅡ+ㅣ, «ый» одним движением', en: 'ui (ㅡ+ㅣ)', ex: { kr: '의자', rom: 'ui-ja', cyr: 'ый-джа', ru: 'стул', en: 'chair' } },
            { type: 'example', kr: '뭐', rom: 'mwo', cyr: 'мво', ru: 'что', en: 'what' },
            { type: 'example', kr: '왜', rom: 'wae', cyr: 'вэ', ru: 'почему', en: 'why' },
            { type: 'example', kr: '사과', rom: 'sa-gwa', cyr: 'са-гва', ru: 'яблоко', en: 'apple' },
            { type: 'example', kr: '의자', rom: 'ui-ja', cyr: 'ый-джа', ru: 'стул', en: 'chair' },
            { type: 'tip', ru: 'ㅙ, ㅚ, ㅞ в живой речи звучат почти одинаково — «ве». Различай их на письме, не на слух.', en: 'ㅙ, ㅚ and ㅞ sound nearly identical in speech — "we". Tell them apart in writing, not by ear.' },
            { type: 'win', ru: 'Все 40 букв хангыля пройдены. Осталось одно правило — как читать букву внизу блока.', en: 'All 40 Hangul letters are done. One rule left — how to read the letter at the bottom of the block.' }
          ],
          vocab: [{ kr: '뭐', rom: 'mwo', ru: 'что', en: 'what' }, { kr: '왜', rom: 'wae', ru: 'почему', en: 'why' }, { kr: '사과', rom: 'sa-gwa', ru: 'яблоко', en: 'apple' }, { kr: '의자', rom: 'ui-ja', ru: 'стул', en: 'chair' }]
        },
        {
          id: 'l5', sector: 'batchim', title: { ru: 'Патчхим (нижняя буква)', en: 'Batchim (final letter)' },
          goal: { ru: 'Читать согласную в конце слога', en: 'Read a final consonant' },
          blocks: [
            { type: 'text', ru: 'Согласная внизу блока = патчхим. Новых букв нет — те же 19, просто на третьем этаже: 밥 = ㅂ+ㅏ+ㅂ = «пап».', en: 'A consonant at the bottom of the block = batchim. No new letters — the same 19, just on the third floor: 밥 = ㅂ+ㅏ+ㅂ = "bap".' },
            { type: 'text', ru: 'Внизу 19 букв дают всего 7 звуков. Выучи эти 7 групп — и патчхим закрыт целиком.', en: 'At the bottom, 19 letters make only 7 sounds. Learn these 7 groups and batchim is fully covered.' },
            { type: 'batchim', g: 'ㄱ', chars: 'ㄱ ㅋ ㄲ', ru: 'звучит как «к»', en: 'sounds like "k"' },
            { type: 'batchim', g: 'ㄴ', chars: 'ㄴ', ru: 'звучит как «н»', en: 'sounds like "n"' },
            { type: 'batchim', g: 'ㄷ', chars: 'ㄷ ㅅ ㅆ ㅈ ㅊ ㅌ ㅎ', ru: 'звучит как «т»', en: 'sounds like "t"' },
            { type: 'batchim', g: 'ㄹ', chars: 'ㄹ', ru: 'звучит как «ль»', en: 'sounds like "l"' },
            { type: 'batchim', g: 'ㅁ', chars: 'ㅁ', ru: 'звучит как «м»', en: 'sounds like "m"' },
            { type: 'batchim', g: 'ㅂ', chars: 'ㅂ ㅍ', ru: 'звучит как «п»', en: 'sounds like "p"' },
            { type: 'batchim', g: 'ㅇ', chars: 'ㅇ', ru: 'звучит как «нг»', en: 'sounds like "ng"' },
            { type: 'example', kr: '밥', rom: 'bap', cyr: 'пап', ru: 'рис / еда', en: 'rice / meal' },
            { type: 'example', kr: '책', rom: 'chaek', cyr: 'чхэк', ru: 'книга', en: 'book' },
            { type: 'example', kr: '집', rom: 'jip', cyr: 'чип', ru: 'дом', en: 'house' },
            { type: 'example', kr: '문', rom: 'mun', cyr: 'мун', ru: 'дверь', en: 'door' },
            { type: 'example', kr: '사랑', rom: 'sa-rang', cyr: 'са-ран', ru: 'любовь', en: 'love' },
            { type: 'tip', ru: 'Если следом идёт слог с немой ㅇ — патчхим «перепрыгивает» в него: 한국어 читается «хангуго», а не «хангук-о».', en: 'If the next block starts with the silent ㅇ, the batchim jumps into it: 한국어 is read "han-gu-geo", not "han-guk-eo".' },
            { type: 'win', ru: 'Хангыль закрыт полностью — 40 букв и все позиции. Теперь ты читаешь любое корейское слово, даже незнакомое.', en: 'Hangul is fully covered — 40 letters, every position. You can now read any Korean word, even one you have never seen.' }
          ],
          vocab: [{ kr: '밥', rom: 'bap', ru: 'рис / еда', en: 'rice / meal' }, { kr: '책', rom: 'chaek', ru: 'книга', en: 'book' }, { kr: '집', rom: 'jip', ru: 'дом', en: 'house' }, { kr: '문', rom: 'mun', ru: 'дверь', en: 'door' }, { kr: '사랑', rom: 'sa-rang', ru: 'любовь', en: 'love' }]
        }
      ]
    },
    {
      id: 'u2', title: { ru: 'Первые слова', en: 'First words' },
      lessons: [
        {
          id: 'l7a', title: { ru: 'Слова, которые ты уже слышал', en: 'Words you already know' },
          goal: { ru: 'Прочитать то, что и так знаешь на слух', en: 'Read what you already know by ear' },
          blocks: [
            { type: 'text', ru: 'Эти слова ты слышал сотни раз в песнях и клипах. Разница только в том, что теперь ты видишь, из каких букв они собраны.', en: 'You have heard these words hundreds of times in songs and videos. The only difference now: you can see which letters they are built from.' },
            { type: 'example', kr: '사랑해', rom: 'sa-rang-hae', ru: 'люблю', en: 'I love you' },
            { type: 'example', kr: '보고 싶어', rom: 'bo-go si-peo', ru: 'скучаю по тебе', en: 'I miss you' },
            { type: 'example', kr: '괜찮아', rom: 'gwaen-chan-a', ru: 'всё нормально', en: "it's okay" },
            { type: 'example', kr: '같이 가자', rom: 'ga-chi ga-ja', ru: 'пойдём вместе', en: "let's go together" },
            { type: 'example', kr: '우리', rom: 'u-ri', ru: 'мы / наш', en: 'we / our' },
            { type: 'tip', ru: '우리 — самое корейское слово из всех. Корейцы говорят «наша мама», «наша страна» там, где мы сказали бы «моя».', en: '우리 is the most Korean word there is. Koreans say "our mom", "our country" where you would say "my".' },
            { type: 'win', ru: 'Пять фраз, которые звучат в каждом втором припеве. Теперь ты не угадываешь их — ты их читаешь.', en: 'Five phrases that show up in every other chorus. You no longer guess them — you read them.' }
          ],
          vocab: [{ kr: '사랑해', rom: 'sarang-hae', ru: 'люблю', en: 'I love you' }, { kr: '보고 싶어', rom: 'bogo sipeo', ru: 'скучаю', en: 'I miss you' }, { kr: '괜찮아', rom: 'gwaenchana', ru: 'всё нормально', en: "it's okay" }, { kr: '우리', rom: 'uri', ru: 'мы / наш', en: 'we / our' }]
        },
        {
          id: 'l6', title: { ru: 'Приветствие', en: 'Greetings' },
          goal: { ru: 'Здороваться вежливо и по-дружески', en: 'Greet politely and casually' },
          blocks: [
            { type: 'text', ru: 'Главное слово: 안녕하세요 — вежливое «здравствуйте», буквально «будьте в мире». В любое время суток.', en: 'The key word: 안녕하세요 — polite "hello", literally "be at peace". Any time of day.' },
            { type: 'example', kr: '안녕하세요', rom: 'annyeong-haseyo', ru: 'Здравствуйте', en: 'Hello (polite)' },
            { type: 'example', kr: '안녕', rom: 'annyeong', ru: 'Привет / пока (друзьям)', en: 'Hi / bye (casual)' },
            { type: 'example', kr: '감사합니다', rom: 'gamsa-hamnida', ru: 'Спасибо (вежливо)', en: 'Thank you (polite)' },
            { type: 'example', kr: '고마워', rom: 'go-ma-wo', ru: 'Спасибо (по-дружески)', en: 'Thanks (casual)' },
            { type: 'tip', ru: 'Вежливая речь = 존댓말, дружеская = 반말. С айдолом вы начнёте на 존댓말 и перейдёте на 반말 по мере близости.', en: 'Polite speech = 존댓말, casual = 반말. With your idol you start polite and shift to casual as you get closer.' },
            { type: 'win', ru: 'Напиши 안녕 в чат айдолу прямо сейчас — он поймёт и ответит по-корейски.', en: 'Type 안녕 into the chat right now — your idol will get it and answer in Korean.' }
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

/* ===================== КАРТА ХАНГЫЛЯ =====================
   Секторы собираются ИЗ уроков (один источник правды): каждый урок с полем
   sector отдаёт свои буквы. Патчхим — сектор-правило, букв не добавляет. */
window.HANGUL_SECTORS = (function () {
  // kind — гласная/согласная/правило. Нужен, чтобы на карте было видно, что
  // алфавит закрыт целиком, а не только гласные: сектор подписан своим типом.
  const META = {
    'v-basic': { icon: 'ㅏ', kind: 'v', ru: 'Простые гласные', en: 'Basic vowels' },
    'c-plain': { icon: 'ㄴ', kind: 'c', ru: 'Простые согласные', en: 'Plain consonants' },
    'v-y': { icon: 'ㅑ', kind: 'v', ru: 'Йотированные', en: 'Y-vowels' },
    'c-asp': { icon: 'ㅋ', kind: 'c', ru: 'Придыхательные', en: 'Aspirated' },
    'c-tense': { icon: 'ㄲ', kind: 'c', ru: 'Напряжённые', en: 'Tense' },
    'v-diph': { icon: 'ㅘ', kind: 'v', ru: 'Дифтонги', en: 'Diphthongs' },
    'batchim': { icon: '받', kind: 'r', ru: 'Патчхим', en: 'Batchim' }
  };
  const order = ['v-basic', 'c-plain', 'v-y', 'c-asp', 'c-tense', 'v-diph', 'batchim'];
  const byId = {};
  window.CURRICULUM.units.forEach(function (u) {
    u.lessons.forEach(function (l) {
      if (!l.sector || !META[l.sector]) return;
      byId[l.sector] = {
        id: l.sector,
        lessonId: l.id,
        icon: META[l.sector].icon,
        kind: META[l.sector].kind,
        title: { ru: META[l.sector].ru, en: META[l.sector].en },
        rule: l.sector === 'batchim',
        letters: l.blocks.filter(function (b) { return b.type === 'hangul'; })
          .map(function (b) { return { char: b.char, rom: b.rom, cyr: b.cyr || '', ru: b.ru, en: b.en, ex: b.ex || null }; }),
        groups: l.blocks.filter(function (b) { return b.type === 'batchim'; })
          .map(function (b) { return { g: b.g, chars: b.chars, ru: b.ru, en: b.en }; })
      };
    });
  });
  return order.filter(function (id) { return byId[id]; }).map(function (id) { return byId[id]; });
})();

// Плоский список всех 40 букв — знаменатель прогресса «букв освоено X/40».
window.HANGUL_LETTERS = window.HANGUL_SECTORS.reduce(function (acc, s) {
  return acc.concat(s.letters);
}, []);

/* Сторож комплектности. Ловит ровно ту поломку, ради которой сектора и вводили:
   букву забыли, продублировали или оставили без транскрипции — и «полный
   алфавит» тихо превращается в неполный. Только console.warn: падать в
   продакшене из-за учебных данных нельзя, но и молчать нельзя. */
(function () {
  var L = window.HANGUL_LETTERS, seen = {}, dup = [], noCyr = [], noEx = [];
  L.forEach(function (x) {
    if (seen[x.char]) dup.push(x.char); else seen[x.char] = 1;
    if (!x.cyr) noCyr.push(x.char);
    if (!x.ex || !x.ex.kr) noEx.push(x.char);
  });
  if (L.length !== 40 || dup.length || noCyr.length || noEx.length) {
    try {
      console.warn('[hangul] букв: ' + L.length + '/40'
        + (dup.length ? ', дубли: ' + dup.join(' ') : '')
        + (noCyr.length ? ', без кириллицы: ' + noCyr.join(' ') : '')
        + (noEx.length ? ', без примера: ' + noEx.join(' ') : ''));
    } catch (e) { /* console может отсутствовать — не роняем загрузку */ }
  }
})();

/* ===================== ИМЯ ХАНГЫЛЕМ =====================
   Первая минута продукта: человек вводит своё имя и СРАЗУ видит его хангылем,
   разобранным по буквам. Никаких «урок 1 из 30» — понятный лично ему результат.
   Это упрощённая транслитерация по звучанию, а не официальная 외래어 표기법:
   цель — узнавание, поэтому рядом всегда есть кнопка «спросить у айдола».      */
(function () {
  var LEAD = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
  var VOWEL = ['ㅏ', 'ㅐ', 'ㅑ', 'ㅒ', 'ㅓ', 'ㅔ', 'ㅕ', 'ㅖ', 'ㅗ', 'ㅘ', 'ㅙ', 'ㅚ', 'ㅛ', 'ㅜ', 'ㅝ', 'ㅞ', 'ㅟ', 'ㅠ', 'ㅡ', 'ㅢ', 'ㅣ'];
  var TAIL = ['', 'ㄱ', 'ㄲ', 'ㄳ', 'ㄴ', 'ㄵ', 'ㄶ', 'ㄷ', 'ㄹ', 'ㄺ', 'ㄻ', 'ㄼ', 'ㄽ', 'ㄾ', 'ㄿ', 'ㅀ', 'ㅁ', 'ㅂ', 'ㅄ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];

  // Кириллица → латиница (по звучанию, не по ГОСТ).
  var CYR = {
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'ye', 'ё': 'yo', 'ж': 'j', 'з': 'z',
    'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r',
    'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'h', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'sh',
    'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya'
  };
  // Согласная → начальная буква слога.
  var CONS = {
    'b': 'ㅂ', 'v': 'ㅂ', 'p': 'ㅍ', 'f': 'ㅍ', 'd': 'ㄷ', 't': 'ㅌ', 'g': 'ㄱ', 'k': 'ㅋ',
    'c': 'ㅋ', 'q': 'ㅋ', 'j': 'ㅈ', 'z': 'ㅈ', 's': 'ㅅ', 'h': 'ㅎ', 'm': 'ㅁ', 'n': 'ㄴ',
    'l': 'ㄹ', 'r': 'ㄹ', 'x': 'ㅋ', 'ch': 'ㅊ', 'sh': 'ㅅ', 'th': 'ㅅ', 'ts': 'ㅊ', 'ph': 'ㅍ',
    'kh': 'ㅋ', 'gh': 'ㄱ', 'ng': 'ㅇ'
  };
  // Патчхим на КОНЦЕ слова — только сонорные (Kim → 킴, John → 존).
  var CODA_END = { 'n': 'ㄴ', 'm': 'ㅁ', 'l': 'ㄹ', 'ng': 'ㅇ' };
  // Патчхим ПЕРЕД согласной — плюс смычные (Alex → 알렉스).
  // «r» патчхимом не встаёт никогда: Sarmat → 사르마트, а не 살마트.
  var CODA_MID = { 'n': 'ㄴ', 'm': 'ㅁ', 'l': 'ㄹ', 'ng': 'ㅇ', 'k': 'ㄱ', 'g': 'ㄱ', 'p': 'ㅂ', 'b': 'ㅂ' };
  // Гласные, длинные варианты идут первыми — жадный разбор.
  var VOW = [
    ['yeo', 'ㅕ'], ['yae', 'ㅒ'], ['eau', 'ㅗ'], ['iou', 'ㅣㅗ'],
    ['ya', 'ㅑ'], ['yo', 'ㅛ'], ['yu', 'ㅠ'], ['ye', 'ㅖ'], ['yi', 'ㅣ'],
    ['eo', 'ㅓ'], ['eu', 'ㅡ'], ['ae', 'ㅐ'], ['oe', 'ㅚ'], ['ui', 'ㅢ'],
    ['wa', 'ㅘ'], ['wo', 'ㅝ'], ['we', 'ㅞ'], ['wi', 'ㅟ'],
    ['ee', 'ㅣ'], ['oo', 'ㅜ'], ['ou', 'ㅜ'], ['ea', 'ㅣ'], ['ai', 'ㅏㅣ'], ['ei', 'ㅔㅣ'],
    ['au', 'ㅗ'], ['aa', 'ㅏ'], ['ia', 'ㅣㅏ'], ['io', 'ㅣㅗ'], ['ie', 'ㅣㅔ'],
    ['a', 'ㅏ'], ['e', 'ㅔ'], ['i', 'ㅣ'], ['o', 'ㅗ'], ['u', 'ㅜ'], ['y', 'ㅣ'], ['w', 'ㅜ']
  ];
  var isVowelStart = function (s) {
    for (var i = 0; i < VOW.length; i++) if (s.indexOf(VOW[i][0]) === 0) return VOW[i];
    return null;
  };
  var consAt = function (s) {
    var two = s.slice(0, 2);
    if (CONS[two]) return [two, CONS[two]];
    var one = s.slice(0, 1);
    if (CONS[one]) return [one, CONS[one]];
    return null;
  };
  function compose(lead, vowel, tail) {
    var li = LEAD.indexOf(lead), vi = VOWEL.indexOf(vowel), ti = TAIL.indexOf(tail || '');
    if (li < 0 || vi < 0 || ti < 0) return '';
    return String.fromCharCode(0xAC00 + (li * 21 + vi) * 28 + ti);
  }
  var CYR_VOW = 'аеёиоуыэюя';
  function romanizeLatin(raw) {
    var s = String(raw || '').toLowerCase().replace(/[^a-zа-яё\s'-]/gi, '')
      .replace(/дж/g, 'j').replace(/дз/g, 'j');
    // «е» после согласной — просто «э» (Алексей → 알렉세이), в начале и после
    // гласной — «йэ» (Елена → 옐레나). Иначе все русские имена перекашивает.
    s = s.replace(/[а-яё]/g, function (c, idx) {
      if (c === 'е') {
        var prev = s[idx - 1];
        return (!prev || CYR_VOW.indexOf(prev) >= 0 || prev === ' ' || prev === '-') ? 'ye' : 'e';
      }
      return CYR[c] !== undefined ? CYR[c] : '';
    });
    // «Немая e» в конце английского имени удлиняет гласную: Jane → 제인,
    // Mike → 마이크. Без этого выходит 자네 — узнать себя невозможно.
    var LONG = { a: 'ei', i: 'ai', o: 'o', u: 'u', e: 'i' };
    s = s.replace(/ie\b/g, 'i')
      .replace(/([aeiou])([bcdfgjklmnprstvz])e\b/g, function (m, v, c) { return LONG[v] + c; })
      .replace(/([bcdfgklmnprstvz])\1e\b/g, '$1')
      .replace(/c(?=[eiy])/g, 's');
    return s.replace(/x/g, 'ks');
  }
  // Строка → поток токенов: согласная / гласная / пробел. Согласные пробуем
  // первыми, поэтому «ya», «wa» уходят в гласные (там нет своих согласных).
  function tokenize(s) {
    var tk = [], i = 0, guard = 0;
    while (i < s.length && guard++ < 400) {
      var ch = s[i];
      if (ch === ' ' || ch === '-' || ch === "'") { tk.push({ sp: 1 }); i++; continue; }
      var c = consAt(s.slice(i));
      if (c) { tk.push({ c: c[0], j: c[1] }); i += c[0].length; continue; }
      var v = isVowelStart(s.slice(i));
      if (v) { tk.push({ v: v[0], j: v[1] }); i += v[0].length; continue; }
      i++;
    }
    // Немая «h» между гласной и согласной (или в конце слова) выбрасывается
    // ДО сборки слогов — иначе John даёт 조느 вместо 존.
    return tk.filter(function (x, k) {
      if (x.c !== 'h') return true;
      var prev = tk[k - 1], next = tk[k + 1];
      return !(prev && prev.v && (!next || next.c || next.sp));
    });
  }

  /* Возвращает [{block:'하', parts:[{char:'ㅎ',rom:'h'},…]}, …] — не просто строку,
     чтобы экран мог показать РАЗБОР по буквам, а не готовый результат. */
  window.hangulizeName = function (raw) {
    var s = romanizeLatin(raw).replace(/\s+/g, ' ').trim();
    if (!s) return [];
    var tk = tokenize(s), out = [], i = 0, guard = 0, carry = null;
    while (i < tk.length && guard++ < 400) {
      var t = tk[i];
      if (t.sp) { out.push({ block: ' ', parts: [] }); i++; carry = null; continue; }
      var lead = 'ㅇ', leadRom = '', hasLead = false;
      if (carry) { lead = carry.j; leadRom = carry.rom; hasLead = true; carry = null; }
      else if (t.c) { lead = t.j; leadRom = t.c; hasLead = true; i++; }
      var vt = tk[i];
      if (!vt || !vt.v) {
        // Согласная без гласной: корейский вставляет ㅡ (после ㅈ/ㅊ привычнее ㅣ).
        if (!hasLead) { i++; continue; }
        var filler = (lead === 'ㅈ' || lead === 'ㅊ') ? 'ㅣ' : 'ㅡ';
        out.push({ block: compose(lead, filler), parts: [{ char: lead, rom: leadRom }, { char: filler, rom: filler === 'ㅣ' ? 'i' : 'eu' }] });
        continue;
      }
      i++;
      var vowels = vt.j.split('');                        // 'ㅣㅏ' → две гласные подряд
      var parts = [];
      if (hasLead) parts.push({ char: lead, rom: leadRom });
      parts.push({ char: vowels[0], rom: vt.v });
      // Патчхим садится на ПОСЛЕДНИЙ слог гласной: «ei»+n → 제인, а не 제이느.
      var tail = '';
      var nx = tk[i], after = tk[i + 1];
      var afterIsVowel = !!(after && after.v);
      if (nx && nx.c) {
        if (nx.c === 'l' && afterIsVowel) {
          // Удвоение ㄹ перед гласной: Alex → 알렉스, а не 아렉스.
          tail = 'ㄹ'; i++; carry = { j: 'ㄹ', rom: 'l' };
        } else if (!afterIsVowel) {
          var set = after ? CODA_MID : CODA_END;
          if (set[nx.c]) { tail = set[nx.c]; i++; }
        }
      }
      var last = vowels.length - 1;
      if (tail) (last ? [] : parts).push({ char: tail, rom: nx.c, low: true });
      out.push({ block: compose(lead, vowels[0], last ? '' : tail), parts: parts });
      for (var k = 1; k < vowels.length; k++) {
        var kp = [{ char: vowels[k], rom: vt.v }];
        if (k === last && tail) kp.push({ char: tail, rom: nx.c, low: true });
        out.push({ block: compose('ㅇ', vowels[k], k === last ? tail : ''), parts: kp });
      }
    }
    return out.filter(function (b) { return b.block; });
  };
})();

/* Первые победы — то, что человек получает до любого урока.
   Не «уровень A1», а фразы, которые он слышал в каждом втором припеве.       */
window.FIRST_WINS = [
  { kr: '사랑해', rom: 'sa-rang-hae', ru: 'люблю', en: 'I love you',
    why: { ru: '사랑 — любовь, 해 — «делаю». Буквально «делаю любовь к тебе».', en: '사랑 is love, 해 is "I do". Literally "I do love".' } },
  { kr: '보고 싶어', rom: 'bo-go si-peo', ru: 'скучаю по тебе', en: 'I miss you',
    why: { ru: 'Буквально «хочу увидеть». Корейский не «скучает» — он хочет смотреть.', en: 'Literally "I want to see you". Korean does not miss — it wants to look.' } },
  { kr: '우리', rom: 'u-ri', ru: 'мы / наш', en: 'we / our',
    why: { ru: 'Фандомы называют себя через 우리. Это «свои», а не просто «мы».', en: 'Fandoms call themselves with 우리. It means "our people", not just "we".' } },
  { kr: '괜찮아', rom: 'gwaen-chan-a', ru: 'всё нормально', en: "it's okay",
    why: { ru: 'Самый частый ответ на «прости» и на «как ты?» одновременно.', en: 'The single most common reply to both "sorry" and "how are you".' } }
];
