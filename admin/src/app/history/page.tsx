'use client';
import { useEffect, useState } from 'react';
import { api } from '../../lib/api';

const C = {
  bg: '#3A4C44', surface: '#2E3D38', surfaceHigh: '#445C54',
  border: '#4A6058', accent: '#CFC29C',
  green: '#3DAF5A', red: '#C0392B', orange: '#D4820A',
  blue: '#3A7ABF', purple: '#9b59b6',
  text: '#F0EDE4', textSub: '#9DB5A8', textMuted: '#6B7D73',
};

const PAGE_SIZE = 50;

type PageTab = 'audit' | 'submissions';

interface SubmissionEntry {
  id: string;
  user: { displayName: string; email: string };
  tournament: { name: string };
  fishLengthCm: number;
  gpsLat: number;
  gpsLng: number;
  capturedAt: string;
  createdAt: string;
  status: string;
  matSerial: { serialCode: string } | null;
  flagDuplicateHash: boolean;
  flagDuplicateGps: boolean;
}

const STATUS_META: Record<string, { label: string; color: string }> = {
  PENDING:  { label: 'Pending',  color: C.orange },
  APPROVED: { label: 'Approved', color: C.green  },
  REJECTED: { label: 'Rejected', color: C.red    },
  FLAGGED:  { label: 'Flagged',  color: C.purple },
};

interface AuditEntry {
  id: string;
  action: string;
  actorName: string | null;
  targetId: string | null;
  details: Record<string, any> | null;
  createdAt: string;
}

const ACTION_META: Record<string, { label: string; color: string; icon: string }> = {
  TOURNAMENT_CREATED:      { label: 'Tournament Created',  color: C.blue,   icon: '🏆' },
  TOURNAMENT_OPENED:       { label: 'Tournament Opened',   color: C.green,  icon: '▶' },
  TOURNAMENT_CLOSED:       { label: 'Tournament Closed',   color: C.orange, icon: '■' },
  USER_PROMOTED_TO_ADMIN:  { label: 'Promoted to Admin',   color: C.accent, icon: '★' },
  USER_DEMOTED_TO_USER:    { label: 'Demoted to User',     color: C.textSub, icon: '↓' },
  USER_SUSPENDED:          { label: 'User Suspended',      color: C.red,    icon: '⊘' },
  USER_UNSUSPENDED:        { label: 'User Unsuspended',    color: C.green,  icon: '✓' },
  USER_LOGIN:              { label: 'Login',               color: C.textSub, icon: '→' },
  USER_IMPERSONATED:       { label: 'User Impersonated',   color: C.purple,  icon: '👤' },
  USER_PASSWORD_RESET:     { label: 'Password Reset',      color: C.blue,    icon: '🔑' },
  USER_WARNING_ISSUED:     { label: 'Warning Issued',       color: C.orange,  icon: '⚠' },
  USER_TERMS_ACCEPTED:     { label: 'Terms Accepted',        color: C.green,   icon: '✓' },
};

function getDetails(entry: AuditEntry): string {
  const d = entry.details;
  if (!d) return '';
  if (entry.action.startsWith('TOURNAMENT')) {
    if (d.name) return d.name + (d.weekNumber ? ` · Week ${d.weekNumber}, ${d.year}` : '');
  }
  if (entry.action === 'USER_LOGIN') {
    const platform = d.platform ? d.platform.charAt(0).toUpperCase() + d.platform.slice(1) : '';
    const provider = d.authProvider === 'APPLE' ? 'Apple' : 'Email';
    return [platform, provider, d.email].filter(Boolean).join(' · ');
  }
  if (entry.action.startsWith('USER')) {
    if (d.targetName) return d.targetName + (d.targetEmail ? ` (${d.targetEmail})` : '');
  }
  return JSON.stringify(d);
}

