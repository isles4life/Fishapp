'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, setToken } from '../../lib/api';

const C = {
  bg: '#0d1821', surface: '#162032', border: '#2a3f55',
  green: '#2ecc71', text: '#e8f0fe', textSub: '#7a9bbf', textMuted: '#4a6580',
};

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { token } = await api.login(email, password);
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
        <h1 style={{ color: C.text, textAlign: 'center', margin: '0 0 4px', fontSize: 26, fontWeight: 800 }}>Sign In</h1>
        <p style={{ color: C.textMuted, textAlign: 'center', margin: '0 0 24px', fontSize: 14 }}>Welcome back, angler</p>

        {error && (
          <div style={{ backgroundColor: '#2a0f0f', border: '1px solid #e74c3c', color: '#e74c3c', padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 14 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <input style={inputStyle} type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
          <input style={inputStyle} type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required />
          <button type="submit" style={{ width: '100%', padding: '13px', backgroundColor: C.green, color: C.bg, fontWeight: 700, fontSize: 16, border: 'none', borderRadius: 8, cursor: 'pointer', marginTop: 4 }} disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p style={{ color: C.textMuted, textAlign: 'center', marginTop: 20, fontSize: 14 }}>
          Don&apos;t have an account?{' '}
          <Link href="/register" style={{ color: C.green, textDecoration: 'none', fontWeight: 600 }}>Register</Link>
        </p>
        <p style={{ color: C.textMuted, textAlign: 'center', marginTop: 8, fontSize: 14 }}>
          <Link href="/" style={{ color: C.textSub, textDecoration: 'none' }}>← Back to Leaderboard</Link>
        </p>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '12px 14px', marginBottom: 12,
  backgroundColor: '#0d1821', border: '1px solid #2a3f55', borderRadius: 8,
  color: '#e8f0fe', fontSize: 16, boxSizing: 'border-box',
};
