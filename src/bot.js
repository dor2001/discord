// src/bot.js
import 'dotenv/config';
import {
  Client,
  GatewayIntentBits,
  Partials,
  Events
} from 'discord.js';
import { createWebServer } from './web/server.js';

const {
  DISCORD_TOKEN,
  PANEL_PORT,
  PORT: PORT_ENV
} = process.env;

const PORT = Number(PORT_ENV || PANEL_PORT || 3000);

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates
  ],
  partials: [Partials.Guild, Partials.Channel, Partials.User]
});

async function registerSlashCommands() {
  console.log('Slash commands registered.');
}

let server;
function startWebIfNeeded() {
  if (server && server.listening) return;
  const app = createWebServer({ client });
  try {
    server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`Web UI on http://localhost:${PORT}`);
    });
    const shutdown = () => server && server.close(() => process.exit(0));
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  } catch (err) {
    if (err?.code === 'EADDRINUSE') {
      console.error(`Port ${PORT} is already in use; skipping second listen.`);
    } else {
      console.error('Failed to start web server:', err);
      process.exit(1);
    }
  }
}

client.once(Events.ClientReady, async () => {
  console.log(`Logged in as ${client.user.tag}`);
  await registerSlashCommands();
  startWebIfNeeded();
});

client.login(DISCORD_TOKEN);
