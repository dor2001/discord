export interface GuildState {
  guildId: string
  guildName: string
  isPlaying: boolean
  isPaused: boolean
  currentTrack: Track | null
  queue: Track[]
  volume: number
  loop: "off" | "track" | "queue"
}

export interface Track {
  title: string
  url: string
  duration: number
  thumbnail?: string
  requestedBy: string
}

export interface BotStatus {
  isOnline: boolean
  guilds: GuildState[]
  uptime: number
}
