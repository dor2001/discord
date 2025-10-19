// src/music/player.js
const { EventEmitter } = require('events');
const {
  joinVoiceChannel, createAudioPlayer, createAudioResource,
  NoSubscriberBehavior, AudioPlayerStatus, StreamType
} = require('@discordjs/voice');
const { spawn, spawnSync } = require('node:child_process');
const playdl = require('play-dl');
// const ytdl = require('ytdl-core'); // ← נשאיר כבוי כדי לא להיתקע על 410

function hasCmd(cmd, args=['--version']) {
  try { return spawnSync(cmd, args, {encoding:'utf8'}).status === 0; } catch { return false; }
}
function ytDlpCmd() {
  if (hasCmd('yt-dlp')) return 'yt-dlp';
  if (hasCmd('yt-dlp.exe')) return 'yt-dlp.exe';
  return null;
}
function uid(){ return Date.now().toString(36)+Math.random().toString(36).slice(2,8); }
function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }

class GuildPlayer extends EventEmitter {
  constructor(client, guildId, textChannel=null){
    super();
    this.client = client;
    this.guildId = guildId;
    this.textChannel = textChannel;
    this.queue = [];
    this.current = null;
    this.volume = 1.0;
    this.repeat = 'off';
    this.children = [];
    this.allowYtdlCoreFallback = false; // ← חשוב: לא ליפול ל-ytdl-core

    this.player = createAudioPlayer({ behaviors: { noSubscriber: NoSubscriberBehavior.Pause } });
    this.player.on(AudioPlayerStatus.Idle, async () => {
      const finished = this.current;
      this.current = null;
      if (this.repeat === 'one' && finished) this.queue.unshift(finished);
      else if (this.repeat === 'all' && finished) this.queue.push(finished);
      await this.playNext();
    });
    this.player.on('error', (e) => {
      console.error('Audio player error:', e);
      this.current = null;
      this.playNext();
    });
  }

  setTextChannel(ch){ this.textChannel = ch; }

  join(voiceChannelId){
    const ch = this.client.channels.cache.get(voiceChannelId);
    if (!ch) throw new Error('Voice channel not found');
    this.connection = joinVoiceChannel({
      channelId: ch.id, guildId: this.guildId,
      adapterCreator: ch.guild.voiceAdapterCreator, selfDeaf: false
    });
    this.connection.subscribe(this.player);
    return this.connection;
  }

  async enqueue(track){
    const withId = { id: uid(), ...track };
    this.queue.push(withId);
    if (!this.current) await this.playNext();
    else this.textChannel?.send(`➕ הוסף לתור: **${withId.title}**`).catch(()=>{});
  }

  removeAt(i){ if (i<0 || i>=this.queue.length) return null; return this.queue.splice(i,1)[0]; }
  move(from,to){ if (from<0||from>=this.queue.length||to<0||to>=this.queue.length) return false; const [it]=this.queue.splice(from,1); this.queue.splice(to,0,it); return true; }
  reorderByIds(ids){ const map=new Map(this.queue.map(t=>[t.id,t])); const nq=[]; for(const id of ids) if(map.has(id)) nq.push(map.get(id)); for(const it of this.queue) if(!ids.includes(it.id)) nq.push(it); this.queue=nq; }
  shuffle(){ for(let i=this.queue.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [this.queue[i],this.queue[j]]=[this.queue[j],this.queue[i]]; } }
  _cleanup(){ for(const p of this.children){ try{p.kill('SIGKILL');}catch{} } this.children=[]; }

