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
import { pipedService } from "./piped-service.js"

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

      let streamUrl = await pipedService.getStreamUrl(track.id)

      if (!streamUrl) {
        console.log("[v0] Piped failed, falling back to yt-dlp")
        streamUrl = await this.getStreamUrlWithYtDlp(track.url)

        if (!streamUrl) {
          console.error("[v0] Both Piped and yt-dlp failed to get stream URL")
          this.playNext()
          return
        }
      }

      console.log("[v0] Got stream URL, starting playback")

      const filters = this.playbackSpeed !== 1.0 ? ["-af", `atempo=${this.playbackSpeed}`] : []

      const ffmpeg = spawn("ffmpeg", [
        "-reconnect",
        "1",
        "-reconnect_streamed",
        "1",
        "-reconnect_delay_max",
        "5",
        "-i",
        streamUrl,
        ...filters,
        "-f",
        "opus",
        "-ar",
        "48000",
        "-ac",
        "2",
        "-b:a",
        "128k",
        "pipe:1",
      ])

      ffmpeg.stderr.on("data", (data) => {
        const message = data.toString()
        if (message.includes("error") || message.includes("Error")) {
          console.error("[v0] ffmpeg error:", message)
        }
      })

      ffmpeg.on("error", (error) => {
        console.error("[v0] ffmpeg spawn error:", error)
        this.playNext()
      })

      this.currentResource = createAudioResource(ffmpeg.stdout, {
        inputType: StreamType.Opus,
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

      let streamUrl = await pipedService.getStreamUrl(track.id)

      if (!streamUrl) {
        console.log("[v0] Piped failed for seeking, falling back to yt-dlp")
        streamUrl = await this.getStreamUrlWithYtDlp(track.url)

        if (!streamUrl) {
          console.error("[v0] Failed to get stream URL for seeking")
          return
        }
      }

      const ffmpeg = spawn("ffmpeg", [
        "-reconnect",
        "1",
        "-reconnect_streamed",
        "1",
        "-reconnect_delay_max",
        "5",
        "-ss",
        seconds.toString(),
        "-i",
        streamUrl,
        "-f",
        "opus",
        "-ar",
        "48000",
        "-ac",
        "2",
        "-b:a",
        "128k",
        "pipe:1",
      ])

      ffmpeg.stderr.on("data", (data) => {
        const message = data.toString()
        if (message.includes("error") || message.includes("Error")) {
          console.error("[v0] ffmpeg error:", message)
        }
      })

      this.currentResource = createAudioResource(ffmpeg.stdout, {
        inputType: StreamType.Opus,
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

  private async getStreamUrlWithYtDlp(videoUrl: string): Promise<string | null> {
    return new Promise((resolve) => {
      console.log("[v0] Using yt-dlp to get stream URL")

      const ytdlp = spawn("yt-dlp", [
        "--format",
        "bestaudio[ext=webm]/bestaudio[ext=m4a]/bestaudio/best",
        "--get-url",
        "--no-warnings",
        "--no-check-certificate",
        "--geo-bypass",
        "--extractor-args",
        "youtube:player_client=android,web,tv_embedded",
        "--user-agent",
        "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36",
        videoUrl,
      ])

      let output = ""
      let errorOutput = ""

      ytdlp.stdout.on("data", (data) => {
        output += data.toString()
      })

      ytdlp.stderr.on("data", (data) => {
        errorOutput += data.toString()
      })

      ytdlp.on("close", (code) => {
        if (code === 0 && output.trim()) {
          const url = output.trim().split("\n")[0]
          console.log("[v0] yt-dlp got stream URL successfully")
          resolve(url)
        } else {
          console.error("[v0] yt-dlp failed:", errorOutput)
          resolve(null)
        }
      })

      ytdlp.on("error", (error) => {
        console.error("[v0] yt-dlp spawn error:", error)
        resolve(null)
      })
    })
  }
}
