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

// חשוב: intent של Guilds כדי למלא cache של שרתים
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates
  ],
  partials: [Partials.Guild, Partials.Channel, Partials.User]
});

// רישום פקודות (אם יש)
async function registerSlashCommands() {
  console.log('Slash commands registered.');
}

let server; // נשמור רפרנס כדי לא לפתוח פעמיים
function startWebIfNeeded() {
  if (server && server.listening) return; // כבר פתוח
  const app = createWebServer({ client });
  try {
    server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`Web UI on http://localhost:${PORT}`);
    });
    // כיבוי נקי
    const shutdown = () => server && server.close(() => process.exit(0));
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  } catch (err) {
    if (err && err.code === 'EADDRINUSE') {
      console.error(
        `Port ${PORT} is already in use inside the container. Skipping second listen.`
      );
    } else {
      console.error('Failed to start web server:', err);
      process.exit(1);
    }
  }
}

// שימוש באירוע התקין ל-v14+:
client.once(Events.ClientReady, async () => {
  console.log(`Logged in as ${client.user.tag}`);
  await registerSlashCommands();
  startWebIfNeeded();
});

client.login(DISCORD_TOKEN);
