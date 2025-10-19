"use client"

import { useEffect, useRef } from "react"

export function usePlayerEvents(guildId: string | null, onUpdate: () => void) {
  const eventSourceRef = useRef<EventSource | null>(null)

  useEffect(() => {
    if (!guildId) return

    // Create SSE connection
    const eventSource = new EventSource(`/api/bot/guilds/${guildId}/events`)
    eventSourceRef.current = eventSource

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        console.log("[v0] Received player event:", data)

        // Trigger data refresh
        if (data.type !== "connected") {
          onUpdate()
        }
      } catch (error) {
        console.error("[v0] Failed to parse SSE event:", error)
      }
    }

    eventSource.onerror = (error) => {
      console.error("[v0] SSE connection error:", error)
      eventSource.close()
    }

    return () => {
      eventSource.close()
    }
  }, [guildId, onUpdate])
}
