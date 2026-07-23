// Корейское произношение по слогам: буквы → звучание.
//
// Зачем в коде, а не промптом. Транскрипция «как поёт артист» — задача
// детерминированная: 궁금해 всегда звучит 궁그매, а не gung-geum-hae. Модель
// в этом месте регулярно скатывается к книжной романизации, и проверить её
// нечем. Правила ниже дают один и тот же ответ всегда и бесплатно.
//
// Разбираем слог на чо/чун/чон, гоняем звуковые правила по стыкам, собираем
// обратно и только потом романизируем — латиницей и кириллицей.

const CHO = ["ㄱ","ㄲ","ㄴ","ㄷ","ㄸ","ㄹ","ㅁ","ㅂ","ㅃ","ㅅ","ㅆ","ㅇ","ㅈ","ㅉ","ㅊ","ㅋ","ㅌ","ㅍ","ㅎ"];
const JUNG = ["ㅏ","ㅐ","ㅑ","ㅒ","ㅓ","ㅔ","ㅕ","ㅖ","ㅗ","ㅘ","ㅙ","ㅚ","ㅛ","ㅜ","ㅝ","ㅞ","ㅟ","ㅠ","ㅡ","ㅢ","ㅣ"];
const JONG = ["","ㄱ","ㄲ","ㄳ","ㄴ","ㄵ","ㄶ","ㄷ","ㄹ","ㄺ","ㄻ","ㄼ","ㄽ","ㄾ","ㄿ","ㅀ","ㅁ","ㅂ","ㅄ","ㅅ","ㅆ","ㅇ","ㅈ","ㅊ","ㅋ","ㅌ","ㅍ","ㅎ"];

// Сложный патчхим: первая согласная остаётся, вторая уезжает на следующий слог.
const SPLIT = { "ㄳ":["ㄱ","ㅅ"], "ㄵ":["ㄴ","ㅈ"], "ㄶ":["ㄴ","ㅎ"], "ㄺ":["ㄹ","ㄱ"], "ㄻ":["ㄹ","ㅁ"],
                "ㄼ":["ㄹ","ㅂ"], "ㄽ":["ㄹ","ㅅ"], "ㄾ":["ㄹ","ㅌ"], "ㄿ":["ㄹ","ㅍ"], "ㅀ":["ㄹ","ㅎ"], "ㅄ":["ㅂ","ㅅ"] };

// Нейтрализация конца слога: реально звучат только семь согласных.
const NEUTRAL = { "ㄲ":"ㄱ","ㅋ":"ㄱ","ㄳ":"ㄱ","ㄺ":"ㄱ",
                  "ㅅ":"ㄷ","ㅆ":"ㄷ","ㅈ":"ㄷ","ㅊ":"ㄷ","ㅌ":"ㄷ","ㅎ":"ㄷ",
                  "ㅍ":"ㅂ","ㅄ":"ㅂ","ㄿ":"ㅂ",
                  "ㄵ":"ㄴ","ㄶ":"ㄴ","ㄻ":"ㅁ","ㄼ":"ㄹ","ㄽ":"ㄹ","ㄾ":"ㄹ","ㅀ":"ㄹ" };

const TENSE = { "ㄱ":"ㄲ","ㄷ":"ㄸ","ㅂ":"ㅃ","ㅅ":"ㅆ","ㅈ":"ㅉ" };
const ASPIRATE = { "ㄱ":"ㅋ","ㄷ":"ㅌ","ㅂ":"ㅍ","ㅈ":"ㅊ" };

const isHangul = (ch) => ch >= "가" && ch <= "힣";

function decompose(ch) {
  const n = ch.charCodeAt(0) - 0xac00;
  return { c: CHO[Math.floor(n / 588)], v: JUNG[Math.floor((n % 588) / 28)], f: JONG[n % 28] };
}
function compose(s) {
  if (s.raw !== undefined) return s.raw;
  const ci = CHO.indexOf(s.c), vi = JUNG.indexOf(s.v), fi = JONG.indexOf(s.f || "");
  if (ci < 0 || vi < 0 || fi < 0) return "";
  return String.fromCharCode(0xac00 + (ci * 21 + vi) * 28 + fi);
}

// Певческие вольности, которые не выводятся из правил: так поют, а не так пишут.
const SINGING = { "네가": "니가", "제가": "지가" };

// Гласные, перед которыми ㅅ звучит мягко (시 → щи), и «й»-гласные для палатализации.
const I_LIKE = new Set(["ㅣ","ㅑ","ㅕ","ㅛ","ㅠ","ㅖ","ㅒ"]);

