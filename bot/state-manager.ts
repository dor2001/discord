import { writeFileSync, readFileSync, existsSync, mkdirSync } from "fs"
import { join } from "path"
import { config } from "./config"

const STATE_FILE = join(config.dataPath, "bot-state.json")

export interface BotState {
  isReady: boolean
  guilds: Array<{
    guildId: string
    guildName: string
    voiceChannelId: string | null
    voiceChannelLocked: boolean
    isPlaying: boolean
  }>
  lastUpdate: number
}

export function saveState(state: BotState) {
  try {
    if (!existsSync(config.dataPath)) {
      mkdirSync(config.dataPath, { recursive: true })
    }
    writeFileSync(STATE_FILE, JSON.stringify(state, null, 2))
    console.log("[v0] State saved:", state.guilds.length, "guilds")
  } catch (error) {
    console.error("[v0] Failed to save state:", error)
  }
}

export function loadState(): BotState | null {
  try {
    if (!existsSync(STATE_FILE)) {
      console.log("[v0] No state file found")
      return null
    }
    const data = readFileSync(STATE_FILE, "utf-8")
    const state = JSON.parse(data) as BotState
    console.log("[v0] State loaded:", state.guilds.length, "guilds")
    return state
  } catch (error) {
    console.error("[v0] Failed to load state:", error)
    return null
  }
}
