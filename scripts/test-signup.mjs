// Разовая проверка реального пути signup: создать юзера, вставить profile, затем удалить.
import { supabase } from "../lib/supabase.js";

const db = supabase();
const email = `test-signup-${Date.now()}@example.com`;
const password = "testpass123";

const { data: created, error: createErr } = await db.auth.admin.createUser({ email, password, email_confirm: true });
if (createErr) { console.error("FAIL createUser:", createErr.message); process.exit(1); }
console.log("OK — auth user created:", created.user.id);

const { data: profile, error: profileErr } = await db.from("profiles").insert({ id: created.user.id, username: "test_user" }).select().single();
if (profileErr) { console.error("FAIL insert profile:", profileErr.message); process.exit(1); }
console.log("OK — profile row created:", profile);

const { error: delErr } = await db.auth.admin.deleteUser(created.user.id);
if (delErr) console.error("Warning: cleanup delete failed:", delErr.message);
else console.log("OK — test user cleaned up");