function applyRules(syls) {
  const s = syls;
  for (let i = 0; i < s.length; i++) {
    const cur = s[i], nx = s[i + 1];
    if (cur.raw !== undefined) continue;
    if (!nx || nx.raw !== undefined) continue;

    // 1. Палатализация: 굳이 → 구지, 같이 → 가치. Идёт до переноса патчхима.
    if ((cur.f === "ㄷ" || cur.f === "ㅌ") && nx.c === "ㅇ" && nx.v === "ㅣ") {
      nx.c = cur.f === "ㄷ" ? "ㅈ" : "ㅊ";
      cur.f = "";
      continue;
    }

    // 2. ㅎ: придыхание и выпадение. 이렇게 → 이러케, 좋아 → 조아, 축하 → 추카.
    const hasH = cur.f === "ㅎ" || cur.f === "ㄶ" || cur.f === "ㅀ";
    if (hasH) {
      const rest = cur.f === "ㄶ" ? "ㄴ" : cur.f === "ㅀ" ? "ㄹ" : "";
      if (ASPIRATE[nx.c]) { nx.c = ASPIRATE[nx.c]; cur.f = rest; continue; }
      if (nx.c === "ㅅ") { nx.c = "ㅆ"; cur.f = rest; continue; }
      if (nx.c === "ㅇ") { cur.f = rest; }           // ㅎ просто пропадает
      else if (nx.c === "ㄴ") { cur.f = rest || "ㄴ"; }
    }
    if (nx.c === "ㅎ") {
      if (ASPIRATE[cur.f]) { nx.c = ASPIRATE[cur.f]; cur.f = ""; continue; }
      // ㅎ между звонкими проглатывается, и патчхим переезжает через него:
      // 궁금해 → 궁그매, 말하니까 → 마라니까.
      if (["ㄴ","ㄹ","ㅁ","ㅇ"].includes(cur.f)) nx.c = "ㅇ";
    }

    // 3. Перенос патчхима на пустой слог: 눈이 → 누니, 사진을 → 사지늘.
    if (cur.f && nx.c === "ㅇ" && cur.f !== "ㅇ") {
      if (SPLIT[cur.f]) { const [keep, move] = SPLIT[cur.f]; cur.f = keep; nx.c = move; }
      else { nx.c = cur.f; cur.f = ""; }
      continue;
    }
  }

  // 4. Нейтрализация того, что осталось в конце слога.
  for (const x of s) if (x.raw === undefined && x.f && NEUTRAL[x.f]) x.f = NEUTRAL[x.f];

  // 5. Стыковые правила поверх нейтрализованного.
  for (let i = 0; i < s.length - 1; i++) {
    const cur = s[i], nx = s[i + 1];
    if (cur.raw !== undefined || nx.raw !== undefined) continue;

    // ㄹ после смычной становится ㄴ: 설국열차 → 설궁녈차, 정리 → 정니.
    if (nx.c === "ㄹ" && ["ㄱ","ㄷ","ㅂ","ㅁ","ㅇ"].includes(cur.f)) nx.c = "ㄴ";

    // Носовая ассимиляция: 국물 → 궁물, 닫는 → 단는, 입니다 → 임니다.
    if (["ㄴ","ㅁ"].includes(nx.c)) {
      if (cur.f === "ㄱ") cur.f = "ㅇ";
      else if (cur.f === "ㄷ") cur.f = "ㄴ";
      else if (cur.f === "ㅂ") cur.f = "ㅁ";
    }

    // Боковая ассимиляция: 홀로 → 홀로, 신라 → 실라, 끝내 → 끈내.
    if (cur.f === "ㄴ" && nx.c === "ㄹ") { cur.f = "ㄹ"; nx.c = "ㄹ"; }
    else if (cur.f === "ㄹ" && nx.c === "ㄴ") nx.c = "ㄹ";

    // Напряжение после смычной: 잡고 → 잡꼬, 있다 → 읻따, 학교 → 학꾜.
    if (["ㄱ","ㄷ","ㅂ"].includes(cur.f) && TENSE[nx.c]) nx.c = TENSE[nx.c];
  }
  return s;
}

// Как звучит слово — хангылем. Полезно и само по себе: это то, что видит человек.
export function pronounce(word) {
  const w = SINGING[word] || word;
  const syls = [...w].map((ch) => (isHangul(ch) ? decompose(ch) : { raw: ch }));
  return applyRules(syls).map(compose).join("");
}

