'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, setToken } from '../../lib/api';
import type { Region } from '../../lib/api';

const C = {
  bg: '#0d1821', surface: '#162032', border: '#2a3f55',
  green: '#2ecc71', greenMuted: '#1a3a2a',
  text: '#e8f0fe', textSub: '#7a9bbf', textMuted: '#4a6580',
};

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '12px 14px', marginBottom: 12,
  backgroundColor: C.bg, border: `1px solid ${C.border}`, borderRadius: 8,
  color: C.text, fontSize: 16, boxSizing: 'border-box',
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

  return (
    <div style={{ minHeight: '100vh', backgroundColor: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ backgroundColor: C.surface, borderRadius: 14, padding: 36, width: '100%', maxWidth: 400, border: `1px solid ${C.border}` }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icon.png" alt="FishLeague" style={{ width: 80, display: 'block', margin: '0 auto 12px' }} />
        <h1 style={{ color: C.text, textAlign: 'center', margin: '0 0 4px', fontSize: 26, fontWeight: 800 }}>Create Account</h1>
        <p style={{ color: C.textMuted, textAlign: 'center', margin: '0 0 24px', fontSize: 14 }}>Join the competition</p>

        {error && (
          <div style={{ backgroundColor: '#2a0f0f', border: '1px solid #e74c3c', color: '#e74c3c', padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 14 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <input style={inputStyle} type="text" placeholder="Display Name (shown on leaderboard)" value={displayName} onChange={e => setDisplayName(e.target.value)} required />
          <input style={inputStyle} type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
          <input style={inputStyle} type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required />

          {regions.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <label style={{ color: C.textMuted, fontSize: 12, display: 'block', marginBottom: 8, letterSpacing: '0.5px', textTransform: 'uppercase' }}>Your Region</label>
              {regions.map(r => (
                <button key={r.id} type="button" onClick={() => setRegionId(r.id)} style={{
                  width: '100%', padding: '10px 14px', marginBottom: 8,
                  backgroundColor: regionId === r.id ? C.greenMuted : C.bg,
                  border: `1px solid ${regionId === r.id ? C.green : C.border}`,
                  borderRadius: 8, color: regionId === r.id ? C.green : C.textSub,
                  fontSize: 15, cursor: 'pointer', textAlign: 'left',
                  fontWeight: regionId === r.id ? 600 : 400,
                }}>
                  {r.name}
                </button>
              ))}
            </div>
          )}

          <button type="submit" style={{ width: '100%', padding: '13px', backgroundColor: C.green, color: C.bg, fontWeight: 700, fontSize: 16, border: 'none', borderRadius: 8, cursor: 'pointer', marginTop: 4 }} disabled={loading}>
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p style={{ color: C.textMuted, textAlign: 'center', marginTop: 20, fontSize: 14 }}>
          Already have an account?{' '}
          <Link href="/login" style={{ color: C.green, textDecoration: 'none', fontWeight: 600 }}>Sign In</Link>
        </p>
        <p style={{ color: C.textMuted, textAlign: 'center', marginTop: 8, fontSize: 14 }}>
          <Link href="/" style={{ color: C.textSub, textDecoration: 'none' }}>← Back to Leaderboard</Link>
        </p>
      </div>
    </div>
  );
}
