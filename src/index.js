require('dotenv').config();
const express = require('express');
const session = require('express-session');
const { Server } = require('socket.io');
const http = require('http');
const path = require('path');
const { Client, GatewayIntentBits, Partials, Events, PermissionsBitField, EmbedBuilder } = require('discord.js');
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
app.use(session({ secret: process.env.SESSION_SECRET || 'dev_secret', resave: false, saveUninitialized: false }));

function requireAuth(req, res, next) { if (req.session?.authed) return next(); res.redirect('/login'); }
app.get('/login', (req, res) => res.render('login'));
app.post('/login', (req, res) => { const { user, pass } = req.body; if (user === (process.env.ADMIN_USER || 'admin') && pass === (process.env.ADMIN_PASS || 'admin123')) { req.session.authed = true; res.redirect('/'); } else res.render('login', { error: 'שם משתמש או סיסמה שגויים' }); });
app.get('/logout', (req, res) => { req.session.destroy(()=>res.redirect('/login')); });
app.get('/', requireAuth, (req, res) => res.render('dashboard', { page: 'dashboard' }));
app.get('/settings', requireAuth, (req, res) => res.render('settings', { page: 'settings' }));

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent], partials: [Partials.Channel] });
const players = new Map(); const playlists = new Map(); const liveMsg = new Map();

function getPlayer(guildId) {
  if (!players.has(guildId)) {
    const gp = new GuildPlayer(client, guildId);
    gp.on('started', ({ track }) => { addPlayed(guildId, track); maybeAnnounce(guildId, track.title, gp.getState().queue); io.to(guildId).emit('state', gp.getState()); });
    players.set(guildId, gp);
  }
  return players.get(guildId);
}
function getGuildPlaylists(guildId) { if (!playlists.has(guildId)) playlists.set(guildId, new Map()); return playlists.get(guildId); }

client.once(Events.ClientReady, () => { console.log(`Logged in as ${client.user.tag}`); });

function pickVoiceChannelId(interaction) { const gs = getGuildSettings(interaction.guildId); const userVC = interaction?.member?.voice?.channelId; return userVC || gs.defaultVoiceChannelId || process.env.VOICE_CHANNEL_ID; }