const LAT_CHO = { "ㄱ":"g","ㄲ":"kk","ㄴ":"n","ㄷ":"d","ㄸ":"tt","ㄹ":"r","ㅁ":"m","ㅂ":"b","ㅃ":"pp",
                  "ㅅ":"s","ㅆ":"ss","ㅇ":"","ㅈ":"j","ㅉ":"jj","ㅊ":"ch","ㅋ":"k","ㅌ":"t","ㅍ":"p","ㅎ":"h" };
const LAT_JUNG = { "ㅏ":"a","ㅐ":"ae","ㅑ":"ya","ㅒ":"yae","ㅓ":"eo","ㅔ":"e","ㅕ":"yeo","ㅖ":"ye","ㅗ":"o",
                   "ㅘ":"wa","ㅙ":"wae","ㅚ":"oe","ㅛ":"yo","ㅜ":"u","ㅝ":"wo","ㅞ":"we","ㅟ":"wi","ㅠ":"yu",
                   "ㅡ":"eu","ㅢ":"ui","ㅣ":"i" };
const LAT_JONG = { "":"","ㄱ":"k","ㄴ":"n","ㄷ":"t","ㄹ":"l","ㅁ":"m","ㅂ":"p","ㅇ":"ng" };

const CYR_CHO = { "ㄱ":"г","ㄲ":"кк","ㄴ":"н","ㄷ":"д","ㄸ":"тт","ㄹ":"р","ㅁ":"м","ㅂ":"б","ㅃ":"пп",
                  "ㅅ":"с","ㅆ":"сс","ㅇ":"","ㅈ":"дж","ㅉ":"чч","ㅊ":"ч","ㅋ":"к","ㅌ":"т","ㅍ":"п","ㅎ":"х" };
const CYR_JUNG = { "ㅏ":"а","ㅐ":"э","ㅑ":"я","ㅒ":"е","ㅓ":"о","ㅔ":"е","ㅕ":"ё","ㅖ":"е","ㅗ":"о",
                   "ㅘ":"ва","ㅙ":"вэ","ㅚ":"ве","ㅛ":"ё","ㅜ":"у","ㅝ":"во","ㅞ":"ве","ㅟ":"ви","ㅠ":"ю",
                   "ㅡ":"ы","ㅢ":"ый","ㅣ":"и" };
const CYR_JONG = { "":"","ㄱ":"к","ㄴ":"н","ㄷ":"т","ㄹ":"ль","ㅁ":"м","ㅂ":"п","ㅇ":"н" };

// Кириллица: удвоение уже слышно в патчхиме предыдущего слога, второй раз его
// не пишем — 잡꼬 читается «джап·ко», а не «джап·кко».
const CYR_COLLAPSE = { "кк":"к","тт":"т","пп":"п","сс":"с","чч":"ч","щщ":"щ" };

function romanizeSyl(s, cyr, prev) {
  if (s.raw !== undefined) return s.raw;
  const prevCoda = prev && prev.raw === undefined ? prev.f : "";
  let onset = cyr ? CYR_CHO[s.c] : LAT_CHO[s.c];
  // 시 → «щи», 샤 → «ща»: перед и-образными ㅅ звучит мягко.
  if (cyr && (s.c === "ㅅ" || s.c === "ㅆ") && I_LIKE.has(s.v)) onset = s.c === "ㅅ" ? "щ" : "щщ";
  if (cyr && prevCoda && CYR_COLLAPSE[onset]) onset = CYR_COLLAPSE[onset];
  // ㄹ после ㄹ звучит как «l/л», а не как «r/р»: 실라 → sil·la, силь·ла.
  if (s.c === "ㄹ" && prevCoda === "ㄹ") onset = cyr ? "л" : "l";
  return onset + (cyr ? CYR_JUNG[s.v] : LAT_JUNG[s.v]) + (cyr ? CYR_JONG[s.f] || "" : LAT_JONG[s.f] || "");
}

// Главная функция: слово → транскрипция по слогам через «·».
// cyr=false → латиница, cyr=true → кириллица.
export function transcribe(word, cyr = false) {
  const w = SINGING[word] || String(word || "");
  if (!/[가-힣]/.test(w)) return w;            // английские вставки не трогаем
  const out = [];
  for (const token of w.split(/(\s+)/)) {
    if (!token.trim()) { out.push(token); continue; }
    const syls = applyRules([...token].map((ch) => (isHangul(ch) ? decompose(ch) : { raw: ch })));
    const parts = syls.map((s, i) => romanizeSyl(s, cyr, syls[i - 1]));
    out.push(parts.filter(Boolean).join("·"));
  }
  return out.join(" ").trim();
}

export const transcribeLatin = (w) => transcribe(w, false);
export const transcribeCyrillic = (w) => transcribe(w, true);
