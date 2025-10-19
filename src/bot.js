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
  PORT = process.env.PANEL_PORT || 3000
} = process.env;

// חשוב: לוודא שיש Intent של Guilds (וגם VoiceStates אם אתה מריץ מוזיקה)
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates
  ],
  partials: [Partials.Guild, Partials.Channel, Partials.User]
});

// נרשום סלאשים וכו' כרגיל...
async function registerSlashCommands() {
  // ... הקוד שלך לרישום פקודות
  console.log('Slash commands registered.');
}

// נחכה ללקוח שיהיה מוכן ואז נפעיל את הווב-סרבר
client.once(Events.ClientReady, async () => {
  console.log(`Logged in as ${client.user.tag}`);
  await registerSlashCommands();

  const app = createWebServer({ client });
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Web UI on http://localhost:${PORT}`);
  });

  // סגירה נקייה
  const shutdown = () => server.close(() => process.exit(0));
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
});

// התחברות לדיסקורד
client.login(DISCORD_TOKEN);
