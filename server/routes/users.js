import { Router } from 'express';
import pool from '../db/index.js';
import auth from '../middleware/auth.js';

const router = Router();
router.use(auth);

// Returns streak, XP, badges, score history, and per-tag radar data
router.get('/stats', async (req, res) => {
  try {
    const uid = req.user.id;

    const userRes = await pool.query(
      'SELECT streak, xp, badges_json, last_active FROM users WHERE id = $1',
      [uid]
    );
    const user = userRes.rows[0];

    // Last 30 quiz attempts for score history
    const historyRes = await pool.query(
      `SELECT a.score, a.taken_at, jsonb_array_length(q.questions_json::jsonb) AS total
       FROM attempts a
       JOIN quizzes q ON q.id = a.quiz_id
       WHERE a.user_id = $1
       ORDER BY a.taken_at DESC LIMIT 30`,
      [uid]
    );

    // Per-tag average score for radar chart
    const radarRes = await pool.query(
      `SELECT t.name AS tag, AVG(a.score::float / NULLIF(jsonb_array_length(q.questions_json::jsonb), 0)) AS avg_pct, COUNT(*) AS attempts
       FROM attempts a
       JOIN quizzes q ON q.id = a.quiz_id
       JOIN videos v ON v.id = q.video_id
       JOIN video_tags vt ON vt.video_id = v.id
       JOIN tags t ON t.id = vt.tag_id
       WHERE a.user_id = $1
       GROUP BY t.name
       ORDER BY attempts DESC LIMIT 8`,
      [uid]
    );

    // Videos due for spaced repetition review
    const reviewRes = await pool.query(
      `SELECT id, title, thumbnail_url, youtube_id, next_review
       FROM videos WHERE user_id = $1 AND next_review IS NOT NULL AND next_review <= CURRENT_DATE
       ORDER BY next_review ASC`,
      [uid]
    );

    res.json({
      streak: user.streak || 0,
      xp: user.xp || 0,
      badges: user.badges_json || [],
      last_active: user.last_active,
      score_history: historyRes.rows.reverse(),
      radar: radarRes.rows,
      due_for_review: reviewRes.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

export default router;
