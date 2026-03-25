'use client';
import { useEffect, useCallback, useState, useRef } from 'react';
import Nav from '../../components/Nav';
import { api, isLoggedIn, getMyUserId, getMyRole } from '../../lib/api';
import type { Tournament, LeaderboardEntry, CatchComment, TournamentPost, PostComment } from '../../lib/api';

type MentionUser = { id: string; username: string; displayName: string };

function renderWithMentions(text: string, accentColor: string): React.ReactNode {
  const parts = text.split(/(@\w+)/g);
  return parts.map((part, i) =>
    /^@\w+$/.test(part)
      ? <a key={i} href={`/profile/${part.slice(1)}`} style={{ color: accentColor, fontWeight: 600, textDecoration: 'none' }}>{part}</a>
      : part
  );
}

function UserLink({ username, displayName, style }: { username?: string | null; displayName: string; style?: React.CSSProperties }) {
  if (username) {
    return <a href={`/profile/${username}`} style={{ textDecoration: 'none', ...style }}>{displayName}</a>;
  }
  return <span style={style}>{displayName}</span>;
}

function MentionInput({
  value, onChange, onSubmit, placeholder, accentColor, surfaceColor, borderColor, textColor,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  placeholder: string;
  accentColor: string;
  surfaceColor: string;
  borderColor: string;
  textColor: string;
}) {
  const [suggestions, setSuggestions] = useState<MentionUser[]>([]);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  function handleChange(v: string) {
    onChange(v);
    const match = v.match(/@(\w*)$/);
    if (match) {
      const q = match[1];
      setMentionQuery(q);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(async () => {
        if (q.length === 0) { setSuggestions([]); return; }
        try {
          const results = await api.searchUsers(q);
          setSuggestions(results);
        } catch { setSuggestions([]); }
      }, 200);
    } else {
      setMentionQuery(null);
      setSuggestions([]);
    }
  }

  function selectMention(user: MentionUser) {
    const replaced = value.replace(/@(\w*)$/, `@${user.username} `);
    onChange(replaced);
    setSuggestions([]);
    setMentionQuery(null);
  }

  return (
    <div ref={wrapRef} style={{ position: 'relative', flex: 1 }}>
      {suggestions.length > 0 && mentionQuery !== null && (
        <div style={{
          position: 'absolute', bottom: '100%', left: 0, right: 0, zIndex: 100,
          backgroundColor: surfaceColor, border: `1px solid ${borderColor}`,
          borderRadius: 8, overflow: 'hidden', marginBottom: 4,
          boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
        }}>
          {suggestions.map(u => (
            <button key={u.id} onClick={() => selectMention(u)}
              style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: '8px 12px', cursor: 'pointer', color: textColor, fontSize: 13 }}
              onMouseOver={e => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)')}
              onMouseOut={e => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <span style={{ fontWeight: 700, color: accentColor }}>@{u.username}</span>
              {u.displayName !== u.username && <span style={{ color: textColor, opacity: 0.6, marginLeft: 6 }}>{u.displayName}</span>}
            </button>
          ))}
        </div>
      )}
      <input
        value={value}
        onChange={e => handleChange(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter' && !e.shiftKey && suggestions.length === 0) { e.preventDefault(); onSubmit(); }
          if (e.key === 'Escape') { setSuggestions([]); setMentionQuery(null); }
        }}
        placeholder={placeholder}
        maxLength={500}
        style={{ width: '100%', boxSizing: 'border-box', padding: '7px 12px', fontSize: 13, backgroundColor: surfaceColor, border: `1px solid ${borderColor}`, borderRadius: 8, color: textColor, outline: 'none' }}
      />
    </div>
  );
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

function PhotoLightbox({ url, onClose }: { url: string; onClose: () => void }) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 9999, backgroundColor: 'rgba(0,0,0,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, width: 40, height: 40, borderRadius: 20, background: 'rgba(255,255,255,0.15)', border: 'none', cursor: 'pointer', color: '#fff', fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt="" onClick={e => e.stopPropagation()} style={{ maxWidth: '92vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: 10, boxShadow: '0 8px 48px rgba(0,0,0,0.8)' }} />
    </div>
  );
}

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

const SPECIES_FILTERS = ['All', 'Bass', 'Walleye', 'Trout', 'Pike', 'Catfish', 'Panfish', 'Other'];

function initials(name?: string | null) {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function AvatarCircle({ photoUrl, name, size = 42 }: { photoUrl?: string | null; name?: string | null; size?: number }) {
  if (photoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={photoUrl} alt="" style={{ width: size, height: size, borderRadius: size / 2, objectFit: 'cover', border: `1.5px solid ${C.borderGold}`, display: 'block', flexShrink: 0 }} />
    );
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: C.surfaceHigh, border: `1.5px solid ${C.borderGold}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.33, fontWeight: 700, color: C.textSub, flexShrink: 0,
    }}>
      {initials(name)}
    </div>
  );
}

function cmToInches(cm: number): string {
  return (cm / 2.54).toFixed(2);
}

const rankBorderColor = (rank: number) =>
  rank === 1 ? C.gold : rank === 2 ? C.silver : rank === 3 ? C.bronze : C.border;
const medalFor = (rank: number) => rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`;

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

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
    api.getProps(submissionId)
      .then(r => { setCount(r.count); setPropped(r.userHasPropped); })
      .catch(() => {});
  }, [submissionId]);

  async function handleToggle() {
    if (loading) return;
    setLoading(true);
    try {
      const r = await api.toggleProp(submissionId);
      setPropped(r.propped);
      setCount(r.count);
    } catch {
      // silently handle
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <button
          onClick={handleToggle}
          disabled={loading}
          style={{
            display: 'flex', alignItems: 'center', gap: 4,
            background: propped ? C.accent + '20' : C.surfaceHigh,
            border: `1px solid ${propped ? C.accent + '70' : C.border}`,
            borderRadius: 8, padding: '4px 8px', cursor: loading ? 'wait' : 'pointer',
            fontSize: 12, fontWeight: 700,
            color: propped ? C.accent : C.textMuted,
          }}
        >
          👍
        </button>
        <button
          onClick={() => count > 0 ? setShowWho(true) : undefined}
          style={{
            background: 'none', border: 'none', padding: '4px 2px',
            cursor: count > 0 ? 'pointer' : 'default',
            fontSize: 12, fontWeight: 700,
            color: count > 0 ? C.accent : C.textMuted,
            textDecoration: count > 0 ? 'underline' : 'none',
          }}
        >{count}</button>
      </div>
      {showWho && <PropsWhoModal submissionId={submissionId} onClose={() => setShowWho(false)} />}
    </>
  );
}

