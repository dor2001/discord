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

const PIPED_INSTANCES = [
  "https://pipedapi.kavin.rocks",
  "https://pipedapi-libre.kavin.rocks",
  "https://piped-api.garudalinux.org",
  "https://pipedapi.adminforge.de",
  "https://api.piped.projectsegfau.lt",
]

export class PipedService {
  private instances: string[]
  private currentInstanceIndex = 0

  constructor() {
    this.instances = config.pipedInstance ? [config.pipedInstance, ...PIPED_INSTANCES] : PIPED_INSTANCES
  }

  private async fetchWithFallback(path: string): Promise<any> {
    let lastError: Error | null = null

    for (let i = 0; i < this.instances.length; i++) {
      const instance = this.instances[this.currentInstanceIndex]
      try {
        console.log(`[v0] Trying Piped instance: ${instance}`)
        const response = await fetch(`${instance}${path}`, {
          signal: AbortSignal.timeout(5000), // 5 second timeout
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        const data = await response.json()
        console.log(`[v0] Piped instance ${instance} succeeded`)
        return data
      } catch (error) {
        console.error(`[v0] Piped instance ${instance} failed:`, error)
        lastError = error as Error
        // Try next instance
        this.currentInstanceIndex = (this.currentInstanceIndex + 1) % this.instances.length
      }
    }

    throw new Error(`All Piped instances failed. Last error: ${lastError?.message}`)
  }

  public async search(query: string, limit = 10): Promise<Track[]> {
    try {
      const data: PipedSearchResult = await this.fetchWithFallback(
        `/search?q=${encodeURIComponent(query)}&filter=videos`,
      )

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
      const data = await this.fetchWithFallback(`/streams/${videoId}`)

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
      const data = await this.fetchWithFallback(`/streams/${videoId}`)

      // Get the best audio stream
      const audioStreams = data.audioStreams || []
      if (audioStreams.length === 0) {
        throw new Error("No audio streams available")
      }

      // Sort by quality (bitrate) and get the best one
      const bestAudio = audioStreams.sort((a: any, b: any) => (b.bitrate || 0) - (a.bitrate || 0))[0]

      console.log(`[v0] Got stream URL from Piped: ${bestAudio.url.substring(0, 50)}...`)
      return bestAudio.url
    } catch (error) {
      console.error("[v0] Piped stream URL error:", error)
      return null
    }
  }
}

export const pipedService = new PipedService()
