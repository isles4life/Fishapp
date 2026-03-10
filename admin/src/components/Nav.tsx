'use client';
import { useAuth } from './AuthProvider';

export default function Nav() {
  const { logout } = useAuth();

  return (
    <nav style={{ background: '#1a3a5c', color: 'white', padding: '12px 24px', display: 'flex', gap: 24, alignItems: 'center' }}>
      <strong>🎣 FishLeague Admin</strong>
      <a href="/moderation" style={{ color: '#90caf9', textDecoration: 'none' }}>Moderation</a>
      <a href="/tournaments" style={{ color: '#90caf9', textDecoration: 'none' }}>Tournaments</a>
      <a href="/leaderboard" style={{ color: '#90caf9', textDecoration: 'none' }}>Leaderboard</a>
      <span style={{ marginLeft: 'auto' }}>
        <button onClick={logout} style={{ background: 'transparent', border: '1px solid #90caf9', color: '#90caf9', padding: '4px 12px', borderRadius: 4, cursor: 'pointer', fontSize: 13 }}>
          Sign Out
        </button>
      </span>
    </nav>
  );
}
