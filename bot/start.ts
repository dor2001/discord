import { startBot } from "./index"
import { config } from "./config"

if (!config.discordToken) {
  console.error("[v0] DISCORD_TOKEN environment variable is required!")
  console.error("[v0] Please set DISCORD_TOKEN in your environment or .env file")
  process.exit(1)
}

// Start the Discord bot
startBot()
  .then(() => {
    console.log("[v0] Discord bot started successfully")
  })
  .catch((error) => {
    console.error("[v0] Failed to start Discord bot:", error)
    process.exit(1)
  })

// Handle graceful shutdown
process.on("SIGTERM", () => {
  console.log("[v0] SIGTERM received, shutting down gracefully")
  process.exit(0)
})

process.on("SIGINT", () => {
  console.log("[v0] SIGINT received, shutting down gracefully")
  process.exit(0)
})
