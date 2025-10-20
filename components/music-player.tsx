"use client"

import { useState, useEffect } from "react"
import useSWR from "swr"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { AdvancedMusicPlayer } from "@/components/advanced-music-player"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

interface MusicPlayerProps {
  guildId: string
  guildData: any
  mutate: () => void
}

export function MusicPlayer({ guildId, guildData, mutate }: MusicPlayerProps) {
  const [channels, setChannels] = useState<any[]>([])
  const [selectedChannel, setSelectedChannel] = useState<string>("")

  const { data: playerData, mutate: mutatePlayer } = useSWR(
    guildId ? `http://localhost:3001/guild/${guildId}/player` : null,
    fetcher,
    {
      refreshInterval: 1000,
    },
  )

  const isConnected = !!playerData?.voiceChannelId
  const hasPlayer = !!playerData?.player

  useEffect(() => {
    const fetchChannels = async () => {
      try {
        const res = await fetch(`/api/bot/guilds/${guildId}/channels`)
        if (res.ok) {
          const data = await res.json()
          setChannels(data.channels || [])
        }
      } catch (error) {
        console.error("Failed to fetch channels:", error)
      }
    }
    fetchChannels()
  }, [guildId])

  const handleJoinVoice = async () => {
    if (!selectedChannel) {
      alert("בחר ערוץ קולי קודם")
      return
    }

    await fetch(`/api/bot/guilds/${guildId}/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channelId: selectedChannel }),
    })
    mutate()
    mutatePlayer()
  }

  const handleLeaveVoice = async () => {
    await fetch(`/api/bot/guilds/${guildId}/leave`, { method: "POST" })
    mutate()
    mutatePlayer()
  }

  const handleLockToggle = async (checked: boolean) => {
    await fetch(`/api/bot/guilds/${guildId}/lock`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locked: checked }),
    })
    mutate()
  }

  if (!isConnected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>התחבר לערוץ קולי</CardTitle>
          <CardDescription>בחר ערוץ קולי כדי להתחיל להשמיע מוזיקה</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="channel-select">בחר ערוץ קולי</Label>
            <Select value={selectedChannel} onValueChange={setSelectedChannel}>
              <SelectTrigger id="channel-select">
                <SelectValue placeholder="בחר ערוץ..." />
              </SelectTrigger>
              <SelectContent>
                {channels.map((channel) => (
                  <SelectItem key={channel.id} value={channel.id}>
                    {channel.name} {channel.userCount > 0 && `(${channel.userCount} משתמשים)`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleJoinVoice} className="w-full" disabled={!selectedChannel}>
            התחבר לערוץ קולי
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>מחובר לערוץ קולי</CardTitle>
          <CardDescription>הבוט מחובר ומוכן להשמיע מוזיקה</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Button onClick={handleLeaveVoice} variant="outline">
              התנתק מערוץ
            </Button>
            <div className="flex items-center gap-2">
              <Switch
                id="lock-channel"
                checked={playerData?.voiceChannelLocked || false}
                onCheckedChange={handleLockToggle}
              />
              <Label htmlFor="lock-channel">נעל ערוץ</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {hasPlayer && <AdvancedMusicPlayer guildId={guildId} playerData={playerData} mutate={mutatePlayer} />}
    </div>
  )
}
