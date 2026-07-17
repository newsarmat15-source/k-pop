// Дневные лимиты бесплатного тарифа — защита от разорения на платных вызовах
// (чат через fal, сборка песни через LLM). Считаем по уже существующим данным,
// без отдельной таблицы. Пороги правятся env-переменными.
const CHAT_DAILY = parseInt(process.env.FREE_CHAT_DAILY || "80", 10); // сообщений/день
const SONG_DAILY = parseInt(process.env.FREE_SONG_DAILY || "5", 10); // новых песен/день

function startOfDayISO() {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

// Сколько сообщений фаната (owner) в этот чат за сегодня.
export async function chatUsage(db, idolId) {
  const { count } = await db
    .from("chat_messages")
    .select("id", { count: "exact", head: true })
    .eq("idol_id", idolId)
    .eq("sender", "owner")
    .gte("created_at", startOfDayISO());
  const used = count || 0;
  return { used, limit: CHAT_DAILY, over: used >= CHAT_DAILY };
}

// Сколько НОВЫХ песен юзер добавил в общий каталог за сегодня.
export async function songUsage(db, uid) {
  const { count } = await db
    .from("songs")
    .select("id", { count: "exact", head: true })
    .eq("added_by", uid)
    .gte("created_at", startOfDayISO());
  const used = count || 0;
  return { used, limit: SONG_DAILY, over: used >= SONG_DAILY };
}
