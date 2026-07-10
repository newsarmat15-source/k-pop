// Разовая уборка тестовых аккаунтов, созданных при отладке signup/login (см. scripts/test-*.mjs).
import { supabase } from "../lib/supabase.js";

const db = supabase();
const { data, error } = await db.auth.admin.listUsers({ perPage: 200 });
if (error) { console.error(error.message); process.exit(1); }

const testUsers = data.users.filter((u) => u.email && u.email.includes("@example.com"));
console.log(`Найдено тестовых аккаунтов: ${testUsers.length}`);
for (const u of testUsers) {
  await db.auth.admin.deleteUser(u.id);
  console.log("удалён:", u.email);
}
console.log("готово.");
