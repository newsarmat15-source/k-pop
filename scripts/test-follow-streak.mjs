// Прямая проверка логики стрика (без браузера) — включая имитацию "прошёл день" через прямые UPDATE.
import signup from "../api/signup.js";
import follow from "../api/follow.js";
import { supabase } from "../lib/supabase.js";
import { createSessionCookie } from "../lib/session.js";

function mockRes() {
  const res = { headers: {}, statusCode: 200 };
  res.status = (c) => { res.statusCode = c; return res; };
  res.setHeader = (k, v) => { res.headers[k] = v; };
  res.json = (obj) => { res.body = obj; return res; };
  return res;
}
function cookieOf(res) { return res.headers["Set-Cookie"].split(";")[0]; }
function ymd(d) { return new Date(d).toISOString().slice(0, 10); }

const db = supabase();
const stamp = Date.now();

const r1 = mockRes();
await signup({ method: "POST", body: { email: `owner-${stamp}@example.com`, password: "testpass123", username: "streak_owner" } }, r1);
const ownerUid = r1.body.profile.id;
const { data: idol } = await db.from("idols").insert({ owner_id: ownerUid, name: "TestIdol", portrait_url: "/x.jpg" }).select().single();

const r2 = mockRes();
await signup({ method: "POST", body: { email: `follower-${stamp}@example.com`, password: "testpass123", username: "streak_follower" } }, r2);
const followerUid = r2.body.profile.id;
const cookie = cookieOf(r2);

const r3 = mockRes();
await follow({ method: "POST", headers: { cookie }, body: { idolId: idol.id, action: "follow" } }, r3);
console.log("day 1 follow ->", r3.body); // expect streak 1

// имитируем "было вчера"
await db.from("follows").update({ last_support_date: ymd(Date.now() - 86400000) }).eq("idol_id", idol.id).eq("follower_id", followerUid);
const r4 = mockRes();
await follow({ method: "POST", headers: { cookie }, body: { idolId: idol.id, action: "follow" } }, r4);
console.log("check-in after 1 day gap ->", r4.body); // expect streak 2

// имитируем разрыв в 3 дня
await db.from("follows").update({ last_support_date: ymd(Date.now() - 3 * 86400000) }).eq("idol_id", idol.id).eq("follower_id", followerUid);
const r5 = mockRes();
await follow({ method: "POST", headers: { cookie }, body: { idolId: idol.id, action: "follow" } }, r5);
console.log("check-in after 3 day gap (should reset) ->", r5.body); // expect streak 1

const r6 = mockRes();
await follow({ method: "POST", headers: { cookie }, body: { idolId: idol.id, action: "unfollow" } }, r6);
console.log("unfollow ->", r6.body); // expect following:false

// нельзя подписаться на своего
const ownerCookie = cookieOf(r1);
const r7 = mockRes();
await follow({ method: "POST", headers: { cookie: ownerCookie }, body: { idolId: idol.id, action: "follow" } }, r7);
console.log("owner tries to follow own idol ->", r7.statusCode, r7.body);

await db.auth.admin.deleteUser(ownerUid);
await db.auth.admin.deleteUser(followerUid);
console.log("cleaned up.");
