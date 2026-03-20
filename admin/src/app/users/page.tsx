'use client';
import { useEffect, useState } from 'react';
import { api } from '../../lib/api';

const C = {
  bg: '#3A4C44', surface: '#2E3D38', surfaceHigh: '#445C54',
  border: '#4A6058', accent: '#CFC29C',
  green: '#3DAF5A', greenBg: '#0F3A1E',
  red: '#C0392B', redBg: '#3A1414',
  orange: '#D4820A', orangeBg: '#3A2800',
  blue: '#3A7ABF', blueBg: '#0E2236',
  purple: '#9b59b6',
  text: '#F0EDE4', textSub: '#9DB5A8', textMuted: '#6B7D73',
};

interface User {
  id: string;
  displayName: string;
  email: string | null;
  role: 'USER' | 'ADMIN';
  suspended: boolean;
  authProvider: string;
  createdAt: string;
  regionId: string | null;
  region: { id: string; name: string } | null;
}

function Initials({ name }: { name: string }) {
  const letters = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div style={{
      width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
      backgroundColor: C.surfaceHigh, border: `1px solid ${C.border}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 13, fontWeight: 700, color: C.textSub, letterSpacing: '0.5px',
    }}>
      {letters}
    </div>
  );
}

function Badge({ label, color, bg, border }: { label: string; color: string; bg: string; border: string }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 20,
      color, backgroundColor: bg, border: `1px solid ${border}`,
      whiteSpace: 'nowrap', letterSpacing: '0.3px',
    }}>
      {label}
    </span>
  );
}

interface WarningForm {
  level: 'MINOR' | 'MAJOR' | 'FINAL';
  reason: string;
  submitting: boolean;
}

const PAGE_SIZE = 50;

function Pagination({ page, total, onChange }: { page: number; total: number; onChange: (p: number) => void }) {
  const totalPages = Math.ceil(total / PAGE_SIZE);
  if (totalPages <= 1) return null;
  const btn = (active: boolean, disabled?: boolean): React.CSSProperties => ({
    padding: '5px 12px', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: disabled ? 'default' : 'pointer',
    background: active ? C.accent : C.surfaceHigh, color: active ? C.bg : disabled ? C.textMuted : C.textSub,
    border: `1px solid ${active ? C.accent : C.border}`, opacity: disabled ? 0.4 : 1,
  });
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 16, justifyContent: 'flex-end' }}>
      <span style={{ color: C.textMuted, fontSize: 13, marginRight: 8 }}>
        {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
      </span>
      <button style={btn(false, page === 1)} disabled={page === 1} onClick={() => onChange(page - 1)}>← Prev</button>
      {Array.from({ length: totalPages }, (_, i) => i + 1)
        .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
        .reduce<(number | '...')[]>((acc, p, i, arr) => {
          if (i > 0 && (p as number) - (arr[i - 1] as number) > 1) acc.push('...');
          acc.push(p); return acc;
        }, [])
        .map((p, i) => p === '...'
          ? <span key={`e${i}`} style={{ color: C.textMuted, padding: '0 4px' }}>…</span>
          : <button key={p} style={btn(p === page)} onClick={() => onChange(p as number)}>{p}</button>
        )}
      <button style={btn(false, page === totalPages)} disabled={page === totalPages} onClick={() => onChange(page + 1)}>Next →</button>
    </div>
  );
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [regions, setRegions] = useState<{ id: string; name: string }[]>([]);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState<string | null>(null);
  const [pwInputs, setPwInputs] = useState<Record<string, string>>({});
  const [pwVisible, setPwVisible] = useState<Record<string, boolean>>({});
  const [pwLoading, setPwLoading] = useState<string | null>(null);
  const [pwSuccess, setPwSuccess] = useState<string | null>(null);
  const [impersonating, setImpersonating] = useState<string | null>(null);
  const [warnVisible, setWarnVisible] = useState<Record<string, boolean>>({});
  const [warnForms, setWarnForms] = useState<Record<string, WarningForm>>({});
  const [warnCounts, setWarnCounts] = useState<Record<string, number>>({});
  const [warnSuccess, setWarnSuccess] = useState<string | null>(null);
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  async function load() {
    try {
      const [us, rs] = await Promise.all([api.getUsers(), api.getRegions()]);
      setUsers(us);
      setRegions(Array.isArray(rs) ? rs : []);
      // Load warning counts in parallel
      const counts = await Promise.all(
        us.map(u => api.getUserWarnings(u.id).then(ws => ({ id: u.id, count: ws.length })).catch(() => ({ id: u.id, count: 0 })))
      );
      const countMap: Record<string, number> = {};
      counts.forEach(c => { countMap[c.id] = c.count; });
      setWarnCounts(countMap);
    }
    catch (e: any) { setError(e.message); }
  }

  useEffect(() => { load(); }, []);

  async function setRole(user: User, role: 'USER' | 'ADMIN') {
    setLoading(user.id);
    try { await api.updateUser(user.id, { role }); await load(); }
    catch (e: any) { setError(e.message); }
    finally { setLoading(null); }
  }

  async function toggleSuspend(user: User) {
    setLoading(user.id);
    try { await api.updateUser(user.id, { suspended: !user.suspended }); await load(); }
    catch (e: any) { setError(e.message); }
    finally { setLoading(null); }
  }

  async function resetPassword(user: User) {
    const pw = pwInputs[user.id] ?? '';
    if (pw.length < 8) { setError('Password must be at least 8 characters.'); return; }
    setPwLoading(user.id);
    setError('');
    try {
      await api.resetPassword(user.id, pw);
      setPwInputs(prev => { const n = { ...prev }; delete n[user.id]; return n; });
      setPwVisible(prev => { const n = { ...prev }; delete n[user.id]; return n; });
      setPwSuccess(user.id);
      setTimeout(() => setPwSuccess(null), 3000);
    } catch (e: any) { setError(e.message); }
    finally { setPwLoading(null); }
  }

  async function impersonate(user: User) {
    setImpersonating(user.id);
    try {
      const { token } = await api.impersonateUser(user.id);
      const webUrl = process.env.NEXT_PUBLIC_WEB_URL ?? 'http://localhost:3002';
      window.open(`${webUrl}/impersonate?token=${encodeURIComponent(token)}`, '_blank');
    } catch (e: any) { setError(e.message); }
    finally { setImpersonating(null); }
  }

  function togglePwInput(userId: string) {
    setPwVisible(prev => ({ ...prev, [userId]: !prev[userId] }));
    if (pwVisible[userId]) {
      setPwInputs(prev => { const n = { ...prev }; delete n[userId]; return n; });
    }
  }

  function toggleWarnInput(userId: string) {
    setWarnVisible(prev => ({ ...prev, [userId]: !prev[userId] }));
    if (!warnForms[userId]) {
      setWarnForms(prev => ({ ...prev, [userId]: { level: 'MINOR', reason: '', submitting: false } }));
    }
  }

  async function submitWarning(u: User) {
    const form = warnForms[u.id];
    if (!form || !form.reason.trim()) { setError('Warning reason is required.'); return; }
    setWarnForms(prev => ({ ...prev, [u.id]: { ...form, submitting: true } }));
    setError('');
    try {
      await api.issueWarning(u.id, form.level, form.reason.trim());
      setWarnVisible(prev => ({ ...prev, [u.id]: false }));
      setWarnCounts(prev => ({ ...prev, [u.id]: (prev[u.id] ?? 0) + 1 }));
      setWarnSuccess(u.id);
      setTimeout(() => setWarnSuccess(null), 3000);
    } catch (e: any) { setError(e.message); }
    finally {
      setWarnForms(prev => ({ ...prev, [u.id]: { ...form, submitting: false } }));
    }
  }

  const filtered = users.filter(u =>
    (u.displayName + (u.email ?? '') + u.region?.name).toLowerCase().includes(search.toLowerCase())
  );

  const paginatedUsers = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const adminCount = users.filter(u => u.role === 'ADMIN').length;
  const suspendedCount = users.filter(u => u.suspended).length;

  return (
    <>
      {openMenu && <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setOpenMenu(null)} />}
      <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h2 style={{ color: C.text, margin: '0 0 6px', fontSize: 22, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>Users</h2>
          <div style={{ display: 'flex', gap: 16 }}>
            <span style={{ color: C.textMuted, fontSize: 13 }}><span style={{ color: C.textSub, fontWeight: 600 }}>{users.length}</span> total</span>
            <span style={{ color: C.textMuted, fontSize: 13 }}><span style={{ color: C.accent, fontWeight: 600 }}>{adminCount}</span> admin</span>
            <span style={{ color: C.textMuted, fontSize: 13 }}><span style={{ color: C.red, fontWeight: 600 }}>{suspendedCount}</span> suspended</span>
          </div>
        </div>
        <input
          placeholder="Search name, email, region…"
          value={search}
          onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
          style={{
            width: 280, padding: '9px 14px', fontSize: 13,
            backgroundColor: C.surface, border: `1px solid ${C.border}`,
            borderRadius: 8, color: C.text, outline: 'none',
          }}
        />
      </div>

      {error && (
        <div style={{ color: C.red, background: C.redBg, border: `1px solid ${C.red}50`, padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 14 }}>
          {error}
        </div>
      )}

      {/* Table */}
      <div style={{ backgroundColor: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, overflowX: 'auto' }}>
        <table style={{ width: '100%', minWidth: 820, borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: `2px solid ${C.border}` }}>
              <th style={thStyle}>Angler</th>
              <th style={thStyle}>Region</th>
              <th style={thStyle}>Role</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Joined</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedUsers.length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding: '32px 24px', textAlign: 'center', color: C.textMuted, fontSize: 14 }}>
                  No users found.
                </td>
              </tr>
            )}
            {paginatedUsers.map((u, i) => (
              <tr
                key={u.id}
                style={{
                  borderBottom: i < paginatedUsers.length - 1 ? `1px solid ${C.border}` : 'none',
                  opacity: loading === u.id ? 0.5 : 1,
                  transition: 'opacity 0.15s',
                }}
              >
                {/* Angler */}
                <td style={{ padding: '14px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Initials name={u.displayName} />
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ color: C.text, fontWeight: 600, fontSize: 14 }}>{u.displayName}</span>
                        {(warnCounts[u.id] ?? 0) > 0 && (
                          <span style={{
                            fontSize: 11, fontWeight: 700, padding: '1px 7px', borderRadius: 10,
                            backgroundColor: C.orange + '25', border: `1px solid ${C.orange}50`,
                            color: C.orange,
                          }}>
                            ⚠ {warnCounts[u.id]}
                          </span>
                        )}
                      </div>
                      <div style={{ color: C.textMuted, fontSize: 12, marginTop: 2 }}>
                        {u.email ?? (
                          <span style={{ color: C.textSub }}>
                            {u.authProvider === 'APPLE' ? '🍎 Apple Sign‑In' : '—'}
                          </span>
                        )}
                      </div>
                      {u.email && (
                        <div style={{ color: C.textMuted, fontSize: 11, marginTop: 3 }}>✉ Email</div>
                      )}
                    </div>
                  </div>
                </td>

                {/* Region */}
                <td style={{ padding: '14px 20px' }}>
                  <select
                    value={u.regionId ?? ''}
                    disabled={loading === u.id}
                    onChange={async e => {
                      setLoading(u.id);
                      try { await api.updateUser(u.id, { regionId: e.target.value || null }); await load(); }
                      catch (err: any) { setError(err.message); }
                      finally { setLoading(null); }
                    }}
                    style={{
                      padding: '4px 8px', fontSize: 12,
                      backgroundColor: C.bg, border: `1px solid ${C.border}`,
                      borderRadius: 6, color: u.regionId ? C.textSub : C.textMuted, cursor: 'pointer',
                    }}
                  >
                    <option value="">— GPS only —</option>
                    {regions.map(r => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                </td>

                {/* Role */}
                <td style={{ padding: '14px 20px' }}>
                  {u.role === 'ADMIN'
                    ? <Badge label="★ Admin" color={C.accent} bg={C.accent + '20'} border={C.accent + '50'} />
                    : <Badge label="User" color={C.textMuted} bg={C.surfaceHigh} border={C.border} />
                  }
                </td>

                {/* Status */}
                <td style={{ padding: '14px 20px' }}>
                  {u.suspended
                    ? <Badge label="⊘ Suspended" color={C.red} bg={C.redBg} border={C.red + '50'} />
                    : <Badge label="● Active" color={C.green} bg={C.greenBg} border={C.green + '50'} />
                  }
                </td>

                {/* Joined */}
                <td style={{ padding: '14px 20px', color: C.textMuted, fontSize: 13, whiteSpace: 'nowrap' }}>
                  {new Date(u.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </td>

                {/* Actions */}
                <td style={{ padding: '14px 20px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                    <div style={{ position: 'relative' }}>
                      <button
                        onClick={e => { e.stopPropagation(); setOpenMenu(openMenu === u.id ? null : u.id); }}
                        style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.surfaceHigh, border: `1px solid ${C.border}`, borderRadius: 6, cursor: 'pointer', fontSize: 18, color: C.textSub, lineHeight: 1 }}
                        title="Actions"
                      >⋮</button>
                      {openMenu === u.id && (
                        <div onClick={e => e.stopPropagation()} style={{ position: 'absolute', right: 0, top: '100%', marginTop: 4, backgroundColor: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, boxShadow: '0 4px 20px rgba(0,0,0,0.5)', zIndex: 50, minWidth: 170, overflow: 'hidden' }}>
                          {[
                            u.role === 'USER'
                              ? { label: '⭐ Make Admin', color: C.accent, action: () => { setRole(u, 'ADMIN'); setOpenMenu(null); } }
                              : { label: '↩ Revoke Admin', color: C.orange, action: () => { setRole(u, 'USER'); setOpenMenu(null); } },
                            u.suspended
                              ? { label: '✓ Unsuspend', color: C.green, action: () => { toggleSuspend(u); setOpenMenu(null); } }
                              : { label: '⊘ Suspend', color: C.red, action: () => { toggleSuspend(u); setOpenMenu(null); } },
                            ...(u.authProvider !== 'APPLE' ? [{ label: '🔑 Reset Password', color: C.blue, action: () => { togglePwInput(u.id); setOpenMenu(null); } }] : []),
                            { label: '👤 Impersonate', color: C.purple, action: () => { impersonate(u); setOpenMenu(null); } },
                            { label: '⚠ Issue Warning', color: C.orange, action: () => { toggleWarnInput(u.id); setOpenMenu(null); } },
                          ].map(item => (
                            <button key={item.label} onClick={item.action} style={{ width: '100%', display: 'flex', alignItems: 'center', background: 'none', border: 'none', borderBottom: `1px solid ${C.border}20`, padding: '10px 14px', textAlign: 'left', cursor: 'pointer', fontSize: 13, color: item.color, fontWeight: 500, gap: 8 }}
                              onMouseEnter={e => (e.currentTarget.style.backgroundColor = C.surfaceHigh)}
                              onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                            >{item.label}</button>
                          ))}
                        </div>
                      )}
                    </div>

                    {warnVisible[u.id] && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}>
                        <select
                          value={warnForms[u.id]?.level ?? 'MINOR'}
                          onChange={e => setWarnForms(prev => ({ ...prev, [u.id]: { ...prev[u.id], level: e.target.value as any } }))}
                          style={{
                            padding: '5px 10px', fontSize: 12,
                            backgroundColor: C.bg, border: `1px solid ${C.border}`,
                            borderRadius: 6, color: C.text,
                          }}
                        >
                          <option value="MINOR">MINOR</option>
                          <option value="MAJOR">MAJOR</option>
                          <option value="FINAL">FINAL</option>
                        </select>
                        <textarea
                          placeholder="Reason for warning…"
                          value={warnForms[u.id]?.reason ?? ''}
                          onChange={e => setWarnForms(prev => ({ ...prev, [u.id]: { ...prev[u.id], reason: e.target.value } }))}
                          maxLength={1000}
                          rows={2}
                          style={{
                            padding: '5px 10px', fontSize: 12,
                            backgroundColor: C.bg, border: `1px solid ${C.border}`,
                            borderRadius: 6, color: C.text, resize: 'vertical',
                          }}
                        />
                        <ActionBtn
                          onClick={() => submitWarning(u)}
                          disabled={warnForms[u.id]?.submitting}
                          color={C.orange}
                          bg={C.orangeBg}
                        >
                          {warnForms[u.id]?.submitting ? '…' : 'Issue Warning'}
                        </ActionBtn>
                      </div>
                    )}

                    {warnSuccess === u.id && (
                      <span style={{ fontSize: 12, color: C.orange }}>⚠ Warning issued</span>
                    )}

                    {pwVisible[u.id] && (
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <input
                          type="password"
                          autoComplete="new-password"
                          placeholder="New password (min 8)"
                          value={pwInputs[u.id] ?? ''}
                          onChange={e => setPwInputs(prev => ({ ...prev, [u.id]: e.target.value }))}
                          onKeyDown={e => e.key === 'Enter' && resetPassword(u)}
                          style={{
                            padding: '5px 10px', fontSize: 12,
                            backgroundColor: C.bg, border: `1px solid ${C.border}`,
                            borderRadius: 6, color: C.text, width: 160,
                          }}
                        />
                        <ActionBtn onClick={() => resetPassword(u)} disabled={pwLoading === u.id} color={C.blue} bg={C.blueBg}>
                          {pwLoading === u.id ? '…' : 'Set'}
                        </ActionBtn>
                      </div>
                    )}

                    {pwSuccess === u.id && (
                      <span style={{ fontSize: 12, color: C.green }}>✓ Password updated</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination page={currentPage} total={filtered.length} onChange={setCurrentPage} />
      <div style={{ marginTop: 8, color: C.textMuted, fontSize: 12, textAlign: 'right' }}>
        {filtered.length} of {users.length} users
      </div>
    </div>
    </>
  );
}

const thStyle: React.CSSProperties = {
  padding: '11px 20px',
  textAlign: 'left',
  color: '#6B7D73',
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '0.8px',
  textTransform: 'uppercase',
};

function ActionBtn({
  children, onClick, disabled, color, bg,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  color: string;
  bg: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: bg,
        color,
        border: `1px solid ${color}50`,
        padding: '5px 11px',
        borderRadius: 6,
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontSize: 12,
        fontWeight: 600,
        whiteSpace: 'nowrap',
        opacity: disabled ? 0.6 : 1,
      }}
    >
      {children}
    </button>
  );
}
