import "dotenv/config";
import { Client, GatewayIntentBits, Partials, REST, Routes } from "discord.js";
import { startWeb as createWebServer } from "./web/server.js";
import { GuildMusic } from "./utils/music.js";

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;

if (!token || !clientId) {
  console.error("Missing DISCORD_TOKEN or CLIENT_ID in env.");
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates
  ],
  partials: [Partials.Channel]
});

const musicMap = new Map(); // guildId -> GuildMusic
function getMusic(guildId) {
  let m = musicMap.get(guildId);
  if (!m) {
    const g = client.guilds.cache.get(guildId);
    if (!g) throw new Error("Guild not in cache.");
    m = new GuildMusic(client, g);
    musicMap.set(guildId, m);
  }
  return m;
}

client.once("ready", async () => {
  console.log(`Logged in as ${client.user.tag}`);
  // register slash cmds minimal
  const rest = new REST({ version: "10" }).setToken(token);
  try {
    await rest.put(Routes.applicationCommands(clientId), {
      body: [
        { name: "ping", description: "pong!" },
        { name: "join", description: "Join voice channel you are in" }
      ]
    });
    console.log("Slash commands registered.");
  } catch (e) {
    console.error("Failed to register slash commands", e);
  }
});

client.on("interactionCreate", async (i)=>{
  if (!i.isChatInputCommand()) return;
  if (i.commandName === "ping") return i.reply("pong!");
  if (i.commandName === "join") {
    const me = i.member;
    const ch = me?.voice?.channel;
    if (!ch) return i.reply({ content: "Join a voice channel first.", ephemeral: true });
    try {
      await getMusic(i.guildId).move(ch.id);
      await i.reply({ content: "Joined your channel.", ephemeral: true });
    } catch (e) {
      await i.reply({ content: "Error: "+(e.message||e), ephemeral: true });
    }
  }
});

// Start web server
const ctx = { client, getMusic };
createWebServer(ctx);

client.login(token);
