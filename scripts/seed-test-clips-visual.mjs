// Разовый скрипт: создать юзера с айдолом и клипами разных статусов, чтобы визуально проверить рендер.
import signup from "../api/signup.js";
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
await signup({ method: "POST", body: { email: `visual-${stamp}@example.com`, password: "testpass123", username: "visual_clip_test" } }, r1);
const uid = r1.body.profile.id;
const { data: idol } = await db.from("idols").insert({ owner_id: uid, name: "LUNE", concept: "luxe editorial", portrait_url: "/idols/idol1.jpg", gender: "girl" }).select().single();
await db.from("training_stats").insert({ idol_id: idol.id });
await db.from("clips").insert([
  { idol_id: idol.id, status: "done", video_url: "https://example.com/a.mp4", duration_sec: 20, cost_usd: 0.93 },
  { idol_id: idol.id, status: "processing" },
  { idol_id: idol.id, status: "failed", error: "test failure" },
]);
console.log("EMAIL:", `visual-${stamp}@example.com`);
console.log("COOKIE:", cookieOf(r1));
console.log("done — do not clean up yet, run visual check first");
