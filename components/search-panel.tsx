"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Search, Plus, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface SearchPanelProps {
  guildId: string
  mutate: () => void
}

export function SearchPanel({ guildId, mutate }: SearchPanelProps) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const [addingTrackId, setAddingTrackId] = useState<string | null>(null)

  const handleSearch = async () => {
    if (!query.trim()) return

    setLoading(true)
    try {
      const response = await fetch(`/api/bot/guilds/${guildId}/search?q=${encodeURIComponent(query)}`)
      const data = await response.json()
      setResults(data.results || [])
    } catch (error) {
      console.error("[v0] Search error:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddToQueue = async (track: any) => {
    setAddingTrackId(track.id)
    try {
      console.log("[v0] Adding track to queue:", track.title)
      const response = await fetch(`/api/bot/guilds/${guildId}/play`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ track }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to add track")
      }

      toast({
        title: "נוסף לתור",
        description: `${track.title} נוסף לתור בהצלחה`,
      })
      mutate()
    } catch (error) {
      console.error("[v0] Add to queue error:", error)
      toast({
        title: "שגיאה",
        description: error instanceof Error ? error.message : "לא ניתן להוסיף את השיר לתור",
        variant: "destructive",
      })
    } finally {
      setAddingTrackId(null)
    }
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>חיפוש שירים</CardTitle>
        <CardDescription>חפש שירים ב-YouTube</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="חפש שיר..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            dir="auto"
          />
          <Button onClick={handleSearch} disabled={loading}>
            <Search className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-2 max-h-96 overflow-y-auto">
          {results.map((track) => (
            <div key={track.id} className="flex items-center gap-3 rounded-lg border border-border p-3">
              {track.thumbnail && (
                <img
                  src={track.thumbnail || "/placeholder.svg"}
                  alt={track.title}
                  className="h-16 w-16 rounded object-cover"
                />
              )}
              <div className="flex-1 min-w-0">
                <h4 className="font-medium truncate text-balance">{track.title}</h4>
                <p className="text-sm text-muted-foreground truncate">{track.author}</p>
                <p className="text-xs text-muted-foreground">{formatDuration(track.duration)}</p>
              </div>
              <Button onClick={() => handleAddToQueue(track)} size="sm" disabled={addingTrackId === track.id}>
                {addingTrackId === track.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
