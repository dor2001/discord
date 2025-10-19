
import { createAudioPlayer, createAudioResource, joinVoiceChannel, NoSubscriberBehavior, VoiceConnectionStatus, entersState, getVoiceConnection } from '@discordjs/voice';
import { spawn } from 'node:child_process';

const YTDLP = '/usr/local/bin/yt-dlp';
const FFMPEG = '/usr/local/bin/ffmpeg';

// Per guild playback state
export const state = new Map(); // gid -> { url, startedAt, conn, player, process: {ytdlp, ffmpeg}, lockedChannelId }

export async function moveToChannel(guild, channelId, lock=false){
  // destroy existing connection
  const existing = getVoiceConnection(guild.id);
  if (existing) existing.destroy();

  const conn = joinVoiceChannel({
    channelId,
    guildId: guild.id,
    adapterCreator: guild.voiceAdapterCreator,
    selfDeaf: true
  });
  await entersState(conn, VoiceConnectionStatus.Ready, 15_000);

  const s = state.get(guild.id) || {};
  s.conn = conn;
  if (lock) s.lockedChannelId = channelId;
  state.set(guild.id, s);
  return s;
}

export function unlockGuild(gid){
  const s = state.get(gid);
  if (s) delete s.lockedChannelId;
}

export function ensureLockOrThrow(gid, targetChannelId){
  const s = state.get(gid);
  if (s && s.lockedChannelId && s.lockedChannelId !== targetChannelId){
    throw new Error(`הבוט נעול לערוץ ${s.lockedChannelId}`);
  }
}

export function stop(gid){
  const s = state.get(gid);
  if (!s) return;
  try { s.player?.stop(true); } catch {}
  try { s.process?.ytdlp?.kill('SIGKILL'); } catch {}
  try { s.process?.ffmpeg?.kill('SIGKILL'); } catch {}
  // don't destroy connection so we can keep lock
  s.process = null;
  s.url = null;
}

function spawnPipeline(url, seekSeconds=0){
  // When seeking, place -ss before -i for fast start
  const ytdlp = spawn(YTDLP, ['-o','-','-f','bestaudio/best','--no-playlist', url], { stdio: ['ignore','pipe','inherit'] });
  const ffArgs = [];
  if (seekSeconds && Number(seekSeconds) > 0){
    ffArgs.push('-ss', String(Math.max(0, Math.floor(seekSeconds))));
  }
  ffArgs.push('-i','pipe:0','-f','opus','-acodec','libopus','-ar','48000','-ac','2','-b:a','192k','-vn','pipe:1');
  const ffmpeg = spawn(FFMPEG, ffArgs, { stdio: ['pipe','pipe','inherit'] });
  ytdlp.stdout.pipe(ffmpeg.stdin);
  return { ytdlp, ffmpeg };
}

export async function play(guild, channelId, url, seekSeconds=0){
  ensureLockOrThrow(guild.id, channelId);

  // (re)connect if necessary
  let s = state.get(guild.id);
  if (!s || !s.conn) {
    await moveToChannel(guild, channelId, false);
    s = state.get(guild.id);
  }

  // stop any existing pipeline
  stop(guild.id);

  const { ytdlp, ffmpeg } = spawnPipeline(url, seekSeconds);

  const player = createAudioPlayer({ behaviors: { noSubscriber: NoSubscriberBehavior.Pause }});
  const resource = createAudioResource(ffmpeg.stdout);
  player.play(resource);
  s.conn.subscribe(player);

  s.player = player;
  s.process = { ytdlp, ffmpeg };
  s.url = url;
  s.startedAt = Date.now() - (seekSeconds||0)*1000;
  state.set(guild.id, s);

  return { ok: true };
}

export async function seek(guild, seconds){
  const s = state.get(guild.id);
  if (!s || !s.url) throw new Error('אין רצועה פעילה לביצוע Seek');
  // restart pipeline with -ss
  const lockedOrCurrentChannel = s.lockedChannelId || s.conn?.joinConfig?.channelId;
  if (!lockedOrCurrentChannel) throw new Error('אין חיבור קולי פעיל');

  return await play(guild, lockedOrCurrentChannel, s.url, seconds);
}
