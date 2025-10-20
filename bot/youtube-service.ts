import { exec } from "child_process"
import { promisify } from "util"
import type { Track } from "./music-player.js"

const execAsync = promisify(exec)

export class YouTubeService {
  public async search(query: string, limit = 10): Promise<Track[]> {
    try {
      console.log("[v0] Searching YouTube with yt-dlp:", query)

      const { stdout } = await execAsync(
        `yt-dlp "ytsearch${limit}:${query}" --dump-json --no-playlist --skip-download`,
        { maxBuffer: 1024 * 1024 * 10 },
      )

      const lines = stdout
        .trim()
        .split("\n")
        .filter((line) => line.trim())
      const results: Track[] = []

      for (const line of lines) {
        try {
          const data = JSON.parse(line)
          results.push({
            id: data.id,
            title: data.title,
            author: data.uploader || data.channel || "Unknown",
            duration: data.duration || 0,
            thumbnail: data.thumbnail || data.thumbnails?.[0]?.url || "",
            url: data.webpage_url || `https://www.youtube.com/watch?v=${data.id}`,
          })
        } catch (e) {
          console.error("[v0] Failed to parse yt-dlp result:", e)
        }
      }

      console.log("[v0] Found", results.length, "results")
      return results
    } catch (error) {
      console.error("[v0] YouTube search error:", error)
      throw new Error("Search failed")
    }
  }

  public async getVideoInfo(videoId: string): Promise<Track | null> {
    try {
      const { stdout } = await execAsync(
        `yt-dlp "https://www.youtube.com/watch?v=${videoId}" --dump-json --no-playlist --skip-download`,
      )

      const data = JSON.parse(stdout)
      return {
        id: data.id,
        title: data.title,
        author: data.uploader || data.channel || "Unknown",
        duration: data.duration || 0,
        thumbnail: data.thumbnail || data.thumbnails?.[0]?.url || "",
        url: data.webpage_url || `https://www.youtube.com/watch?v=${data.id}`,
      }
    } catch (error) {
      console.error("[v0] YouTube video info error:", error)
      return null
    }
  }

  public async getAudioUrl(videoId: string): Promise<string | null> {
    try {
      const { stdout } = await execAsync(`yt-dlp "https://www.youtube.com/watch?v=${videoId}" -f bestaudio -g`)
      return stdout.trim()
    } catch (error) {
      console.error("[v0] Failed to get audio URL:", error)
      return null
    }
  }
}

export const youtubeService = new YouTubeService()
