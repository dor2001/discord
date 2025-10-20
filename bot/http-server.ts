import http from "http"
import { URL } from "url"
import { getBotInstance } from "./index.js"
import { InvidiousService } from "./invidious-service.js"
import { YouTubeAPIService } from "./youtube-api-service.js"
import { config } from "./config.js"

const PORT = 3001
const invidiousService = new InvidiousService()
const youtubeApiService = config.youtubeApiKey ? new YouTubeAPIService() : null

export function startHttpServer() {
  const server = http.createServer(async (req, res) => {
    // Enable CORS
    res.setHeader("Access-Control-Allow-Origin", "*")
    res.setHeader("Content-Type", "application/json")

    const bot = getBotInstance()

    try {
      const url = new URL(req.url || "", `http://localhost:${PORT}`)
      const path = url.pathname

      if (path === "/search") {
        const query = url.searchParams.get("q")
        if (!query) {
          res.writeHead(400)
          res.end(JSON.stringify({ error: "Query is required" }))
          return
        }

        try {
          let results
          if (youtubeApiService) {
            try {
              console.log("[v0] Using YouTube Data API v3")
              results = await youtubeApiService.search(query)
            } catch (error) {
              console.log("[v0] YouTube API failed, falling back to Invidious")
              results = await invidiousService.search(query)
            }
          } else {
            console.log("[v0] No YouTube API key, using Invidious")
            results = await invidiousService.search(query)
          }

          res.writeHead(200)
          res.end(JSON.stringify({ results }))
        } catch (error) {
          console.error("[v0] Search error:", error)
          res.writeHead(500)
          res.end(JSON.stringify({ error: "Search failed" }))
        }
        return
      }

      if (path.startsWith("/guild/") && path.endsWith("/channels")) {
        const guildId = path.split("/")[2]
        const channels = bot.getVoiceChannels(guildId)
        res.writeHead(200)
        res.end(JSON.stringify({ channels }))
        return
      }

      if (path.startsWith("/guild/") && path.endsWith("/player")) {
        const guildId = path.split("/")[2]
        const guildData = bot.getGuildData(guildId)
        if (guildData?.player) {
          res.writeHead(200)
          res.end(JSON.stringify({ player: guildData.player.getStatus() }))
        } else {
          res.writeHead(404)
          res.end(JSON.stringify({ error: "No player found" }))
        }
        return
      }

      if (path.startsWith("/guild/") && path.endsWith("/join") && req.method === "POST") {
        const guildId = path.split("/")[2]
        let body = ""

        req.on("data", (chunk) => {
          body += chunk.toString()
        })

        req.on("end", async () => {
          try {
            const { channelId } = JSON.parse(body)
            const success = await bot.joinVoiceChannel(guildId, channelId)

            if (success) {
              res.writeHead(200)
              res.end(JSON.stringify({ success: true }))
            } else {
              res.writeHead(400)
              res.end(JSON.stringify({ error: "Failed to join channel" }))
            }
          } catch (error) {
            console.error("[v0] Join error:", error)
            res.writeHead(500)
            res.end(JSON.stringify({ error: "Internal server error" }))
          }
        })
        return
      }

      if (path.startsWith("/guild/") && path.endsWith("/leave") && req.method === "POST") {
        const guildId = path.split("/")[2]
        const success = bot.leaveVoiceChannel(guildId)

        if (success) {
          res.writeHead(200)
          res.end(JSON.stringify({ success: true }))
        } else {
          res.writeHead(400)
          res.end(JSON.stringify({ error: "Not in voice channel" }))
        }
        return
      }

      if (path === "/health") {
        res.writeHead(200)
        res.end(JSON.stringify(bot.getHealth()))
      } else if (path === "/guilds") {
        res.writeHead(200)
        res.end(JSON.stringify({ guilds: bot.getGuilds() }))
      } else if (path.startsWith("/guild/")) {
        const guildId = path.split("/")[2]
        const guildData = bot.getGuildData(guildId)

        if (guildData) {
          res.writeHead(200)
          res.end(
            JSON.stringify({
              guildId: guildData.guildId,
              guildName: guildData.guildName,
              voiceChannelId: guildData.voiceChannelId,
              voiceChannelLocked: guildData.voiceChannelLocked,
              isPlaying: guildData.player?.isPlaying() || false,
            }),
          )
        } else {
          res.writeHead(404)
          res.end(JSON.stringify({ error: "Guild not found" }))
        }
      } else {
        res.writeHead(404)
        res.end(JSON.stringify({ error: "Not found" }))
      }
    } catch (error) {
      console.error("[v0] HTTP server error:", error)
      res.writeHead(500)
      res.end(JSON.stringify({ error: "Internal server error" }))
    }
  })

  server.listen(PORT, () => {
    console.log(`[v0] Bot HTTP server listening on port ${PORT}`)
  })

  return server
}
