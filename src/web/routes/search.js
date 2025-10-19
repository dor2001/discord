import { Router } from 'express';
import { youtubeSearch } from '../../services/ytSearch.js';

export const searchRouter = Router();

searchRouter.get('/search', async (req, res) => {
  try {
    const q = String(req.query.q || '');
    const limit = Number(req.query.limit || 10);
    const results = await youtubeSearch(q, limit);
    res.json({ ok: true, results });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});
