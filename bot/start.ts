import { startBot } from "./index"

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
