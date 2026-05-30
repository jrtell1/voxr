// Headless load/behavior simulator for Voxr.
//
// Spins up N fake users that register (or log in), connect over the Phoenix
// socket, join a text channel, and periodically send messages — sometimes
// @mentioning each other to exercise the mention-notification path.
//
// Usage (from client/):
//   node scripts/simulate-users.mjs
//   BOTS=10 SERVER_URL=http://localhost:4000 CHANNEL=general \
//     INTERVAL_MS=3000 MENTION_CHANCE=0.4 DURATION_MS=60000 \
//     node scripts/simulate-users.mjs
//
// Ctrl+C to stop early; bots disconnect cleanly.

import { Socket } from 'phoenix';

const SERVER_URL = process.env.SERVER_URL ?? 'http://localhost:4000';
const BOTS = Number(process.env.BOTS ?? 10);
const CHANNEL = process.env.CHANNEL ?? 'general';
const PASSWORD = process.env.PASSWORD ?? 'simpass123';
const INTERVAL_MS = Number(process.env.INTERVAL_MS ?? 3000);
const MENTION_CHANCE = Number(process.env.MENTION_CHANCE ?? 0.4);
const DURATION_MS = Number(process.env.DURATION_MS ?? 0); // 0 = run until Ctrl+C
const PREFIX = process.env.PREFIX ?? 'simbot';

const WS_URL = SERVER_URL.replace(/^http/, 'ws');

const PHRASES = [
  'hello there',
  'how is everyone doing',
  'just shipped a fix',
  'anyone around for voice later',
  'lunch break, brb',
  'that bug was nasty',
  'looks good to me',
  'lol nice',
  'can someone review this',
  'deploying now, fingers crossed',
  'works on my machine',
  'good morning',
];

const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function ensureUser(username) {
  // Try to register; if the username is taken, fall back to login.
  const reg = await fetch(`${SERVER_URL}/api/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password: PASSWORD, display_name: username }),
  });
  if (reg.status === 201) return (await reg.json()).token;

  const login = await fetch(`${SERVER_URL}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password: PASSWORD }),
  });
  if (login.ok) return (await login.json()).token;

  const err = await login.json().catch(() => ({}));
  throw new Error(`auth failed for ${username}: ${err.error ?? login.status}`);
}

async function resolveChannelId() {
  const res = await fetch(`${SERVER_URL}/api/channels`);
  const channels = await res.json();
  const text = channels.filter((c) => c.type === 'text');
  const match = text.find((c) => c.name === CHANNEL) ?? text[0];
  if (!match) throw new Error('no text channel found');
  return match.id;
}

function connectBot(username, token, channelId) {
  return new Promise((resolve, reject) => {
    const socket = new Socket(`${WS_URL}/socket`, {
      params: { token },
      transport: WebSocket,
    });
    socket.onError(() => {}); // keep noise down; reconnects are automatic
    socket.connect();

    // user:me must be joined for presence/mentions, same as the real client.
    socket.channel('user:me').join();

    const room = socket.channel(`room:${channelId}`);
    room
      .join()
      .receive('ok', () => resolve({ username, socket, room }))
      .receive('error', (e) => reject(new Error(`${username} join failed: ${JSON.stringify(e)}`)));
  });
}

async function main() {
  const usernames = Array.from({ length: BOTS }, (_, i) => `${PREFIX}${i + 1}`);
  console.log(`[sim] server=${SERVER_URL} bots=${BOTS} channel=#${CHANNEL}`);

  const channelId = await resolveChannelId();
  console.log(`[sim] target channel id=${channelId}`);

  const bots = [];
  for (const username of usernames) {
    try {
      const token = await ensureUser(username);
      const bot = await connectBot(username, token, channelId);
      bots.push(bot);
      console.log(`[sim] ${username} connected`);
    } catch (e) {
      console.error(`[sim] ${username} skipped: ${e.message}`);
    }
  }

  if (bots.length === 0) {
    console.error('[sim] no bots connected, exiting');
    process.exit(1);
  }

  console.log(`[sim] ${bots.length} bots live, sending every ${INTERVAL_MS}ms`);

  const timers = bots.map((bot) =>
    setInterval(() => {
      let content = rand(PHRASES);
      if (Math.random() < MENTION_CHANCE && bots.length > 1) {
        let target;
        do {
          target = rand(bots);
        } while (target.username === bot.username);
        content = `@${target.username} ${content}`;
      }
      bot.room.push('send_message', { content, attachments: [] });
      console.log(`[${bot.username}] ${content}`);
    }, INTERVAL_MS + Math.random() * INTERVAL_MS), // jitter so they don't fire in lockstep
  );

  const shutdown = () => {
    console.log('\n[sim] shutting down...');
    timers.forEach(clearInterval);
    bots.forEach((b) => b.socket.disconnect());
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  if (DURATION_MS > 0) {
    await sleep(DURATION_MS);
    shutdown();
  }
}

main().catch((e) => {
  console.error('[sim] fatal:', e);
  process.exit(1);
});
