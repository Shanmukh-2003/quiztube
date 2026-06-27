import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import confetti from 'canvas-confetti';
import Navbar from '../components/Navbar';
import api from '../api/index.js';

function scoreColor(score, total) {
  const pct = score / total;
  if (pct <= 0.4) return 'var(--danger)';
  if (pct <= 0.6) return 'var(--warning)';
  return 'var(--success)';
}

function CodeText({ text }) {
  if (!text) return null;
  const parts = text.split(/(`[^`]+`)/g);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith('`') && part.endsWith('`')
          ? <code key={i} style={{ background: 'rgba(124,111,224,0.15)', color: 'var(--accent-hover)', padding: '1px 6px', borderRadius: '4px', fontFamily: 'monospace', fontSize: '13px' }}>{part.slice(1, -1)}</code>
          : <span key={i}>{part}</span>
      )}
    </>
  );
}

function XPToast({ xp, streak, newBadges }) {
  const [visible, setVisible] = useState(true);
  useEffect(() => { const t = setTimeout(() => setVisible(false), 4000); return () => clearTimeout(t); }, []);
  if (!visible || (!xp && !newBadges?.length)) return null;
  return (
    <div style={{ position: 'fixed', top: '80px', right: '20px', background: 'var(--surface)', border: '1px solid rgba(0,200,255,0.3)', borderRadius: '12px', padding: '0.9rem 1.2rem', boxShadow: 'var(--shadow-lg)', zIndex: 999, minWidth: 200, animation: 'fadeInOut 4s ease forwards' }}>
      {xp > 0 && <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--accent)' }}>+{xp} XP earned! ⭐</p>}
      {streak > 1 && <p style={{ fontSize: '13px', color: '#ff9800', marginTop: '2px' }}>🔥 {streak}-day streak!</p>}
      {newBadges?.map(b => <p key={b.id} style={{ fontSize: '13px', color: 'var(--success)', marginTop: '2px' }}>🏅 New badge: {b.id.replace(/_/g, ' ')}</p>)}
    </div>
  );
}

export default function Result() {
  const { attemptId } = useParams();
  const [attempt, setAttempt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [shareUrl, setShareUrl] = useState('');
  const [shareCopied, setShareCopied] = useState(false);
  const [sharing, setSharing] = useState(false);
  const xpData = useRef(null);

  useEffect(() => {
    api.get(`/attempts/${attemptId}`)
      .then(res => {
        setAttempt(res.data);
        if (res.data.xp_earned !== undefined) {
          xpData.current = { xp: res.data.xp_earned, streak: res.data.streak, newBadges: res.data.new_badges };
        }
      })
      .catch(() => setError('Result not found'))
      .finally(() => setLoading(false));
  }, [attemptId]);

  useEffect(() => {
    if (!attempt) return;
    const questions = typeof attempt.questions_json === 'string' ? JSON.parse(attempt.questions_json) : attempt.questions_json;
    const total = questions?.length ?? 10;
    if (attempt.score / total >= 0.8) {
      const fire = (opts) => confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 }, ...opts });
      fire({ colors: ['#00c8ff', '#9588f0', '#4caf82'] });
      setTimeout(() => fire({ angle: 60, colors: ['#e0a84f', '#fff', '#00c8ff'] }), 300);
      setTimeout(() => fire({ angle: 120, colors: ['#4caf82', '#9588f0', '#e05a5a'] }), 600);
    }
  }, [attempt]);

  async function handleShare() {
    setSharing(true);
    try {
      const { score, questions_json: qs } = attempt;
      const questions = typeof qs === 'string' ? JSON.parse(qs) : qs;
      const quizId = attempt.quiz_id;
      const res = await api.post(`/quizzes/${quizId}/share`);
      const url = `${window.location.origin}/shared/${res.data.token}`;
      setShareUrl(url);
      await navigator.clipboard.writeText(url);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setSharing(false);
    }
  }

  function handlePrint() {
    window.print();
  }

  if (loading) return <><Navbar /><div className="spinner" /></>;
  if (error) return <><Navbar /><div style={{ padding: '2rem', color: 'var(--danger)' }}>{error}</div></>;

  const { score, suggestion_json: sg, questions_json: qs, answers_json: ans, video_title, video_id, youtube_id, quiz_id } = attempt;
  const suggestion = typeof sg === 'string' ? JSON.parse(sg) : sg;
  const questions = typeof qs === 'string' ? JSON.parse(qs) : qs;
  const answers = typeof ans === 'string' ? JSON.parse(ans) : ans;
  const total = questions?.length ?? 10;
  const pct = score / total;
  const color = scoreColor(score, total);

  return (
    <>
      <Navbar />
      {xpData.current && <XPToast {...xpData.current} />}
      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '2rem 1rem' }} className="print-area">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          <Link to={`/video/${video_id}`} style={{ color: 'var(--text-muted)', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            ← Back to Video
          </Link>
          <div style={{ display: 'flex', gap: '0.5rem' }} className="no-print">
            <button className="btn-secondary" onClick={handleShare} disabled={sharing} style={{ fontSize: '13px', padding: '0.4rem 0.9rem' }}>
              {shareCopied ? '✓ Link Copied!' : sharing ? 'Sharing…' : '🔗 Share Quiz'}
            </button>
            <button className="btn-secondary" onClick={handlePrint} style={{ fontSize: '13px', padding: '0.4rem 0.9rem' }}>
              📄 Export PDF
            </button>
          </div>
        </div>

        {shareUrl && (
          <div style={{ marginTop: '0.75rem', padding: '0.6rem 1rem', background: 'var(--surface2)', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem' }} className="no-print">
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{shareUrl}</span>
            <button onClick={() => { navigator.clipboard.writeText(shareUrl); setShareCopied(true); }} style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: '12px', cursor: 'pointer', fontWeight: 600, flexShrink: 0 }}>Copy</button>
          </div>
        )}

        {/* Score hero */}
        <div style={{ textAlign: 'center', margin: '2.5rem 0 2rem' }}>
          <div style={{ position: 'relative', display: 'inline-block', marginBottom: '1.2rem' }}>
            <svg width="120" height="120" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="52" fill="none" stroke="var(--surface2)" strokeWidth="8" />
              <circle cx="60" cy="60" r="52" fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 52}`}
                strokeDashoffset={`${2 * Math.PI * 52 * (1 - pct)}`}
                transform="rotate(-90 60 60)" style={{ transition: 'stroke-dashoffset 1s ease' }} />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: '28px', fontWeight: 800, color }}>{score}</span>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>/ {total}</span>
            </div>
          </div>
          <h2 style={{ fontSize: '17px', fontWeight: 700, marginBottom: '0.25rem' }}>{video_title}</h2>
          <p style={{ color, fontSize: '14px', fontWeight: 600 }}>
            {pct >= 0.9 ? '🏆 Outstanding!' : pct >= 0.8 ? '🎉 Excellent!' : pct >= 0.6 ? '👍 Good job!' : pct >= 0.4 ? '📚 Keep studying' : '💪 Don\'t give up!'}
          </p>
        </div>

        {/* AI Feedback */}
        {suggestion && (
          <div className="card" style={{ marginBottom: '1.5rem', borderLeft: `3px solid ${color}` }}>
            <h3 style={{ fontSize: '14px', color, marginBottom: '0.6rem', fontWeight: 700 }}>{suggestion.headline}</h3>
            <p style={{ fontSize: '14px', lineHeight: 1.75, color: 'var(--text-muted)' }}>{suggestion.body}</p>
            {suggestion.tips?.length > 0 && (
              <ul style={{ marginTop: '0.9rem', paddingLeft: '1.2rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {suggestion.tips.map((tip, i) => <li key={i} style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{tip}</li>)}
              </ul>
            )}
            {suggestion.bonus_question && (
              <div style={{ marginTop: '1.1rem', background: 'var(--surface2)', borderRadius: '10px', padding: '1rem', border: '1px solid var(--border)' }}>
                <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent-hover)', marginBottom: '4px' }}>🧠 Bonus Challenge</p>
                <p style={{ fontSize: '13px' }}>{suggestion.bonus_question}</p>
                <details style={{ marginTop: '0.6rem' }}>
                  <summary style={{ fontSize: '12px', color: 'var(--text-muted)', cursor: 'pointer' }}>Reveal Answer</summary>
                  <p style={{ fontSize: '13px', color: 'var(--success)', marginTop: '6px' }}>{suggestion.bonus_answer}</p>
                </details>
              </div>
            )}
          </div>
        )}

        {/* Question breakdown */}
        <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Question Breakdown
        </h3>
        {questions?.map((q, i) => {
          const userAnswer = answers?.[i];
          const isCorrect = userAnswer === q.correct;
          return (
            <div key={i} className="card" style={{ marginBottom: '0.7rem', borderLeft: `3px solid ${isCorrect ? 'var(--success)' : 'var(--danger)'}`, padding: '1rem 1.2rem' }}>
              <p style={{ fontWeight: 600, fontSize: '14px', marginBottom: '0.5rem', display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                <span style={{ color: isCorrect ? 'var(--success)' : 'var(--danger)', flexShrink: 0, marginTop: '2px' }}>{isCorrect ? '✓' : '✗'}</span>
                <CodeText text={q.question} />
              </p>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                Correct: <strong style={{ color: 'var(--success)' }}><CodeText text={q.options[q.correct]} /></strong>
              </p>
              {!isCorrect && userAnswer != null && userAnswer >= 0 && (
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Your answer: <strong style={{ color: 'var(--danger)' }}><CodeText text={q.options[userAnswer]} /></strong>
                </p>
              )}
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px', lineHeight: 1.5 }}>{q.explanation}</p>
              {!isCorrect && q.timestamp_hint && (
                <p style={{ fontSize: '12px', color: 'var(--accent)', marginTop: '6px' }}>
                  📍 Revisit: {q.timestamp_hint} —{' '}
                  <a href={`https://www.youtube.com/watch?v=${youtube_id}`} target="_blank" rel="noreferrer">open video ↗</a>
                </p>
              )}
            </div>
          );
        })}

        <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.8rem', flexWrap: 'wrap' }} className="no-print">
          <Link to={`/quiz/${video_id}`} className="btn-primary" style={{ padding: '0.7rem 1.4rem' }}>Retake Quiz</Link>
          <Link to="/dashboard" className="btn-secondary" style={{ padding: '0.7rem 1.4rem' }}>Back to Library</Link>
        </div>
      </div>
    </>
  );
}
