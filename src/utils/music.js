import {
  joinVoiceChannel,
  createAudioPlayer,
  NoSubscriberBehavior,
  createAudioResource,
  AudioPlayerStatus,
  entersState,
  VoiceConnectionStatus,
} from "@discordjs/voice";
import fetch from "node-fetch";
import { spawn } from "node:child_process";

const PIPED_URL = process.env.PIPED_URL || "https://piped.video";

export class GuildMusic {
  constructor(client, guild) {
    this.client = client;
    this.guild = guild;
    this.player = createAudioPlayer({ behavior: NoSubscriberBehavior.Pause });
    this.queue = []; // items: { videoId, title, url, duration, requestedBy }
    this.current = null; // current item
    this.connection = null;
    this.voiceChannelId = null;
    this.lockedChannelId = null;
    this.onNowPlaying = null;

    this.player.on(AudioPlayerStatus.Idle, () => {
      this.current = null;
      if (this.queue.length > 0) {
        this._playNext();
      }
    });

    this.player.on("error", (e) => console.error("Player error:", e.message));
  }

  async join(channelId) {
    const channel = await this.guild.channels.fetch(channelId);
    if (!channel || channel.type !== 2) throw new Error("Not a voice channel.");
    this.voiceChannelId = channel.id;
    this.connection = joinVoiceChannel({
      channelId: channel.id,
      guildId: this.guild.id,
      adapterCreator: this.guild.voiceAdapterCreator,
      selfDeaf: true,
    });
    await entersState(this.connection, VoiceConnectionStatus.Ready, 15_000);
    this.connection.subscribe(this.player);
    return true;
  }

  setLock(channelId) {
    this.lockedChannelId = channelId || null;
  }

  async move(channelId) {
    if (this.lockedChannelId && this.lockedChannelId !== channelId) {
      throw new Error("Bot is locked to a different channel.");
    }
    if (this.voiceChannelId === channelId && this.connection) return true;
    return this.join(channelId);
  }

  async addByVideoId(videoId, requestedBy) {
    // Get stream URL from Piped
    const info = await fetch(`${PIPED_URL}/api/v1/streams/${videoId}`).then(r=>r.json());
    const audio = (info.audioStreams || []).sort((a,b)=>b.bitrate - a.bitrate)[0];
    if (!audio) throw new Error("No audio stream found.");
    const title = info.title || videoId;
    const duration = Number(info.duration) || 0;
    this.queue.push({ videoId, title, url: audio.url, duration, requestedBy });
    if (!this.current) await this._playNext();
    return { title, duration };
  }

  async _playNext() {
    const next = this.queue.shift();
    if (!next) { this.current = null; return; }
    this.current = { ...next, position: 0 };
    const resource = await this._makeResource(next.url, 0);
    this.player.play(resource);
    if (this.onNowPlaying) this.onNowPlaying(this.current);
  }

  async _makeResource(streamUrl, seekSeconds) {
    // Use ffmpeg to handle remote URL and seeking
    const args = [
      "-ss", String(seekSeconds),
      "-i", streamUrl,
      "-analyzeduration", "0",
      "-loglevel", "error",
      "-f", "s16le",
      "-ar", "48000",
      "-ac", "2",
      "pipe:1"
    ];
    const ff = spawn("ffmpeg", args, { stdio: ["ignore", "pipe", "inherit"] });
    return createAudioResource(ff.stdout);
  }

  async seek(seconds) {
    if (!this.current) throw new Error("Nothing is playing.");
    const pos = Math.max(0, Math.min(seconds, this.current.duration || seconds));
    const resource = await this._makeResource(this.current.url, pos);
    this.current.position = pos;
    this.player.play(resource);
    if (this.onNowPlaying) this.onNowPlaying(this.current);
    return true;
  }

  pause() { this.player.pause(); }
  resume() { this.player.unpause(); }
  skip() { this.player.stop(true); }
  stop() {
    this.queue = [];
    this.player.stop(true);
  }

  getState() {
    return {
      voiceChannelId: this.voiceChannelId,
      lockedChannelId: this.lockedChannelId,
      queue: this.queue.map(i=>({ title: i.title, videoId: i.videoId, duration: i.duration })),
      current: this.current ? {
        title: this.current.title,
        videoId: this.current.videoId,
        duration: this.current.duration,
        position: this.current.position || 0
      } : null
    };
  }
}
