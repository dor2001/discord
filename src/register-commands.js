require('dotenv').config();
const { REST, Routes, SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const commands = [
  new SlashCommandBuilder().setName('join').setDescription('הבוט נכנס לערוץ הקולי הנוכחי שלך (או לברירת המחדל).'),
  new SlashCommandBuilder().setName('play').setDescription('נגן שיר לפי שם או לינק').addStringOption(o=>o.setName('query').setDescription('שם שיר או קישור').setRequired(true)),
  new SlashCommandBuilder().setName('skip').setDescription('דלג לשיר הבא'),
  new SlashCommandBuilder().setName('pause').setDescription('השהה השמעה'),
  new SlashCommandBuilder().setName('resume').setDescription('המשך השמעה'),
  new SlashCommandBuilder().setName('stop').setDescription('עצור ונקה תור').setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  new SlashCommandBuilder().setName('remove').setDescription('מחק שיר מהתור לפי אינדקס').addIntegerOption(o=>o.setName('index').setDescription('אינדקס בתור, החל מ-1').setRequired(true)).setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  new SlashCommandBuilder().setName('move').setDescription('הזז שיר בתור').addIntegerOption(o=>o.setName('from').setDescription('מאינדקס (1-based)').setRequired(true)).addIntegerOption(o=>o.setName('to').setDescription('לאינדקס (1-based)').setRequired(true)).setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  new SlashCommandBuilder().setName('volume').setDescription('קבע ווליום (0-200%)').addIntegerOption(o=>o.setName('percent').setDescription('אחוזים').setRequired(true)).setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  new SlashCommandBuilder().setName('repeat').setDescription('מצב חזרה: off/one/all').addStringOption(o=>o.setName('mode').setDescription('off | one | all').setRequired(true)),
  new SlashCommandBuilder().setName('shuffle').setDescription('ערבב את התור').setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  new SlashCommandBuilder().setName('now').setDescription('הצג את מה שמתנגן עכשיו'),
  new SlashCommandBuilder().setName('settings').setDescription('הצג נתוני הגדרות נוכחיים'),
  new SlashCommandBuilder().setName('import').setDescription('ייבוא פלייליסט מיוטיוב אל פלייליסט פנימי').addStringOption(o=>o.setName('url').setDescription('YouTube playlist URL').setRequired(true)).addStringOption(o=>o.setName('name').setDescription('שם פלייליסט פנימי').setRequired(true)).setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  new SlashCommandBuilder().setName('recommend').setDescription('קבל המלצות לפי ז׳אנרים והיסטוריה').addIntegerOption(o=>o.setName('limit').setDescription('כמות').setRequired(false)),
].map(c => c.toJSON());
const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
(async () => {
  try { console.log('Registering slash commands...'); await rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID), { body: commands }); console.log('Slash commands registered.'); }
  catch (e) { console.error(e); process.exit(1); }
})();
