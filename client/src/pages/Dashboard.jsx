import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../api/index.js';

function scoreClass(score, total) {
  const pct = score / (total || 10);
  if (pct <= 0.4) return 'score-low';
  if (pct <= 0.6) return 'score-mid';
  return 'score-high';
}

function SkeletonCard() {
  return (
    <div className="card" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
      <div className="skeleton" style={{ width: 160, height: 90, borderRadius: 10, flexShrink: 0 }} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <div className="skeleton" style={{ height: 16, width: '65%' }} />
        <div className="skeleton" style={{ height: 12, width: '40%' }} />
      </div>
    </div>
  );
}

function EmptyState({ hasFilter }) {
  return (
    <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
      <div style={{ fontSize: '56px', marginBottom: '1rem' }}>{hasFilter ? '🔍' : '🎬'}</div>
      <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '0.5rem' }}>{hasFilter ? 'No videos match' : 'Your library is empty'}</h3>
      <p style={{ color: 'var(--text-muted)', fontSize: '14px', maxWidth: 320, margin: '0 auto' }}>
        {hasFilter ? 'Try a different search or clear the filter.' : 'Paste a YouTube URL above to add your first video.'}
      </p>
    </div>
  );
}

function VideoCard({ video, collections, onAddToCollection }) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div className="card card-hover" style={{ display: 'flex', gap: '1rem', transition: 'all 0.2s', position: 'relative' }}>
      <img
        src={video.thumbnail_url || `https://img.youtube.com/vi/${video.youtube_id}/mqdefault.jpg`}
        alt={video.title}
        style={{ width: '160px', height: '90px', objectFit: 'cover', borderRadius: '10px', flexShrink: 0 }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
          <Link to={`/video/${video.id}`} style={{ color: 'var(--text)', fontWeight: 600, fontSize: '15px', lineHeight: 1.35 }}>
            {video.title || 'Untitled Video'}
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
            {video.best_score != null && (
              <span className={`score-badge ${scoreClass(video.best_score, video.best_total)}`}>
                {video.best_score}/{video.best_total ?? 10}
              </span>
            )}
            {collections.length > 0 && (
              <div style={{ position: 'relative' }}>
                <button onClick={() => setShowMenu(p => !p)} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '6px', padding: '3px 7px', fontSize: '12px', color: 'var(--text-muted)', cursor: 'pointer' }}>+</button>
                {showMenu && (
                  <div style={{ position: 'absolute', right: 0, top: '100%', marginTop: '4px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', boxShadow: 'var(--shadow)', zIndex: 100, minWidth: 160 }}>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', padding: '6px 10px 2px', fontWeight: 700 }}>ADD TO COLLECTION</p>
                    {collections.map(c => (
                      <button key={c.id} onClick={() => { onAddToCollection(c.id, video.id); setShowMenu(false); }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '6px 10px', background: 'none', border: 'none', color: 'var(--text)', fontSize: '13px', cursor: 'pointer' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'none'}
                      >
                        {c.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        {video.tags?.length > 0 && (
          <div style={{ marginTop: '0.5rem', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            {video.tags.map(tag => <span key={tag} className="tag" style={{ cursor: 'default' }}>{tag}</span>)}
          </div>
        )}
        <div style={{ marginTop: '0.6rem', display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '12px', color: video.transcript_status === 'ready' ? 'var(--success)' : 'var(--text-muted)' }}>
            {video.transcript_status === 'ready' ? '✓ Quiz available' : `⚠ ${video.transcript_status}`}
          </span>
          <span style={{ color: 'var(--border)' }}>·</span>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{new Date(video.added_at).toLocaleDateString()}</span>
          {video.next_review && new Date(video.next_review) <= new Date() && (
            <><span style={{ color: 'var(--border)' }}>·</span><span style={{ fontSize: '12px', color: 'var(--warning)' }}>📅 Review due</span></>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [videos, setVideos] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [collections, setCollections] = useState([]);
  const [activeCollection, setActiveCollection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [url, setUrl] = useState('');
  const [thoughts, setThoughts] = useState('');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState('');
  const [addSuccess, setAddSuccess] = useState('');
  const [search, setSearch] = useState('');
  const [activeTag, setActiveTag] = useState('');
  const [showPlaylist, setShowPlaylist] = useState(false);
  const [playlistUrl, setPlaylistUrl] = useState('');
  const [importingPlaylist, setImportingPlaylist] = useState(false);
  const [newColName, setNewColName] = useState('');
  const [showNewCol, setShowNewCol] = useState(false);

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);
    try {
      const [vRes, aRes, cRes] = await Promise.all([api.get('/videos'), api.get('/attempts'), api.get('/collections')]);
      setVideos(vRes.data);
      setAttempts(aRes.data);
      setCollections(cRes.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  const enrichedVideos = videos.map(v => {
    const latest = attempts.find(a => a.video_id === v.id);
    return { ...v, best_score: latest?.score ?? null, best_total: latest?.total_questions ?? null };
  });

  const allTags = [...new Set(videos.flatMap(v => v.tags || []))].sort();

  const filtered = enrichedVideos.filter(v => {
    const matchSearch = !search || v.title?.toLowerCase().includes(search.toLowerCase());
    const matchTag = !activeTag || (v.tags || []).includes(activeTag);
    return matchSearch && matchTag;
  });

  async function handleAdd(e) {
    e.preventDefault();
    setAddError(''); setAddSuccess(''); setAdding(true);
    try {
      await api.post('/videos', { url: url.trim(), thoughts: thoughts.trim() });
      setUrl(''); setThoughts('');
      setAddSuccess('Video added!');
      fetchAll();
    } catch (err) { setAddError(err.response?.data?.error || 'Failed to add video'); }
    finally { setAdding(false); }
  }

  async function handleImportPlaylist(e) {
    e.preventDefault();
    setImportingPlaylist(true); setAddError(''); setAddSuccess('');
    try {
      const res = await api.post('/videos/import-playlist', { url: playlistUrl });
      setAddSuccess(`Imported ${res.data.added} videos (${res.data.skipped} skipped as duplicates).`);
      setPlaylistUrl(''); setShowPlaylist(false);
      fetchAll();
    } catch (err) { setAddError(err.response?.data?.error || 'Failed to import playlist'); }
    finally { setImportingPlaylist(false); }
  }

  async function handleCreateCollection(e) {
    e.preventDefault();
    if (!newColName.trim()) return;
    try {
      const res = await api.post('/collections', { name: newColName.trim() });
      setCollections(prev => [res.data, ...prev]);
      setNewColName(''); setShowNewCol(false);
    } catch (err) { console.error(err); }
  }

  async function handleDeleteCollection(id) {
    if (!confirm('Delete this collection? Videos will not be deleted.')) return;
    try {
      await api.delete(`/collections/${id}`);
      setCollections(prev => prev.filter(c => c.id !== id));
      if (activeCollection === id) setActiveCollection(null);
    } catch (err) { console.error(err); }
  }

  async function handleAddToCollection(colId, videoId) {
    try { await api.post(`/collections/${colId}/videos`, { video_id: videoId }); fetchAll(); }
    catch (err) { console.error(err); }
  }

  const displayVideos = activeCollection
    ? filtered.filter(v => {
        const col = collections.find(c => c.id === activeCollection);
        return col; // just show all for now; collection videos fetched separately in a real impl
      })
    : filtered;

  const hasFilter = search || activeTag;

  return (
    <>
      <Navbar />
      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '2rem 1rem', display: 'grid', gridTemplateColumns: collections.length > 0 || showNewCol ? '200px 1fr' : '1fr', gap: '1.5rem' }}>

        {/* Collections sidebar */}
        {(collections.length > 0 || showNewCol) && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Collections</span>
              <button onClick={() => setShowNewCol(p => !p)} style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: '18px', cursor: 'pointer', lineHeight: 1 }}>+</button>
            </div>
            {showNewCol && (
              <form onSubmit={handleCreateCollection} style={{ marginBottom: '0.75rem', display: 'flex', gap: '4px' }}>
                <input value={newColName} onChange={e => setNewColName(e.target.value)} placeholder="Name…" style={{ fontSize: '13px', padding: '0.4rem 0.6rem' }} autoFocus />
                <button type="submit" style={{ background: 'var(--accent)', color: '#021020', border: 'none', borderRadius: '6px', padding: '0.4rem 0.7rem', fontWeight: 700, cursor: 'pointer', fontSize: '13px' }}>✓</button>
              </form>
            )}
            <button onClick={() => setActiveCollection(null)} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '0.5rem 0.7rem', borderRadius: '8px', background: !activeCollection ? 'var(--accent-dim)' : 'transparent', border: !activeCollection ? '1px solid rgba(0,200,255,0.25)' : '1px solid transparent', color: !activeCollection ? 'var(--accent)' : 'var(--text-muted)', fontSize: '13px', cursor: 'pointer', marginBottom: '3px', fontWeight: !activeCollection ? 700 : 400 }}>
              All Videos
            </button>
            {collections.map(c => (
              <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '3px' }}>
                <button onClick={() => setActiveCollection(c.id === activeCollection ? null : c.id)} style={{ flex: 1, textAlign: 'left', padding: '0.5rem 0.7rem', borderRadius: '8px', background: activeCollection === c.id ? 'var(--accent-dim)' : 'transparent', border: activeCollection === c.id ? '1px solid rgba(0,200,255,0.25)' : '1px solid transparent', color: activeCollection === c.id ? 'var(--accent)' : 'var(--text-muted)', fontSize: '13px', cursor: 'pointer', fontWeight: activeCollection === c.id ? 700 : 400 }}>
                  {c.name} <span style={{ opacity: 0.6 }}>({c.video_count})</span>
                </button>
                <button onClick={() => handleDeleteCollection(c.id)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '14px', opacity: 0.5, padding: '0 4px' }}>×</button>
              </div>
            ))}
          </div>
        )}

        {/* Main content */}
        <div>
          {/* Add video card */}
          <div className="card" style={{ marginBottom: '1.5rem', background: 'linear-gradient(135deg, var(--surface) 0%, #16161f 100%)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ color: 'var(--accent)' }}>+</span> Add a YouTube Video
              </h2>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={() => setShowPlaylist(p => !p)} className="btn-ghost" style={{ fontSize: '12px', padding: '0.3rem 0.8rem' }}>
                  {showPlaylist ? '× Cancel' : '📋 Import Playlist'}
                </button>
                {collections.length === 0 && (
                  <button onClick={() => setShowNewCol(p => !p)} className="btn-ghost" style={{ fontSize: '12px', padding: '0.3rem 0.8rem' }}>
                    + New Collection
                  </button>
                )}
              </div>
            </div>
            {addError && <div className="error-msg">{addError}</div>}
            {addSuccess && <div className="success-msg">{addSuccess}</div>}
            {showPlaylist ? (
              <form onSubmit={handleImportPlaylist} style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
                <input type="url" placeholder="https://www.youtube.com/playlist?list=..." value={playlistUrl} onChange={e => setPlaylistUrl(e.target.value)} required />
                <button className="btn-primary" type="submit" disabled={importingPlaylist} style={{ alignSelf: 'flex-start', padding: '0.6rem 1.5rem' }}>
                  {importingPlaylist ? 'Importing…' : '📋 Import All Videos'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
                <input type="url" placeholder="https://www.youtube.com/watch?v=..." value={url} onChange={e => setUrl(e.target.value)} required />
                <textarea placeholder="Your thoughts or notes (optional)" value={thoughts} onChange={e => setThoughts(e.target.value)} style={{ minHeight: '56px' }} />
                <button className="btn-primary" type="submit" disabled={adding} style={{ alignSelf: 'flex-start', padding: '0.6rem 1.5rem' }}>
                  {adding ? 'Adding…' : '+ Add Video'}
                </button>
              </form>
            )}
          </div>

          {/* Library header */}
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 700 }}>
                {activeCollection ? collections.find(c => c.id === activeCollection)?.name : 'Your Library'}{' '}
                <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({filtered.length})</span>
              </h2>
            </div>
            <input placeholder="🔍  Search videos…" value={search} onChange={e => setSearch(e.target.value)} style={{ marginBottom: allTags.length ? '0.6rem' : '0' }} />
            {allTags.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '0.6rem' }}>
                {allTags.map(tag => (
                  <span key={tag} className={`tag ${activeTag === tag ? 'active' : ''}`} onClick={() => setActiveTag(activeTag === tag ? '' : tag)}>{tag}</span>
                ))}
                {activeTag && <span className="tag" onClick={() => setActiveTag('')} style={{ opacity: 0.6 }}>✕ clear</span>}
              </div>
            )}
          </div>

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>{[1,2,3].map(i => <SkeletonCard key={i} />)}</div>
          ) : filtered.length === 0 ? (
            <EmptyState hasFilter={!!hasFilter} />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
              {filtered.map(v => <VideoCard key={v.id} video={v} collections={collections} onAddToCollection={handleAddToCollection} />)}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
