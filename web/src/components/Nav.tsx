'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { api, clearToken, isLoggedIn, fixS3Url } from '../lib/api';
import type { AnglerProfile } from '../lib/api';

const C = {
  bg:          '#0D1A0D',
  surface:     '#152515',
  surfaceHigh: '#1D331D',
  border:      '#2A4A2A',
  borderGold:  '#C9A450',
  accent:      '#C9A450',
  text:        '#F0EDE4',
  textSub:     '#8BA88B',
  textMuted:   '#4A6A4A',
};

function initials(name?: string | null) {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

export default function Nav({ active }: { active?: 'home' | 'leaderboard' | 'tournaments' | 'profile' | 'forecast' | 'map' }) {
  const [loggedIn, setLoggedIn] = useState(false);
  const [profile, setProfile] = useState<AnglerProfile | null>(null);
  const [navOpen, setNavOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const li = isLoggedIn();
    setLoggedIn(li);
    if (li) {
      api.getMyProfile().then(setProfile).catch(() => {});
    }
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setNavOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function handleLogout() {
    clearToken();
    setLoggedIn(false);
    setProfile(null);
    setNavOpen(false);
    window.location.href = '/';
  }

  function linkStyle(name: 'home' | 'leaderboard' | 'tournaments' | 'profile' | 'forecast' | 'map'): React.CSSProperties {
    const isActive = active === name;
    return {
      color: isActive ? C.accent : C.textSub,
      textDecoration: 'none',
      fontSize: 13,
      fontWeight: 600,
      letterSpacing: 0.5,
      paddingBottom: isActive ? 2 : 0,
      borderBottom: isActive ? `2px solid ${C.accent}` : '2px solid transparent',
      textTransform: 'uppercase',
    };
  }

  const accentBtn: React.CSSProperties = {
    backgroundColor: C.accent, color: C.bg, fontWeight: 700,
    padding: '8px 16px', borderRadius: 8, textDecoration: 'none',
    fontSize: 13, border: 'none', cursor: 'pointer', display: 'inline-block',
    letterSpacing: 1, textTransform: 'uppercase',
  };
  const ghostBtn: React.CSSProperties = {
    backgroundColor: 'transparent', color: C.textSub, fontWeight: 600,
    padding: '8px 16px', borderRadius: 8, textDecoration: 'none',
    fontSize: 13, border: `1px solid ${C.border}`, cursor: 'pointer', display: 'inline-block',
  };

  return (
    <>
    <nav style={{
      backgroundColor: C.surface,
      borderBottom: `1px solid ${C.border}`,
      position: 'sticky',
      top: 0,
      zIndex: 10,
      height: 64,
    }}>
      <div style={{
        maxWidth: 900,
        margin: '0 auto',
        padding: '0 20px',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 0,
      }}>
        {/* Logo */}
        <Link href="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none', gap: 0, flexShrink: 0 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon.png" alt="FishLeague" style={{ height: 56, width: 'auto', display: 'block' }} />
          <span style={{ fontWeight: 900, fontSize: 19, letterSpacing: 1, lineHeight: 1, marginLeft: -15 }}>
            <span style={{ color: C.text }}>FISH</span><span style={{ color: C.accent }}>LEAGUE</span>
          </span>
        </Link>

        {/* Center nav links — hidden on narrow screens via inline style trick */}
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', gap: 28 }} className="nav-center-links">
          <Link href="/leaderboard" style={linkStyle('leaderboard')}>Leaderboard</Link>
          <Link href="/tournaments" style={linkStyle('tournaments')}>Tournaments</Link>
          {loggedIn && (
            <Link href="/fishing-intelligence" style={linkStyle('forecast')}>⚡ Forecast</Link>
          )}
          {loggedIn && (
            <Link href="/map" style={linkStyle('map')}>🗺️ Map</Link>
          )}
        </div>

        {/* Right: auth */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexShrink: 0, marginLeft: 'auto' }}>
          {loggedIn ? (
            <div ref={dropdownRef} style={{ position: 'relative' }}>
              <button
                onClick={() => setNavOpen(o => !o)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  padding: 0, display: 'flex', alignItems: 'center', gap: 8,
                }}
              >
                <div style={{
                  width: 34, height: 34, borderRadius: 17, overflow: 'hidden',
                  border: `1.5px solid ${C.borderGold}`, backgroundColor: C.surfaceHigh,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  {profile?.profilePhotoUrl
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={fixS3Url(profile.profilePhotoUrl) ?? ''} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <span style={{ fontSize: 12, fontWeight: 700, color: C.textSub }}>{initials(profile?.user?.displayName)}</span>
                  }
                </div>
                <span className="hide-mobile" style={{ color: C.textSub, fontSize: 13, fontWeight: 600 }}>
                  {profile?.username ? `@${profile.username}` : 'My Account'}
                </span>
                <span className="hide-mobile" style={{ color: C.textMuted, fontSize: 10 }}>{navOpen ? '▲' : '▼'}</span>
              </button>
              {navOpen && (
                <div style={{
                  position: 'absolute', top: 44, right: 0, minWidth: 170,
                  backgroundColor: C.surface, border: `1px solid ${C.border}`,
                  borderRadius: 10, overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                  zIndex: 100,
                }}>
                  <Link
                    href="/profile"
                    onClick={() => setNavOpen(false)}
                    style={{
                      display: 'block', padding: '12px 16px', color: C.text,
                      textDecoration: 'none', fontSize: 14, fontWeight: 600,
                      borderBottom: `1px solid ${C.border}`,
                    }}
                  >
                    👤 My Profile
                  </Link>
                  <button
                    onClick={handleLogout}
                    style={{
                      display: 'block', width: '100%', textAlign: 'left',
                      padding: '12px 16px', color: C.textSub, background: 'none',
                      border: 'none', fontSize: 14, cursor: 'pointer', fontWeight: 600,
                    }}
                  >
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link href="/login" style={ghostBtn}>Sign In</Link>
              <Link href="/register" style={accentBtn} className="hide-mobile">Join Now</Link>
            </>
          )}
        </div>
      </div>

      {/* Inline style to hide center links on narrow screens */}
      <style>{`
        @media (max-width: 640px) {
          .nav-center-links { display: none !important; }
          .hide-mobile { display: none !important; }
        }
      `}</style>
    </nav>
    <MobileBottomNav active={active} />
    </>
  );
}

function MobileBottomNav({ active }: { active?: string }) {
  const [loggedIn, setLoggedIn] = useState(false);
  useEffect(() => { setLoggedIn(isLoggedIn()); }, []);

  const items = [
    { href: '/',                       label: 'Home',     icon: '🏠',  activeKey: 'home' },
    { href: '/leaderboard',            label: 'Board',    icon: '🏆',  activeKey: 'leaderboard' },
    { href: '/tournaments',            label: 'Compete',  icon: null,  activeKey: 'tournaments' },
    ...(loggedIn ? [
      { href: '/fishing-intelligence', label: 'Forecast', icon: '⚡',  activeKey: 'forecast' },
      { href: '/map',                  label: 'Map',       icon: '🗺️', activeKey: 'map' },
    ] : []),
  ];

  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100,
      backgroundColor: '#152515',
      borderTop: '1px solid #2A4A2A',
      paddingBottom: 'max(10px, env(safe-area-inset-bottom))',
      paddingTop: 10,
    }} id="mobile-bottom-nav">
      <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'flex-start' }}>
        {items.map(item => {
          const isActive = active === item.activeKey;
          return (
            <a key={item.href} href={item.href} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
              color: isActive ? '#C9A450' : '#4A6A4A',
              textDecoration: 'none',
              flex: 1,
              paddingTop: 2,
            }}>
              {/* Active indicator bar */}
              <div style={{
                height: 2, width: 20, borderRadius: 1,
                backgroundColor: isActive ? '#C9A450' : 'transparent',
                marginBottom: 4,
              }} />
              {item.icon
                // eslint-disable-next-line @next/next/no-img-element
                ? <span style={{ fontSize: 26, lineHeight: 1 }}>{item.icon}</span>
                : <img src="/icon.png" alt="Compete" style={{ height: 26, width: 'auto' }} />
              }
              <span style={{
                fontSize: 10, fontWeight: 700, letterSpacing: 0.8,
                color: isActive ? '#C9A450' : '#4A6A4A',
                textTransform: 'uppercase',
                marginTop: 2,
              }}>
                {item.label}
              </span>
            </a>
          );
        })}
      </div>
    </nav>
  );
}
