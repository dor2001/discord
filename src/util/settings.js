const fs = require('fs');
const path = require('path');
const DB_FILE = path.join(__dirname, '..', '..', 'data', 'settings.json');

function loadAll() { try { return JSON.parse(fs.readFileSync(DB_FILE,'utf8')); } catch { return { guilds: {} }; } }
function saveAll(data) { const dir = path.dirname(DB_FILE); if (!fs.existsSync(dir)) fs.mkdirSync(dir,{recursive:true}); fs.writeFileSync(DB_FILE, JSON.stringify(data,null,2),'utf8'); }
function getGuildSettings(guildId) { const db = loadAll(); return db.guilds[guildId] || {}; }
function setGuildSettings(guildId, patch) { const db = loadAll(); db.guilds[guildId] = { ...(db.guilds[guildId] || {}), ...patch }; saveAll(db); return db.guilds[guildId]; }
module.exports = { getGuildSettings, setGuildSettings };
