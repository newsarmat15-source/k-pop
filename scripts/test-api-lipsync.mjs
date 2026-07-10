// Проверка реального файла api/lipsync.js напрямую, на уже готовых видео+песне из прошлых тестов.
// Запуск: node --env-file=.env scripts/test-api-lipsync.mjs

import handler from "../api/lipsync.js";

const req = {
  method: "POST",
  body: {
    videoUrl: "https://v3b.fal.media/files/b/0aa16147/r-y3mPRikdqyR-i96MXG6_output.mp4",
    songUrl: "https://v3b.fal.media/files/b/0aa1614a/mK8gIYAR6DoY8saJS4hcB_song-1783483627431.mp3",
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