function Pagination({ page, total, limit, onChange }: { page: number; total: number; limit: number; onChange: (p: number) => void }) {
  const totalPages = Math.ceil(total / limit);
  if (totalPages <= 1) return null;
  const btnStyle = (active: boolean, disabled?: boolean): React.CSSProperties => ({
    padding: '5px 12px', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: disabled ? 'default' : 'pointer',
    background: active ? C.accent : C.surfaceHigh,
    color: active ? C.bg : disabled ? C.textMuted : C.textSub,
    border: `1px solid ${active ? C.accent : C.border}`,
    opacity: disabled ? 0.4 : 1,
  });
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 16, justifyContent: 'flex-end' }}>
      <span style={{ color: C.textMuted, fontSize: 13, marginRight: 8 }}>
        {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}
      </span>
      <button style={btnStyle(false, page === 1)} disabled={page === 1} onClick={() => onChange(page - 1)}>← Prev</button>
      {Array.from({ length: totalPages }, (_, i) => i + 1)
        .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
        .reduce<(number | '...')[]>((acc, p, i, arr) => {
          if (i > 0 && (p as number) - (arr[i - 1] as number) > 1) acc.push('...');
          acc.push(p);
          return acc;
        }, [])
        .map((p, i) =>
          p === '...'
            ? <span key={`ellipsis-${i}`} style={{ color: C.textMuted, padding: '0 4px' }}>…</span>
            : <button key={p} style={btnStyle(p === page)} onClick={() => onChange(p as number)}>{p}</button>
        )}
      <button style={btnStyle(false, page === totalPages)} disabled={page === totalPages} onClick={() => onChange(page + 1)}>Next →</button>
    </div>
  );
}

