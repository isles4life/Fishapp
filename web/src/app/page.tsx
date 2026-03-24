'use client';
import { useEffect, useCallback, useState, useRef } from 'react';
import Link from 'next/link';
import Nav from '../components/Nav';
import { api, isLoggedIn, getMyUserId } from '../lib/api';
import type { Tournament, LeaderboardEntry, CatchComment } from '../lib/api';

const C = {
  bg:          '#3A4C44',
  surface:     '#2E3D38',
  surfaceHigh: '#445C54',
  border:      '#4A6058',
  borderGold:  '#CFC29C',
  accent:      '#CFC29C',
  accentDark:  '#B8A882',
  verified:    '#3DAF5A',
  verifiedBg:  '#0F3A1E',
  error:       '#C0392B',
  errorBg:     '#3A1414',
  text:        '#F0EDE4',
  textSub:     '#9DB5A8',
  textMuted:   '#6B7D73',
  gold:        '#CFC29C',
  silver:      '#A0A8A0',
  bronze:      '#8B6F4A',
};

const accentBtn: React.CSSProperties = {
  backgroundColor: C.accent, color: C.bg, fontWeight: 700,
  padding: '9px 20px', borderRadius: 8, textDecoration: 'none',
  fontSize: 14, border: 'none', cursor: 'pointer', display: 'inline-block',
  letterSpacing: 1, textTransform: 'uppercase',
};
const ghostBtn: React.CSSProperties = {
  backgroundColor: 'transparent', color: C.textSub, fontWeight: 600,
  padding: '9px 20px', borderRadius: 8, textDecoration: 'none',
  fontSize: 14, border: `1px solid ${C.border}`, cursor: 'pointer', display: 'inline-block',
};

function initials(name?: string | null) {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function AvatarCircle({ photoUrl, name, size = 36 }: { photoUrl?: string | null; name?: string | null; size?: number }) {
  if (photoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={photoUrl} alt="" style={{ width: size, height: size, borderRadius: size / 2, objectFit: 'cover', border: `1.5px solid ${C.borderGold}`, display: 'block' }} />
    );
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: C.surfaceHigh, border: `1.5px solid ${C.border}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.35, fontWeight: 700, color: C.textSub, flexShrink: 0,
    }}>
      {initials(name)}
    </div>
  );
}

function cmToInches(cm: number): string {
  return (cm / 2.54).toFixed(2);
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

const rankColor = (rank: number) => rank === 1 ? C.gold : rank === 2 ? C.silver : rank === 3 ? C.bronze : C.textMuted;
const medalFor = (rank: number) => rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`;

function PropsWhoModal({ submissionId, onClose }: { submissionId: string; onClose: () => void }) {
  const [proppers, setProppers] = useState<{ id: string; displayName: string; profilePhotoUrl: string | null }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getPropsWho(submissionId).then(setProppers).catch(() => {}).finally(() => setLoading(false));
  }, [submissionId]);

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 50,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: C.surface, borderRadius: 16, padding: '20px 24px',
        minWidth: 280, maxWidth: 360, maxHeight: 400, overflowY: 'auto',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <span style={{ fontWeight: 700, fontSize: 16, color: C.text }}>Props</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: C.textMuted, cursor: 'pointer', fontSize: 20 }}>×</button>
        </div>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '16px 0', color: C.textMuted }}>Loading…</div>
        ) : proppers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '16px 0', color: C.textMuted }}>No props yet — be the first!</div>
        ) : proppers.map(p => (
          <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: `1px solid ${C.border}` }}>
            {p.profilePhotoUrl
              ? <img src={p.profilePhotoUrl} style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} alt="" />
              : <div style={{ width: 32, height: 32, borderRadius: '50%', background: C.surfaceHigh, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: C.accent, fontSize: 13 }}>{p.displayName[0]?.toUpperCase()}</div>
            }
            <span style={{ color: C.text, fontSize: 14, fontWeight: 600 }}>{p.displayName}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PropButton({ submissionId }: { submissionId: string }) {
  const [propped, setPropped] = useState(false);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showWho, setShowWho] = useState(false);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    api.getProps(submissionId).then(r => { setCount(r.count); setPropped(r.userHasPropped); }).catch(() => {});
  }, [submissionId]);

  async function handleToggle() {
    if (loading) return;
    setLoading(true);
    try {
      const r = await api.toggleProp(submissionId);
      setPropped(r.propped);
      setCount(r.count);
    } catch { /* silently handle */ } finally { setLoading(false); }
  }

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <button onClick={handleToggle} disabled={loading} style={{
          display: 'flex', alignItems: 'center', gap: 4,
          background: propped ? C.accent + '20' : 'none', border: `1px solid ${propped ? C.accent + '70' : C.border}`,
          borderRadius: 8, padding: '4px 10px', cursor: loading ? 'wait' : 'pointer',
          fontSize: 13, fontWeight: 700, color: propped ? C.accent : C.textMuted,
        }}>
          👍 {count > 0 ? count : ''} Props
        </button>
        {count > 0 && (
          <button onClick={() => setShowWho(true)} style={{
            background: 'none', border: 'none', color: C.accent, cursor: 'pointer',
            fontSize: 12, fontWeight: 600, padding: '4px 2px',
          }}>who?</button>
        )}
      </div>
      {showWho && <PropsWhoModal submissionId={submissionId} onClose={() => setShowWho(false)} />}
    </>
  );
}

