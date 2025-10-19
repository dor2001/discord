const playdl = require('play-dl');

async function importYouTubePlaylist(url, limit=100) {
  const pl = await playdl.playlist_info(url, { incomplete: true });
  const videos = await pl.all_videos();
  const items = videos.slice(0, limit).map(v => ({
    title: v.title,
    url: v.url,
    duration: v.durationInSec||0,
    thumbnail: (v.thumbnails && v.thumbnails[0] && v.thumbnails[0].url) || null,
  }));
  return { title: pl.title, items };
}
module.exports = { importYouTubePlaylist };
