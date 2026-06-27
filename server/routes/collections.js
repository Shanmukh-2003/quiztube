import { Router } from 'express';
import pool from '../db/index.js';
import auth from '../middleware/auth.js';

const router = Router();
router.use(auth);

router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT c.*, COUNT(cv.video_id)::int AS video_count
       FROM collections c
       LEFT JOIN collection_videos cv ON cv.collection_id = c.id
       WHERE c.user_id = $1
       GROUP BY c.id ORDER BY c.created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch collections' });
  }
});

router.post('/', async (req, res) => {
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Name is required' });
  try {
    const result = await pool.query(
      'INSERT INTO collections (user_id, name) VALUES ($1, $2) RETURNING *',
      [req.user.id, name.trim()]
    );
    res.status(201).json({ ...result.rows[0], video_count: 0 });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create collection' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM collections WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete collection' });
  }
});

// Videos in a collection
router.get('/:id/videos', async (req, res) => {
  try {
    const colCheck = await pool.query('SELECT id FROM collections WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    if (!colCheck.rows[0]) return res.status(404).json({ error: 'Collection not found' });
    const result = await pool.query(
      `SELECT v.*, COALESCE(json_agg(t.name) FILTER (WHERE t.name IS NOT NULL), '[]') AS tags
       FROM videos v
       JOIN collection_videos cv ON cv.video_id = v.id
       LEFT JOIN video_tags vt ON vt.video_id = v.id
       LEFT JOIN tags t ON t.id = vt.tag_id
       WHERE cv.collection_id = $1
       GROUP BY v.id ORDER BY v.added_at DESC`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch collection videos' });
  }
});

router.post('/:id/videos', async (req, res) => {
  const { video_id } = req.body;
  try {
    const colCheck = await pool.query('SELECT id FROM collections WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    if (!colCheck.rows[0]) return res.status(404).json({ error: 'Collection not found' });
    await pool.query(
      'INSERT INTO collection_videos (collection_id, video_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [req.params.id, video_id]
    );
    res.json({ message: 'Added' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add video to collection' });
  }
});

router.delete('/:id/videos/:videoId', async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM collection_videos WHERE collection_id = $1 AND video_id = $2',
      [req.params.id, req.params.videoId]
    );
    res.json({ message: 'Removed' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove video from collection' });
  }
});

export default router;