function SubmissionDetailPanel({
  subId,
  onClose,
  onStatusChanged,
}: {
  subId: string;
  onClose: () => void;
  onStatusChanged: (id: string, newStatus: string) => void;
}) {
  const [sub, setSub] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [actioning, setActioning] = useState(false);
  const [actionError, setActionError] = useState('');
  const [lightbox, setLightbox] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true); setError('');
    api.getSubmission(subId)
      .then(setSub)
      .catch((e: any) => setError(e.message))
      .finally(() => setLoading(false));
  }, [subId]);

  async function handleAction(action: string) {
    if (actioning) return;
    setActioning(true); setActionError('');
    try {
      await api.moderate(subId, action, note || undefined);
      const newStatus = action === 'APPROVE' ? 'APPROVED' : action === 'REJECT' ? 'REJECTED' : 'FLAGGED';
      setSub((prev: any) => ({ ...prev, status: newStatus }));
      onStatusChanged(subId, newStatus);
      setNote('');
    } catch (e: any) {
      setActionError(e.message ?? 'Action failed');
    } finally {
      setActioning(false);
    }
  }

  const lengthIn = sub ? (sub.fishLengthCm / 2.54).toFixed(1) : '';
  const sm = sub ? (STATUS_META[sub.status] ?? { label: sub.status, color: C.textMuted }) : null;

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 40 }} />

      {/* Panel */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 420,
        backgroundColor: C.surface, borderLeft: `1px solid ${C.border}`,
        zIndex: 50, overflowY: 'auto', display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: `1px solid ${C.border}`, position: 'sticky', top: 0, backgroundColor: C.surface, zIndex: 1 }}>
          <span style={{ color: C.text, fontWeight: 700, fontSize: 15, textTransform: 'uppercase', letterSpacing: 1 }}>Submission Detail</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: C.textMuted, fontSize: 20, cursor: 'pointer', lineHeight: 1 }}>✕</button>
        </div>

        {loading && <div style={{ padding: 40, textAlign: 'center', color: C.textMuted }}>Loading…</div>}
        {error && <div style={{ padding: 20, color: C.red }}>{error}</div>}

        {sub && (
          <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Photos */}
            {(sub.photo1Url || sub.photo2Url) && (
              <div style={{ display: 'flex', gap: 8 }}>
                {sub.photo1Url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={sub.photo1Url} alt="Photo 1" onClick={() => setLightbox(sub.photo1Url)}
                    style={{ flex: 1, height: 160, objectFit: 'cover', borderRadius: 8, cursor: 'pointer', border: `1px solid ${C.border}` }} />
                )}
                {sub.photo2Url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={sub.photo2Url} alt="Photo 2" onClick={() => setLightbox(sub.photo2Url)}
                    style={{ flex: 1, height: 160, objectFit: 'cover', borderRadius: 8, cursor: 'pointer', border: `1px solid ${C.border}` }} />
                )}
              </div>
            )}

            {/* Status */}
            {sm && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ color: sm.color, background: sm.color + '18', border: `1px solid ${sm.color}40`, padding: '4px 12px', borderRadius: 6, fontSize: 13, fontWeight: 700 }}>
                  {sm.label}
                </span>
                <span style={{ color: C.textMuted, fontSize: 12 }}>ID: {sub.id.slice(0, 8)}…</span>
              </div>
            )}

            {/* Core info */}
            <div style={{ backgroundColor: C.surfaceHigh, borderRadius: 8, padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Row label="Angler" value={sub.user.email ? `${sub.user.displayName} (${sub.user.email})` : sub.user.displayName} />
              <Row label="Tournament" value={sub.tournament.name} />
              <Row label="Length" value={`${lengthIn}"`} accent />
              {sub.speciesName && <Row label="Species" value={sub.speciesName} />}
              {sub.fishWeightOz != null && <Row label="Weight" value={`${sub.fishWeightOz.toFixed(1)} oz`} />}
              <Row label="GPS" value={`${sub.gpsLat?.toFixed(5)}, ${sub.gpsLng?.toFixed(5)}`} link={`https://www.google.com/maps?q=${sub.gpsLat},${sub.gpsLng}`} />
              {sub.matSerial && <Row label="Mat Serial" value={sub.matSerial.serialCode} />}
              {sub.released && <Row label="Released" value="Yes" />}
              <Row label="Submitted" value={new Date(sub.createdAt).toLocaleString()} />
            </div>

            {/* AI Flags */}
            {(sub.flagSuspectPhoto || sub.flagSuspectLength || sub.flagDuplicateHash || sub.flagDuplicateGps || sub.flagSuspectSpecies) && (
              <div style={{ backgroundColor: C.red + '12', border: `1px solid ${C.red}40`, borderRadius: 8, padding: 12 }}>
                <div style={{ color: C.red, fontWeight: 700, fontSize: 12, letterSpacing: 1, marginBottom: 8 }}>⚠ FLAGS</div>
                {sub.flagSuspectPhoto && <FlagRow label="🤖 No Fish Detected" />}
                {sub.flagSuspectLength && <FlagRow label={`🤖 Length Mismatch — AI estimated ${sub.estimatedLengthCm ? (sub.estimatedLengthCm / 2.54).toFixed(1) + '"' : '?'}, submitted ${lengthIn}"`} />}
                {sub.flagSuspectSpecies && <FlagRow label={`🤖 Species Mismatch — AI suggested ${sub.aiSuggestedSpecies ?? '?'}`} />}
                {sub.flagDuplicateHash && <FlagRow label="⚠ Duplicate Photo Hash" />}
                {sub.flagDuplicateGps && <FlagRow label="⚠ Duplicate GPS" />}
              </div>
            )}

            {/* Previous moderation actions */}
            {sub.moderationActions?.length > 0 && (
              <div>
                <div style={{ color: C.textMuted, fontSize: 11, fontWeight: 700, letterSpacing: 1, marginBottom: 8 }}>MODERATION HISTORY</div>
                {sub.moderationActions.map((a: any) => (
                  <div key={a.id} style={{ backgroundColor: C.surfaceHigh, borderRadius: 6, padding: '8px 12px', marginBottom: 6, fontSize: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                      <span style={{ fontWeight: 700, color: a.actionType === 'APPROVE' ? C.green : a.actionType === 'REJECT' ? C.red : C.orange }}>{a.actionType}</span>
                      <span style={{ color: C.textMuted }}>{new Date(a.createdAt).toLocaleString()}</span>
                    </div>
                    <div style={{ color: C.textSub }}>{a.moderator?.displayName ?? 'System'}{a.note ? ` · ${a.note}` : ''}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Change status */}
            <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 16 }}>
              <div style={{ color: C.textMuted, fontSize: 11, fontWeight: 700, letterSpacing: 1, marginBottom: 10 }}>CHANGE STATUS</div>
              <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="Optional note (shown to angler on reject)"
                rows={2}
                style={{
                  width: '100%', backgroundColor: C.bg, color: C.text, border: `1px solid ${C.border}`,
                  borderRadius: 6, padding: '8px 10px', fontSize: 13, resize: 'vertical',
                  fontFamily: 'inherit', marginBottom: 10, boxSizing: 'border-box',
                }}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => handleAction('APPROVE')}
                  disabled={actioning || sub.status === 'APPROVED'}
                  style={{ flex: 1, padding: '8px 0', borderRadius: 6, border: 'none', cursor: actioning || sub.status === 'APPROVED' ? 'default' : 'pointer', fontWeight: 700, fontSize: 13, backgroundColor: C.green, color: '#fff', opacity: sub.status === 'APPROVED' ? 0.4 : 1 }}
                >
                  ✓ Approve
                </button>
                <button
                  onClick={() => handleAction('REJECT')}
                  disabled={actioning || sub.status === 'REJECTED'}
                  style={{ flex: 1, padding: '8px 0', borderRadius: 6, border: 'none', cursor: actioning || sub.status === 'REJECTED' ? 'default' : 'pointer', fontWeight: 700, fontSize: 13, backgroundColor: C.red, color: '#fff', opacity: sub.status === 'REJECTED' ? 0.4 : 1 }}
                >
                  ✕ Reject
                </button>
                <button
                  onClick={() => handleAction('FLAG')}
                  disabled={actioning || sub.status === 'FLAGGED'}
                  style={{ flex: 1, padding: '8px 0', borderRadius: 6, border: `1px solid ${C.orange}`, cursor: actioning || sub.status === 'FLAGGED' ? 'default' : 'pointer', fontWeight: 700, fontSize: 13, backgroundColor: 'transparent', color: C.orange, opacity: sub.status === 'FLAGGED' ? 0.4 : 1 }}
                >
                  ⚑ Flag
                </button>
              </div>
              {actionError && <div style={{ color: C.red, fontSize: 12, marginTop: 8 }}>{actionError}</div>}
              {actioning && <div style={{ color: C.textMuted, fontSize: 12, marginTop: 8, textAlign: 'center' }}>Saving…</div>}
            </div>
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div onClick={() => setLightbox(null)} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.92)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightbox} alt="" onClick={e => e.stopPropagation()} style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: 8 }} />
          <button onClick={() => setLightbox(null)} style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: 36, height: 36, color: '#fff', fontSize: 16, cursor: 'pointer' }}>✕</button>
        </div>
      )}
    </>
  );
}

