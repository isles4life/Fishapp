'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, isLoggedIn } from '../../lib/api';
import type { AnglerProfile, UpdateProfilePayload } from '../../lib/api';

const C = {
  bg: '#0d1821', surface: '#162032', surfaceHigh: '#1e2d40', border: '#2a3f55',
  green: '#2ecc71', greenMuted: '#1a3a2a', gold: '#f0b429', blue: '#3498db',
  text: '#e8f0fe', textSub: '#7a9bbf', textMuted: '#4a6580',
};

const WATER_LABELS: Record<string, string> = {
  FRESHWATER: 'Freshwater', SALTWATER: 'Saltwater', BOTH: 'Both',
};

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 12px', marginBottom: 12, boxSizing: 'border-box',
  backgroundColor: C.bg, border: `1px solid ${C.border}`, borderRadius: 8,
  color: C.text, fontSize: 14,
};

function TagList({ label, tags }: { label: string; tags: string[] }) {
  if (!tags.length) return null;
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ color: C.textMuted, fontSize: 11, fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 6 }}>{label}</div>
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
    <div style={{ backgroundColor: C.surfaceHigh, borderRadius: 10, padding: '14px 16px', border: `1px solid ${C.border}`, textAlign: 'center' }}>
      <div style={{ fontSize: 22, fontWeight: 800, color: C.green }}>{value ?? '—'}</div>
      <div style={{ fontSize: 11, color: C.textMuted, marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
    </div>
  );
}

