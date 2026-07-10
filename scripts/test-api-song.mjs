// Проверка реального файла api/song.js напрямую.
// Запуск: node --env-file=.env scripts/test-api-song.mjs

import handler from "../api/song.js";

const req = { method: "POST", body: { song: "hyperpop", lengthMs: 10000 } };

function makeRes() {
  const res = {
    _status: 200,
    status(code) { this._status = code; return this; },
    json(obj) { console.log(`[response] status=${this._status}`, JSON.stringify(obj, null, 2)); return obj; },
  };
  return res;
}

await handler(req, makeRes());
