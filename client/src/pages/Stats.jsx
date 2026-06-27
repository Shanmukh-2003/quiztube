import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../api/index.js';

const BADGE_META = {
  first_quiz:    { icon: '🎯', label: 'First Quiz',     desc: 'Completed your first quiz' },
  perfect_score: { icon: '💯', label: 'Perfect Score',  desc: 'Got 10/10 on a quiz' },
  quiz_10:       { icon: '📚', label: 'Quiz Veteran',   desc: 'Completed 10 quizzes' },
  quiz_50:       { icon: '🏆', label: 'Quiz Master',    desc: 'Completed 50 quizzes' },
  streak_7:      { icon: '🔥', label: '7-Day Streak',   desc: 'Learned 7 days in a row' },
  streak_30:     { icon: '⚡', label: '30-Day Streak',  desc: 'Learned 30 days in a row' },
  xp_500:        { icon: '⭐', label: 'Rising Star',    desc: 'Earned 500 XP' },
  xp_1000:       { icon: '🌟', label: 'Superstar',      desc: 'Earned 1000 XP' },
};

function ScoreChart({ history }) {
  if (!history || history.length < 2) return (
    <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Take at least 2 quizzes to see your chart.</p>
  );
  const W = 500, H = 160, padX = 30, padY = 16;
  const points = history.map((h, i) => ({
    x: padX + (i / (history.length - 1)) * (W - padX * 2),
    y: padY + (1 - h.score / (h.total || 10)) * (H - padY * 2),
    score: h.score,
    total: h.total || 10,
    date: new Date(h.taken_at).toLocaleDateString(),
  }));
  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const areaD = pathD + ` L${points[points.length-1].x},${H - padY} L${points[0].x},${H - padY} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto' }}>
      <defs>
        <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#00c8ff" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#00c8ff" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 0.5, 1].map(pct => {
        const y = padY + (1 - pct) * (H - padY * 2);
        return (
          <g key={pct}>
            <line x1={padX} y1={y} x2={W - padX} y2={y} stroke="#1a3050" strokeWidth="1" strokeDasharray="4 4" />
            <text x={padX - 4} y={y + 4} fontSize="10" fill="#5e7a99" textAnchor="end">{Math.round(pct * 10)}</text>
          </g>
        );
      })}
      <path d={areaD} fill="url(#chartGrad)" />
      <path d={pathD} fill="none" stroke="#00c8ff" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="4" fill="#00c8ff">
          <title>{p.date}: {p.score}/{p.total}</title>
        </circle>
      ))}
    </svg>
  );
}

function RadarChart({ data }) {
  if (!data || data.length < 3) return (
    <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Quiz at least 3 different tags to see your radar chart.</p>
  );
  const cx = 150, cy = 150, R = 110;
  const n = data.length;
  const angleStep = (2 * Math.PI) / n;
  const getPoint = (i, r) => ({
    x: cx + r * Math.sin(i * angleStep),
    y: cy - r * Math.cos(i * angleStep),
  });
  const gridLevels = [0.25, 0.5, 0.75, 1];
  const dataPoints = data.map((d, i) => getPoint(i, R * Math.min(d.avg_pct || 0, 1)));
  const polyPath = dataPoints.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') + 'Z';

  return (
    <svg viewBox="0 0 300 300" style={{ width: '100%', maxWidth: 300, height: 'auto' }}>
      {gridLevels.map(lvl =>
        <polygon key={lvl}
          points={data.map((_, i) => { const p = getPoint(i, R * lvl); return `${p.x.toFixed(1)},${p.y.toFixed(1)}`; }).join(' ')}
          fill="none" stroke="#1a3050" strokeWidth="1"
        />
      )}
      {data.map((_, i) => {
        const p = getPoint(i, R);
        return <line key={i} x1={cx} y1={cy} x2={p.x.toFixed(1)} y2={p.y.toFixed(1)} stroke="#1a3050" strokeWidth="1" />;
      })}
      <polygon points={dataPoints.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')}
        fill="rgba(0,200,255,0.15)" stroke="#00c8ff" strokeWidth="2" />
      {data.map((d, i) => {
        const p = getPoint(i, R + 20);
        return <text key={i} x={p.x.toFixed(1)} y={p.y.toFixed(1)} fontSize="11" fill="#5e7a99" textAnchor="middle" dominantBaseline="middle">{d.tag}</text>;
      })}
    </svg>
  );
}

export default function Stats() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/users/stats')
      .then(r => setStats(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <><Navbar /><div className="spinner" /></>;

  const earnedBadges = stats?.badges || [];
  const allBadgeKeys = Object.keys(BADGE_META);

  return (
    <>
      <Navbar />
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem 1rem' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '1.5rem' }}>Your Stats</h1>

        {/* Streak + XP row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          {[
            { label: 'Day Streak', value: `${stats?.streak || 0} 🔥`, color: '#ff9800' },
            { label: 'Total XP', value: `${stats?.xp || 0} ⭐`, color: '#00c8ff' },
            { label: 'Quizzes Taken', value: stats?.score_history?.length || 0, color: '#00e5a0' },
            { label: 'Reviews Due', value: stats?.due_for_review?.length || 0, color: '#ff4d6a' },
          ].map(s => (
            <div key={s.label} className="card" style={{ textAlign: 'center', padding: '1.2rem' }}>
              <div style={{ fontSize: '28px', fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Score history chart */}
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '1rem' }}>Score History</h2>
          <ScoreChart history={stats?.score_history} />
        </div>

        {/* Radar + Review side by side */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
          <div className="card">
            <h2 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '1rem' }}>Topic Performance</h2>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <RadarChart data={stats?.radar} />
            </div>
          </div>
          <div className="card">
            <h2 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '1rem' }}>Due for Review</h2>
            {!stats?.due_for_review?.length ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>No videos due — keep it up!</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {stats.due_for_review.map(v => (
                  <Link key={v.id} to={`/video/${v.id}`} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem', background: 'var(--surface2)', borderRadius: '8px', border: '1px solid var(--border)', color: 'var(--text)' }}>
                    <img src={v.thumbnail_url || `https://img.youtube.com/vi/${v.youtube_id}/default.jpg`} style={{ width: 48, height: 27, borderRadius: 4, objectFit: 'cover', flexShrink: 0 }} alt="" />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.title}</div>
                      <div style={{ fontSize: '11px', color: 'var(--danger)' }}>Due: {new Date(v.next_review).toLocaleDateString()}</div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Badges */}
        <div className="card">
          <h2 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '1rem' }}>Badges</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '0.75rem' }}>
            {allBadgeKeys.map(id => {
              const meta = BADGE_META[id];
              const earned = earnedBadges.find(b => b.id === id);
              return (
                <div key={id} style={{ padding: '1rem', background: earned ? 'var(--surface2)' : 'var(--surface)', border: `1px solid ${earned ? 'rgba(0,200,255,0.3)' : 'var(--border)'}`, borderRadius: '10px', opacity: earned ? 1 : 0.4, textAlign: 'center' }}>
                  <div style={{ fontSize: '28px', marginBottom: '4px' }}>{meta.icon}</div>
                  <div style={{ fontSize: '13px', fontWeight: 700 }}>{meta.label}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{meta.desc}</div>
                  {earned && <div style={{ fontSize: '10px', color: 'var(--accent)', marginTop: '4px' }}>{new Date(earned.earned_at).toLocaleDateString()}</div>}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
