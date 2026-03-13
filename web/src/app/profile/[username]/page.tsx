'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api, isLoggedIn } from '../../../lib/api';
import type { AnglerProfile } from '../../../lib/api';

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

const WATER_LABELS: Record<string, string> = {
  FRESHWATER: 'Freshwater', SALTWATER: 'Saltwater', BOTH: 'Both',
};

function TagList({ label, tags }: { label: string; tags: string[] }) {
  if (!tags.length) return null;
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ color: C.textMuted, fontSize: 11, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 6 }}>{label}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {tags.map(t => (
          <span key={t} style={{ padding: '3px 10px', borderRadius: 20, fontSize: 13, backgroundColor: C.surfaceHigh, color: C.textSub, border: `1px solid ${C.border}` }}>{t}</span>
        ))}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number | null }) {
  return (
    <div style={{ backgroundColor: C.surfaceHigh, borderRadius: 12, padding: '14px 16px', border: `1px solid ${C.border}`, textAlign: 'center' }}>
      <div style={{ fontSize: 24, fontWeight: 900, color: C.accent }}>{value ?? '—'}</div>
      <div style={{ fontSize: 11, color: C.textMuted, marginTop: 4, textTransform: 'uppercase', letterSpacing: 1 }}>{label}</div>
    </div>
  );
}

