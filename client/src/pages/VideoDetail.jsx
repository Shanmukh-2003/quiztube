import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../api/index.js';
import { generateStudyGuidePDF } from '../utils/generateStudyGuidePDF.js';

function scoreClass(score, total) {
  const pct = score / (total || 10);
  if (pct <= 0.4) return 'score-low';
  if (pct <= 0.6) return 'score-mid';
  return 'score-high';
}

function Sparkline({ attempts }) {
  if (!attempts || attempts.length < 2) return null;
  const scores = [...attempts].reverse().map(a => a.score / (a.total_questions || 10));
  const W = 120, H = 36, pad = 4;
  const xs = scores.map((_, i) => pad + (i / (scores.length - 1)) * (W - pad * 2));
  const ys = scores.map(s => H - pad - s * (H - pad * 2));
  const path = xs.map((x, i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${ys[i].toFixed(1)}`).join(' ');
  const latest = scores[scores.length - 1];
  const color = latest >= 0.8 ? '#4caf82' : latest >= 0.5 ? '#e0a84f' : '#e05a5a';
  return (
    <svg width={W} height={H} style={{ display: 'block' }}>
      <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" opacity="0.8" />
      <circle cx={xs[xs.length-1]} cy={ys[ys.length-1]} r="3" fill={color} />
    </svg>
  );
}

function useDebounce(fn, delay) {
  const timer = useRef(null);
  return useCallback((...args) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => fn(...args), delay);
  }, [fn, delay]);
}

function SkeletonDetail() {
  return (
    <>
      <Navbar />
      <div style={{ maxWidth: '860px', margin: '0 auto', padding: '2rem 1rem' }}>
        <div className="skeleton" style={{ height: 13, width: 100, marginBottom: '1.5rem' }} />
        <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '2rem' }}>
          <div className="skeleton" style={{ width: 200, height: 113, borderRadius: 10, flexShrink: 0 }} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            <div className="skeleton" style={{ height: 22, width: '70%' }} />
            <div className="skeleton" style={{ height: 13, width: '30%' }} />
          </div>
        </div>
        <div className="skeleton" style={{ height: 140, borderRadius: 14, marginBottom: '1rem' }} />
        <div className="skeleton" style={{ height: 100, borderRadius: 14 }} />
      </div>
    </>
  );
}

function NotesPanel({ videoId, initialNotes }) {
  const [notes, setNotes] = useState(initialNotes ? (typeof initialNotes === 'string' ? JSON.parse(initialNotes) : initialNotes) : null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  async function generate() {
    setGenerating(true);
    setError('');
    try {
      const res = await api.post(`/videos/${videoId}/notes`);
      setNotes(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to generate notes');
    } finally {
      setGenerating(false);
    }
  }

  if (!notes) return (
    <div>
      {error && <div className="error-msg">{error}</div>}
      <button className="btn-secondary" onClick={generate} disabled={generating}>
        {generating ? 'Generating Notes…' : '✨ Generate AI Notes'}
      </button>
    </div>
  );

  return (
    <div>
      <div style={{ marginBottom: '0.75rem', background: 'var(--surface2)', borderRadius: '10px', padding: '1rem', border: '1px solid var(--border)' }}>
        <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.6 }}>{notes.summary}</p>
      </div>
      {[['📌 Key Points', notes.key_points], ['💡 Concepts', notes.concepts], ['🎯 Takeaways', notes.takeaways]].map(([title, items]) =>
        items?.length > 0 && (
          <div key={title} style={{ marginBottom: '0.75rem' }}>
            <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent)', marginBottom: '4px' }}>{title}</p>
            <ul style={{ paddingLeft: '1.2rem', display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {items.map((item, i) => <li key={i} style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.5 }}>{item}</li>)}
            </ul>
          </div>
        )
      )}
      <button className="btn-ghost" onClick={generate} disabled={generating} style={{ fontSize: '12px', marginTop: '4px' }}>
        {generating ? 'Regenerating…' : '↺ Regenerate'}
      </button>
    </div>
  );
}

function AskPanel({ videoId }) {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const history = useRef([]);

  async function handleAsk(e) {
    e.preventDefault();
    if (!question.trim()) return;
    setLoading(true);
    setError('');
    const q = question.trim();
    setQuestion('');
    try {
      const res = await api.post(`/videos/${videoId}/ask`, { question: q });
      history.current = [...history.current, { q, a: res.data.answer }];
      setAnswer(res.data.answer);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to get answer');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      {history.current.map((h, i) => (
        <div key={i} style={{ marginBottom: '0.75rem' }}>
          <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent)', marginBottom: '2px' }}>Q: {h.q}</p>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.6, background: 'var(--surface2)', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--border)' }}>{h.a}</p>
        </div>
      ))}
      {error && <div className="error-msg">{error}</div>}
      <form onSubmit={handleAsk} style={{ display: 'flex', gap: '0.5rem' }}>
        <input
          value={question}
          onChange={e => setQuestion(e.target.value)}
          placeholder="Ask anything about this video…"
          disabled={loading}
          style={{ flex: 1 }}
        />
        <button className="btn-primary" type="submit" disabled={loading || !question.trim()} style={{ flexShrink: 0 }}>
          {loading ? '…' : 'Ask'}
        </button>
      </form>
    </div>
  );
}

export default function VideoDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [video, setVideo] = useState(null);
  const [quiz, setQuiz] = useState(null);
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generatingQuiz, setGeneratingQuiz] = useState(false);
  const [thoughts, setThoughts] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [saveStatus, setSaveStatus] = useState('');
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('notes');
  const [difficulty, setDifficulty] = useState('medium');
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [pdfError, setPdfError] = useState('');

  useEffect(() => { fetchData(); }, [id]);

  async function fetchData() {
    setLoading(true);
    try {
      const [vRes, aRes] = await Promise.all([api.get(`/videos/${id}`), api.get('/attempts')]);
      const v = vRes.data;
      setVideo(v);
      setThoughts(v.thoughts || '');
      setTagInput((v.tags || []).join(', '));
      setAttempts(aRes.data.filter(a => a.video_id === parseInt(id)));
      try {
        const qRes = await api.get(`/quizzes/video/${id}`);
        setQuiz(qRes.data);
        if (qRes.data.difficulty) setDifficulty(qRes.data.difficulty);
      } catch { /* no quiz yet */ }
    } catch { setError('Video not found'); }
    finally { setLoading(false); }
  }

  const saveNotes = useCallback(async (t, tags) => {
    try {
      const parsedTags = tags.split(',').map(s => s.trim()).filter(Boolean);
      await api.patch(`/videos/${id}`, { thoughts: t, tags: parsedTags });
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus(''), 2000);
    } catch { setSaveStatus('error'); }
  }, [id]);

  const debouncedSave = useDebounce(saveNotes, 1200);

  function handleThoughtsChange(val) { setThoughts(val); setSaveStatus('saving'); debouncedSave(val, tagInput); }
  function handleTagChange(val) { setTagInput(val); setSaveStatus('saving'); debouncedSave(thoughts, val); }

  async function handleGenerateQuiz() {
    setGeneratingQuiz(true);
    setError('');
    try {
      const res = await api.post(`/quizzes/video/${id}`, { difficulty });
      setQuiz(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to generate quiz');
    } finally { setGeneratingQuiz(false); }
  }

  async function handleDownloadPDF() {
    setGeneratingPDF(true);
    setPdfError('');
    try {
      const res = await api.post(`/videos/${id}/study-guide`);
      await generateStudyGuidePDF(res.data);
    } catch (err) {
      setPdfError(err.response?.data?.error || 'Failed to generate PDF. Please try again.');
    } finally {
      setGeneratingPDF(false);
    }
  }

  async function handleDelete() {
    if (!confirm('Delete this video and all its quiz data?')) return;
    try {
      await api.delete(`/videos/${id}`);
      navigate('/dashboard');
    } catch { setError('Failed to delete video'); }
  }

  if (loading) return <SkeletonDetail />;
  if (error && !video) return <><Navbar /><div style={{ padding: '2rem', color: 'var(--danger)' }}>{error}</div></>;

  const bestAttempt = attempts.length > 0 ? attempts[0] : null;
  const tabs = [
    { id: 'notes', label: '📝 AI Notes' },
    { id: 'ask', label: '💬 Ask the Video' },
    { id: 'personal', label: '✍️ My Notes' },
  ];

  return (
    <>
      <Navbar />
      <div style={{ maxWidth: '860px', margin: '0 auto', padding: '2rem 1rem' }}>
        <Link to="/dashboard" style={{ color: 'var(--text-muted)', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          ← Back to Library
        </Link>

        <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1.2rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <img
            src={video.thumbnail_url || `https://img.youtube.com/vi/${video.youtube_id}/mqdefault.jpg`}
            alt={video.title}
            style={{ width: '200px', borderRadius: '12px', flexShrink: 0, boxShadow: 'var(--shadow)' }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ fontSize: '20px', fontWeight: 700, lineHeight: 1.35, marginBottom: '0.4rem' }}>{video.title}</h1>
            <a href={`https://www.youtube.com/watch?v=${video.youtube_id}`} target="_blank" rel="noreferrer" style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              Watch on YouTube ↗
            </a>
            <p style={{ marginTop: '0.5rem', fontSize: '13px', color: 'var(--text-muted)' }}>
              Transcript: <strong style={{ color: video.transcript_status === 'ready' ? 'var(--success)' : 'var(--warning)' }}>{video.transcript_status}</strong>
            </p>
            {bestAttempt && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginTop: '0.8rem' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Latest score:</span>
                <span className={`score-badge ${scoreClass(bestAttempt.score, bestAttempt.total_questions)}`}>{bestAttempt.score}/{bestAttempt.total_questions ?? 10}</span>
                <Sparkline attempts={attempts} />
              </div>
            )}
            {video.next_review && new Date(video.next_review) <= new Date() && (
              <div style={{ marginTop: '0.6rem', fontSize: '12px', color: 'var(--warning)', background: 'rgba(255,184,48,0.08)', border: '1px solid rgba(255,184,48,0.2)', borderRadius: '6px', padding: '3px 8px', display: 'inline-block' }}>
                📅 Due for review today
              </div>
            )}
            {video.transcript_status === 'ready' && (
              <div style={{ marginTop: '0.8rem' }}>
                <button
                  onClick={handleDownloadPDF}
                  disabled={generatingPDF}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                    background: generatingPDF ? 'var(--surface2)' : 'linear-gradient(135deg, #00c8ff 0%, #0090d4 100%)',
                    color: generatingPDF ? 'var(--text-muted)' : '#021020',
                    border: 'none', borderRadius: '8px', padding: '0.5rem 1.1rem',
                    fontSize: '13px', fontWeight: 700, cursor: generatingPDF ? 'not-allowed' : 'pointer',
                    boxShadow: generatingPDF ? 'none' : '0 2px 12px rgba(0,200,255,0.3)',
                    transition: 'all 0.15s',
                  }}
                >
                  {generatingPDF ? (
                    <><span style={{ width: 14, height: 14, border: '2px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} /> Generating PDF…</>
                  ) : (
                    <>📥 Download Study Guide PDF</>
                  )}
                </button>
                {pdfError && <p style={{ fontSize: '12px', color: 'var(--danger)', marginTop: '4px' }}>{pdfError}</p>}
              </div>
            )}
          </div>
        </div>

        {error && <div className="error-msg" style={{ marginTop: '1rem' }}>{error}</div>}

        {/* Tabbed notes area */}
        <div className="card" style={{ marginTop: '1.5rem' }}>
          <div style={{ display: 'flex', gap: '4px', marginBottom: '1.2rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
            {tabs.map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)} style={{ background: activeTab === t.id ? 'var(--accent-dim)' : 'transparent', color: activeTab === t.id ? 'var(--accent)' : 'var(--text-muted)', border: activeTab === t.id ? '1px solid rgba(0,200,255,0.3)' : '1px solid transparent', borderRadius: '6px', padding: '0.35rem 0.8rem', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                {t.label}
              </button>
            ))}
          </div>
          {activeTab === 'notes' && <NotesPanel videoId={id} initialNotes={video.notes} />}
          {activeTab === 'ask' && <AskPanel videoId={id} />}
          {activeTab === 'personal' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.5rem' }}>
                {saveStatus === 'saving' && <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Saving…</span>}
                {saveStatus === 'saved' && <span className="autosave-indicator">✓ Saved</span>}
                {saveStatus === 'error' && <span style={{ fontSize: '12px', color: 'var(--danger)' }}>Save failed</span>}
              </div>
              <textarea value={thoughts} onChange={e => handleThoughtsChange(e.target.value)} placeholder="Your thoughts on this video…" style={{ marginBottom: '0.6rem' }} />
              <input value={tagInput} onChange={e => handleTagChange(e.target.value)} placeholder="Tags, comma-separated (e.g. python, beginner)" />
            </div>
          )}
        </div>

        {/* Quiz section */}
        <div className="card" style={{ marginTop: '1.2rem' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '0.8rem' }}>Quiz</h3>
          {video.transcript_status !== 'ready' ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
              Quiz requires a transcript. This video's transcript is <strong>{video.transcript_status}</strong>.
            </p>
          ) : (
            <>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Difficulty:</span>
                {['easy', 'medium', 'hard'].map(d => (
                  <button key={d} onClick={() => setDifficulty(d)} style={{ padding: '0.3rem 0.8rem', borderRadius: '20px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', border: difficulty === d ? 'none' : '1px solid var(--border)', background: difficulty === d ? (d === 'easy' ? 'rgba(0,229,160,0.2)' : d === 'medium' ? 'rgba(0,200,255,0.2)' : 'rgba(255,77,106,0.2)') : 'var(--surface2)', color: difficulty === d ? (d === 'easy' ? 'var(--success)' : d === 'medium' ? 'var(--accent)' : 'var(--danger)') : 'var(--text-muted)' }}>
                    {d.charAt(0).toUpperCase() + d.slice(1)}
                  </button>
                ))}
              </div>
              {quiz ? (
                <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap' }}>
                  <button className="btn-primary" onClick={() => navigate(`/quiz/${id}`)}>Take Quiz</button>
                  <button className="btn-secondary" onClick={handleGenerateQuiz} disabled={generatingQuiz}>
                    {generatingQuiz ? 'Generating…' : 'Regenerate Quiz'}
                  </button>
                </div>
              ) : (
                <button className="btn-primary" onClick={handleGenerateQuiz} disabled={generatingQuiz}>
                  {generatingQuiz ? 'Generating Quiz…' : 'Generate Quiz'}
                </button>
              )}
            </>
          )}
        </div>

        {/* Attempt history */}
        {attempts.length > 0 && (
          <div className="card" style={{ marginTop: '1.2rem' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '0.8rem' }}>Attempt History</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {attempts.map((a, i) => (
                <Link key={a.id} to={`/result/${a.id}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.65rem 0.9rem', background: 'var(--surface2)', borderRadius: '10px', color: 'var(--text)', border: '1px solid var(--border)', transition: 'border-color 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-hover)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {i === 0 && <span style={{ fontSize: '11px', background: 'rgba(124,111,224,0.15)', color: 'var(--accent-hover)', padding: '1px 6px', borderRadius: '10px', fontWeight: 700 }}>Latest</span>}
                    <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{new Date(a.taken_at).toLocaleString()}</span>
                  </div>
                  <span className={`score-badge ${scoreClass(a.score, a.total_questions)}`}>{a.score}/{a.total_questions ?? 10}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        <div style={{ marginTop: '1.5rem', textAlign: 'right' }}>
          <button className="btn-danger" onClick={handleDelete}>Delete Video</button>
        </div>
      </div>
    </>
  );
}
