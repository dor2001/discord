// src/util/search.js
const { execSync } = require("child_process");

function buildYtUrlFromId(id) {
  return id ? `https://www.youtube.com/watch?v=${id}` : null;
}

async function ytSearch(query) {
  try {
    // אם זה לינק ישיר לשיר ביוטיוב
    if (/^(https?:\/\/)/i.test(query)) {
      const cmd = `yt-dlp --dump-json --no-warnings --skip-download "${query}"`;
      const output = execSync(cmd, { encoding: "utf8" });
      const data = JSON.parse(output);
      return [
        {
          title: data.title || query,
          url: buildYtUrlFromId(data.id) || query,
          duration: data.duration || 0,
          thumbnail:
            data.thumbnail ||
            (data.thumbnails && data.thumbnails[0] && data.thumbnails[0].url) ||
            null,
        },
      ];
    }

    // אחרת – חיפוש טקסטואלי
    const cmd = `yt-dlp "ytsearch10:${query}" --dump-json --no-warnings --skip-download`;
    const output = execSync(cmd, { encoding: "utf8" });
    const lines = output
      .split("\n")
      .filter((l) => l.trim().length > 0)
      .map((l) => JSON.parse(l));

    return lines.map((v) => ({
      title: v.title,
      url: buildYtUrlFromId(v.id),
      duration: v.duration,
      thumbnail:
        v.thumbnail ||
        (v.thumbnails && v.thumbnails[0] && v.thumbnails[0].url) ||
        null,
    }));
  } catch (err) {
    console.error("ytSearch error:", err.message);
    return [];
  }
}

module.exports = { ytSearch };
