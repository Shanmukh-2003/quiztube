import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../api/index.js';

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

export default function Quiz() {
  const { videoId } = useParams();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    api.get(`/quizzes/video/${videoId}`)
      .then(res => setQuiz(res.data))
      .catch(() => setError('No quiz found. Generate one from the video page.'))
      .finally(() => setLoading(false));
  }, [videoId]);

  const questions = quiz?.questions_json ?? [];
  const answered = Object.keys(answers).length;

  function selectAnswer(qIdx, optIdx) {
    setAnswers(prev => ({ ...prev, [qIdx]: optIdx }));
  }

  const handleKeyDown = useCallback((e) => {
    if (!quiz || submitting) return;
    const key = e.key;
    if (['1','2','3','4'].includes(key)) {
      selectAnswer(current, parseInt(key) - 1);
    } else if (key === 'ArrowRight' || key === 'Enter') {
      if (current < questions.length - 1) setCurrent(c => c + 1);
    } else if (key === 'ArrowLeft') {
      if (current > 0) setCurrent(c => c - 1);
    }
  }, [quiz, current, questions.length, submitting]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  async function handleSubmit() {
    const answersArr = questions.map((_, i) => answers[i] ?? -1);
    const unanswered = answersArr.filter(a => a === -1).length;
    if (unanswered > 0 && !confirm(`${unanswered} question(s) unanswered. Submit anyway?`)) return;
    setSubmitting(true);
    try {
      const res = await api.post('/attempts', { quiz_id: quiz.id, answers: answersArr });
      navigate(`/result/${res.data.id}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit quiz');
      setSubmitting(false);
    }
  }

  if (loading) return <><Navbar /><div className="spinner" /></>;
  if (error) return <><Navbar /><div style={{ padding: '2rem', color: 'var(--danger)' }}>{error}</div></>;

  const q = questions[current];
  const progress = (answered / questions.length) * 100;

  return (
    <>
      <Navbar />

      {/* Sticky progress bar */}
      <div className="quiz-progress-bar">
        <div style={{ maxWidth: '720px', margin: '0 auto', padding: '0 1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Question {current + 1} / {questions.length}
            </span>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              {answered} answered
            </span>
          </div>
          <div className="quiz-progress-track">
            <div className="quiz-progress-fill" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '1.5rem 1rem 3rem' }}>

        {/* Question dot navigation */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '1.5rem' }}>
          {questions.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              style={{
                width: '32px', height: '32px', borderRadius: '50%', padding: 0,
                fontSize: '12px', fontWeight: 700,
                background: i === current ? 'var(--accent)' : answers[i] != null ? 'rgba(76,175,130,0.18)' : 'var(--surface2)',
                color: i === current ? '#fff' : answers[i] != null ? 'var(--success)' : 'var(--text-muted)',
                border: i === current ? 'none' : '1px solid var(--border)',
                boxShadow: i === current ? '0 2px 10px rgba(124,111,224,0.45)' : 'none',
                transition: 'all 0.15s',
              }}
            >
              {i + 1}
            </button>
          ))}
        </div>

        {/* Question card */}
        <div className="card" style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.1rem' }}>
            <p style={{ fontWeight: 600, lineHeight: 1.6, flex: 1, fontSize: '15px' }}>
              <CodeText text={q.question} />
            </p>
            {q.type === 'coding' && (
              <span style={{
                background: 'rgba(124,111,224,0.15)', color: 'var(--accent-hover)',
                fontSize: '11px', fontWeight: 700, padding: '3px 8px',
                borderRadius: '20px', marginLeft: '0.8rem', whiteSpace: 'nowrap',
                border: '1px solid rgba(124,111,224,0.2)',
              }}>
                {'</>'} CODE
              </span>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {q.options.map((opt, oi) => {
              const selected = answers[current] === oi;
              return (
                <button
                  key={oi}
                  onClick={() => selectAnswer(current, oi)}
                  style={{
                    textAlign: 'left', padding: '0.75rem 1rem', borderRadius: '10px',
                    border: selected ? '2px solid var(--accent)' : '1px solid var(--border)',
                    background: selected ? 'rgba(124,111,224,0.1)' : 'var(--surface2)',
                    color: 'var(--text)', fontWeight: selected ? 600 : 400,
                    fontSize: '14px', cursor: 'pointer', transition: 'all 0.12s',
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                    boxShadow: selected ? '0 0 0 1px rgba(124,111,224,0.25)' : 'none',
                  }}
                >
                  <span style={{
                    width: '26px', height: '26px', borderRadius: '50%', flexShrink: 0,
                    background: selected ? 'var(--accent)' : 'var(--surface3)',
                    color: selected ? '#fff' : 'var(--text-muted)',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '12px', fontWeight: 700, transition: 'all 0.12s',
                  }}>
                    {['A','B','C','D'][oi]}
                  </span>
                  <CodeText text={opt} />
                </button>
              );
            })}
          </div>

          <p style={{ fontSize: '11px', color: 'var(--text-subtle)', marginTop: '1rem' }}>
            Press{' '}
            <kbd style={{ background: 'var(--surface3)', padding: '1px 5px', borderRadius: '3px', fontFamily: 'monospace', fontSize: '11px' }}>1–4</kbd>
            {' '}to select ·{' '}
            <kbd style={{ background: 'var(--surface3)', padding: '1px 5px', borderRadius: '3px', fontFamily: 'monospace', fontSize: '11px' }}>← →</kbd>
            {' '}to navigate
          </p>
        </div>

        {/* Nav buttons */}
        <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'space-between' }}>
          <button
            className="btn-secondary"
            onClick={() => setCurrent(c => Math.max(0, c - 1))}
            disabled={current === 0}
          >
            ← Previous
          </button>
          {current < questions.length - 1 ? (
            <button className="btn-primary" onClick={() => setCurrent(c => c + 1)}>
              Next →
            </button>
          ) : (
            <button className="btn-primary" onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Submitting…' : `Submit (${answered}/${questions.length} answered)`}
            </button>
          )}
        </div>

        {error && <div className="error-msg" style={{ marginTop: '1rem' }}>{error}</div>}
      </div>
    </>
  );
}
