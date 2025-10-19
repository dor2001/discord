import express from 'express';
import cors from 'cors';

export function createWebServer({ client }) {
  const app = express();

  // אפשר להתאים את המקור לפי סביבת הייצור (דומיין שלך)
  app.use(cors({ origin: true }));
  app.use(express.json());

  // בריאות לקונטיינר / לדוקר
  app.get('/healthz', (req, res) => {
    const up = client?.user ? 'ok' : 'starting';
    res.status(up === 'ok' ? 200 : 503).json({ status: up });
  });

  // >>> הנתיב החשוב: החזרת רשימת השרתים שהבוט מחובר אליהם
  app.get('/api/guilds', (req, res) => {
    try {
      // דורש GatewayIntentBits.Guilds כדי שה-cache יתמלא!
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

  // (אופציונלי) סטטי ללוח – אם יש לך קבצי frontend
  // app.use(express.static('public'));

  return app;
}