export default function MyProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<AnglerProfile | null>(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form state
  const [form, setForm] = useState<UpdateProfilePayload>({});

  useEffect(() => {
    if (!isLoggedIn()) { router.push('/login'); return; }
    api.getMyProfile()
      .then(p => {
        setProfile(p);
        if (p) setForm({
          username: p.username, bio: p.bio ?? '', profilePhotoUrl: p.profilePhotoUrl ?? '',
          homeState: p.homeState ?? '', homeCity: p.homeCity ?? '', country: p.country ?? '',
          primarySpecies: p.primarySpecies, favoriteTechniques: p.favoriteTechniques,
          favoriteBaits: p.favoriteBaits, preferredWaterType: p.preferredWaterType ?? undefined,
          favoriteRod: p.favoriteRod ?? '', favoriteReel: p.favoriteReel ?? '',
          favoriteLine: p.favoriteLine ?? '', favoriteBoat: p.favoriteBoat ?? '',
          sponsorTags: p.sponsorTags, allowFollowers: p.allowFollowers, publicProfile: p.publicProfile,
        });
        if (!p) setEditing(true); // first-time setup
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [router]);

  function setArr(field: keyof UpdateProfilePayload, raw: string) {
    setForm(f => ({ ...f, [field]: raw.split(',').map(s => s.trim()).filter(Boolean) }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError(''); setSuccess('');
    try {
      const updated = await api.updateProfile(form);
      setProfile(updated);
      setEditing(false);
      setSuccess('Profile saved!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  }

  if (loading) return <Page><div style={{ textAlign: 'center', color: C.textMuted, padding: 80 }}>Loading...</div></Page>;

  if (editing) return (
    <Page>
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <h2 style={{ color: C.text, margin: 0 }}>{profile ? 'Edit Profile' : 'Set Up Your Angler Profile'}</h2>
          {profile && <button onClick={() => setEditing(false)} style={ghostBtn}>Cancel</button>}
        </div>

        {error && <ErrBox msg={error} />}

        <form onSubmit={handleSave}>
          <Section title="Identity">
            <label style={labelStyle}>Username (3–20 chars, letters/numbers/_)</label>
            <input style={inputStyle} value={form.username ?? ''} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} placeholder="bass_master_99" required minLength={3} maxLength={20} />
            <label style={labelStyle}>Bio (max 250 chars)</label>
            <textarea style={{ ...inputStyle, height: 80, resize: 'vertical' }} value={form.bio ?? ''} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} placeholder="Tell the FishLeague community about yourself..." maxLength={250} />
            <label style={labelStyle}>Profile Photo URL</label>
            <input style={inputStyle} value={form.profilePhotoUrl ?? ''} onChange={e => setForm(f => ({ ...f, profilePhotoUrl: e.target.value }))} placeholder="https://..." />
          </Section>

          <Section title="Location">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div><label style={labelStyle}>State / Province</label><input style={inputStyle} value={form.homeState ?? ''} onChange={e => setForm(f => ({ ...f, homeState: e.target.value }))} placeholder="Texas" /></div>
              <div><label style={labelStyle}>City</label><input style={inputStyle} value={form.homeCity ?? ''} onChange={e => setForm(f => ({ ...f, homeCity: e.target.value }))} placeholder="Austin" /></div>
            </div>
            <label style={labelStyle}>Country</label>
            <input style={inputStyle} value={form.country ?? ''} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} placeholder="USA" />
          </Section>

          <Section title="Fishing Preferences">
            <label style={labelStyle}>Primary Species (comma-separated)</label>
            <input style={inputStyle} value={(form.primarySpecies ?? []).join(', ')} onChange={e => setArr('primarySpecies', e.target.value)} placeholder="Bass, Trout, Redfish" />
            <label style={labelStyle}>Favorite Techniques (comma-separated)</label>
            <input style={inputStyle} value={(form.favoriteTechniques ?? []).join(', ')} onChange={e => setArr('favoriteTechniques', e.target.value)} placeholder="Fly, Spinning, Baitcasting" />
            <label style={labelStyle}>Favorite Baits (comma-separated)</label>
            <input style={inputStyle} value={(form.favoriteBaits ?? []).join(', ')} onChange={e => setArr('favoriteBaits', e.target.value)} placeholder="Crankbait, Jig, Live Shrimp" />
            <label style={labelStyle}>Preferred Water Type</label>
            <select style={inputStyle} value={form.preferredWaterType ?? ''} onChange={e => setForm(f => ({ ...f, preferredWaterType: e.target.value as any || undefined }))}>
              <option value="">— Select —</option>
              <option value="FRESHWATER">Freshwater</option>
              <option value="SALTWATER">Saltwater</option>
              <option value="BOTH">Both</option>
            </select>
          </Section>

          <Section title="Gear">
            {(['favoriteRod', 'favoriteReel', 'favoriteLine', 'favoriteBoat'] as const).map(f => (
              <div key={f}>
                <label style={labelStyle}>{f.replace('favorite', 'Favorite ').replace(/([A-Z])/g, ' $1').trim()}</label>
                <input style={inputStyle} value={(form[f] as string) ?? ''} onChange={e => setForm(p => ({ ...p, [f]: e.target.value }))} />
              </div>
            ))}
            <label style={labelStyle}>Sponsor Tags (comma-separated)</label>
            <input style={inputStyle} value={(form.sponsorTags ?? []).join(', ')} onChange={e => setArr('sponsorTags', e.target.value)} placeholder="Shimano, Abu Garcia" />
          </Section>

          <Section title="Privacy">
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, color: C.textSub, fontSize: 14, marginBottom: 10, cursor: 'pointer' }}>
              <input type="checkbox" checked={form.publicProfile ?? true} onChange={e => setForm(f => ({ ...f, publicProfile: e.target.checked }))} />
              Public Profile
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, color: C.textSub, fontSize: 14, cursor: 'pointer' }}>
              <input type="checkbox" checked={form.allowFollowers ?? true} onChange={e => setForm(f => ({ ...f, allowFollowers: e.target.checked }))} />
              Allow Followers
            </label>
          </Section>

          {error && <ErrBox msg={error} />}
          <button type="submit" disabled={saving} style={{ backgroundColor: C.green, color: C.bg, fontWeight: 700, fontSize: 16, border: 'none', borderRadius: 8, padding: '13px 32px', cursor: 'pointer', width: '100%' }}>
            {saving ? 'Saving...' : 'Save Profile'}
          </button>
        </form>
      </div>
    </Page>
  );

  if (!profile) return (
    <Page>
      <div style={{ textAlign: 'center', padding: 60 }}>
        <p style={{ color: C.textSub, fontSize: 18, marginBottom: 20 }}>You haven&apos;t set up your angler profile yet.</p>
        <button onClick={() => setEditing(true)} style={{ backgroundColor: C.green, color: C.bg, fontWeight: 700, padding: '12px 28px', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 15 }}>Set Up Profile</button>
      </div>
    </Page>
  );

  const { stats } = profile;

  return (
    <Page>
      {success && <div style={{ backgroundColor: C.greenMuted, border: `1px solid ${C.green}50`, color: C.green, padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 14 }}>{success}</div>}
      <div style={{ maxWidth: 700, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', marginBottom: 28 }}>
          <div style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: C.surfaceHigh, border: `2px solid ${C.border}`, overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>
            {profile.profilePhotoUrl
              ? <img src={profile.profilePhotoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : '🎣'}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <h2 style={{ color: C.text, margin: 0, fontSize: 24, fontWeight: 800 }}>{profile.user.displayName}</h2>
              {profile.verifiedAngler && <span style={{ fontSize: 11, fontWeight: 700, color: C.blue, backgroundColor: C.blue + '20', padding: '2px 8px', borderRadius: 10, border: `1px solid ${C.blue}40` }}>✓ VERIFIED</span>}
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
          <button onClick={() => setEditing(true)} style={ghostBtn}>Edit Profile</button>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 24 }}>
          <StatCard label="Catches" value={stats.totalCatches} />
          <StatCard label="Tournaments" value={stats.totalTournamentsEntered} />
          <StatCard label="Wins" value={stats.tournamentsWon} />
          <StatCard label="Best Catch" value={stats.largestCatchCm ? `${stats.largestCatchCm} cm` : null} />
          <StatCard label="Avg Catch" value={stats.averageCatchCm ? `${stats.averageCatchCm} cm` : null} />
          <StatCard label="Sportsmanship" value={`${profile.sportsmanshipScore.toFixed(1)} ★`} />
        </div>

        {/* Badges */}
        {profile.badges.length > 0 && (
          <div style={{ backgroundColor: C.surface, borderRadius: 12, padding: 18, border: `1px solid ${C.border}`, marginBottom: 16 }}>
            <h4 style={{ color: C.textMuted, fontSize: 11, fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', margin: '0 0 12px' }}>Badges</h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {profile.badges.map(b => (
                <span key={b} style={{ padding: '5px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600, backgroundColor: C.gold + '20', color: C.gold, border: `1px solid ${C.gold}40` }}>🏆 {b}</span>
              ))}
            </div>
          </div>
        )}

        {/* Fishing preferences */}
        <div style={{ backgroundColor: C.surface, borderRadius: 12, padding: 18, border: `1px solid ${C.border}`, marginBottom: 16 }}>
          <h4 style={{ color: C.textMuted, fontSize: 11, fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', margin: '0 0 14px' }}>Fishing Preferences</h4>
          <TagList label="Species" tags={profile.primarySpecies} />
          <TagList label="Techniques" tags={profile.favoriteTechniques} />
          <TagList label="Baits" tags={profile.favoriteBaits} />
          {profile.preferredWaterType && (
            <div><span style={{ color: C.textMuted, fontSize: 12 }}>Water: </span><span style={{ color: C.textSub, fontSize: 14 }}>{WATER_LABELS[profile.preferredWaterType]}</span></div>
          )}
        </div>

        {/* Gear */}
        {(profile.favoriteRod || profile.favoriteReel || profile.favoriteLine || profile.favoriteBoat || profile.sponsorTags.length > 0) && (
          <div style={{ backgroundColor: C.surface, borderRadius: 12, padding: 18, border: `1px solid ${C.border}` }}>
            <h4 style={{ color: C.textMuted, fontSize: 11, fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', margin: '0 0 14px' }}>Gear</h4>
            {([['Rod', profile.favoriteRod], ['Reel', profile.favoriteReel], ['Line', profile.favoriteLine], ['Boat', profile.favoriteBoat]] as [string, string | null][]).map(([label, val]) =>
              val ? <div key={label} style={{ marginBottom: 6 }}><span style={{ color: C.textMuted, fontSize: 12 }}>{label}: </span><span style={{ color: C.textSub, fontSize: 14 }}>{val}</span></div> : null
            )}
            <TagList label="Sponsors" tags={profile.sponsorTags} />
          </div>
        )}
      </div>
    </Page>
  );
}

function Page({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: C.bg }}>
      <nav style={{ backgroundColor: C.surface, borderBottom: `1px solid ${C.border}`, position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: 760, margin: '0 auto', padding: '12px 20px', display: 'flex', alignItems: 'center' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none', gap: 10 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icon.png" alt="FishLeague" style={{ height: 34 }} />
            <span style={{ color: C.text, fontWeight: 800, fontSize: 18 }}>FishLeague</span>
          </Link>
          <span style={{ marginLeft: 'auto', color: C.textMuted, fontSize: 14 }}>My Profile</span>
        </div>
      </nav>
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '32px 20px' }}>{children}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ backgroundColor: C.surface, borderRadius: 12, padding: 20, border: `1px solid ${C.border}`, marginBottom: 16 }}>
      <h4 style={{ color: C.textMuted, fontSize: 11, fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', margin: '0 0 14px' }}>{title}</h4>
      {children}
    </div>
  );
}

function ErrBox({ msg }: { msg: string }) {
  return <div style={{ color: '#e74c3c', background: '#2a0f0f', border: '1px solid #e74c3c', padding: '10px 14px', borderRadius: 8, marginBottom: 14, fontSize: 14 }}>{msg}</div>;
}

const labelStyle: React.CSSProperties = { display: 'block', color: C.textMuted, fontSize: 12, fontWeight: 600, marginBottom: 4 };
const ghostBtn: React.CSSProperties = { backgroundColor: 'transparent', color: C.textSub, fontWeight: 600, padding: '8px 16px', borderRadius: 8, border: `1px solid ${C.border}`, cursor: 'pointer', fontSize: 13 };
