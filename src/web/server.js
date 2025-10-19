import express from "express";
import session from "express-session";
import fetch from "node-fetch";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PIPED_URL = process.env.PIPED_URL || "https://piped.video";
const PORT = Number(process.env.PORT || process.env.PANEL_PORT || 3000);

export function createWebServer(ctx) {
  const app = express();
  app.use(express.json());

  app.use(session({
    secret: process.env.SESSION_SECRET || "changeme",
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 12 }
  }));

  // Simple login
  app.post("/api/login", (req,res)=>{
    const { username, password } = req.body || {};
    if (username === (process.env.ADMIN_USER||"admin") && password === (process.env.ADMIN_PASS||"admin123")) {
      req.session.user = { username };
      return res.json({ ok: true });
    }
    return res.status(401).json({ ok: false, error: "Unauthorized" });
  });

  app.post("/api/logout", (req,res)=>{
    req.session.destroy(()=>res.json({ ok: true }));
  });

  const auth = (req,res,next)=>{
    if (req.session?.user) return next();
    res.status(401).json({ error: "Unauthorized" });
  };

  // List guilds
  app.get("/api/guilds", auth, (req,res)=>{
    const guilds = ctx.client.guilds.cache.map(g=>({ id: g.id, name: g.name }));
    res.json(guilds);
  });

  // List voice channels in a guild
  app.get("/api/channels", auth, async (req,res)=>{
    const { guildId } = req.query;
    const guild = ctx.client.guilds.cache.get(guildId);
    if (!guild) return res.status(404).json({ error: "Guild not found" });
    const channels = (await guild.channels.fetch()).filter(c=>c && c.type===2).map(c=>({ id: c.id, name: c.name }));
    res.json(channels);
  });

  // Lock/unlock voice channel
  app.post("/api/lock", auth, async (req,res)=>{
    const { guildId, channelId } = req.body;
    const g = ctx.client.guilds.cache.get(guildId);
    if (!g) return res.status(404).json({ error: "Guild not found" });
    ctx.getMusic(guildId).setLock(channelId||null);
    res.json({ ok: true, lockedChannelId: channelId || null });
  });

  // Move bot
  app.post("/api/move", auth, async (req,res)=>{
    try {
      const { guildId, channelId } = req.body;
      const g = ctx.client.guilds.cache.get(guildId);
      if (!g) return res.status(404).json({ error: "Guild not found" });
      await ctx.getMusic(guildId).move(channelId);
      res.json({ ok: true });
    } catch (e) {
      res.status(400).json({ error: String(e.message||e) });
    }
  });

  // Piped search (YouTube mirror)
  app.get("/api/search", auth, async (req,res)=>{
    const q = (req.query.q||"").toString().trim();
    if (!q) return res.json([]);
    const url = `${PIPED_URL}/api/v1/search?q=${encodeURIComponent(q)}&region=US&filter=videos`;
    const data = await fetch(url).then(r=>r.json());
    const items = (data || []).map(v=>({
      videoId: v?.url?.split("watch?v=").pop() || v?.url?.split("/watch/").pop() || v?.id || v?.shortId || v?.url,
      title: v.title,
      duration: v.duration
    })).filter(x=>x.videoId);
    res.json(items.slice(0, 25));
  });

  // Play
  app.post("/api/play", auth, async (req,res)=>{
    try {
      const { guildId, channelId, videoId } = req.body;
      const g = ctx.client.guilds.cache.get(guildId);
      if (!g) return res.status(404).json({ error: "Guild not found" });
      const music = ctx.getMusic(guildId);
      if (channelId) await music.move(channelId);
      const meta = await music.addByVideoId(videoId, req.session.user.username);
      res.json({ ok: true, now: music.getState() });
    } catch (e) {
      res.status(400).json({ error: String(e.message||e) });
    }
  });

  app.post("/api/seek", auth, async (req,res)=>{
    try {
      const { guildId, seconds } = req.body;
      const music = ctx.getMusic(guildId);
      await music.seek(Number(seconds||0));
      res.json({ ok: true, now: music.getState().current });
    } catch (e) {
      res.status(400).json({ error: String(e.message||e) });
    }
  });

  app.post("/api/skip", auth, (req,res)=>{
    const { guildId } = req.body;
    ctx.getMusic(guildId).skip();
    res.json({ ok: true });
  });

  app.post("/api/pause", auth, (req,res)=>{
    const { guildId } = req.body;
    ctx.getMusic(guildId).pause();
    res.json({ ok: true });
  });

  app.post("/api/resume", auth, (req,res)=>{
    const { guildId } = req.body;
    ctx.getMusic(guildId).resume();
    res.json({ ok: true });
  });

  app.post("/api/stop", auth, (req,res)=>{
    const { guildId } = req.body;
    ctx.getMusic(guildId).stop();
    res.json({ ok: true });
  });

  app.get("/api/state", auth, (req,res)=>{
    const { guildId } = req.query;
    const music = ctx.getMusic(guildId);
    res.json(music.getState());
  });

  // Static UI
  app.use(express.static(path.join(__dirname, "static")));
  app.get("*", (req,res)=>{
    res.sendFile(path.join(__dirname, "static", "index.html"));
  });

  const server = app.listen(PORT, ()=>{
    console.log(`Web UI on http://localhost:${PORT}`);
  });

  return { app, server };
}
