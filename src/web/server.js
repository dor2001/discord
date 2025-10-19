import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import { CONFIG } from '../config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let __server;
export function startWeb(client, music, port){
  if (__server) return __server;
  const app = express();
  const server = http.createServer(app);
  const io = new SocketIOServer(server, {
    cors: { origin: '*', methods: ['GET','POST'] }
  });

  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(express.static(path.join(__dirname, '../../public')));

  // API
  app.get('/api/guilds', async (req,res)=>{
    try { const list = await music.listGuilds(); res.json(list); } catch(e) { res.status(500).json({error:e.message}); }
  });

  app.get('/api/guilds/:id/channels', async (req,res)=>{
    try { const list = await music.listChannels(req.params.id); res.json(list); } catch(e) { res.status(500).json({error:e.message}); }
  });

  app.post('/api/:guildId/join', async (req,res)=>{
    try{
      const { voiceChannelId, textChannelId } = req.body;
      const gp = music.getOrCreate(req.params.guildId);
      await gp.join(voiceChannelId);
      if (textChannelId) gp.setTextChannel(textChannelId);
      res.json(gp.getState());
      io.to(req.params.guildId).emit('state', gp.getState());
    } catch(e){
      res.status(400).json({ error: e.message });
    }
  });

  app.post('/api/:guildId/play', async (req,res)=>{
    try{
      const { query } = req.body;
      const gp = music.getOrCreate(req.params.guildId);
      const st = await gp.play(query, 'web');
      res.json(st);
      io.to(req.params.guildId).emit('state', gp.getState());
    } catch(e){
      res.status(400).json({ error: e.message });
    }
  });

  app.post('/api/:guildId/pause', (req,res)=>{
    const gp = music.getOrCreate(req.params.guildId);
    res.json(gp.pause());
    io.to(req.params.guildId).emit('state', gp.getState());
  });

  app.post('/api/:guildId/resume', (req,res)=>{
    const gp = music.getOrCreate(req.params.guildId);
    res.json(gp.resume());
    io.to(req.params.guildId).emit('state', gp.getState());
  });

  app.post('/api/:guildId/skip', (req,res)=>{
    const gp = music.getOrCreate(req.params.guildId);
    res.json(gp.skip());
    io.to(req.params.guildId).emit('state', gp.getState());
  });

  app.post('/api/:guildId/stop', (req,res)=>{
    const gp = music.getOrCreate(req.params.guildId);
    res.json(gp.stop());
    io.to(req.params.guildId).emit('state', gp.getState());
  });

  app.post('/api/:guildId/seek', async (req,res)=>{
    try{
      const { seconds } = req.body;
      const gp = music.getOrCreate(req.params.guildId);
      const st = await gp.seekAbsolute(Number(seconds || 0));
      res.json(st);
      io.to(req.params.guildId).emit('state', gp.getState());
    } catch(e){
      res.status(400).json({ error: e.message });
    }
  });

  app.post('/api/:guildId/forward', async (req,res)=>{
    try{
      const { by = 10 } = req.body;
      const gp = music.getOrCreate(req.params.guildId);
      const st = await gp.seekRelative(Number(by));
      res.json(st);
      io.to(req.params.guildId).emit('state', gp.getState());
    } catch(e){
      res.status(400).json({ error: e.message });
    }
  });

  app.post('/api/:guildId/backward', async (req,res)=>{
    try{
      const { by = 10 } = req.body;
      const gp = music.getOrCreate(req.params.guildId);
      const st = await gp.seekRelative(-Number(by));
      res.json(st);
      io.to(req.params.guildId).emit('state', gp.getState());
    } catch(e){
      res.status(400).json({ error: e.message });
    }
  });

  app.post('/api/:guildId/volume', (req,res)=>{
    const gp = music.getOrCreate(req.params.guildId);
    const { volume } = req.body;
    res.json(gp.setVolume(Number(volume)));
    io.to(req.params.guildId).emit('state', gp.getState());
  });

  app.get('/api/:guildId/state', (req,res)=>{
    const gp = music.getOrCreate(req.params.guildId);
    res.json(gp.getState());
  });

  // Sockets
  io.on('connection', (socket)=>{
    let guildId = null;
    socket.on('subscribe', (gid)=>{
      guildId = gid;
      socket.join(gid);
      const gp = music.getOrCreate(gid);
      socket.emit('state', gp.getState());
    });
    socket.on('disconnect', ()=>{
      if (guildId){ socket.leave(guildId); }
    });
  });

  server.listen(port, ()=>{
    console.log(`Web UI on http://localhost:${port}`);
  });

  return server;
}
