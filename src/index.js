require('dotenv').config();
const express = require('express');
const session = require('express-session');
const { Server } = require('socket.io');
const http = require('http');
const path = require('path');
const {
  Client,
  GatewayIntentBits,
  Partials,
  Events,
  PermissionsBitField,
  EmbedBuilder
} = require('discord.js');
const { GuildPlayer } = require('./music/player');
const { ytSearch } = require('./util/search');
const { getGuildSettings, setGuildSettings } = require('./util/settings');
const { addPlayed, getPlayed } = require('./util/history');
const { importYouTubePlaylist } = require('./util/playlist_import');
const { recommend } = require('./util/reco');

const PORT = process.env.PANEL_PORT || 3000;
const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'dev_secret',
    resave: false,
    saveUninitialized: false
  })
);

// ---- Login Pages ----
function requireAuth(req, res, next) {
  if (req.session?.authed) return next();
  res.redirect('/login');
}
app.get('/login', (req, res) => res.render('login'));
app.post('/login', (req, res) => {
  const { user, pass } = req.body;
  if (
    user === (process.env.ADMIN_USER || 'admin') &&
    pass === (process.env.ADMIN_PASS || 'admin123')
  ) {
    req.session.authed = true;
    res.redirect('/');
  } else res.render('login', { error: 'שם משתמש או סיסמה שגויים' });
});
app.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
});
app.get('/', requireAuth, (req, res) =>
  res.render('dashboard', { page: 'dashboard' })
);
app.get('/settings', requireAuth, (req, res) =>
  res.render('settings', { page: 'settings' })
);

// ---- Discord Client ----
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel]
});

const players = new Map();
const playlists = new Map();
const liveMsg = new Map();

function getPlayer(guild) {
  if (!players.has(guild.id)) {
    const gp = new GuildPlayer(guild, io);
    gp.on('started', ({ track }) => {
      addPlayed(guild.id, track);
      maybeAnnounce(guild.id, track.title, gp.getState().queue);
      io.to(guild.id).emit('state', gp.getState());
    });
    players.set(guild.id, gp);
  }
  return players.get(guild.id);
}

function getGuildPlaylists(guildId) {
  if (!playlists.has(guildId)) playlists.set(guildId, new Map());
  return playlists.get(guildId);
}

client.once(Events.ClientReady, () => {
  console.log(`Logged in as ${client.user.tag}`);
});

function pickVoiceChannel(interaction) {
  const userVC = interaction?.member?.voice?.channel;
  const gs = getGuildSettings(interaction.guildId);
  return userVC || gs.defaultVoiceChannelId || process.env.VOICE_CHANNEL_ID;
}

async function maybeAnnounce(guildId, title, queue) {
  const gs = getGuildSettings(guildId);
  if (!gs.announceLive || !gs.announceChannelId) return;

  try {
    const channel = await client.channels.fetch(gs.announceChannelId);
    const embed = new EmbedBuilder()
      .setColor(0x1db954)
      .setTitle('🎵 עכשיו מתנגן')
      .setDescription(title || '—')
      .addFields({
        name: 'תור',
        value:
          (queue || [])
            .slice(0, 8)
            .map((t, i) => `${i + 1}. ${t.title}`)
            .join('\n') || '—'
      })
      .setTimestamp(new Date());

    const prev = liveMsg.get(guildId);
    if (prev?.channelId === gs.announceChannelId && prev?.messageId) {
      const msg = await channel.messages.fetch(prev.messageId).catch(() => null);
      if (msg) {
        await msg.edit({ embeds: [embed] });
        return;
      }
    }
    const sent = await channel.send({ embeds: [embed] });
    liveMsg.set(guildId, { channelId: channel.id, messageId: sent.id });
  } catch {}
}

// ---- Slash Commands ----
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  const guild = interaction.guild;
  const player = getPlayer(guild);
  const isAdmin = () => {
    try {
      return interaction.member.permissions.has(
        PermissionsBitField.Flags.Administrator
      );
    } catch {
      return false;
    }
  };

  try {
    if (interaction.commandName === 'join') {
      const vc = pickVoiceChannel(interaction);
      if (!vc) return interaction.reply('אין ערוץ קול מוגדר.');
      player.connect(vc);
      await interaction.reply({ content: '✅ נכנסתי לערוץ הקולי.', flags: 64 });
    }

    if (interaction.commandName === 'play') {
      const q = interaction.options.getString('query', true);
      const vc = pickVoiceChannel(interaction);
      if (!vc) return interaction.reply('אין ערוץ קול מוגדר.');
      if (!player.connection) player.connect(vc);
      await interaction.deferReply({ flags: 64 });
      const results = await ytSearch(q);
      const first = results[0];
      if (!first?.url)
        return await interaction.editReply('❌ לא נמצאה תוצאה מתאימה.');
      await player.enqueue({ ...first, requestedBy: interaction.user.tag });
      await interaction.editReply(`✅ הוספתי לתור: **${first.title}**`);
      io.to(guild.id).emit('state', player.getState());
    }

    if (interaction.commandName === 'skip') {
      player.skip();
      await interaction.reply({ content: '⏭️ דילגתי', flags: 64 });
    }

    if (interaction.commandName === 'stop') {
      if (!isAdmin()) return interaction.reply('רק אדמין יכול.');
      player.stop();
      await interaction.reply({ content: '⛔ עצרתי את התור', flags: 64 });
    }
  } catch (e) {
    console.error(e);
    try {
      await interaction.reply({ content: '❌ שגיאה', flags: 64 });
    } catch {}
  }
});

// ---- Socket.IO Panel Events ----
io.on('connection', (socket) => {
  const guild = client.guilds.cache.get(process.env.GUILD_ID);
  if (!guild) return;
  socket.join(guild.id);

  const player = getPlayer(guild);
  const store = getGuildPlaylists(guild.id);

  const emitAll = () => {
    socket.emit('state', player.getState());
    socket.emit('playlists', Array.from(store.keys()));
    socket.emit('settings', getGuildSettings(guild.id));
    socket.emit('history', getPlayed(guild.id));
  };

  emitAll();

  socket.on('join', () => {
    try {
      const s = getGuildSettings(guild.id);
      const vc = guild.channels.cache.get(
        s.defaultVoiceChannelId || process.env.VOICE_CHANNEL_ID
      );
      if (!vc) throw new Error('אין ערוץ קול מוגדר.');
      player.connect(vc);
      socket.emit('toast', 'Joined voice channel');
      io.to(guild.id).emit('state', player.getState());
    } catch (e) {
      socket.emit('toast', 'Join failed: ' + e.message);
    }
  });

  socket.on('enqueue', async (track) => {
    try {
      if (!player.connection) {
        const s = getGuildSettings(guild.id);
        const vc = guild.channels.cache.get(
          s.defaultVoiceChannelId || process.env.VOICE_CHANNEL_ID
        );
        if (!vc) throw new Error('אין ערוץ קול מוגדר.');
        player.connect(vc);
      }
      await player.enqueue({ ...track, requestedBy: 'WebPanel' });
      io.to(guild.id).emit('state', player.getState());
    } catch (e) {
      socket.emit('toast', 'Enqueue failed: ' + e.message);
    }
  });

  socket.on('skip', () => player.skip());
  socket.on('stop', () => player.stop());
});

server.listen(PORT, () => console.log('Web panel listening on :' + PORT));
client.login(process.env.DISCORD_TOKEN);
