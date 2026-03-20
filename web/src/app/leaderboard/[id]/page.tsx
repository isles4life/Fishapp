'use client';
import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import Nav from '../../../components/Nav';
import { api, isLoggedIn as checkLogin } from '../../../lib/api';
import type { Tournament, LeaderboardEntry, TournamentPost } from '../../../lib/api';

const C = {
  bg:          '#3A4C44',
  surface:     '#2E3D38',
  surfaceHigh: '#445C54',
  border:      '#4A6058',
  borderGold:  '#CFC29C',
  accent:      '#CFC29C',
  text:        '#F0EDE4',
  textSub:     '#9DB5A8',
  textMuted:   '#6B7D73',
  gold:        '#CFC29C',
  silver:      '#A0A8A0',
  bronze:      '#8B6F4A',
};

function initials(name?: string | null) {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function rankColor(rank: number) {
  if (rank === 1) return C.gold;
  if (rank === 2) return C.silver;
  if (rank === 3) return C.bronze;
  return C.textSub;
}

function formatScore(e: LeaderboardEntry): string {
  switch (e.scoringMethod) {
    case 'WEIGHT': return `${(e.fishWeightOz ?? e.score).toFixed(1)} oz`;
    case 'FISH_COUNT': return `${e.score} fish`;
    case 'SPECIES_COUNT': return `${e.score} species`;
    default: return `${(e.fishLengthCm / 2.54).toFixed(1)}"`;
  }
}

function rankLabel(rank: number) {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return `#${rank}`;
}

export default function PublicLeaderboardPage({ params }: { params: { id: string } }) {
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [feed, setFeed] = useState<TournamentPost[]>([]);
  const [feedCursor, setFeedCursor] = useState<string | null>(null);
  const [feedLoading, setFeedLoading] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [postBody, setPostBody] = useState('');
  const [postPhoto, setPostPhoto] = useState<File | null>(null);
  const [postPhotoPreview, setPostPhotoPreview] = useState<string | null>(null);
  const [postGif, setPostGif] = useState<string | null>(null);
  const [postGifPreview, setPostGifPreview] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [gifQuery, setGifQuery] = useState('');
  const [gifResults, setGifResults] = useState<Array<{ id: string; preview: string; full: string }>>([]);
  const [gifSearching, setGifSearching] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setIsLoggedIn(checkLogin());
  }, []);

  useEffect(() => {
    async function load() {
      try {
        const [t, lb] = await Promise.all([
          fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'https://api.fishleague.app'}/tournaments/${params.id}`)
            .then(r => r.json()) as Promise<Tournament>,
          api.getLeaderboard(params.id),
        ]);
        setTournament(t);
        setEntries(lb);
      } catch (e: any) {
        setError(e.message ?? 'Failed to load');
      } finally {
        setLoading(false);
      }
    }
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [params.id]);

  useEffect(() => {
    async function loadFeed() {
      setFeedLoading(true);
      try {
        const res = await api.getTournamentFeed(params.id);
        setFeed(res.posts);
        setFeedCursor(res.nextCursor);
      } catch { /* feed is non-critical */ }
      finally { setFeedLoading(false); }
    }
    loadFeed();
  }, [params.id]);

  async function loadMoreFeed() {
    if (!feedCursor || feedLoading) return;
    setFeedLoading(true);
    try {
      const res = await api.getTournamentFeed(params.id, feedCursor);
      setFeed(prev => [...prev, ...res.posts]);
      setFeedCursor(res.nextCursor);
    } catch {}
    finally { setFeedLoading(false); }
  }

  function handleCopyLink() {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPostPhoto(file);
    setPostGif(null);
    setPostGifPreview(null);
    const reader = new FileReader();
    reader.onload = ev => setPostPhotoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  async function searchGifs(q: string) {
    if (!q.trim()) return;
    setGifSearching(true);
    try {
      const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.fishleague.app';
      const res = await fetch(`${BASE}/gifs/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setGifResults(data.data ?? []);
    } catch { setGifResults([]); }
    finally { setGifSearching(false); }
  }

  function selectGif(gif: { id: string; preview: string; full: string }) {
    setPostGif(gif.full);
    setPostGifPreview(gif.preview);
    setPostPhoto(null);
    setPostPhotoPreview(null);
    setShowGifPicker(false);
    setGifResults([]);
    setGifQuery('');
  }

  function insertEmoji(emoji: string) {
    const ta = textAreaRef.current;
    if (!ta) { setPostBody(b => b + emoji); return; }
    const start = ta.selectionStart ?? postBody.length;
    const end = ta.selectionEnd ?? postBody.length;
    setPostBody(b => b.slice(0, start) + emoji + b.slice(end));
    setShowEmojiPicker(false);
    setTimeout(() => {
      ta.focus();
      ta.setSelectionRange(start + emoji.length, start + emoji.length);
    }, 0);
  }

  async function handlePost(e: React.FormEvent) {
    e.preventDefault();
    if (posting || (!postBody.trim() && !postPhoto && !postGif)) return;
    setPosting(true);
    try {
      let photoKey: string | undefined;
      if (postPhoto) {
        const r = await api.uploadPostMedia(params.id, postPhoto);
        photoKey = r.photoKey;
      }
      const newPost = await api.createTournamentPost(
        params.id, postBody.trim(), photoKey, postGif ?? undefined,
      );
      setFeed(prev => [newPost as any, ...prev]);
      setPostBody('');
      setPostPhoto(null);
      setPostPhotoPreview(null);
      setPostGif(null);
      setPostGifPreview(null);
    } catch { /* silently fail */ }
    finally { setPosting(false); }
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: C.bg }}>
      <Nav active="leaderboard" />

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 16px 80px' }}>
        {loading && (
          <div style={{ textAlign: 'center', color: C.textMuted, padding: 60 }}>Loading...</div>
        )}

        {error && !loading && (
          <div style={{ textAlign: 'center', padding: 60, color: C.textMuted }}>
            Tournament not found. <Link href="/" style={{ color: C.accent }}>Go home</Link>
          </div>
        )}

        {!loading && !error && tournament && (
          <>
            {/* Banner image */}
            {tournament.bannerUrl && (
              <div style={{ marginBottom: 20, borderRadius: 16, overflow: 'hidden', position: 'relative' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={tournament.bannerUrl} alt={tournament.name} style={{ width: '100%', height: 200, objectFit: 'cover', display: 'block' }} />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 40%, rgba(46,61,56,0.9) 100%)' }} />
                <div style={{ position: 'absolute', bottom: 16, left: 20 }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: C.accent, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4 }}>
                    {tournament.isOpen ? '🟢 Live' : 'Final Results'}
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#fff' }}>{tournament.name}</div>
                </div>
              </div>
            )}

            {/* Tournament header */}
            <div style={{
              backgroundColor: C.surface, borderRadius: 16,
              border: `1px solid ${C.border}`, borderLeft: `4px solid ${C.accent}`,
              padding: '20px 20px', marginBottom: 24,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: C.accent, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4 }}>
                    {tournament.isOpen ? '🟢 Live Tournament' : 'Final Results'}
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: C.text }}>{tournament.name}</div>
                  <div style={{ fontSize: 13, color: C.textMuted, marginTop: 4 }}>
                    Week {tournament.weekNumber} · {tournament.region?.name ?? 'All Regions'} ·{' '}
                    {entries.length} angler{entries.length !== 1 ? 's' : ''}
                  </div>
                  {tournament.scoringMethod && tournament.scoringMethod !== 'LENGTH' && (
                    <div style={{ marginTop: 6 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: C.accent, backgroundColor: C.accent + '18', border: `1px solid ${C.accent}50`, borderRadius: 6, padding: '2px 8px' }}>
                        {tournament.scoringMethod === 'WEIGHT' ? '⚖️ Weight' : tournament.scoringMethod === 'FISH_COUNT' ? '🐟 Fish Count' : '🧬 Species Count'}
                      </span>
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <button
                    onClick={handleCopyLink}
                    style={{
                      backgroundColor: copied ? C.surfaceHigh : 'transparent',
                      color: copied ? C.accent : C.textSub,
                      border: `1px solid ${C.border}`,
                      borderRadius: 8, padding: '8px 14px',
                      fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    }}
                  >
                    {copied ? '✓ Copied!' : '🔗 Share'}
                  </button>
                  <Link href="/register" style={{
                    backgroundColor: C.accent, color: C.bg,
                    fontWeight: 700, padding: '8px 16px', borderRadius: 8,
                    textDecoration: 'none', fontSize: 13, letterSpacing: 0.5,
                  }}>
                    Join League
                  </Link>
                </div>
              </div>
            </div>

            {/* Leaderboard */}
            {entries.length === 0 ? (
              <div style={{ textAlign: 'center', color: C.textMuted, padding: 60, backgroundColor: C.surface, borderRadius: 16, border: `1px solid ${C.border}` }}>
                No approved catches yet.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {entries.map((e, i) => (
                  <Link
                    key={e.userId}
                    href={e.username ? `/profile/${e.username}` : '#'}
                    style={{ textDecoration: 'none' }}
                  >
                    <div style={{
                      backgroundColor: i < 3 ? C.surfaceHigh : C.surface,
                      border: `1px solid ${i === 0 ? C.accent + '60' : C.border}`,
                      borderRadius: 12, padding: '14px 16px',
                      display: 'flex', alignItems: 'center', gap: 14,
                      transition: 'border-color 0.15s',
                    }}>
                      {/* Rank */}
                      <div style={{
                        width: 36, textAlign: 'center', fontSize: i < 3 ? 20 : 15,
                        fontWeight: 800, color: rankColor(e.rank), flexShrink: 0,
                        fontFamily: 'Oswald, sans-serif',
                      }}>
                        {rankLabel(e.rank)}
                      </div>

                      {/* Avatar */}
                      {e.profilePhotoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={e.profilePhotoUrl} alt="" style={{ width: 40, height: 40, borderRadius: 20, objectFit: 'cover', border: `1.5px solid ${C.borderGold}`, flexShrink: 0 }} />
                      ) : (
                        <div style={{
                          width: 40, height: 40, borderRadius: 20,
                          backgroundColor: C.bg, border: `1.5px solid ${C.borderGold}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 14, fontWeight: 700, color: C.textSub, flexShrink: 0,
                        }}>
                          {initials(e.displayName)}
                        </div>
                      )}

                      {/* Name */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 15, fontWeight: 700, color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {e.displayName}
                        </div>
                        {e.speciesName && (
                          <div style={{ fontSize: 12, color: C.textMuted, marginTop: 1 }}>{e.speciesName}</div>
                        )}
                        {e.released && (
                          <div style={{ fontSize: 11, color: '#3DAF5A', marginTop: 1 }}>↩ Released</div>
                        )}
                      </div>

                      {/* Length */}
                      <div style={{
                        fontSize: 18, fontWeight: 800, color: rankColor(e.rank),
                        fontFamily: 'Oswald, sans-serif', flexShrink: 0,
                      }}>
                        {formatScore(e)}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {/* Tournament details card */}
            {(tournament.description || tournament.director || tournament.entryFeeCents > 0) && (
              <div style={{ backgroundColor: C.surface, borderRadius: 16, border: `1px solid ${C.border}`, padding: '20px 20px', marginTop: 24 }}>
                {tournament.description && (
                  <div style={{ marginBottom: tournament.director ? 16 : 0 }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: C.textMuted, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8 }}>About This Tournament</div>
                    <div style={{ fontSize: 14, color: C.textSub, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{tournament.description}</div>
                  </div>
                )}
                {tournament.director && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingTop: tournament.description ? 16 : 0, borderTop: tournament.description ? `1px solid ${C.border}` : 'none' }}>
                    {tournament.director.profile?.profilePhotoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={tournament.director.profile.profilePhotoUrl} alt="" style={{ width: 40, height: 40, borderRadius: 20, objectFit: 'cover', border: `1.5px solid ${C.border}`, flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: C.bg, border: `1.5px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: C.textSub, flexShrink: 0 }}>
                        {initials(tournament.director.displayName)}
                      </div>
                    )}
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 800, color: C.textMuted, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 2 }}>Tournament Director</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{tournament.director.displayName}</div>
                    </div>
                  </div>
                )}
                {tournament.entryFeeCents > 0 && (
                  <div style={{ display: 'flex', gap: 24, marginTop: 16, paddingTop: 16, borderTop: `1px solid ${C.border}` }}>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 800, color: C.textMuted, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 4 }}>Entry Fee</div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: C.accent }}>${(tournament.entryFeeCents / 100).toFixed(2)}</div>
                    </div>
                    {(tournament as any).prizePoolCents > 0 && (
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 800, color: C.textMuted, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 4 }}>Prize Pool</div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: C.accent }}>${((tournament as any).prizePoolCents / 100).toFixed(2)}</div>
                      </div>
                    )}
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 800, color: C.textMuted, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 4 }}>Dates</div>
                      <div style={{ fontSize: 13, color: C.textSub }}>
                        {new Date(tournament.startsAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – {new Date(tournament.endsAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Compose bar — logged-in users only */}
            {isLoggedIn && (
              <div style={{ marginTop: 32, backgroundColor: C.surface, borderRadius: 16, border: `1px solid ${C.border}`, padding: '16px 16px' }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: C.textMuted, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 12 }}>Post to Feed</div>
                <form onSubmit={handlePost}>
                  <textarea
                    ref={textAreaRef}
                    value={postBody}
                    onChange={e => setPostBody(e.target.value)}
                    placeholder="Share something with the tournament..."
                    maxLength={1000}
                    rows={3}
                    style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', backgroundColor: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, color: C.text, fontSize: 14, outline: 'none', resize: 'vertical', fontFamily: 'inherit' }}
                  />

                  {/* Media previews */}
                  {(postPhotoPreview || postGifPreview) && (
                    <div style={{ marginTop: 10, position: 'relative', display: 'inline-block' }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={postPhotoPreview ?? postGifPreview ?? ''} alt="" style={{ maxHeight: 160, borderRadius: 10, border: `1px solid ${C.border}`, display: 'block' }} />
                      <button type="button" onClick={() => { setPostPhoto(null); setPostPhotoPreview(null); setPostGif(null); setPostGifPreview(null); if (photoInputRef.current) photoInputRef.current.value = ''; }}
                        style={{ position: 'absolute', top: 6, right: 6, width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.7)', border: 'none', cursor: 'pointer', color: '#fff', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>×</button>
                    </div>
                  )}

                  {/* GIF picker panel — inline, expands in flow */}
                  {showGifPicker && (
                    <div style={{ marginTop: 10, backgroundColor: C.surfaceHigh, border: `1px solid ${C.border}`, borderRadius: 12, padding: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, letterSpacing: 1, textTransform: 'uppercase' }}>Search GIFs</span>
                        <button type="button" onClick={() => setShowGifPicker(false)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textMuted, fontSize: 18, lineHeight: 1, padding: '2px 4px', borderRadius: 4 }}
                          title="Close">×</button>
                      </div>
                      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                        <input
                          value={gifQuery}
                          onChange={e => setGifQuery(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), searchGifs(gifQuery))}
                          placeholder="Search GIFs..."
                          style={{ flex: 1, padding: '8px 12px', backgroundColor: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, fontSize: 13, outline: 'none' }}
                          autoFocus
                        />
                        <button type="button" onClick={() => searchGifs(gifQuery)}
                          style={{ backgroundColor: C.accent, color: C.bg, border: 'none', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>
                          Search
                        </button>
                      </div>
                      {gifSearching && <div style={{ color: C.textMuted, fontSize: 13, textAlign: 'center', padding: 20 }}>Searching…</div>}
                      {!gifSearching && gifResults.length > 0 && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, maxHeight: 240, overflowY: 'auto' }}>
                          {gifResults.map(g => (
                            <button key={g.id} type="button" onClick={() => selectGif(g)}
                              style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: 8, overflow: 'hidden', cursor: 'pointer', padding: 0, aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg }}>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={g.preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            </button>
                          ))}
                        </div>
                      )}
                      {!gifSearching && gifResults.length === 0 && gifQuery && (
                        <div style={{ color: C.textMuted, fontSize: 13, textAlign: 'center', padding: 20 }}>No results. Try a different search.</div>
                      )}
                      {!gifSearching && gifResults.length === 0 && !gifQuery && (
                        <div style={{ color: C.textMuted, fontSize: 13, textAlign: 'center', padding: 20 }}>Search for a GIF above</div>
                      )}
                      <div style={{ marginTop: 8, textAlign: 'right' }}>
                        <span style={{ fontSize: 10, color: C.textMuted }}>Powered by GIPHY</span>
                      </div>
                    </div>
                  )}

                  {/* Emoji picker panel — inline, expands in flow */}
                  {showEmojiPicker && (
                    <div style={{ marginTop: 10, backgroundColor: C.surfaceHigh, border: `1px solid ${C.border}`, borderRadius: 12, padding: 12 }}>
                      {[
                        { label: '🎣 Fishing', emojis: ['🎣', '🐟', '🐠', '🐡', '🦈', '🦑', '🦐', '🦀', '🦞', '🐙', '🌊', '⚓', '🚤', '🛶', '🏖️', '🌅'] },
                        { label: '🏆 Sports', emojis: ['🏆', '🥇', '🥈', '🥉', '🎯', '💪', '🤙', '👊', '🙌', '👏', '🎉', '🎊', '🔥', '⚡', '💥', '🌟'] },
                        { label: '😀 Faces', emojis: ['😀', '😂', '🤣', '😍', '🥰', '😎', '🤩', '😏', '🙃', '😅', '😭', '😤', '🤯', '😱', '🥳', '😤'] },
                        { label: '🌿 Nature', emojis: ['🌊', '🌅', '🌄', '⛅', '🌤️', '☀️', '🌙', '⭐', '🌿', '🌱', '🍃', '🌲', '🏔️', '🗻', '⛰️', '🌾'] },
                      ].map(cat => (
                        <div key={cat.label} style={{ marginBottom: 10 }}>
                          <div style={{ fontSize: 10, color: C.textMuted, fontWeight: 700, letterSpacing: 1, marginBottom: 4 }}>{cat.label}</div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                            {cat.emojis.map(em => (
                              <button key={em} type="button" onClick={() => insertEmoji(em)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, padding: '3px 4px', borderRadius: 6, lineHeight: 1 }}
                                onMouseEnter={e => (e.currentTarget.style.backgroundColor = C.bg)}
                                onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}>
                                {em}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Action row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
                    {/* Shared style for the 3 media buttons */}
                    {(() => {
                      const mediaBtnBase: React.CSSProperties = {
                        width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        borderRadius: 8, cursor: 'pointer', border: `1px solid ${C.border}`, flexShrink: 0,
                      };
                      return (
                        <>
                          {/* Attach */}
                          <button type="button" onClick={() => photoInputRef.current?.click()} title="Attach photo"
                            style={{ ...mediaBtnBase, background: C.surfaceHigh, fontSize: 16, color: C.textSub }}>
                            📎
                          </button>
                          <input ref={photoInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handlePhotoSelect} style={{ display: 'none' }} />

                          {/* GIF */}
                          <button type="button" onClick={() => { setShowGifPicker(v => !v); setShowEmojiPicker(false); }}
                            style={{ ...mediaBtnBase, background: showGifPicker ? C.accent + '30' : C.surfaceHigh, border: `1px solid ${showGifPicker ? C.accent : C.border}`, color: showGifPicker ? C.accent : C.textSub, fontSize: 11, fontWeight: 800, letterSpacing: 0.5 }}>
                            GIF
                          </button>

                          {/* Emoji */}
                          <button type="button" onClick={() => { setShowEmojiPicker(v => !v); setShowGifPicker(false); }}
                            style={{ ...mediaBtnBase, background: showEmojiPicker ? C.accent + '30' : C.surfaceHigh, border: `1px solid ${showEmojiPicker ? C.accent : C.border}`, fontSize: 18, lineHeight: 1 }}>
                            😊
                          </button>
                        </>
                      );
                    })()}

                    {/* Submit */}
                    <button type="submit" disabled={posting || (!postBody.trim() && !postPhoto && !postGif)}
                      style={{ marginLeft: 'auto', backgroundColor: C.accent, color: C.bg, border: 'none', borderRadius: 8, padding: '7px 20px', cursor: 'pointer', fontWeight: 700, fontSize: 13, opacity: (posting || (!postBody.trim() && !postPhoto && !postGif)) ? 0.5 : 1 }}>
                      {posting ? 'Posting…' : 'Post'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Social feed */}
            {(feed.length > 0 || feedLoading) && (
              <div style={{ marginTop: 32 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: C.textMuted, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 12 }}>Tournament Feed</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {feed.map(post => {
                    const badgeColor = post.type === 'ANNOUNCEMENT' ? '#D4820A' : post.type === 'CATCH' ? '#3DAF5A' : post.type === 'CHECK_IN' ? C.textSub : C.accent;
                    const badgeLabel = post.type === 'ANNOUNCEMENT' ? '📢 Announcement' : post.type === 'CATCH' ? '🎣 Catch' : post.type === 'CHECK_IN' ? '✅ Check-In' : '💬 Post';
                    return (
                      <div key={post.id} style={{ backgroundColor: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                          {post.user.profile?.profilePhotoUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={post.user.profile.profilePhotoUrl} alt="" style={{ width: 32, height: 32, borderRadius: 16, objectFit: 'cover', border: `1px solid ${C.border}`, flexShrink: 0 }} />
                          ) : (
                            <div style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: C.bg, border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: C.textSub, flexShrink: 0 }}>
                              {initials(post.user.displayName)}
                            </div>
                          )}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{post.user.displayName}</div>
                            <div style={{ fontSize: 11, color: C.textMuted }}>{new Date(post.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</div>
                          </div>
                          <span style={{ fontSize: 11, fontWeight: 700, color: badgeColor, backgroundColor: badgeColor + '20', border: `1px solid ${badgeColor}40`, borderRadius: 6, padding: '2px 8px' }}>{badgeLabel}</span>
                        </div>

                        {post.type === 'CATCH' && post.submission && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                            {post.photoUrl && (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={post.photoUrl} alt="catch" style={{ width: 80, height: 60, objectFit: 'cover', borderRadius: 8, border: `1px solid ${C.border}` }} />
                            )}
                            <div>
                              <div style={{ fontSize: 18, fontWeight: 800, color: C.accent, fontFamily: 'Oswald, sans-serif' }}>
                                {(post.submission.fishLengthCm / 2.54).toFixed(1)}"
                              </div>
                              {post.submission.speciesName && <div style={{ fontSize: 12, color: C.textMuted }}>{post.submission.speciesName}</div>}
                              {post.submission.released && <div style={{ fontSize: 11, color: '#3DAF5A' }}>↩ Released</div>}
                            </div>
                          </div>
                        )}

                        {post.type === 'CHECK_IN' && (
                          <div style={{ fontSize: 13, color: C.textSub }}>{post.user.displayName} checked in to the tournament.</div>
                        )}

                        {(post.type === 'ANNOUNCEMENT' || post.type === 'ANGLER_POST') && post.body && (
                          <div style={{ fontSize: 14, color: C.text, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{post.body.replace(/\*\*(.*?)\*\*/g, '$1')}</div>
                        )}

                        {post.type === 'ANGLER_POST' && post.photoUrl && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={post.photoUrl} alt="" style={{ width: '100%', borderRadius: 8, marginTop: 8, border: `1px solid ${C.border}` }} />
                        )}
                      </div>
                    );
                  })}
                  {feedCursor && (
                    <button onClick={loadMoreFeed} disabled={feedLoading} style={{ padding: '10px 0', backgroundColor: 'transparent', color: feedLoading ? C.textMuted : C.accent, border: `1px solid ${C.border}`, borderRadius: 8, cursor: feedLoading ? 'default' : 'pointer', fontSize: 13, fontWeight: 600 }}>
                      {feedLoading ? 'Loading...' : 'Load more'}
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* CTA for non-logged-in spectators */}
            <div style={{
              marginTop: 40, textAlign: 'center', padding: '32px 20px',
              backgroundColor: C.surface, borderRadius: 16, border: `1px solid ${C.border}`,
            }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: C.text, marginBottom: 8 }}>
                Want to compete?
              </div>
              <div style={{ fontSize: 14, color: C.textMuted, marginBottom: 20 }}>
                Download FishLeague and enter the next tournament.
              </div>
              <Link href="/register" style={{
                backgroundColor: C.accent, color: C.bg, fontWeight: 700,
                padding: '12px 28px', borderRadius: 8, textDecoration: 'none',
                fontSize: 14, letterSpacing: 1, textTransform: 'uppercase', display: 'inline-block',
              }}>
                Join Free
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
