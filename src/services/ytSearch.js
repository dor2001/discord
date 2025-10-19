// ESM
import { spawn } from 'node:child_process';

const YTDLP_BIN = process.env.YTDLP_BIN || '/usr/local/bin/yt-dlp';

function runYtDlp(args) {
  return new Promise((resolve, reject) => {
    const proc = spawn(YTDLP_BIN, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '', err = '';
    proc.stdout.on('data', d => (out += d.toString()));
    proc.stderr.on('data', d => (err += d.toString()));
    proc.on('close', code => {
      if (code === 0) resolve(out);
      else reject(new Error(`yt-dlp failed (${code}): ${err || out}`));
    });
  });
}

export async function youtubeSearch(query, limit = 10) {
  if (!query || !query.trim()) return [];
  const searchSpec = `ytsearch${Math.min(limit, 25)}:${query}`; 
  const raw = await runYtDlp(['--dump-json', '--no-warnings', '--flat-playlist', searchSpec]);
  const lines = raw.trim().split(/\r?\n/);
  const items = [];
  for (const line of lines) {
    try {
      const j = JSON.parse(line);
      const id = j.id || j.url?.split('=')[1];
      if (!id) continue;
      items.push({
        id,
        url: `https://www.youtube.com/watch?v=${id}`,
        title: j.title || '',
        author: j.uploader || j.channel || '',
        duration: j.duration || j.duration_string || null,
        thumbnail: j.thumbnails?.[0]?.url
          || (j.thumbnail ? j.thumbnail : `https://i.ytimg.com/vi/${id}/hqdefault.jpg`),
        source: 'youtube'
      });
    } catch {}
  }
  return items;
}

export function spawnYtDlpStream(url) {
  const args = [
    '-f','bestaudio[ext=m4a]/bestaudio/best',
    '--no-playlist',
    '-o','-',
    url
  ];
  const proc = spawn(YTDLP_BIN, args, { stdio: ['ignore', 'pipe', 'pipe'] });
  return proc;
}
