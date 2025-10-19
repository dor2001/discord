const playdl = require('play-dl');

function buildYtUrlFromId(id) { if (!id) return null; return `https://www.youtube.com/watch?v=${id}`; }

async function ytSearch(query) {
  if (/^(https?:\/\/)/i.test(query)) {
    try {
      const info = await playdl.video_info(query);
      const v = info.video_details || {};
      const id = v.id || v.videoId || (v.url ? new URL(v.url).searchParams.get('v') : null);
      const url = buildYtUrlFromId(id) || query;
      return [{ title: v.title || query, url, duration: v.durationInSec ?? 0, thumbnail: (v.thumbnails && v.thumbnails[0] && v.thumbnails[0].url) || null }];
    } catch {
      return [{ title: query, url: query, duration: 0, thumbnail: null }];
    }
  }
  const results = await playdl.search(query, { limit: 12, source: { youtube: "video" } });
  return results.map(v => {
    const id = v?.id || v?.videoId || null;
    const safeUrl = v?.url || buildYtUrlFromId(id) || '';
    return { title: v?.title || query, url: safeUrl, duration: v?.durationInSec || 0, thumbnail: (v?.thumbnails && v.thumbnails[0] && v.thumbnails[0].url) || null };
  }).filter(x => x.url);
}
module.exports = { ytSearch };