  _ytDlpStream(url){
    const cmd = ytDlpCmd();
    if (!cmd || !hasCmd('ffmpeg',['-version'])) return null;

    // דגלים חזקים נגד throttling/410/שגיאות מקטעים
    const args = [
      '--quiet','--no-warnings','--no-progress',
      '--no-playlist',
      '-f','251/bestaudio/best',               // העדפת opus webm
      '--retries','10','--fragment-retries','10','-R','10',
      '--buffer-size','16K',
      '-o','-',
      url
    ];

    // תמיכה בקוקיז (אופציונלי) — הגדר YT_COOKIES_PATH=/app/data/cookies.txt
    if (process.env.YT_COOKIES_PATH) {
      args.splice(args.length-1, 0, '--cookies', process.env.YT_COOKIES_PATH);
    }

    // מאפשר הרחבה דרך ENV (למשל להוסיף --geo-bypass)
    if (process.env.YTDLP_ARGS) {
      const extra = process.env.YTDLP_ARGS.split(' ').filter(Boolean);
      args.splice(args.length-1, 0, ...extra);
    }

    const ytdlp = spawn(cmd, args, { stdio: ['ignore','pipe','inherit'] });
    const ff = spawn('ffmpeg', [
      '-hide_banner','-loglevel','error',
      '-i','pipe:0','-f','s16le','-ar','48000','-ac','2','pipe:1'
    ], { stdio: ['pipe','pipe','inherit'] });

    ytdlp.stdout.pipe(ff.stdin);
    this.children.push(ytdlp, ff);

    const onErr = (e)=>{ if (e && e.code!=='EPIPE') console.warn('pipe error', e); };
    ytdlp.on('error', onErr);
    ff.on('error', onErr);

    return { stream: ff.stdout, type: StreamType.Raw };
  }

  async playNext(){
    if (this.queue.length===0){
      this._cleanup();
      this.textChannel?.send('🎵 התור הסתיים.').catch(()=>{});
      return;
    }
    const track = this.queue.shift();
    this.current = track;
    console.log('PLAYER playNext picked track:', track);

    if (!track?.url || !/^https?:\/\//i.test(track.url)) {
      console.error('PLAYER invalid track.url, skipping.');
      this.current = null;
      return this.playNext();
    }

    this._cleanup();

    try {
      // שכבה 1: yt-dlp + ffmpeg (מועדף)
      let res = this._ytDlpStream(track.url);

      // שכבה 2: play-dl (רק אם yt-dlp לא זמין בקונטיינר)
      if (!res) {
        try {
          const info = await playdl.video_info(track.url);
          const pstream = await playdl.stream_from_info(info, { discordPlayerCompatibility: true });
          res = { stream: pstream.stream, type: pstream.type };
        } catch(e){
          console.warn('play-dl failed:', e?.message);
        }
      }

      // שכבה 3 (מכובה): ytdl-core גורם 410 לעיתים. לא מפעילים כברירת מחדל.
      // if (!res && this.allowYtdlCoreFallback) {
      //   const ystream = ytdl(track.url, { filter:'audioonly', quality:'highestaudio', highWaterMark: 1<<25 });
      //   res = { stream: ystream, type: StreamType.Arbitrary };
      // }

      if (!res) throw new Error('No stream source available');

      const resource = createAudioResource(res.stream, { inputType: res.type, inlineVolume: true });
      if (resource.volume) resource.volume.setVolume(this.volume);
      this.player.play(resource);

      this.textChannel?.send(`▶️ מנגן: **${track.title}**`).catch(()=>{});
    } catch (e) {
      // אם הייתה שגיאה 410 מתוך שכבה תחתונה, נתקדם לשיר הבא במקום לקרוס
      console.error('Playback error (skipping):', e?.message || e);
      this.current = null;
      await sleep(200);
      this.playNext();
    }
  }

  pause(){ this.player.pause(true); }
  resume(){ this.player.unpause(); }
  skip(){ this.player.stop(true); }
  stop(){ this.queue=[]; this.player.stop(true); this._cleanup(); }
  setVolume(v){ this.volume = Math.max(0, Math.min(2, v)); const r=this.player.state?.resource; if (r?.volume) r.volume.setVolume(this.volume); }
  setRepeat(m){ this.repeat = m; }
  getState(){ return { current:this.current, queue:this.queue, volume:this.volume, status:this.player.state.status, repeat:this.repeat }; }
}

module.exports = { GuildPlayer };
