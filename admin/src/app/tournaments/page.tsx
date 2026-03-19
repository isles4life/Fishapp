'use client';
import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { useAuth } from '../../components/AuthProvider';

const C = {
  bg: '#3A4C44', surface: '#2E3D38', surfaceHigh: '#445C54',
  border: '#4A6058', accent: '#CFC29C',
  green: '#3DAF5A', greenBg: '#0F3A1E',
  red: '#C0392B', redBg: '#3A1414',
  text: '#F0EDE4', textSub: '#9DB5A8', textMuted: '#6B7D73',
};

const inputStyle: React.CSSProperties = {
  width: '100%', marginBottom: 10, padding: '9px 12px', fontSize: 14,
  backgroundColor: C.bg, border: `1px solid ${C.border}`, borderRadius: 8,
  color: C.text, boxSizing: 'border-box',
};

interface Tournament {
  id: string; name: string; weekNumber: number; year: number;
  startsAt: string; endsAt: string; isOpen: boolean;
  entryFeeCents: number; prizePoolCents: number;
  region: { name: string };
  checkInCode?: string | null;
  scoringMethod?: string;
  description?: string | null;
  directorId?: string | null;
  director?: { id: string; displayName: string } | null;
  bannerKey?: string | null;
  bannerUrl?: string | null;
}

const PAGE_SIZE = 20;

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

