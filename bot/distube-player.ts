import { DisTube } from "distube"
import type { Client, VoiceBasedChannel } from "discord.js"
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

export class DistubePlayer {
  private distube: DisTube
  private guildId: string
  private playbackSpeed = 1.0

  constructor(client: Client, guildId: string) {
    this.guildId = guildId

    this.distube = new DisTube(client, {})

    this.setupEventHandlers()
  }

  private setupEventHandlers() {
    ;(this.distube as any).on("playSong", (queue: any, song: any) => {
      console.log("[v0] DisTube playing:", song.name)
      botEventEmitter.emitPlayerUpdate({
        guildId: this.guildId,
        type: "track_start",
        data: { track: this.convertSongToTrack(song) },
      })
    })
    ;(this.distube as any).on("addSong", (queue: any, song: any) => {
      console.log("[v0] DisTube added song:", song.name)
      botEventEmitter.emitPlayerUpdate({
        guildId: this.guildId,
        type: "queue_update",
        data: { queue: this.getQueue() },
      })
    })
    ;(this.distube as any).on("finish", (queue: any) => {
      console.log("[v0] DisTube queue finished")
      botEventEmitter.emitPlayerUpdate({
        guildId: this.guildId,
        type: "track_end",
        data: { track: null },
      })
    })
    ;(this.distube as any).on("error", (error: Error, queue: any) => {
      console.error("[v0] DisTube error:", error)
    })
  }

  private convertSongToTrack(song: any): Track {
    return {
      id: song.id || song.url,
      title: song.name || "Unknown",
      author: song.uploader?.name || "Unknown",
      duration: song.duration || 0,
      thumbnail: song.thumbnail || "",
      url: song.url || "",
    }
  }

  public async play(voiceChannel: VoiceBasedChannel, query: string) {
    try {
      console.log("[v0] DisTube playing:", query)
      await this.distube.play(voiceChannel, query, {
        textChannel: null,
        member: voiceChannel.guild.members.me!,
      })
    } catch (error) {
      console.error("[v0] DisTube play error:", error)
      throw error
    }
  }

  public pause() {
    const queue = this.distube.getQueue(this.guildId)
    if (queue) {
      this.distube.pause(this.guildId)
      this.emitStateUpdate()
    }
  }

  public resume() {
    const queue = this.distube.getQueue(this.guildId)
    if (queue) {
      this.distube.resume(this.guildId)
      this.emitStateUpdate()
    }
  }

  public stop() {
    const queue = this.distube.getQueue(this.guildId)
    if (queue) {
      this.distube.stop(this.guildId)
      this.emitStateUpdate()
    }
  }

  public skip() {
    const queue = this.distube.getQueue(this.guildId)
    if (queue) {
      this.distube.skip(this.guildId)
    }
  }

  public setVolume(volume: number) {
    const queue = this.distube.getQueue(this.guildId)
    if (queue) {
      this.distube.setVolume(this.guildId, Math.max(0, Math.min(100, volume)))
      this.emitStateUpdate()
    }
  }

  public setLoopMode(mode: LoopMode) {
    const queue = this.distube.getQueue(this.guildId)
    if (queue) {
      const repeatMode = mode === "off" ? 0 : mode === "track" ? 1 : 2
      this.distube.setRepeatMode(this.guildId, repeatMode)
      this.emitStateUpdate()
    }
  }

  public setShuffle(enabled: boolean) {
    const queue = this.distube.getQueue(this.guildId)
    if (queue && enabled) {
      queue.shuffle()
      this.emitStateUpdate()
    }
  }

  public setPlaybackSpeed(speed: number) {
    const queue = this.distube.getQueue(this.guildId)
    if (queue) {
      this.playbackSpeed = Math.max(0.5, Math.min(2.0, speed))
      ;(queue as any).filters.add(`atempo=${this.playbackSpeed}`)
      this.emitStateUpdate()
    }
  }

  public getPlaybackSpeed(): number {
    return this.playbackSpeed
  }

  public async seek(seconds: number) {
    const queue = this.distube.getQueue(this.guildId)
    if (queue) {
      await this.distube.seek(this.guildId, seconds)
      this.emitStateUpdate()
    }
  }

  public getCurrentPosition(): number {
    const queue = this.distube.getQueue(this.guildId)
    return queue ? queue.currentTime : 0
  }

  public reorderQueue(fromIndex: number, toIndex: number) {
    const queue = this.distube.getQueue(this.guildId)
    if (queue && queue.songs.length > fromIndex && queue.songs.length > toIndex) {
      const [song] = queue.songs.splice(fromIndex + 1, 1)
      queue.songs.splice(toIndex + 1, 0, song)
      this.emitStateUpdate()
    }
  }

  public removeFromQueue(index: number) {
    const queue = this.distube.getQueue(this.guildId)
    if (queue && queue.songs.length > index) {
      queue.songs.splice(index + 1, 1)
      this.emitStateUpdate()
    }
  }

  public getQueue(): QueueItem[] {
    const queue = this.distube.getQueue(this.guildId)
    if (!queue) return []

    return queue.songs.slice(1).map((song) => ({
      track: this.convertSongToTrack(song),
      addedAt: new Date(),
    }))
  }

  public getCurrentTrack(): QueueItem | null {
    const queue = this.distube.getQueue(this.guildId)
    if (!queue || !queue.songs[0]) return null

    return {
      track: this.convertSongToTrack(queue.songs[0]),
      addedAt: new Date(),
    }
  }

  public getStatus() {
    const queue = this.distube.getQueue(this.guildId)

    if (!queue) {
      return {
        isPlaying: false,
        isPaused: false,
        currentTrack: null,
        currentPosition: 0,
        queue: [],
        loopMode: "off" as LoopMode,
        shuffleEnabled: false,
        volume: 100,
        playbackSpeed: this.playbackSpeed,
      }
    }

    const loopMode: LoopMode = queue.repeatMode === 0 ? "off" : queue.repeatMode === 1 ? "track" : "queue"

    return {
      isPlaying: queue.playing,
      isPaused: queue.paused,
      currentTrack: this.getCurrentTrack(),
      currentPosition: queue.currentTime,
      queue: this.getQueue(),
      loopMode,
      shuffleEnabled: false,
      volume: queue.volume,
      playbackSpeed: this.playbackSpeed,
    }
  }

  public isPlaying(): boolean {
    const queue = this.distube.getQueue(this.guildId)
    return queue ? queue.playing : false
  }

  private emitStateUpdate() {
    botEventEmitter.emitPlayerUpdate({
      guildId: this.guildId,
      type: "player_state",
      data: this.getStatus(),
    })
  }

  public destroy() {
    const queue = this.distube.getQueue(this.guildId)
    if (queue) {
      this.distube.stop(this.guildId)
    }
  }
}
