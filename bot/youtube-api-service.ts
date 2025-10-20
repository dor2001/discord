import { config } from "./config.js"

interface YouTubeSearchResult {
  id: string
  title: string
  author: string
  duration: number
  thumbnail: string
  url: string
}

export class YouTubeAPIService {
  private apiKey: string | undefined

  constructor() {
    this.apiKey = config.youtubeApiKey
  }

  async search(query: string): Promise<YouTubeSearchResult[]> {
    if (!this.apiKey) {
      throw new Error("YouTube API key not configured")
    }

    try {
      console.log(`[v0] Searching YouTube API: ${query}`)

      // Search for videos
      const searchUrl = new URL("https://www.googleapis.com/youtube/v3/search")
      searchUrl.searchParams.set("part", "snippet")
      searchUrl.searchParams.set("q", query)
      searchUrl.searchParams.set("type", "video")
      searchUrl.searchParams.set("maxResults", "10")
      searchUrl.searchParams.set("key", this.apiKey)

      const searchResponse = await fetch(searchUrl.toString())
      if (!searchResponse.ok) {
        throw new Error(`YouTube API search failed: ${searchResponse.statusText}`)
      }

      const searchData = await searchResponse.json()
      const videoIds = searchData.items.map((item: any) => item.id.videoId).join(",")

      // Get video details (including duration)
      const detailsUrl = new URL("https://www.googleapis.com/youtube/v3/videos")
      detailsUrl.searchParams.set("part", "contentDetails,snippet")
      detailsUrl.searchParams.set("id", videoIds)
      detailsUrl.searchParams.set("key", this.apiKey)

      const detailsResponse = await fetch(detailsUrl.toString())
      if (!detailsResponse.ok) {
        throw new Error(`YouTube API details failed: ${detailsResponse.statusText}`)
      }

      const detailsData = await detailsResponse.json()

      const results: YouTubeSearchResult[] = detailsData.items.map((item: any) => {
        const duration = this.parseDuration(item.contentDetails.duration)
        return {
          id: item.id,
          title: item.snippet.title,
          author: item.snippet.channelTitle,
          duration,
          thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default.url,
          url: `https://www.youtube.com/watch?v=${item.id}`,
        }
      })

      console.log(`[v0] YouTube API found ${results.length} results`)
      return results
    } catch (error) {
      console.error("[v0] YouTube API error:", error)
      throw error
    }
  }

  private parseDuration(isoDuration: string): number {
    // Parse ISO 8601 duration (e.g., PT4M13S = 4 minutes 13 seconds)
    const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
    if (!match) return 0

    const hours = Number.parseInt(match[1] || "0")
    const minutes = Number.parseInt(match[2] || "0")
    const seconds = Number.parseInt(match[3] || "0")

    return hours * 3600 + minutes * 60 + seconds
  }
}
