const fs = require('fs');
const path = require('path');
const DB_FILE = path.join(__dirname, '..', '..', 'data', 'history.json');

function loadAll() { try { return JSON.parse(fs.readFileSync(DB_FILE,'utf8')); } catch { return { guilds: {} }; } }
function saveAll(db) { const dir = path.dirname(DB_FILE); if (!fs.existsSync(dir)) fs.mkdirSync(dir,{recursive:true}); fs.writeFileSync(DB_FILE, JSON.stringify(db,null,2),'utf8'); }
function addPlayed(guildId, track) { const db = loadAll(); if (!db.guilds[guildId]) db.guilds[guildId]={played:[]}; db.guilds[guildId].played.push({ title: track.title, url: track.url, at: Date.now() }); db.guilds[guildId].played = db.guilds[guildId].played.slice(-500); saveAll(db); }
function getPlayed(guildId) { const db = loadAll(); return (db.guilds[guildId]?.played)||[]; }
module.exports = { addPlayed, getPlayed };
