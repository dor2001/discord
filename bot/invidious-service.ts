import { exec } from "child_process"
import { promisify } from "util"

const execAsync = promisify(exec)

interface InvidiousVideo {
  videoId: string
  title: string
  author: string
  lengthSeconds: number
  viewCount: number
}

export class InvidiousService {
  private instances = [
    "https://inv.nadeko.net",
    "https://invidious.privacyredirect.com",
    "https://invidious.fdn.fr",
    "https://invidious.nerdvpn.de",
  ]

  async search(query: string): Promise<any[]> {
    console.log("[v0] Searching with Invidious:", query)

    // Try each instance until one works
    for (const instance of this.instances) {
      try {
        const url = `${instance}/api/v1/search?q=${encodeURIComponent(query)}&type=video`
        const response = await fetch(url, {
          headers: { "User-Agent": "Mozilla/5.0" },
        })

        if (!response.ok) {
          console.log(`[v0] Instance ${instance} failed, trying next...`)
          continue
        }

        const data = (await response.json()) as InvidiousVideo[]
        console.log(`[v0] Found ${data.length} results from ${instance}`)

        return data.slice(0, 10).map((video) => ({
          id: video.videoId,
          title: video.title,
          author: video.author,
          duration: video.lengthSeconds,
          url: `https://www.youtube.com/watch?v=${video.videoId}`,
          thumbnail: `https://i.ytimg.com/vi/${video.videoId}/mqdefault.jpg`,
        }))
      } catch (error) {
        console.log(`[v0] Instance ${instance} error:`, error instanceof Error ? error.message : "Unknown error")
        continue
      }
    }

    throw new Error("All Invidious instances failed")
  }

  async getStreamUrl(videoId: string): Promise<string> {
    console.log("[v0] Getting stream URL for:", videoId)

    // Use yt-dlp to get the actual stream URL
    try {
      const { stdout } = await execAsync(`yt-dlp -f "bestaudio" --get-url "https://www.youtube.com/watch?v=${videoId}"`)
      const url = stdout.trim()
      console.log("[v0] Got stream URL")
      return url
    } catch (error) {
      console.error("[v0] Failed to get stream URL:", error)
      throw new Error("Failed to get stream URL")
    }
  }
}
