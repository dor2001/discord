
import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { moveToChannel, state, ensureLockOrThrow, play, stop as stopPlay, unlockGuild, seek as seekPlay } from '../player/manager.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../../public')));

let clientRef = null; // set from bot.js

export function bindDiscordClient(client){
  clientRef = client;
}

// ---- API ----
app.get('/api/guilds', async (req, res) => {
  try {
    const guilds = clientRef.guilds.cache.map(g => ({ id: g.id, name: g.name, icon: g.icon }));
    res.json({ ok: true, guilds });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

app.get('/api/guilds/:gid/channels', async (req, res) => {
  try {
    const { gid } = req.params;
    const type = (req.query.type || 'voice').toLowerCase();
    const guild = clientRef.guilds.cache.get(gid) || await clientRef.guilds.fetch(gid);
    await guild.channels.fetch();
    const channels = guild.channels.cache
      .filter(ch => {
        if (type === 'voice') return ch.type === 2;
        if (type === 'text')  return ch.type === 0;
        return false;
      })
      .map(ch => ({ id: ch.id, name: ch.name, type: ch.type }));
    res.json({ ok: true, channels });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

app.post('/api/guilds/:gid/move', async (req, res) => {
  try {
    const { gid } = req.params;
    const { channelId, lock } = req.body;
    const guild = clientRef.guilds.cache.get(gid) || await clientRef.guilds.fetch(gid);
    const ch = await guild.channels.fetch(channelId);
    if (!ch || ch.type !== 2) return res.status(400).json({ ok:false, error:'channelId אינו ערוץ קול' });
    const s = await moveToChannel(guild, ch.id, !!lock);
    res.json({ ok: true, moved:true, locked: !!s.lockedChannelId, channel: { id: ch.id, name: ch.name } });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

app.post('/api/guilds/:gid/unlock', async (req, res) => {
  try {
    const { gid } = req.params;
    unlockGuild(gid);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// Search via yt-dlp
const YTDLP = '/usr/local/bin/yt-dlp';
app.get('/api/search', async (req, res) => {
  const q = (req.query.q||'').trim();
  if (!q) return res.status(400).json({ ok: false, error: 'missing q' });
  const args = ['--dump-json','--no-warnings','--default-search','ytsearch','ytsearch10:'+q];
  execFile(YTDLP, args, { timeout: 15000, maxBuffer: 5*1024*1024 }, (err, stdout, stderr) => {
    if (err) return res.status(500).json({ ok:false, error:String(err), stderr });
    const items = stdout.split('\n').filter(Boolean).map(l=>{
      try {
        const j = JSON.parse(l);
        return { id:j.id, title:j.title, url:j.webpage_url, duration:j.duration, thumbnail:(j.thumbnails?.[0]?.url)||null, uploader:j.uploader };
      } catch { return null; }
    }).filter(Boolean);
    res.json({ ok:true, items });
  });
});

// Play current selection URL in channel
app.post('/api/play', async (req, res) => {
  try {
    const { gid, channelId, url } = req.body;
    if (!gid || !channelId || !url) return res.status(400).json({ ok:false, error:'gid, channelId, url נדרשים' });
    const guild = clientRef.guilds.cache.get(gid) || await clientRef.guilds.fetch(gid);
    ensureLockOrThrow(gid, channelId);
    const r = await play(guild, channelId, url, 0);
    res.json({ ok:true, ...r });
  } catch (e) {
    res.status(500).json({ ok:false, error:String(e) });
  }
});

// Seek (seconds)
app.post('/api/seek', async (req, res) => {
  try {
    const { gid, seconds } = req.body;
    if (!gid) return res.status(400).json({ ok:false, error:'gid נדרש' });
    const guild = clientRef.guilds.cache.get(gid) || await clientRef.guilds.fetch(gid);
    const r = await seekPlay(guild, Number(seconds)||0);
    res.json({ ok:true, ...r });
  } catch (e) {
    res.status(500).json({ ok:false, error:String(e) });
  }
});

app.post('/api/stop', async (req, res) => {
  try {
    const { gid } = req.body;
    if (!gid) return res.status(400).json({ ok:false, error:'gid נדרש' });
    stopPlay(gid);
    res.json({ ok:true });
  } catch (e) {
    res.status(500).json({ ok:false, error:String(e) });
  }
});

app.get('/healthz', (req,res)=>{
  const guilds = [];
  for (const [gid, s] of state.entries()){
    guilds.push({ gid, lockedChannelId: s.lockedChannelId||null, url: s.url||null });
  }
  res.json({ ok:true, guilds });
});

export function startWebServer(){
  const port = Number(process.env.PANEL_PORT || 3000);
  app.listen(port, '0.0.0.0', ()=>console.log(`Web UI on http://localhost:${port}`));
}