function CommentsSection({ submissionId, myUserId }: { submissionId: string; myUserId?: string | null }) {
  const [comments, setComments] = useState<CatchComment[]>([]);
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  useEffect(() => {
    api.getComments(submissionId).then(setComments).catch(() => {}).finally(() => setLoading(false));
  }, [submissionId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = body.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    try {
      const comment = await api.addComment(submissionId, trimmed);
      setComments(prev => [...prev, comment]);
      setBody('');
    } catch { /* silently handle */ } finally { setSubmitting(false); }
  }

  async function handleEdit(commentId: string) {
    const trimmed = editBody.trim();
    if (!trimmed || editSaving) return;
    setEditSaving(true);
    try {
      const updated = await api.editComment(commentId, trimmed);
      setComments(prev => prev.map(c => c.id === commentId ? updated : c));
      setEditingId(null);
    } catch { /* silently handle */ } finally { setEditSaving(false); }
  }

  async function handleDelete(commentId: string) {
    if (!confirm('Delete this comment?')) return;
    try {
      await api.deleteComment(commentId);
      setComments(prev => prev.filter(c => c.id !== commentId));
    } catch { /* silently handle */ }
  }

  return (
    <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 12, marginTop: 4 }}>
      {loading ? <div style={{ color: C.textMuted, fontSize: 13 }}>Loading comments…</div> : (
        <>
          {comments.map(c => (
            <div key={c.id} style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: C.textSub }}>{c.user.displayName}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 11, color: C.textMuted }}>{timeAgo(c.createdAt)}</span>
                  {myUserId && c.user.id === myUserId && editingId !== c.id && (
                    <>
                      <button onClick={() => { setEditingId(c.id); setEditBody(c.body); }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textMuted, fontSize: 11, padding: '1px 4px' }} title="Edit">✏️</button>
                      <button onClick={() => handleDelete(c.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textMuted, fontSize: 11, padding: '1px 4px' }} title="Delete">🗑</button>
                    </>
                  )}
                </div>
              </div>
              {editingId === c.id ? (
                <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                  <input value={editBody} onChange={e => setEditBody(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleEdit(c.id)}
                    maxLength={500} autoFocus
                    style={{ flex: 1, padding: '5px 10px', fontSize: 13, backgroundColor: C.surfaceHigh, border: `1px solid ${C.accent}`, borderRadius: 6, color: C.text, outline: 'none' }} />
                  <button onClick={() => handleEdit(c.id)} disabled={editSaving}
                    style={{ background: C.accent, color: C.bg, border: 'none', borderRadius: 6, padding: '5px 12px', cursor: 'pointer', fontWeight: 700, fontSize: 12, opacity: editSaving ? 0.5 : 1 }}>
                    {editSaving ? '…' : 'Save'}
                  </button>
                  <button onClick={() => setEditingId(null)}
                    style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: 6, padding: '5px 10px', cursor: 'pointer', color: C.textSub, fontSize: 12 }}>
                    Cancel
                  </button>
                </div>
              ) : (
                <span style={{ fontSize: 13, color: C.text }}>{c.body}</span>
              )}
            </div>
          ))}
          {comments.length === 0 && <div style={{ color: C.textMuted, fontSize: 13, marginBottom: 8 }}>No comments yet.</div>}
        </>
      )}
      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <input value={body} onChange={e => setBody(e.target.value)}
          placeholder="Add a comment…" maxLength={500}
          style={{ flex: 1, padding: '7px 12px', fontSize: 13, backgroundColor: C.surfaceHigh, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, outline: 'none' }} />
        <button type="submit" disabled={!body.trim() || submitting}
          style={{ background: C.accent, color: C.bg, border: 'none', borderRadius: 8, padding: '7px 16px', cursor: 'pointer', fontWeight: 700, fontSize: 13, opacity: (!body.trim() || submitting) ? 0.5 : 1 }}>
          {submitting ? '…' : 'Post'}
        </button>
      </form>
    </div>
  );
}

