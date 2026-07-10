// Общая обёртка с повторными попытками — этот проект несколько раз ловил транзиентные
// "fetch failed" (обрыв соединения к queue.fal.run) в разных местах; без ретрая пользователь
// видит хард-фейл там, где повтор через пару секунд решил бы всё сам.
export async function fetchWithRetry(url, options = {}, tries = 4, delayMs = 2000) {
  let lastErr;
  for (let i = 0; i < tries; i++) {
    try {
      return await fetch(url, options);
    } catch (e) {
      lastErr = e;
      if (i < tries - 1) await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw lastErr;
}
