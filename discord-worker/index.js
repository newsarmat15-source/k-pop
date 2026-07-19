// Idolingo Discord Gateway worker.
// Dumb transport: listens for DMs, forwards them to the main app's ingest
// endpoint over HTTP, and sends the returned idol reply back as a DM.
// No persona logic, no LLM, no database live here.

import {
  Client,
  GatewayIntentBits,
  Partials,
  ChannelType,
  Events,
} from 'discord.js';

// ---------------------------------------------------------------------------
// Config / env
// ---------------------------------------------------------------------------

const {
  DISCORD_BOT_TOKEN,
  INGEST_URL,
  INGEST_SECRET,
} = process.env;

const INGEST_TIMEOUT_MS = 20_000;
const DISCORD_MAX_LEN = 2000;

// Friendly canned replies (mirrors the ingest contract).
const MSG_UNLINKED =
  '안녕! Before we can chat here, connect your Discord in the Idolingo app → ' +
  'https://k-pop-black.vercel.app (open the app, go to your idol, tap Connect Discord). ' +
  'See you soon! 🩷';
const MSG_OVER_LIMIT =
  "You've hit today's free message limit 🙈 Let's continue tomorrow!";
const MSG_SOFT_ERROR =
  "I'm having a little trouble right now, try again in a moment 🥲";

// ---------------------------------------------------------------------------
// Logging
// ---------------------------------------------------------------------------

function log(...args) {
  console.log(`[${new Date().toISOString()}]`, ...args);
}
function logErr(...args) {
  console.error(`[${new Date().toISOString()}]`, ...args);
}

// ---------------------------------------------------------------------------
// Startup guards — fail clearly, not with an ugly stack trace.
// ---------------------------------------------------------------------------

const missing = [];
if (!DISCORD_BOT_TOKEN) missing.push('DISCORD_BOT_TOKEN');
if (!INGEST_URL) missing.push('INGEST_URL');
if (!INGEST_SECRET) missing.push('INGEST_SECRET');

if (missing.length > 0) {
  logErr(
    `Missing required env var(s): ${missing.join(', ')}. ` +
      'Set them in the environment (or a local .env used with ' +
      '`node --env-file=.env index.js`) and restart.',
  );
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Ingest call
// ---------------------------------------------------------------------------

/**
 * Forward one user message to the main app and resolve to reply text.
 * Always resolves to a string suitable to send to the user; never rejects.
 * @param {string} platformUserId Discord user id
 * @param {string} text The user's message text
 * @returns {Promise<string>}
 */
async function callIngest(platformUserId, text) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), INGEST_TIMEOUT_MS);

  try {
    const res = await fetch(INGEST_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-ingest-secret': INGEST_SECRET,
      },
      body: JSON.stringify({ platform_user_id: platformUserId, text }),
      signal: controller.signal,
    });

    // Parse JSON defensively — the endpoint may return non-JSON on error.
    let data = null;
    try {
      data = await res.json();
    } catch {
      data = null;
    }

    if (res.status === 200 && data) {
      if (data.unlinked) return MSG_UNLINKED;
      if (data.ok && typeof data.reply === 'string') return data.reply;
      // 200 but shape we don't understand — treat as soft error.
      logErr('Ingest 200 with unexpected body:', JSON.stringify(data));
      return MSG_SOFT_ERROR;
    }

    if (res.status === 429 && data && data.over) {
      return MSG_OVER_LIMIT;
    }

    logErr(`Ingest returned status ${res.status}; body:`, JSON.stringify(data));
    return MSG_SOFT_ERROR;
  } catch (err) {
    if (err?.name === 'AbortError') {
      logErr(`Ingest request timed out after ${INGEST_TIMEOUT_MS}ms`);
    } else {
      logErr('Ingest request failed:', err?.message || err);
    }
    return MSG_SOFT_ERROR;
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// Reply sending (respect Discord's 2000-char hard limit)
// ---------------------------------------------------------------------------

/** Split a string into <= max-length chunks, preferring newline boundaries. */
function chunkMessage(text, max = DISCORD_MAX_LEN) {
  if (text.length <= max) return [text];
  const chunks = [];
  let remaining = text;
  while (remaining.length > max) {
    let slice = remaining.slice(0, max);
    // Try to break on the last newline within the slice for cleaner splits.
    const nl = slice.lastIndexOf('\n');
    if (nl > max * 0.5) slice = slice.slice(0, nl);
    chunks.push(slice);
    remaining = remaining.slice(slice.length).replace(/^\n/, '');
  }
  if (remaining.length > 0) chunks.push(remaining);
  return chunks;
}

async function sendReply(channel, text) {
  const safe = text && text.trim().length > 0 ? text : MSG_SOFT_ERROR;
  for (const chunk of chunkMessage(safe)) {
    await channel.send(chunk);
  }
}

// ---------------------------------------------------------------------------
// Discord client
// ---------------------------------------------------------------------------

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent,
  ],
  // Needed so DM channels/messages that aren't cached still emit events.
  partials: [Partials.Channel, Partials.Message],
});

client.once(Events.ClientReady, (c) => {
  log(`Ready — logged in as ${c.user.tag} (id ${c.user.id})`);
});

client.on(Events.Error, (err) => {
  logErr('Client error:', err?.message || err);
});

client.on(Events.ShardDisconnect, (event, shardId) => {
  logErr(
    `Shard ${shardId} disconnected (code ${event?.code}); discord.js will ` +
      'attempt to reconnect.',
  );
});

client.on(Events.ShardReconnecting, (shardId) => {
  log(`Shard ${shardId} reconnecting...`);
});

client.on(Events.MessageCreate, async (message) => {
  try {
    // Ignore bots (including ourselves) and system messages.
    if (message.author?.bot) return;

    // Only handle direct messages. In discord.js v14 DM channels are
    // ChannelType.DM. With partials, message.channel may be partial — the
    // type is still reliable.
    if (message.channel?.type !== ChannelType.DM) return;

    const userId = message.author.id;
    const text = message.content ?? '';

    // Empty content (e.g. attachment-only) — nudge gently.
    if (text.trim().length === 0) {
      await sendReply(
        message.channel,
        'Send me a text message and I will reply! 🩷',
      );
      return;
    }

    log(`DM from ${userId} (${text.length} chars)`);

    // Typing indicator while we wait on ingest (best-effort).
    message.channel.sendTyping().catch(() => {});

    const reply = await callIngest(userId, text);
    await sendReply(message.channel, reply);
    log(`Replied to ${userId} (${reply.length} chars)`);
  } catch (err) {
    logErr('Failed handling messageCreate:', err?.message || err);
    try {
      await message.channel?.send(MSG_SOFT_ERROR);
    } catch {
      /* give up quietly */
    }
  }
});

// ---------------------------------------------------------------------------
// Process-level safety nets
// ---------------------------------------------------------------------------

process.on('unhandledRejection', (reason) => {
  logErr('Unhandled promise rejection:', reason);
});
process.on('SIGTERM', () => {
  log('SIGTERM received — shutting down.');
  client.destroy();
  process.exit(0);
});
process.on('SIGINT', () => {
  log('SIGINT received — shutting down.');
  client.destroy();
  process.exit(0);
});

// ---------------------------------------------------------------------------
// Go
// ---------------------------------------------------------------------------

log('Starting Idolingo Discord worker...');
client.login(DISCORD_BOT_TOKEN).catch((err) => {
  logErr('Failed to log in to Discord:', err?.message || err);
  process.exit(1);
});
