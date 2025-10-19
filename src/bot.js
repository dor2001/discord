
import { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } from 'discord.js';
import { startWebServer, bindDiscordClient } from './web/server.js';

const TOKEN = process.env.DISCORD_TOKEN;
if (!TOKEN) {
  console.error('Missing DISCORD_TOKEN');
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages
  ],
});

bindDiscordClient(client);

// --- Slash Commands (basic) ---
const commands = [
  new SlashCommandBuilder().setName('ping').setDescription('Ping'),
].map(c=>c.toJSON());

client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}`);
  try {
    const rest = new REST({ version: '10' }).setToken(TOKEN);
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
    console.log('Slash commands registered.');
  } catch (e) {
    console.error('Slash register failed', e);
  }
  startWebServer();
});

client.login(TOKEN);
