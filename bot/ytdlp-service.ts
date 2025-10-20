import { exec } from "child_process"
import { promisify } from "util"

const execAsync = promisify(exec)

interface SearchResult {
  id: string
  title: string
  author: string
  duration: number
  thumbnail: string
  url: string
}

export class YtDlpService {
  async search(query: string, limit = 10): Promise<SearchResult[]> {
    try {
      console.log("[v0] Searching with yt-dlp:", query)

      // Use yt-dlp with special flags to bypass restrictions
      const command = `yt-dlp --dump-json --flat-playlist --no-warnings --no-check-certificate --extractor-args "youtube:player_client=android" "ytsearch${limit}:${query.replace(/"/g, '\\"')}"`

      const { stdout, stderr } = await execAsync(command, {
        timeout: 30000, // 30 second timeout
        maxBuffer: 1024 * 1024 * 10, // 10MB buffer
      })

      if (stderr && !stderr.includes("WARNING")) {
        console.log("[v0] yt-dlp stderr:", stderr)
      }

      // Parse JSON lines
      const lines = stdout
        .trim()
        .split("\n")
        .filter((line) => line.trim())
      const results: SearchResult[] = []

      for (const line of lines) {
        try {
          const data = JSON.parse(line)

          results.push({
            id: data.id || data.url?.split("v=")[1] || "",
            title: data.title || "Unknown Title",
            author: data.uploader || data.channel || "Unknown Artist",
            duration: data.duration || 0,
            thumbnail: data.thumbnail || data.thumbnails?.[0]?.url || "",
            url: data.url || `https://www.youtube.com/watch?v=${data.id}`,
          })
        } catch (parseError) {
          console.log("[v0] Failed to parse line:", line)
        }
      }

      console.log(`[v0] yt-dlp found ${results.length} results`)
      return results
    } catch (error: any) {
      console.error("[v0] yt-dlp search error:", error.message)
      throw new Error(`yt-dlp search failed: ${error.message}`)
    }
  }

  async getStreamUrl(videoId: string): Promise<string> {
    try {
      console.log("[v0] Getting stream URL for:", videoId)

      const command = `yt-dlp --get-url --format "bestaudio[ext=webm]/bestaudio/best" --no-warnings --no-check-certificate --extractor-args "youtube:player_client=android" "https://www.youtube.com/watch?v=${videoId}"`

      const { stdout } = await execAsync(command, {
        timeout: 15000, // 15 second timeout
      })

      const url = stdout.trim().split("\n")[0]
      console.log("[v0] Got stream URL")
      return url
    } catch (error: any) {
      console.error("[v0] Failed to get stream URL:", error.message)
      throw new Error(`Failed to get stream URL: ${error.message}`)
    }
  }
}
