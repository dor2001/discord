// src/web/server.js
import express from 'express';
import cors from 'cors';

export function createWebServer({ client }) {
  const app = express();
  app.use(cors({ origin: true }));
  app.use(express.json());

  // בריאות לקונטיינר/קוליפיי
  app.get('/healthz', (req, res) => {
    const up = client?.user ? 'ok' : 'starting';
    res.status(up === 'ok' ? 200 : 503).json({ status: up });
  });

  // רשימת השרתים שהבוט מחובר אליהם
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
