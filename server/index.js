import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

import authRoutes from './routes/auth.js';
import videoRoutes from './routes/videos.js';
import quizRoutes from './routes/quizzes.js';
import attemptRoutes from './routes/attempts.js';
import digestRoutes from './routes/digest.js';
import userRoutes from './routes/users.js';
import collectionRoutes from './routes/collections.js';
import pool from './db/index.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

const allowedOrigin = process.env.ALLOWED_ORIGIN || 'http://localhost:5173';
app.use(cors({ origin: allowedOrigin, credentials: true }));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/videos', videoRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/api/attempts', attemptRoutes);
app.use('/api/digest', digestRoutes);
app.use('/api/users', userRoutes);
app.use('/api/collections', collectionRoutes);

// Public shared quiz — no auth required
app.get('/api/shared/:token', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT q.id, q.questions_json, q.difficulty, v.title, v.youtube_id
       FROM quizzes q JOIN videos v ON v.id = q.video_id
       WHERE q.share_token = $1`,
      [req.params.token]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Shared quiz not found or link has expired' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load shared quiz' });
  }
});

app.get('/api/health', (_, res) => res.json({ status: 'ok' }));

// Serve built React app in production
const __dirname = dirname(fileURLToPath(import.meta.url));
const clientDist = join(__dirname, '../client/dist');
if (existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res) => res.sendFile(join(clientDist, 'index.html')));
}

// export for Vercel serverless; listen only when running locally
export default app;

if (!process.env.VERCEL) {
  app.listen(PORT, () => console.log(`QuizTube server running on port ${PORT}`));
}
