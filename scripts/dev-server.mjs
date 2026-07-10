// Локальный дев-сервер для проверки БЕЗ авторизации в Vercel CLI (vercel dev потребовал login,
// который упал на кириллице в HTTP-заголовке — окружение-специфичный баг). Эмулирует ровно то,
// что нужно нашим api/*.js: req.query, req.body (JSON), res.status().json(), res.setHeader().
// Не для продакшена — только чтобы прогнать реальный фронт+бэк локально перед деплоем.
import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const PUBLIC = path.join(ROOT, "public");
const PORT = 3050;

const MIME = { ".html":"text/html", ".js":"text/javascript", ".json":"application/json",
  ".jpg":"image/jpeg", ".jpeg":"image/jpeg", ".png":"image/png", ".css":"text/css", ".svg":"image/svg+xml" };

function send(res, code, body, headers = {}) {
  res.writeHead(code, headers);
  res.end(body);
}

async function handleApi(req, res, name) {
  let mod;
  try {
    mod = await import(`../api/${name}.js?t=${Date.now()}`); // ?t= — обходим кэш модулей между запросами при правках
  } catch (e) {
    return send(res, 404, JSON.stringify({ error: "no such api: " + name }), { "Content-Type": "application/json" });
  }
  const u = new URL(req.url, "http://x");
  req.query = Object.fromEntries(u.searchParams);

  if (req.method === "POST" || req.method === "PUT") {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const raw = Buffer.concat(chunks).toString("utf8");
    try { req.body = raw ? JSON.parse(raw) : {}; } catch { req.body = {}; }
  }

  const wrapped = {
    statusCode: 200,
    status(c) { this.statusCode = c; return this; },
    setHeader(k, v) { res.setHeader(k, v); },
    json(obj) { res.writeHead(this.statusCode, { "Content-Type": "application/json" }); res.end(JSON.stringify(obj)); },
    send(buf) { res.writeHead(this.statusCode); res.end(buf); },
  };
  try {
    await mod.default(req, wrapped);
  } catch (e) {
    send(res, 500, JSON.stringify({ error: String(e?.message || e) }), { "Content-Type": "application/json" });
  }
}

function serveStatic(req, res) {
  let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (p === "/") p = "/index.html";
  const full = path.join(PUBLIC, p);
  if (!full.startsWith(PUBLIC)) return send(res, 403, "forbidden");
  fs.readFile(full, (err, data) => {
    if (err) return send(res, 404, "not found");
    const ext = path.extname(full);
    send(res, 200, data, { "Content-Type": MIME[ext] || "application/octet-stream" });
  });
}

const server = http.createServer((req, res) => {
  if (req.url.startsWith("/api/")) {
    const name = req.url.slice(5).split("?")[0];
    return handleApi(req, res, name);
  }
  return serveStatic(req, res);
});
server.listen(PORT, () => console.log(`dev-server on http://localhost:${PORT}`));
