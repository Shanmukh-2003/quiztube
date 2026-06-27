import { Router } from 'express';
import { ask } from '../ai.js';
import pool from '../db/index.js';
import auth from '../middleware/auth.js';

const router = Router();
router.use(auth);

// Builds a tutor prompt based on score tier and returns structured AI feedback
async function generateSuggestion(score, questions, answers, videoTitle) {
  const missed = questions
    .map((q, i) => ({ q, userAnswer: answers[i], correct: q.correct }))
    .filter(item => item.userAnswer !== item.correct)
    .map(item => `- Q: ${item.q.question}\n  Correct: ${item.q.options[item.q.correct]}\n  User picked: ${item.q.options[item.userAnswer] ?? 'no answer'}\n  Explanation: ${item.q.explanation}\n  Hint: ${item.q.timestamp_hint}`);

  let persona, instructions;

  const total = questions.length;
  const pct = score / total;

  if (pct <= 0.4) {
    persona = 'You are a patient tutor.';
    instructions = `The learner scored ${score}/${total} on a quiz about "${videoTitle}". They missed several key concepts. For each missed question below, explain the concept clearly in 2-3 sentences, and tell them to revisit the timestamp hint in the video. End with one encouraging sentence.`;
  } else if (pct <= 0.6) {
    persona = 'You are a supportive mentor.';
    instructions = `The learner scored ${score}/${total} on a quiz about "${videoTitle}". Acknowledge what they got right (implied), then for each missed concept below give a brief 1-2 sentence explanation. Balance encouragement with guidance to close the gaps.`;
  } else {
    persona = 'You are an enthusiastic coach celebrating mastery.';
    instructions = `The learner scored ${score}/${total} on a quiz about "${videoTitle}" — excellent work! Write a short mastery summary (2-3 sentences) of what they understood well. Then suggest one related topic they could explore next to deepen their knowledge. ${score === total ? 'Also provide one challenging bonus question (with the answer) to stretch their thinking.' : ''}`;
  }

  const missedText = missed.length > 0 ? `\n\nMissed concepts:\n${missed.join('\n\n')}` : '';
  const prompt = `${persona}\n\n${instructions}${missedText}\n\nReturn ONLY valid JSON with this structure:\n{\n  "headline": "one catchy sentence summarizing the feedback",\n  "body": "the main feedback paragraphs",\n  "tips": ["tip1", "tip2"],\n  "bonus_question": "only if score is 5, else null",\n  "bonus_answer": "only if score is 5, else null"\n}`;

  const raw = await ask(prompt);
  const jsonStr = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
  return JSON.parse(jsonStr);
}

// Submits answers for a quiz, calculates score, and gets AI tutor feedback
router.post('/', async (req, res) => {
  const { quiz_id, answers } = req.body;
  if (!quiz_id || !Array.isArray(answers)) {
    return res.status(400).json({ error: 'quiz_id and answers array are required' });
  }

  try {
    const quizRes = await pool.query(
      `SELECT q.*, v.title, v.user_id FROM quizzes q
       JOIN videos v ON v.id = q.video_id
       WHERE q.id = $1 AND v.user_id = $2`,
      [quiz_id, req.user.id]
    );
    const quiz = quizRes.rows[0];
    if (!quiz) return res.status(404).json({ error: 'Quiz not found' });

    const questions = quiz.questions_json;
    if (answers.length !== questions.length) {
      return res.status(400).json({ error: `Expected ${questions.length} answers, got ${answers.length}` });
    }

    // Calculate score
    const score = questions.reduce((acc, q, i) => acc + (answers[i] === q.correct ? 1 : 0), 0);

    // Generate AI suggestion
    let suggestion;
    try {
      suggestion = await generateSuggestion(score, questions, answers, quiz.title);
    } catch (aiErr) {
      console.error('AI suggestion failed:', aiErr);
      suggestion = { headline: 'Quiz completed!', body: `You scored ${score}/${questions.length}.`, tips: [], bonus_question: null, bonus_answer: null };
    }

    const result = await pool.query(
      'INSERT INTO attempts (quiz_id, user_id, score, answers_json, suggestion_json) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [quiz_id, req.user.id, score, JSON.stringify(answers), JSON.stringify(suggestion)]
    );

    // Award XP (10 per question correct, bonus for perfect)
    const xpEarned = score * 10 + (score === questions.length ? 50 : 0);

    // Update streak
    const today = new Date().toISOString().split('T')[0];
    const userRes = await pool.query('SELECT last_active, streak, xp, badges_json FROM users WHERE id = $1', [req.user.id]);
    const u = userRes.rows[0];
    const lastActive = u.last_active ? new Date(u.last_active).toISOString().split('T')[0] : null;
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const newStreak = lastActive === today ? u.streak : lastActive === yesterday ? u.streak + 1 : 1;
    const newXp = (u.xp || 0) + xpEarned;

    // Award badges
    const badges = Array.isArray(u.badges_json) ? u.badges_json : [];
    const allAttempts = await pool.query('SELECT score FROM attempts WHERE user_id = $1', [req.user.id]);
    const totalAttempts = allAttempts.rows.length;
    const checkBadge = (id, condition) => { if (condition && !badges.find(b => b.id === id)) badges.push({ id, earned_at: today }); };
    checkBadge('first_quiz', totalAttempts === 1);
    checkBadge('perfect_score', score === questions.length);
    checkBadge('quiz_10', totalAttempts >= 10);
    checkBadge('quiz_50', totalAttempts >= 50);
    checkBadge('streak_7', newStreak >= 7);
    checkBadge('streak_30', newStreak >= 30);
    checkBadge('xp_500', newXp >= 500);
    checkBadge('xp_1000', newXp >= 1000);

    await pool.query(
      'UPDATE users SET last_active = $1, streak = $2, xp = $3, badges_json = $4 WHERE id = $5',
      [today, newStreak, newXp, JSON.stringify(badges), req.user.id]
    );

    // Spaced repetition: set next review based on score
    const pct = score / questions.length;
    const daysUntilReview = pct < 0.5 ? 1 : pct < 0.7 ? 3 : pct < 0.9 ? 7 : null;
    if (daysUntilReview) {
      const reviewDate = new Date(Date.now() + daysUntilReview * 86400000).toISOString().split('T')[0];
      await pool.query('UPDATE videos SET next_review = $1 WHERE id = $2', [reviewDate, quiz.video_id]);
    } else {
      await pool.query('UPDATE videos SET next_review = NULL WHERE id = $1', [quiz.video_id]);
    }

    res.status(201).json({ ...result.rows[0], score, suggestion, xp_earned: xpEarned, streak: newStreak, new_badges: badges.filter(b => b.earned_at === today) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to submit attempt' });
  }
});

// Returns all quiz attempts for the current user, newest first
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT a.*, q.video_id, v.title AS video_title, v.youtube_id,
              jsonb_array_length(q.questions_json::jsonb) AS total_questions
       FROM attempts a
       JOIN quizzes q ON q.id = a.quiz_id
       JOIN videos v ON v.id = q.video_id
       WHERE a.user_id = $1
       ORDER BY a.taken_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch attempts' });
  }
});

// Returns a specific attempt with its suggestion
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT a.*, q.video_id, q.questions_json, v.title AS video_title, v.youtube_id
       FROM attempts a
       JOIN quizzes q ON q.id = a.quiz_id
       JOIN videos v ON v.id = q.video_id
       WHERE a.id = $1 AND a.user_id = $2`,
      [req.params.id, req.user.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Attempt not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch attempt' });
  }
});

export default router;
