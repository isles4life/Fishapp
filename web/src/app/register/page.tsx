'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, setToken } from '../../lib/api';
import type { Region } from '../../lib/api';

const C = {
  bg:          '#0D1A0D',
  surface:     '#152515',
  surfaceHigh: '#1D331D',
  border:      '#2A4A2A',
  borderGold:  '#C9A450',
  accent:      '#C9A450',
  accentDark:  '#9E7A30',
  verified:    '#3DAF5A',
  verifiedBg:  '#0F3A1E',
  error:       '#C0392B',
  errorBg:     '#3A1414',
  text:        '#F0EDE4',
  textSub:     '#8BA88B',
  textMuted:   '#4A6A4A',
  gold:        '#C9A450',
  silver:      '#A0A8A0',
  bronze:      '#8B6F4A',
};

export default function RegisterPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [regions, setRegions] = useState<Region[]>([]);
  const [regionId, setRegionId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [focusField, setFocusField] = useState('');

  useEffect(() => {
    api.getRegions().then(r => { setRegions(r); if (r.length) setRegionId(r[0].id); }).catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { token } = await api.register(email, password, displayName, regionId);
      setToken(token);
      router.push('/');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  const inputStyle = (field: string): React.CSSProperties => ({
    width: '100%', padding: '14px', marginBottom: 12,
    backgroundColor: C.bg, border: `1px solid ${focusField === field ? C.accent : C.border}`, borderRadius: 10,
    color: C.text, fontSize: 16, boxSizing: 'border-box', outline: 'none',
  });

  return (
    <div style={{ minHeight: '100vh', backgroundColor: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ backgroundColor: C.surface, borderRadius: 16, padding: 40, width: '100%', maxWidth: 400, border: `1px solid ${C.border}` }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icon.png" alt="FishLeague" style={{ width: 80, display: 'block', margin: '0 auto 12px' }} />
        <h1 style={{ color: C.text, textAlign: 'center', margin: '0 0 4px', fontSize: 26, fontWeight: 900, letterSpacing: -0.5, textTransform: 'uppercase' }}>Create Account</h1>
        <p style={{ color: C.textSub, textAlign: 'center', margin: '0 0 24px', fontSize: 14 }}>Join the competition</p>

        {error && (
          <div style={{ backgroundColor: C.errorBg, border: `1px solid ${C.error}`, color: C.error, padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 14 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <input
            style={inputStyle('displayName')}
            type="text"
            placeholder="Display Name (shown on leaderboard)"
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            onFocus={() => setFocusField('displayName')}
            onBlur={() => setFocusField('')}
            required
          />
          <input
            style={inputStyle('email')}
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onFocus={() => setFocusField('email')}
            onBlur={() => setFocusField('')}
            required
          />
          <input
            style={inputStyle('password')}
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onFocus={() => setFocusField('password')}
            onBlur={() => setFocusField('')}
            required
          />

          {regions.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <label style={{ color: C.textMuted, fontSize: 11, fontWeight: 700, display: 'block', marginBottom: 8, letterSpacing: 1.2, textTransform: 'uppercase' }}>Your Region</label>
              {regions.map(r => (
                <button key={r.id} type="button" onClick={() => setRegionId(r.id)} style={{
                  width: '100%', padding: '10px 14px', marginBottom: 8,
                  backgroundColor: regionId === r.id ? C.accentDark : C.bg,
                  border: `1px solid ${regionId === r.id ? C.accent : C.border}`,
                  borderRadius: 8, color: regionId === r.id ? C.accent : C.textSub,
                  fontSize: 15, cursor: 'pointer', textAlign: 'left',
                  fontWeight: regionId === r.id ? 600 : 400,
                }}>
                  {r.name}
                </button>
              ))}
            </div>
          )}

          <button type="submit" style={{ width: '100%', padding: '13px', backgroundColor: C.accent, color: C.bg, fontWeight: 700, fontSize: 16, border: 'none', borderRadius: 10, cursor: 'pointer', marginTop: 4, letterSpacing: 1, textTransform: 'uppercase' }} disabled={loading}>
            {loading ? 'Creating account...' : 'Join The League'}
          </button>
        </form>

        <p style={{ color: C.textMuted, textAlign: 'center', marginTop: 20, fontSize: 14 }}>
          Already have an account?{' '}
          <Link href="/login" style={{ color: C.accent, textDecoration: 'none', fontWeight: 600 }}>Sign In</Link>
        </p>
        <p style={{ color: C.textMuted, textAlign: 'center', marginTop: 8, fontSize: 14 }}>
          <Link href="/" style={{ color: C.textSub, textDecoration: 'none' }}>← Back to Leaderboard</Link>
        </p>
      </div>
    </div>
  );
}
