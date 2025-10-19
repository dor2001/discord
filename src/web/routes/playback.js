import { Router } from 'express';
import { playerManager } from '../../player/manager.js';

export const playbackRouter = Router();

playbackRouter.post('/play', async (req, res) => {
  try {
    const { guildId, channelId, url, seek } = req.body || {};
    if (!guildId || !channelId || !url) {
      return res.status(400).json({ ok: false, error: 'guildId, channelId, url are required' });
    }
    const guild = req.client?.guilds?.cache?.get(guildId);
    if (!guild) return res.status(404).json({ ok: false, error: 'Guild not found' });
    const channel = guild.channels.cache.get(channelId);
    if (!channel || channel.type !== 2) {
      return res.status(400).json({ ok: false, error: 'Voice channel not found' });
    }
    const gp = playerManager.get(guildId);
    await gp.connect(channel);
    await gp.play(url, { seek: seek ? Number(seek) : 0 });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

playbackRouter.post('/seek', async (req, res) => {
  try {
    const { guildId, seconds } = req.body || {};
    if (!guildId || seconds == null) {
      return res.status(400).json({ ok: false, error: 'guildId, seconds are required' });
    }
    const gp = playerManager.get(guildId);
    await gp.seek(Number(seconds));
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

playbackRouter.post('/stop', async (req, res) => {
  try {
    const { guildId } = req.body || {};
    if (!guildId) return res.status(400).json({ ok: false, error: 'guildId is required' });
    const gp = playerManager.get(guildId);
    gp.stop();
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});
