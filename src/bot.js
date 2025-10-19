// src/bot.js
import { Client, GatewayIntentBits } from 'discord.js';
import { startWeb } from './web/server.js';

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
});

// Use the future-safe 'clientReady' event name
client.once('clientReady', async () => {
  console.log(`Logged in as ${client.user.tag}`);
  if (!globalThis.__WEB_STARTED__) {
    globalThis.__WEB_STARTED__ = true;
    await startWeb(); // Launch web UI once
  }
  // TODO: register slash commands here if needed
  console.log('Slash commands registered.');
});

const token = process.env.DISCORD_TOKEN;
if (!token) {
  console.error('DISCORD_TOKEN is missing – set it in your environment.');
  process.exit(1);
}

client.login(token);