async function maybeAnnounce(guildId, title, queue) {
  const gs = getGuildSettings(guildId); if (!gs.announceLive || !gs.announceChannelId) return;
  try {
    const channel = await client.channels.fetch(gs.announceChannelId);
    const embed = new EmbedBuilder().setColor(0x1DB954).setTitle('🎵 עכשיו מתנגן').setDescription(title || '—').addFields({ name: 'תור', value: (queue||[]).slice(0,8).map((t,i)=>`${i+1}. ${t.title}`).join('\n') || '—' }).setTimestamp(new Date());
    const prev = liveMsg.get(guildId);
    if (prev?.channelId === gs.announceChannelId && prev?.messageId) { const msg = await channel.messages.fetch(prev.messageId).catch(()=>null); if (msg) { await msg.edit({ embeds: [embed] }); return; } }
    const sent = await channel.send({ embeds: [embed] }); liveMsg.set(guildId, { channelId: channel.id, messageId: sent.id });
  } catch {}
}

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  const guildId = interaction.guildId;
  const player = getPlayer(guildId);
  player.setTextChannel(interaction.channel);
  const isAdmin = ()=> { try { return interaction.member.permissions.has(PermissionsBitField.Flags.Administrator); } catch { return false; } };

  try {
    if (interaction.commandName === 'join') { const vc = pickVoiceChannelId(interaction); player.join(vc); await interaction.reply({ content: '✅ נכנסתי לערוץ הקולי.', flags: 64 }); }
    if (interaction.commandName === 'play') {
      const q = interaction.options.getString('query', true); const vc = pickVoiceChannelId(interaction); if (!player.connection) player.join(vc);
      await interaction.deferReply({ flags: 64 }); const results = await ytSearch(q); const first = results[0];
      if (!first || !first.url) { await interaction.editReply('❌ לא נמצאה תוצאה מתאימה.'); return; }
      await player.enqueue({ ...first, requestedBy: interaction.user.tag }); await interaction.editReply(`✅ הוספתי לתור: **${first.title}**`); io.to(guildId).emit('state', player.getState());
    }
    if (interaction.commandName === 'skip') { player.skip(); await interaction.reply({ content: '⏭️ דילגתי', flags: 64 }); }
    if (interaction.commandName === 'pause') { player.pause(); await interaction.reply({ content: '⏸️ השהיתי', flags: 64 }); }
    if (interaction.commandName === 'resume') { player.resume(); await interaction.reply({ content: '▶️ ממשיך', flags: 64 }); }
    if (interaction.commandName === 'stop') { if (!isAdmin()) return interaction.reply({ content: 'רק אדמין יכול.', flags: 64 }); player.stop(); await interaction.reply({ content: '⛔ עצרתי וניקיתי את התור', flags: 64 }); io.to(guildId).emit('state', player.getState()); }
    if (interaction.commandName === 'remove') { if (!isAdmin()) return interaction.reply({ content: 'רק אדמין יכול.', flags: 64 }); const idx1 = interaction.options.getInteger('index', true); const removed = player.removeAt(idx1 - 1); await interaction.reply({ content: removed ? `🗑️ הוסר: **${removed.title}**` : 'אינדקס לא תקין', flags: 64 }); io.to(guildId).emit('state', player.getState()); }
    if (interaction.commandName === 'move') { if (!isAdmin()) return interaction.reply({ content: 'רק אדמין יכול.', flags: 64 }); const from = interaction.options.getInteger('from', true) - 1; const to = interaction.options.getInteger('to', true) - 1; const ok = player.move(from, to); await interaction.reply({ content: ok ? '✅ הוזז' : '❌ מיקום לא תקין', flags: 64 }); io.to(guildId).emit('state', player.getState()); }
    if (interaction.commandName === 'volume') { if (!isAdmin()) return interaction.reply({ content: 'רק אדמין יכול.', flags: 64 }); const p = interaction.options.getInteger('percent', true); player.setVolume((p||100)/100); await interaction.reply({ content: `🔊 ווליום: ${Math.round((player.getState().volume||1)*100)}%`, flags: 64 }); }
    if (interaction.commandName === 'repeat') { const mode = interaction.options.getString('mode', true); if (!['off','one','all'].includes(mode)) return interaction.reply({ content: 'off | one | all', flags: 64 }); player.setRepeat(mode); await interaction.reply({ content: `🔁 repeat: ${mode}`, flags: 64 }); }
    if (interaction.commandName === 'shuffle') { if (!isAdmin()) return interaction.reply({ content: 'רק אדמין יכול.', flags: 64 }); player.shuffle(); await interaction.reply({ content: `🔀 ערבבתי`, flags: 64 }); io.to(guildId).emit('state', player.getState()); }
    if (interaction.commandName === 'now') { const st = player.getState(); await interaction.reply({ content: st.current ? `🎶 עכשיו: **${st.current.title}**` : '—', flags: 64 }); }
    if (interaction.commandName === 'settings') { const s = getGuildSettings(guildId); await interaction.reply({ content: '```json\n'+JSON.stringify(s,null,2)+'\n```', flags: 64 }); }
    if (interaction.commandName === 'import') {
      if (!isAdmin()) return interaction.reply({ content: 'רק אדמין יכול.', flags: 64 });
      const url = interaction.options.getString('url', true); const name = interaction.options.getString('name', true);
      await interaction.deferReply({ flags: 64 }); const { title, items } = await importYouTubePlaylist(url);
      const store = getGuildPlaylists(guildId); store.set(name, items);
      await interaction.editReply(`✅ יובא **${title}** אל הפלייליסט **${name}** (${items.length} שירים).`);
    }
    if (interaction.commandName === 'recommend') {
      const limit = interaction.options.getInteger('limit') || 12;
      await interaction.deferReply({ flags: 64 });
      const settings = getGuildSettings(guildId);
      const played = getPlayed(guildId).slice(-200).map(x=>x.title);
      const items = await recommend({ playedTitles: played, preferredGenres: settings.preferredGenres||[], limit });
      await interaction.editReply(`🎯 שלחתי ${items.length} הצעות לפאנל.`);
      io.to(guildId).emit('recommendations', items);
    }
  } catch (e) { console.error(e); try { await interaction.reply({ content: '❌ שגיאה', flags: 64 }); } catch {} }
});

