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

            if (!guildData.voiceChannelId) {
              console.error("[v0] No voice channel set for guild:", guildId)
              res.writeHead(400)
              res.end(
                JSON.stringify({
                  error: "No voice channel set",
                  message: "השתמש ב-/join או בחר ערוץ קולי בדשבורד",
                }),
              )
              return
            }

            if (!guildData.player) {
              console.log("[v0] Creating new DisTube player for guild:", guildId)
              const { DistubePlayer } = await import("./distube-player.js")
              const client = bot.getClient()
              guildData.player = new DistubePlayer(client, guildId)
            }

            console.log("[v0] Playing track with DisTube:", track.title)
            const guild = bot.getClient().guilds.cache.get(guildId)
            const voiceChannel = guild?.channels.cache.get(guildData.voiceChannelId!)

            if (!voiceChannel || !voiceChannel.isVoiceBased()) {
              res.writeHead(400)
              res.end(JSON.stringify({ error: "Voice channel not found" }))
              return
            }

            await guildData.player.play(voiceChannel, track.url || track.title)
            const status = guildData.player.getStatus()
            console.log("[v0] Track playing successfully")

            res.writeHead(200)
            res.end(JSON.stringify({ success: true, status }))
          } catch (error) {
            console.error("[v0] Play error:", error)
            res.writeHead(500)
            res.end(JSON.stringify({ error: "Internal server error" }))
          }
        })
        return
      }

      if (path.startsWith("/guild/") && path.endsWith("/pause") && req.method === "POST") {
        const guildId = path.split("/")[2]
        const guildData = bot.getGuildData(guildId)
        if (guildData?.player) {
          guildData.player.pause()
          res.writeHead(200)
          res.end(JSON.stringify({ success: true, status: guildData.player.getStatus() }))
        } else {
          res.writeHead(404)
          res.end(JSON.stringify({ error: "No player found" }))
        }
        return
      }

      if (path.startsWith("/guild/") && path.endsWith("/resume") && req.method === "POST") {
        const guildId = path.split("/")[2]
        const guildData = bot.getGuildData(guildId)
        if (guildData?.player) {
          guildData.player.resume()
          res.writeHead(200)
          res.end(JSON.stringify({ success: true, status: guildData.player.getStatus() }))
        } else {
          res.writeHead(404)
          res.end(JSON.stringify({ error: "No player found" }))
        }
        return
      }

      if (path.startsWith("/guild/") && path.endsWith("/stop") && req.method === "POST") {
        const guildId = path.split("/")[2]
        const guildData = bot.getGuildData(guildId)
        if (guildData?.player) {
          guildData.player.stop()
          res.writeHead(200)
          res.end(JSON.stringify({ success: true, status: guildData.player.getStatus() }))
        } else {
          res.writeHead(404)
          res.end(JSON.stringify({ error: "No player found" }))
        }
        return
      }

      if (path.startsWith("/guild/") && path.endsWith("/skip") && req.method === "POST") {
        const guildId = path.split("/")[2]
        const guildData = bot.getGuildData(guildId)
        if (guildData?.player) {
          guildData.player.skip()
          res.writeHead(200)
          res.end(JSON.stringify({ success: true, status: guildData.player.getStatus() }))
        } else {
          res.writeHead(404)
          res.end(JSON.stringify({ error: "No player found" }))
        }
        return
      }

      if (path.startsWith("/guild/") && path.endsWith("/volume") && req.method === "POST") {
        const guildId = path.split("/")[2]
        let body = ""

        req.on("data", (chunk) => {
          body += chunk.toString()
        })

        req.on("end", () => {
          try {
            const { volume } = JSON.parse(body)
            const guildData = bot.getGuildData(guildId)
            if (guildData?.player) {
              guildData.player.setVolume(volume)
              res.writeHead(200)
              res.end(JSON.stringify({ success: true, status: guildData.player.getStatus() }))
            } else {
              res.writeHead(404)
              res.end(JSON.stringify({ error: "No player found" }))
            }
          } catch (error) {
            res.writeHead(400)
            res.end(JSON.stringify({ error: "Invalid request" }))
          }
        })
        return
      }

      if (path.startsWith("/guild/") && path.endsWith("/seek") && req.method === "POST") {
        const guildId = path.split("/")[2]
        let body = ""

        req.on("data", (chunk) => {
          body += chunk.toString()
        })

        req.on("end", async () => {
          try {
            const { position } = JSON.parse(body)
            const guildData = bot.getGuildData(guildId)
            if (guildData?.player) {
              await guildData.player.seek(position)
              res.writeHead(200)
              res.end(JSON.stringify({ success: true, status: guildData.player.getStatus() }))
            } else {
              res.writeHead(404)
              res.end(JSON.stringify({ error: "No player found" }))
            }
          } catch (error) {
            res.writeHead(400)
            res.end(JSON.stringify({ error: "Invalid request" }))
          }
        })
        return
      }

      if (path.startsWith("/guild/") && path.endsWith("/loop") && req.method === "POST") {
        const guildId = path.split("/")[2]
        let body = ""

        req.on("data", (chunk) => {
          body += chunk.toString()
        })

        req.on("end", () => {
          try {
            const { mode } = JSON.parse(body)
            const guildData = bot.getGuildData(guildId)
            if (guildData?.player) {
              guildData.player.setLoopMode(mode)
              res.writeHead(200)
              res.end(JSON.stringify({ success: true, status: guildData.player.getStatus() }))
            } else {
              res.writeHead(404)
              res.end(JSON.stringify({ error: "No player found" }))
            }
          } catch (error) {
            res.writeHead(400)
            res.end(JSON.stringify({ error: "Invalid request" }))
          }
        })
        return
      }

      if (path.startsWith("/guild/") && path.endsWith("/shuffle") && req.method === "POST") {
        const guildId = path.split("/")[2]
        let body = ""

        req.on("data", (chunk) => {
          body += chunk.toString()
        })

        req.on("end", () => {
          try {
            const { enabled } = JSON.parse(body)
            const guildData = bot.getGuildData(guildId)
            if (guildData?.player) {
              guildData.player.setShuffle(enabled)
              res.writeHead(200)
              res.end(JSON.stringify({ success: true, status: guildData.player.getStatus() }))
            } else {
              res.writeHead(404)
              res.end(JSON.stringify({ error: "No player found" }))
            }
          } catch (error) {
            res.writeHead(400)
            res.end(JSON.stringify({ error: "Invalid request" }))
          }
        })
        return
      }

      if (path.startsWith("/guild/") && path.endsWith("/lock") && req.method === "POST") {
        const guildId = path.split("/")[2]
        let body = ""

        req.on("data", (chunk) => {
          body += chunk.toString()
        })

        req.on("end", () => {
          try {
            const { locked } = JSON.parse(body)
            const guildData = bot.getGuildData(guildId)
            if (guildData) {
              guildData.voiceChannelLocked = locked
              res.writeHead(200)
              res.end(JSON.stringify({ success: true }))
            } else {
              res.writeHead(404)
              res.end(JSON.stringify({ error: "Guild not found" }))
            }
          } catch (error) {
            res.writeHead(400)
            res.end(JSON.stringify({ error: "Invalid request" }))
          }
        })
        return
      }

      if (path.startsWith("/guild/") && path.endsWith("/queue/remove") && req.method === "POST") {
        const guildId = path.split("/")[2]
        let body = ""

        req.on("data", (chunk) => {
          body += chunk.toString()
        })

        req.on("end", () => {
          try {
            const { index } = JSON.parse(body)
            const guildData = bot.getGuildData(guildId)
            if (guildData?.player) {
              guildData.player.removeFromQueue(index)
              res.writeHead(200)
              res.end(JSON.stringify({ success: true, status: guildData.player.getStatus() }))
            } else {
              res.writeHead(404)
              res.end(JSON.stringify({ error: "No player found" }))
            }
          } catch (error) {
            res.writeHead(400)
            res.end(JSON.stringify({ error: "Invalid request" }))
          }
        })
        return
      }

      if (path.startsWith("/guild/") && path.endsWith("/queue/reorder") && req.method === "POST") {
        const guildId = path.split("/")[2]
        let body = ""

        req.on("data", (chunk) => {
          body += chunk.toString()
        })

        req.on("end", () => {
          try {
            const { fromIndex, toIndex } = JSON.parse(body)
            const guildData = bot.getGuildData(guildId)
            if (guildData?.player) {
              guildData.player.reorderQueue(fromIndex, toIndex)
              res.writeHead(200)
              res.end(JSON.stringify({ success: true, status: guildData.player.getStatus() }))
            } else {
              res.writeHead(404)
              res.end(JSON.stringify({ error: "No player found" }))
            }
          } catch (error) {
            res.writeHead(400)
            res.end(JSON.stringify({ error: "Invalid request" }))
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
            const guildData = bot.getGuildData(guildId)
            if (guildData) {
              guildData.voiceChannelId = channelId
              console.log("[v0] Voice channel set for guild:", guildId, "channel:", channelId)
              res.writeHead(200)
              res.end(JSON.stringify({ success: true }))
            } else {
              res.writeHead(404)
              res.end(JSON.stringify({ error: "Guild not found" }))
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
        const guildData = bot.getGuildData(guildId)
        if (guildData?.player) {
          guildData.player.stop()
          guildData.voiceChannelId = null
          res.writeHead(200)
          res.end(JSON.stringify({ success: true }))
        } else {
          res.writeHead(400)
          res.end(JSON.stringify({ error: "Not in voice channel" }))
        }
        return
      }

      if (path.startsWith("/guild/") && path.endsWith("/speed") && req.method === "POST") {
        const guildId = path.split("/")[2]
        let body = ""

        req.on("data", (chunk) => {
          body += chunk.toString()
        })

        req.on("end", () => {
          try {
            const { speed } = JSON.parse(body)
            const guildData = bot.getGuildData(guildId)
            if (guildData?.player) {
              guildData.player.setPlaybackSpeed(speed)
              res.writeHead(200)
              res.end(JSON.stringify({ success: true, status: guildData.player.getStatus() }))
            } else {
              res.writeHead(404)
              res.end(JSON.stringify({ error: "No player found" }))
            }
          } catch (error) {
            res.writeHead(400)
            res.end(JSON.stringify({ error: "Invalid request" }))
          }
        })
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
              player: guildData.player?.getStatus() || null,
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
