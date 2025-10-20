"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { GripVertical, X } from "lucide-react"

interface QueuePanelProps {
  guildId: string
  guildData: any
  mutate: () => void
}

export function QueuePanel({ guildId, guildData, mutate }: QueuePanelProps) {
  const queue = guildData?.player?.queue || []
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const handleDragStart = (index: number) => {
    setDraggedIndex(index)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
  }

  const handleDrop = async (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === targetIndex) return

    await fetch(`/api/bot/guilds/${guildId}/queue/reorder`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fromIndex: draggedIndex, toIndex: targetIndex }),
    })

    setDraggedIndex(null)
    mutate()
  }

  const handleRemove = async (index: number) => {
    await fetch(`/api/bot/guilds/${guildId}/queue/remove`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ index }),
    })
    mutate()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>תור השמעה</CardTitle>
        <CardDescription>{queue.length} שירים בתור</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px]">
          <div className="space-y-3">
            {queue.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8">התור ריק</p>
            ) : (
              queue.map((item: any, index: number) => (
                <div
                  key={index}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDrop={(e) => handleDrop(e, index)}
                  className={`flex items-center gap-3 rounded-lg border border-border p-3 cursor-move hover:bg-muted/50 transition-colors ${
                    draggedIndex === index ? "opacity-50" : ""
                  }`}
                >
                  <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-sm font-medium text-muted-foreground w-6 flex-shrink-0">{index + 1}</span>
                  {item.track.thumbnail && (
                    <img
                      src={item.track.thumbnail || "/placeholder.svg"}
                      alt={item.track.title}
                      className="h-12 w-12 rounded object-cover flex-shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium truncate text-balance">{item.track.title}</h4>
                    <p className="text-xs text-muted-foreground truncate">{item.track.author}</p>
                    <p className="text-xs text-muted-foreground">{formatDuration(item.track.duration)}</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => handleRemove(index)} className="flex-shrink-0">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
