import dotenv from 'dotenv';
dotenv.config();

export const CONFIG = {
  token: process.env.DISCORD_TOKEN || '',
  clientId: process.env.CLIENT_ID || '',
  port: Number(process.env.PORT || process.env.PANEL_PORT || 3000),
  dashboardOrigin: process.env.DASHBOARD_ORIGIN || `http://localhost:${process.env.PORT || 3000}`
};

if (!CONFIG.token) {
  console.warn('[WARN] DISCORD_TOKEN missing in .env');
}