function CommentPropsWhoModal({ fetchWho, onClose }: { fetchWho: () => Promise<{ id: string; displayName: string; profilePhotoUrl: string | null }[]>; onClose: () => void }) {
  const [proppers, setProppers] = useState<{ id: string; displayName: string; profilePhotoUrl: string | null }[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { fetchWho().then(setProppers).catch(() => {}).finally(() => setLoading(false)); }, []);
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.surface, borderRadius: 16, padding: '20px 24px', minWidth: 260, maxWidth: 340, maxHeight: 360, overflowY: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <span style={{ fontWeight: 700, fontSize: 15, color: C.text }}>👍 Props</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: C.textMuted, cursor: 'pointer', fontSize: 20 }}>×</button>
        </div>
        {loading ? <div style={{ color: C.textMuted, fontSize: 13, textAlign: 'center', padding: '12px 0' }}>Loading…</div>
          : proppers.length === 0 ? <div style={{ color: C.textMuted, fontSize: 13, textAlign: 'center', padding: '12px 0' }}>No props yet.</div>
          : proppers.map(p => (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: `1px solid ${C.border}` }}>
              {p.profilePhotoUrl
                ? <img src={p.profilePhotoUrl} style={{ width: 30, height: 30, borderRadius: '50%', objectFit: 'cover' }} alt="" />
                : <div style={{ width: 30, height: 30, borderRadius: '50%', background: C.surfaceHigh, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: C.accent, fontSize: 12 }}>{p.displayName[0]?.toUpperCase()}</div>
              }
              <span style={{ color: C.text, fontSize: 13, fontWeight: 600 }}>{p.displayName}</span>
            </div>
          ))}
      </div>
    </div>
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
  const [whoCommentId, setWhoCommentId] = useState<string | null>(null);
  const [gifUrl, setGifUrl] = useState<string | null>(null);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [gifQuery, setGifQuery] = useState('');
  const [gifResults, setGifResults] = useState<Array<{ id: string; preview: string; full: string }>>([]);
  const [gifSearching, setGifSearching] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.getComments(submissionId)
      .then(setComments)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [submissionId]);

  async function searchGifsComment(q: string) {
    if (!q.trim()) return;
    setGifSearching(true);
    try {
      const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.fishleague.app';
      const res = await fetch(`${BASE}/gifs/search?q=${encodeURIComponent(q)}`);
      if (res.ok) { const data = await res.json(); setGifResults(data.data ?? []); }
    } catch { /* silent */ } finally { setGifSearching(false); }
  }

  function handlePhotoSelectComment(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setGifUrl(null);
    const reader = new FileReader();
    reader.onload = ev => setPhotoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
    if (photoInputRef.current) photoInputRef.current.value = '';
  }

  async function doSubmit() {
    const trimmed = body.trim();
    if (!trimmed && !gifUrl && !photoFile || submitting) return;
    setSubmitting(true);
    try {
      let photoKey: string | undefined;
      if (photoFile) {
        const r = await api.uploadCommentMedia(submissionId, photoFile);
        photoKey = r.photoKey;
      }
      const comment = await api.addComment(submissionId, trimmed, gifUrl ?? undefined, photoKey);
      setComments(prev => [comment, ...prev]);
      setBody('');
      setGifUrl(null);
      setPhotoFile(null);
      setPhotoPreview(null);
      setShowGifPicker(false);
    } catch { /* silently handle */ }
    finally { setSubmitting(false); }
  }

  async function handleEdit(commentId: string) {
    const trimmed = editBody.trim();
    if (!trimmed || editSaving) return;
    setEditSaving(true);
    try {
      const updated = await api.editComment(commentId, trimmed);
      setComments(prev => prev.map(c => c.id === commentId ? updated : c));
      setEditingId(null);
    } catch { /* silently handle */ }
    finally { setEditSaving(false); }
  }

  async function handleDelete(commentId: string) {
    if (!confirm('Delete this comment?')) return;
    try {
      await api.deleteComment(commentId);
      setComments(prev => prev.filter(c => c.id !== commentId));
    } catch { /* silently handle */ }
  }

  async function handleToggleProp(commentId: string) {
    if (!myUserId) return;
    try {
      const res = await api.toggleCommentProp(commentId);
      setComments(prev => prev.map(c => c.id === commentId ? { ...c, propCount: res.propCount, userHasPropped: res.userHasPropped } : c));
    } catch { /* silently handle */ }
  }

  return (
    <div style={{
      backgroundColor: C.surfaceHigh,
      borderRadius: '0 0 14px 14px',
      borderTop: `1px solid ${C.border}`,
      padding: '14px 20px',
    }}>
      {loading ? (
        <div style={{ color: C.textMuted, fontSize: 13 }}>Loading comments…</div>
      ) : (
        <>
          {comments.length === 0 && (
            <div style={{ color: C.textMuted, fontSize: 13, marginBottom: 10 }}>No comments yet.</div>
          )}
          {comments.map(c => {
            const name = c.user.profile?.username ?? c.user.displayName;
            const avatarUrl = c.user.profile?.profilePhotoUrl ?? null;
            return (
            <div key={c.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 10 }}>
              <a href={c.user.profile?.username ? `/profile/${c.user.profile.username}` : undefined} style={{ flexShrink: 0, marginTop: 1 }}>
                {avatarUrl ? (
                  <img src={avatarUrl} alt={name} style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', display: 'block' }} />
                ) : (
                  <div style={{ width: 28, height: 28, borderRadius: '50%', backgroundColor: C.surfaceHigh, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: C.textMuted, fontWeight: 700 }}>
                    {name.charAt(0).toUpperCase()}
                  </div>
                )}
              </a>
              <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                <UserLink username={c.user.profile?.username} displayName={name} style={{ fontSize: 12, fontWeight: 700, color: C.textSub }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 11, color: C.textMuted }}>{timeAgo(c.createdAt)}</span>
                  <button onClick={() => myUserId && handleToggleProp(c.id)}
                    style={{ background: 'none', border: 'none', cursor: myUserId ? 'pointer' : 'default', fontSize: 13, padding: '1px 4px', opacity: c.userHasPropped ? 1 : 0.35 }}
                    title={c.userHasPropped ? 'Remove prop' : 'Give prop'}>👍</button>
                  {(c.propCount ?? 0) > 0 && (
                    <button onClick={() => setWhoCommentId(c.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.userHasPropped ? C.accent : C.textSub, fontSize: 11, padding: '1px 2px', fontWeight: 700 }}>
                      {c.propCount}
                    </button>
                  )}
                  {myUserId && c.user.id === myUserId && editingId !== c.id && (
                    <>
                      <button onClick={() => { setEditingId(c.id); setEditBody(c.body); }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textMuted, fontSize: 11, padding: '1px 4px' }}
                        title="Edit">✏️</button>
                      <button onClick={() => handleDelete(c.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textMuted, fontSize: 11, padding: '1px 4px' }}
                        title="Delete">🗑</button>
                    </>
                  )}
                </div>
              </div>
              {editingId === c.id ? (
                <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                  <input
                    value={editBody}
                    onChange={e => setEditBody(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleEdit(c.id)}
                    maxLength={500}
                    autoFocus
                    style={{ flex: 1, padding: '5px 10px', fontSize: 13, backgroundColor: C.surface, border: `1px solid ${C.accent}`, borderRadius: 6, color: C.text, outline: 'none' }}
                  />
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
                <>
                  <span style={{ fontSize: 13, color: C.text }}>{renderWithMentions(c.body, C.accent)}</span>
                  {(c.gifUrl || c.photoUrl) && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.gifUrl ?? c.photoUrl ?? ''} alt="" style={{ maxWidth: '100%', maxHeight: 160, borderRadius: 8, marginTop: 4, display: 'block' }} />
                  )}
                </>
              )}
              </div>
            </div>
            );
          })}
        </>
      )}
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <MentionInput
          value={body}
          onChange={setBody}
          onSubmit={doSubmit}
          placeholder="Add a comment…"
          accentColor={C.accent}
          surfaceColor={C.surface}
          borderColor={C.border}
          textColor={C.text}
        />
        <button
          onClick={doSubmit}
          disabled={(!body.trim() && !gifUrl && !photoFile) || submitting}
          style={{
            background: C.accent, color: C.bg, border: 'none',
            borderRadius: 8, padding: '7px 16px', cursor: 'pointer',
            fontWeight: 700, fontSize: 13, opacity: ((!body.trim() && !gifUrl && !photoFile) || submitting) ? 0.5 : 1, flexShrink: 0,
          }}
        >
          {submitting ? '…' : 'Post'}
        </button>
      </div>
      {(gifUrl || photoPreview) && (
        <div style={{ position: 'relative', display: 'inline-block', marginTop: 6 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={gifUrl ?? photoPreview ?? ''} alt="" style={{ maxHeight: 100, borderRadius: 8, border: `1px solid ${C.border}`, display: 'block' }} />
          <button onClick={() => { setGifUrl(null); setPhotoFile(null); setPhotoPreview(null); }} style={{ position: 'absolute', top: 4, right: 4, width: 20, height: 20, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.7)', border: 'none', cursor: 'pointer', color: '#fff', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
        </div>
      )}
      <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
        <button onClick={() => photoInputRef.current?.click()} title="Attach photo"
          style={{ background: 'none', border: `1px solid ${photoFile ? C.accent : 'rgba(255,255,255,0.22)'}`, borderRadius: 6, padding: '3px 8px', cursor: 'pointer', fontSize: 15, lineHeight: 1, color: photoFile ? C.accent : C.textSub }}>📎</button>
        <input ref={photoInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePhotoSelectComment} style={{ display: 'none' }} />
        <button onClick={() => { setShowGifPicker(v => !v); setShowEmojiPicker(false); setGifQuery(''); setGifResults([]); }}
          style={{ background: 'none', border: `1px solid ${showGifPicker ? C.accent : 'rgba(255,255,255,0.22)'}`, borderRadius: 6, padding: '3px 8px', cursor: 'pointer', color: showGifPicker ? C.accent : C.textSub, fontSize: 11, fontWeight: 700 }}>GIF</button>
        <button onClick={() => { setShowEmojiPicker(v => !v); setShowGifPicker(false); }}
          style={{ background: 'none', border: `1px solid ${showEmojiPicker ? C.accent : 'rgba(255,255,255,0.22)'}`, borderRadius: 6, padding: '3px 8px', cursor: 'pointer', fontSize: 15, lineHeight: 1 }}>😊</button>
      </div>
      {showEmojiPicker && (
        <div style={{ marginTop: 8, backgroundColor: C.surfaceHigh, border: `1px solid ${C.border}`, borderRadius: 10, padding: 10 }}>
          {[
            { label: '🎣 Fishing', emojis: ['🎣','🐟','🐠','🐡','🦈','🌊','⚓','🚤','🛶','🏖️','🌅','🎯'] },
            { label: '🏆 Sports', emojis: ['🏆','🥇','🥈','🥉','💪','🤙','👊','🙌','👏','🎉','🔥','⚡'] },
            { label: '😀 Faces', emojis: ['😀','😂','🤣','😍','😎','🤩','😅','😭','🥳','😤','🤯','😱'] },
          ].map(cat => (
            <div key={cat.label} style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 10, color: C.textMuted, fontWeight: 700, letterSpacing: 1, marginBottom: 4 }}>{cat.label}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                {cat.emojis.map(em => (
                  <button key={em} onClick={() => setBody(b => b + em)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, padding: '2px 3px', borderRadius: 4 }}>
                    {em}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      {showGifPicker && (
        <div style={{ marginTop: 8, backgroundColor: C.surfaceHigh, border: `1px solid ${C.border}`, borderRadius: 10, padding: 10 }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <input value={gifQuery} onChange={e => setGifQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), searchGifsComment(gifQuery))}
              placeholder="Search GIFs…" autoFocus
              style={{ flex: 1, padding: '6px 10px', backgroundColor: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, color: C.text, fontSize: 12, outline: 'none' }} />
            <button onClick={() => searchGifsComment(gifQuery)} style={{ backgroundColor: C.accent, color: C.bg, border: 'none', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', fontWeight: 700, fontSize: 12 }}>Search</button>
          </div>
          {gifSearching && <div style={{ color: C.textMuted, fontSize: 12, textAlign: 'center', padding: 12 }}>Searching…</div>}
          {!gifSearching && gifResults.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4, maxHeight: 180, overflowY: 'auto' }}>
              {gifResults.map(g => (
                <button key={g.id} onClick={() => { setGifUrl(g.full); setPhotoFile(null); setPhotoPreview(null); setShowGifPicker(false); }}
                  style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: 6, overflow: 'hidden', cursor: 'pointer', padding: 0, aspectRatio: '1', backgroundColor: C.bg }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={g.preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </button>
              ))}
            </div>
          )}
          {!gifSearching && gifResults.length === 0 && (
            <div style={{ color: C.textMuted, fontSize: 12, textAlign: 'center', padding: 10 }}>{gifQuery ? 'No results.' : 'Search for a GIF above'}</div>
          )}
        </div>
      )}
      {whoCommentId && (
        <CommentPropsWhoModal
          fetchWho={() => api.getCommentPropsWho(whoCommentId)}
          onClose={() => setWhoCommentId(null)}
        />
      )}
    </div>
  );
}

function PostComments({ postId, tournamentId, myUserId }: { postId: string; tournamentId: string; myUserId: string | null }) {
  const [comments, setComments] = useState<PostComment[]>([]);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [whoCommentId, setWhoCommentId] = useState<string | null>(null);
  const [gifUrl, setGifUrl] = useState<string | null>(null);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [gifQuery, setGifQuery] = useState('');
  const [gifResults, setGifResults] = useState<Array<{ id: string; preview: string; full: string }>>([]);
  const [gifSearching, setGifSearching] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const loggedIn = isLoggedIn();

  useEffect(() => {
    api.getPostComments(postId).then(setComments).catch(() => {});
  }, [postId]);

  async function searchGifs(q: string) {
    if (!q.trim()) return;
    setGifSearching(true);
    try {
      const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.fishleague.app';
      const res = await fetch(`${BASE}/gifs/search?q=${encodeURIComponent(q)}`);
      if (res.ok) { const data = await res.json(); setGifResults(data.data ?? []); }
    } catch { /* silent */ } finally { setGifSearching(false); }
  }

  async function handleSend() {
    const trimmed = body.trim();
    if (!trimmed && !gifUrl || sending) return;
    setSending(true);
    try {
      let photoKey: string | undefined;
      if (photoFile) {
        const r = await api.uploadPostMedia(tournamentId, photoFile);
        photoKey = r.photoKey;
      }
      const c = await api.addPostComment(postId, trimmed, gifUrl ?? undefined, photoKey);
      setComments(prev => [c, ...prev]);
      setBody('');
      setGifUrl(null);
      setPhotoFile(null);
      setPhotoPreview(null);
      setShowGifPicker(false);
      setExpanded(true);
    } catch { /* silent */ } finally { setSending(false); }
  }

  function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setGifUrl(null);
    const reader = new FileReader();
    reader.onload = ev => setPhotoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
    if (photoInputRef.current) photoInputRef.current.value = '';
  }

  async function handleDelete(commentId: string) {
    try {
      await api.deletePostComment(commentId);
      setComments(prev => prev.filter(c => c.id !== commentId));
    } catch { /* silent */ }
  }

  async function handleToggleProp(commentId: string) {
    if (!myUserId) return;
    try {
      const res = await api.togglePostCommentProp(commentId);
      setComments(prev => prev.map(c => c.id === commentId ? { ...c, propCount: res.propCount, userHasPropped: res.userHasPropped } : c));
    } catch { /* silent */ }
  }

  return (
    <div style={{ marginTop: 12, borderTop: `1px solid ${C.border}`, paddingTop: 10 }}>
      {comments.length > 0 && (
        <button onClick={() => setExpanded(e => !e)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textSub, fontSize: 12, fontWeight: 600, padding: '2px 0', marginBottom: 8, display: 'block' }}>
          {expanded ? `▲ Hide comments (${comments.length})` : `💬 ${comments.length} comment${comments.length !== 1 ? 's' : ''}`}
        </button>
      )}
      {expanded && comments.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          {comments.map(c => {
            const name = c.user.profile?.username ?? c.user.displayName;
            const avatarUrl = c.user.profile?.profilePhotoUrl ?? null;
            const isOwn = myUserId === c.userId;
            return (
              <div key={c.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 10 }}>
                <a href={c.user.profile?.username ? `/profile/${c.user.profile.username}` : undefined} style={{ flexShrink: 0, marginTop: 1 }}>
                  {avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={avatarUrl} alt={name} style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', display: 'block' }} />
                  ) : (
                    <div style={{ width: 28, height: 28, borderRadius: '50%', backgroundColor: C.surfaceHigh, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: C.textMuted, fontWeight: 700 }}>
                      {name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </a>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                    <UserLink username={c.user.profile?.username} displayName={name} style={{ fontSize: 12, fontWeight: 700, color: C.text }} />
                    <span style={{ fontSize: 11, color: C.textMuted }}>{timeAgo(c.createdAt)}</span>
                    <button onClick={() => myUserId && handleToggleProp(c.id)}
                      style={{ background: 'none', border: 'none', cursor: myUserId ? 'pointer' : 'default', fontSize: 13, padding: '1px 4px', opacity: c.userHasPropped ? 1 : 0.35, marginLeft: 'auto' }}>👍</button>
                    {(c.propCount ?? 0) > 0 && (
                      <button onClick={() => setWhoCommentId(c.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.userHasPropped ? C.accent : C.textSub, fontSize: 11, padding: '1px 2px', fontWeight: 700 }}>
                        {c.propCount}
                      </button>
                    )}
                    {isOwn && (
                      <button onClick={() => handleDelete(c.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textMuted, fontSize: 12, padding: '2px 4px', flexShrink: 0 }}>✕</button>
                    )}
                  </div>
                  <div style={{ fontSize: 13, color: C.textSub, lineHeight: 1.5 }}>{renderWithMentions(c.body, C.accent)}</div>
                  {(c.gifUrl || c.photoUrl) && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.gifUrl ?? c.photoUrl ?? ''} alt="" style={{ maxWidth: '100%', maxHeight: 160, borderRadius: 8, marginTop: 4, display: 'block' }} />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      {loggedIn && (
        <div>
          <div style={{ display: 'flex', gap: 8 }}>
            <MentionInput value={body} onChange={setBody} onSubmit={handleSend} placeholder="Add a comment…"
              accentColor={C.accent} surfaceColor={C.surface} borderColor={C.border} textColor={C.text} />
            <button onClick={handleSend} disabled={(!body.trim() && !gifUrl && !photoFile) || sending}
              style={{ backgroundColor: C.accent, color: C.bg, border: 'none', borderRadius: 8, padding: '7px 16px', cursor: 'pointer', fontWeight: 700, fontSize: 13, opacity: ((!body.trim() && !gifUrl && !photoFile) || sending) ? 0.5 : 1, flexShrink: 0 }}>
              Post
            </button>
          </div>
          {(gifUrl || photoPreview) && (
            <div style={{ position: 'relative', display: 'inline-block', marginTop: 6 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={gifUrl ?? photoPreview ?? ''} alt="" style={{ maxHeight: 100, borderRadius: 8, border: `1px solid ${C.border}`, display: 'block' }} />
              <button onClick={() => { setGifUrl(null); setPhotoFile(null); setPhotoPreview(null); }} style={{ position: 'absolute', top: 4, right: 4, width: 20, height: 20, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.7)', border: 'none', cursor: 'pointer', color: '#fff', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
            </div>
          )}
          <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
            <button onClick={() => photoInputRef.current?.click()} title="Attach photo"
              style={{ background: 'none', border: `1px solid ${photoFile ? C.accent : 'rgba(255,255,255,0.22)'}`, borderRadius: 6, padding: '3px 8px', cursor: 'pointer', fontSize: 15, lineHeight: 1, color: photoFile ? C.accent : C.textSub }}>📎</button>
            <input ref={photoInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePhotoSelect} style={{ display: 'none' }} />
            <button onClick={() => { setShowGifPicker(v => !v); setShowEmojiPicker(false); setGifQuery(''); setGifResults([]); }}
              style={{ background: 'none', border: `1px solid ${showGifPicker ? C.accent : 'rgba(255,255,255,0.22)'}`, borderRadius: 6, padding: '3px 8px', cursor: 'pointer', color: showGifPicker ? C.accent : C.textSub, fontSize: 11, fontWeight: 700 }}>GIF</button>
            <button onClick={() => { setShowEmojiPicker(v => !v); setShowGifPicker(false); }}
              style={{ background: 'none', border: `1px solid ${showEmojiPicker ? C.accent : 'rgba(255,255,255,0.22)'}`, borderRadius: 6, padding: '3px 8px', cursor: 'pointer', fontSize: 15, lineHeight: 1 }}>😊</button>
          </div>
          {showEmojiPicker && (
            <div style={{ marginTop: 8, backgroundColor: C.surfaceHigh, border: `1px solid ${C.border}`, borderRadius: 10, padding: 10 }}>
              {[
                { label: '🎣 Fishing', emojis: ['🎣','🐟','🐠','🐡','🦈','🌊','⚓','🚤','🛶','🏖️','🌅','🎯'] },
                { label: '🏆 Sports', emojis: ['🏆','🥇','🥈','🥉','💪','🤙','👊','🙌','👏','🎉','🔥','⚡'] },
                { label: '😀 Faces', emojis: ['😀','😂','🤣','😍','😎','🤩','😅','😭','🥳','😤','🤯','😱'] },
              ].map(cat => (
                <div key={cat.label} style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 10, color: C.textMuted, fontWeight: 700, letterSpacing: 1, marginBottom: 4 }}>{cat.label}</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                    {cat.emojis.map(em => (
                      <button key={em} onClick={() => setBody(b => b + em)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, padding: '2px 3px', borderRadius: 4 }}>
                        {em}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
          {showGifPicker && (
            <div style={{ marginTop: 8, backgroundColor: C.surfaceHigh, border: `1px solid ${C.border}`, borderRadius: 10, padding: 10 }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <input value={gifQuery} onChange={e => setGifQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), searchGifs(gifQuery))}
                  placeholder="Search GIFs…" autoFocus
                  style={{ flex: 1, padding: '6px 10px', backgroundColor: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, color: C.text, fontSize: 12, outline: 'none' }} />
                <button onClick={() => searchGifs(gifQuery)} style={{ backgroundColor: C.accent, color: C.bg, border: 'none', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', fontWeight: 700, fontSize: 12 }}>Search</button>
              </div>
              {gifSearching && <div style={{ color: C.textMuted, fontSize: 12, textAlign: 'center', padding: 12 }}>Searching…</div>}
              {!gifSearching && gifResults.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4, maxHeight: 180, overflowY: 'auto' }}>
                  {gifResults.map(g => (
                    <button key={g.id} onClick={() => { setGifUrl(g.full); setShowGifPicker(false); }}
                      style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: 6, overflow: 'hidden', cursor: 'pointer', padding: 0, aspectRatio: '1', backgroundColor: C.bg }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={g.preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </button>
                  ))}
                </div>
              )}
              {!gifSearching && gifResults.length === 0 && (
                <div style={{ color: C.textMuted, fontSize: 12, textAlign: 'center', padding: 10 }}>{gifQuery ? 'No results.' : 'Search for a GIF above'}</div>
              )}
            </div>
          )}
        </div>
      )}
      {whoCommentId && (
        <CommentPropsWhoModal
          fetchWho={() => api.getPostCommentPropsWho(whoCommentId)}
          onClose={() => setWhoCommentId(null)}
        />
      )}
    </div>
  );
}

type Tab = 'largest' | 'season';

export default function LeaderboardPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<Tab>('largest');
  const [speciesFilter, setSpeciesFilter] = useState('All');
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [myUserId] = useState<string | null>(() => getMyUserId());
  const [myRole] = useState<string | null>(() => getMyRole());
  const [loggedIn, setLoggedIn] = useState(false);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editPostBody, setEditPostBody] = useState('');
  const [editPostSaving, setEditPostSaving] = useState(false);
  const [editRemovePhoto, setEditRemovePhoto] = useState(false);
  const [editPhotoFile, setEditPhotoFile] = useState<File | null>(null);
  const [editPhotoPreview, setEditPhotoPreview] = useState<string | null>(null);
  const [editGifUrl, setEditGifUrl] = useState<string | null>(null);
  const [editGifPreview, setEditGifPreview] = useState<string | null>(null);
  const [showEditGifPicker, setShowEditGifPicker] = useState(false);
  const [showEditEmojiPicker, setShowEditEmojiPicker] = useState(false);
  const [editGifQuery, setEditGifQuery] = useState('');
  const [editGifResults, setEditGifResults] = useState<Array<{ id: string; preview: string; full: string }>>([]);
  const [editGifSearching, setEditGifSearching] = useState(false);
  const editPhotoInputRef = useRef<HTMLInputElement>(null);
  // Feed + compose
  const [feed, setFeed] = useState<TournamentPost[]>([]);
  const [feedCursor, setFeedCursor] = useState<string | null>(null);
  const [feedLoading, setFeedLoading] = useState(false);
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
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const tournament = tournaments.find(t => t.id === selectedId) ?? tournaments[0] ?? null;

  const loadBoard = useCallback(async (id: string, species?: string) => {
    try {
      const board = await api.getLeaderboard(id, species === 'All' ? undefined : species);
      setEntries(board);
      setError('');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const load = useCallback(async (species?: string) => {
    try {
      const ts = await api.getActiveTournaments();
      setTournaments(ts);
      const active = ts[0];
      if (active) {
        setSelectedId(prev => prev && ts.find(t => t.id === prev) ? prev : active.id);
        await loadBoard(active.id, species);
        loadFeed(active.id);
      } else {
        setLoading(false);
      }
    } catch (e: any) {
      setError(e.message);
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadBoard]);

  async function selectTournament(id: string) {
    setSelectedId(id);
    setExpandedUserId(null);
    setSpeciesFilter('All');
    setFeed([]);
    setFeedCursor(null);
    setLoading(true);
    await loadBoard(id);
    loadFeed(id);
  }

  async function loadFeed(id: string, cursor?: string) {
    setFeedLoading(true);
    try {
      const res = await api.getTournamentFeed(id, cursor);
      setFeed(prev => cursor ? [...prev, ...res.posts] : res.posts);
      setFeedCursor(res.nextCursor);
    } catch { /* non-critical */ }
    finally { setFeedLoading(false); }
  }

  function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPostPhoto(file);
    setPostGif(null); setPostGifPreview(null);
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
    setPostGif(gif.full); setPostGifPreview(gif.preview);
    setPostPhoto(null); setPostPhotoPreview(null);
    setShowGifPicker(false); setGifResults([]); setGifQuery('');
  }

  function insertEmoji(emoji: string) {
    const ta = textAreaRef.current;
    if (!ta) { setPostBody(b => b + emoji); return; }
    const start = ta.selectionStart ?? postBody.length;
    const end = ta.selectionEnd ?? postBody.length;
    setPostBody(b => b.slice(0, start) + emoji + b.slice(end));
    setShowEmojiPicker(false);
    setTimeout(() => { ta.focus(); ta.setSelectionRange(start + emoji.length, start + emoji.length); }, 0);
  }

  async function handleEditPost(postId: string) {
    const trimmed = editPostBody.trim();
    if ((!trimmed && !editRemovePhoto && !editPhotoFile && !editGifUrl) || editPostSaving) return;
    setEditPostSaving(true);
    try {
      let photoKey: string | undefined;
      let gifUrl: string | undefined;
      if (editPhotoFile && tournament) {
        const r = await api.uploadPostMedia(tournament.id, editPhotoFile);
        photoKey = r.photoKey;
      } else if (editGifUrl) {
        gifUrl = editGifUrl;
      }
      const updated = await api.editTournamentPost(postId, trimmed, editRemovePhoto || undefined, photoKey, gifUrl);
      setFeed(prev => prev.map(p => p.id === postId ? { ...p, body: updated.body, photoUrl: editRemovePhoto ? null : (updated.photoUrl ?? (editGifUrl || editPhotoFile ? updated.photoUrl : p.photoUrl)) } : p));
      setEditingPostId(null);
      setEditRemovePhoto(false);
      setEditPhotoFile(null); setEditPhotoPreview(null); setEditGifUrl(null); setEditGifPreview(null);
    } catch { /* silently fail */ }
    finally { setEditPostSaving(false); }
  }

  function handleEditPhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setEditPhotoFile(file);
    setEditGifUrl(null); setEditGifPreview(null);
    const reader = new FileReader();
    reader.onload = ev => setEditPhotoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  async function searchEditGifs(q: string) {
    if (!q.trim()) return;
    setEditGifSearching(true);
    try {
      const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.fishleague.app';
      const res = await fetch(`${BASE}/gifs/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setEditGifResults(data.data ?? []);
    } catch { setEditGifResults([]); }
    finally { setEditGifSearching(false); }
  }

  function selectEditGif(gif: { id: string; preview: string; full: string }) {
    setEditGifUrl(gif.full); setEditGifPreview(gif.preview);
    setEditPhotoFile(null); setEditPhotoPreview(null);
    setShowEditGifPicker(false); setEditGifResults([]); setEditGifQuery('');
  }

  function insertEditEmoji(emoji: string) {
    setEditPostBody(b => b + emoji);
    setShowEditEmojiPicker(false);
  }

  async function handleDeletePost(postId: string) {
    if (!confirm('Delete this post?')) return;
    try {
      await api.deleteTournamentPost(postId);
      setFeed(prev => prev.filter(p => p.id !== postId));
    } catch { /* silently fail */ }
  }

  async function handlePost(e: React.FormEvent) {
    e.preventDefault();
    if (!tournament || posting || (!postBody.trim() && !postPhoto && !postGif)) return;
    setPosting(true);
    try {
      let photoKey: string | undefined;
      if (postPhoto) {
        const r = await api.uploadPostMedia(tournament.id, postPhoto);
        photoKey = r.photoKey;
      }
      const newPost = await api.createTournamentPost(tournament.id, postBody.trim(), photoKey, postGif ?? undefined);
      setFeed(prev => [newPost as any, ...prev]);
      setPostBody(''); setPostPhoto(null); setPostPhotoPreview(null); setPostGif(null); setPostGifPreview(null);
    } catch { /* silently fail */ }
    finally { setPosting(false); }
  }

  useEffect(() => {
    setLoggedIn(isLoggedIn());
    load(speciesFilter);
    const interval = setInterval(() => {
      if (tournament) loadBoard(tournament.id, speciesFilter);
    }, 30000);
    return () => clearInterval(interval);
  }, [load, speciesFilter, loadBoard]);

  useEffect(() => {
    if (isLoggedIn()) {
    }
  }, []);

  function tabStyle(name: Tab): React.CSSProperties {
    const active = tab === name;
    return {
      background: 'none',
      border: 'none',
      borderBottom: active ? `2px solid ${C.accent}` : '2px solid transparent',
      color: active ? C.accent : C.textMuted,
      fontWeight: 700,
      fontSize: 14,
      letterSpacing: 1,
      textTransform: 'uppercase',
      padding: '10px 20px',
      cursor: 'pointer',
    };
  }

  function toggleExpanded(userId: string) {
    setExpandedUserId(prev => (prev === userId ? null : userId));
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: C.bg, paddingBottom: 80 }}>
      {lightboxUrl && <PhotoLightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />}
      <Nav active="leaderboard" />

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '20px 16px' }}>
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <h1 className="display" style={{ fontSize: 'clamp(22px, 5vw, 36px)', fontWeight: 900, color: C.text, margin: '0 0 6px', letterSpacing: -1, textTransform: 'uppercase' }}>
            Leaderboard
          </h1>
          {/* Tournament selector tabs */}
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
            <a
              href={`/leaderboard/${tournament.id}`}
              style={{ textDecoration: 'none', display: 'block', marginBottom: 4 }}
            >
              <div style={{
                background: C.surface,
                border: `1px solid ${C.accent}50`,
                borderRadius: 10,
                padding: '10px 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                transition: 'border-color 0.15s',
              }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = C.accent)}
                onMouseLeave={e => (e.currentTarget.style.borderColor = C.accent + '50')}
              >
                <div>
                  <div style={{ color: C.accent, fontWeight: 700, fontSize: 15 }}>{tournament.name}</div>
                  <div style={{ color: C.textSub, fontSize: 13, marginTop: 2 }}>
                    {tournament.region?.name} · Ends {new Date(tournament.endsAt).toLocaleDateString()}
                  </div>
                  {(tournament.entryFeeCents > 0 || tournament.prizePoolCents > 0) && (
                    <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
                      {tournament.entryFeeCents > 0 && (
                        <span style={{ fontSize: 12, color: C.textSub, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 5, padding: '2px 8px' }}>
                          Entry: {formatCents(tournament.entryFeeCents)}
                        </span>
                      )}
                      {tournament.prizePoolCents > 0 && (
                        <span style={{ fontSize: 12, color: C.accent, background: C.accent + '18', border: `1px solid ${C.accent}50`, borderRadius: 5, padding: '2px 8px', fontWeight: 700 }}>
                          🏆 {formatCents(tournament.prizePoolCents)}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <div style={{ color: C.accent, fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', marginLeft: 12 }}>
                  View Details →
                </div>
              </div>
            </a>
          )}
          <p style={{ color: C.textMuted, fontSize: 11, margin: '4px 0 0', letterSpacing: 1.5, textTransform: 'uppercase' }}>
            Auto-refreshes every 30s
          </p>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: `1px solid ${C.border}`, marginBottom: 16 }}>
          <button style={tabStyle('largest')} onClick={() => setTab('largest')}>Largest Fish</button>
          <button style={tabStyle('season')} onClick={() => setTab('season')}>Season Standings</button>
        </div>

        {/* Species filter pills */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
          {SPECIES_FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setSpeciesFilter(f)}
              style={{
                background: speciesFilter === f ? C.accent + '25' : C.surface,
                border: `1px solid ${speciesFilter === f ? C.accent : C.border}`,
                borderRadius: 20, padding: '5px 14px', cursor: 'pointer',
                fontSize: 12, fontWeight: speciesFilter === f ? 700 : 500,
                color: speciesFilter === f ? C.accent : C.textMuted,
              }}
            >
              {f}
            </button>
          ))}
        </div>

        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: 80 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icon.png" alt="FishLeague" style={{ width: 80, height: 80, objectFit: 'contain', opacity: 0.7 }} />
            <span style={{ color: C.textMuted, fontSize: 13 }}>Loading...</span>
          </div>
        )}

        {error && !loading && (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <p style={{ color: C.textSub, fontSize: 18 }}>No active tournament right now.</p>
            <p style={{ color: C.textMuted, fontSize: 14 }}>Check back when the next week opens.</p>
          </div>
        )}

        {!loading && !error && entries.length === 0 && (
          <div style={{ textAlign: 'center', color: C.textMuted, padding: 60, fontSize: 16 }}>
            No entries yet — tournament just opened!
          </div>
        )}

        {/* Your Rank banner */}
        {myUserId && !loading && entries.length > 0 && (() => {
          const myEntry = entries.find(e => e.userId === myUserId);
          if (!myEntry) return null;
          return (
            <div style={{
              backgroundColor: C.accent + '15', border: `1px solid ${C.accent}50`,
              borderRadius: 12, padding: '14px 20px', marginBottom: 16,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
            }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 800, color: C.accent, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 4 }}>Your Rank</div>
                <div style={{ fontSize: 28, fontWeight: 900, color: C.accent }}>#{myEntry.rank}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 22, fontWeight: 900, color: C.text }}>{cmToInches(myEntry.fishLengthCm)} <span style={{ fontSize: 13, color: C.textSub }}>IN</span></div>
                {myEntry.speciesName && <div style={{ fontSize: 13, color: C.textMuted, marginTop: 2 }}>{myEntry.speciesName}</div>}
              </div>
            </div>
          );
        })()}

        {/* Leaderboard entries */}
        {!loading && entries.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 32 }}>
            {entries.map((entry) => (
              <div key={entry.userId}>
                <div
                  onClick={() => toggleExpanded(entry.userId)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    backgroundColor: entry.rank === 1 ? C.surfaceHigh : C.surface,
                    border: `1px solid ${entry.rank === 1 ? C.accent + '40' : C.border}`,
                    borderRadius: expandedUserId === entry.userId ? '14px 14px 0 0' : 14,
                    padding: '16px 20px',
                    gap: 14,
                    cursor: 'pointer',
                  }}
                >
                  {/* Rank circle */}
                  <div style={{
                    width: 40, height: 40, borderRadius: 20, flexShrink: 0,
                    border: `2px solid ${rankBorderColor(entry.rank)}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: entry.rank <= 3 ? 18 : 13, fontWeight: 800,
                    color: rankBorderColor(entry.rank),
                    backgroundColor: C.bg,
                  }}>
                    {medalFor(entry.rank)}
                  </div>

                  {/* Avatar */}
                  <AvatarCircle photoUrl={entry.profilePhotoUrl} name={entry.displayName} size={42} />

                  {/* Name */}
                  <div style={{ flex: 1 }}>
                    <UserLink username={entry.username} displayName={entry.displayName} style={{ fontWeight: 700, fontSize: 16, color: C.text }} />
                    {entry.username && (
                      <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>
                        <a href={`/profile/${entry.username}`} style={{ color: C.textMuted, textDecoration: 'none' }}>@{entry.username}</a>
                      </div>
                    )}
                    {entry.speciesName && (
                      <div style={{ fontSize: 12, color: C.accent, marginTop: 2 }}>{entry.speciesName}</div>
                    )}
                  </div>

                  {/* Measurement + prop btn */}
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div>
                      <span style={{ fontSize: 22, fontWeight: 900, color: C.accent }}>{cmToInches(entry.fishLengthCm)}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: C.textSub, marginLeft: 3 }}>IN</span>
                    </div>
                    <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>{entry.rank} PTS</div>
                    {entry.submissionId && (
                      <div style={{ marginTop: 6 }} onClick={e => e.stopPropagation()}>
                        <PropButton submissionId={entry.submissionId} />
                      </div>
                    )}
                  </div>
                </div>

                {/* Comments section */}
                {expandedUserId === entry.userId && entry.submissionId && (
                  <CommentsSection submissionId={entry.submissionId} myUserId={myUserId} />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Compose bar */}
        {loggedIn && tournament && !loading && (
          <div style={{ marginBottom: 32, backgroundColor: C.surface, borderRadius: 16, border: `1px solid ${C.border}`, padding: '16px 16px' }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: C.textMuted, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 12 }}>Post to Feed</div>
            <form onSubmit={handlePost}>
              <textarea ref={textAreaRef} value={postBody} onChange={e => setPostBody(e.target.value)}
                placeholder="Share something with the tournament..." maxLength={1000} rows={3}
                style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', backgroundColor: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, color: C.text, fontSize: 14, outline: 'none', resize: 'vertical', fontFamily: 'inherit' }} />

              {(postPhotoPreview || postGifPreview) && (
                <div style={{ marginTop: 10, position: 'relative', display: 'inline-block' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={postPhotoPreview ?? postGifPreview ?? ''} alt="" style={{ maxHeight: 160, borderRadius: 10, border: `1px solid ${C.border}`, display: 'block' }} />
                  <button type="button" onClick={() => { setPostPhoto(null); setPostPhotoPreview(null); setPostGif(null); setPostGifPreview(null); if (photoInputRef.current) photoInputRef.current.value = ''; }}
                    style={{ position: 'absolute', top: 6, right: 6, width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.7)', border: 'none', cursor: 'pointer', color: '#fff', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>×</button>
                </div>
              )}

              {showGifPicker && (
                <div style={{ marginTop: 10, backgroundColor: C.surfaceHigh, border: `1px solid ${C.border}`, borderRadius: 12, padding: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, letterSpacing: 1, textTransform: 'uppercase' }}>Search GIFs</span>
                    <button type="button" onClick={() => setShowGifPicker(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textMuted, fontSize: 18, lineHeight: 1, padding: '2px 4px' }}>×</button>
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                    <input value={gifQuery} onChange={e => setGifQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), searchGifs(gifQuery))}
                      placeholder="Search GIFs..." autoFocus
                      style={{ flex: 1, padding: '8px 12px', backgroundColor: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, fontSize: 13, outline: 'none' }} />
                    <button type="button" onClick={() => searchGifs(gifQuery)} style={{ backgroundColor: C.accent, color: C.bg, border: 'none', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>Search</button>
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
                  {!gifSearching && gifResults.length === 0 && (
                    <div style={{ color: C.textMuted, fontSize: 13, textAlign: 'center', padding: 20 }}>{gifQuery ? 'No results.' : 'Search for a GIF above'}</div>
                  )}
                  <div style={{ marginTop: 8, textAlign: 'right' }}><span style={{ fontSize: 10, color: C.textMuted }}>Powered by GIPHY</span></div>
                </div>
              )}

              {showEmojiPicker && (
                <div style={{ marginTop: 10, backgroundColor: C.surfaceHigh, border: `1px solid ${C.border}`, borderRadius: 12, padding: 12 }}>
                  {[
                    { label: '🎣 Fishing', emojis: ['🎣','🐟','🐠','🐡','🦈','🦑','🦐','🦀','🦞','🐙','🌊','⚓','🚤','🛶','🏖️','🌅'] },
                    { label: '🏆 Sports', emojis: ['🏆','🥇','🥈','🥉','🎯','💪','🤙','👊','🙌','👏','🎉','🎊','🔥','⚡','💥','🌟'] },
                    { label: '😀 Faces', emojis: ['😀','😂','🤣','😍','🥰','😎','🤩','😏','🙃','😅','😭','😤','🤯','😱','🥳','😤'] },
                    { label: '🌿 Nature', emojis: ['🌊','🌅','🌄','⛅','🌤️','☀️','🌙','⭐','🌿','🌱','🍃','🌲','🏔️','🗻','⛰️','🌾'] },
                  ].map(cat => (
                    <div key={cat.label} style={{ marginBottom: 10 }}>
                      <div style={{ fontSize: 10, color: C.textMuted, fontWeight: 700, letterSpacing: 1, marginBottom: 4 }}>{cat.label}</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                        {cat.emojis.map(em => (
                          <button key={em} type="button" onClick={() => insertEmoji(em)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, padding: '3px 4px', borderRadius: 6, lineHeight: 1 }}>
                            {em}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
                {(() => {
                  const btnBase: React.CSSProperties = { width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, cursor: 'pointer', border: `1px solid ${C.border}`, flexShrink: 0 };
                  return (<>
                    <button type="button" onClick={() => photoInputRef.current?.click()} title="Attach photo" style={{ ...btnBase, background: C.surfaceHigh, fontSize: 16, color: C.textSub }}>📎</button>
                    <input ref={photoInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handlePhotoSelect} style={{ display: 'none' }} />
                    <button type="button" onClick={() => { setShowGifPicker(v => !v); setShowEmojiPicker(false); }}
                      style={{ ...btnBase, background: showGifPicker ? C.accent + '30' : C.surfaceHigh, border: `1px solid ${showGifPicker ? C.accent : C.border}`, color: showGifPicker ? C.accent : C.textSub, fontSize: 11, fontWeight: 800, letterSpacing: 0.5 }}>GIF</button>
                    <button type="button" onClick={() => { setShowEmojiPicker(v => !v); setShowGifPicker(false); }}
                      style={{ ...btnBase, background: showEmojiPicker ? C.accent + '30' : C.surfaceHigh, border: `1px solid ${showEmojiPicker ? C.accent : C.border}`, fontSize: 18, lineHeight: 1 }}>😊</button>
                  </>);
                })()}
                <button type="submit" disabled={posting || (!postBody.trim() && !postPhoto && !postGif)}
                  style={{ marginLeft: 'auto', backgroundColor: C.accent, color: C.bg, border: 'none', borderRadius: 8, padding: '7px 20px', cursor: 'pointer', fontWeight: 700, fontSize: 13, opacity: (posting || (!postBody.trim() && !postPhoto && !postGif)) ? 0.5 : 1 }}>
                  {posting ? 'Posting…' : 'Post'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Tournament feed */}
        {(feed.length > 0 || feedLoading) && !loading && (
          <div style={{ marginBottom: 32 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: C.textMuted, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 12 }}>Tournament Feed</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {feed.map(post => {
                const badgeColor = post.type === 'ANNOUNCEMENT' ? '#D4820A' : post.type === 'CATCH' ? C.verified : post.type === 'CHECK_IN' ? C.textSub : C.accent;
                const badgeLabel = post.type === 'ANNOUNCEMENT' ? '📢 Announcement' : post.type === 'CATCH' ? '🎣 Catch' : post.type === 'CHECK_IN' ? '✅ Check-In' : '💬 Post';
                const isAuthor = myUserId && post.user.id === myUserId;
                const isAdmin = myRole === 'ADMIN' || myRole === 'TOURNAMENT_ADMIN';
                const isDirector = myUserId && tournament?.director?.id === myUserId;
                const canEdit = post.type === 'ANGLER_POST' && isAuthor;
                const canDelete = post.type === 'ANGLER_POST' && (isAuthor || isAdmin || isDirector);
                const isEditing = editingPostId === post.id;
                return (
                  <div key={post.id} style={{ backgroundColor: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                      {post.user.profile?.profilePhotoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={post.user.profile.profilePhotoUrl} alt="" style={{ width: 32, height: 32, borderRadius: 16, objectFit: 'cover', border: `1px solid ${C.border}`, flexShrink: 0 }} />
                      ) : (
                        <div style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: C.bg, border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: C.textSub, flexShrink: 0 }}>
                          {post.user.displayName.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <UserLink username={post.user.profile?.username} displayName={post.user.displayName} style={{ fontSize: 13, fontWeight: 700, color: C.text }} />
                        <div style={{ fontSize: 11, color: C.textMuted, marginTop: 1 }}>
                          {new Date(post.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                          {tournament && <>{' · '}<a href={`/leaderboard/${tournament.id}`} style={{ color: C.textMuted, textDecoration: 'none', fontWeight: 600 }} onMouseOver={e => (e.currentTarget.style.color = C.accent)} onMouseOut={e => (e.currentTarget.style.color = C.textMuted)}>{tournament.name}</a></>}
                        </div>
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 700, color: badgeColor, backgroundColor: badgeColor + '20', border: `1px solid ${badgeColor}40`, borderRadius: 6, padding: '2px 8px' }}>{badgeLabel}</span>
                      {(canEdit || canDelete) && !isEditing && (
                        <div style={{ display: 'flex', gap: 4, marginLeft: 4 }}>
                          {canEdit && (
                            <button onClick={() => { setEditingPostId(post.id); setEditPostBody(post.body ?? ''); setEditRemovePhoto(false); setEditPhotoFile(null); setEditPhotoPreview(null); setEditGifUrl(null); setEditGifPreview(null); setShowEditGifPicker(false); setShowEditEmojiPicker(false); }}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textMuted, fontSize: 14, padding: '2px 6px', borderRadius: 4 }} title="Edit">✏️</button>
                          )}
                          {canDelete && (
                            <button onClick={() => handleDeletePost(post.id)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textMuted, fontSize: 14, padding: '2px 6px', borderRadius: 4 }} title="Delete">🗑</button>
                          )}
                        </div>
                      )}
                    </div>
                    {post.type === 'CATCH' && post.submission && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                        {post.photoUrl && <img src={post.photoUrl} alt="catch" onClick={() => setLightboxUrl(post.photoUrl!)} style={{ width: 80, height: 60, objectFit: 'cover', borderRadius: 8, border: `1px solid ${C.border}`, cursor: 'pointer' }} />}
                        <div>
                          <div style={{ fontSize: 18, fontWeight: 800, color: C.accent }}>{(post.submission.fishLengthCm / 2.54).toFixed(1)}"</div>
                          {post.submission.speciesName && <div style={{ fontSize: 12, color: C.textMuted }}>{post.submission.speciesName}</div>}
                        </div>
                      </div>
                    )}
                    {post.type === 'CHECK_IN' && <div style={{ fontSize: 13, color: C.textSub }}><UserLink username={post.user.profile?.username} displayName={post.user.displayName} style={{ color: C.textSub, fontWeight: 600 }} /> checked in to the tournament.</div>}
                    {(post.type === 'ANNOUNCEMENT' || post.type === 'ANGLER_POST') && !isEditing && post.body && (
                      <div style={{ fontSize: 14, color: C.text, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{renderWithMentions(post.body.replace(/\*\*(.*?)\*\*/g, '$1'), C.accent)}</div>
                    )}
                    {isEditing && (
                      <div style={{ marginTop: 4 }}>
                        <textarea value={editPostBody} onChange={e => setEditPostBody(e.target.value)} rows={3} autoFocus
                          style={{ width: '100%', boxSizing: 'border-box', padding: '8px 10px', backgroundColor: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, fontSize: 14, outline: 'none', resize: 'vertical', fontFamily: 'inherit' }} />
                        {post.photoUrl && !editRemovePhoto && !editPhotoPreview && !editGifPreview && (
                          <div style={{ marginTop: 8, position: 'relative', display: 'inline-block' }}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={post.photoUrl} alt="" style={{ maxHeight: 120, borderRadius: 8, border: `1px solid ${C.border}`, display: 'block', opacity: 0.8 }} />
                            <button type="button" onClick={() => setEditRemovePhoto(true)}
                              style={{ position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(0,0,0,0.75)', border: 'none', cursor: 'pointer', color: '#fff', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                          </div>
                        )}
                        {post.photoUrl && editRemovePhoto && (
                          <div style={{ marginTop: 6, fontSize: 12, color: C.textMuted }}>
                            Image will be removed on save.{' '}
                            <button type="button" onClick={() => setEditRemovePhoto(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.accent, fontSize: 12, padding: 0 }}>Undo</button>
                          </div>
                        )}
                        {(editPhotoPreview || editGifPreview) && (
                          <div style={{ marginTop: 8, position: 'relative', display: 'inline-block' }}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={editPhotoPreview ?? editGifPreview ?? ''} alt="" style={{ maxHeight: 120, borderRadius: 8, border: `1px solid ${C.border}`, display: 'block' }} />
                            <button type="button" onClick={() => { setEditPhotoFile(null); setEditPhotoPreview(null); setEditGifUrl(null); setEditGifPreview(null); if (editPhotoInputRef.current) editPhotoInputRef.current.value = ''; }}
                              style={{ position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(0,0,0,0.75)', border: 'none', cursor: 'pointer', color: '#fff', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                          </div>
                        )}
                        {showEditGifPicker && (
                          <div style={{ marginTop: 10, backgroundColor: C.surfaceHigh, border: `1px solid ${C.border}`, borderRadius: 12, padding: 12 }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                              <span style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, letterSpacing: 1, textTransform: 'uppercase' }}>Search GIFs</span>
                              <button type="button" onClick={() => setShowEditGifPicker(false)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textMuted, fontSize: 18, lineHeight: 1, padding: '2px 4px', borderRadius: 4 }}>×</button>
                            </div>
                            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                              <input value={editGifQuery} onChange={e => setEditGifQuery(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), searchEditGifs(editGifQuery))}
                                placeholder="Search GIFs..."
                                style={{ flex: 1, padding: '8px 12px', backgroundColor: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, fontSize: 13, outline: 'none' }} autoFocus />
                              <button type="button" onClick={() => searchEditGifs(editGifQuery)}
                                style={{ backgroundColor: C.accent, color: C.bg, border: 'none', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>Search</button>
                            </div>
                            {editGifSearching && <div style={{ color: C.textMuted, fontSize: 13, textAlign: 'center', padding: 20 }}>Searching…</div>}
                            {!editGifSearching && editGifResults.length > 0 && (
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, maxHeight: 200, overflowY: 'auto' }}>
                                {editGifResults.map(g => (
                                  <button key={g.id} type="button" onClick={() => selectEditGif(g)}
                                    style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: 8, overflow: 'hidden', cursor: 'pointer', padding: 0, aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg }}>
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={g.preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                  </button>
                                ))}
                              </div>
                            )}
                            {!editGifSearching && editGifResults.length === 0 && (
                              <div style={{ color: C.textMuted, fontSize: 13, textAlign: 'center', padding: 16 }}>{editGifQuery ? 'No results.' : 'Search for a GIF above'}</div>
                            )}
                            <div style={{ marginTop: 8, textAlign: 'right' }}><span style={{ fontSize: 10, color: C.textMuted }}>Powered by GIPHY</span></div>
                          </div>
                        )}
                        {showEditEmojiPicker && (
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
                                    <button key={em} type="button" onClick={() => insertEditEmoji(em)}
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
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
                          {(() => {
                            const mediaBtnStyle: React.CSSProperties = { width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 7, cursor: 'pointer', border: `1px solid ${C.border}`, backgroundColor: C.surfaceHigh, flexShrink: 0 };
                            return (
                              <>
                                <button type="button" onClick={() => editPhotoInputRef.current?.click()} title="Attach photo" style={{ ...mediaBtnStyle, fontSize: 15, color: C.textSub }}>📎</button>
                                <input ref={editPhotoInputRef} type="file" accept="image/*" onChange={handleEditPhotoSelect} style={{ display: 'none' }} />
                                <button type="button" onClick={() => { setShowEditGifPicker(v => !v); setShowEditEmojiPicker(false); }}
                                  style={{ ...mediaBtnStyle, background: showEditGifPicker ? C.accent + '30' : C.surfaceHigh, border: `1px solid ${showEditGifPicker ? C.accent : C.border}`, color: showEditGifPicker ? C.accent : C.textSub, fontSize: 10, fontWeight: 800, letterSpacing: 0.5 }}>GIF</button>
                                <button type="button" onClick={() => { setShowEditEmojiPicker(v => !v); setShowEditGifPicker(false); }}
                                  style={{ ...mediaBtnStyle, background: showEditEmojiPicker ? C.accent + '30' : C.surfaceHigh, border: `1px solid ${showEditEmojiPicker ? C.accent : C.border}`, fontSize: 16, lineHeight: 1 }}>😊</button>
                                <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                                  <button onClick={() => handleEditPost(post.id)} disabled={editPostSaving || (!editPostBody.trim() && !editRemovePhoto && !editPhotoFile && !editGifUrl)}
                                    style={{ backgroundColor: C.accent, color: C.bg, border: 'none', borderRadius: 6, padding: '5px 14px', cursor: 'pointer', fontWeight: 700, fontSize: 13, opacity: editPostSaving ? 0.6 : 1 }}>
                                    {editPostSaving ? 'Saving…' : 'Save'}
                                  </button>
                                  <button onClick={() => { setEditingPostId(null); setEditRemovePhoto(false); setEditPhotoFile(null); setEditPhotoPreview(null); setEditGifUrl(null); setEditGifPreview(null); setShowEditGifPicker(false); setShowEditEmojiPicker(false); }}
                                    style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: 6, padding: '5px 14px', cursor: 'pointer', color: C.textSub, fontSize: 13 }}>
                                    Cancel
                                  </button>
                                </div>
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    )}
                    {post.type === 'ANGLER_POST' && post.photoUrl && !isEditing && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={post.photoUrl} alt="" onClick={() => setLightboxUrl(post.photoUrl!)} style={{ width: '100%', borderRadius: 8, marginTop: 8, border: `1px solid ${C.border}`, cursor: 'pointer' }} />
                    )}
                    {!isEditing && <PostComments postId={post.id} tournamentId={selectedId ?? ''} myUserId={myUserId} />}
                  </div>
                );
              })}
              {feedCursor && tournament && (
                <button onClick={() => loadFeed(tournament.id, feedCursor)} disabled={feedLoading}
                  style={{ padding: '10px 0', backgroundColor: 'transparent', color: feedLoading ? C.textMuted : C.accent, border: `1px solid ${C.border}`, borderRadius: 8, cursor: feedLoading ? 'default' : 'pointer', fontSize: 13, fontWeight: 600 }}>
                  {feedLoading ? 'Loading...' : 'Load more'}
                </button>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
