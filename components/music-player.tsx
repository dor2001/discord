"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Play, Pause, SkipForward, Square, Volume2, Repeat, Repeat1, Shuffle } from "lucide-react"

interface MusicPlayerProps {
  guildId: string
  guildData: any
  mutate: () => void
}

export function MusicPlayer({ guildId, guildData, mutate }: MusicPlayerProps) {
  const [volume, setVolume] = useState(100)
  const [channels, setChannels] = useState<any[]>([])
  const [selectedChannel, setSelectedChannel] = useState<string>("")
  const [seekPosition, setSeekPosition] = useState(0)
  const [isSeeking, setIsSeeking] = useState(false)

  const player = guildData?.player
  const guild = guildData?.guild
  const isConnected = !!guild?.voiceChannelId
  const currentTrack = player?.currentTrack

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

  useEffect(() => {
    if (currentTrack && !isSeeking) {
      setSeekPosition(currentTrack.position || 0)
    }
  }, [currentTrack, isSeeking])

  useEffect(() => {
    if (!player?.isPlaying || player?.isPaused || isSeeking) return

    const interval = setInterval(() => {
      setSeekPosition((prev) => {
        const newPos = prev + 1
        return newPos <= (currentTrack?.track?.duration || 0) ? newPos : prev
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [player?.isPlaying, player?.isPaused, currentTrack, isSeeking])

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
  }

  const handleLeaveVoice = async () => {
    await fetch(`/api/bot/guilds/${guildId}/leave`, { method: "POST" })
    mutate()
  }

  const handlePause = async () => {
    await fetch(`/api/bot/guilds/${guildId}/pause`, { method: "POST" })
    mutate()
  }

  const handleResume = async () => {
    await fetch(`/api/bot/guilds/${guildId}/resume`, { method: "POST" })
    mutate()
  }

  const handleStop = async () => {
    await fetch(`/api/bot/guilds/${guildId}/stop`, { method: "POST" })
    mutate()
  }

  const handleSkip = async () => {
    await fetch(`/api/bot/guilds/${guildId}/skip`, { method: "POST" })
    mutate()
  }

  const handleVolumeChange = async (value: number[]) => {
    const newVolume = value[0]
    setVolume(newVolume)
    await fetch(`/api/bot/guilds/${guildId}/volume`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ volume: newVolume }),
    })
  }

  const handleSeekChange = (value: number[]) => {
    setIsSeeking(true)
    setSeekPosition(value[0])
  }

  const handleSeekCommit = async (value: number[]) => {
    const position = value[0]
    setIsSeeking(false)
    await fetch(`/api/bot/guilds/${guildId}/seek`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ position }),
    })
    mutate()
  }

  const handleLoopToggle = async () => {
    const modes = ["off", "track", "queue"]
    const currentIndex = modes.indexOf(player?.loopMode || "off")
    const nextMode = modes[(currentIndex + 1) % modes.length]

    await fetch(`/api/bot/guilds/${guildId}/loop`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: nextMode }),
    })
    mutate()
  }

  const handleShuffleToggle = async () => {
    await fetch(`/api/bot/guilds/${guildId}/shuffle`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !player?.shuffleEnabled }),
    })
    mutate()
  }

  const handleLockToggle = async (checked: boolean) => {
    await fetch(`/api/bot/guilds/${guildId}/lock`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locked: checked }),
    })
    mutate()
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>נגן מוזיקה</CardTitle>
        <CardDescription>{isConnected ? `מחובר לערוץ קולי` : "לא מחובר לערוץ קולי"}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!isConnected ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="channel-select">בחר ערוץ קולי</Label>
              <Select value={selectedChannel} onValueChange={setSelectedChannel}>
                <SelectTrigger id="channel-select">
                  <SelectValue placeholder="בחר ערוץ..." />
                </SelectTrigger>
                <SelectContent>
                  {channels.map((channel) => (
                    <SelectItem key={channel.id} value={channel.id}>
                      {channel.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleJoinVoice} className="w-full" disabled={!selectedChannel}>
              התחבר לערוץ קולי
            </Button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <Button onClick={handleLeaveVoice} variant="outline" size="sm">
                התנתק מערוץ
              </Button>
              <div className="flex items-center gap-2">
                <Switch
                  id="lock-channel"
                  checked={guild?.voiceChannelLocked || false}
                  onCheckedChange={handleLockToggle}
                />
                <Label htmlFor="lock-channel">נעל ערוץ</Label>
              </div>
            </div>

            {currentTrack && (
              <div className="rounded-lg bg-muted p-4 space-y-4">
                <div className="flex gap-4">
                  {currentTrack.track.thumbnail && (
                    <img
                      src={currentTrack.track.thumbnail || "/placeholder.svg"}
                      alt={currentTrack.track.title}
                      className="h-20 w-20 rounded object-cover"
                    />
                  )}
                  <div className="flex-1">
                    <h3 className="font-semibold text-balance">{currentTrack.track.title}</h3>
                    <p className="text-sm text-muted-foreground">{currentTrack.track.author}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Slider
                    value={[seekPosition]}
                    onValueChange={handleSeekChange}
                    onValueCommit={handleSeekCommit}
                    max={currentTrack.track.duration || 100}
                    step={1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{formatTime(seekPosition)}</span>
                    <span>{formatTime(currentTrack.track.duration || 0)}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-center gap-2">
              {player?.isPaused ? (
                <Button onClick={handleResume} size="lg" variant="default">
                  <Play className="h-6 w-6" />
                </Button>
              ) : (
                <Button onClick={handlePause} size="lg" variant="default" disabled={!player?.isPlaying}>
                  <Pause className="h-6 w-6" />
                </Button>
              )}
              <Button onClick={handleSkip} size="lg" variant="outline" disabled={!player?.isPlaying}>
                <SkipForward className="h-6 w-6" />
              </Button>
              <Button onClick={handleStop} size="lg" variant="outline" disabled={!player?.isPlaying}>
                <Square className="h-6 w-6" />
              </Button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Volume2 className="h-5 w-5" />
                <Slider value={[volume]} onValueChange={handleVolumeChange} max={100} step={1} className="flex-1" />
                <span className="text-sm font-medium w-12 text-left">{volume}%</span>
              </div>

              <div className="flex items-center justify-center gap-4">
                <Button
                  onClick={handleLoopToggle}
                  variant={player?.loopMode !== "off" ? "default" : "outline"}
                  size="sm"
                >
                  {player?.loopMode === "track" ? <Repeat1 className="h-4 w-4" /> : <Repeat className="h-4 w-4" />}
                  <span className="mr-2">
                    {player?.loopMode === "off" ? "ללא" : player?.loopMode === "track" ? "שיר" : "תור"}
                  </span>
                </Button>
                <Button
                  onClick={handleShuffleToggle}
                  variant={player?.shuffleEnabled ? "default" : "outline"}
                  size="sm"
                >
                  <Shuffle className="h-4 w-4" />
                  <span className="mr-2">ערבוב</span>
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
