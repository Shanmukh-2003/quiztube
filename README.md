# QuizTube

An AI-powered YouTube learning tracker that turns any YouTube video into an interactive quiz with feedback, notes, and progress tracking.

![QuizTube](https://img.shields.io/badge/React-19-61DAFB?logo=react) ![Node.js](https://img.shields.io/badge/Node.js-Express-339933?logo=node.js) ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Supabase-4169E1?logo=postgresql) ![Groq](https://img.shields.io/badge/AI-Groq%20Llama%203.3-F55036)

## What It Does

Paste a YouTube URL → QuizTube fetches the transcript → AI generates a 10-question quiz → you answer → get personalised feedback and track your progress over time.

**Core features:**
- AI-generated quizzes (Easy / Medium / Hard difficulty)
- Tiered AI feedback based on your score
- AI notes: summary, key points, concepts, takeaways
- Ask the Video: chat with the AI about any video
- Study Guide PDF: downloadable multi-page dark-themed PDF
- XP system, daily streak, and 8 achievement badges
- Score history chart and topic radar chart
- Spaced repetition: videos resurface for review when needed
- Collections: organise videos into custom groups
- Playlist import: bulk-add an entire YouTube playlist
- Share Quiz: send a public link to any quiz (no login needed)
- Weekly AI digest: strengths, areas to improve, next week's plan

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite 8, React Router 7 |
| Backend | Node.js, Express 5 |
| Database | PostgreSQL via Supabase (cloud) |
| AI | Groq SDK — Llama 3.3 70B Versatile |
| Auth | JWT (jsonwebtoken + bcryptjs) |
| PDF | jsPDF (client-side) |
| Transcript | youtube-transcript (no API key needed) |
| Metadata | YouTube oEmbed API (no API key needed) |
| Playlist import | YouTube Data API v3 |

---

## Project Structure

```
quiztube/
├── client/                   # React frontend (Vite)
│   ├── src/
│   │   ├── api/index.js      # Axios instance with auth header
│   │   ├── components/
│   │   │   └── Navbar.jsx    # Nav with streak/XP display
│   │   ├── context/
│   │   │   └── AuthContext.jsx
│   │   ├── pages/
│   │   │   ├── Landing.jsx
│   │   │   ├── Login.jsx
│   │   │   ├── Dashboard.jsx    # Library, search, collections
│   │   │   ├── VideoDetail.jsx  # Notes, Ask AI, quiz, PDF
│   │   │   ├── Quiz.jsx         # Quiz taking UI
│   │   │   ├── Result.jsx       # Score, feedback, share
│   │   │   ├── Stats.jsx        # Charts, badges, streaks
│   │   │   ├── Digest.jsx       # Weekly AI insights
│   │   │   └── SharedQuiz.jsx   # Public shared quiz (no auth)
│   │   └── utils/
│   │       └── generateStudyGuidePDF.js
│   └── index.html
│
└── server/                   # Node.js / Express backend
    ├── ai.js                 # Groq SDK wrapper (ask function)
    ├── index.js              # Entry point, route registration
    ├── middleware/
    │   └── auth.js           # JWT verification middleware
    ├── db/
    │   ├── index.js          # pg Pool with Supabase SSL
    │   ├── schema.sql        # Full database schema
    │   ├── setup.js          # Run schema on first launch
    │   └── migrate.js        # ALTER TABLE migrations
    └── routes/
        ├── auth.js           # Register / login
        ├── videos.js         # CRUD, notes, ask, study-guide
        ├── quizzes.js        # Generate, share
        ├── attempts.js       # Submit, XP, streak, badges
        ├── users.js          # Stats endpoint
        ├── collections.js    # Collections CRUD + membership
        └── digest.js         # Weekly AI digest
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) account (free tier works)
- A [Groq](https://console.groq.com) API key (free)
- A [YouTube Data API v3](https://console.cloud.google.com) key (only needed for playlist import)

### 1. Clone the repo

```bash
git clone https://github.com/Shanmukh-2003/quiztube.git
cd quiztube
```

### 2. Set up the backend

```bash
cd server
npm install
```

Create `server/.env` from the example:

```bash
cp .env.example .env
```

Fill in your values:

```env
PORT=5000
DATABASE_URL=postgresql://postgres:<password>@db.<project-id>.supabase.co:5432/postgres
JWT_SECRET=any_long_random_string
GROQ_API_KEY=gsk_...
YOUTUBE_API_KEY=AIza...        # optional — only for playlist import
```

> **Supabase connection string**: Go to your Supabase project → Settings → Database → Connection string (URI mode). Replace `[YOUR-PASSWORD]` with your database password.

Run the database setup (creates all tables):

```bash
node db/setup.js
```

If you're upgrading an existing database, run migrations instead:

```bash
node db/migrate.js
```

Start the backend:

```bash
npm start          # production
# or
npx nodemon index.js   # development with auto-reload
```

Backend runs on **http://localhost:5000**.

### 3. Set up the frontend

```bash
cd ../client
npm install
npm run dev
```

Frontend runs on **http://localhost:5173**.

---

## API Reference

All routes except auth and `/api/shared/:token` require an `Authorization: Bearer <token>` header.

### Auth
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Sign in, returns JWT |

### Videos
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/videos` | List user's videos |
| POST | `/api/videos` | Add video by YouTube URL |
| GET | `/api/videos/:id` | Get single video |
| PATCH | `/api/videos/:id` | Update thoughts / tags |
| DELETE | `/api/videos/:id` | Delete video |
| POST | `/api/videos/import-playlist` | Bulk import YouTube playlist |
| POST | `/api/videos/:id/notes` | Generate AI notes |
| POST | `/api/videos/:id/ask` | Ask a question about the video |
| POST | `/api/videos/:id/study-guide` | Generate full study guide JSON |

### Quizzes
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/quizzes/video/:videoId` | Get quiz for a video |
| POST | `/api/quizzes/video/:videoId` | Generate quiz (body: `{ difficulty }`) |
| POST | `/api/quizzes/:id/share` | Create share token |
| GET | `/api/shared/:token` | Get quiz by share token (public) |

### Attempts
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/attempts` | List all attempts |
| POST | `/api/attempts` | Submit attempt, awards XP + streak |

### Users
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/users/stats` | Streak, XP, badges, score history, radar data |

### Collections
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/collections` | List collections |
| POST | `/api/collections` | Create collection |
| DELETE | `/api/collections/:id` | Delete collection |
| GET | `/api/collections/:id/videos` | Videos in a collection |
| POST | `/api/collections/:id/videos` | Add video to collection |
| DELETE | `/api/collections/:id/videos/:videoId` | Remove video |

### Digest
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/digest` | Get latest weekly digest |
| POST | `/api/digest/generate` | Force generate new digest |

---

## Key Features In Depth

### Quiz Difficulty
Pass `{ difficulty: "easy" | "medium" | "hard" }` when generating a quiz. The AI adjusts question complexity — easy focuses on recall, hard requires analysis and application.

### XP & Streaks
Every quiz submission awards XP (`score × 10`, +50 bonus for perfect score). Streaks increment when you quiz on consecutive days. Eight badges unlock at milestones: first quiz, perfect score, 10 quizzes, 50 quizzes, 7-day streak, 30-day streak, 500 XP, 1000 XP.

### Spaced Repetition
After each attempt, `next_review` is set automatically:
- Score < 50% → review in 1 day
- Score 50–69% → review in 3 days
- Score 70–89% → review in 7 days
- Score ≥ 90% → no review needed

Videos due for review are highlighted in the dashboard and listed on the Stats page.

### Study Guide PDF
Generated entirely client-side using jsPDF. The dark-themed A4 PDF includes a cover page, learning objectives, overview, content sections with key terms and examples, concept map, common mistakes, practice questions, quiz questions with answers highlighted, summary, and next steps.

### Shared Quizzes
Clicking "Share Quiz" on the result page generates a UUID token stored on the quiz. Anyone with the link (`/shared/:token`) can take the quiz without signing in.

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string (Supabase URI) |
| `JWT_SECRET` | Yes | Secret for signing JWTs |
| `GROQ_API_KEY` | Yes | Groq API key for Llama 3.3 |
| `PORT` | No | Server port (default: 5000) |
| `YOUTUBE_API_KEY` | No | YouTube Data API v3 (playlist import only) |

---

## Database Schema Overview

| Table | Purpose |
|---|---|
| `users` | Accounts with XP, streak, badges, last_active |
| `videos` | YouTube videos with transcript, notes, next_review |
| `tags` | User-defined tags |
| `video_tags` | Many-to-many: videos ↔ tags |
| `quizzes` | Generated quizzes with questions JSON and share_token |
| `attempts` | Quiz attempts with score, answers, AI feedback |
| `collections` | Named video groups |
| `collection_videos` | Many-to-many: collections ↔ videos |
| `digests` | Cached weekly AI digests |

---

## License

MIT
