import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Switch, Alert, Image,
} from 'react-native';
import { colors } from '../../theme/colors';
import { getMyProfile, updateProfile } from '../../services/api';
import type { AnglerProfile, UpdateProfilePayload, WaterType } from '../../models';

const WATER_OPTIONS: { label: string; value: WaterType }[] = [
  { label: 'Freshwater', value: 'FRESHWATER' },
  { label: 'Saltwater', value: 'SALTWATER' },
  { label: 'Both', value: 'BOTH' },
];

// ── My Profile Screen ─────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const [profile, setProfile] = useState<AnglerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);

  const load = useCallback(async () => {
    try {
      const p = await getMyProfile();
      setProfile(p);
      if (!p) setEditing(true);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator color={colors.green} size="large" />
      </View>
    );
  }

  if (editing) {
    return (
      <EditProfileForm
        existing={profile}
        onSaved={p => { setProfile(p); setEditing(false); }}
        onCancel={profile ? () => setEditing(false) : undefined}
      />
    );
  }

  if (!profile) {
    return (
      <View style={s.center}>
        <Text style={s.emptyIcon}>🎣</Text>
        <Text style={s.emptyTitle}>Set Up Your Angler Profile</Text>
        <Text style={s.emptySubtitle}>Tell the FishLeague community who you are.</Text>
        <TouchableOpacity style={s.greenBtn} onPress={() => setEditing(true)}>
          <Text style={s.greenBtnText}>Create Profile</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return <ProfileView profile={profile} isOwn onEdit={() => setEditing(true)} />;
}

// ── Shared Profile View ───────────────────────────────────────────────────────

export function ProfileView({
  profile,
  isOwn,
  onEdit,
  onFollowToggle,
  followLoading,
}: {
  profile: AnglerProfile;
  isOwn: boolean;
  onEdit?: () => void;
  onFollowToggle?: () => void;
  followLoading?: boolean;
}) {
  const { stats } = profile;

  return (
    <ScrollView style={s.screen} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Header */}
      <View style={s.header}>
        <View style={s.avatarWrap}>
          {profile.profilePhotoUrl
            ? <Image source={{ uri: profile.profilePhotoUrl }} style={s.avatar} />
            : <Text style={s.avatarEmoji}>🎣</Text>
          }
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
            <Text style={s.displayName}>{profile.user.displayName}</Text>
            {profile.verifiedAngler && (
              <View style={s.verifiedBadge}><Text style={s.verifiedText}>✓ VERIFIED</Text></View>
            )}
          </View>
          <Text style={s.username}>@{profile.username}</Text>
          {profile.bio ? <Text style={s.bio} numberOfLines={3}>{profile.bio}</Text> : null}
          <View style={s.metaRow}>
            <Text style={s.metaText}><Text style={s.metaVal}>{profile.followersCount}</Text> followers</Text>
            <Text style={s.metaText}><Text style={s.metaVal}>{profile.followingCount}</Text> following</Text>
            {(profile.homeCity || profile.homeState) && (
              <Text style={s.metaText}>📍 {[profile.homeCity, profile.homeState].filter(Boolean).join(', ')}</Text>
            )}
          </View>
        </View>
      </View>

      {/* Edit / Follow button */}
      {isOwn && onEdit && (
        <TouchableOpacity style={s.ghostBtn} onPress={onEdit}>
          <Text style={s.ghostBtnText}>Edit Profile</Text>
        </TouchableOpacity>
      )}
      {!isOwn && onFollowToggle && profile.allowFollowers && (
        <TouchableOpacity
          style={[s.greenBtn, profile.isFollowing && s.ghostBtn, { marginHorizontal: 16 }]}
          onPress={onFollowToggle}
          disabled={followLoading}
        >
          {followLoading
            ? <ActivityIndicator color={profile.isFollowing ? colors.green : colors.bg} size="small" />
            : <Text style={[s.greenBtnText, profile.isFollowing && { color: colors.textSecondary }]}>
                {profile.isFollowing ? 'Following' : '+ Follow'}
              </Text>
          }
        </TouchableOpacity>
      )}

      {/* Stats */}
      <View style={s.statsGrid}>
        <StatCard label="Catches" value={String(stats.totalCatches)} />
        <StatCard label="Tournaments" value={String(stats.totalTournamentsEntered)} />
        <StatCard label="Wins" value={String(stats.tournamentsWon)} />
        <StatCard label="Best Catch" value={stats.largestCatchCm ? `${stats.largestCatchCm} cm` : '—'} />
        <StatCard label="Avg Catch" value={stats.averageCatchCm ? `${stats.averageCatchCm} cm` : '—'} />
        <StatCard label="Sportsmanship" value={`${profile.sportsmanshipScore.toFixed(1)} ★`} />
      </View>

      {/* Badges */}
      {profile.badges.length > 0 && (
        <Section title="Badges">
          <View style={s.tagRow}>
            {profile.badges.map(b => (
              <View key={b} style={s.badgeChip}>
                <Text style={s.badgeText}>🏆 {b}</Text>
              </View>
            ))}
          </View>
        </Section>
      )}

      {/* Fishing preferences */}
      {(profile.primarySpecies.length > 0 || profile.favoriteTechniques.length > 0 || profile.favoriteBaits.length > 0) && (
        <Section title="Fishing Preferences">
          {profile.primarySpecies.length > 0 && <TagRow label="Species" tags={profile.primarySpecies} />}
          {profile.favoriteTechniques.length > 0 && <TagRow label="Techniques" tags={profile.favoriteTechniques} />}
          {profile.favoriteBaits.length > 0 && <TagRow label="Baits" tags={profile.favoriteBaits} />}
          {profile.preferredWaterType && (
            <Text style={s.infoLine}>
              <Text style={s.infoLabel}>Water: </Text>
              {WATER_OPTIONS.find(w => w.value === profile.preferredWaterType)?.label}
            </Text>
          )}
        </Section>
      )}

      {/* Gear */}
      {(profile.favoriteRod || profile.favoriteReel || profile.favoriteLine || profile.favoriteBoat || profile.sponsorTags.length > 0) && (
        <Section title="Gear">
          {(['Rod', 'Reel', 'Line', 'Boat'] as const).map(label => {
            const key = `favorite${label}` as keyof AnglerProfile;
            const val = profile[key] as string | null;
            return val ? (
              <Text key={label} style={s.infoLine}>
                <Text style={s.infoLabel}>{label}: </Text>{val}
              </Text>
            ) : null;
          })}
          {profile.sponsorTags.length > 0 && <TagRow label="Sponsors" tags={profile.sponsorTags} />}
        </Section>
      )}
    </ScrollView>
  );
}

// ── Edit Profile Form ─────────────────────────────────────────────────────────

function EditProfileForm({
  existing,
  onSaved,
  onCancel,
}: {
  existing: AnglerProfile | null;
  onSaved: (p: AnglerProfile) => void;
  onCancel?: () => void;
}) {
  const [form, setForm] = useState<UpdateProfilePayload>({
    username: existing?.username ?? '',
    bio: existing?.bio ?? '',
    profilePhotoUrl: existing?.profilePhotoUrl ?? '',
    homeState: existing?.homeState ?? '',
    homeCity: existing?.homeCity ?? '',
    country: existing?.country ?? '',
    primarySpecies: existing?.primarySpecies ?? [],
    favoriteTechniques: existing?.favoriteTechniques ?? [],
    favoriteBaits: existing?.favoriteBaits ?? [],
    preferredWaterType: existing?.preferredWaterType ?? undefined,
    favoriteRod: existing?.favoriteRod ?? '',
    favoriteReel: existing?.favoriteReel ?? '',
    favoriteLine: existing?.favoriteLine ?? '',
    favoriteBoat: existing?.favoriteBoat ?? '',
    sponsorTags: existing?.sponsorTags ?? [],
    allowFollowers: existing?.allowFollowers ?? true,
    publicProfile: existing?.publicProfile ?? true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function setArr(field: keyof UpdateProfilePayload, raw: string) {
    setForm(f => ({ ...f, [field]: raw.split(',').map(s => s.trim()).filter(Boolean) }));
  }

  async function save() {
    setSaving(true); setError('');
    try {
      const updated = await updateProfile(form);
      onSaved(updated);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView style={s.screen} contentContainerStyle={{ paddingBottom: 60 }}>
      <View style={s.formHeader}>
        <Text style={s.formTitle}>{existing ? 'Edit Profile' : 'Create Profile'}</Text>
        {onCancel && (
          <TouchableOpacity onPress={onCancel}>
            <Text style={{ color: colors.textSecondary, fontSize: 15 }}>Cancel</Text>
          </TouchableOpacity>
        )}
      </View>

      {error ? <Text style={s.errorText}>{error}</Text> : null}

      <FormSection title="Identity">
        <FLInput label="Username (3–20 chars)" value={form.username ?? ''} onChangeText={v => setForm(f => ({ ...f, username: v }))} placeholder="bass_master_99" />
        <FLInput label="Bio (max 250 chars)" value={form.bio ?? ''} onChangeText={v => setForm(f => ({ ...f, bio: v }))} placeholder="Tell the community about yourself..." multiline />
        <FLInput label="Profile Photo URL" value={form.profilePhotoUrl ?? ''} onChangeText={v => setForm(f => ({ ...f, profilePhotoUrl: v }))} placeholder="https://..." />
      </FormSection>

      <FormSection title="Location">
        <FLInput label="State / Province" value={form.homeState ?? ''} onChangeText={v => setForm(f => ({ ...f, homeState: v }))} placeholder="Texas" />
        <FLInput label="City" value={form.homeCity ?? ''} onChangeText={v => setForm(f => ({ ...f, homeCity: v }))} placeholder="Austin" />
        <FLInput label="Country" value={form.country ?? ''} onChangeText={v => setForm(f => ({ ...f, country: v }))} placeholder="USA" />
      </FormSection>

      <FormSection title="Fishing Preferences">
        <FLInput label="Species (comma-separated)" value={(form.primarySpecies ?? []).join(', ')} onChangeText={v => setArr('primarySpecies', v)} placeholder="Bass, Trout, Redfish" />
        <FLInput label="Techniques (comma-separated)" value={(form.favoriteTechniques ?? []).join(', ')} onChangeText={v => setArr('favoriteTechniques', v)} placeholder="Fly, Spinning, Baitcasting" />
        <FLInput label="Baits (comma-separated)" value={(form.favoriteBaits ?? []).join(', ')} onChangeText={v => setArr('favoriteBaits', v)} placeholder="Crankbait, Jig, Live Shrimp" />
        <Text style={s.fieldLabel}>Water Type</Text>
        <View style={s.waterPicker}>
          {WATER_OPTIONS.map(opt => (
            <TouchableOpacity
              key={opt.value}
              style={[s.waterOption, form.preferredWaterType === opt.value && s.waterOptionActive]}
              onPress={() => setForm(f => ({ ...f, preferredWaterType: opt.value }))}
            >
              <Text style={[s.waterOptionText, form.preferredWaterType === opt.value && { color: colors.green }]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </FormSection>

      <FormSection title="Gear">
        <FLInput label="Favorite Rod" value={form.favoriteRod ?? ''} onChangeText={v => setForm(f => ({ ...f, favoriteRod: v }))} placeholder="Daiwa Tatula" />
        <FLInput label="Favorite Reel" value={form.favoriteReel ?? ''} onChangeText={v => setForm(f => ({ ...f, favoriteReel: v }))} placeholder="Shimano Stradic" />
        <FLInput label="Favorite Line" value={form.favoriteLine ?? ''} onChangeText={v => setForm(f => ({ ...f, favoriteLine: v }))} placeholder="20lb Fluorocarbon" />
        <FLInput label="Favorite Boat" value={form.favoriteBoat ?? ''} onChangeText={v => setForm(f => ({ ...f, favoriteBoat: v }))} placeholder="Ranger Z520C" />
        <FLInput label="Sponsor Tags (comma-separated)" value={(form.sponsorTags ?? []).join(', ')} onChangeText={v => setArr('sponsorTags', v)} placeholder="Shimano, Rapala" />
      </FormSection>

      <FormSection title="Privacy">
        <View style={s.toggleRow}>
          <Text style={s.toggleLabel}>Public Profile</Text>
          <Switch value={form.publicProfile ?? true} onValueChange={v => setForm(f => ({ ...f, publicProfile: v }))} trackColor={{ true: colors.green }} />
        </View>
        <View style={s.toggleRow}>
          <Text style={s.toggleLabel}>Allow Followers</Text>
          <Switch value={form.allowFollowers ?? true} onValueChange={v => setForm(f => ({ ...f, allowFollowers: v }))} trackColor={{ true: colors.green }} />
        </View>
      </FormSection>

      <TouchableOpacity style={[s.greenBtn, { marginHorizontal: 16 }]} onPress={save} disabled={saving}>
        {saving
          ? <ActivityIndicator color={colors.bg} />
          : <Text style={s.greenBtnText}>Save Profile</Text>
        }
      </TouchableOpacity>
    </ScrollView>
  );
}

// ── Reusable components ───────────────────────────────────────────────────────

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.statCard}>
      <Text style={s.statValue}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>{title.toUpperCase()}</Text>
      {children}
    </View>
  );
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={s.formSection}>
      <Text style={s.sectionTitle}>{title.toUpperCase()}</Text>
      {children}
    </View>
  );
}

function TagRow({ label, tags }: { label: string; tags: string[] }) {
  return (
    <View style={{ marginBottom: 10 }}>
      <Text style={s.infoLabel}>{label}</Text>
      <View style={s.tagRow}>
        {tags.map(t => (
          <View key={t} style={s.tagChip}><Text style={s.tagText}>{t}</Text></View>
        ))}
      </View>
    </View>
  );
}

function FLInput({ label, value, onChangeText, placeholder, multiline }: {
  label: string; value: string; onChangeText: (v: string) => void;
  placeholder?: string; multiline?: boolean;
}) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={s.fieldLabel}>{label}</Text>
      <TextInput
        style={[s.input, multiline && { height: 80, textAlignVertical: 'top' }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        multiline={multiline}
        autoCorrect={false}
      />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: 32 },
  header: { flexDirection: 'row', gap: 14, padding: 16, alignItems: 'flex-start' },
  avatarWrap: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.surfaceHigh, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatar: { width: 72, height: 72 },
  avatarEmoji: { fontSize: 30 },
  displayName: { fontSize: 20, fontWeight: '800', color: colors.textPrimary },
  username: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  bio: { fontSize: 13, color: colors.textSecondary, marginTop: 6, lineHeight: 18 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 8 },
  metaText: { fontSize: 12, color: colors.textMuted },
  metaVal: { fontWeight: '700', color: colors.textSecondary },
  verifiedBadge: { backgroundColor: '#1d3a5e', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  verifiedText: { color: '#3498db', fontSize: 10, fontWeight: '800' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 12, gap: 8 },
  statCard: { width: '31%', backgroundColor: colors.surfaceHigh, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: '800', color: colors.green },
  statLabel: { fontSize: 10, color: colors.textMuted, textTransform: 'uppercase', marginTop: 3, textAlign: 'center' },
  section: { marginHorizontal: 16, marginBottom: 14, backgroundColor: colors.surface, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: colors.border },
  formSection: { marginHorizontal: 16, marginBottom: 14, backgroundColor: colors.surface, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: colors.border },
  sectionTitle: { fontSize: 10, fontWeight: '800', color: colors.textMuted, letterSpacing: 0.8, marginBottom: 10 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tagChip: { backgroundColor: colors.surfaceHigh, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3, borderWidth: 1, borderColor: colors.border },
  tagText: { color: colors.textSecondary, fontSize: 12 },
  badgeChip: { backgroundColor: '#2a1f00', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1, borderColor: '#f0b42940' },
  badgeText: { color: colors.gold, fontSize: 12, fontWeight: '600' },
  infoLine: { fontSize: 13, color: colors.textSecondary, marginBottom: 6 },
  infoLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '600', marginBottom: 4 },
  greenBtn: { backgroundColor: colors.green, borderRadius: 10, padding: 14, alignItems: 'center', marginVertical: 8 },
  greenBtnText: { color: colors.bg, fontWeight: '800', fontSize: 15 },
  ghostBtn: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 10, alignItems: 'center', marginHorizontal: 16, marginBottom: 8 },
  ghostBtnText: { color: colors.textSecondary, fontWeight: '600', fontSize: 14 },
  emptyIcon: { fontSize: 60, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: colors.textPrimary, textAlign: 'center', marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  formHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  formTitle: { fontSize: 20, fontWeight: '800', color: colors.textPrimary },
  fieldLabel: { fontSize: 11, fontWeight: '600', color: colors.textMuted, marginBottom: 4 },
  input: { backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 10, color: colors.textPrimary, fontSize: 14 },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  toggleLabel: { color: colors.textSecondary, fontSize: 14 },
  waterPicker: { flexDirection: 'row', gap: 8, marginTop: 4 },
  waterOption: { flex: 1, padding: 8, borderRadius: 8, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  waterOptionActive: { borderColor: colors.green, backgroundColor: colors.greenMuted },
  waterOptionText: { color: colors.textMuted, fontSize: 13 },
  errorText: { color: colors.red, backgroundColor: '#2a0f0f', padding: 12, marginHorizontal: 16, borderRadius: 8, marginBottom: 8, fontSize: 13 },
});
