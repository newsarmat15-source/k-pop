// Лёгкий локальный сервер для теста без Vercel CLI (тот сломан в этом окружении).
// Эмулирует роутинг Vercel: public/ статикой, api/*.js — как serverless-функции.
// Запуск: node --env-file=.env scripts/local-server.mjs

import http from "node:http";
import { readFile, appendFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const LOG_PATH = path.join(root, "test-output", "generated-links.log");

const MIME = { ".html": "text/html", ".js": "application/javascript", ".json": "application/json", ".jpg": "image/jpeg", ".png": "image/png", ".css": "text/css" };

async function handleApi(name, req, res) {
  const mod = await import(`../api/${name}.js?t=${Date.now()}`);
  const query = Object.fromEntries(new URL(req.url, "http://x").searchParams);
  let body = {};
  if (req.method === "POST") {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const raw = Buffer.concat(chunks).toString("utf8");
    try { body = raw ? JSON.parse(raw) : {}; } catch { body = {}; }
  }
  const fakeReq = { method: req.method, query, body };
  const fakeRes = {
    _status: 200,
    status(code) { this._status = code; return this; },
    json(obj) {
      res.writeHead(this._status, { "Content-Type": "application/json" });
      res.end(JSON.stringify(obj));
      // На всякий случай логируем каждую ссылку на готовое видео — чтобы не потерять её,
      // если закроется вкладка браузера до того, как посмотрели/скачали.
      if (obj && obj.videoUrl) {
        appendFile(LOG_PATH, `${new Date().toISOString()}  [${name}]  ${obj.videoUrl}\n`).catch(() => {});
      }
    },
  };
  await mod.default(fakeReq, fakeRes);
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://x");
    if (url.pathname.startsWith("/api/")) {
      const name = url.pathname.replace("/api/", "");
      return await handleApi(name, req, res);
    }
    let filePath = url.pathname === "/" ? "/index.html" : url.pathname;
    const full = path.join(root, "public", filePath);
    const data = await readFile(full);
    const ext = path.extname(full);
    res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
    res.end(data);
  } catch (e) {
    res.writeHead(404);
    res.end("Not found: " + e.message);
  }
});

const PORT = 3000;
server.listen(PORT, () => console.log(`[local-server] http://localhost:${PORT}`));