export default function TournamentsPage() {
  const { isTournamentAdmin, assignedTournamentIds } = useAuth();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [regions, setRegions] = useState<{ id: string; name: string }[]>([]);
  const [directors, setDirectors] = useState<{ id: string; displayName: string }[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [error, setError] = useState('');
  const [announceTarget, setAnnounceTarget] = useState<Tournament | null>(null);
  const [announceForm, setAnnounceForm] = useState({ title: '', message: '' });
  const [announceSending, setAnnounceSending] = useState(false);
  const [announceResult, setAnnounceResult] = useState<string | null>(null);
  const [drawTarget, setDrawTarget] = useState<Tournament | null>(null);
  const [drawWeighted, setDrawWeighted] = useState(false);
  const [drawResult, setDrawResult] = useState<{ winner: { displayName: string; email: string }; pool: number } | null>(null);
  const [drawLoading, setDrawLoading] = useState(false);
  const [qrTarget, setQrTarget] = useState<Tournament | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [qrCheckInCount, setQrCheckInCount] = useState<number>(0);
  const [qrGenerating, setQrGenerating] = useState(false);
  const [scoringMethod, setScoringMethod] = useState('LENGTH');
  const [formDirectorId, setFormDirectorId] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [editTarget, setEditTarget] = useState<Tournament | null>(null);
  const [editName, setEditName] = useState('');
  const [editStartsDate, setEditStartsDate] = useState('');
  const [editStartsTime, setEditStartsTime] = useState('');
  const [editEndsDate, setEditEndsDate] = useState('');
  const [editEndsTime, setEditEndsTime] = useState('');
  const [editEntryFee, setEditEntryFee] = useState('');
  const [editPrizePool, setEditPrizePool] = useState('');
  const [editScoringMethod, setEditScoringMethod] = useState('LENGTH');
  const [editDescription, setEditDescription] = useState('');
  const [editDirectorId, setEditDirectorId] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [editBannerPreview, setEditBannerPreview] = useState<string | null>(null);
  const [editBannerUploading, setEditBannerUploading] = useState(false);
  const [form, setForm] = useState({
    regionId: '', name: '', weekNumber: '', year: new Date().getFullYear().toString(),
    startsDate: '', startsTime: '08:00',
    endsDate: '', endsTime: '20:00',
    entryFee: '', prizePool: '',
  });

  async function load() {
    try {
      const [ts, rs, users] = await Promise.all([api.getTournaments(), api.getRegions(), api.getUsers()]);
      setTournaments(Array.isArray(ts) ? ts : []);
      setRegions(Array.isArray(rs) ? rs : []);
      // Director dropdown: ADMIN + TOURNAMENT_ADMIN users
      const eligible = (Array.isArray(users) ? users : []).filter(
        (u: any) => u.role === 'ADMIN' || u.role === 'TOURNAMENT_ADMIN'
      );
      setDirectors(eligible);
    } catch (e: any) { setError(e.message); }
  }

  useEffect(() => { load(); }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await api.createTournament({
        regionId: form.regionId,
        name: form.name,
        weekNumber: parseInt(form.weekNumber),
        year: parseInt(form.year),
        startsAt: new Date(`${form.startsDate}T${form.startsTime}:00`).toISOString(),
        endsAt: new Date(`${form.endsDate}T${form.endsTime}:00`).toISOString(),
        entryFeeCents: form.entryFee ? Math.round(parseFloat(form.entryFee) * 100) : 0,
        prizePoolCents: form.prizePool ? Math.round(parseFloat(form.prizePool) * 100) : 0,
        scoringMethod,
        description: formDescription || undefined,
        directorId: formDirectorId || undefined,
      });
      await load();
      setForm(f => ({ ...f, name: '', weekNumber: '', startsDate: '', startsTime: '08:00', endsDate: '', endsTime: '20:00', entryFee: '', prizePool: '' }));
      setFormDescription('');
      setFormDirectorId('');
    } catch (e: any) { setError(e.message); }
  }

  async function sendAnnouncement(e: React.FormEvent) {
    e.preventDefault();
    if (!announceTarget) return;
    setAnnounceSending(true);
    setAnnounceResult(null);
    try {
      const res = await api.announceTournament(announceTarget.id, announceForm.title, announceForm.message);
      setAnnounceResult(`Sent to ${res.sent} participant${res.sent !== 1 ? 's' : ''}`);
      setAnnounceForm({ title: '', message: '' });
    } catch (e: any) {
      setAnnounceResult(`Error: ${e.message}`);
    } finally {
      setAnnounceSending(false);
    }
  }

  async function runDraw() {
    if (!drawTarget) return;
    setDrawLoading(true);
    setDrawResult(null);
    try {
      const res = await api.drawPrizeWinner(drawTarget.id, drawWeighted);
      setDrawResult(res);
    } catch (e: any) { setError(e.message); }
    finally { setDrawLoading(false); }
  }

  function openEditModal(t: Tournament) {
    setEditTarget(t);
    setEditName(t.name);
    const starts = new Date(t.startsAt);
    const ends = new Date(t.endsAt);
    setEditStartsDate(starts.toISOString().slice(0, 10));
    setEditStartsTime(starts.toTimeString().slice(0, 5));
    setEditEndsDate(ends.toISOString().slice(0, 10));
    setEditEndsTime(ends.toTimeString().slice(0, 5));
    setEditEntryFee(t.entryFeeCents > 0 ? (t.entryFeeCents / 100).toFixed(2) : '');
    setEditPrizePool(t.prizePoolCents > 0 ? (t.prizePoolCents / 100).toFixed(2) : '');
    setEditScoringMethod(t.scoringMethod ?? 'LENGTH');
    setEditDescription(t.description ?? '');
    setEditDirectorId(t.directorId ?? '');
    setEditBannerPreview(t.bannerUrl ?? null);
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editTarget) return;
    setEditSaving(true);
    try {
      await api.updateTournament(editTarget.id, {
        name: editName,
        startsAt: new Date(`${editStartsDate}T${editStartsTime}:00`).toISOString(),
        endsAt: new Date(`${editEndsDate}T${editEndsTime}:00`).toISOString(),
        entryFeeCents: editEntryFee ? Math.round(parseFloat(editEntryFee) * 100) : 0,
        prizePoolCents: editPrizePool ? Math.round(parseFloat(editPrizePool) * 100) : 0,
        scoringMethod: editScoringMethod,
        description: editDescription || undefined,
        directorId: editDirectorId || null,
      });
      await load();
      setEditTarget(null);
    } catch (e: any) { setError(e.message); }
    finally { setEditSaving(false); }
  }

  async function handleBannerFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !editTarget) return;
    setEditBannerPreview(URL.createObjectURL(file));
    setEditBannerUploading(true);
    try {
      const res = await api.uploadTournamentBanner(editTarget.id, file);
      setEditBannerPreview(res.bannerUrl);
      await load();
    } catch (err: any) { setError(err.message); }
    finally { setEditBannerUploading(false); }
  }

  async function openQrModal(t: Tournament) {
    setQrTarget(t);
    setQrCode(t.checkInCode ?? null);
    setQrCheckInCount(0);
    try {
      if (t.checkInCode) {
        const res = await api.getCheckIns(t.id);
        setQrCheckInCount(res.count);
      }
    } catch { /* ignore */ }
  }

  async function regenerateQrCode() {
    if (!qrTarget || qrGenerating) return;
    setQrGenerating(true);
    try {
      const res = await api.generateCheckInCode(qrTarget.id);
      setQrCode(res.checkInCode);
      setQrTarget(prev => prev ? { ...prev, checkInCode: res.checkInCode } : null);
      await load();
    } catch (e: any) { setError(e.message); }
    finally { setQrGenerating(false); }
  }

  const filteredTournaments = isTournamentAdmin
    ? tournaments.filter(t => assignedTournamentIds.includes(t.id))
    : tournaments;
  const paginatedTournaments = filteredTournaments.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div>
      <h2 style={{ color: C.text, marginBottom: 20, textTransform: 'uppercase', letterSpacing: 0.5 }}>Tournaments</h2>
      {error && <div style={{ color: C.red, background: C.redBg, padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 14, border: `1px solid ${C.red}50` }}>{error}</div>}

      {/* Create form */}
      {!isTournamentAdmin && (
      <form onSubmit={create} style={{ backgroundColor: C.surface, padding: 24, borderRadius: 12, marginBottom: 28, border: `1px solid ${C.border}`, borderLeft: `3px solid ${C.accent}`, maxWidth: 560 }}>
        <h3 style={{ color: C.text, marginTop: 0, marginBottom: 16, fontSize: 15, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8 }}>Create Tournament</h3>

        <label style={{ color: C.textMuted, fontSize: 11, fontWeight: 700, display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>Region</label>
        <select value={form.regionId} onChange={e => setForm(f => ({ ...f, regionId: e.target.value }))} required style={inputStyle}>
          <option value="">Select region...</option>
          {regions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>

        <label style={{ color: C.textMuted, fontSize: 11, fontWeight: 700, display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>Name</label>
        <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required placeholder="Week 1 – Pacific NW" style={inputStyle} />

        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <label style={{ color: C.textMuted, fontSize: 11, fontWeight: 700, display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>Week #</label>
            <input type="number" value={form.weekNumber} onChange={e => setForm(f => ({ ...f, weekNumber: e.target.value }))} required style={inputStyle} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ color: C.textMuted, fontSize: 11, fontWeight: 700, display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>Year</label>
            <input type="number" value={form.year} onChange={e => setForm(f => ({ ...f, year: e.target.value }))} required style={inputStyle} />
          </div>
        </div>

        <label style={{ color: C.textMuted, fontSize: 11, fontWeight: 700, display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>Start Date &amp; Time</label>
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          <input type="date" value={form.startsDate} onChange={e => setForm(f => ({ ...f, startsDate: e.target.value }))} required
            style={{ ...inputStyle, marginBottom: 0, flex: 2, color: C.accent, borderColor: C.accent + '80', colorScheme: 'dark' }} />
          <input type="time" value={form.startsTime} onChange={e => setForm(f => ({ ...f, startsTime: e.target.value }))} required
            style={{ ...inputStyle, marginBottom: 0, flex: 1, color: C.accent, borderColor: C.accent + '80', colorScheme: 'dark' }} />
        </div>

        <label style={{ color: C.textMuted, fontSize: 11, fontWeight: 700, display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>End Date &amp; Time</label>
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          <input type="date" value={form.endsDate} onChange={e => setForm(f => ({ ...f, endsDate: e.target.value }))} required
            style={{ ...inputStyle, marginBottom: 0, flex: 2, color: C.accent, borderColor: C.accent + '80', colorScheme: 'dark' }} />
          <input type="time" value={form.endsTime} onChange={e => setForm(f => ({ ...f, endsTime: e.target.value }))} required
            style={{ ...inputStyle, marginBottom: 0, flex: 1, color: C.accent, borderColor: C.accent + '80', colorScheme: 'dark' }} />
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <label style={{ color: C.textMuted, fontSize: 11, fontWeight: 700, display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>Entry Fee ($)</label>
            <input type="number" min="0" step="0.01" value={form.entryFee} onChange={e => setForm(f => ({ ...f, entryFee: e.target.value }))} placeholder="0.00" style={inputStyle} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ color: C.textMuted, fontSize: 11, fontWeight: 700, display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>Prize Pool ($)</label>
            <input type="number" min="0" step="0.01" value={form.prizePool} onChange={e => setForm(f => ({ ...f, prizePool: e.target.value }))} placeholder="0.00" style={inputStyle} />
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', fontSize: 11, color: C.textMuted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Scoring Method</label>
          <select
            value={scoringMethod}
            onChange={e => setScoringMethod(e.target.value)}
            style={{ width: '100%', padding: '9px 12px', borderRadius: 8, backgroundColor: C.surface, border: `1px solid ${C.border}`, color: C.text, fontSize: 14 }}
          >
            <option value="LENGTH">Longest Fish (inches)</option>
            <option value="WEIGHT">Heaviest Fish (oz)</option>
            <option value="FISH_COUNT">Most Fish Caught</option>
            <option value="SPECIES_COUNT">Most Species</option>
          </select>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', fontSize: 11, color: C.textMuted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Tournament Director</label>
          <select
            value={formDirectorId}
            onChange={e => setFormDirectorId(e.target.value)}
            style={{ width: '100%', padding: '9px 12px', borderRadius: 8, backgroundColor: C.surface, border: `1px solid ${C.border}`, color: C.text, fontSize: 14 }}
          >
            <option value="">None assigned</option>
            {directors.map(d => (
              <option key={d.id} value={d.id}>{d.displayName}</option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', fontSize: 11, color: C.textMuted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Description / Rules (optional)</label>
          <textarea
            value={formDescription}
            onChange={e => setFormDescription(e.target.value)}
            maxLength={2000}
            rows={4}
            placeholder="Tournament rules, target species, registration info, etc."
            style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit', marginBottom: 0 }}
          />
        </div>

        <button type="submit" style={{ marginTop: 8, backgroundColor: C.accent, color: C.bg, padding: '10px 24px', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 14, textTransform: 'uppercase', letterSpacing: 0.8 }}>
          Create Tournament
        </button>
      </form>
      )}

      {/* Announce modal */}
      {announceTarget && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ backgroundColor: C.surface, borderRadius: 14, border: `1px solid ${C.border}`, padding: 28, maxWidth: 480, width: '100%', boxShadow: '0 8px 40px rgba(0,0,0,0.4)' }}>
            <h3 style={{ color: C.text, margin: '0 0 4px', fontSize: 16, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8 }}>📢 Broadcast Announcement</h3>
            <p style={{ color: C.textMuted, fontSize: 13, margin: '0 0 20px' }}>{announceTarget.name} · push to all participants</p>
            <form onSubmit={sendAnnouncement}>
              <label style={{ color: C.textMuted, fontSize: 11, fontWeight: 700, display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>Title</label>
              <input
                value={announceForm.title}
                onChange={e => setAnnounceForm(f => ({ ...f, title: e.target.value }))}
                required maxLength={64}
                placeholder="e.g. Weather Delay ⛈"
                style={{ ...inputStyle, marginBottom: 14 }}
              />
              <label style={{ color: C.textMuted, fontSize: 11, fontWeight: 700, display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>Message</label>
              <textarea
                value={announceForm.message}
                onChange={e => setAnnounceForm(f => ({ ...f, message: e.target.value }))}
                required maxLength={256} rows={3}
                placeholder="e.g. Tournament extended by 2 hours due to lightning. New end time: 10pm ET."
                style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
              />
              {announceResult && (
                <div style={{ fontSize: 13, color: announceResult.startsWith('Error') ? C.red : C.green, marginBottom: 12 }}>{announceResult}</div>
              )}
              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button type="submit" disabled={announceSending} style={{ flex: 1, backgroundColor: C.accent, color: C.bg, border: 'none', borderRadius: 8, padding: '10px 0', fontWeight: 700, fontSize: 14, cursor: announceSending ? 'default' : 'pointer', opacity: announceSending ? 0.7 : 1 }}>
                  {announceSending ? 'Sending...' : 'Send Announcement'}
                </button>
                <button type="button" onClick={() => { setAnnounceTarget(null); setAnnounceResult(null); setAnnounceForm({ title: '', message: '' }); }}
                  style={{ padding: '10px 20px', backgroundColor: 'transparent', color: C.textSub, border: `1px solid ${C.border}`, borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Prize draw modal */}
      {drawTarget && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ backgroundColor: C.surface, borderRadius: 14, border: `1px solid ${C.border}`, padding: 28, maxWidth: 440, width: '100%', boxShadow: '0 8px 40px rgba(0,0,0,0.4)', textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>🎣</div>
            <h3 style={{ color: C.text, margin: '0 0 4px', fontSize: 16, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8 }}>Prize Draw</h3>
            <p style={{ color: C.textMuted, fontSize: 13, margin: '0 0 20px' }}>{drawTarget.name}</p>

            {!drawResult ? (
              <>
                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, color: C.textSub, fontSize: 14, marginBottom: 20, cursor: 'pointer' }}>
                  <input type="checkbox" checked={drawWeighted} onChange={e => setDrawWeighted(e.target.checked)} style={{ width: 16, height: 16 }} />
                  Weight by catch count (more catches = more entries)
                </label>
                <button onClick={runDraw} disabled={drawLoading} style={{ width: '100%', backgroundColor: C.accent, color: C.bg, border: 'none', borderRadius: 8, padding: '12px 0', fontWeight: 700, fontSize: 15, cursor: drawLoading ? 'default' : 'pointer', opacity: drawLoading ? 0.7 : 1, marginBottom: 10 }}>
                  {drawLoading ? 'Drawing...' : '🎰 Draw Winner'}
                </button>
              </>
            ) : (
              <div style={{ backgroundColor: C.surfaceHigh, borderRadius: 12, border: `2px solid ${C.accent}`, padding: '20px 24px', marginBottom: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: C.accent, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>🏆 Winner</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: C.text, marginBottom: 4 }}>{drawResult.winner.displayName}</div>
                <div style={{ fontSize: 14, color: C.textSub, marginBottom: 8 }}>{drawResult.winner.email}</div>
                <div style={{ fontSize: 12, color: C.textMuted }}>Selected from {drawResult.pool} {drawWeighted ? 'entries' : 'eligible anglers'}</div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              {drawResult && (
                <button onClick={() => { setDrawResult(null); }} style={{ flex: 1, backgroundColor: C.surfaceHigh, color: C.textSub, border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 0', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>
                  Draw Again
                </button>
              )}
              <button onClick={() => { setDrawTarget(null); setDrawResult(null); setDrawWeighted(false); }} style={{ flex: 1, backgroundColor: 'transparent', color: C.textSub, border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 0', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Check-In modal */}
      {qrTarget && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ backgroundColor: C.surface, borderRadius: 14, border: `1px solid ${C.border}`, padding: 28, maxWidth: 400, width: '100%', boxShadow: '0 8px 40px rgba(0,0,0,0.4)', textAlign: 'center' }}>
            <h3 style={{ color: C.text, margin: '0 0 4px', fontSize: 16, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8 }}>📱 Tournament Check-In QR</h3>
            <p style={{ color: C.textMuted, fontSize: 13, margin: '0 0 20px' }}>{qrTarget.name}</p>

            {qrCode ? (
              <>
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(`fishleague://check-in?code=${qrCode}`)}&bgcolor=2E3D38&color=CFC29C&margin=12`}
                  alt="Check-in QR code"
                  style={{ width: 220, height: 220, borderRadius: 12, border: `2px solid ${C.accent}40`, marginBottom: 16 }}
                />
                <div style={{ fontSize: 11, color: C.textMuted, fontFamily: 'monospace', marginBottom: 8, wordBreak: 'break-all', padding: '0 8px' }}>{qrCode}</div>
                <div style={{ fontSize: 13, color: C.textSub, marginBottom: 20 }}>
                  {qrCheckInCount > 0 ? `${qrCheckInCount} angler${qrCheckInCount !== 1 ? 's' : ''} checked in` : 'No check-ins yet'}
                </div>
              </>
            ) : (
              <div style={{ padding: '32px 0', color: C.textMuted, fontSize: 14, marginBottom: 16 }}>
                No QR code generated yet.<br />Generate one so anglers can check in.
              </div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={regenerateQrCode}
                disabled={qrGenerating}
                style={{ flex: 1, backgroundColor: C.accent, color: C.bg, border: 'none', borderRadius: 8, padding: '10px 0', fontWeight: 700, fontSize: 13, cursor: qrGenerating ? 'default' : 'pointer', opacity: qrGenerating ? 0.7 : 1 }}
              >
                {qrGenerating ? 'Generating...' : qrCode ? '↻ Regenerate' : '+ Generate QR'}
              </button>
              <button
                onClick={() => { setQrTarget(null); setQrCode(null); }}
                style={{ flex: 1, backgroundColor: 'transparent', color: C.textSub, border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 0', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit tournament modal */}
      {editTarget && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ backgroundColor: C.surface, borderRadius: 14, border: `1px solid ${C.border}`, padding: 28, maxWidth: 560, width: '100%', boxShadow: '0 8px 40px rgba(0,0,0,0.4)', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ color: C.text, margin: '0 0 20px', fontSize: 16, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8 }}>✏️ Edit Tournament</h3>
            <form onSubmit={saveEdit}>

              {/* Banner photo */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ color: C.textMuted, fontSize: 11, fontWeight: 700, display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>Banner Photo</label>
                {editBannerPreview && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={editBannerPreview} alt="Banner preview" style={{ width: '100%', height: 140, objectFit: 'cover', borderRadius: 8, border: `1px solid ${C.border}`, marginBottom: 10 }} />
                )}
                <label style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  backgroundColor: editBannerUploading ? C.surfaceHigh : C.bg,
                  border: `1px solid ${C.border}`, borderRadius: 8,
                  padding: '8px 16px', cursor: editBannerUploading ? 'default' : 'pointer',
                  fontSize: 13, fontWeight: 600, color: editBannerUploading ? C.textMuted : C.textSub,
                }}>
                  {editBannerUploading ? 'Uploading...' : editBannerPreview ? '↻ Replace Banner' : '+ Upload Banner'}
                  <input
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    disabled={editBannerUploading}
                    onChange={handleBannerFileChange}
                  />
                </label>
              </div>

              <label style={{ color: C.textMuted, fontSize: 11, fontWeight: 700, display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>Name</label>
              <input value={editName} onChange={e => setEditName(e.target.value)} required style={inputStyle} />

              <label style={{ color: C.textMuted, fontSize: 11, fontWeight: 700, display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>Start Date &amp; Time</label>
              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                <input type="date" value={editStartsDate} onChange={e => setEditStartsDate(e.target.value)} required style={{ ...inputStyle, marginBottom: 0, flex: 2, color: C.accent, borderColor: C.accent + '80', colorScheme: 'dark' }} />
                <input type="time" value={editStartsTime} onChange={e => setEditStartsTime(e.target.value)} required style={{ ...inputStyle, marginBottom: 0, flex: 1, color: C.accent, borderColor: C.accent + '80', colorScheme: 'dark' }} />
              </div>

              <label style={{ color: C.textMuted, fontSize: 11, fontWeight: 700, display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>End Date &amp; Time</label>
              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                <input type="date" value={editEndsDate} onChange={e => setEditEndsDate(e.target.value)} required style={{ ...inputStyle, marginBottom: 0, flex: 2, color: C.accent, borderColor: C.accent + '80', colorScheme: 'dark' }} />
                <input type="time" value={editEndsTime} onChange={e => setEditEndsTime(e.target.value)} required style={{ ...inputStyle, marginBottom: 0, flex: 1, color: C.accent, borderColor: C.accent + '80', colorScheme: 'dark' }} />
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ color: C.textMuted, fontSize: 11, fontWeight: 700, display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>Entry Fee ($)</label>
                  <input type="number" min="0" step="0.01" value={editEntryFee} onChange={e => setEditEntryFee(e.target.value)} placeholder="0.00" style={inputStyle} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ color: C.textMuted, fontSize: 11, fontWeight: 700, display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>Prize Pool ($)</label>
                  <input type="number" min="0" step="0.01" value={editPrizePool} onChange={e => setEditPrizePool(e.target.value)} placeholder="0.00" style={inputStyle} />
                </div>
              </div>

              <label style={{ color: C.textMuted, fontSize: 11, fontWeight: 700, display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>Scoring Method</label>
              <select value={editScoringMethod} onChange={e => setEditScoringMethod(e.target.value)} style={{ ...inputStyle, marginBottom: 14 }}>
                <option value="LENGTH">Longest Fish (inches)</option>
                <option value="WEIGHT">Heaviest Fish (oz)</option>
                <option value="FISH_COUNT">Most Fish Caught</option>
                <option value="SPECIES_COUNT">Most Species</option>
              </select>

              <label style={{ color: C.textMuted, fontSize: 11, fontWeight: 700, display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>Tournament Director</label>
              <select value={editDirectorId} onChange={e => setEditDirectorId(e.target.value)} style={{ ...inputStyle, marginBottom: 14 }}>
                <option value="">None assigned</option>
                {directors.map(d => (
                  <option key={d.id} value={d.id}>{d.displayName}</option>
                ))}
              </select>

              <label style={{ color: C.textMuted, fontSize: 11, fontWeight: 700, display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>Description / Rules</label>
              <textarea
                value={editDescription}
                onChange={e => setEditDescription(e.target.value)}
                maxLength={2000}
                rows={5}
                placeholder="Tournament rules, target species, registration info, etc."
                style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit', marginBottom: 14 }}
              />

              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button type="submit" disabled={editSaving} style={{ flex: 1, backgroundColor: C.accent, color: C.bg, border: 'none', borderRadius: 8, padding: '10px 0', fontWeight: 700, fontSize: 14, cursor: editSaving ? 'default' : 'pointer', opacity: editSaving ? 0.7 : 1 }}>
                  {editSaving ? 'Saving...' : 'Save Changes'}
                </button>
                <button type="button" onClick={() => setEditTarget(null)} style={{ padding: '10px 20px', backgroundColor: 'transparent', color: C.textSub, border: `1px solid ${C.border}`, borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Table */}
      <div style={{ backgroundColor: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${C.border}` }}>
              {['Name', 'Region', 'Week', 'Start', 'End', 'Entry', 'Prize Pool', 'Status', 'Actions'].map(h => (
                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', color: C.textMuted, fontSize: 11, fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedTournaments.length === 0 && (
              <tr><td colSpan={9} style={{ padding: 24, textAlign: 'center', color: C.textMuted }}>No tournaments yet.</td></tr>
            )}
            {paginatedTournaments.map((t) => (
              <tr key={t.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                <td style={{ padding: '12px 16px', color: C.text, fontWeight: 600 }}>
                  {t.name}
                  {t.scoringMethod && t.scoringMethod !== 'LENGTH' && (
                    <span style={{ marginLeft: 8, fontSize: 11, color: C.textMuted, fontWeight: 400 }}>
                      {t.scoringMethod === 'WEIGHT' ? '⚖️ Weight' : t.scoringMethod === 'FISH_COUNT' ? '🐟 Count' : '🎣 Species'}
                    </span>
                  )}
                  {(!t.scoringMethod || t.scoringMethod === 'LENGTH') && (
                    <span style={{ marginLeft: 8, fontSize: 11, color: C.textMuted, fontWeight: 400 }}>📏 Length</span>
                  )}
                  {t.director && (
                    <div style={{ fontSize: 11, color: C.textMuted, fontWeight: 400, marginTop: 3 }}>
                      🎯 {t.director.displayName}
                    </div>
                  )}
                </td>
                <td style={{ padding: '12px 16px', color: C.textSub, fontSize: 14 }}>{t.region?.name}</td>
                <td style={{ padding: '12px 16px', color: C.textSub, fontSize: 14 }}>Wk {t.weekNumber}</td>
                <td style={{ padding: '12px 16px', color: C.textSub, fontSize: 13 }}>
                  <div>{new Date(t.startsAt).toLocaleDateString()}</div>
                  <div style={{ color: C.textMuted, fontSize: 12 }}>{new Date(t.startsAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</div>
                </td>
                <td style={{ padding: '12px 16px', color: C.textSub, fontSize: 13 }}>
                  <div>{new Date(t.endsAt).toLocaleDateString()}</div>
                  <div style={{ color: C.textMuted, fontSize: 12 }}>{new Date(t.endsAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</div>
                </td>
                <td style={{ padding: '12px 16px', color: C.textSub, fontSize: 13 }}>
                  {t.entryFeeCents > 0 ? `$${(t.entryFeeCents / 100).toFixed(2)}` : <span style={{ color: C.textMuted }}>Free</span>}
                </td>
                <td style={{ padding: '12px 16px', fontSize: 13 }}>
                  {t.prizePoolCents > 0
                    ? <span style={{ color: C.accent, fontWeight: 700 }}>${(t.prizePoolCents / 100).toFixed(2)}</span>
                    : <span style={{ color: C.textMuted }}>—</span>}
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{
                    color: t.isOpen ? C.green : C.textMuted,
                    backgroundColor: t.isOpen ? C.greenBg : C.surfaceHigh,
                    border: `1px solid ${t.isOpen ? C.green + '50' : C.border}`,
                    borderRadius: 6, padding: '3px 10px', fontSize: 12, fontWeight: 700,
                    whiteSpace: 'nowrap', display: 'inline-block',
                  }}>
                    {t.isOpen ? '● Open' : '○ Closed'}
                  </span>
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {t.isOpen
                      ? <button onClick={() => api.closeTournament(t.id).then(load).catch(e => setError(e.message))} style={{ background: C.redBg, color: C.red, border: `1px solid ${C.red}50`, padding: '5px 14px', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Close</button>
                      : <button onClick={() => api.openTournament(t.id).then(load).catch(e => setError(e.message))} style={{ background: C.greenBg, color: C.green, border: `1px solid ${C.green}50`, padding: '5px 14px', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Open</button>
                    }
                    <button onClick={() => openEditModal(t)} style={{ background: C.surfaceHigh, color: C.accent, border: `1px solid ${C.accent}40`, padding: '5px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>✏️</button>
                    <button onClick={() => { setAnnounceTarget(t); setAnnounceResult(null); }} style={{ background: C.surfaceHigh, color: C.accent, border: `1px solid ${C.accent}40`, padding: '5px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>📢</button>
                    <button onClick={() => { setDrawTarget(t); setDrawResult(null); setDrawWeighted(false); }} style={{ background: C.surfaceHigh, color: C.accent, border: `1px solid ${C.accent}40`, padding: '5px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>🎁</button>
                    {t.isOpen && (
                      <button onClick={() => openQrModal(t)} style={{ background: C.surfaceHigh, color: C.accent, border: `1px solid ${C.accent}40`, padding: '5px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>📱</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination page={currentPage} total={filteredTournaments.length} onChange={setCurrentPage} />
    </div>
  );
}
