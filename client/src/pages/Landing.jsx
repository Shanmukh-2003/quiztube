import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const features = [
  {
    icon: '▶',
    title: 'Paste Any YouTube URL',
    desc: 'Add any YouTube video to your library. We pull the title, thumbnail, and full transcript automatically — no manual work.',
  },
  {
    icon: '🧠',
    title: 'AI-Generated Quiz',
    desc: 'Get a 10-question quiz tailored to the video\'s actual content — conceptual questions for tutorials, coding challenges for programming videos.',
  },
  {
    icon: '🎯',
    title: 'Tiered AI Feedback',
    desc: 'Receive personalised feedback from a patient tutor, supportive mentor, or enthusiastic coach — based on how you scored.',
  },
  {
    icon: '📊',
    title: 'Weekly Learning Insights',
    desc: 'Every week, get an AI summary of what you learned, your strengths, areas to improve, and a personalised plan for next week.',
  },
];

const steps = [
  { num: '01', title: 'Add a Video', desc: 'Paste a YouTube link. We fetch the transcript and metadata instantly.' },
  { num: '02', title: 'Take the Quiz', desc: 'Answer 10 AI-generated questions based on the actual video content.' },
  { num: '03', title: 'Get Smarter', desc: 'Read your AI tutor feedback, revisit weak spots, and track weekly progress.' },
];

