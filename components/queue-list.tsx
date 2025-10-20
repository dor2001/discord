"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Music, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"

interface Track {
  id: string
  title: string
  author: string
  duration: number
  thumbnail?: string
  url: string
}

interface QueueItem {
  track: Track
  addedAt: number
}

interface QueueListProps {
  queue: QueueItem[]
  currentTrack?: { track: Track; position: number }
  onRemove?: (index: number) => void
}

export function QueueList({ queue, currentTrack, onRemove }: QueueListProps) {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Music className="h-5 w-5" />
          תור השמעה
        </CardTitle>
        <CardDescription>{queue.length === 0 ? "התור ריק" : `${queue.length} שירים בתור`}</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px] pr-4">
          {currentTrack && (
            <div className="mb-4 rounded-lg border-2 border-primary bg-primary/10 p-3">
              <div className="flex items-start gap-3">
                {currentTrack.track.thumbnail && (
                  <img
                    src={currentTrack.track.thumbnail || "/placeholder.svg"}
                    alt={currentTrack.track.title}
                    className="h-16 w-16 rounded object-cover"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-balance line-clamp-2">{currentTrack.track.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">{currentTrack.track.author}</p>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatTime(currentTrack.track.duration)}
                    </span>
                  </div>
                  <div className="mt-2 text-xs font-medium text-primary">▶ מתנגן כעת</div>
                </div>
              </div>
            </div>
          )}

          {queue.length === 0 && !currentTrack && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Music className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">אין שירים בתור</p>
              <p className="text-sm text-muted-foreground mt-1">חפש והוסף שירים כדי להתחיל</p>
            </div>
          )}

          <div className="space-y-2">
            {queue.map((item, index) => (
              <div
                key={`${item.track.id}-${item.addedAt}-${index}`}
                className="group flex items-start gap-3 rounded-lg border bg-card p-3 transition-colors hover:bg-accent"
              >
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-medium">
                  {index + 1}
                </div>
                {item.track.thumbnail && (
                  <img
                    src={item.track.thumbnail || "/placeholder.svg"}
                    alt={item.track.title}
                    className="h-12 w-12 rounded object-cover"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-balance line-clamp-2">{item.track.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">{item.track.author}</p>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatTime(item.track.duration)}
                    </span>
                  </div>
                </div>
                {onRemove && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => onRemove(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
