// src/web/server.js
import express from 'express';
import cors from 'cors';

export function createWebServer({ client }) {
  const app = express();
  app.use(cors({ origin: true }));
  app.use(express.json());

  // Health for Coolify/docker
  app.get('/healthz', (_req, res) => {
    const ready = Boolean(client?.user);
    res.status(ready ? 200 : 503).json({ status: ready ? 'ok' : 'starting' });
  });

  // List guilds the bot is in
  app.get('/api/guilds', (_req, res) => {
    try {
      const guilds = client.guilds.cache.map(g => ({
        id: g.id,
        name: g.name,
        icon: g.iconURL?.() || null,
        memberCount: g.memberCount ?? null
      }));
      res.json({ guilds });
    } catch (err) {
      console.error('Failed to list guilds:', err);
      res.status(500).json({ error: 'Failed to list guilds' });
    }
  });

  return app;
}
