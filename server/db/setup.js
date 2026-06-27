import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import pool from './index.js';

// Runs the schema.sql file against the configured database
const __dirname = dirname(fileURLToPath(import.meta.url));
const sql = readFileSync(join(__dirname, 'schema.sql'), 'utf8');

const statements = sql.split(';').map(s => s.trim()).filter(Boolean);

async function run() {
  for (const stmt of statements) {
    await pool.query(stmt);
  }
  console.log('Database schema applied successfully.');
  await pool.end();
}

run().catch(err => {
  console.error('DB setup failed:', err.message);
  process.exit(1);
});