function Row({ label, value, accent, link }: { label: string; value: string; accent?: boolean; link?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
      <span style={{ color: C.textMuted, fontSize: 12, flexShrink: 0 }}>{label}</span>
      {link
        ? <a href={link} target="_blank" rel="noreferrer" style={{ color: accent ? C.accent : C.text, fontSize: 12, fontWeight: accent ? 700 : 400, textAlign: 'right', textDecoration: 'underline' }}>{value}</a>
        : <span style={{ color: accent ? C.accent : C.text, fontSize: 12, fontWeight: accent ? 700 : 400, textAlign: 'right' }}>{value}</span>
      }
    </div>
  );
}

function FlagRow({ label }: { label: string }) {
  return <div style={{ color: C.red, fontSize: 12, marginBottom: 4 }}>{label}</div>;
}

export default function HistoryPage() {
  const [pageTab, setPageTab] = useState<PageTab>('audit');

  // Audit log state
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditPage, setAuditPage] = useState(1);
  const [auditFilter, setAuditFilter] = useState('ALL');
  const [auditLoading, setAuditLoading] = useState(false);

  // Submissions state
  const [submissions, setSubmissions] = useState<SubmissionEntry[]>([]);
  const [subTotal, setSubTotal] = useState(0);
  const [subPage, setSubPage] = useState(1);
  const [subStatusFilter, setSubStatusFilter] = useState('ALL');
  const [subLoading, setSubLoading] = useState(false);

  // Detail panel
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [error, setError] = useState('');

  async function loadAudit(page = auditPage) {
    setAuditLoading(true); setError('');
    try {
      const res = await api.getAuditLog(page, PAGE_SIZE);
      setEntries(res.data);
      setAuditTotal(res.total);
      setAuditPage(page);
    }
    catch (e: any) { setError(e.message); }
    finally { setAuditLoading(false); }
  }

  async function loadSubmissions(page = subPage) {
    setSubLoading(true); setError('');
    try {
      const res = await api.getSubmissionsHistory(undefined, subStatusFilter === 'ALL' ? undefined : subStatusFilter, page, PAGE_SIZE);
      setSubmissions(res.data);
      setSubTotal(res.total);
      setSubPage(page);
    }
    catch (e: any) { setError(e.message); }
    finally { setSubLoading(false); }
  }

  useEffect(() => { loadAudit(1); }, []);
  useEffect(() => {
    if (pageTab === 'submissions') loadSubmissions(1);
  }, [pageTab, subStatusFilter]);

  function handleStatusChanged(id: string, newStatus: string) {
    setSubmissions(prev => prev.map(s => s.id === id ? { ...s, status: newStatus } : s));
  }

  const auditCategories = [
    { key: 'ALL', label: 'All' },
    { key: 'TOURNAMENT', label: 'Tournaments' },
    { key: 'USER_LOGIN', label: 'Logins' },
    { key: 'USER', label: 'Users' },
  ];

  const filteredAudit = entries.filter(e => {
    if (auditFilter === 'ALL') return true;
    if (auditFilter === 'USER_LOGIN') return e.action === 'USER_LOGIN';
    if (auditFilter === 'USER') return e.action.startsWith('USER') && e.action !== 'USER_LOGIN';
    return e.action.startsWith(auditFilter);
  });

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: '8px 20px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer',
    textTransform: 'uppercase', letterSpacing: 0.5,
    background: active ? C.accent : 'transparent',
    color: active ? C.bg : C.textMuted,
    border: `1px solid ${active ? C.accent : C.border}`,
  });

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <h2 style={{ color: C.text, margin: 0, textTransform: 'uppercase', letterSpacing: 0.5 }}>History</h2>
        <div style={{ display: 'flex', gap: 6, marginLeft: 16 }}>
          <button onClick={() => setPageTab('audit')} style={tabStyle(pageTab === 'audit')}>Audit Log</button>
          <button onClick={() => setPageTab('submissions')} style={tabStyle(pageTab === 'submissions')}>Submissions</button>
        </div>
        <button
          onClick={() => pageTab === 'audit' ? loadAudit(auditPage) : loadSubmissions(subPage)}
          disabled={auditLoading || subLoading}
          style={{ marginLeft: 'auto', background: C.surfaceHigh, color: C.textSub, border: `1px solid ${C.border}`, padding: '5px 14px', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}
        >
          {auditLoading || subLoading ? 'Loading…' : '↻ Refresh'}
        </button>
      </div>

      {error && (
        <div style={{ color: C.red, background: C.red + '15', border: `1px solid ${C.red}50`, padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 14 }}>
          {error}
        </div>
      )}

      {/* ── Audit Log ── */}
      {pageTab === 'audit' && (
        <>
          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            {auditCategories.map(c => (
              <button key={c.key} onClick={() => setAuditFilter(c.key)} style={{
                padding: '6px 16px', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                background: auditFilter === c.key ? C.surfaceHigh : 'transparent',
                color: auditFilter === c.key ? C.text : C.textMuted,
                border: `1px solid ${auditFilter === c.key ? C.border : 'transparent'}`,
              }}>
                {c.label}
              </button>
            ))}
          </div>
          <div style={{ backgroundColor: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                  {['Event', 'Details', 'Actor', 'Time'].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', color: C.textMuted, fontSize: 11, fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {auditLoading && (
                  <tr><td colSpan={4} style={{ padding: 32, textAlign: 'center', color: C.textMuted }}>Loading…</td></tr>
                )}
                {!auditLoading && filteredAudit.length === 0 && (
                  <tr><td colSpan={4} style={{ padding: 32, textAlign: 'center', color: C.textMuted }}>No events yet.</td></tr>
                )}
                {!auditLoading && filteredAudit.map(entry => {
                  const meta = ACTION_META[entry.action] ?? { label: entry.action, color: C.textSub, icon: '•' };
                  return (
                    <tr key={entry.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: meta.color, background: meta.color + '18', border: `1px solid ${meta.color}40`, padding: '3px 10px', borderRadius: 6 }}>
                          <span>{meta.icon}</span>{meta.label}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', color: C.textSub, fontSize: 13 }}>{getDetails(entry) || '—'}</td>
                      <td style={{ padding: '12px 16px', color: C.textMuted, fontSize: 13 }}>{entry.actorName ?? '—'}</td>
                      <td style={{ padding: '12px 16px', color: C.textMuted, fontSize: 13, whiteSpace: 'nowrap' }}>
                        <div>{new Date(entry.createdAt).toLocaleDateString()}</div>
                        <div style={{ fontSize: 11, marginTop: 2 }}>{new Date(entry.createdAt).toLocaleTimeString()}</div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination page={auditPage} total={auditTotal} limit={PAGE_SIZE} onChange={p => loadAudit(p)} />
        </>
      )}

      {/* ── Submissions ── */}
      {pageTab === 'submissions' && (
        <>
          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            {['ALL', 'PENDING', 'APPROVED', 'REJECTED', 'FLAGGED'].map(s => (
              <button key={s} onClick={() => setSubStatusFilter(s)} style={{
                padding: '6px 16px', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                background: subStatusFilter === s ? C.surfaceHigh : 'transparent',
                color: subStatusFilter === s ? C.text : C.textMuted,
                border: `1px solid ${subStatusFilter === s ? C.border : 'transparent'}`,
              }}>
                {s === 'ALL' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
              </button>
            ))}
            <span style={{ marginLeft: 'auto', color: C.textMuted, fontSize: 13, alignSelf: 'center' }}>{subTotal} submissions</span>
          </div>
          <div style={{ backgroundColor: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                  {['Angler', 'Tournament', 'Length', 'Status', 'Flags', 'Submitted', ''].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', color: C.textMuted, fontSize: 11, fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {subLoading && (
                  <tr><td colSpan={7} style={{ padding: 32, textAlign: 'center', color: C.textMuted }}>Loading…</td></tr>
                )}
                {!subLoading && submissions.length === 0 && (
                  <tr><td colSpan={7} style={{ padding: 32, textAlign: 'center', color: C.textMuted }}>No submissions found.</td></tr>
                )}
                {!subLoading && submissions.map(s => {
                  const sm = STATUS_META[s.status] ?? { label: s.status, color: C.textMuted };
                  const isSelected = selectedId === s.id;
                  return (
                    <tr
                      key={s.id}
                      style={{ borderBottom: `1px solid ${C.border}`, backgroundColor: isSelected ? C.surfaceHigh : undefined, cursor: 'pointer' }}
                      onClick={() => setSelectedId(s.id)}
                    >
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ color: C.text, fontWeight: 600, fontSize: 14 }}>{s.user.displayName}</div>
                        <div style={{ color: C.textMuted, fontSize: 11 }}>{s.user.email}</div>
                      </td>
                      <td style={{ padding: '12px 16px', color: C.textSub, fontSize: 13 }}>{s.tournament.name}</td>
                      <td style={{ padding: '12px 16px', color: C.accent, fontWeight: 700, fontSize: 15 }}>{(s.fishLengthCm / 2.54).toFixed(1)}"</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ color: sm.color, background: sm.color + '18', border: `1px solid ${sm.color}40`, padding: '3px 10px', borderRadius: 6, fontSize: 12, fontWeight: 700 }}>
                          {sm.label}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 12 }}>
                        {s.flagDuplicateHash && <span style={{ color: C.red, marginRight: 6 }}>⚠ Dup Hash</span>}
                        {s.flagDuplicateGps && <span style={{ color: C.orange }}>⚠ Dup GPS</span>}
                        {!s.flagDuplicateHash && !s.flagDuplicateGps && <span style={{ color: C.textMuted }}>—</span>}
                      </td>
                      <td style={{ padding: '12px 16px', color: C.textMuted, fontSize: 13, whiteSpace: 'nowrap' }}>
                        <div>{new Date(s.createdAt).toLocaleDateString()}</div>
                        <div style={{ fontSize: 11, marginTop: 2 }}>{new Date(s.createdAt).toLocaleTimeString()}</div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ color: C.accent, fontSize: 13 }}>View →</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination page={subPage} total={subTotal} limit={PAGE_SIZE} onChange={p => loadSubmissions(p)} />
        </>
      )}

      {/* Detail panel */}
      {selectedId && (
        <SubmissionDetailPanel
          subId={selectedId}
          onClose={() => setSelectedId(null)}
          onStatusChanged={handleStatusChanged}
        />
      )}
    </div>
  );
}
