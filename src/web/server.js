import express from "express";
import http from "http";
import { Server as IOServer } from "socket.io";
import cors from "cors";
import bodyParser from "body-parser";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CONFIG } from "../config.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let __serverRef = null;
let __ioRef = null;

export function startWeb(client, music, port=3000){
  if (__serverRef) return __serverRef;

  const app = express();
  app.use(cors({ origin: CONFIG.dashboardOrigin, credentials: true }));
  app.use(bodyParser.json());
  app.use(express.static(path.resolve(__dirname, "../../public")));

  // APIs
  app.get("/api/guilds", async (req, res)=>{
    try{
      const guilds = await client.guilds.fetch();
      const list = [];
      for (const [id, g] of guilds){
        const gfull = await g.fetch();
        list.push({ id, name: gfull.name, icon: gfull.icon, voiceStates: gfull.voiceStates?.cache?.size || 0 });
      }
      res.json(list);
    }catch(e){ console.error(e); res.status(500).json({error:e.message}); }
  });

  app.get("/api/guilds/:gid/channels", async (req, res)=>{
    try{
      const g = await client.guilds.fetch(req.params.gid);
      const channels = await g.channels.fetch();
      const out = Array.from(channels.values()).map(c=>({ id: c.id, name: c.name, type: c.type }));
      res.json(out);
    }catch(e){ console.error(e); res.status(500).json({error:e.message}); }
  });

  app.get("/api/guilds/:gid/state", (req,res)=>{
    res.json(music.getState(req.params.gid));
  });

  app.post("/api/guilds/:gid/play", async (req,res)=>{
    const { voiceChannelId, query } = req.body || {};
    try{
      const state = await music.play(req.params.gid, voiceChannelId, query);
      res.json(state);
    }catch(e){ res.status(500).json({error:e.message}); }
  });

  app.post("/api/guilds/:gid/pause", (req,res)=>{ music.pause(req.params.gid); res.json({ok:true}); });
  app.post("/api/guilds/:gid/resume", (req,res)=>{ music.resume(req.params.gid); res.json({ok:true}); });
  app.post("/api/guilds/:gid/seek", (req,res)=>{ const { seconds } = req.body||{}; music.seek(req.params.gid, Number(seconds||0)); res.json({ok:true}); });
  app.post("/api/guilds/:gid/skip", (req,res)=>{ music.skip(req.params.gid); res.json({ok:true}); });
  app.post("/api/guilds/:gid/back", (req,res)=>{ music.back(req.params.gid); res.json({ok:true}); });
  app.post("/api/guilds/:gid/stop", (req,res)=>{ music.stop(req.params.gid); res.json({ok:true}); });
  app.post("/api/guilds/:gid/volume", (req,res)=>{ const { volume }=req.body||{}; music.setVolume(req.params.gid, Number(volume||1)); res.json({ok:true}); });

  app.get("/", (req,res)=>{
    res.sendFile(path.resolve(__dirname, "../../public/index.html"));
  });

  const server = http.createServer(app);
  const io = new IOServer(server, { cors: { origin: CONFIG.dashboardOrigin, methods: ["GET","POST"] } });
  __ioRef = io;

  io.on("connection", (socket)=>{
    socket.on("watch", (gid)=>{
      socket.join("g:"+gid);
      socket.emit("state", music.getState(gid));
    });
  });

  music.on("update", (gid)=>{
    io.to("g:"+gid).emit("state", music.getState(gid));
  });

  server.on("error", (err)=>{
    if (err.code === "EADDRINUSE") {
      console.warn(`[web] port ${port} busy; skip second start`);
      return;
    }
    throw err;
  });

  __serverRef = server.listen(port, "0.0.0.0", ()=>{
    console.log(`Web UI on http://localhost:${port}`);
  });

  return __serverRef;
}
