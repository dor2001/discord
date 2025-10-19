export const CONFIG = {
  token: process.env.DISCORD_TOKEN || process.env.TOKEN || "",
  clientId: process.env.CLIENT_ID || "",
  dashboardOrigin: process.env.DASHBOARD_ORIGIN || "*",
  port: Number(process.env.PORT || process.env.PANEL_PORT || 3000)
};
