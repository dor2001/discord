"use client"

import useSWR from "swr"
import { QueueList } from "@/components/queue-list"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

interface QueuePanelProps {
  guildId: string
  guildData: any
}

export function QueuePanel({ guildId, guildData }: QueuePanelProps) {
  const { data: playerData } = useSWR(guildId ? `http://localhost:3001/guild/${guildId}/player` : null, fetcher, {
    refreshInterval: 1000,
  })

  const queue = playerData?.player?.queue || []
  const currentTrack = playerData?.player?.currentTrack

  const handleRemove = async (index: number) => {
    await fetch(`/api/bot/guilds/${guildId}/queue/remove`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ index }),
    })
  }

  return <QueueList queue={queue} currentTrack={currentTrack} onRemove={handleRemove} />
}
