import { joinVoiceChannel, createAudioPlayer, createAudioResource, NoSubscriberBehavior, 
  AudioPlayerStatus, entersState, StreamType, VoiceConnectionStatus, getVoiceConnection } from '@discordjs/voice';
import play from 'play-dl';
import { ChannelType, PermissionFlagsBits } from 'discord.js';

function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }

export class MusicManager {
  constructor(client){
    this.client = client;
    /** @type {Map<string, GuildPlayer>} */
    this.players = new Map();
  }

  getOrCreate(guildId){
    let gp = this.players.get(guildId);
    if (!gp){
      gp = new GuildPlayer(this.client, guildId);
      this.players.set(guildId, gp);
    }
    return gp;
  }

  destroy(guildId){
    const gp = this.players.get(guildId);
    if (gp){ gp.destroy(); this.players.delete(guildId); }
  }

  // Web helpers
  listGuilds(){
    return this.client.guilds.cache.map(g => ({
      id: g.id,
      name: g.name,
      icon: g.iconURL({ size: 64 })
    }));
  }

  listChannels(guildId){
    const g = this.client.guilds.cache.get(guildId);
    if (!g) return { voice: [], text: [] };
    const voice = [];
    const text = [];
    g.channels.cache.forEach(ch => {
      if (ch.type === ChannelType.GuildVoice) {
        voice.push({ id: ch.id, name: ch.name });
      } else if (ch.type === ChannelType.GuildText) {
        text.push({ id: ch.id, name: ch.name });
      }
    });
    return { voice, text };
  }
}

class GuildPlayer {
  constructor(client, guildId){
    this.client = client;
    this.guildId = guildId;
    this.queue = [];
    this.current = null;
    this.position = 0; // seconds (tracked approx)
    this.volume = 0.8;
    this.connected = false;
    this.voiceChannelId = null;
    this.textChannelId = null;
    this.connection = null;
    this.player = createAudioPlayer({
      behaviors: { noSubscriber: NoSubscriberBehavior.Pause }
    });
    this.player.on('stateChange', (oldState, newState) => {
      if (newState.status === AudioPlayerStatus.Idle && oldState.status !== AudioPlayerStatus.Idle){
        // Track finished -> play next
        this.current = null;
        this.position = 0;
        this._playNext().catch(console.error);
      }
    });
    this.player.on('error', (e)=>{
      console.error(`[Guild ${this.guildId}] Player error`, e);
      this._playNext().catch(()=>{});
    });
  }

  destroy(){
    try {
      this.player.stop(true);
      if (this.connection){
        this.connection.destroy();
      }
    } catch(e){}
    this.queue = [];
    this.current = null;
    this.connected = false;
  }

  async join(voiceChannelId){
    const guild = this.client.guilds.cache.get(this.guildId);
    if (!guild) throw new Error('Guild not found');
    const ch = guild.channels.cache.get(voiceChannelId);
    if (!ch) throw new Error('Voice channel not found');
    this.voiceChannelId = voiceChannelId;

    const connection = joinVoiceChannel({
      channelId: ch.id,
      guildId: guild.id,
      adapterCreator: guild.voiceAdapterCreator,
      selfDeaf: true
    });
    this.connection = connection;
    this.connected = true;

    // await ready
    try{
      await entersState(connection, VoiceConnectionStatus.Ready, 20_000);
    } catch(e){
      console.error('Voice connection not ready', e);
      throw e;
    }

    // Subscribe once joined
    try{ connection.subscribe(this.player); } catch(e){}
    return true;
  }

  leave(){
    const vc = getVoiceConnection(this.guildId);
    if (vc) vc.destroy();
    this.connected = false;
    this.voiceChannelId = null;
  }

  setTextChannel(textChannelId){
    this.textChannelId = textChannelId;
  }

  async play(query, requestedBy = 'web'){
    // Accept URL or search
    let info = null;
    if (play.yt_validate(query) === 'video' || /^https?:\/\//i.test(query)){
      info = await this._resolveFromUrl(query);
    } else {
      const results = await play.search(query, { limit: 1 });
      if (!results || !results.length) throw new Error('לא נמצאה תוצאה לשאילתה');
      info = results[0];
    }
    this.queue.push({ query, info, requestedBy });
    if (!this.current){
      await this._playNext();
    }
    return this.getState();
  }

