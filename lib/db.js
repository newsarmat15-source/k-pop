// Прямое подключение к Postgres — только для миграций (DDL), не для обычных запросов
// (обычные запросы — через lib/supabase.js, REST/service_role, это быстрее и безопаснее).
import pg from "pg";

export function dbClient() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL не задан");
  return new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
}
