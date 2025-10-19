// src/web/server.js
import http from 'http';
import express from 'express';

let serverInstance = null;

export function buildApp() {
  const app = express();

  app.get('/', (_req, res) => {
    res.type('text/plain').send('Discord Music Bot Dashboard is running');
  });

  // Health endpoint for Docker HEALTHCHECK
  app.get('/healthz', (_req, res) => res.status(200).send('ok'));

  return app;
}

export async function startWeb({
  port = Number(process.env.PORT) || Number(process.env.PANEL_PORT) || 3000,
  app = buildApp(),
} = {}) {
  if (serverInstance && serverInstance.listening) {
    return serverInstance; // already running
  }

  await new Promise((resolve, reject) => {
    try {
      serverInstance = http.createServer(app);
      serverInstance.once('listening', () => {
        console.log(`Web UI on http://localhost:${port}`);
        resolve();
      });
      serverInstance.on('error', (err) => {
        if (err && err.code === 'EADDRINUSE') {
          console.error(`Port ${port} in use — skipping duplicate web start`);
          resolve(); // don't crash the process
        } else {
          reject(err);
        }
      });
      serverInstance.listen(port, '0.0.0.0');
    } catch (e) {
      reject(e);
    }
  });

  return serverInstance;
}

export function getServer() {
  return serverInstance;
}
