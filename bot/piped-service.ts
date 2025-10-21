import { config } from "./config.js"
import type { Track } from "./music-player.js"

interface PipedSearchResult {
  items: Array<{
    url: string
    title: string
    uploaderName: string
    duration: number
    thumbnail: string
  }>
}

export class PipedService {
  private baseUrl: string

  constructor() {
    this.baseUrl = config.pipedInstance
  }

  public async search(query: string, limit = 10): Promise<Track[]> {
    try {
      const response = await fetch(`${this.baseUrl}/search?q=${encodeURIComponent(query)}&filter=videos`)

      if (!response.ok) {
        throw new Error(`Piped API error: ${response.statusText}`)
      }

      const data: PipedSearchResult = await response.json()

      return data.items.slice(0, limit).map((item) => ({
        id: item.url.split("=")[1] || item.url,
        title: item.title,
        author: item.uploaderName,
        duration: item.duration,
        thumbnail: item.thumbnail,
        url: `https://www.youtube.com/watch?v=${item.url.split("=")[1] || item.url}`,
      }))
    } catch (error) {
      console.error("[v0] Piped search error:", error)
      throw error
    }
  }

  public async getVideoInfo(videoId: string): Promise<Track | null> {
    try {
      const response = await fetch(`${this.baseUrl}/streams/${videoId}`)

      if (!response.ok) {
        throw new Error(`Piped API error: ${response.statusText}`)
      }

      const data = await response.json()

      return {
        id: videoId,
        title: data.title,
        author: data.uploader,
        duration: data.duration,
        thumbnail: data.thumbnailUrl,
        url: `https://www.youtube.com/watch?v=${videoId}`,
      }
    } catch (error) {
      console.error("[v0] Piped video info error:", error)
      return null
    }
  }

  public async getStreamUrl(videoId: string): Promise<string | null> {
    try {
      const response = await fetch(`${this.baseUrl}/streams/${videoId}`)

      if (!response.ok) {
        throw new Error(`Piped API error: ${response.statusText}`)
      }

      const data = await response.json()

      // Get the best audio stream
      const audioStreams = data.audioStreams || []
      if (audioStreams.length === 0) {
        throw new Error("No audio streams available")
      }

      // Sort by quality (bitrate) and get the best one
      const bestAudio = audioStreams.sort((a: any, b: any) => (b.bitrate || 0) - (a.bitrate || 0))[0]

      return bestAudio.url
    } catch (error) {
      console.error("[v0] Piped stream URL error:", error)
      return null
    }
  }
}

export const pipedService = new PipedService()
