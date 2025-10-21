import {
  type AudioPlayer,
  AudioPlayerStatus,
  createAudioPlayer,
  createAudioResource,
  type VoiceConnection,
  type AudioResource,
  type PlayerSubscription,
  StreamType,
} from "@discordjs/voice"
import { spawn } from "child_process"
import { botEventEmitter } from "../lib/event-emitter.js"

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
  private currentPosition = 0
  private startTime: number | null = null
  private playbackSpeed = 1.0

  constructor(
    private connection: VoiceConnection,
    guildId: string,
  ) {
    this.guildId = guildId
    this.audioPlayer = createAudioPlayer()
    this.subscription = connection.subscribe(this.audioPlayer) ?? null

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

      this.currentPosition = 0
      this.startTime = Date.now()

      const filters = this.playbackSpeed !== 1.0 ? [`atempo=${this.playbackSpeed}`] : []
      const filterArgs = filters.length > 0 ? ["--audio-filter", filters.join(",")] : []

      const ytdlp = spawn("yt-dlp", [
        track.url,
        "-o",
        "-",
        "-f",
        "bestaudio[ext=webm]/bestaudio[ext=m4a]/bestaudio/best",
        "--no-check-certificates",
        "--no-warnings",
        "--prefer-free-formats",
        "--geo-bypass",
        "--age-limit",
        "21",
        "--add-header",
        "User-Agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "--add-header",
        "Accept-Language:en-US,en;q=0.9",
        "--extractor-args",
        "youtube:player_client=android,web,tv_embedded",
        ...filterArgs,
      ])

      ytdlp.stderr.on("data", (data) => {
        console.error("[v0] yt-dlp stderr:", data.toString())
      })

      this.currentResource = createAudioResource(ytdlp.stdout, {
        inputType: StreamType.Arbitrary,
        inlineVolume: true,
      })

      if (this.currentResource.volume) {
        this.currentResource.volume.setVolume(this.volume / 100)
      }

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
    if (this.currentResource?.volume) {
      this.currentResource.volume.setVolume(this.volume / 100)
    }
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

  public setPlaybackSpeed(speed: number) {
    this.playbackSpeed = Math.max(0.5, Math.min(2.0, speed))

    // If currently playing, restart with new speed
    if (this.currentTrack && this.isPlaying()) {
      const currentPos = this.getCurrentPosition()
      this.playTrack(this.currentTrack.track).then(() => {
        if (currentPos > 0) {
          this.seek(currentPos)
        }
      })
    }

    this.emitStateUpdate()
  }

  public getPlaybackSpeed(): number {
    return this.playbackSpeed
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

  public async seek(seconds: number) {
    if (!this.currentTrack) return

    const track = this.currentTrack.track
    this.currentPosition = seconds

    try {
      console.log("[v0] Seeking to:", seconds, "seconds")

      const ytdlp = spawn("yt-dlp", [
        track.url,
        "-o",
        "-",
        "-f",
        "bestaudio[ext=webm]/bestaudio[ext=m4a]/bestaudio/best",
        "--no-check-certificates",
        "--no-warnings",
        "--prefer-free-formats",
        "--geo-bypass",
        "--age-limit",
        "21",
        "--add-header",
        "User-Agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "--add-header",
        "Accept-Language:en-US,en;q=0.9",
        "--extractor-args",
        "youtube:player_client=android,web,tv_embedded",
        "--download-sections",
        `*${seconds}-inf`,
      ])

      ytdlp.stderr.on("data", (data) => {
        console.error("[v0] yt-dlp stderr:", data.toString())
      })

      this.currentResource = createAudioResource(ytdlp.stdout, {
        inputType: StreamType.Arbitrary,
        inlineVolume: true,
      })

      if (this.currentResource.volume) {
        this.currentResource.volume.setVolume(this.volume / 100)
      }

      this.audioPlayer.play(this.currentResource)
      this.startTime = Date.now() - seconds * 1000
      this.isPaused = false
      this.emitStateUpdate()
    } catch (error) {
      console.error("[v0] Failed to seek:", error)
    }
  }

  public getCurrentPosition(): number {
    if (!this.startTime || this.isPaused) {
      return this.currentPosition
    }
    return this.currentPosition + (Date.now() - this.startTime) / 1000
  }

  public reorderQueue(fromIndex: number, toIndex: number) {
    if (fromIndex < 0 || fromIndex >= this.queue.length || toIndex < 0 || toIndex >= this.queue.length) {
      return
    }

    const [item] = this.queue.splice(fromIndex, 1)
    this.queue.splice(toIndex, 0, item)

    botEventEmitter.emitPlayerUpdate({
      guildId: this.guildId,
      type: "queue_update",
      data: { queue: this.queue },
    })
  }

  public removeFromQueue(index: number) {
    if (index < 0 || index >= this.queue.length) {
      return
    }

    this.queue.splice(index, 1)

    botEventEmitter.emitPlayerUpdate({
      guildId: this.guildId,
      type: "queue_update",
      data: { queue: this.queue },
    })
  }

  public getStatus() {
    return {
      isPlaying: this.isPlaying(),
      isPaused: this.isPaused,
      currentTrack: this.currentTrack,
      currentPosition: this.getCurrentPosition(),
      queue: this.queue,
      loopMode: this.loopMode,
      shuffleEnabled: this.shuffleEnabled,
      volume: this.volume,
      playbackSpeed: this.playbackSpeed,
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
