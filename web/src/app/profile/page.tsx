'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Nav from '../../components/Nav';
import { api, clearToken, isLoggedIn } from '../../lib/api';
import type { AnglerProfile, UpdateProfilePayload } from '../../lib/api';

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

// ── Species list (sourced from Take Me Fishing / FishBase / Bass Pro Shops) ───

const FRESHWATER_SPECIES = [
  'Alligator Gar', 'Atlantic Salmon', 'Bigmouth Buffalo', 'Bluegill', 'Bowfin',
  'Brook Trout', 'Brown Trout', 'Channel Catfish', 'Chinook Salmon', 'Coho Salmon',
  'Common Carp', 'Flathead Catfish', 'Blue Catfish', 'Bullhead Catfish',
  'Freshwater Drum', 'Green Sunfish', 'Lake Trout', 'Largemouth Bass',
  'Longnose Gar', 'Muskellunge (Muskie)', 'Northern Pike', 'Paddlefish',
  'Pumpkinseed', 'Rainbow Trout', 'Redear Sunfish', 'Rock Bass', 'Sauger',
  'Smallmouth Bass', 'Sockeye Salmon', 'Spotted Bass', 'Steelhead',
  'Striped Bass', 'Tiger Muskie', 'Walleye', 'Warmouth', 'White Bass',
  'White Crappie', 'Black Crappie', 'White Perch', 'Yellow Perch',
];

const SALTWATER_SPECIES = [
  'Almaco Jack', 'Bigeye Tuna', 'Black Drum', 'Black Grouper', 'Black Sea Bass',
  'Blue Marlin', 'Bluefin Tuna', 'Bluefish', 'Bonefish', 'Cobia',
  'Gag Grouper', 'Goliath Grouper', 'Greater Amberjack', 'Jack Crevalle',
  'King Mackerel', 'Ladyfish', 'Lane Snapper', 'Lingcod', 'Mahi-Mahi',
  'Mangrove Snapper', 'Pacific Halibut', 'Permit', 'Pompano', 'Red Drum (Redfish)',
  'Red Grouper', 'Red Snapper', 'Rockfish (Pacific)', 'Sailfish', 'Sheepshead',
  'Skipjack Tuna', 'Snook', 'Southern Flounder', 'Spanish Mackerel',
  'Spotted Seatrout', 'Striped Bass', 'Striped Mullet', 'Summer Flounder',
  'Swordfish', 'Tarpon', 'Tripletail', 'Vermilion Snapper', 'Wahoo',
  'Weakfish', 'White Marlin', 'Yellowfin Tuna', 'Yellowtail Snapper',
];

const ALL_SPECIES_GROUPED = [
  { label: 'Freshwater', items: FRESHWATER_SPECIES },
  { label: 'Saltwater', items: SALTWATER_SPECIES },
];

// ── SpeciesPicker component ───────────────────────────────────────────────────

