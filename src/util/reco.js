const { ytSearch } = require('./search');
const genreHints = {
  pop: ['pop','radio','hit'],
  rock: ['rock','guitar','band'],
  hiphop: ['hip hop','rap','trap'],
  edm: ['edm','house','trance','electro'],
  arabic: ['arab','oriental','מצרי','لبناني','عربي'],
  mizrahi: ['מזרחי','ים תיכוני','עדן בן זקן','עומר אדם','אייל גולן','איל גולן','מזרחית'],
  indie: ['indie'],
  jazz: ['jazz','sax','swing'],
  classical: ['classical','piano','symphony'],
  metal: ['metal','heavy'],
  kpop: ['kpop','k-pop'],
};
function scoreGenres(titles) {
  const scores = {};
  for (const [g, hints] of Object.entries(genreHints)) {
    scores[g] = 0;
    for (const t of titles) {
      const low = (t||'').toLowerCase();
      for (const h of hints) if (low.includes(h)) scores[g] += 1;
    }
  }
  return Object.entries(scores).sort((a,b)=>b[1]-a[1]).map(x=>x[0]);
}
async function recommend({ playedTitles = [], preferredGenres = [], limit = 12 }) {
  const inferred = scoreGenres(playedTitles).slice(0,3);
  const seeds = Array.from(new Set([...(preferredGenres||[]), ...inferred]));
  const queries = [];
  for (const g of seeds) { queries.push(`${g} new music official audio`); queries.push(`${g} hits`); }
  if (queries.length === 0) queries.push('music hits official audio');
  const unique = new Map();
  for (const q of queries) {
    const items = await ytSearch(q);
    for (const it of items) if (!unique.has(it.url)) unique.set(it.url, it);
    if (unique.size >= limit) break;
  }
  return Array.from(unique.values()).slice(0, limit);
}
module.exports = { recommend };