export default function HomePage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [loggedIn, setLoggedIn] = useState(false);
  const [myUserId] = useState<string | null>(() => getMyUserId());
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);

  const tournament = tournaments.find(t => t.id === selectedId) ?? tournaments[0] ?? null;

  const load = useCallback(async () => {
    try {
      const ts = await api.getActiveTournaments();
      setTournaments(ts);
      const active = ts[0];
      if (active) {
        setSelectedId(prev => prev && ts.find(t => t.id === prev) ? prev : active.id);
        const board = await api.getLeaderboard(active.id);
        setEntries(board);
      }
      setError('');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  async function selectTournament(id: string) {
    setSelectedId(id);
    setExpandedUserId(null);
    try {
      const board = await api.getLeaderboard(id);
      setEntries(board);
    } catch { setEntries([]); }
  }

  useEffect(() => {
    const li = isLoggedIn();
    setLoggedIn(li);
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [load]);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: C.bg }}>
      <Nav active="home" />

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px 88px' }}>

        {/* ── Hero / Tournament Banner ─────────────────────────────── */}
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: 80 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icon.png" alt="FishLeague" style={{ width: 80, height: 80, objectFit: 'contain', opacity: 0.7 }} />
            <span style={{ color: C.textMuted, fontSize: 13 }}>Loading...</span>
          </div>
        )}

        {error && !loading && (
          <div style={{
            textAlign: 'center', padding: '60px 20px',
            backgroundColor: C.surface, borderRadius: 20, border: `1px solid ${C.border}`,
            marginBottom: 40,
          }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icon.png" alt="FishLeague" style={{ width: 64, marginBottom: 16, opacity: 0.5 }} />
            <h2 style={{ color: C.textSub, fontSize: 20, fontWeight: 700, margin: '0 0 8px' }}>No Active Tournament</h2>
            <p style={{ color: C.textMuted, fontSize: 15, margin: '0 0 24px' }}>Check back when the next week opens.</p>
            <Link href="/register" style={accentBtn}>Join Now</Link>
          </div>
        )}

        {!loading && !error && tournaments.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            {/* Tournament tabs — shown when multiple are open */}
            {tournaments.length > 1 && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                {tournaments.map(t => (
                  <button
                    key={t.id}
                    onClick={() => selectTournament(t.id)}
                    style={{
                      padding: '6px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                      cursor: 'pointer', border: `1px solid ${t.id === selectedId ? C.accent : C.border}`,
                      backgroundColor: t.id === selectedId ? C.accent + '20' : 'transparent',
                      color: t.id === selectedId ? C.accent : C.textSub,
                    }}
                  >
                    {t.name} <span style={{ fontSize: 11, opacity: 0.7 }}>· {t.region?.name}</span>
                  </button>
                ))}
              </div>
            )}

            {tournament && (
              <div style={{
                backgroundColor: C.surface, borderRadius: 16,
                border: `1px solid ${C.border}`, borderLeft: `4px solid ${C.accent}`,
                padding: '20px 16px', textAlign: 'center',
              }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: C.accent, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 10 }}>
                  Active Tournament
                </div>
                <h1 style={{ fontSize: 'clamp(20px, 5vw, 30px)', fontWeight: 900, color: C.text, margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: -0.5 }}>
                  {tournament.name}
                </h1>
                <p style={{ color: C.textSub, fontSize: 15, margin: '0 0 24px' }}>
                  {tournament.region?.name} · Ends {new Date(tournament.endsAt).toLocaleDateString()}
                </p>
                <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                  <Link href={`/leaderboard/${tournament.id}`} style={accentBtn}>🏆 Tournament Details</Link>
                  <Link href="/leaderboard" style={ghostBtn}>📊 Leaderboard</Link>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Recent Catches ───────────────────────────────────────── */}
        {!loading && !error && entries.length > 0 && (
          <>
            <div style={{ marginBottom: 20 }}>
              <h2 style={{ fontSize: 22, fontWeight: 900, color: C.text, margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Recent Catches
              </h2>
              <p style={{ color: C.textMuted, fontSize: 13, margin: 0, textTransform: 'uppercase', letterSpacing: 1 }}>
                Live Activity Feed
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {entries.map((entry) => (
                <div key={entry.userId} style={{
                  backgroundColor: C.surface,
                  border: `1px solid ${entry.rank <= 3 ? C.accent + '40' : C.border}`,
                  borderRadius: 12,
                  overflow: 'hidden',
                }}>
                  <div style={{ padding: '14px 12px' }}>
                    {/* Top row: rank + avatar + name + verified */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                      <div style={{
                        width: 40, height: 40, borderRadius: 20, flexShrink: 0,
                        border: `2px solid ${rankColor(entry.rank)}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: entry.rank <= 3 ? 18 : 13, fontWeight: 800,
                        color: rankColor(entry.rank),
                        backgroundColor: C.surfaceHigh,
                      }}>
                        {medalFor(entry.rank)}
                      </div>
                      <AvatarCircle photoUrl={entry.profilePhotoUrl} name={entry.displayName} size={42} />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 700, fontSize: 16, color: C.text }}>{entry.displayName}</span>
                          {entry.rank <= 3 && (
                            <span style={{
                              fontSize: 10, fontWeight: 800, color: C.verified,
                              backgroundColor: C.verifiedBg, padding: '2px 7px',
                              borderRadius: 10, letterSpacing: 0.5, textTransform: 'uppercase',
                            }}>✓ VERIFIED</span>
                          )}
                        </div>
                        {entry.username && (
                          <div style={{ color: C.textMuted, fontSize: 12, marginTop: 1 }}>@{entry.username}</div>
                        )}
                      </div>
                    </div>

                    {/* Fish catch measurement */}
                    <div style={{
                      backgroundColor: C.surfaceHigh,
                      borderRadius: 12,
                      padding: '16px 20px',
                      textAlign: 'center',
                      marginBottom: 12,
                    }}>
                      <div style={{ fontSize: 36, fontWeight: 900, color: C.accent, letterSpacing: -1 }}>
                        {cmToInches(entry.fishLengthCm)} <span style={{ fontSize: 18, fontWeight: 700 }}>IN</span>
                      </div>
                      <div style={{
                        fontSize: 13, fontWeight: 900, color: C.text,
                        textTransform: 'uppercase', letterSpacing: 1.5, marginTop: 4,
                      }}>
                        {entry.displayName} IS RANKED #{entry.rank}
                      </div>
                    </div>

                    {/* Meta row */}
                    <div style={{ display: 'flex', gap: 16, marginBottom: 12, flexWrap: 'wrap' }}>
                      {tournament && (
                        <span style={{ color: C.textSub, fontSize: 13 }}>📍 {tournament.region.name}</span>
                      )}
                      {entry.speciesName && <span style={{ color: C.accent, fontSize: 13 }}>{entry.speciesName}</span>}
                      <span style={{ color: C.textSub, fontSize: 13 }}>🏅 Rank #{entry.rank}</span>
                    </div>

                    {/* Action row */}
                    {entry.submissionId && (
                      <div style={{ display: 'flex', gap: 10, borderTop: `1px solid ${C.border}`, paddingTop: 10 }}>
                        <PropButton submissionId={entry.submissionId} />
                        <button
                          onClick={() => setExpandedUserId(prev => prev === entry.userId ? null : entry.userId)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 4, background: 'none',
                            border: `1px solid ${C.border}`, borderRadius: 8, padding: '4px 10px',
                            cursor: 'pointer', fontSize: 13, fontWeight: 600, color: C.textMuted,
                          }}
                        >
                          💬 Comments
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Comments panel */}
                  {expandedUserId === entry.userId && entry.submissionId && (
                    <div style={{ backgroundColor: C.surfaceHigh, borderTop: `1px solid ${C.border}`, padding: '14px 12px' }}>
                      <CommentsSection submissionId={entry.submissionId} myUserId={myUserId} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {!loading && !error && entries.length === 0 && tournament && (
          <div style={{ textAlign: 'center', color: C.textMuted, padding: 60, fontSize: 16 }}>
            No entries yet — tournament just opened!
          </div>
        )}

        {/* ── CTA (non-logged-in) ──────────────────────────────────── */}
        {!loggedIn && !loading && (
          <div style={{ marginTop: 32, backgroundColor: C.surface, borderRadius: 16, padding: '20px 16px', textAlign: 'center', border: `1px solid ${C.border}` }}>
            <h3 style={{ margin: '0 0 8px', color: C.text, fontSize: 20, fontWeight: 700 }}>Download the app to compete</h3>
            <p style={{ margin: '0 0 20px', color: C.textSub, fontSize: 15 }}>
              Submit catches from your phone with GPS verification and real-time leaderboard updates.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href="/register" style={accentBtn}>Create Account</Link>
              <Link href="/login" style={ghostBtn}>Sign In</Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
