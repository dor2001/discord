"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"

interface QueuePanelProps {
  guildId: string
  guildData: any
}

export function QueuePanel({ guildId, guildData }: QueuePanelProps) {
  const queue = guildData?.player?.queue || []

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
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
                <div key={index} className="flex items-center gap-3 rounded-lg border border-border p-3">
                  <span className="text-sm font-medium text-muted-foreground w-6">{index + 1}</span>
                  {item.track.thumbnail && (
                    <img
                      src={item.track.thumbnail || "/placeholder.svg"}
                      alt={item.track.title}
                      className="h-12 w-12 rounded object-cover"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium truncate text-balance">{item.track.title}</h4>
                    <p className="text-xs text-muted-foreground truncate">{item.track.author}</p>
                    <p className="text-xs text-muted-foreground">{formatDuration(item.track.duration)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