  async _resolveFromUrl(url){
    // For now rely on play-dl auto-detect
    const type = play.yt_validate(url);
    if (type === 'video'){
      const info = await play.video_info(url);
      return {
        title: info.video_details.title,
        url: info.video_details.url,
        durationInSec: Number(info.video_details.durationInSec || 0),
        thumbnails: info.video_details.thumbnails
      };
    }
    // Fallback: treat as generic
    return { title: url, url, durationInSec: 0, thumbnails: [] };
  }

  async _playNext(){
    if (!this.queue.length){
      this.current = null;
      this.player.stop(true);
      return;
    }
    const next = this.queue.shift();
    this.current = { ...next, startedAt: Date.now() };
    this.position = 0;
    const resource = await this._createResource(this.current.info.url || this.current.query, 0);
    this.player.play(resource);
  }

  async _createResource(inputUrl, seekSeconds = 0){
    let stream;
    try{
      // play.stream auto-detects sources (YouTube, SoundCloud, etc.); supports seek for YT.
      stream = await play.stream(inputUrl, { seek: seekSeconds > 0 ? seekSeconds : 0 });
    } catch(e){
      console.error('play.stream failed, retry once without seek', e);
      if (seekSeconds > 0){
        stream = await play.stream(inputUrl);
      } else {
        throw e;
      }
    }
    const resource = createAudioResource(stream.stream, {
      inputType: stream.type,
      inlineVolume: true
    });
    resource.volume?.setVolume(this.volume);
    return resource;
  }

  pause(){ this.player.pause(); return this.getState(); }
  resume(){ this.player.unpause(); return this.getState(); }
  stop(){ this.player.stop(true); this.current = null; this.position = 0; this.queue = []; return this.getState(); }
  skip(){ this.player.stop(true); return this.getState(); }

  async seekAbsolute(seconds){
    if (!this.current) return this.getState();
    seconds = Math.max(0, Math.floor(seconds));
    const total = this.getDuration();
    if (total > 0 && seconds >= total) return this.skip();
    const resource = await this._createResource(this.current.info.url || this.current.query, seconds);
    this.position = seconds;
    this.current.startedAt = Date.now() - seconds * 1000;
    this.player.play(resource);
    return this.getState();
  }

  async seekRelative(deltaSeconds){
    const pos = this.getPosition();
    return this.seekAbsolute(pos + deltaSeconds);
  }

  setVolume(vol){ 
    this.volume = Math.max(0, Math.min(1, Number(vol)));
    const res = this.player.state.resource;
    if (res && res.volume) res.volume.setVolume(this.volume);
    return this.getState();
  }

  getDuration(){
    return Number(this.current?.info?.durationInSec || 0);
  }

  getPosition(){
    if (!this.current) return 0;
    // Estimate via startedAt unless paused (then freeze position)
    const state = this.player.state.status;
    if (state === 'paused'){
      return this.position;
    }
    const elapsed = Math.floor((Date.now() - (this.current.startedAt || Date.now())) / 1000);
    this.position = elapsed;
    return this.position;
  }

  getState(){
    return {
      guildId: this.guildId,
      connected: this.connected,
      voiceChannelId: this.voiceChannelId,
      textChannelId: this.textChannelId,
      volume: this.volume,
      queue: this.queue.map((q, i) => ({
        index: i,
        title: q.info?.title || q.query,
        url: q.info?.url || q.query,
        durationInSec: q.info?.durationInSec || 0,
        requestedBy: q.requestedBy || 'unknown'
      })),
      nowPlaying: this.current ? {
        title: this.current.info?.title || this.current.query,
        url: this.current.info?.url || this.current.query,
        durationInSec: this.getDuration(),
        positionInSec: this.getPosition()
      } : null,
      playerStatus: this.player.state.status
    };
  }
}
