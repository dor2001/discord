// src/music/player.js
const { createAudioPlayer, createAudioResource, entersState, AudioPlayerStatus, joinVoiceChannel, VoiceConnectionStatus } = require("@discordjs/voice");
const playdl = require("play-dl");
const ytdl = require("ytdl-core");
const { spawn } = require("child_process");

class GuildPlayer {
  constructor(guild, io) {
    this.guild = guild;
    this.io = io;
    this.queue = [];
    this.isPlaying = false;
    this.current = null;
    this.connection = null;
    this.player = createAudioPlayer();
  }

  // יצירת חיבור לדיסקורד
  connect(voiceChannel) {
    if (!voiceChannel) throw new Error("No voice channel provided");

    this.connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: this.guild.id,
      adapterCreator: this.guild.voiceAdapterCreator,
      selfDeaf: true,
    });

    this.connection.on("error", (err) => console.error("[VOICE ERROR]", err));

    this.connection.on(VoiceConnectionStatus.Disconnected, async () => {
      console.warn(`[${this.guild.name}] Voice disconnected`);
      this.cleanup();
    });

    this.connection.subscribe(this.player);
  }

  enqueue(track) {
    this.queue.push(track);
    this.io.emit("queueUpdate", { guildId: this.guild.id, queue: this.queue });
    if (!this.isPlaying) this.playNext();
  }

  async playNext() {
    if (this.queue.length === 0) {
      this.isPlaying = false;
      this.io.emit("nowPlaying", { guildId: this.guild.id, track: null });
      return;
    }

    const track = this.queue.shift();
    this.current = track;
    this.isPlaying = true;
    this.io.emit("nowPlaying", { guildId: this.guild.id, track });

    console.log("PLAYER playNext picked track:", track);

    let stream = null;

    try {
      // ניסיון ראשון – play-dl
      const info = await playdl.video_info(track.url);
      const source = await playdl.stream_from_info(info);
      stream = source.stream;
      console.log("PLAYER using play-dl stream");
    } catch (e1) {
      console.warn("play-dl failed:", e1.message);

      try {
        // ניסיון שני – ytdl-core
        stream = ytdl(track.url, {
          filter: "audioonly",
          quality: "highestaudio",
          highWaterMark: 1 << 25,
        });
        console.log("PLAYER using ytdl-core fallback");
      } catch (e2) {
        console.warn("ytdl-core failed:", e2.message);

        try {
          // ניסיון שלישי – yt-dlp דרך piped.video
          const pipedUrl = track.url.replace("youtube.com", "piped.video");
          console.log("PLAYER using yt-dlp + piped.video fallback");
          stream = spawn("yt-dlp", [
            "-f",
            "bestaudio",
            "-o",
            "-",
            pipedUrl
          ]).stdout;
        } catch (e3) {
          console.error("yt-dlp fallback failed:", e3.message);
          this.playNext();
          return;
        }
      }
    }

    if (!stream) {
      console.error("No stream available for track:", track.title);
      this.playNext();
      return;
    }

    try {
      const resource = createAudioResource(stream, { inlineVolume: true });
      resource.volume.setVolume(0.1);
      this.player.play(resource);

      this.player.once(AudioPlayerStatus.Idle, () => {
        this.playNext();
      });

      this.player.on("error", (err) => {
        console.error("Audio player error:", err);
        this.playNext();
      });
    } catch (err) {
      console.error("Failed to create audio resource:", err);
      this.playNext();
    }
  }

  skip() {
    this.player.stop();
  }

  stop() {
    this.queue = [];
    this.player.stop();
    this.isPlaying = false;
    this.io.emit("queueUpdate", { guildId: this.guild.id, queue: [] });
  }

  cleanup() {
    try {
      if (this.connection) this.connection.destroy();
    } catch {}
    this.connection = null;
    this.isPlaying = false;
    this.current = null;
    this.queue = [];
  }
}

module.exports = { GuildPlayer };
