"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Play,
  Pause,
  SkipForward,
  Square,
  Volume2,
  Repeat,
  Repeat1,
  Shuffle,
  X,
  GripVertical,
  Clock,
  Music2,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface Track {
  id: string
  title: string
  author: string
  duration: number
  thumbnail: string
  url: string
}

interface QueueItem {
  track: Track
  addedAt: string
}

interface PlayerStatus {
  isPlaying: boolean
  isPaused: boolean
  currentTrack: QueueItem | null
  currentPosition: number
  queue: QueueItem[]
  loopMode: "off" | "track" | "queue"
  shuffleEnabled: boolean
  volume: number
}

interface AdvancedMusicPlayerProps {
  guildId: string
  guildData: any
  mutate: () => void
}

export function AdvancedMusicPlayer({ guildId, guildData, mutate }: AdvancedMusicPlayerProps) {
  const { toast } = useToast()
  const [volume, setVolume] = useState(100)
  const [channels, setChannels] = useState<any[]>([])
  const [selectedChannel, setSelectedChannel] = useState<string>("")
  const [seekPosition, setSeekPosition] = useState(0)
  const [isSeeking, setIsSeeking] = useState(false)
  const [playerStatus, setPlayerStatus] = useState<PlayerStatus | null>(null)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  const eventSourceRef = useRef<EventSource | null>(null)

  const guild = guildData?.guild
  const isConnected = !!guild?.voiceChannelId

  useEffect(() => {
    if (!isConnected) return

    const eventSource = new EventSource(`/api/bot/guilds/${guildId}/events`)
    eventSourceRef.current = eventSource

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        console.log("[v0] SSE event:", data)

        if (data.type === "player_state" || data.type === "track_start" || data.type === "queue_update") {
          fetchPlayerStatus()
        }
      } catch (error) {
        console.error("[v0] SSE parse error:", error)
      }
    }

    eventSource.onerror = (error) => {
      console.error("[v0] SSE error:", error)
      eventSource.close()
    }

    return () => {
      eventSource.close()
    }
  }, [guildId, isConnected])

  useEffect(() => {
    if (isConnected) {
      fetchPlayerStatus()
    }
  }, [guildId, isConnected])

  const fetchPlayerStatus = async () => {
    try {
      const res = await fetch(`/api/bot/guilds/${guildId}/player`)
      if (res.ok) {
        const data = await res.json()
        setPlayerStatus(data.player)
        if (data.player) {
          setVolume(data.player.volume)
          if (!isSeeking) {
            setSeekPosition(data.player.currentPosition)
          }
        }
      }
    } catch (error) {
      console.error("Failed to fetch player status:", error)
    }
  }

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
    if (!playerStatus?.isPlaying || playerStatus?.isPaused || isSeeking) return

    const interval = setInterval(() => {
      setSeekPosition((prev) => {
        const newPos = prev + 1
        const maxPos = playerStatus?.currentTrack?.track?.duration || 0
        return newPos <= maxPos ? newPos : prev
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [playerStatus?.isPlaying, playerStatus?.isPaused, playerStatus?.currentTrack, isSeeking])

  const handleJoinVoice = async () => {
    if (!selectedChannel) {
      toast({ title: "שגיאה", description: "בחר ערוץ קולי קודם", variant: "destructive" })
      return
    }

    const res = await fetch(`/api/bot/guilds/${guildId}/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channelId: selectedChannel }),
    })

    if (res.ok) {
      toast({ title: "הצלחה", description: "הבוט הצטרף לערוץ הקולי" })
      mutate()
    } else {
      toast({ title: "שגיאה", description: "נכשל בהצטרפות לערוץ", variant: "destructive" })
    }
  }

  const handleLeaveVoice = async () => {
    const res = await fetch(`/api/bot/guilds/${guildId}/leave`, { method: "POST" })
    if (res.ok) {
      toast({ title: "הצלחה", description: "הבוט עזב את הערוץ הקולי" })
      mutate()
    }
  }

  const handlePause = async () => {
    await fetch(`/api/bot/guilds/${guildId}/pause`, { method: "POST" })
    fetchPlayerStatus()
  }

  const handleResume = async () => {
    await fetch(`/api/bot/guilds/${guildId}/resume`, { method: "POST" })
    fetchPlayerStatus()
  }

  const handleStop = async () => {
    await fetch(`/api/bot/guilds/${guildId}/stop`, { method: "POST" })
    fetchPlayerStatus()
  }

  const handleSkip = async () => {
    await fetch(`/api/bot/guilds/${guildId}/skip`, { method: "POST" })
    fetchPlayerStatus()
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
    fetchPlayerStatus()
  }

  const handleLoopToggle = async () => {
    const modes: Array<"off" | "track" | "queue"> = ["off", "track", "queue"]
    const currentIndex = modes.indexOf(playerStatus?.loopMode || "off")
    const nextMode = modes[(currentIndex + 1) % modes.length]

    await fetch(`/api/bot/guilds/${guildId}/loop`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: nextMode }),
    })
    fetchPlayerStatus()
  }

  const handleShuffleToggle = async () => {
    await fetch(`/api/bot/guilds/${guildId}/shuffle`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !playerStatus?.shuffleEnabled }),
    })
    fetchPlayerStatus()
  }

  const handleLockToggle = async (checked: boolean) => {
    await fetch(`/api/bot/guilds/${guildId}/lock`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locked: checked }),
    })
    mutate()
  }

  const handleRemoveFromQueue = async (index: number) => {
    await fetch(`/api/bot/guilds/${guildId}/queue/remove`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ index }),
    })
    fetchPlayerStatus()
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const currentTrack = playerStatus?.currentTrack

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>נגן מוזיקה מתקדם</CardTitle>
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
                        {channel.name} ({channel.userCount} משתמשים)
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
                <div className="rounded-lg bg-gradient-to-br from-primary/10 via-primary/5 to-background border-2 border-primary/20 p-6 space-y-4">
                  <div className="flex gap-4">
                    {currentTrack.track.thumbnail && (
                      <div className="relative">
                        <img
                          src={currentTrack.track.thumbnail || "/placeholder.svg"}
                          alt={currentTrack.track.title}
                          className="h-24 w-24 rounded-lg object-cover shadow-lg"
                        />
                        {playerStatus?.isPlaying && !playerStatus?.isPaused && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-lg">
                            <div className="flex gap-1">
                              <div className="w-1 h-4 bg-primary animate-pulse" />
                              <div className="w-1 h-4 bg-primary animate-pulse delay-75" />
                              <div className="w-1 h-4 bg-primary animate-pulse delay-150" />
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    <div className="flex-1 space-y-2">
                      <h3 className="font-bold text-lg text-balance leading-tight">{currentTrack.track.title}</h3>
                      <p className="text-sm text-muted-foreground">{currentTrack.track.author}</p>
                      <div className="flex gap-2">
                        <Badge variant="secondary">
                          <Music2 className="h-3 w-3 ml-1" />
                          {playerStatus?.isPlaying && !playerStatus?.isPaused ? "מתנגן" : "מושהה"}
                        </Badge>
                        <Badge variant="outline">
                          <Clock className="h-3 w-3 ml-1" />
                          {formatTime(currentTrack.track.duration)}
                        </Badge>
                      </div>
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
                    <div className="flex justify-between text-xs text-muted-foreground font-mono">
                      <span>{formatTime(seekPosition)}</span>
                      <span>{formatTime(currentTrack.track.duration || 0)}</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-center gap-3">
                {playerStatus?.isPaused ? (
                  <Button onClick={handleResume} size="lg" className="h-14 w-14 rounded-full">
                    <Play className="h-6 w-6" />
                  </Button>
                ) : (
                  <Button
                    onClick={handlePause}
                    size="lg"
                    className="h-14 w-14 rounded-full"
                    disabled={!playerStatus?.isPlaying}
                  >
                    <Pause className="h-6 w-6" />
                  </Button>
                )}
                <Button
                  onClick={handleSkip}
                  size="lg"
                  variant="outline"
                  className="h-12 w-12 rounded-full bg-transparent"
                  disabled={!playerStatus?.isPlaying}
                >
                  <SkipForward className="h-5 w-5" />
                </Button>
                <Button
                  onClick={handleStop}
                  size="lg"
                  variant="outline"
                  className="h-12 w-12 rounded-full bg-transparent"
                  disabled={!playerStatus?.isPlaying}
                >
                  <Square className="h-5 w-5" />
                </Button>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <Volume2 className="h-5 w-5 text-muted-foreground" />
                  <Slider value={[volume]} onValueChange={handleVolumeChange} max={100} step={1} className="flex-1" />
                  <span className="text-sm font-medium w-12 text-left tabular-nums">{volume}%</span>
                </div>

                <div className="flex items-center justify-center gap-3">
                  <Button
                    onClick={handleLoopToggle}
                    variant={playerStatus?.loopMode !== "off" ? "default" : "outline"}
                    size="sm"
                    className="gap-2"
                  >
                    {playerStatus?.loopMode === "track" ? (
                      <Repeat1 className="h-4 w-4" />
                    ) : (
                      <Repeat className="h-4 w-4" />
                    )}
                    <span>
                      {playerStatus?.loopMode === "off"
                        ? "ללא חזרה"
                        : playerStatus?.loopMode === "track"
                          ? "חזרה על שיר"
                          : "חזרה על תור"}
                    </span>
                  </Button>
                  <Button
                    onClick={handleShuffleToggle}
                    variant={playerStatus?.shuffleEnabled ? "default" : "outline"}
                    size="sm"
                    className="gap-2"
                  >
                    <Shuffle className="h-4 w-4" />
                    <span>ערבוב</span>
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {isConnected && playerStatus && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>תור השמעה</span>
              <Badge variant="secondary">{playerStatus.queue.length} שירים</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {playerStatus.queue.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Music2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>התור ריק</p>
                <p className="text-sm">הוסף שירים מהחיפוש למעלה</p>
              </div>
            ) : (
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-2">
                  {playerStatus.queue.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors group"
                    >
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <GripVertical className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <span className="text-sm font-medium w-6">{index + 1}</span>
                      </div>
                      {item.track.thumbnail && (
                        <img
                          src={item.track.thumbnail || "/placeholder.svg"}
                          alt={item.track.title}
                          className="h-12 w-12 rounded object-cover"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{item.track.title}</p>
                        <p className="text-sm text-muted-foreground truncate">{item.track.author}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {formatTime(item.track.duration)}
                        </span>
                        <Button
                          onClick={() => handleRemoveFromQueue(index)}
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
