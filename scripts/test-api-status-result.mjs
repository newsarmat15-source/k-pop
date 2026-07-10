// Проверка реальных файлов api/status.js и api/result.js напрямую.
// Запуск: node --env-file=.env scripts/test-api-status-result.mjs <requestId>

import statusHandler from "../api/status.js";
import resultHandler from "../api/result.js";

const requestId = process.argv[2];
if (!requestId) { console.error("Нужен requestId аргументом"); process.exit(1); }

function makeRes() {
  const res = {
    _status: 200, _body: null,
    status(code) { this._status = code; return this; },
    json(obj) { this._body = obj; return obj; },
  };
  return res;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  let status = "IN_QUEUE";
  while (status !== "COMPLETED") {
    await sleep(5000);
    const res = makeRes();
    await statusHandler({ query: { id: requestId } }, res);
    status = res._body.status;
    console.log(`[status] ${status}`);
    if (status === "ERROR" || status === "FAILED") { console.log(JSON.stringify(res._body, null, 2)); process.exit(1); }
  }
  const res2 = makeRes();
  await resultHandler({ query: { id: requestId } }, res2);
  console.log("[result]", JSON.stringify(res2._body, null, 2));
}

main();
