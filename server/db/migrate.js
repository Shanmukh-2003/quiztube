import pool from './index.js';

const stmts = [
  `ALTER TABLE videos ADD COLUMN IF NOT EXISTS notes TEXT`,
  `ALTER TABLE videos ADD COLUMN IF NOT EXISTS next_review DATE`,
  `ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS difficulty TEXT DEFAULT 'medium'`,
  `ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS share_token TEXT`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS streak INTEGER DEFAULT 0`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS last_active DATE`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS xp INTEGER DEFAULT 0`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS badges_json JSONB DEFAULT '[]'`,
  `CREATE TABLE IF NOT EXISTS collections (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS collection_videos (
    collection_id INTEGER REFERENCES collections(id) ON DELETE CASCADE,
    video_id INTEGER REFERENCES videos(id) ON DELETE CASCADE,
    PRIMARY KEY (collection_id, video_id)
  )`,
];

async function run() {
  for (const s of stmts) {
    await pool.query(s);
    console.log('OK:', s.trim().slice(0, 60));
  }
  await pool.end();
  console.log('Migration complete.');
}

run().catch(e => { console.error(e.message); process.exit(1); });