function SpeciesPicker({ selected, onChange }: { selected: string[]; onChange: (v: string[]) => void }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  function toggle(species: string) {
    onChange(selected.includes(species) ? selected.filter(s => s !== species) : [...selected, species]);
  }

  const q = search.toLowerCase();
  const filtered = ALL_SPECIES_GROUPED
    .map(g => ({ ...g, items: g.items.filter(s => s.toLowerCase().includes(q)) }))
    .filter(g => g.items.length > 0);

  return (
    <div ref={ref} style={{ position: 'relative', marginBottom: 12 }}>
      {/* Selected chips */}
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          minHeight: 42, padding: '6px 10px', boxSizing: 'border-box',
          backgroundColor: C.bg, border: `1px solid ${open ? C.accent : C.border}`,
          borderRadius: 10, cursor: 'pointer', display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center',
        }}
      >
        {selected.length === 0 && <span style={{ color: C.textMuted, fontSize: 14 }}>Select species…</span>}
        {selected.map(s => (
          <span
            key={s}
            style={{ backgroundColor: C.surfaceHigh, color: C.textSub, border: `1px solid ${C.border}`, borderRadius: 20, padding: '2px 10px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}
          >
            {s}
            <span
              onClick={e => { e.stopPropagation(); toggle(s); }}
              style={{ cursor: 'pointer', color: C.textMuted, fontWeight: 700, fontSize: 12, lineHeight: 1 }}
            >×</span>
          </span>
        ))}
        <span style={{ marginLeft: 'auto', color: C.textMuted, fontSize: 12 }}>{open ? '▲' : '▼'}</span>
      </div>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200,
          backgroundColor: C.surface, border: `1px solid ${C.border}`, borderRadius: 10,
          marginTop: 4, boxShadow: '0 8px 24px rgba(0,0,0,0.5)', maxHeight: 320, display: 'flex', flexDirection: 'column',
        }}>
          <div style={{ padding: '8px 10px', borderBottom: `1px solid ${C.border}` }}>
            <input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search species…"
              style={{ width: '100%', boxSizing: 'border-box', backgroundColor: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, padding: '6px 10px', color: C.text, fontSize: 13, outline: 'none' }}
            />
          </div>
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {filtered.map(group => (
              <div key={group.label}>
                <div style={{ padding: '6px 12px 2px', fontSize: 10, fontWeight: 800, color: C.textMuted, letterSpacing: 1.2, textTransform: 'uppercase' }}>{group.label}</div>
                {group.items.map(species => {
                  const checked = selected.includes(species);
                  return (
                    <div
                      key={species}
                      onClick={() => toggle(species)}
                      style={{
                        padding: '8px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
                        backgroundColor: checked ? C.accentDark : 'transparent',
                        fontSize: 14, color: checked ? C.accent : C.text,
                      }}
                      onMouseEnter={e => { if (!checked) (e.currentTarget as HTMLDivElement).style.backgroundColor = C.surfaceHigh; }}
                      onMouseLeave={e => { if (!checked) (e.currentTarget as HTMLDivElement).style.backgroundColor = 'transparent'; }}
                    >
                      <span style={{ width: 16, height: 16, borderRadius: 4, border: `1.5px solid ${checked ? C.accent : C.border}`, backgroundColor: checked ? C.accent : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 11, color: C.bg, fontWeight: 800 }}>
                        {checked ? '✓' : ''}
                      </span>
                      {species}
                    </div>
                  );
                })}
              </div>
            ))}
            {filtered.length === 0 && <div style={{ padding: 16, color: C.textMuted, fontSize: 14, textAlign: 'center' }}>No species found</div>}
          </div>
          {selected.length > 0 && (
            <div style={{ padding: '8px 12px', borderTop: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: C.textMuted, fontSize: 12 }}>{selected.length} selected</span>
              <button onClick={() => onChange([])} style={{ background: 'none', border: 'none', color: C.textMuted, cursor: 'pointer', fontSize: 12 }}>Clear all</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const WATER_LABELS: Record<string, string> = {
  FRESHWATER: 'Freshwater', SALTWATER: 'Saltwater', BOTH: 'Both',
};

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 12px', marginBottom: 12, boxSizing: 'border-box',
  backgroundColor: C.bg, border: `1px solid ${C.border}`, borderRadius: 10,
  color: C.text, fontSize: 14, outline: 'none',
};

function TagList({ label, tags }: { label: string; tags: string[] }) {
  if (!tags.length) return null;
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ color: '#5A7A5A', fontSize: 11, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 6 }}>{label}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {tags.map(t => (
          <span key={t} style={{ padding: '3px 10px', borderRadius: 20, fontSize: 13, backgroundColor: '#EDE8D0', color: '#2E4A2E', border: '1px solid #C8BEA0' }}>{t}</span>
        ))}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number | null }) {
  return (
    <div style={{ backgroundColor: '#FFFFFF', borderRadius: 12, padding: '18px 16px', border: '1px solid #C8BEA0', textAlign: 'center' }}>
      <div style={{ fontSize: 28, fontWeight: 900, color: '#1A2A1A' }}>{value ?? '—'}</div>
      <div style={{ fontSize: 11, color: '#5A7A5A', marginTop: 4, textTransform: 'uppercase', letterSpacing: 1 }}>{label}</div>
    </div>
  );
}

