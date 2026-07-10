// Полная проверка реального пути: signup -> login -> me (с куки), затем чистим за собой.
import signup from "../api/signup.js";
import login from "../api/login.js";
import me from "../api/me.js";
import { supabase } from "../lib/supabase.js";

function mockRes() {
  const res = { headers: {}, statusCode: 200 };
  res.status = (c) => { res.statusCode = c; return res; };
  res.setHeader = (k, v) => { res.headers[k] = v; };
  res.json = (obj) => { res.body = obj; return res; };
  return res;
}
function cookieFromSetHeader(setCookie) {
  return setCookie.split(";")[0]; // "s1_session=..."
}

const email = `test-flow-${Date.now()}@example.com`;
const password = "testpass123";

const r1 = mockRes();
await signup({ method: "POST", body: { email, password, username: "flow_test" } }, r1);
console.log("signup ->", r1.statusCode, r1.body);
if (r1.statusCode !== 200) process.exit(1);
const uid = r1.body.profile.id;

const r2 = mockRes();
await login({ method: "POST", body: { email, password } }, r2);
console.log("login ->", r2.statusCode, r2.body);
if (r2.statusCode !== 200) process.exit(1);
const cookie = cookieFromSetHeader(r2.headers["Set-Cookie"]);

const r3 = mockRes();
await me({ method: "GET", headers: { cookie } }, r3);
console.log("me ->", r3.statusCode, r3.body);
if (r3.body?.user?.id !== uid) { console.error("FAIL: me() did not return the same user"); process.exit(1); }

console.log("ALL GOOD — signup, login, session cookie, me all verified end-to-end.");

await supabase().auth.admin.deleteUser(uid);
console.log("cleaned up test user.");
