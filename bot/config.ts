export const config = {
  discordToken: process.env.DISCORD_BOT_TOKEN || "",
  pipedInstance: process.env.PIPED_INSTANCE || "https://pipedapi.kavin.rocks",
  cookiesPath: process.env.COOKIES_PATH || "./data/cookies.txt",
  dataPath: process.env.DATA_PATH || "./data",
  sessionSecret: process.env.SESSION_SECRET || "change-this-secret-in-production",
  adminUsername: process.env.ADMIN_USERNAME || "admin",
  adminPassword: process.env.ADMIN_PASSWORD || "admin",
  port: Number.parseInt(process.env.PORT || "3000", 10),
}

// Validate required config
if (!config.discordToken) {
  console.error("[v0] DISCORD_BOT_TOKEN is required!")
  process.exit(1)
}
