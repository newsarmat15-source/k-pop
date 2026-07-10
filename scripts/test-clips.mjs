// Проверка сохранения клипов В БАЗЕ без реальной платной генерации (fal.ai не вызываем).
import signup from "../api/signup.js";
import clipCreate from "../api/clip-create.js";
import clipUpdate from "../api/clip-update.js";
import clipList from "../api/clip-list.js";
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
await signup({ method: "POST", body: { email: `clip-${stamp}@example.com`, password: "testpass123", username: "clip_test" } }, r1);
const uid = r1.body.profile.id;
const cookie = cookieOf(r1);
const { data: idol } = await db.from("idols").insert({ owner_id: uid, name: "ClipIdol", portrait_url: "/x.jpg" }).select().single();

const r2 = mockRes();
await clipCreate({ method: "POST", headers: { cookie } }, r2);
console.log("1) clip-create ->", r2.body);
const clipId = r2.body.clipId;

const r3 = mockRes();
await clipUpdate({ method: "POST", headers: { cookie }, body: { clipId, status: "done", videoUrl: "https://example.com/fake.mp4", durationSec: 20, costUsd: 0.93 } }, r3);
console.log("2) clip-update (done) ->", r3.body);

const r4 = mockRes();
await clipList({ method: "GET", query: { idolId: idol.id } }, r4);
console.log("3) clip-list ->", r4.body);
const ok = r4.body.clips.length === 1 && r4.body.clips[0].status === "done" && r4.body.clips[0].video_url === "https://example.com/fake.mp4";
console.log("4) persisted correctly:", ok);

// проверка: чужой юзер не может дописать клип не своего айдола
const r5 = mockRes();
await signup({ method: "POST", body: { email: `intruder-${stamp}@example.com`, password: "testpass123", username: "intruder" } }, r5);
const intruderCookie = cookieOf(r5);
const r6 = mockRes();
await clipUpdate({ method: "POST", headers: { cookie: intruderCookie }, body: { clipId, status: "done", videoUrl: "https://evil.com/x.mp4" } }, r6);
console.log("5) intruder tries to overwrite clip ->", r6.statusCode, r6.body);

await db.auth.admin.deleteUser(uid);
await db.auth.admin.deleteUser(r5.body.profile.id);
console.log("cleaned up.");
