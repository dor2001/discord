import {
  type AudioPlayer,
  AudioPlayerStatus,
  createAudioPlayer,
  createAudioResource,
  type VoiceConnection,
  type AudioResource,
  type PlayerSubscription,
} from "@discordjs/voice"
import { spawn } from "child_process"
import { config } from "./config"
import { botEventEmitter } from "@/lib/event-emitter"

export interface Track {
  id: string
  title: string
  author: string
  duration: number
  thumbnail: string
  url: string
}

export interface QueueItem {
  track: Track
  addedAt: Date
}

export type LoopMode = "off" | "track" | "queue"

export class MusicPlayer {
  private audioPlayer: AudioPlayer
  private queue: QueueItem[] = []
  private currentTrack: QueueItem | null = null
  private loopMode: LoopMode = "off"
  private shuffleEnabled = false
  private volume = 100
  private subscription: PlayerSubscription | null = null
  private currentResource: AudioResource | null = null
  private isPaused = false
  private guildId: string

  constructor(
    private connection: VoiceConnection,
    guildId: string,
  ) {
    this.guildId = guildId
    this.audioPlayer = createAudioPlayer()
    this.subscription = connection.subscribe(this.audioPlayer)

    this.audioPlayer.on(AudioPlayerStatus.Idle, () => {
      console.log("[v0] Track finished, playing next")
      botEventEmitter.emitPlayerUpdate({
        guildId: this.guildId,
        type: "track_end",
        data: { track: this.currentTrack },
      })
      this.handleTrackEnd()
    })

    this.audioPlayer.on("error", (error) => {
      console.error("[v0] Audio player error:", error)
      this.handleTrackEnd()
    })
  }

  private handleTrackEnd() {
    if (this.loopMode === "track" && this.currentTrack) {
      this.playTrack(this.currentTrack.track)
    } else {
      if (this.loopMode === "queue" && this.currentTrack) {
        this.queue.push(this.currentTrack)
      }
      this.playNext()
    }
  }

  public async addToQueue(track: Track) {
    const queueItem: QueueItem = {
      track,
      addedAt: new Date(),
    }

    this.queue.push(queueItem)

    botEventEmitter.emitPlayerUpdate({
      guildId: this.guildId,
      type: "queue_update",
      data: { queue: this.queue },
    })

    if (!this.currentTrack) {
      this.playNext()
    }
  }

  private async playTrack(track: Track) {
    try {
      console.log("[v0] Playing track:", track.title)

      const ytdlp = spawn("yt-dlp", ["-f", "bestaudio", "-o", "-", "--cookies", config.cookiesPath, track.url])

      const ffmpeg = spawn("ffmpeg", [
        "-i",
        "pipe:0",
        "-f",
        "s16le",
        "-ar",
        "48000",
        "-ac",
        "2",
        "-af",
        `volume=${this.volume / 100}`,
        "pipe:1",
      ])

      ytdlp.stdout.pipe(ffmpeg.stdin)

      ytdlp.stderr.on("data", (data) => {
        console.error("[v0] yt-dlp error:", data.toString())
      })

      ffmpeg.stderr.on("data", (data) => {
        console.error("[v0] ffmpeg error:", data.toString())
      })

      this.currentResource = createAudioResource(ffmpeg.stdout, {
        inputType: "s16le" as any,
      })

      this.audioPlayer.play(this.currentResource)
      this.isPaused = false

      botEventEmitter.emitPlayerUpdate({
        guildId: this.guildId,
        type: "track_start",
        data: { track: this.currentTrack },
      })
    } catch (error) {
      console.error("[v0] Failed to play track:", error)
      this.playNext()
    }
  }

  public playNext() {
    if (this.queue.length === 0) {
      this.currentTrack = null
      this.audioPlayer.stop()
      this.emitStateUpdate()
      return
    }

    let nextIndex = 0
    if (this.shuffleEnabled && this.queue.length > 1) {
      nextIndex = Math.floor(Math.random() * this.queue.length)
    }

    this.currentTrack = this.queue.splice(nextIndex, 1)[0]
    this.playTrack(this.currentTrack.track)
    botEventEmitter.emitPlayerUpdate({
      guildId: this.guildId,
      type: "queue_update",
      data: { queue: this.queue },
    })
  }

  public pause() {
    if (this.audioPlayer.state.status === AudioPlayerStatus.Playing) {
      this.audioPlayer.pause()
      this.isPaused = true
      this.emitStateUpdate()
    }
  }

  public resume() {
    if (this.audioPlayer.state.status === AudioPlayerStatus.Paused) {
      this.audioPlayer.unpause()
      this.isPaused = false
      this.emitStateUpdate()
    }
  }

  public stop() {
    this.queue = []
    this.currentTrack = null
    this.audioPlayer.stop()
    this.emitStateUpdate()
  }

  public skip() {
    this.playNext()
  }

  public setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(100, volume))
    this.emitStateUpdate()
  }

  public setLoopMode(mode: LoopMode) {
    this.loopMode = mode
    this.emitStateUpdate()
  }

  public setShuffle(enabled: boolean) {
    this.shuffleEnabled = enabled
    this.emitStateUpdate()
  }

  private emitStateUpdate() {
    botEventEmitter.emitPlayerUpdate({
      guildId: this.guildId,
      type: "player_state",
      data: this.getStatus(),
    })
  }

  public getQueue(): QueueItem[] {
    return [...this.queue]
  }

  public getCurrentTrack(): QueueItem | null {
    return this.currentTrack
  }

  public getStatus() {
    return {
      isPlaying: this.isPlaying(),
      isPaused: this.isPaused,
      currentTrack: this.currentTrack,
      queue: this.queue,
      loopMode: this.loopMode,
      shuffleEnabled: this.shuffleEnabled,
      volume: this.volume,
    }
  }

  public isPlaying(): boolean {
    return this.audioPlayer.state.status === AudioPlayerStatus.Playing
  }

  public destroy() {
    this.audioPlayer.stop()
    this.subscription?.unsubscribe()
  }
}
