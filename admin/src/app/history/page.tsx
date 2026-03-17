'use client';
import { useEffect, useState } from 'react';
import { api } from '../../lib/api';

const C = {
  bg: '#0D1A0D', surface: '#152515', surfaceHigh: '#1D331D',
  border: '#2A4A2A', accent: '#C9A450',
  green: '#3DAF5A', red: '#C0392B', orange: '#D4820A',
  blue: '#3A7ABF', purple: '#9b59b6',
  text: '#F0EDE4', textSub: '#8BA88B', textMuted: '#4A6A4A',
};

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

export default function HistoryPage() {
  const [pageTab, setPageTab] = useState<PageTab>('audit');

  // Audit log state
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [auditFilter, setAuditFilter] = useState('ALL');
  const [auditLoading, setAuditLoading] = useState(false);

  // Submissions state
  const [submissions, setSubmissions] = useState<SubmissionEntry[]>([]);
  const [subStatusFilter, setSubStatusFilter] = useState('ALL');
  const [subLoading, setSubLoading] = useState(false);

  const [error, setError] = useState('');

  async function loadAudit() {
    setAuditLoading(true); setError('');
    try { setEntries(await api.getAuditLog()); }
    catch (e: any) { setError(e.message); }
    finally { setAuditLoading(false); }
  }

  async function loadSubmissions() {
    setSubLoading(true); setError('');
    try { setSubmissions(await api.getSubmissionsHistory(undefined, subStatusFilter === 'ALL' ? undefined : subStatusFilter)); }
    catch (e: any) { setError(e.message); }
    finally { setSubLoading(false); }
  }

  useEffect(() => { loadAudit(); }, []);
  useEffect(() => { if (pageTab === 'submissions') loadSubmissions(); }, [pageTab, subStatusFilter]);

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
          onClick={() => pageTab === 'audit' ? loadAudit() : loadSubmissions()}
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
                {filteredAudit.length === 0 && (
                  <tr><td colSpan={4} style={{ padding: 32, textAlign: 'center', color: C.textMuted }}>No events yet.</td></tr>
                )}
                {filteredAudit.map(entry => {
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
            <span style={{ marginLeft: 'auto', color: C.textMuted, fontSize: 13, alignSelf: 'center' }}>{submissions.length} submissions</span>
          </div>
          <div style={{ backgroundColor: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                  {['Angler', 'Tournament', 'Length', 'Status', 'Flags', 'Submitted'].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', color: C.textMuted, fontSize: 11, fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {subLoading && (
                  <tr><td colSpan={6} style={{ padding: 32, textAlign: 'center', color: C.textMuted }}>Loading…</td></tr>
                )}
                {!subLoading && submissions.length === 0 && (
                  <tr><td colSpan={6} style={{ padding: 32, textAlign: 'center', color: C.textMuted }}>No submissions found.</td></tr>
                )}
                {!subLoading && submissions.map(s => {
                  const sm = STATUS_META[s.status] ?? { label: s.status, color: C.textMuted };
                  return (
                    <tr key={s.id} style={{ borderBottom: `1px solid ${C.border}` }}>
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
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
