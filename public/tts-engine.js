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
  var API_TIMEOUT = 1000;    // по контракту: дольше секунды сеть не ждём, уходим в фолбэк

  window.speakKoStop = function () {
    try { if (cur) { cur.pause(); cur.currentTime = 0; } } catch (e) {}
    cur = null;
    try { if (window.speechSynthesis) window.speechSynthesis.cancel(); } catch (e) {}
  };

  /* играет url; резолвится в момент НАЧАЛА воспроизведения */
  function play(url) {
    return new Promise(function (resolve, reject) {
      var a = new Audio(url);
      var settled = false;
      a.addEventListener("playing", function () { if (!settled) { settled = true; resolve(); } });
      a.addEventListener("error", function () { if (!settled) { settled = true; reject(new Error("audio error")); } });
      cur = a;
      var p = a.play();
      if (p && p.catch) p.catch(function (e) { if (!settled) { settled = true; reject(e); } });
      // страховка: если 'playing' не пришёл за 2.5с — считаем провалом
      setTimeout(function () { if (!settled) { settled = true; reject(new Error("play timeout")); } }, 2500);
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

    var key = opts.key || ttsKey(txt) + (opts.slow ? "-slow" : "");

    return loadManifest().then(function (m) {
      var fromManifest = m && m[key];
      var candidates = [];
      if (fromManifest) candidates.push(fromManifest);
      candidates.push("/tts/" + key + ".mp3");
      if (opts.slow) candidates.push("/tts/" + ttsKey(txt) + ".mp3"); // нет slow-версии — играем обычную

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