export default function PublicProfilePage() {
  const { username } = useParams<{ username: string }>();
  const [profile, setProfile] = useState<AnglerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [followLoading, setFollowLoading] = useState(false);
  const loggedIn = isLoggedIn();

  async function load() {
    try {
      const p = await api.getProfile(username);
      setProfile(p);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [username]);

  async function toggleFollow() {
    if (!profile) return;
    setFollowLoading(true);
    try {
      if (profile.isFollowing) {
        await api.unfollowAngler(username);
        setProfile(p => p ? { ...p, isFollowing: false, followersCount: p.followersCount - 1 } : p);
      } else {
        await api.followAngler(username);
        setProfile(p => p ? { ...p, isFollowing: true, followersCount: p.followersCount + 1 } : p);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setFollowLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: C.bg }}>
      <nav style={{ backgroundColor: C.surface, borderBottom: `1px solid ${C.border}`, position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: 760, margin: '0 auto', padding: '12px 20px', display: 'flex', alignItems: 'center' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none', gap: 10 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icon.png" alt="FishLeague" style={{ height: 34 }} />
            <span style={{ fontWeight: 900, fontSize: 18, letterSpacing: 1 }}>
              <span style={{ color: C.text }}>FISH</span><span style={{ color: C.accent }}>LEAGUE</span>
            </span>
          </Link>
          <span style={{ marginLeft: 'auto', color: C.textMuted, fontSize: 14 }}>Angler Profile</span>
        </div>
      </nav>

      <div style={{ maxWidth: 700, margin: '0 auto', padding: '32px 20px' }}>
        {loading && <div style={{ textAlign: 'center', color: C.textMuted, padding: 80 }}>Loading...</div>}

        {error && !loading && (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <p style={{ color: C.textSub, fontSize: 18 }}>{error}</p>
            <Link href="/" style={{ color: C.accent, textDecoration: 'none', fontSize: 14 }}>← Back to Leaderboard</Link>
          </div>
        )}

        {profile && !loading && (
          <>
            {/* Header */}
            <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', marginBottom: 28 }}>
              <div style={{ width: 88, height: 88, borderRadius: 44, backgroundColor: C.surfaceHigh, border: `3px solid ${C.borderGold}`, overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>
                {profile.profilePhotoUrl
                  ? <img src={profile.profilePhotoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : '🎣'}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <h2 style={{ color: C.text, margin: 0, fontSize: 26, fontWeight: 900 }}>{profile.user.displayName}</h2>
                  {profile.verifiedAngler && <span style={{ fontSize: 11, fontWeight: 700, color: C.verified, backgroundColor: C.verifiedBg, padding: '2px 8px', borderRadius: 10, border: `1px solid ${C.verified}50` }}>✓ VERIFIED</span>}
                </div>
                <div style={{ color: C.textMuted, fontSize: 14, marginTop: 2 }}>@{profile.username}</div>
                {profile.bio && <p style={{ color: C.textSub, fontSize: 14, marginTop: 8, marginBottom: 0 }}>{profile.bio}</p>}
                <div style={{ display: 'flex', gap: 16, marginTop: 10, flexWrap: 'wrap' }}>
                  <span style={{ color: C.textMuted, fontSize: 13 }}><strong style={{ color: C.textSub }}>{profile.followersCount}</strong> followers</span>
                  <span style={{ color: C.textMuted, fontSize: 13 }}><strong style={{ color: C.textSub }}>{profile.followingCount}</strong> following</span>
                  {(profile.homeCity || profile.homeState) && <span style={{ color: C.textMuted, fontSize: 13 }}>📍 {[profile.homeCity, profile.homeState].filter(Boolean).join(', ')}</span>}
                  <span style={{ color: C.textMuted, fontSize: 13 }}>Member since {new Date(profile.user.createdAt).getFullYear()}</span>
                </div>
              </div>

              {loggedIn && profile.allowFollowers && (
                <button onClick={toggleFollow} disabled={followLoading} style={{
                  backgroundColor: profile.isFollowing ? 'transparent' : C.accent,
                  color: profile.isFollowing ? C.textSub : C.bg,
                  border: `1px solid ${profile.isFollowing ? C.border : C.accent}`,
                  fontWeight: 700, fontSize: 13, padding: '8px 18px', borderRadius: 8, cursor: 'pointer', flexShrink: 0,
                }}>
                  {followLoading ? '...' : profile.isFollowing ? 'Following' : '+ Follow'}
                </button>
              )}
            </div>

            {error && <div style={{ color: C.error, background: C.errorBg, padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 14 }}>{error}</div>}

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 24 }}>
              <StatCard label="Catches" value={profile.stats.totalCatches} />
              <StatCard label="Tournaments" value={profile.stats.totalTournamentsEntered} />
              <StatCard label="Wins" value={profile.stats.tournamentsWon} />
              <StatCard label="Best Catch" value={profile.stats.largestCatchCm ? `${profile.stats.largestCatchCm} cm` : null} />
              <StatCard label="Avg Catch" value={profile.stats.averageCatchCm ? `${profile.stats.averageCatchCm} cm` : null} />
              <StatCard label="Sportsmanship" value={`${profile.sportsmanshipScore.toFixed(1)} ★`} />
            </div>

            {/* Badges */}
            {profile.badges.length > 0 && (
              <div style={{ backgroundColor: C.surface, borderRadius: 14, padding: 20, border: `1px solid ${C.border}`, marginBottom: 16 }}>
                <h4 style={{ color: C.textMuted, fontSize: 11, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase', margin: '0 0 12px' }}>Badges</h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {profile.badges.map(b => (
                    <span key={b} style={{ padding: '5px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600, backgroundColor: C.accent + '20', color: C.accent, border: `1px solid ${C.accent}50` }}>🏆 {b}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Preferences */}
            {(profile.primarySpecies.length > 0 || profile.favoriteTechniques.length > 0 || profile.favoriteBaits.length > 0 || profile.preferredWaterType) && (
              <div style={{ backgroundColor: C.surface, borderRadius: 14, padding: 20, border: `1px solid ${C.border}`, marginBottom: 16 }}>
                <h4 style={{ color: C.textMuted, fontSize: 11, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase', margin: '0 0 14px' }}>Fishing Preferences</h4>
                <TagList label="Species" tags={profile.primarySpecies} />
                <TagList label="Techniques" tags={profile.favoriteTechniques} />
                <TagList label="Baits" tags={profile.favoriteBaits} />
                {profile.preferredWaterType && (
                  <div><span style={{ color: C.textMuted, fontSize: 12 }}>Water: </span><span style={{ color: C.textSub, fontSize: 14 }}>{WATER_LABELS[profile.preferredWaterType]}</span></div>
                )}
              </div>
            )}

            {/* Gear */}
            {(profile.favoriteRod || profile.favoriteReel || profile.favoriteLine || profile.favoriteBoat || profile.sponsorTags.length > 0) && (
              <div style={{ backgroundColor: C.surface, borderRadius: 14, padding: 20, border: `1px solid ${C.border}` }}>
                <h4 style={{ color: C.textMuted, fontSize: 11, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase', margin: '0 0 14px' }}>Gear</h4>
                {([['Rod', profile.favoriteRod], ['Reel', profile.favoriteReel], ['Line', profile.favoriteLine], ['Boat', profile.favoriteBoat]] as [string, string | null][]).map(([label, val]) =>
                  val ? <div key={label} style={{ marginBottom: 6 }}><span style={{ color: C.textMuted, fontSize: 12 }}>{label}: </span><span style={{ color: C.textSub, fontSize: 14 }}>{val}</span></div> : null
                )}
                <TagList label="Sponsors" tags={profile.sponsorTags} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
