import { createServer } from "http"
import { parse } from "url"
import next from "next"
import { spawn } from "child_process"

const dev = process.env.NODE_ENV !== "production"
const hostname = process.env.HOSTNAME || "0.0.0.0"
const port = Number.parseInt(process.env.PORT || "3000", 10)

const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

async function startServer() {
  try {
    console.log("[v0] Starting Discord bot...")

    const botProcess = spawn("node", ["dist/bot/bot/start.js"], {
      stdio: "inherit",
      env: process.env,
    })

    botProcess.on("error", (error) => {
      console.error("[v0] Failed to start bot process:", error)
    })

    botProcess.on("exit", (code) => {
      console.log("[v0] Bot process exited with code:", code)
      if (code !== 0) {
        console.error("[v0] Bot crashed, but keeping server running")
      }
    })

    // Wait a bit for the bot to initialize
    await new Promise((resolve) => setTimeout(resolve, 3000))

    console.log("[v0] Starting Next.js server...")

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

    process.on("SIGTERM", () => {
      console.log("[v0] SIGTERM received, shutting down gracefully")
      botProcess.kill("SIGTERM")
      process.exit(0)
    })

    process.on("SIGINT", () => {
      console.log("[v0] SIGINT received, shutting down gracefully")
      botProcess.kill("SIGINT")
      process.exit(0)
    })
  } catch (error) {
    console.error("[v0] Failed to start server:", error)
    process.exit(1)
  }
}

startServer()
