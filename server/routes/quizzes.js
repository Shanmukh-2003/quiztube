import { Router } from 'express';
import { randomUUID } from 'crypto';
import { ask } from '../ai.js';
import pool from '../db/index.js';
import auth from '../middleware/auth.js';

const router = Router();

async function generateQuiz(title, transcript, previousQuestions = [], difficulty = 'medium') {
  const avoidBlock = previousQuestions.length > 0
    ? `\nAVOID repeating any of these questions:\n${previousQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')}\n`
    : '';

  const diffGuide = {
    easy: 'Focus on basic recall and definitions. Test whether the viewer understood the main points.',
    medium: 'Mix recall with comprehension. Some questions should require understanding relationships between concepts.',
    hard: 'Focus on application and analysis. Require deep understanding and applying concepts to new situations.',
  }[difficulty] || 'Mix recall with comprehension.';

  const prompt = `You are an expert educator. Analyse the transcript from "${title}" and generate a 10-question multiple choice quiz.

Difficulty: ${difficulty.toUpperCase()} — ${diffGuide}

Transcript:
${transcript.slice(0, 8000)}
${avoidBlock}
RULES:
- Only include coding questions if the transcript actually shows code syntax.
- Set "type" to "coding" only for questions with actual code; otherwise "conceptual".

Return ONLY a valid JSON array with exactly 10 objects, each with:
- "question": string
- "options": array of exactly 4 strings
- "correct": number (0-indexed)
- "explanation": string (1-2 sentences)
- "timestamp_hint": string
- "type": "conceptual" or "coding"`;

  const raw = await ask(prompt);
  const jsonStr = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
  const questions = JSON.parse(jsonStr);
  if (!Array.isArray(questions) || questions.length < 8) throw new Error('Invalid quiz format from AI');
  return questions;
}

router.use('/shared', (req, res, next) => next()); // pass-through (handled in index.js)

router.use(auth);

// Generate quiz with optional difficulty
router.post('/video/:videoId', async (req, res) => {
  const difficulty = ['easy', 'medium', 'hard'].includes(req.body.difficulty) ? req.body.difficulty : 'medium';
  try {
    const videoRes = await pool.query('SELECT * FROM videos WHERE id = $1 AND user_id = $2', [req.params.videoId, req.user.id]);
    const video = videoRes.rows[0];
    if (!video) return res.status(404).json({ error: 'Video not found' });
    if (!video.transcript || video.transcript_status !== 'ready') {
      return res.status(422).json({ error: `Cannot generate quiz: transcript is ${video.transcript_status || 'unavailable'}` });
    }
    const prevRes = await pool.query('SELECT questions_json FROM quizzes WHERE video_id = $1', [video.id]);
    const previousQuestions = prevRes.rows.flatMap(r => {
      const qs = typeof r.questions_json === 'string' ? JSON.parse(r.questions_json) : r.questions_json;
      return Array.isArray(qs) ? qs.map(q => q.question) : [];
    });
    const questions = await generateQuiz(video.title, video.transcript, previousQuestions, difficulty);
    const result = await pool.query(
      'INSERT INTO quizzes (video_id, questions_json, difficulty) VALUES ($1, $2, $3) RETURNING *',
      [video.id, JSON.stringify(questions), difficulty]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    if (err instanceof SyntaxError) return res.status(500).json({ error: 'AI returned invalid quiz format. Try again.' });
    res.status(500).json({ error: 'Failed to generate quiz' });
  }
});

// Get latest quiz for a video
router.get('/video/:videoId', async (req, res) => {
  try {
    const videoCheck = await pool.query('SELECT id FROM videos WHERE id = $1 AND user_id = $2', [req.params.videoId, req.user.id]);
    if (!videoCheck.rows[0]) return res.status(404).json({ error: 'Video not found' });
    const result = await pool.query('SELECT * FROM quizzes WHERE video_id = $1 ORDER BY created_at DESC LIMIT 1', [req.params.videoId]);
    if (!result.rows[0]) return res.status(404).json({ error: 'No quiz found for this video' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch quiz' });
  }
});

// Generate or return share link for a quiz
router.post('/:id/share', async (req, res) => {
  try {
    const qRes = await pool.query(
      `SELECT q.* FROM quizzes q JOIN videos v ON v.id = q.video_id WHERE q.id = $1 AND v.user_id = $2`,
      [req.params.id, req.user.id]
    );
    if (!qRes.rows[0]) return res.status(404).json({ error: 'Quiz not found' });
    let token = qRes.rows[0].share_token;
    if (!token) {
      token = randomUUID();
      await pool.query('UPDATE quizzes SET share_token = $1 WHERE id = $2', [token, req.params.id]);
    }
    res.json({ token, url: `/shared/${token}` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to generate share link' });
  }
});

export default router;
