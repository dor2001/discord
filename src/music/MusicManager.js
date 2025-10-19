import { joinVoiceChannel, createAudioPlayer, NoSubscriberBehavior, createAudioResource, AudioPlayerStatus, getVoiceConnection, entersState, VoiceConnectionStatus } from "@discordjs/voice";
import { EventEmitter } from "node:events";
import { spawn } from "node:child_process";
import yts from "yt-search";

function ytDlpBestAudio(url, at) {
  // returns ffmpeg args array that reads from yt-dlp and seeks to 'at' seconds if provided
  const input = url;
  const ffArgs = [];
  if (typeof at === 'number' && at > 0) {
    ffArgs.push("-ss", String(at));
  }
  // read from yt-dlp
  // Use yt-dlp to get direct URL and pipe to ffmpeg via -i pipe:0
  // Simpler: let yt-dlp output raw audio stream: -o - | ffmpeg -i pipe:0
  // But yt-dlp can't output raw audio. We'll grab URL then let ffmpeg read it directly.
  // For simplicity we let ffmpeg read input URL directly.
  ffArgs.push("-re", "-i", input, "-analyzeduration", "0", "-loglevel", "quiet",
              "-f", "s16le", "-ar", "48000", "-ac", "2", "pipe:1");
  return ffArgs;
}

async function resolveQuery(query) {
  // if URL, return as is; else search on YouTube
  try {
    const u = new URL(query);
    return { title: "URL", url: u.toString() };
  } catch {}
  const r = await yts(query);
  const v = r.videos?.[0];
  if (!v) throw new Error("לא נמצאה תוצאה");
  return { title: v.title, url: v.url, duration: v.duration.seconds, author: v.author?.name, thumbnail: v.thumbnail };
}

export class MusicManager extends EventEmitter {
  constructor(client) {
    super();
    this.client = client;
    this.players = new Map(); // guildId -> {player, queue, current, startTs, pausedAt, textChannelId, voiceChannelId, volume}
  }

  getState(guildId) {
    const s = this.players.get(guildId);
    if (!s) return { queue: [], status: "idle" };
    const position = this._position(guildId);
    return {
      status: s.player.state.status,
      queue: s.queue,
      current: s.current,
      position,
      volume: s.volume ?? 1
    };
  }

  async join(guild, voiceChannelId) {
    const channel = await guild.channels.fetch(voiceChannelId);
    if (!channel) throw new Error("Voice channel not found");
    const connection = joinVoiceChannel({
      channelId: channel.id,
      guildId: guild.id,
      adapterCreator: guild.voiceAdapterCreator,
      selfDeaf: true
    });
    await entersState(connection, VoiceConnectionStatus.Ready, 20_000);
    return connection;
  }

  async play(guildId, voiceChannelId, query, opts = {}) {
    const guild = await this.client.guilds.fetch(guildId);
    let state = this.players.get(guildId);
    if (!state) {
      state = {
        player: createAudioPlayer({ behaviors: { noSubscriber: NoSubscriberBehavior.Play } }),
        queue: [],
        current: null,
        startTs: 0,
        pausedAt: 0,
        voiceChannelId,
        volume: 1
      };
      state.player.on(AudioPlayerStatus.Idle, () => {
        state.current = null;
        state.startTs = 0;
        this._next(guildId);
        this.emit("update", guildId);
      });
      state.player.on("error", (e)=>{
        console.error("[player]", e);
        this._next(guildId);
        this.emit("update", guildId);
      });
      this.players.set(guildId, state);
    }
    if (voiceChannelId) state.voiceChannelId = voiceChannelId;

    const item = await resolveQuery(query);
    state.queue.push(item);
    if (!state.current) {
      await this._consumeNext(guild, state, opts.at || 0);
    }
    this.emit("update", guildId);
    return this.getState(guildId);
  }

  async _consumeNext(guild, state, at=0){
    const next = state.queue.shift();
    if (!next) return;
    // connect
    const conn = getVoiceConnection(guild.id) || await this.join(guild, state.voiceChannelId);
    const ffArgs = ytDlpBestAudio(next.url, at);
    const ff = spawn("ffmpeg", ffArgs, { stdio: ["ignore", "pipe", "ignore"] });
    const resource = createAudioResource(ff.stdout, { inlineVolume: true });
    resource.volume.setVolume(Math.max(0, Math.min(2, state.volume||1)));
    conn.subscribe(state.player);
    state.player.play(resource);
    state.current = { ...next, startedAt: Date.now(), seeked: at };
    state.startTs = Date.now() - (at*1000);
  }

  _next(guildId){
    const state = this.players.get(guildId);
    if (!state) return;
    if (state.queue.length) {
      this.client.guilds.fetch(guildId).then(g=>this._consumeNext(g, state, 0)).catch(console.error);
    }
  }

  pause(guildId){
    const s = this.players.get(guildId);
    if (!s) return;
    s.player.pause();
    s.pausedAt = this._position(guildId);
    this.emit("update", guildId);
  }
  resume(guildId){
    const s = this.players.get(guildId);
    if (!s) return;
    s.player.unpause();
    s.startTs = Date.now() - (s.pausedAt*1000);
    this.emit("update", guildId);
  }
  stop(guildId){
    const s = this.players.get(guildId);
    if (!s) return;
    s.queue = [];
    s.player.stop();
    this.emit("update", guildId);
  }
  skip(guildId){
    const s = this.players.get(guildId);
    if (!s) return;
    s.player.stop(true);
    this.emit("update", guildId);
  }
  back(guildId){
    const s = this.players.get(guildId);
    if (!s || !s.current) return;
    // restart current from beginning
    this.seek(guildId, 0);
  }
  seek(guildId, seconds){
    const s = this.players.get(guildId);
    if (!s || !s.current) return;
    // restart ffmpeg with -ss
    this.client.guilds.fetch(guildId).then(async (g)=>{
      // prepend current track back to queue and play from seconds
      s.queue.unshift({ ...s.current });
      s.player.stop(true);
      await this._consumeNext(g, s, Math.max(0, Math.floor(seconds)));
      this.emit("update", guildId);
    }).catch(console.error);
  }
  setVolume(guildId, vol){
    const s = this.players.get(guildId);
    if (!s) return;
    s.volume = vol;
    const res = s.player.state.resource;
    if (res?.volume) res.volume.setVolume(Math.max(0, Math.min(2, vol)));
    this.emit("update", guildId);
  }
  _position(guildId){
    const s = this.players.get(guildId);
    if (!s || !s.current) return 0;
    if (s.player.state.status === AudioPlayerStatus.Paused) return s.pausedAt||0;
    return Math.max(0, Math.floor((Date.now() - (s.startTs||Date.now()))/1000));
  }
}
