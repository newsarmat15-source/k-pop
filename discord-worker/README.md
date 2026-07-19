# Idolingo Discord Worker

A standalone always-on process that connects to the **Discord Gateway** as the
Idolingo bot, listens for **direct messages**, forwards each message to the main
app's HTTP ingest endpoint, and sends the idol's reply back in the same DM.

It is **dumb transport**: no persona logic, no LLM calls, no database. All
intelligence lives behind the ingest endpoint in the main app.

Vercel serverless can't hold the persistent Gateway WebSocket (with the
privileged MESSAGE CONTENT intent needed to read free-text DMs), which is why
this worker exists as a separate deployable.

---

## 1. Create the Discord application + bot

1. Go to <https://discord.com/developers/applications> → **New Application**.
   Name it (e.g. "Idolingo").
2. Left sidebar → **Bot** → **Add Bot** (Reset Token if needed).
3. **Copy the token** — this is `DISCORD_BOT_TOKEN`. You only see it once.
4. On the **Bot** page, under **Privileged Gateway Intents**, turn **ON**:
   - **MESSAGE CONTENT INTENT** (required — without it DM text arrives empty)
   - (Presence / Server Members intents are **not** needed.)
5. Left sidebar → **OAuth2 → URL Generator**:
   - Scopes: check **bot**
   - Bot permissions: **Send Messages** (and **Read Message History** is fine).
   - Copy the generated URL and open it to invite the bot to a server, OR just
     let users DM the bot directly (users can DM a bot they share any mutual
     server with, or after the app's Connect-Discord flow links them).

> Users start a DM with the bot to chat. The main app's "Connect Discord" flow
> links a user's Discord id to their Idolingo account; until then the worker
> replies with the "please link" message.

---

## 2. Environment variables

| Var | Description |
|-----|-------------|
| `DISCORD_BOT_TOKEN` | Bot token from the Developer Portal (step 1.3). |
| `INGEST_URL` | Full ingest URL, e.g. `https://k-pop-black.vercel.app/api/bot?action=ingest&platform=discord` |
| `INGEST_SECRET` | Shared secret sent as `x-ingest-secret`; must match the main app. |

Copy `.env.example` → `.env` and fill these in. **Never commit `.env`.**

---

## 3. Install & run locally

```bash
cd discord-worker
npm install
node --env-file=.env index.js
```

On boot the worker logs `Ready — logged in as <bot>#tag`. Missing env vars cause
a clear message and exit code 1 (no stack trace). DM the bot to test.

---

## 4. Deploy to Fly.io

The worker is outbound-only (no inbound HTTP), so `fly.toml` intentionally has
no `[http_service]` block and exposes no ports.

```bash
# one-time
fly launch --no-deploy          # or: fly apps create idolingo-discord-worker
# set secrets (do NOT put these in fly.toml)
fly secrets set \
  DISCORD_BOT_TOKEN=xxxxx \
  INGEST_URL='https://k-pop-black.vercel.app/api/bot?action=ingest&platform=discord' \
  INGEST_SECRET=yyyyy
# deploy
fly deploy
```

Keep exactly one machine running (a second instance would double every reply):

```bash
fly scale count 1
```

Tail logs:

```bash
fly logs
```

---

## 5. Ingest contract (for reference)

`POST ${INGEST_URL}` with header `x-ingest-secret: ${INGEST_SECRET}` and body
`{ "platform_user_id": "<discord user id>", "text": "<message>" }`.

| Response | Worker action |
|----------|---------------|
| `200 { ok: true, reply }` | Send `reply` as a DM. |
| `200 { ok: true, unlinked: true }` | Send the "connect your Discord" message. |
| `429 { over: true, limit }` | Send the daily-limit message. |
| anything else | Send a soft-error message and log it. |

The ingest fetch has a 20s timeout (AbortController); on any failure the worker
sends the soft-error reply and logs it.
