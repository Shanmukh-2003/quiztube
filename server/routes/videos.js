import { Router } from 'express';
import axios from 'axios';
import { YoutubeTranscript } from 'youtube-transcript';
import { ask } from '../ai.js';
import pool from '../db/index.js';
import auth from '../middleware/auth.js';

const router = Router();
router.use(auth);

// Extracts the video ID from various YouTube URL formats
function extractYouTubeId(url) {
  const patterns = [
    /(?:v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:embed\/)([a-zA-Z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

function extractPlaylistId(url) {
  const match = url.match(/[?&]list=([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

async function addSingleVideo(userId, youtubeId, thoughts = null) {
  const existing = await pool.query('SELECT id FROM videos WHERE user_id = $1 AND youtube_id = $2', [userId, youtubeId]);
  if (existing.rows.length > 0) return { skipped: true };
  let title = null, thumbnail_url = null;
  try {
    const oembed = await fetchOEmbed(youtubeId);
    title = oembed.title; thumbnail_url = oembed.thumbnail_url;
  } catch { return { error: true }; }
  const transcript = await fetchTranscript(youtubeId);
  const transcript_status = !transcript ? 'unavailable' : transcript.split(' ').length < 100 ? 'too_short' : 'ready';
  const result = await pool.query(
    `INSERT INTO videos (user_id, youtube_id, title, thumbnail_url, transcript, transcript_status, thoughts) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [userId, youtubeId, title, thumbnail_url, transcript, transcript_status, thoughts]
  );
  return { video: result.rows[0] };
}

// Fetches title and thumbnail using YouTube oEmbed (no API key needed)
async function fetchOEmbed(youtubeId) {
  const url = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${youtubeId}&format=json`;
  const res = await axios.get(url);
  return { title: res.data.title, thumbnail_url: res.data.thumbnail_url };
}

// Fetches transcript using YouTube's built-in caption system (no OAuth needed)
async function fetchTranscript(youtubeId) {
  try {
    const segments = await YoutubeTranscript.fetchTranscript(youtubeId, { lang: 'en' });
    if (!segments || segments.length === 0) return null;
    const plain = segments.map(s => s.text).join(' ').replace(/\s+/g, ' ').trim();
    return plain.length > 100 ? plain : null;
  } catch {
    return null;
  }
}

// Import all videos from a YouTube playlist
router.post('/import-playlist', async (req, res) => {
  const { url } = req.body;
  const playlistId = extractPlaylistId(url);
  if (!playlistId) return res.status(400).json({ error: 'Could not find playlist ID in URL' });
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'YouTube API key not configured' });
  try {
    let videoIds = [], pageToken = '';
    do {
      const apiUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${playlistId}&maxResults=50&key=${apiKey}${pageToken ? `&pageToken=${pageToken}` : ''}`;
      const r = await axios.get(apiUrl);
      videoIds.push(...r.data.items.map(i => i.snippet?.resourceId?.videoId).filter(Boolean));
      pageToken = r.data.nextPageToken || '';
    } while (pageToken && videoIds.length < 100);
    if (videoIds.length === 0) return res.status(404).json({ error: 'No videos found in playlist' });
    let added = 0, skipped = 0;
    for (const id of videoIds) {
      const r = await addSingleVideo(req.user.id, id);
      if (r.video) added++; else skipped++;
    }
    res.json({ added, skipped, total: videoIds.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to import playlist' });
  }
});

// Adds a YouTube video to the user's library, fetching metadata and transcript
router.post('/', async (req, res) => {
  const { url, thoughts } = req.body;
  if (!url) return res.status(400).json({ error: 'YouTube URL is required' });

  const youtubeId = extractYouTubeId(url);
  if (!youtubeId) return res.status(400).json({ error: 'Could not extract YouTube video ID from the provided URL' });

  try {
    // Check for duplicate
    const existing = await pool.query(
      'SELECT id FROM videos WHERE user_id = $1 AND youtube_id = $2',
      [req.user.id, youtubeId]
    );
    if (existing.rows.length > 0) return res.status(409).json({ error: 'You already added this video' });

    // Fetch title and thumbnail
    let title = null, thumbnail_url = null;
    try {
      const oembed = await fetchOEmbed(youtubeId);
      title = oembed.title;
      thumbnail_url = oembed.thumbnail_url;
    } catch {
      return res.status(400).json({ error: 'Could not fetch video info. Make sure the URL is a valid public YouTube video.' });
    }

    // Fetch transcript
    const transcript = await fetchTranscript(youtubeId);
    let transcript_status = 'unavailable';
    if (transcript) {
      transcript_status = transcript.split(' ').length < 100 ? 'too_short' : 'ready';
    }

    const result = await pool.query(
      `INSERT INTO videos (user_id, youtube_id, title, thumbnail_url, transcript, transcript_status, thoughts)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [req.user.id, youtubeId, title, thumbnail_url, transcript, transcript_status, thoughts || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add video' });
  }
});

// Lists all videos for the current user, newest first
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT v.*,
        COALESCE(json_agg(t.name) FILTER (WHERE t.name IS NOT NULL), '[]') AS tags
       FROM videos v
       LEFT JOIN video_tags vt ON vt.video_id = v.id
       LEFT JOIN tags t ON t.id = vt.tag_id
       WHERE v.user_id = $1
       GROUP BY v.id
       ORDER BY v.added_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch videos' });
  }
});

// Returns a single video with its tags
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT v.*,
        COALESCE(json_agg(t.name) FILTER (WHERE t.name IS NOT NULL), '[]') AS tags
       FROM videos v
       LEFT JOIN video_tags vt ON vt.video_id = v.id
       LEFT JOIN tags t ON t.id = vt.tag_id
       WHERE v.id = $1 AND v.user_id = $2
       GROUP BY v.id`,
      [req.params.id, req.user.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Video not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch video' });
  }
});

// Updates a video's thoughts or tags
router.patch('/:id', async (req, res) => {
  const { thoughts, tags } = req.body;
  try {
    const videoCheck = await pool.query('SELECT id FROM videos WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    if (!videoCheck.rows[0]) return res.status(404).json({ error: 'Video not found' });

    if (thoughts !== undefined) {
      await pool.query('UPDATE videos SET thoughts = $1 WHERE id = $2', [thoughts, req.params.id]);
    }

    if (Array.isArray(tags)) {
      // Remove existing tags then re-add
      await pool.query('DELETE FROM video_tags WHERE video_id = $1', [req.params.id]);
      for (const name of tags) {
        const tagName = name.trim().toLowerCase();
        if (!tagName) continue;
        const tagRes = await pool.query(
          'INSERT INTO tags (user_id, name) VALUES ($1, $2) ON CONFLICT (user_id, name) DO UPDATE SET name = EXCLUDED.name RETURNING id',
          [req.user.id, tagName]
        );
        await pool.query('INSERT INTO video_tags (video_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [req.params.id, tagRes.rows[0].id]);
      }
    }

    const updated = await pool.query(
      `SELECT v.*, COALESCE(json_agg(t.name) FILTER (WHERE t.name IS NOT NULL), '[]') AS tags
       FROM videos v
       LEFT JOIN video_tags vt ON vt.video_id = v.id
       LEFT JOIN tags t ON t.id = vt.tag_id
       WHERE v.id = $1 GROUP BY v.id`,
      [req.params.id]
    );
    res.json(updated.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update video' });
  }
});

// Generate AI notes from transcript
router.post('/:id/notes', async (req, res) => {
  try {
    const vRes = await pool.query('SELECT * FROM videos WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    const video = vRes.rows[0];
    if (!video) return res.status(404).json({ error: 'Video not found' });
    if (!video.transcript) return res.status(422).json({ error: 'No transcript available' });
    const prompt = `You are a study assistant. Analyze this YouTube transcript for "${video.title}" and create study notes.
Transcript: ${video.transcript.slice(0, 8000)}
Return ONLY JSON: {"summary":"2-3 sentence overview","key_points":["..."],"concepts":["..."],"takeaways":["..."]}`;
    const raw = await ask(prompt);
    const jsonStr = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
    const notes = JSON.parse(jsonStr);
    await pool.query('UPDATE videos SET notes = $1 WHERE id = $2', [JSON.stringify(notes), req.params.id]);
    res.json(notes);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to generate notes' });
  }
});

// Ask a question about the video
router.post('/:id/ask', async (req, res) => {
  const { question } = req.body;
  if (!question?.trim()) return res.status(400).json({ error: 'Question is required' });
  try {
    const vRes = await pool.query('SELECT * FROM videos WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    const video = vRes.rows[0];
    if (!video) return res.status(404).json({ error: 'Video not found' });
    if (!video.transcript) return res.status(422).json({ error: 'No transcript available' });
    const prompt = `You are a helpful tutor. The user watched "${video.title}".
Transcript: ${video.transcript.slice(0, 8000)}
Question: ${question}
Answer based on the video content in 2-4 sentences. If not covered in the transcript, say so.`;
    const answer = await ask(prompt);
    res.json({ answer });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to get answer' });
  }
});

// Generate a detailed AI study guide for the video
router.post('/:id/study-guide', async (req, res) => {
  try {
    const vRes = await pool.query(
      `SELECT v.*, COALESCE(json_agg(DISTINCT t.name) FILTER (WHERE t.name IS NOT NULL), '[]') AS tags
       FROM videos v
       LEFT JOIN video_tags vt ON vt.video_id = v.id
       LEFT JOIN tags t ON t.id = vt.tag_id
       WHERE v.id = $1 AND v.user_id = $2 GROUP BY v.id`,
      [req.params.id, req.user.id]
    );
    const video = vRes.rows[0];
    if (!video) return res.status(404).json({ error: 'Video not found' });
    if (!video.transcript) return res.status(422).json({ error: 'No transcript available for this video' });

    // Get existing quiz questions if any
    const quizRes = await pool.query(
      'SELECT questions_json FROM quizzes WHERE video_id = $1 ORDER BY created_at DESC LIMIT 1',
      [video.id]
    );
    const questions = quizRes.rows[0]?.questions_json ?? [];

    const prompt = `You are an expert educator creating a comprehensive study guide for a YouTube video.

Video Title: "${video.title}"
Tags/Topics: ${(video.tags || []).join(', ') || 'general'}

Full Transcript:
${video.transcript.slice(0, 12000)}

Create a thorough, detailed study guide that would help a student deeply understand and retain this content.

Return ONLY valid JSON with this exact structure:
{
  "title": "Study Guide: [video title]",
  "overview": "3-4 sentence introduction to what this video covers and why it matters",
  "learning_objectives": ["By the end, you will understand...", "..."],
  "sections": [
    {
      "heading": "Section name",
      "content": "Detailed 3-5 sentence explanation of this concept/topic",
      "key_terms": [{"term": "word", "definition": "clear definition"}],
      "examples": ["concrete example or analogy"]
    }
  ],
  "concept_map": ["Main concept 1 → relates to → Concept 2", "..."],
  "common_mistakes": ["Mistake or misconception to avoid", "..."],
  "practice_questions": [
    {"question": "...", "answer": "detailed answer..."}
  ],
  "summary": "3-4 sentence recap of the most important points",
  "next_steps": ["What to learn next", "Recommended practice", "..."]
}

Make sections detailed and educational. Aim for 4-6 sections covering the main topics in the video.`;

    const raw = await ask(prompt);
    const jsonStr = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
    const guide = JSON.parse(jsonStr);
    guide.video_title = video.title;
    guide.youtube_id = video.youtube_id;
    guide.generated_at = new Date().toISOString();
    if (questions.length > 0) {
      guide.quiz_questions = (typeof questions === 'string' ? JSON.parse(questions) : questions)
        .map(q => ({ question: q.question, options: q.options, correct: q.correct, explanation: q.explanation }));
    }
    res.json(guide);
  } catch (err) {
    console.error(err);
    if (err instanceof SyntaxError) return res.status(500).json({ error: 'AI returned unexpected format. Please try again.' });
    res.status(500).json({ error: 'Failed to generate study guide' });
  }
});

// Deletes a video and its associated data
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM videos WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.user.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Video not found' });
    res.json({ message: 'Video deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete video' });
  }
});

export default router;
