import { Client, GatewayIntentBits, Collection } from "discord.js"
import type { VoiceConnection } from "@discordjs/voice"
import type { MusicPlayer } from "./music-player"
import { config } from "./config"
import { saveState } from "./state-manager"

export interface GuildData {
  guildId: string
  guildName: string
  voiceChannelId: string | null
  voiceChannelLocked: boolean
  player: MusicPlayer | null
  connection: VoiceConnection | null
}

export class MusicBot {
  public client: Client
  public guilds: Collection<string, GuildData>
  private isReady = false
  private readyPromise: Promise<void>
  private readyResolve?: () => void

  constructor() {
    this.client = new Client({
      intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates, GatewayIntentBits.GuildMessages],
    })

    this.guilds = new Collection()

    this.readyPromise = new Promise((resolve) => {
      this.readyResolve = resolve
    })

    this.setupEventHandlers()
  }

  private saveCurrentState() {
    const state = {
      isReady: this.isReady,
      guilds: this.getGuilds(),
      lastUpdate: Date.now(),
    }
    saveState(state)
  }

  private setupEventHandlers() {
    this.client.on("ready", () => {
      console.log("[v0] Bot is ready! Logged in as:", this.client.user?.tag)
      this.isReady = true

      this.client.guilds.cache.forEach((guild) => {
        console.log("[v0] Found guild:", guild.name, "ID:", guild.id)
        this.guilds.set(guild.id, {
          guildId: guild.id,
          guildName: guild.name,
          voiceChannelId: null,
          voiceChannelLocked: false,
          player: null,
          connection: null,
        })
      })

      console.log("[v0] Total guilds loaded:", this.guilds.size)
      this.saveCurrentState()
      if (this.readyResolve) {
        this.readyResolve()
      }
    })

    this.client.on("guildCreate", (guild) => {
      console.log("[v0] Joined new guild:", guild.name)
      this.guilds.set(guild.id, {
        guildId: guild.id,
        guildName: guild.name,
        voiceChannelId: null,
        voiceChannelLocked: false,
        player: null,
        connection: null,
      })
      this.saveCurrentState()
    })

    this.client.on("guildDelete", (guild) => {
      console.log("[v0] Left guild:", guild.name)
      const guildData = this.guilds.get(guild.id)
      if (guildData?.player) {
        guildData.player.destroy()
      }
      this.guilds.delete(guild.id)
      this.saveCurrentState()
    })

    this.client.on("voiceStateUpdate", (oldState, newState) => {
      if (oldState.member?.id === this.client.user?.id && !newState.channelId) {
        const guildData = this.guilds.get(oldState.guild.id)
        if (guildData) {
          guildData.voiceChannelId = null
          guildData.connection = null
          if (guildData.player) {
            guildData.player.destroy()
            guildData.player = null
          }
        }
      }
    })
  }

  public async start() {
    try {
      await this.client.login(config.discordToken)
      console.log("[v0] Bot login successful, waiting for ready event...")
      await this.readyPromise
      console.log("[v0] Bot is fully ready with", this.guilds.size, "guilds")
    } catch (error) {
      console.error("[v0] Failed to start bot:", error)
      throw error
    }
  }

  public getHealth() {
    return {
      status: this.isReady ? "healthy" : "starting",
      guilds: this.guilds.size,
      uptime: this.client.uptime || 0,
    }
  }

  public getGuilds() {
    return Array.from(this.guilds.values()).map((guild) => ({
      guildId: guild.guildId,
      guildName: guild.guildName,
      voiceChannelId: guild.voiceChannelId,
      voiceChannelLocked: guild.voiceChannelLocked,
      isPlaying: guild.player?.isPlaying() || false,
    }))
  }

  public getGuildData(guildId: string): GuildData | undefined {
    return this.guilds.get(guildId)
  }
}

declare global {
  var musicBotInstance: MusicBot | undefined
}

export function getBotInstance(): MusicBot {
  if (!global.musicBotInstance) {
    console.log("[v0] Creating new bot instance")
    global.musicBotInstance = new MusicBot()
  }
  return global.musicBotInstance
}

export async function startBot() {
  const bot = getBotInstance()
  if (!bot.client.isReady()) {
    console.log("[v0] Starting bot...")
    await bot.start()
  } else {
    console.log("[v0] Bot already started")
  }
  return bot
}
