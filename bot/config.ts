export const config = {
  discordToken: process.env.DISCORD_TOKEN || "",
  pipedInstance: process.env.PIPED_INSTANCE || "https://pipedapi.adminforge.de",
  cookiesPath: process.env.COOKIES_PATH || "./data/cookies.txt",
  dataPath: process.env.DATA_PATH || "./data",
  sessionSecret: process.env.SESSION_SECRET || "change-this-secret-in-production",
  adminUsername: process.env.ADMIN_USER || "admin",
  adminPassword: process.env.ADMIN_PASS || "admin",
  port: Number.parseInt(process.env.PORT || "3000", 10),
}
