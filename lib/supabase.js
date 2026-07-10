// Единый серверный клиент Supabase — только для api/*.js. Никогда не импортировать в public/*.
import { createClient } from "@supabase/supabase-js";

let client;
// service_role — обходит RLS, для всех обычных чтений/записей данных.
export function supabase() {
  if (client) return client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY не заданы");
  client = createClient(url, key, { auth: { persistSession: false } });
  return client;
}

let anonClient;
// anon key — нужен только для проверки пароля через signInWithPassword (Admin API этого не умеет).
// Используется исключительно внутри api/login.js, всегда на сервере.
export function supabaseAnon() {
  if (anonClient) return anonClient;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL / SUPABASE_ANON_KEY не заданы");
  anonClient = createClient(url, key, { auth: { persistSession: false } });
  return anonClient;
}