io.on('connection', (socket) => {
  const guildId = process.env.GUILD_ID; socket.join(guildId);
  const player = getPlayer(guildId); const store = getGuildPlaylists(guildId);
  function emitAll() { socket.emit('state', player.getState()); socket.emit('playlists', Array.from(store.keys())); socket.emit('settings', getGuildSettings(guildId)); socket.emit('history', getPlayed(guildId)); }
  emitAll();

  socket.on('join', () => { try { const s=getGuildSettings(guildId); const vc = s.defaultVoiceChannelId || process.env.VOICE_CHANNEL_ID; if (!vc) throw new Error('No voice channel configured.'); player.join(vc); socket.emit('toast','Joined voice channel'); io.to(guildId).emit('state', player.getState()); } catch (e) { socket.emit('toast','Join failed: '+e.message); } });
  socket.on('search', async (q) => { try { const results = await ytSearch(q); socket.emit('searchResults', results); } catch (e) { socket.emit('toast','Search failed: '+e.message); } });
  socket.on('enqueue', async (track) => { try { if (!player.connection) { const s=getGuildSettings(guildId); const vc=s.defaultVoiceChannelId||process.env.VOICE_CHANNEL_ID; if (!vc) throw new Error('No voice channel configured.'); player.join(vc);} await player.enqueue({ ...track, requestedBy: 'WebPanel' }); io.to(guildId).emit('state', player.getState()); } catch (e) { socket.emit('toast','Enqueue failed: '+e.message); } });
  socket.on('queue:remove', (index) => { player.removeAt(index); io.to(guildId).emit('state', player.getState()); });
  socket.on('queue:reorder', (ids) => { player.reorderByIds(ids); io.to(guildId).emit('state', player.getState()); });
  socket.on('pause', () => { player.pause(); io.to(guildId).emit('state', player.getState()); });
  socket.on('resume', () => { player.resume(); io.to(guildId).emit('state', player.getState()); });
  socket.on('skip', () => { player.skip(); io.to(guildId).emit('state', player.getState()); });
  socket.on('stop', () => { player.stop(); io.to(guildId).emit('state', player.getState()); });
  socket.on('volume', (v) => { player.setVolume(Number(v)); io.to(guildId).emit('state', player.getState()); });
  socket.on('repeat', (mode) => { player.setRepeat(mode); io.to(guildId).emit('state', player.getState()); });

  socket.on('playlist:create', (name) => { if (!store.has(name)) store.set(name, []); emitAll(); });
  socket.on('playlist:delete', (name) => { store.delete(name); emitAll(); });
  socket.on('playlist:addTrack', ({ name, track }) => { if (!store.has(name)) store.set(name, []); store.get(name).push(track); emitAll(); });
  socket.on('playlist:load', async (name) => { const arr = store.get(name) || []; for (const t of arr) await player.enqueue({ ...t, requestedBy: 'WebPanel' }); io.to(guildId).emit('state', player.getState()); });

  socket.on('playlist:import', async ({ url, name }) => { try { const { title, items } = await importYouTubePlaylist(url); store.set(name, items); socket.emit('toast', `יובא ${title} (${items.length}) אל ${name}`); emitAll(); } catch (e) { socket.emit('toast','Import failed: '+e.message); } });
  socket.on('recommend:get', async () => { const settings = getGuildSettings(guildId); const played = getPlayed(guildId).slice(-200).map(x=>x.title); const items = await recommend({ playedTitles: played, preferredGenres: settings.preferredGenres||[], limit: 12 }); socket.emit('recommendations', items); });

  socket.on('settings:save', (patch) => { const merged = setGuildSettings(guildId, patch || {}); socket.emit('settings', merged); socket.emit('toast','הגדרות נשמרו'); });
  socket.on('getState', emitAll);
});

server.listen(PORT, () => { console.log('Web panel listening on :' + PORT); });
client.login(process.env.DISCORD_TOKEN);
