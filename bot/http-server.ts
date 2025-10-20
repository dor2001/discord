import http from "http"
import { URL } from "url"
import { getBotInstance } from "./index.js"
import { YtDlpService } from "./ytdlp-service.js"
import { YouTubeAPIService } from "./youtube-api-service.js"
import { config } from "./config.js"

const PORT = 3001
const ytdlpService = new YtDlpService()
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
              console.log("[v0] YouTube API failed, falling back to yt-dlp")
              results = await ytdlpService.search(query)
            }
          } else {
            console.log("[v0] No YouTube API key, using yt-dlp")
            results = await ytdlpService.search(query)
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

      if (path.startsWith("/guild/") && path.endsWith("/play") && req.method === "POST") {
        const guildId = path.split("/")[2]
        let body = ""

        req.on("data", (chunk) => {
          body += chunk.toString()
        })

        req.on("end", async () => {
          try {
            const { track } = JSON.parse(body)
            console.log("[v0] Play request received for guild:", guildId)
            console.log("[v0] Track:", track.title, "by", track.author)

            const guildData = bot.getGuildData(guildId)

            if (!guildData) {
              console.error("[v0] Guild not found:", guildId)
              res.writeHead(404)
              res.end(JSON.stringify({ error: "Guild not found" }))
              return
            }

            if (!guildData.connection) {
              console.error("[v0] Bot not in voice channel for guild:", guildId)
              res.writeHead(400)
              res.end(JSON.stringify({ error: "Bot not in voice channel" }))
              return
            }

            if (!guildData.player) {
              console.log("[v0] Creating new music player for guild:", guildId)
              const { MusicPlayer } = await import("./music-player.js")
              guildData.player = new MusicPlayer(guildData.connection, guildId)
            }

            console.log("[v0] Adding track to queue:", track.title)
            await guildData.player.addToQueue(track)
            console.log("[v0] Track added successfully, queue size:", guildData.player.getStatus().queue.length)

            res.writeHead(200)
            res.end(JSON.stringify({ success: true }))
          } catch (error) {
            console.error("[v0] Play error:", error)
            res.writeHead(500)
            res.end(JSON.stringify({ error: "Internal server error" }))
          }
        })
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
