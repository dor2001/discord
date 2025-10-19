const { EventEmitter } = require('events');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, NoSubscriberBehavior, AudioPlayerStatus, StreamType } = require('@discordjs/voice');
const playdl = require('play-dl');
const ytdl = require('ytdl-core');
const { spawn, spawnSync } = require('node:child_process');

function hasCmd(cmd, args = ['--version']) { try { return spawnSync(cmd, args, { encoding: 'utf8' }).status === 0; } catch { return false; } }
function resolveYtDlpCmd() { if (hasCmd('yt-dlp', ['--version'])) return 'yt-dlp'; if (hasCmd('yt-dlp.exe', ['--version'])) return 'yt-dlp.exe'; return null; }
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }

class GuildPlayer extends EventEmitter {
  constructor(client, guildId, textChannel = null) {
    super();
    this.client = client; this.guildId = guildId; this.textChannel = textChannel;
    this.queue = []; this.current = null; this.volume = 1.0; this.repeat = 'off'; this.children = [];
    this.player = createAudioPlayer({ behaviors: { noSubscriber: NoSubscriberBehavior.Pause } });
    this.player.on(AudioPlayerStatus.Idle, async () => { const finished = this.current; this.current = null; if (this.repeat === 'one' && finished) this.queue.unshift(finished); else if (this.repeat === 'all' && finished) this.queue.push(finished); await this.playNext(); });
    this.player.on('error', (e) => { console.error('Audio player error:', e); this.current = null; this.playNext(); });
  }
  setTextChannel(channel) { this.textChannel = channel; }
  join(voiceChannelId) {
    const channel = this.client.channels.cache.get(voiceChannelId);
    if (!channel) throw new Error('Voice channel not found');
    this.connection = joinVoiceChannel({ channelId: channel.id, guildId: this.guildId, adapterCreator: channel.guild.voiceAdapterCreator, selfDeaf: false });
    this.connection.subscribe(this.player); return this.connection;
  }
  async enqueue(track) { const withId = { id: uid(), ...track }; this.queue.push(withId); if (!this.current) await this.playNext(); else if (this.textChannel) this.textChannel.send(`➕ הוסף לתור: **${withId.title}**`).catch(()=>{}); }
  removeAt(index) { if (index < 0 || index >= this.queue.length) return null; return this.queue.splice(index, 1)[0]; }
  move(from, to) { if (from < 0 || from >= this.queue.length || to < 0 || to >= this.queue.length) return false; const [item] = this.queue.splice(from, 1); this.queue.splice(to, 0, item); return true; }
  reorderByIds(newOrderIds) { const idToItem = new Map(this.queue.map(it => [it.id, it])); const newQueue = []; for (const id of newOrderIds) if (idToItem.has(id)) newQueue.push(idToItem.get(id)); for (const it of this.queue) if (!newOrderIds.includes(it.id)) newQueue.push(it); this.queue = newQueue; }
  shuffle(){ for (let i = this.queue.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [this.queue[i], this.queue[j]] = [this.queue[j], this.queue[i]]; } }
  _cleanupChildren(){ for(const p of this.children){ try{ p.kill('SIGKILL'); }catch{} } this.children = []; }
  async playNext() {
    if (this.queue.length === 0) { this._cleanupChildren(); if (this.textChannel) this.textChannel.send('🎵 התור הסתיים.').catch(()=>{}); return; }
    const track = this.queue.shift(); this.current = track; this.emit('started', { guildId: this.guildId, track }); console.log('PLAYER playNext picked track:', track);
    if (!track || typeof track.url !== 'string' || !/^https?:\/\//i.test(track.url)) { console.error('PLAYER invalid track.url, skipping.'); this.current = null; return this.playNext(); }
    this._cleanupChildren();
    const createYtDlp = () => { const cmd = resolveYtDlpCmd(); if (!cmd || !hasCmd('ffmpeg',['-version'])) return null;
      const ytdlp = spawn(cmd, ['--quiet','--no-warnings','--no-progress','-f','bestaudio/best','--no-playlist','-o','-', track.url], { stdio: ['ignore','pipe','inherit'] });
      const ff = spawn('ffmpeg', ['-hide_banner','-loglevel','error','-i','pipe:0','-f','s16le','-ar','48000','-ac','2','pipe:1'], { stdio: ['pipe','pipe','inherit'] });
      ytdlp.stdout.pipe(ff.stdin); this.children.push(ytdlp, ff); const onErr = (e)=>{ if (e && e.code!=='EPIPE') console.warn('pipe error', e); }; ytdlp.on('error', onErr); ff.on('error', onErr);
      return { stream: ff.stdout, type: StreamType.Raw };
    };
    try {
      let resource = null;
      const ytd = createYtDlp();
      if (ytd) {
        resource = createAudioResource(ytd.stream, { inputType: ytd.type, inlineVolume: true });
      } else {
        try { const info = await playdl.video_info(track.url); const pstream = await playdl.stream_from_info(info, { discordPlayerCompatibility: true });
          resource = createAudioResource(pstream.stream, { inputType: pstream.type, inlineVolume: true });
        } catch (e) {
          const ystream = ytdl(track.url, { filter: 'audioonly', quality: 'highestaudio', highWaterMark: 1 << 25 });
          resource = createAudioResource(ystream, { inputType: StreamType.Arbitrary, inlineVolume: true });
        }
      }
      if (!resource) throw new Error('Failed to create audio resource');
      if (resource.volume) resource.volume.setVolume(this.volume); this.player.play(resource);
      if (this.textChannel) this.textChannel.send(`▶️ מנגן: **${track.title}**`).catch(()=>{});
    } catch (e) { console.error('Playback error:', e); this.current = null; await sleep(250); this.playNext(); }
  }
  pause(){ this.player.pause(true); } resume(){ this.player.unpause(); } skip(){ this.player.stop(true); } stop(){ this.queue = []; this.player.stop(true); this._cleanupChildren(); }
  setVolume(v){ this.volume = Math.max(0, Math.min(2, v)); if (this.player.state?.resource?.volume) this.player.state.resource.volume.setVolume(this.volume); }
  setRepeat(mode){ this.repeat = mode; } getState(){ return { current: this.current, queue: this.queue, volume: this.volume, status: this.player.state.status, repeat: this.repeat }; }
}
module.exports = { GuildPlayer };
