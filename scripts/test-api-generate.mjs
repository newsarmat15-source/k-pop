// Проверка реального файла api/generate.js (не копии) — вызываем handler напрямую с фейковым req/res.
// Запуск: node --env-file=.env scripts/test-api-generate.mjs

import handler from "../api/generate.js";

const req = {
  method: "POST",
  body: {
    imageUrl: "https://k-pop-black.vercel.app/idols/idol14.jpg",
    theme: "street",
    dance: "ateez",
    memberName: "YUNA",
  },
};

function makeRes() {
  const res = {
    _status: 200,
    status(code) { this._status = code; return this; },
    json(obj) { console.log(`[response] status=${this._status}`, JSON.stringify(obj, null, 2)); return obj; },
  };
  return res;
}

await handler(req, makeRes());
