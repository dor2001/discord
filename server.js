import { createServer } from "http"
import { parse } from "url"
import next from "next"

const dev = process.env.NODE_ENV !== "production"
const hostname = process.env.HOSTNAME || "0.0.0.0"
const port = Number.parseInt(process.env.PORT || "3000", 10)

const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

async function startServer() {
  try {
    // Import and start the Discord bot
    const { startBot } = await import("./bot/index.js")
    const { config } = await import("./bot/config.js")

    if (!config.discordToken) {
      console.error("[v0] DISCORD_TOKEN environment variable is required!")
      console.error("[v0] Please set DISCORD_TOKEN in your environment or .env file")
      process.exit(1)
    }

    console.log("[v0] Starting Discord bot...")
    await startBot()
    console.log("[v0] Discord bot started successfully")

    // Prepare Next.js
    await app.prepare()

    // Create HTTP server
    createServer(async (req, res) => {
      try {
        const parsedUrl = parse(req.url, true)
        await handle(req, res, parsedUrl)
      } catch (err) {
        console.error("Error occurred handling", req.url, err)
        res.statusCode = 500
        res.end("internal server error")
      }
    }).listen(port, hostname, (err) => {
      if (err) throw err
      console.log(`> Ready on http://${hostname}:${port}`)
    })
  } catch (error) {
    console.error("[v0] Failed to start server:", error)
    process.exit(1)
  }
}

// Handle graceful shutdown
process.on("SIGTERM", () => {
  console.log("[v0] SIGTERM received, shutting down gracefully")
  process.exit(0)
})

process.on("SIGINT", () => {
  console.log("[v0] SIGINT received, shutting down gracefully")
  process.exit(0)
})

startServer()
