import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/index.js';

function LogoIcon({ size = 26 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="32" height="32" rx="7" fill="#050d1a" stroke="#1a3050" strokeWidth="1"/>
      <circle cx="15" cy="14" r="8.5" fill="none" stroke="#00c8ff" strokeWidth="2.5"/>
      <polygon points="12,10 21,14 12,18" fill="#00c8ff"/>
      <line x1="21" y1="19.5" x2="26" y2="25" stroke="#00c8ff" strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  );
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (!user) return;
    api.get('/users/stats').then(r => setStats(r.data)).catch(() => {});
  }, [user]);

  function handleLogout() {
    logout();
    window.location.href = '/';
  }

  return (
    <nav style={{
      background: 'rgba(5,13,26,0.92)',
      backdropFilter: 'blur(16px)',
      borderBottom: '1px solid var(--border)',
      padding: '0 1.5rem',
      height: '57px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      position: 'sticky',
      top: 0,
      zIndex: 100,
    }}>
      <Link to="/" style={{ fontWeight: 800, fontSize: '17px', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '9px', letterSpacing: '-0.3px' }}>
        <LogoIcon size={26} />
        <span>Quiz<span style={{ color: 'var(--accent)' }}>Tube</span></span>
      </Link>

      {user ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link to="/dashboard" style={{ color: 'var(--text-muted)', fontSize: '14px', fontWeight: 500 }}>Library</Link>
          <Link to="/digest" style={{ color: 'var(--text-muted)', fontSize: '14px', fontWeight: 500 }}>Insights</Link>
          <Link to="/stats" style={{ color: 'var(--text-muted)', fontSize: '14px', fontWeight: 500 }}>Stats</Link>
          <span style={{ color: 'var(--border)', fontSize: '18px' }}>|</span>
          {stats && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              {stats.streak > 0 && (
                <span style={{ fontSize: '13px', color: '#ff9800', fontWeight: 700 }}>🔥 {stats.streak}</span>
              )}
              <span style={{ fontSize: '13px', color: 'var(--accent)', fontWeight: 700 }}>⭐ {stats.xp}</span>
            </div>
          )}
          <button className="btn-secondary" style={{ padding: '0.3rem 0.9rem', fontSize: '13px' }} onClick={handleLogout}>Logout</button>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Link to="/login" className="btn-secondary" style={{ padding: '0.35rem 1rem', fontSize: '13px' }}>Sign In</Link>
          <Link to="/login?tab=signup" className="btn-primary" style={{ padding: '0.35rem 1rem', fontSize: '13px' }}>Sign Up</Link>
        </div>
      )}
    </nav>
  );
}
