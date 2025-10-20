"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Play,
  Pause,
  SkipForward,
  Square,
  Volume2,
  VolumeX,
  Repeat,
  Repeat1,
  Shuffle,
  Clock,
  Music2,
} from "lucide-react"

interface AdvancedMusicPlayerProps {
  guildId: string
  playerData: any
  mutate: () => void
}

export function AdvancedMusicPlayer({ guildId, playerData, mutate }: AdvancedMusicPlayerProps) {
  const [volume, setVolume] = useState(100)
  const [seekPosition, setSeekPosition] = useState(0)
  const [isSeeking, setIsSeeking] = useState(false)
  const [playbackSpeed, setPlaybackSpeed] = useState("1.0")

  const player = playerData?.player
  const currentTrack = player?.currentTrack

  useEffect(() => {
    if (player?.volume !== undefined) {
      setVolume(player.volume)
    }
  }, [player?.volume])

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

  const handleMute = async () => {
    const newVolume = volume > 0 ? 0 : 100
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

  const handleSpeedChange = async (speed: string) => {
    setPlaybackSpeed(speed)
    // TODO: Implement playback speed change in backend
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  if (!currentTrack) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Music2 className="h-5 w-5" />
            נגן מוזיקה
          </CardTitle>
          <CardDescription>אין שיר מתנגן כרגע</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Music2 className="h-16 w-16 text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground">חפש והוסף שירים כדי להתחיל</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2">
          <Music2 className="h-5 w-5" />
          נגן מוזיקה מתקדם
        </CardTitle>
        <CardDescription>שליטה מלאה על ההשמעה</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Track Info with Large Thumbnail */}
        <div className="relative rounded-xl bg-gradient-to-br from-primary/20 via-primary/10 to-background p-6">
          <div className="flex gap-6">
            {currentTrack.track.thumbnail && (
              <div className="relative flex-shrink-0">
                <img
                  src={currentTrack.track.thumbnail || "/placeholder.svg"}
                  alt={currentTrack.track.title}
                  className="h-32 w-32 rounded-lg object-cover shadow-lg"
                />
                <div className="absolute inset-0 rounded-lg bg-gradient-to-t from-black/50 to-transparent" />
              </div>
            )}
            <div className="flex-1 min-w-0 flex flex-col justify-center">
              <h3 className="text-2xl font-bold text-balance line-clamp-2 mb-2">{currentTrack.track.title}</h3>
              <p className="text-lg text-muted-foreground mb-3">{currentTrack.track.author}</p>
              <div className="flex gap-2">
                <Badge variant="secondary" className="gap-1">
                  <Clock className="h-3 w-3" />
                  {formatTime(currentTrack.track.duration)}
                </Badge>
                {player?.loopMode !== "off" && (
                  <Badge variant="default">{player.loopMode === "track" ? "חזרה על שיר" : "חזרה על תור"}</Badge>
                )}
                {player?.shuffleEnabled && <Badge variant="default">ערבוב</Badge>}
              </div>
            </div>
          </div>
        </div>

        {/* Seek Bar */}
        <div className="space-y-2">
          <Slider
            value={[seekPosition]}
            onValueChange={handleSeekChange}
            onValueCommit={handleSeekCommit}
            max={currentTrack.track.duration || 100}
            step={1}
            className="w-full"
          />
          <div className="flex justify-between text-sm text-muted-foreground">
            <span className="font-mono">{formatTime(seekPosition)}</span>
            <span className="font-mono">{formatTime(currentTrack.track.duration || 0)}</span>
          </div>
        </div>

        {/* Playback Controls */}
        <div className="flex items-center justify-center gap-3">
          <Button
            onClick={handleShuffleToggle}
            size="lg"
            variant={player?.shuffleEnabled ? "default" : "outline"}
            className="h-12 w-12"
          >
            <Shuffle className="h-5 w-5" />
          </Button>

          <Button
            onClick={handleLoopToggle}
            size="lg"
            variant={player?.loopMode !== "off" ? "default" : "outline"}
            className="h-12 w-12"
          >
            {player?.loopMode === "track" ? <Repeat1 className="h-5 w-5" /> : <Repeat className="h-5 w-5" />}
          </Button>

          {player?.isPaused ? (
            <Button onClick={handleResume} size="lg" className="h-16 w-16 rounded-full">
              <Play className="h-8 w-8" />
            </Button>
          ) : (
            <Button onClick={handlePause} size="lg" className="h-16 w-16 rounded-full" disabled={!player?.isPlaying}>
              <Pause className="h-8 w-8" />
            </Button>
          )}

          <Button
            onClick={handleSkip}
            size="lg"
            variant="outline"
            className="h-12 w-12 bg-transparent"
            disabled={!player?.isPlaying}
          >
            <SkipForward className="h-5 w-5" />
          </Button>

          <Button
            onClick={handleStop}
            size="lg"
            variant="outline"
            className="h-12 w-12 bg-transparent"
            disabled={!player?.isPlaying}
          >
            <Square className="h-5 w-5" />
          </Button>
        </div>

        {/* Volume Control */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">עוצמת קול</Label>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={handleMute} className="flex-shrink-0">
              {volume === 0 ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
            </Button>
            <Slider value={[volume]} onValueChange={handleVolumeChange} max={100} step={1} className="flex-1" />
            <span className="text-sm font-mono font-medium w-12 text-left">{volume}%</span>
          </div>
        </div>

        {/* Playback Speed */}
        <div className="space-y-3">
          <Label htmlFor="speed-select" className="text-sm font-medium">
            מהירות השמעה
          </Label>
          <Select value={playbackSpeed} onValueChange={handleSpeedChange}>
            <SelectTrigger id="speed-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0.25">0.25x</SelectItem>
              <SelectItem value="0.5">0.5x</SelectItem>
              <SelectItem value="0.75">0.75x</SelectItem>
              <SelectItem value="1.0">1.0x (רגיל)</SelectItem>
              <SelectItem value="1.25">1.25x</SelectItem>
              <SelectItem value="1.5">1.5x</SelectItem>
              <SelectItem value="1.75">1.75x</SelectItem>
              <SelectItem value="2.0">2.0x</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Queue Info */}
        <div className="rounded-lg bg-muted p-4 text-center">
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{player?.queue?.length || 0}</span> שירים נוספים בתור
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
