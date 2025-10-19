"use client"

import { useState, useEffect, useCallback } from "react"
import useSWR from "swr"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { GuildSelector } from "@/components/guild-selector"
import { MusicPlayer } from "@/components/music-player"
import { SearchPanel } from "@/components/search-panel"
import { QueuePanel } from "@/components/queue-panel"
import { LogOut } from "lucide-react"
import { usePlayerEvents } from "@/hooks/use-player-events"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function DashboardPage() {
  const router = useRouter()
  const [selectedGuildId, setSelectedGuildId] = useState<string | null>(null)

  const { data: guildsData } = useSWR("/api/bot/guilds", fetcher, {
    refreshInterval: 5000,
  })

  const { data: guildData, mutate: mutateGuildData } = useSWR(
    selectedGuildId ? `/api/bot/guilds/${selectedGuildId}` : null,
    fetcher,
    {
      refreshInterval: 2000,
    },
  )

  const handlePlayerUpdate = useCallback(() => {
    mutateGuildData()
  }, [mutateGuildData])

  usePlayerEvents(selectedGuildId, handlePlayerUpdate)

  useEffect(() => {
    if (guildsData?.guilds && guildsData.guilds.length > 0 && !selectedGuildId) {
      setSelectedGuildId(guildsData.guilds[0].guildId)
    }
  }, [guildsData, selectedGuildId])

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" })
    router.push("/login")
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <h1 className="text-2xl font-bold">בוט מוזיקה לדיסקורד</h1>
          <Button variant="outline" size="sm" onClick={handleLogout}>
            <LogOut className="ml-2 h-4 w-4" />
            התנתק
          </Button>
        </div>
      </header>

      <main className="container mx-auto p-4">
        <div className="mb-6">
          <GuildSelector
            guilds={guildsData?.guilds || []}
            selectedGuildId={selectedGuildId}
            onSelectGuild={setSelectedGuildId}
          />
        </div>

        {selectedGuildId && (
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              <MusicPlayer guildId={selectedGuildId} guildData={guildData} mutate={mutateGuildData} />
              <SearchPanel guildId={selectedGuildId} mutate={mutateGuildData} />
            </div>
            <div>
              <QueuePanel guildId={selectedGuildId} guildData={guildData} />
            </div>
          </div>
        )}

        {!selectedGuildId && guildsData?.guilds?.length === 0 && (
          <Card>
            <CardHeader>
              <CardTitle>אין שרתים זמינים</CardTitle>
              <CardDescription>הבוט לא מחובר לאף שרת דיסקורד</CardDescription>
            </CardHeader>
          </Card>
        )}
      </main>
    </div>
  )
}
