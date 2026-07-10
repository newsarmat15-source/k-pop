// Прямая проверка vote.js + train.js (без браузера), тот же паттерн, что test-follow-streak.mjs.
import signup from "../api/signup.js";
import vote from "../api/vote.js";
import train from "../api/train.js";
import { supabase } from "../lib/supabase.js";

function mockRes() {
  const res = { headers: {}, statusCode: 200 };
  res.status = (c) => { res.statusCode = c; return res; };
  res.setHeader = (k, v) => { res.headers[k] = v; };
  res.json = (obj) => { res.body = obj; return res; };
  return res;
}
function cookieOf(res) { return res.headers["Set-Cookie"].split(";")[0]; }

const db = supabase();
const stamp = Date.now();

const r1 = mockRes();
await signup({ method: "POST", body: { email: `owner-${stamp}@example.com`, password: "testpass123", username: "vt_owner" } }, r1);
const ownerUid = r1.body.profile.id;
const ownerCookie = cookieOf(r1);
const { data: idol } = await db.from("idols").insert({ owner_id: ownerUid, name: "TestIdol2", portrait_url: "/x.jpg" }).select().single();
await db.from("training_stats").insert({ idol_id: idol.id });

const r2 = mockRes();
await signup({ method: "POST", body: { email: `voter-${stamp}@example.com`, password: "testpass123", username: "vt_voter" } }, r2);
const voterUid = r2.body.profile.id;
const voterCookie = cookieOf(r2);

const r3 = mockRes();
await vote({ method: "POST", headers: { cookie: voterCookie }, body: { idolId: idol.id } }, r3);
console.log("vote for other's idol ->", r3.statusCode, r3.body); // expect ok, votes:1

const r4 = mockRes();
await vote({ method: "POST", headers: { cookie: voterCookie }, body: { idolId: idol.id } }, r4);
console.log("duplicate vote same day ->", r4.statusCode, r4.body); // expect 400

const r5 = mockRes();
await vote({ method: "POST", headers: { cookie: ownerCookie }, body: { idolId: idol.id } }, r5);
console.log("owner votes own idol ->", r5.statusCode, r5.body); // expect 400

const { data: voterProfile } = await db.from("profiles").select("energy_balance").eq("id", voterUid).single();
console.log("voter energy_balance after voting ->", voterProfile.energy_balance); // expect +1

const r6 = mockRes();
await train({ method: "POST", headers: { cookie: ownerCookie }, body: { kind: "dance" } }, r6);
console.log("train dance ->", r6.statusCode, r6.body); // expect ok, dance_moves_learned:1

const r7 = mockRes();
await train({ method: "POST", headers: { cookie: ownerCookie }, body: { kind: "dance" } }, r7);
console.log("train dance again before cooldown ->", r7.statusCode, r7.body); // expect 400

const r8 = mockRes();
await train({ method: "POST", headers: { cookie: ownerCookie }, body: { kind: "lang" } }, r8);
console.log("train lang (separate cooldown) ->", r8.statusCode, r8.body); // expect ok, language_pct:10

await db.auth.admin.deleteUser(ownerUid);
await db.auth.admin.deleteUser(voterUid);
console.log("cleaned up.");
