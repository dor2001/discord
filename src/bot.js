import { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, ChannelType } from 'discord.js';
import { MusicManager } from './music/MusicManager.js';
import { CONFIG } from './config.js';
import { startWeb } from './web/server.js';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const music = new MusicManager(client);

// Simple slash commands as fallback
const commands = [
  new SlashCommandBuilder().setName('join').setDescription('Join a voice channel')
    .addChannelOption(opt => opt.setName('channel').setDescription('Voice channel').addChannelTypes(ChannelType.GuildVoice).setRequired(true)),
  new SlashCommandBuilder().setName('play').setDescription('Play a song or URL')
    .addStringOption(opt => opt.setName('query').setDescription('YouTube URL or search').setRequired(true)),
  new SlashCommandBuilder().setName('pause').setDescription('Pause current'),
  new SlashCommandBuilder().setName('resume').setDescription('Resume'),
  new SlashCommandBuilder().setName('skip').setDescription('Skip'),
  new SlashCommandBuilder().setName('seek').setDescription('Seek to seconds')
    .addIntegerOption(opt => opt.setName('seconds').setDescription('Absolute seconds').setRequired(true)),
  new SlashCommandBuilder().setName('np').setDescription('Now playing'),
  new SlashCommandBuilder().setName('leave').setDescription('Leave voice')
].map(c => c.toJSON());

async function registerCommands(){
  if (!CONFIG.clientId || !CONFIG.token) return;
  const rest = new REST({ version: '10' }).setToken(CONFIG.token);
  await rest.put(Routes.applicationCommands(CONFIG.clientId), { body: commands });
  console.log('Slash commands registered.');
}

const onReady = async () => {
  console.log(`Logged in as ${client.user.tag}`);
  await registerCommands();
  // Start web dashboard on same process
  startWeb(client, music, CONFIG.port);
};
client.once('ready', onReady);
client.once('clientReady', onReady);

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  const guildId = interaction.guildId;
  const gp = music.getOrCreate(guildId);

  try{
    switch(interaction.commandName){
      case 'join': {
        const ch = interaction.options.getChannel('channel');
        await gp.join(ch.id);
        await interaction.reply({ content: `Joined ${ch.name}`, ephemeral: true });
        break;
      }
      case 'play': {
        const q = interaction.options.getString('query');
        await interaction.deferReply();
        await gp.play(q, interaction.user.username);
        await interaction.editReply(`Playing: ${gp.current?.info?.title || q}`);
        break;
      }
      case 'pause': await gp.pause(); await interaction.reply({ content: 'Paused', ephemeral: true }); break;
      case 'resume': await gp.resume(); await interaction.reply({ content: 'Resumed', ephemeral: true }); break;
      case 'skip': await gp.skip(); await interaction.reply({ content: 'Skipped', ephemeral: true }); break;
      case 'seek': {
        const seconds = interaction.options.getInteger('seconds');
        await gp.seekAbsolute(seconds);
        await interaction.reply({ content: `Seeked to ${seconds}s`, ephemeral: true });
        break;
      }
      case 'np': {
        const st = gp.getState();
        await interaction.reply({ content: st.nowPlaying ? `${st.nowPlaying.title} — ${st.nowPlaying.positionInSec}/${st.nowPlaying.durationInSec}s` : 'Nothing playing' });
        break;
      }
      case 'leave': gp.leave(); await interaction.reply({ content: 'Disconnected', ephemeral: true }); break;
    }
  } catch(e){
    console.error(e);
    if (interaction.deferred || interaction.replied){
      await interaction.editReply(`❌ ${e.message}`);
    } else {
      await interaction.reply({ content: `❌ ${e.message}`, ephemeral: true });
    }
  }
});

client.login(CONFIG.token);
