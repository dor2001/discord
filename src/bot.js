import { Client, GatewayIntentBits, Partials, REST, Routes, SlashCommandBuilder } from "discord.js";
import { CONFIG } from "./config.js";
import { MusicManager } from "./music/MusicManager.js";
import { startWeb } from "./web/server.js";

if (!CONFIG.token) {
  console.error("Missing DISCORD_TOKEN");
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages
  ],
  partials: [Partials.Channel]
});

const music = new MusicManager(client);

async function registerSlash() {
  try{
    const commands = [
      new SlashCommandBuilder().setName("join").setDescription("Join voice").addChannelOption(o=>o.setName("channel").setDescription("Voice channel").setRequired(true)),
      new SlashCommandBuilder().setName("play").setDescription("Play a song").addStringOption(o=>o.setName("q").setDescription("Query or URL").setRequired(true)).addChannelOption(o=>o.setName("channel").setDescription("Voice channel")),
      new SlashCommandBuilder().setName("pause").setDescription("Pause"),
      new SlashCommandBuilder().setName("resume").setDescription("Resume"),
      new SlashCommandBuilder().setName("seek").setDescription("Seek seconds").addIntegerOption(o=>o.setName("seconds").setDescription("to seconds").setRequired(true)),
      new SlashCommandBuilder().setName("skip").setDescription("Skip"),
      new SlashCommandBuilder().setName("stop").setDescription("Stop")
    ].map(c=>c.toJSON());
    const rest = new REST({ version: "10" }).setToken(CONFIG.token);
    await rest.put(Routes.applicationCommands(CONFIG.clientId), { body: commands });
    console.log("Slash commands registered.");
  }catch(e){ console.error("Slash reg failed", e); }
}

client.once("ready", async () => {
  console.log(`Logged in as ${client.user.tag}`);
  await registerSlash();
  if (!globalThis.__WEB_STARTED__) {
    globalThis.__WEB_STARTED__ = true;
    startWeb(client, music, CONFIG.port);
  }
});

client.on("interactionCreate", async (i)=>{
  if (!i.isChatInputCommand()) return;
  const gid = i.guildId;
  try{
    if (i.commandName === "join") {
      const ch = i.options.getChannel("channel", true);
      await music.join(i.guild, ch.id);
      await i.reply({ content: "Joined "+ch.name, ephemeral: true });
    } else if (i.commandName === "play") {
      const q = i.options.getString("q", true);
      const ch = i.options.getChannel("channel") || i.member.voice.channel;
      if (!ch) return i.reply({content:"בחר ערוץ voice", ephemeral:true});
      await music.play(gid, ch.id, q);
      await i.reply({ content: "Playing: "+q, ephemeral: true });
    } else if (i.commandName === "pause") {
      music.pause(gid); await i.reply({ content: "⏸️", ephemeral: true });
    } else if (i.commandName === "resume") {
      music.resume(gid); await i.reply({ content: "▶️", ephemeral: true });
    } else if (i.commandName === "seek") {
      const s = i.options.getInteger("seconds", true);
      music.seek(gid, s); await i.reply({ content: `⏩ ${s}s`, ephemeral: true });
    } else if (i.commandName === "skip") {
      music.skip(gid); await i.reply({ content: "⏭️", ephemeral: true });
    } else if (i.commandName === "stop") {
      music.stop(gid); await i.reply({ content: "⏹️", ephemeral: true });
    }
  } catch (e) {
    console.error(e);
    if (i.deferred || i.replied) await i.followUp({ content: "❌ "+e.message, ephemeral: true });
    else await i.reply({ content: "❌ "+e.message, ephemeral: true });
  }
});

client.login(CONFIG.token);
