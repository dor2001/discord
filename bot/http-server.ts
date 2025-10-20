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
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
    res.setHeader("Access-Control-Allow-Headers", "Content-Type")

    if (req.method === "OPTIONS") {
      res.writeHead(200)
      res.end()
      return
    }

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
            console.log("[v0] Play request for guild:", guildId, "track:", track.title)

            const guildData = bot.getGuildData(guildId)

            if (!guildData) {
              console.log("[v0] Guild not found:", guildId)
              res.writeHead(404)
              res.end(JSON.stringify({ error: "Guild not found" }))
              return
            }

            if (!guildData.connection) {
              console.log("[v0] Bot not in voice channel, attempting auto-join")

              // Try to find a voice channel with users
              const guild = bot.client.guilds.cache.get(guildId)
              if (guild) {
                const voiceChannel = guild.channels.cache.find((ch) => ch.isVoiceBased() && ch.members.size > 0)

                if (voiceChannel) {
                  console.log("[v0] Auto-joining voice channel:", voiceChannel.name)
                  await bot.joinVoiceChannel(guildId, voiceChannel.id)
                } else {
                  console.log("[v0] No voice channel with users found")
                  res.writeHead(400)
                  res.end(JSON.stringify({ error: "Bot not in voice channel. Please join a voice channel first." }))
                  return
                }
              }
            }

            if (!guildData.player) {
              console.log("[v0] Creating new music player for guild:", guildId)
              const { MusicPlayer } = await import("./music-player.js")
              guildData.player = new MusicPlayer(guildData.connection!, guildId)
            }

            console.log("[v0] Adding track to queue:", track.title)
            await guildData.player.addToQueue(track)
            const status = guildData.player.getStatus()
            console.log("[v0] Track added successfully, queue size:", status.queue.length)

            res.writeHead(200)
            res.end(JSON.stringify({ success: true, queueSize: status.queue.length }))
          } catch (error) {
            console.log("[v0] Play failed:", { error: error instanceof Error ? error.message : "Unknown error" })
            res.writeHead(500)
            res.end(JSON.stringify({ error: error instanceof Error ? error.message : "Internal server error" }))
          }
        })
        return
      }

      if (path.startsWith("/guild/") && path.endsWith("/player")) {
        const guildId = path.split("/")[2]
        const guildData = bot.getGuildData(guildId)
        if (guildData?.player) {
          const status = guildData.player.getStatus()
          res.writeHead(200)
          res.end(
            JSON.stringify({
              player: status,
              voiceChannelId: guildData.voiceChannelId,
              voiceChannelLocked: guildData.voiceChannelLocked,
            }),
          )
        } else {
          res.writeHead(200)
          res.end(
            JSON.stringify({
              player: null,
              voiceChannelId: guildData?.voiceChannelId || null,
              voiceChannelLocked: guildData?.voiceChannelLocked || false,
            }),
          )
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
