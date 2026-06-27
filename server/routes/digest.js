import { Router } from 'express';
import { ask } from '../ai.js';
import pool from '../db/index.js';
import auth from '../middleware/auth.js';

const router = Router();
router.use(auth);

// Returns the Monday of the week containing a given date
function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().split('T')[0];
}

// Asks Claude to analyze the week's learning activity and produce a digest
async function generateDigest(videos, attempts) {
  const summary = videos.map(v => {
    const videoAttempts = attempts.filter(a => a.video_id === v.id);
    const bestScore = videoAttempts.length > 0 ? Math.max(...videoAttempts.map(a => a.score)) : null;
    return `- "${v.title}" (${v.youtube_id}) — best quiz score: ${bestScore !== null ? `${bestScore}/10` : 'not attempted'}`;
  }).join('\n');

  const scores = attempts.map(a => a.score);
  const avgScore = scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : null;

  const prompt = `You are a learning coach creating a weekly digest for a student.

This week they watched ${videos.length} video(s) and took ${attempts.length} quiz(zes).
Average quiz score: ${avgScore ?? 'N/A'}/10

Videos watched:
${summary || 'None'}

Create an encouraging and insightful weekly digest. Return ONLY valid JSON:
{
  "week_summary": "2-3 sentence overview of the week's learning",
  "score_trend": "brief analysis of their quiz performance trend",
  "strengths": ["strength1", "strength2"],
  "areas_to_improve": ["area1", "area2"],
  "next_week_plan": "2-3 sentence personalized learning plan for next week based on what they studied",
  "motivational_quote": "one short motivational quote relevant to learning"
}`;

  const raw = await ask(prompt);
  const jsonStr = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
  return JSON.parse(jsonStr);
}

// Generates (or returns cached) weekly digest for the current week
router.get('/current', async (req, res) => {
  const weekStart = getWeekStart(new Date());

  try {
    // Return cached digest if it exists
    const cached = await pool.query(
      'SELECT * FROM weekly_digests WHERE user_id = $1 AND week_start = $2',
      [req.user.id, weekStart]
    );
    if (cached.rows[0]) return res.json(cached.rows[0]);

    // Gather this week's videos and attempts
    const videosRes = await pool.query(
      `SELECT * FROM videos WHERE user_id = $1 AND added_at >= $2`,
      [req.user.id, weekStart]
    );
    const attemptsRes = await pool.query(
      `SELECT a.*, q.video_id FROM attempts a
       JOIN quizzes q ON q.id = a.quiz_id
       WHERE a.user_id = $1 AND a.taken_at >= $2`,
      [req.user.id, weekStart]
    );

    const videos = videosRes.rows;
    const attempts = attemptsRes.rows;

    if (videos.length === 0 && attempts.length === 0) {
      return res.status(404).json({ error: 'No learning activity this week yet' });
    }

    const digest = await generateDigest(videos, attempts);

    const result = await pool.query(
      'INSERT INTO weekly_digests (user_id, week_start, digest_json) VALUES ($1, $2, $3) ON CONFLICT (user_id, week_start) DO UPDATE SET digest_json = EXCLUDED.digest_json RETURNING *',
      [req.user.id, weekStart, JSON.stringify(digest)]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to generate weekly digest' });
  }
});

// Forces regeneration of the current week's digest
router.post('/current/regenerate', async (req, res) => {
  const weekStart = getWeekStart(new Date());
  try {
    await pool.query(
      'DELETE FROM weekly_digests WHERE user_id = $1 AND week_start = $2',
      [req.user.id, weekStart]
    );
    // Redirect to the GET handler logic by fetching fresh
    const videosRes = await pool.query(
      `SELECT * FROM videos WHERE user_id = $1 AND added_at >= $2`,
      [req.user.id, weekStart]
    );
    const attemptsRes = await pool.query(
      `SELECT a.*, q.video_id FROM attempts a
       JOIN quizzes q ON q.id = a.quiz_id
       WHERE a.user_id = $1 AND a.taken_at >= $2`,
      [req.user.id, weekStart]
    );
    const videos = videosRes.rows;
    const attempts = attemptsRes.rows;

    if (videos.length === 0 && attempts.length === 0) {
      return res.status(404).json({ error: 'No learning activity this week yet' });
    }

    const digest = await generateDigest(videos, attempts);
    const result = await pool.query(
      'INSERT INTO weekly_digests (user_id, week_start, digest_json) VALUES ($1, $2, $3) ON CONFLICT (user_id, week_start) DO UPDATE SET digest_json = EXCLUDED.digest_json RETURNING *',
      [req.user.id, weekStart, JSON.stringify(digest)]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to regenerate digest' });
  }
});

// Lists all past weekly digests for the current user
router.get('/history', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM weekly_digests WHERE user_id = $1 ORDER BY week_start DESC',
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch digest history' });
  }
});

export default router;
