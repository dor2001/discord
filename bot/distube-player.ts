import { DisTube } from "distube"
import { YouTubePlugin } from "@distube/youtube"
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

    const YOUTUBE_COOKIES = `.youtube.com	TRUE	/	TRUE	1764100541	LOGIN_INFO	AFmmF2swRgIhAN0wjmMu1xkNsSkiaXvD2mqsxxYhVp3R-eTg2ehXdc-MAiEA38iKbHZSCvN3ueWVxP0k5aTDqvIf2IrfIpzqM2X7UsI:QUQ3MjNmek9tQ21kTkM4TlVuamtYYmlicmx4eEtrSHBGd3dPVzl6WUZDazJTRHVrb3l5RGZuU0J5V2pxUV9BcGViQUI0U0hnakduSzlzRGlwRkdwZkRuMmpCdGNSc08tUnBKaXh2bUhqNGh0ODVmdVVNRDFBS1F5c3A5MGUyeG1nOTRxZFNZa0F6VXhJdnNiamZnN1plZmZOdl9wNDQ1ZHF3
.youtube.com	TRUE	/	TRUE	1776593677	PREF	f6=40000000&tz=Asia.Jerusalem&f5=30000&f7=100
.youtube.com	TRUE	/	FALSE	1774642181	HSID	An-vh9cAzBMN785pF
.youtube.com	TRUE	/	TRUE	1774642181	SSID	AiWiNF-yo4EOdNsUF
.youtube.com	TRUE	/	FALSE	1774642181	APISID	t9frdTFes2rJFUU8/AgLhLIXkLgo4BqcP-
.youtube.com	TRUE	/	TRUE	1774642181	SAPISID	CAe-1cCHK0OFgF7E/Aa5K1rHnpKsDjtFzs
.youtube.com	TRUE	/	TRUE	1774642181	__Secure-1PAPISID	CAe-1cCHK0OFgF7E/Aa5K1rHnpKsDjtFzs
.youtube.com	TRUE	/	TRUE	1774642181	__Secure-3PAPISID	CAe-1cCHK0OFgF7E/Aa5K1rHnpKsDjtFzs
.youtube.com	TRUE	/	FALSE	1774642181	SID	g.a0001wjfBqNsxu737G5PxctUsSaL-2CpYMlXwWodyV5V8HBNqKCCjmCNfZ7HyoNqT8NEPXzzogACgYKAXoSARISFQHGX2MiIwVZ_NJMkiQoZ-TNrPCDKRoVAUF8yKqFN8xtHggLi4XTpn3ThNBP0076
.youtube.com	TRUE	/	TRUE	1774642181	__Secure-1PSID	g.a0001wjfBqNsxu737G5PxctUsSaL-2CpYMlXwWodyV5V8HBNqKCCLFKD7upfmwiXU0k4LV7NwwACgYKAXASARISFQHGX2Mi93WgdpR9xXNI6TjVc89xcRoVAUF8yKpVhlZ8BjNlHDorrlwZzAdV0076
.youtube.com	TRUE	/	TRUE	1774642181	__Secure-3PSID	g.a0001wjfBqNsxu737G5PxctUsSaL-2CpYMlXwWodyV5V8HBNqKCCLFKD7upfmwiXU0k4LV7NwwACgYKAXASARISFQHGX2Mi93WgdpR9xXNI6TjVc89xcRoVAUF8yKpVhlZ8BjNlHDorrlwZzAdV0076
.youtube.com	TRUE	/	FALSE	1774642181	SIDCC	AKEyXzU708CKtVlOShaMhfCXraUAItuvafHOhzEQWX9uA-ygbJ1FErh-aN8Py4FlBPxtSmDrggdl
.youtube.com	TRUE	/	TRUE	1774642181	__Secure-1PSIDCC	AKEyXzV_iNAOvXcZfcx8bp17ntmA225LrDqtzXSjhmP3V-EboXWX88l9cEoc7HY-dF0EGF9O_cs
.youtube.com	TRUE	/	TRUE	1774642181	__Secure-3PSIDCC	AKEyXzV_iNAOvXcZfcx8bp17ntmA225LrDqtzXSjhmP3V-EboXWX88l9cEoc7HY-dF0EGF9O_cs
.youtube.com	TRUE	/	TRUE	1776593675	VISITOR_INFO1_LIVE	IDM1zNPx63M
.youtube.com	TRUE	/	TRUE	1776593675	VISITOR_PRIVACY_METADATA	CgJJTBIEGgAgLQ%3D%3D
.youtube.com	TRUE	/	TRUE	0	YSC	V42JXt0mBA0
.youtube.com	TRUE	/	TRUE	1776507396	__Secure-ROLLOUT_TOKEN	CJuJ9uWYj4yTZBDNgO28rq-KAxiPnomHxrKQAw%3D%3D`

    this.distube = new DisTube(client, {
      plugins: [
        new YouTubePlugin({
          cookies: YOUTUBE_COOKIES.split("\n")
            .filter((line) => line && !line.startsWith("#"))
            .map((line) => {
              const parts = line.split("\t")
              return {
                domain: parts[0],
                flag: parts[1] === "TRUE",
                path: parts[2],
                secure: parts[3] === "TRUE",
                expiration: Number.parseInt(parts[4]),
                name: parts[5],
                value: parts[6],
              }
            }),
        }),
      ],
    })

    console.log("[v0] DisTube initialized with hardcoded YouTube cookies")
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
