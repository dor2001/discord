"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Play, Pause, SkipForward, Square, Volume2, Repeat, Repeat1, Shuffle } from "lucide-react"

interface MusicPlayerProps {
  guildId: string
  guildData: any
  mutate: () => void
}

export function MusicPlayer({ guildId, guildData, mutate }: MusicPlayerProps) {
  const [volume, setVolume] = useState(100)

  const player = guildData?.player
  const guild = guildData?.guild
  const isConnected = !!guild?.voiceChannelId

  const handleJoinVoice = async () => {
    const channelId = prompt("הכנס Voice Channel ID:")
    if (!channelId) return

    await fetch(`/api/bot/guilds/${guildId}/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channelId }),
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>נגן מוזיקה</CardTitle>
        <CardDescription>{isConnected ? `מחובר לערוץ קולי` : "לא מחובר לערוץ קולי"}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!isConnected ? (
          <Button onClick={handleJoinVoice} className="w-full">
            התחבר לערוץ קולי
          </Button>
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

            {player?.currentTrack && (
              <div className="rounded-lg bg-muted p-4">
                <div className="flex gap-4">
                  {player.currentTrack.track.thumbnail && (
                    <img
                      src={player.currentTrack.track.thumbnail || "/placeholder.svg"}
                      alt={player.currentTrack.track.title}
                      className="h-20 w-20 rounded object-cover"
                    />
                  )}
                  <div className="flex-1">
                    <h3 className="font-semibold text-balance">{player.currentTrack.track.title}</h3>
                    <p className="text-sm text-muted-foreground">{player.currentTrack.track.author}</p>
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