// ── Avatar upload widget ───────────────────────────────────────────────────────

const AVATAR_RULES = 'JPG · PNG · WebP · Max 5 MB · 400×400 px min · Square (1:1) recommended';
const ACCEPTED = 'image/jpeg,image/png,image/webp';
const MAX_BYTES = 5 * 1024 * 1024;

function AvatarUpload({ current, displayName, onUploaded }: {
  current: string | null;
  displayName?: string;
  onUploaded: (url: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState('');
  const [preview, setPreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setErr('');
    if (file.size > MAX_BYTES) { setErr('File exceeds 5 MB limit.'); return; }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { setErr('Only JPG, PNG, or WebP allowed.'); return; }

    const reader = new FileReader();
    reader.onload = ev => setPreview(ev.target?.result as string);
    reader.readAsDataURL(file);

    setUploading(true);
    try {
      const { avatarUrl } = await api.uploadAvatar(file);
      onUploaded(avatarUrl);
      setPreview(null);
    } catch (e: any) {
      setErr(e.message);
      setPreview(null);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  const shown = preview ?? current;

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ color: C.textMuted, fontSize: 11, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 10 }}>Profile Picture</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <div style={{ width: 80, height: 80, borderRadius: 40, overflow: 'hidden', border: `2px solid ${C.borderGold}`, backgroundColor: C.surfaceHigh, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {shown
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={shown} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span style={{ fontSize: 32, color: C.textMuted }}>🎣</span>}
          </div>
          {uploading && (
            <div style={{ position: 'absolute', inset: 0, borderRadius: 40, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: C.text, fontSize: 12 }}>…</span>
            </div>
          )}
        </div>
        <div>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            style={{ backgroundColor: C.surfaceHigh, color: C.textSub, border: `1px solid ${C.border}`, padding: '7px 14px', borderRadius: 7, cursor: 'pointer', fontSize: 13, fontWeight: 600, marginBottom: 6, display: 'block' }}
          >
            {uploading ? 'Uploading…' : current ? 'Change Photo' : 'Upload Photo'}
          </button>
          <div style={{ color: C.textMuted, fontSize: 11, lineHeight: 1.6 }}>{AVATAR_RULES}</div>
          {err && <div style={{ color: C.error, fontSize: 12, marginTop: 4 }}>{err}</div>}
        </div>
      </div>
      <input ref={inputRef} type="file" accept={ACCEPTED} onChange={handleFile} style={{ display: 'none' }} />
    </div>
  );
}

// ── Main profile page ──────────────────────────────────────────────────────────

export default function MyProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<AnglerProfile | null>(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState<UpdateProfilePayload>({});

  useEffect(() => {
    if (!isLoggedIn()) { router.push('/login'); return; }
    api.getMyProfile()
      .then(p => {
        setProfile(p);
        if (p) setForm({
          username: p.username, bio: p.bio ?? '', birthday: p.birthday ? p.birthday.slice(0, 10) : '', profilePhotoUrl: p.profilePhotoUrl ?? '',
          homeState: p.homeState ?? '', homeCity: p.homeCity ?? '', country: p.country ?? '',
          zipCode: p.zipCode ?? '',
          primarySpecies: p.primarySpecies, favoriteTechniques: p.favoriteTechniques,
          favoriteBaits: p.favoriteBaits, preferredWaterType: p.preferredWaterType ?? undefined,
          favoriteRod: p.favoriteRod ?? '', favoriteReel: p.favoriteReel ?? '',
          favoriteLine: p.favoriteLine ?? '', favoriteBoat: p.favoriteBoat ?? '',
          sponsorTags: p.sponsorTags, allowFollowers: p.allowFollowers, publicProfile: p.publicProfile,
        });
        if (!p) setEditing(true);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [router]);

  function handleLogout() { clearToken(); router.push('/'); }
  void handleLogout; // kept for potential future use

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

  if (loading) return (
    <div style={{ minHeight: '100vh', backgroundColor: C.bg }}><Nav active="profile" /><div style={{ textAlign: 'center', color: C.textMuted, padding: 80 }}>Loading...</div></div>
  );

  if (editing) return (
    <div style={{ minHeight: '100vh', backgroundColor: C.bg }}>
      <Nav active="profile" />
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '32px 20px' }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
            <h2 style={{ color: C.text, margin: 0, fontWeight: 900, letterSpacing: -0.5, textTransform: 'uppercase' }}>{profile ? 'Edit Profile' : 'Set Up Your Angler Profile'}</h2>
            {profile && <button onClick={() => setEditing(false)} style={ghostBtn}>Cancel</button>}
          </div>
          {error && <ErrBox msg={error} />}
          <form onSubmit={handleSave}>
            <Section title="Identity">
              <AvatarUpload
                current={profile?.profilePhotoUrl ?? null}
                displayName={profile?.user?.displayName}
                onUploaded={url => {
                  setProfile(p => p ? { ...p, profilePhotoUrl: url } : p);
                  setForm(f => ({ ...f, profilePhotoUrl: url }));
                }}
              />
              <label style={labelStyle}>Username (3–20 chars, letters/numbers/_)</label>
              <input style={inputStyle} value={form.username ?? ''} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} placeholder="bass_master_99" required minLength={3} maxLength={20} />
              <label style={labelStyle}>Bio (max 250 chars)</label>
              <textarea style={{ ...inputStyle, height: 80, resize: 'vertical' }} value={form.bio ?? ''} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} placeholder="Tell the FishLeague community about yourself..." maxLength={250} />
              <label style={labelStyle}>Birthday</label>
              <input
                type="date"
                style={{ ...inputStyle, colorScheme: 'dark' }}
                value={form.birthday ?? ''}
                onChange={e => setForm(f => ({ ...f, birthday: e.target.value || undefined }))}
                max={new Date(new Date().setFullYear(new Date().getFullYear() - 13)).toISOString().slice(0, 10)}
              />
            </Section>

            <Section title="Location">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div><label style={labelStyle}>State / Province</label><input style={inputStyle} value={form.homeState ?? ''} onChange={e => setForm(f => ({ ...f, homeState: e.target.value }))} placeholder="Texas" /></div>
                <div><label style={labelStyle}>City</label><input style={inputStyle} value={form.homeCity ?? ''} onChange={e => setForm(f => ({ ...f, homeCity: e.target.value }))} placeholder="Austin" /></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <label style={labelStyle}>Country</label>
                  <input style={inputStyle} value={form.country ?? ''} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} placeholder="USA" />
                </div>
                <div>
                  <label style={labelStyle}>Zip / Postal Code</label>
                  <input style={inputStyle} value={form.zipCode ?? ''} onChange={e => setForm(f => ({ ...f, zipCode: e.target.value }))} placeholder="78701" maxLength={10} />
                </div>
              </div>
            </Section>

            <Section title="Fishing Preferences">
              <label style={labelStyle}>Primary Species</label>
              <SpeciesPicker selected={form.primarySpecies ?? []} onChange={v => setForm(f => ({ ...f, primarySpecies: v }))} />
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
                <input type="checkbox" checked={form.publicProfile ?? true} onChange={e => setForm(f => ({ ...f, publicProfile: e.target.checked }))} style={{ accentColor: C.accent }} />
                Public Profile
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, color: C.textSub, fontSize: 14, cursor: 'pointer' }}>
                <input type="checkbox" checked={form.allowFollowers ?? true} onChange={e => setForm(f => ({ ...f, allowFollowers: e.target.checked }))} style={{ accentColor: C.accent }} />
                Allow Followers
              </label>
            </Section>

            {error && <ErrBox msg={error} />}
            <button type="submit" disabled={saving} style={{ backgroundColor: C.accent, color: C.bg, fontWeight: 700, fontSize: 16, border: 'none', borderRadius: 10, padding: '13px 32px', cursor: 'pointer', width: '100%', letterSpacing: 1, textTransform: 'uppercase' }}>
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );

  if (!profile) return (
    <div style={{ minHeight: '100vh', backgroundColor: C.bg }}>
      <Nav active="profile" />
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '32px 20px', textAlign: 'center', paddingTop: 60 }}>
        <p style={{ color: C.textSub, fontSize: 18, marginBottom: 20 }}>You haven&apos;t set up your angler profile yet.</p>
        <button onClick={() => setEditing(true)} style={{ backgroundColor: C.accent, color: C.bg, fontWeight: 700, padding: '12px 28px', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 15, letterSpacing: 1, textTransform: 'uppercase' }}>Set Up Profile</button>
      </div>
    </div>
  );

  const { stats } = profile;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F0EAD0' }}>
      <Nav active="profile" />

      {/* Dark green hero band */}
      <div style={{ backgroundColor: C.bg, borderBottom: `1px solid ${C.border}` }}>
        <div style={{ maxWidth: 760, margin: '0 auto', padding: '28px 20px 32px' }}>
          {success && <div style={{ backgroundColor: C.verifiedBg, border: `1px solid ${C.accent}50`, color: C.accent, padding: '10px 14px', borderRadius: 8, marginBottom: 20, fontSize: 14 }}>{success}</div>}

          {/* MY PROFILE label */}
          <div style={{ fontSize: 11, fontWeight: 800, color: C.textMuted, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 20 }}>My Profile</div>

          {/* Avatar + name centered */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
            <button onClick={() => setEditing(true)} title="Change profile picture" style={{ position: 'relative', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: 16 }}>
              <div style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: C.surfaceHigh, border: `4px solid ${C.borderGold}`, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36 }}>
                {profile.profilePhotoUrl
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={profile.profilePhotoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : '🎣'}
              </div>
              <div style={{ position: 'absolute', bottom: 2, right: 2, width: 24, height: 24, borderRadius: 12, backgroundColor: C.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}>✏️</div>
            </button>
            <div style={{ textAlign: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                <h2 style={{ color: C.text, margin: 0, fontSize: 28, fontWeight: 900, textTransform: 'uppercase', letterSpacing: -0.5 }}>{profile.user.displayName}</h2>
                {profile.verifiedAngler && <span style={{ fontSize: 11, fontWeight: 700, color: C.verified, backgroundColor: C.verifiedBg, padding: '2px 8px', borderRadius: 10, border: `1px solid ${C.verified}50` }}>✓ VERIFIED</span>}
              </div>
              <div style={{ color: C.textMuted, fontSize: 13, marginTop: 4 }}>@{profile.username}</div>
              {profile.bio && <p style={{ color: C.textSub, fontSize: 14, marginTop: 8, marginBottom: 0 }}>{profile.bio}</p>}
              <div style={{ display: 'flex', gap: 14, marginTop: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
                <span style={{ color: C.textMuted, fontSize: 13 }}><strong style={{ color: C.textSub }}>{profile.followersCount}</strong> followers</span>
                <span style={{ color: C.textMuted, fontSize: 13 }}><strong style={{ color: C.textSub }}>{profile.followingCount}</strong> following</span>
                {(profile.homeCity || profile.homeState) && <span style={{ color: C.textMuted, fontSize: 13 }}>📍 {[profile.homeCity, profile.homeState].filter(Boolean).join(', ')}</span>}
                <span style={{ color: C.textMuted, fontSize: 13 }}>Member since {new Date(profile.user.createdAt).getFullYear()}</span>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 20 }}>
            <button onClick={() => setEditing(true)} style={ghostBtn}>Edit Profile</button>
          </div>
        </div>
      </div>

      {/* Cream content area */}
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '28px 20px' }}>
        <div style={{ maxWidth: 700, margin: '0 auto' }}>

          {/* Stats — 2×2 grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 20 }}>
            <StatCard label="Total Catches" value={stats.totalCatches} />
            <StatCard label="PB / Best Catch" value={stats.largestCatchCm ? `${(stats.largestCatchCm / 2.54).toFixed(2)} IN` : null} />
            <StatCard label="League Rank" value={stats.tournamentsWon > 0 ? `#${stats.tournamentsWon}` : null} />
            <StatCard label="Props" value={Math.round(profile.sportsmanshipScore * 10)} />
          </div>

          {/* Badges */}
          {profile.badges.length > 0 && (
            <div style={{ backgroundColor: '#FFFFFF', borderRadius: 14, padding: 20, border: '1px solid #C8BEA0', marginBottom: 14 }}>
              <h4 style={{ color: '#5A7A5A', fontSize: 11, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase', margin: '0 0 12px' }}>Earned Achievements</h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {profile.badges.map(b => (
                  <span key={b} style={{ padding: '5px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600, backgroundColor: C.accent + '20', color: '#7A4A00', border: `1px solid ${C.accent}60` }}>🏆 {b}</span>
                ))}
              </div>
            </div>
          )}

          {/* Fishing preferences */}
          {(profile.primarySpecies.length > 0 || profile.favoriteTechniques.length > 0 || profile.favoriteBaits.length > 0 || profile.preferredWaterType) && (
            <div style={{ backgroundColor: '#FFFFFF', borderRadius: 14, padding: 20, border: '1px solid #C8BEA0', marginBottom: 14 }}>
              <h4 style={{ color: '#5A7A5A', fontSize: 11, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase', margin: '0 0 14px' }}>Fishing Preferences</h4>
              <TagList label="Species" tags={profile.primarySpecies} />
              <TagList label="Techniques" tags={profile.favoriteTechniques} />
              <TagList label="Baits" tags={profile.favoriteBaits} />
              {profile.preferredWaterType && (
                <div><span style={{ color: '#5A7A5A', fontSize: 12 }}>Water: </span><span style={{ color: '#2E4A2E', fontSize: 14 }}>{WATER_LABELS[profile.preferredWaterType]}</span></div>
              )}
            </div>
          )}

          {/* Gear */}
          {(profile.favoriteRod || profile.favoriteReel || profile.favoriteLine || profile.favoriteBoat || profile.sponsorTags.length > 0) && (
            <div style={{ backgroundColor: '#FFFFFF', borderRadius: 14, padding: 20, border: '1px solid #C8BEA0' }}>
              <h4 style={{ color: '#5A7A5A', fontSize: 11, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase', margin: '0 0 14px' }}>Gear</h4>
              {([['Rod', profile.favoriteRod], ['Reel', profile.favoriteReel], ['Line', profile.favoriteLine], ['Boat', profile.favoriteBoat]] as [string, string | null][]).map(([label, val]) =>
                val ? <div key={label} style={{ marginBottom: 6 }}><span style={{ color: '#5A7A5A', fontSize: 12 }}>{label}: </span><span style={{ color: '#2E4A2E', fontSize: 14 }}>{val}</span></div> : null
              )}
              <TagList label="Sponsors" tags={profile.sponsorTags} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ backgroundColor: C.surface, borderRadius: 14, padding: 20, border: `1px solid ${C.border}`, marginBottom: 16 }}>
      <h4 style={{ color: C.textMuted, fontSize: 11, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase', margin: '0 0 14px' }}>{title}</h4>
      {children}
    </div>
  );
}

function ErrBox({ msg }: { msg: string }) {
  return <div style={{ color: C.error, background: C.errorBg, border: `1px solid ${C.error}`, padding: '10px 14px', borderRadius: 8, marginBottom: 14, fontSize: 14 }}>{msg}</div>;
}

const labelStyle: React.CSSProperties = { display: 'block', color: C.textMuted, fontSize: 11, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 4 };
const ghostBtn: React.CSSProperties = { backgroundColor: 'transparent', color: C.textSub, fontWeight: 600, padding: '8px 16px', borderRadius: 8, border: `1px solid ${C.border}`, cursor: 'pointer', fontSize: 13 };
