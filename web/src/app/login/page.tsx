'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, setToken } from '../../lib/api';

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
    <div style={page}>
      <div style={card}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icon.png" alt="FishLeague" style={{ width: 80, display: 'block', margin: '0 auto 8px' }} />
        <h1 style={title}>Sign In</h1>
        <p style={subtitle}>Welcome back, angler</p>

        {error && <div style={errorBox}>{error}</div>}

        <form onSubmit={handleSubmit}>
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
          <button type="submit" style={btn} disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p style={linkRow}>
          Don&apos;t have an account?{' '}
          <Link href="/register" style={linkStyle}>Register</Link>
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
const errorBox: React.CSSProperties = {
  backgroundColor: '#2a0f0f', border: '1px solid #e74c3c',
  color: '#e74c3c', padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 14,
};
const linkRow: React.CSSProperties = { color: '#666', textAlign: 'center', marginTop: 20, fontSize: 14 };
const linkStyle: React.CSSProperties = { color: '#39FF14', textDecoration: 'none', fontWeight: 600 };
