"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"

interface Guild {
  guildId: string
  guildName: string
  voiceChannelId: string | null
  voiceChannelLocked: boolean
  isPlaying: boolean
}

interface GuildSelectorProps {
  guilds: Guild[]
  selectedGuildId: string | null
  onSelectGuild: (guildId: string) => void
}

export function GuildSelector({ guilds, selectedGuildId, onSelectGuild }: GuildSelectorProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium">בחר שרת:</label>
          <Select value={selectedGuildId || undefined} onValueChange={onSelectGuild}>
            <SelectTrigger className="w-full max-w-md">
              <SelectValue placeholder="בחר שרת דיסקורד" />
            </SelectTrigger>
            <SelectContent>
              {guilds.map((guild) => (
                <SelectItem key={guild.guildId} value={guild.guildId}>
                  <div className="flex items-center gap-2">
                    <span>{guild.guildName}</span>
                    {guild.isPlaying && <span className="text-xs text-green-500">● מנגן</span>}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  )
}