export default function Landing() {
  const { user } = useAuth();

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)' }}>

      {/* NAV */}
      <nav style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '1rem 2rem',
        borderBottom: '1px solid var(--border)',
        position: 'sticky', top: 0,
        background: 'rgba(5,13,26,0.88)',
        backdropFilter: 'blur(16px)',
        zIndex: 100,
      }}>
        <span style={{ fontWeight: 800, fontSize: '17px', letterSpacing: '-0.3px', display: 'flex', alignItems: 'center', gap: '9px' }}>
          <svg width="24" height="24" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="32" height="32" rx="7" fill="#050d1a" stroke="#1a3050" strokeWidth="1"/>
            <circle cx="15" cy="14" r="8.5" fill="none" stroke="#00c8ff" strokeWidth="2.5"/>
            <polygon points="12,10 21,14 12,18" fill="#00c8ff"/>
            <line x1="21" y1="19.5" x2="26" y2="25" stroke="#00c8ff" strokeWidth="2.5" strokeLinecap="round"/>
          </svg>
          Quiz<span style={{ color: 'var(--accent)' }}>Tube</span>
        </span>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {user ? (
            <Link to="/dashboard" className="btn-primary" style={{ padding: '0.45rem 1.1rem', borderRadius: '8px', fontSize: '14px' }}>
              Go to Library →
            </Link>
          ) : (
            <>
              <Link to="/login" className="btn-secondary" style={{ padding: '0.45rem 1.1rem', borderRadius: '8px', fontSize: '14px' }}>
                Sign In
              </Link>
              <Link to="/login?tab=signup" className="btn-primary" style={{ padding: '0.45rem 1.1rem', borderRadius: '8px', fontSize: '14px' }}>
                Sign Up
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* HERO */}
      <section style={{ textAlign: 'center', padding: '6rem 1.5rem 4rem', position: 'relative', overflow: 'hidden' }}>
        {/* Background glows */}
        <div style={{
          position: 'absolute', top: '-60px', left: '50%', transform: 'translateX(-50%)',
          width: '700px', height: '400px',
          background: 'radial-gradient(ellipse, rgba(0,200,255,0.12) 0%, transparent 65%)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', top: '40%', left: '10%',
          width: '300px', height: '300px',
          background: 'radial-gradient(ellipse, rgba(0,144,212,0.07) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        {/* Badge */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '6px',
          background: 'rgba(0,200,255,0.08)',
          border: '1px solid rgba(0,200,255,0.25)',
          borderRadius: '20px', padding: '4px 14px',
          fontSize: '13px', color: 'var(--accent)',
          marginBottom: '1.6rem', fontWeight: 600,
        }}>
          ✦ AI-Powered YouTube Learning
        </div>

        <h1 style={{
          fontSize: 'clamp(2.2rem, 6vw, 4rem)', fontWeight: 900,
          lineHeight: 1.12, letterSpacing: '-2px', marginBottom: '1.2rem',
        }}>
          Watch. Quiz. Learn.<br />
          <span style={{
            background: 'linear-gradient(135deg, #00c8ff 0%, #0090d4 60%, #00e5a0 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            Actually Retain It.
          </span>
        </h1>

        <p style={{ fontSize: '1.1rem', color: 'var(--text-muted)', maxWidth: '500px', margin: '0 auto 2.5rem', lineHeight: 1.75 }}>
          Turn any YouTube video into an interactive quiz with AI feedback.
          Stop passively watching — start actively learning.
        </p>

        <div style={{ display: 'flex', gap: '0.9rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          {user ? (
            <Link to="/dashboard" className="btn-primary" style={{
              padding: '0.85rem 2.2rem', fontSize: '16px', borderRadius: '10px',
              boxShadow: '0 0 36px rgba(0,200,255,0.3)',
            }}>
              Go to Library →
            </Link>
          ) : (
            <>
              <Link to="/login?tab=signup" className="btn-primary" style={{
                padding: '0.85rem 2.2rem', fontSize: '16px', borderRadius: '10px',
                boxShadow: '0 0 36px rgba(0,200,255,0.3)',
              }}>
                Sign Up
              </Link>
              <Link to="/login" className="btn-secondary" style={{ padding: '0.85rem 2.2rem', fontSize: '16px', borderRadius: '10px' }}>
                Sign In
              </Link>
            </>
          )}
        </div>

        {/* Mock UI */}
        <div style={{
          maxWidth: '740px', margin: '4.5rem auto 0',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '18px', overflow: 'hidden',
          boxShadow: '0 40px 100px rgba(0,0,0,0.6), 0 0 0 1px rgba(0,200,255,0.08)',
        }}>
          <div style={{
            background: 'var(--surface2)', padding: '0.65rem 1rem',
            display: 'flex', alignItems: 'center', gap: '6px',
            borderBottom: '1px solid var(--border)',
          }}>
            {['#ff4d6a','#ffb830','#00e5a0'].map(c => (
              <div key={c} style={{ width: 11, height: 11, borderRadius: '50%', background: c, opacity: 0.75 }} />
            ))}
            <div style={{
              flex: 1, background: 'var(--bg)', borderRadius: '6px',
              padding: '3px 12px', fontSize: '12px', color: 'var(--text-muted)',
              marginLeft: '8px', textAlign: 'left',
            }}>
              localhost:5173/dashboard
            </div>
          </div>
          <div style={{ padding: '1.4rem', textAlign: 'left' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '1rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Your Library (3)</div>
            {[
              { title: 'Learn Python – Full Course for Beginners', score: '8/10', color: '#00e5a0', bg: 'rgba(0,229,160,0.12)', border: 'rgba(0,229,160,0.25)' },
              { title: 'How To Get Transcript From YouTube Video?', score: '7/10', color: '#00e5a0', bg: 'rgba(0,229,160,0.12)', border: 'rgba(0,229,160,0.25)' },
              { title: 'Scaling Your AI Models with Micro-DDP', score: '5/10', color: '#ffb830', bg: 'rgba(255,184,48,0.12)', border: 'rgba(255,184,48,0.25)' },
            ].map((v, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '0.65rem 0.9rem', background: 'var(--surface2)',
                borderRadius: '10px', marginBottom: '0.5rem',
                border: '1px solid var(--border)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: 42, height: 28, background: 'var(--surface3)', borderRadius: '5px', flexShrink: 0 }} />
                  <span style={{ fontSize: '13px', fontWeight: 600 }}>{v.title}</span>
                </div>
                <span style={{
                  background: v.bg, color: v.color, border: `1px solid ${v.border}`,
                  borderRadius: '20px', padding: '2px 10px', fontSize: '12px', fontWeight: 700, flexShrink: 0,
                }}>{v.score}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section style={{ padding: '5rem 1.5rem', maxWidth: '900px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '3px', color: 'var(--accent)', textTransform: 'uppercase', marginBottom: '0.7rem' }}>
            HOW IT WORKS
          </div>
          <h2 style={{ fontSize: 'clamp(1.6rem, 4vw, 2.4rem)', fontWeight: 800, letterSpacing: '-0.5px' }}>
            Three steps to learn better
          </h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.2rem' }}>
          {steps.map((s, i) => (
            <div key={i} style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: '14px', padding: '1.8rem', position: 'relative', overflow: 'hidden',
            }}>
              <div style={{
                position: 'absolute', top: '0.8rem', right: '1rem',
                fontSize: '52px', fontWeight: 900, color: 'rgba(0,200,255,0.05)',
                lineHeight: 1, userSelect: 'none',
              }}>{s.num}</div>
              <div style={{
                width: '34px', height: '34px', borderRadius: '10px',
                background: 'rgba(0,200,255,0.1)',
                border: '1px solid rgba(0,200,255,0.2)',
                color: 'var(--accent)',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 800, fontSize: '14px', marginBottom: '1rem',
              }}>{i + 1}</div>
              <h3 style={{ fontWeight: 700, fontSize: '16px', marginBottom: '0.5rem' }}>{s.title}</h3>
              <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.65 }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section style={{ padding: '2rem 1.5rem 5rem', maxWidth: '900px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '3px', color: 'var(--accent)', textTransform: 'uppercase', marginBottom: '0.7rem' }}>
            FEATURES
          </div>
          <h2 style={{ fontSize: 'clamp(1.6rem, 4vw, 2.4rem)', fontWeight: 800, letterSpacing: '-0.5px' }}>
            Everything you need to learn smarter
          </h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.1rem' }}>
          {features.map((f, i) => (
            <div key={i} style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: '14px', padding: '1.8rem',
              transition: 'border-color 0.2s, transform 0.2s, box-shadow 0.2s',
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(0,200,255,0.4)'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,200,255,0.1)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
            >
              <div style={{ fontSize: '26px', marginBottom: '0.9rem' }}>{f.icon}</div>
              <h3 style={{ fontWeight: 700, fontSize: '15px', marginBottom: '0.5rem' }}>{f.title}</h3>
              <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.65 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '0 1.5rem 6rem' }}>
        <div style={{
          maxWidth: '680px', margin: '0 auto', textAlign: 'center',
          background: 'linear-gradient(135deg, rgba(0,200,255,0.07) 0%, rgba(0,144,212,0.04) 100%)',
          border: '1px solid rgba(0,200,255,0.2)',
          borderRadius: '20px', padding: '3.5rem 2rem',
          boxShadow: '0 0 60px rgba(0,200,255,0.06)',
        }}>
          <h2 style={{ fontSize: 'clamp(1.5rem, 4vw, 2rem)', fontWeight: 800, marginBottom: '0.8rem', letterSpacing: '-0.5px' }}>
            Ready to actually learn from YouTube?
          </h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', fontSize: '15px' }}>
            Free forever. No credit card needed.
          </p>
          <Link to={user ? '/dashboard' : '/login?tab=signup'} className="btn-primary" style={{
            padding: '0.9rem 2.4rem', fontSize: '16px', borderRadius: '10px',
            boxShadow: '0 0 40px rgba(0,200,255,0.25)',
          }}>
            {user ? 'Go to Library →' : 'Sign Up'}
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{
        borderTop: '1px solid var(--border)', padding: '1.4rem 2rem',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem',
      }}>
        <span style={{ fontWeight: 800, fontSize: '15px', display: 'flex', alignItems: 'center', gap: '7px' }}>
          <svg width="20" height="20" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="32" height="32" rx="7" fill="#050d1a" stroke="#1a3050" strokeWidth="1"/>
            <circle cx="15" cy="14" r="8.5" fill="none" stroke="#00c8ff" strokeWidth="2.5"/>
            <polygon points="12,10 21,14 12,18" fill="#00c8ff"/>
            <line x1="21" y1="19.5" x2="26" y2="25" stroke="#00c8ff" strokeWidth="2.5" strokeLinecap="round"/>
          </svg>
          Quiz<span style={{ color: 'var(--accent)' }}>Tube</span>
        </span>
        <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
          Built with Groq · Llama 3.3 · React · Node.js
        </span>
      </footer>
    </div>
  );
}
