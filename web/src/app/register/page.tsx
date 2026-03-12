'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, setToken } from '../../lib/api';
import type { Region } from '../../lib/api';

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
    api.getRegions().then(r => {
      setRegions(r);
      if (r.length) setRegionId(r[0].id);
    }).catch(() => {});
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
    <div style={page}>
      <div style={card}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icon.png" alt="FishLeague" style={{ width: 80, display: 'block', margin: '0 auto 8px' }} />
        <h1 style={title}>Create Account</h1>
        <p style={subtitle}>Join the competition</p>

        {error && <div style={errorBox}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <input
            style={input}
            type="text"
            placeholder="Display Name (shown on leaderboard)"
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            required
          />
          <input
            style={input}
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
          <input
            style={input}
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />

          {regions.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <label style={{ color: '#888', fontSize: 13, display: 'block', marginBottom: 6 }}>
                Your Region
              </label>
              {regions.map(r => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setRegionId(r.id)}
                  style={regionId === r.id ? regionBtnActive : regionBtn}
                >
                  {r.name}
                </button>
              ))}
            </div>
          )}

          <button type="submit" style={btn} disabled={loading}>
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p style={linkRow}>
          Already have an account?{' '}
          <Link href="/login" style={linkStyle}>Sign In</Link>
        </p>
        <p style={{ ...linkRow, marginTop: 4 }}>
          <Link href="/" style={linkStyle}>← Back to Leaderboard</Link>
        </p>
      </div>
    </div>
  );
}

const page: React.CSSProperties = {
  minHeight: '100vh', backgroundColor: '#111111',
  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
};
const card: React.CSSProperties = {
  backgroundColor: '#1a1a1a', borderRadius: 12, padding: 36,
  width: '100%', maxWidth: 400, border: '1px solid #333',
};
const title: React.CSSProperties = { color: '#39FF14', textAlign: 'center', margin: '0 0 4px', fontSize: 28, fontWeight: 800 };
const subtitle: React.CSSProperties = { color: '#666', textAlign: 'center', margin: '0 0 24px', fontSize: 15 };
const input: React.CSSProperties = {
  width: '100%', padding: '12px 14px', marginBottom: 12,
  backgroundColor: '#111', border: '1px solid #333', borderRadius: 8,
  color: '#fff', fontSize: 16, boxSizing: 'border-box',
};
const btn: React.CSSProperties = {
  width: '100%', padding: '13px', backgroundColor: '#39FF14',
  color: '#111', fontWeight: 700, fontSize: 16, border: 'none',
  borderRadius: 8, cursor: 'pointer', marginTop: 4,
};
const regionBtn: React.CSSProperties = {
  width: '100%', padding: '10px 14px', marginBottom: 8,
  backgroundColor: '#111', border: '1px solid #333', borderRadius: 8,
  color: '#aaa', fontSize: 15, cursor: 'pointer', textAlign: 'left',
};
const regionBtnActive: React.CSSProperties = {
  ...regionBtn, border: '1px solid #39FF14', color: '#39FF14', backgroundColor: '#1a2a1a',
};
const errorBox: React.CSSProperties = {
  backgroundColor: '#2a0f0f', border: '1px solid #e74c3c',
  color: '#e74c3c', padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 14,
};
const linkRow: React.CSSProperties = { color: '#666', textAlign: 'center', marginTop: 20, fontSize: 14 };
const linkStyle: React.CSSProperties = { color: '#39FF14', textDecoration: 'none', fontWeight: 600 };
