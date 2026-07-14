// Платежи через Stripe (тестовый режим). Диспетчер по ?action=:
//   checkout (POST) — создать Stripe Checkout Session, вернуть ссылку на оплату.
//   webhook  (POST) — Stripe шлёт сюда факт оплаты, пишем подписку в Supabase.
// bodyParser выключен: вебхуку нужен сырой body для проверки подписи; checkout парсим вручную.
import Stripe from "stripe";
import { supabase } from "../lib/supabase.js";
import { readUserId } from "../lib/session.js";

export const config = { api: { bodyParser: false } };

let stripe;
function client() {
  if (stripe) return stripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY не задан");
  stripe = new Stripe(key);
  return stripe;
}

function rawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

// Экономика StageOne (см. CLAUDE.md §6). Цены в центах. Всё — тестовый режим Stripe.
const PRODUCTS = {
  sub:        { mode: "subscription", amount: 1000, recurring: "month", label: "Подписка StageOne — 2 клипа/мес" },
  extra_clip: { mode: "payment",      amount: 300,  label: "Дополнительный клип" },
  extra_idol: { mode: "payment",      amount: 600,  label: "Дополнительный айдол в команду" },
};

async function handleCheckout(req, res, buf) {
  const uid = readUserId(req);
  if (!uid) return res.status(401).json({ error: "Нужно войти в аккаунт" });

  let body = {};
  try { body = JSON.parse(buf.toString() || "{}"); } catch {}
  const product = PRODUCTS[body.product];
  if (!product) return res.status(400).json({ error: "Неизвестный товар" });

  const origin = req.headers.origin || `https://${req.headers.host}`;
  const line = {
    quantity: 1,
    price_data: {
      currency: "usd",
      unit_amount: product.amount,
      product_data: { name: product.label },
      ...(product.recurring ? { recurring: { interval: product.recurring } } : {}),
    },
  };

  try {
    const session = await client().checkout.sessions.create({
      mode: product.mode,
      line_items: [line],
      success_url: `${origin}/?paid=1`,
      cancel_url: `${origin}/?paid=0`,
      client_reference_id: uid,
      metadata: { user_id: uid, product: body.product },
    });
    return res.status(200).json({ ok: true, url: session.url });
  } catch (e) {
    return res.status(502).json({ error: "Не удалось создать оплату", detail: String(e?.message || e) });
  }
}

async function handleWebhook(req, res, buf) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const sig = req.headers["stripe-signature"];
  let event;
  try {
    event = secret
      ? client().webhooks.constructEvent(buf, sig, secret)
      : JSON.parse(buf.toString()); // без секрета (локальный тест) — доверяем телу
  } catch (e) {
    return res.status(400).json({ error: `Подпись не прошла: ${String(e?.message || e)}` });
  }

  if (event.type === "checkout.session.completed") {
    const s = event.data.object;
    const uid = s.client_reference_id || s.metadata?.user_id;
    const product = s.metadata?.product;
    if (uid && product === "sub") {
      const db = supabase();
      await db.from("subscriptions").upsert(
        {
          profile_id: uid,
          tier: "base",
          status: "active",
          stripe_customer_id: s.customer || null,
          stripe_subscription_id: s.subscription || null,
        },
        { onConflict: "profile_id" }
      );
    }
    // extra_clip / extra_idol — разовые покупки; начисление ресурса добавим при связке с UI.
  }

  if (event.type === "customer.subscription.deleted") {
    const sub = event.data.object;
    const db = supabase();
    await db.from("subscriptions").update({ status: "canceled" }).eq("stripe_subscription_id", sub.id);
  }

  return res.status(200).json({ received: true });
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST" });
  const action = req.query.action;
  let buf;
  try { buf = await rawBody(req); } catch (e) { return res.status(400).json({ error: "Не прочитать тело запроса" }); }
  try {
    if (action === "checkout") return await handleCheckout(req, res, buf);
    if (action === "webhook") return await handleWebhook(req, res, buf);
    return res.status(400).json({ error: "Неизвестный action" });
  } catch (e) {
    return res.status(500).json({ error: String(e?.message || e) });
  }
}
