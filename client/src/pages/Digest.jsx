import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import api from '../api/index.js';

// Weekly digest page showing learning summary and next-week plan
export default function Digest() {
  const [digest, setDigest] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDigest();
  }, []);

  async function fetchDigest() {
    setLoading(true);
    setError('');
    try {
      const [curRes, histRes] = await Promise.all([
        api.get('/digest/current'),
        api.get('/digest/history'),
      ]);
      setDigest(curRes.data);
      setHistory(histRes.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load digest');
    } finally {
      setLoading(false);
    }
  }

  async function handleRegenerate() {
    setRegenerating(true);
    setError('');
    try {
      const res = await api.post('/digest/current/regenerate');
      setDigest(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to regenerate');
    } finally {
      setRegenerating(false);
    }
  }

  const digestData = digest ? (typeof digest.digest_json === 'string' ? JSON.parse(digest.digest_json) : digest.digest_json) : null;

  return (
    <>
      <Navbar />
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem 1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h1 style={{ fontSize: '20px', fontWeight: 700 }}>Weekly Learning Insights</h1>
          <button className="btn-secondary" onClick={handleRegenerate} disabled={regenerating || loading}>
            {regenerating ? 'Regenerating…' : '↻ Refresh'}
          </button>
        </div>

        {error && <div className="error-msg">{error}</div>}

        {loading ? (
          <div className="spinner" />
        ) : !digestData ? (
          <div className="card" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem' }}>
            No learning activity this week yet. Add videos and take quizzes to get your digest!
          </div>
        ) : (
          <>
            <div className="card" style={{ marginBottom: '1.2rem' }}>
              <h3 style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>Week of {new Date(digest.week_start).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</h3>
              <p style={{ fontSize: '15px', lineHeight: 1.7 }}>{digestData.week_summary}</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.2rem' }}>
              <div className="card">
                <h3 style={{ fontSize: '14px', color: 'var(--success)', marginBottom: '0.6rem' }}>Strengths</h3>
                <ul style={{ paddingLeft: '1rem' }}>
                  {digestData.strengths?.map((s, i) => (
                    <li key={i} style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '4px' }}>{s}</li>
                  ))}
                </ul>
              </div>
              <div className="card">
                <h3 style={{ fontSize: '14px', color: 'var(--warning)', marginBottom: '0.6rem' }}>Areas to Improve</h3>
                <ul style={{ paddingLeft: '1rem' }}>
                  {digestData.areas_to_improve?.map((a, i) => (
                    <li key={i} style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '4px' }}>{a}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="card" style={{ marginBottom: '1.2rem' }}>
              <h3 style={{ fontSize: '14px', color: 'var(--accent-hover)', marginBottom: '0.4rem' }}>Score Trend</h3>
              <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>{digestData.score_trend}</p>
            </div>

            <div className="card" style={{ marginBottom: '1.2rem', borderLeft: '3px solid var(--accent)' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '0.5rem' }}>Next Week's Plan</h3>
              <p style={{ fontSize: '14px', lineHeight: 1.7, color: 'var(--text-muted)' }}>{digestData.next_week_plan}</p>
            </div>

            {digestData.motivational_quote && (
              <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '14px' }}>
                "{digestData.motivational_quote}"
              </div>
            )}
          </>
        )}

        {/* Past digests */}
        {history.length > 1 && (
          <div style={{ marginTop: '2rem' }}>
            <h2 style={{ fontSize: '16px', marginBottom: '0.8rem' }}>Past Insights</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {history.slice(1).map(d => {
                const dData = typeof d.digest_json === 'string' ? JSON.parse(d.digest_json) : d.digest_json;
                return (
                  <div key={d.id} className="card" style={{ padding: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <span style={{ fontSize: '13px', fontWeight: 600 }}>Week of {d.week_start}</span>
                        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '3px' }}>{dData.week_summary?.slice(0, 120)}…</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
