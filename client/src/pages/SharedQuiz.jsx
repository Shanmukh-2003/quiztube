import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api/index.js';

function CodeText({ text }) {
  if (!text) return null;
  const parts = text.split(/(`[^`]+`)/g);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith('`') && part.endsWith('`')
          ? <code key={i} style={{ background: 'rgba(0,200,255,0.12)', color: '#33d6ff', padding: '1px 6px', borderRadius: '4px', fontFamily: 'monospace', fontSize: '13px' }}>{part.slice(1, -1)}</code>
          : <span key={i}>{part}</span>
      )}
    </>
  );
}

export default function SharedQuiz() {
  const { token } = useParams();
  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [current, setCurrent] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/shared/${token}`)
      .then(r => setQuiz(r.data))
      .catch(() => setError('This quiz link is invalid or has expired.'))
      .finally(() => setLoading(false));
  }, [token]);

  const questions = quiz?.questions_json ?? [];

  const handleKeyDown = useCallback((e) => {
    if (submitted) return;
    if (['1','2','3','4'].includes(e.key)) setAnswers(prev => ({ ...prev, [current]: parseInt(e.key) - 1 }));
    else if (e.key === 'ArrowRight' && current < questions.length - 1) setCurrent(c => c + 1);
    else if (e.key === 'ArrowLeft' && current > 0) setCurrent(c => c - 1);
  }, [current, questions.length, submitted]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  function handleSubmit() {
    const s = questions.reduce((acc, q, i) => acc + (answers[i] === q.correct ? 1 : 0), 0);
    setScore(s);
    setSubmitted(true);
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#050d1a' }}><div className="spinner" /></div>;
  if (error) return <div style={{ textAlign: 'center', padding: '4rem', color: '#ff4d6a', background: '#050d1a', minHeight: '100vh' }}>{error}</div>;

  const q = questions[current];
  const pct = score / questions.length;
  const color = pct >= 0.8 ? '#00e5a0' : pct >= 0.5 ? '#ffb830' : '#ff4d6a';

  return (
    <div style={{ background: '#050d1a', minHeight: '100vh', color: '#dce8f5', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ background: 'rgba(5,13,26,0.95)', borderBottom: '1px solid #1a3050', padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <svg width="22" height="22" viewBox="0 0 32 32" fill="none"><rect width="32" height="32" rx="7" fill="#050d1a" stroke="#1a3050" strokeWidth="1"/><circle cx="15" cy="14" r="8.5" fill="none" stroke="#00c8ff" strokeWidth="2.5"/><polygon points="12,10 21,14 12,18" fill="#00c8ff"/><line x1="21" y1="19.5" x2="26" y2="25" stroke="#00c8ff" strokeWidth="2.5" strokeLinecap="round"/></svg>
        <span style={{ fontWeight: 800, fontSize: '16px' }}>Quiz<span style={{ color: '#00c8ff' }}>Tube</span></span>
        <span style={{ color: '#5e7a99', fontSize: '13px', marginLeft: '8px' }}>Shared Quiz — {quiz?.title}</span>
      </div>

      {submitted ? (
        <div style={{ maxWidth: '600px', margin: '0 auto', padding: '3rem 1rem', textAlign: 'center' }}>
          <div style={{ fontSize: '56px', fontWeight: 800, color }}>{score}/{questions.length}</div>
          <p style={{ color, fontWeight: 600, marginBottom: '2rem' }}>
            {pct >= 0.9 ? '🏆 Outstanding!' : pct >= 0.8 ? '🎉 Excellent!' : pct >= 0.6 ? '👍 Good job!' : '📚 Keep studying!'}
          </p>
          <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {questions.map((q, i) => {
              const isCorrect = answers[i] === q.correct;
              return (
                <div key={i} style={{ background: '#091525', border: `1px solid ${isCorrect ? '#00e5a0' : '#ff4d6a'}`, borderRadius: '10px', padding: '1rem', borderLeft: `3px solid ${isCorrect ? '#00e5a0' : '#ff4d6a'}` }}>
                  <p style={{ fontWeight: 600, fontSize: '14px', marginBottom: '4px' }}>{isCorrect ? '✓' : '✗'} <CodeText text={q.question} /></p>
                  <p style={{ fontSize: '13px', color: '#5e7a99' }}>Correct: <strong style={{ color: '#00e5a0' }}>{q.options[q.correct]}</strong></p>
                  {!isCorrect && answers[i] >= 0 && <p style={{ fontSize: '13px', color: '#5e7a99' }}>Your answer: <strong style={{ color: '#ff4d6a' }}>{q.options[answers[i]]}</strong></p>}
                  <p style={{ fontSize: '12px', color: '#5e7a99', marginTop: '4px' }}>{q.explanation}</p>
                </div>
              );
            })}
          </div>
          <button onClick={() => { setAnswers({}); setSubmitted(false); setCurrent(0); }} style={{ marginTop: '1.5rem', background: 'linear-gradient(135deg,#00c8ff,#0090d4)', color: '#021020', border: 'none', padding: '0.75rem 2rem', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', fontSize: '15px' }}>
            Retake Quiz
          </button>
        </div>
      ) : (
        <div style={{ maxWidth: '680px', margin: '0 auto', padding: '1.5rem 1rem' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '1.5rem' }}>
            {questions.map((_, i) => (
              <button key={i} onClick={() => setCurrent(i)} style={{ width: 32, height: 32, borderRadius: '50%', border: i === current ? 'none' : '1px solid #1a3050', background: i === current ? '#00c8ff' : answers[i] != null ? 'rgba(0,229,160,0.15)' : '#0e1f35', color: i === current ? '#021020' : answers[i] != null ? '#00e5a0' : '#5e7a99', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>{i + 1}</button>
            ))}
          </div>
          <div style={{ background: '#091525', border: '1px solid #1a3050', borderRadius: '14px', padding: '1.5rem', marginBottom: '1rem' }}>
            <p style={{ fontWeight: 600, fontSize: '15px', marginBottom: '1rem', lineHeight: 1.6 }}><CodeText text={q.question} /></p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {q.options.map((opt, oi) => {
                const selected = answers[current] === oi;
                return (
                  <button key={oi} onClick={() => setAnswers(prev => ({ ...prev, [current]: oi }))} style={{ textAlign: 'left', padding: '0.75rem 1rem', borderRadius: '10px', border: selected ? '2px solid #00c8ff' : '1px solid #1a3050', background: selected ? 'rgba(0,200,255,0.1)' : '#0e1f35', color: '#dce8f5', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ width: 26, height: 26, borderRadius: '50%', background: selected ? '#00c8ff' : '#152844', color: selected ? '#021020' : '#5e7a99', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, flexShrink: 0 }}>{['A','B','C','D'][oi]}</span>
                    <CodeText text={opt} />
                  </button>
                );
              })}
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.6rem' }}>
            <button onClick={() => setCurrent(c => Math.max(0, c - 1))} disabled={current === 0} style={{ background: '#0e1f35', border: '1px solid #1a3050', color: '#dce8f5', padding: '0.6rem 1.2rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>← Prev</button>
            {current < questions.length - 1 ? (
              <button onClick={() => setCurrent(c => c + 1)} style={{ background: 'linear-gradient(135deg,#00c8ff,#0090d4)', color: '#021020', border: 'none', padding: '0.6rem 1.2rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 700 }}>Next →</button>
            ) : (
              <button onClick={handleSubmit} style={{ background: 'linear-gradient(135deg,#00c8ff,#0090d4)', color: '#021020', border: 'none', padding: '0.6rem 1.2rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 700 }}>Submit ({Object.keys(answers).length}/{questions.length})</button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
