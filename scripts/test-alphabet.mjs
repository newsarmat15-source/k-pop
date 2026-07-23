// Проверка данных алфавита: node scripts/test-alphabet.mjs
//
// Зачем. Транскрипция в public/curriculum.js обязана совпадать с движком
// произношения lib/ko-g2p.js — тем же, что размечает строки песен. Разойдутся
// они молча: урок скажет «уа», песня покажет «ва», и человек решит, что его
// учат неправильно. Скрипт ловит это до деплоя, а заодно проверяет
// комплектность: 40 чамо, без дублей, у каждой буквы есть кириллица и слово-
// пример, и это слово действительно содержит свою букву.
//
// Выход 0 — чисто, 1 — есть расхождения (можно вешать на pre-deploy).

import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { transcribeLatin, transcribeCyrillic } from '../lib/ko-g2p.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ctx = { window: {}, console };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root, 'public/curriculum.js'), 'utf8'), ctx);
const W = ctx.window;

const CHO = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
const JUNG = ['ㅏ','ㅐ','ㅑ','ㅒ','ㅓ','ㅔ','ㅕ','ㅖ','ㅗ','ㅘ','ㅙ','ㅚ','ㅛ','ㅜ','ㅝ','ㅞ','ㅟ','ㅠ','ㅡ','ㅢ','ㅣ'];
const JONG = ['','ㄱ','ㄲ','ㄳ','ㄴ','ㄵ','ㄶ','ㄷ','ㄹ','ㄺ','ㄻ','ㄼ','ㄽ','ㄾ','ㄿ','ㅀ','ㅁ','ㅂ','ㅄ','ㅅ','ㅆ','ㅇ','ㅈ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
// Буква «есть в слове», если она стоит в любой из трёх позиций слогового блока.
const has = (word, jamo) => [...word].some((ch) => {
  if (ch < '가' || ch > '힣') return ch === jamo;
  const n = ch.charCodeAt(0) - 0xac00;
  return [CHO[Math.floor(n / 588)], JUNG[Math.floor((n % 588) / 28)], JONG[n % 28]].includes(jamo);
});
// В курсе слоги разделены дефисом, в движке — «·». Разница только в символе.
const dot = (s) => s.replace(/·/g, '-');

const errs = [];
const secs = W.HANGUL_SECTORS || [];
const letters = W.HANGUL_LETTERS || [];

if (letters.length !== 40) errs.push(`букв ${letters.length}, а должно быть 40`);
const seen = new Set();
for (const l of letters) {
  if (seen.has(l.char)) errs.push(`дубль буквы ${l.char}`);
  seen.add(l.char);
  if (!l.cyr) errs.push(`${l.char}: нет кириллицы`);
  if (!l.ru || !l.en) errs.push(`${l.char}: нет пояснения`);
  const ex = l.ex;
  if (!ex || !ex.kr) { errs.push(`${l.char}: нет слова-примера`); continue; }
  if (!ex.ru || !ex.en) errs.push(`${ex.kr}: нет перевода`);
  if (!has(ex.kr, l.char)) errs.push(`${l.char}: в примере ${ex.kr} этой буквы нет`);
  const wantR = dot(transcribeLatin(ex.kr)), wantC = dot(transcribeCyrillic(ex.kr));
  if (ex.rom !== wantR) errs.push(`${ex.kr}: rom «${ex.rom}» != движок «${wantR}»`);
  if (ex.cyr !== wantC) errs.push(`${ex.kr}: cyr «${ex.cyr}» != движок «${wantC}»`);
}
// Слова уроков: где кириллица проставлена — она тоже обязана биться с движком.
for (const u of W.CURRICULUM.units) for (const l of u.lessons) for (const b of (l.blocks || [])) {
  if (b.type !== 'example' || !b.cyr) continue;
  const want = dot(transcribeCyrillic(b.kr));
  if (b.cyr !== want) errs.push(`${b.kr}: cyr «${b.cyr}» != движок «${want}»`);
}

console.log(`секторов: ${secs.length}, букв: ${letters.length}`);
for (const s of secs) console.log(`  ${s.id.padEnd(8)} ${s.kind}  ${s.title.ru} — ${s.rule ? s.groups.length + ' групп' : s.letters.length + ' букв'}`);
if (errs.length) { console.log('\nРАСХОЖДЕНИЯ:'); errs.forEach((e) => console.log('  - ' + e)); process.exit(1); }
console.log('\nвсё сходится с lib/ko-g2p.js');
