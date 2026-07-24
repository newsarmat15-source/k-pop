/* ============================================================================
 * public/tts-engine.js — реализация контракта IDOLINGO_CONTRACT_tts.md.
 * Определяет window.speakKo(text, opts) и window.speakKoStop().
 *
 * Подключать в index.html ПЕРЕД app.js:
 *     <script src="/tts-engine.js"></script>
 * После подключения в app.js можно удалить старые speak/speakKo — этот файл
 * оставляет window.speak как алиас, чтобы уроки и квизы не сломались.
 *
 * Порядок попыток: манифест кэша → /tts/<hash>.mp3 (старый кэш) → сервер → браузер.
 * Ни при каких условиях не бросает: возвращает 'cache' | 'api' | 'browser' | 'fail'.
 * ========================================================================== */
(function () {
  "use strict";

  /* ---- ключ кэша: djb2 → base36. Должен совпадать с ttsKey() в lib/tts-ko.js ---- */
  function ttsKey(s) {
    var h = 5381, t = String(s);
    for (var i = 0; i < t.length; i++) h = ((h << 5) + h + t.charCodeAt(i)) >>> 0;
    return h.toString(36);
  }

  /* ---- манифест пре-генерированного алфавита (пишется scripts/tts-build-cache.mjs) ---- */
  var manifest = null, manifestLoading = null;
  function loadManifest() {
    if (manifest) return Promise.resolve(manifest);
    if (manifestLoading) return manifestLoading;
    manifestLoading = fetch("/tts/manifest.json", { cache: "force-cache" })
      .then(function (r) { return r.ok ? r.json() : {}; })
      .catch(function () { return {}; })
      .then(function (j) { manifest = j || {}; return manifest; });
    return manifestLoading;
  }

  var cur = null;            // текущий Audio
  /* Было 1000мс. Синтез на сервере занимает 2-6 секунд, значит секундный лимит
     ГАРАНТИРОВАЛ провал: всё, чего нет в кэше, доставалось системному голосу, а он на
     Windows/Android читает хангыль чужим языком — отсюда «слова не озвучиваются» и
     «говорит на японском». Ждём столько, сколько синтез реально длится; кнопка на это
     время помечена .busy, а системный голос остаётся последним рубежом, а не первым. */
  var API_TIMEOUT = 6000;
  /* Одиночная чамо. Её озвучка сменилась (было НАЗВАНИЕ буквы, стал ЗВУК), а ключ кэша
     считается от того же символа — без метки браузер вечно играл бы старый файл.
     Метка ДОЛЖНА совпадать с JAMO_CACHE_TAG в lib/tts-ko.js. */
  var JAMO = /^[ㄱ-ㅎㅏ-ㅣ]$/;
  var JAMO_TAG = "-s1";

  window.speakKoStop = function () {
    try { if (cur) { cur.pause(); cur.currentTime = 0; } } catch (e) {}
    cur = null;
    try { if (window.speechSynthesis) window.speechSynthesis.cancel(); } catch (e) {}
  };

  /* Прогретые аудио: url -> HTMLAudioElement, уже скачанный и раскодированный.
     Без этого КАЖДЫЙ тап по букве тянул .wav заново (даже при попадании в кэш это
     около 2 секунд ожидания — замерено на проде). С прогревом повторный тап играет
     мгновенно: файл уже в элементе, только currentTime=0 и play(). */
  var warm = {};
  function warmAudio(url) {
    if (warm[url]) return warm[url];
    var a = new Audio();
    a.preload = "auto";
    a.src = url;
    try { a.load(); } catch (e) {}
    warm[url] = a;
    return a;
  }
  /* Заранее скачивает озвучку для списка текстов (буквы карты хангыля и т.п.),
     чтобы тап по ним был без задержки. Тянет по одному, не забивая канал разом. */
  window.speakKoPrefetch = function (texts) {
    if (!texts) return;
    if (!Array.isArray(texts)) texts = [texts];
    loadManifest().then(function (m) {
      var i = 0;
      (function next() {
        if (i >= texts.length) return;
        var txt = String(texts[i++] == null ? "" : texts[i - 1]).trim();
        if (txt) {
          var base = ttsKey(txt) + (JAMO.test(txt) ? JAMO_TAG : "");
          warmAudio((m && m[base]) || ("/tts/" + base + ".mp3"));
        }
        // маленькая пауза между загрузками, чтобы не съесть канал на входе в карту
        setTimeout(next, 40);
      })();
    });
  };

  /* играет url; резолвится в момент НАЧАЛА воспроизведения. Прогретый элемент
     переиспользуем — тогда старт мгновенный. */
  function play(url) {
    return new Promise(function (resolve, reject) {
      var a = warm[url] || new Audio(url);
      var settled = false;
      function onPlaying() { if (!settled) { settled = true; cleanup(); resolve(); } }
      function onError() { if (!settled) { settled = true; cleanup(); reject(new Error("audio error")); } }
      function cleanup() { a.removeEventListener("playing", onPlaying); a.removeEventListener("error", onError); }
      a.addEventListener("playing", onPlaying);
      a.addEventListener("error", onError);
      cur = a;
      try { a.currentTime = 0; } catch (e) {}
      var p = a.play();
      if (p && p.catch) p.catch(function (e) { if (!settled) { settled = true; cleanup(); reject(e); } });
      // страховка: если 'playing' не пришёл за 2.5с — считаем провалом
      setTimeout(function () { if (!settled) { settled = true; cleanup(); reject(new Error("play timeout")); } }, 2500);
    });
  }

  function speakBrowser(txt) {
    try {
      if (!txt || !window.speechSynthesis) return "fail";
      var u = new SpeechSynthesisUtterance(txt);
      u.lang = "ko-KR";
      u.rate = 0.85;
      var vs = window.speechSynthesis.getVoices() || [];
      var ko = vs.filter(function (v) { return (v.lang || "").toLowerCase().indexOf("ko") === 0; })[0];
      if (ko) u.voice = ko;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
      return ko ? "browser" : "browser";
    } catch (e) { return "fail"; }
  }

  /**
   * window.speakKo(text, opts) -> Promise<'cache'|'api'|'browser'|'fail'>
   * opts.slow — замедленное произношение (отдельный пре-рендер, иначе параметр серверу)
   * opts.key  — подсказка ключа кэша
   */
  window.speakKo = function (text, opts) {
    opts = opts || {};
    var txt = String(text == null ? "" : text).trim();
    if (!txt) return Promise.resolve("fail");
    window.speakKoStop();

    var base = ttsKey(txt) + (JAMO.test(txt) ? JAMO_TAG : "");
    var key = opts.key || base + (opts.slow ? "-slow" : "");

    return loadManifest().then(function (m) {
      var fromManifest = m && m[key];
      var candidates = [];
      if (fromManifest) candidates.push(fromManifest);
      if (opts.slow && m && m[base]) candidates.push(m[base]); // нет медленной версии — играем обычную
      candidates.push("/tts/" + key + ".mp3");
      if (opts.slow) candidates.push("/tts/" + base + ".mp3");

      return candidates.reduce(function (chain, url) {
        return chain.catch(function () { return play(url).then(function () { return "cache"; }); });
      }, Promise.reject())
        /* кэша нет — идём на сервер, но не ждём дольше секунды */
        .catch(function () {
          var ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
          var timer = setTimeout(function () { try { ctrl && ctrl.abort(); } catch (e) {} }, API_TIMEOUT);
          return fetch("/api/pipeline?action=tts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: txt, slow: !!opts.slow }),
            signal: ctrl ? ctrl.signal : undefined,
          })
            .then(function (r) {
              clearTimeout(timer);
              if (!r.ok) throw new Error("tts " + r.status);
              return r.blob();
            })
            .then(function (b) { return play(URL.createObjectURL(b)); })
            .then(function () { return "api"; });
        })
        /* и только теперь — системный голос */
        .catch(function () { return speakBrowser(txt); });
    }).catch(function () { return speakBrowser(txt); });
  };

  /* совместимость: старые вызовы speak() из уроков и квизов */
  if (!window.speak) window.speak = function (t) { return window.speakKo(t); };

  /* прогрев списка голосов ОС — дёшево, без сети */
  try { if (window.speechSynthesis) window.speechSynthesis.getVoices(); } catch (e) {}
})();
