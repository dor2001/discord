import {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  entersState,
  NoSubscriberBehavior,
  StreamType
} from '@discordjs/voice';
import { spawn } from 'node:child_process';
import { spawnYtDlpStream } from '../services/ytSearch.js';

function spawnFfmpeg(inputReadable, seekSeconds = 0) {
  const args = [
    '-hide_banner','-loglevel','error',
    ...(seekSeconds > 0 ? ['-ss', String(seekSeconds)] : []),
    '-i','pipe:0',
    '-vn','-ac','2','-ar','48000',
    '-f','opus','-compression_level','10',
    'pipe:1'
  ];
  const ff = spawn('ffmpeg', args, { stdio: ['pipe', 'pipe', 'pipe'] });
  inputReadable.pipe(ff.stdin);
  return ff;
}

class GuildPlayer {
  constructor(guildId) {
    this.guildId = guildId;
    this.connection = null;
    this.player = createAudioPlayer({
      behaviors: { noSubscriber: NoSubscriberBehavior.Pause }
    });
    this.current = null;
    this.lockChannelId = null;
  }

  async connect(channel) {
    if (this.lockChannelId && channel.id !== this.lockChannelId) {
      throw new Error('Bot is locked to a specific voice channel.');
    }
    const conn = joinVoiceChannel({
      channelId: channel.id,
      guildId: channel.guild.id,
      adapterCreator: channel.guild.voiceAdapterCreator,
      selfDeaf: true
    });
    this.connection = conn;
    await entersState(conn, VoiceConnectionStatus.Ready, 15000);
    conn.subscribe(this.player);
  }

  lockTo(channelId) { this.lockChannelId = channelId; }
  unlock() { this.lockChannelId = null; }

  async play(url, opts = {}) {
    const { seek = 0 } = opts;
    if (!this.connection) throw new Error('Not connected to voice channel.');
    const dl = spawnYtDlpStream(url);
    const ff = spawnFfmpeg(dl.stdout, seek);
    const resource = createAudioResource(ff.stdout, {
      inputType: StreamType.WebmOpus,
      inlineVolume: true
    });
    this.player.play(resource);
    this.current = { url, startedAt: Date.now(), seekStartedAt: seek || 0 };
  }

  async seek(seconds) {
    if (!this.current) throw new Error('Nothing is playing.');
    return this.play(this.current.url, { seek: Math.max(0, seconds|0) });
  }

  stop() { this.player.stop(true); this.current = null; }
}

export class PlayerManager {
  constructor() { this.map = new Map(); }
  get(guildId) {
    if (!this.map.has(guildId)) this.map.set(guildId, new GuildPlayer(guildId));
    return this.map.get(guildId);
  }
}

export const playerManager = new PlayerManager();
