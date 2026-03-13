import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Switch, Alert, Image, Modal, FlatList,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { colors } from '../../theme/colors';
import { getMyProfile, updateProfile, uploadAvatar } from '../../services/api';
import type { AnglerProfile, UpdateProfilePayload, WaterType } from '../../models';

const WATER_OPTIONS: { label: string; value: WaterType }[] = [
  { label: 'Freshwater', value: 'FRESHWATER' },
  { label: 'Saltwater', value: 'SALTWATER' },
  { label: 'Both', value: 'BOTH' },
];

// ── Species list (sourced from Take Me Fishing / FishBase / Bass Pro Shops) ───

const SPECIES_GROUPED: { label: string; items: string[] }[] = [
  {
    label: 'Freshwater',
    items: [
      'Alligator Gar', 'Atlantic Salmon', 'Bigmouth Buffalo', 'Black Crappie', 'Bluegill', 'Bowfin',
      'Brook Trout', 'Brown Trout', 'Blue Catfish', 'Bullhead Catfish', 'Channel Catfish',
      'Chinook Salmon', 'Coho Salmon', 'Common Carp', 'Flathead Catfish', 'Freshwater Drum',
      'Green Sunfish', 'Lake Trout', 'Largemouth Bass', 'Longnose Gar', 'Muskellunge (Muskie)',
      'Northern Pike', 'Paddlefish', 'Pumpkinseed', 'Rainbow Trout', 'Redear Sunfish',
      'Rock Bass', 'Sauger', 'Smallmouth Bass', 'Sockeye Salmon', 'Spotted Bass', 'Steelhead',
      'Striped Bass', 'Tiger Muskie', 'Walleye', 'Warmouth', 'White Bass',
      'White Crappie', 'White Perch', 'Yellow Perch',
    ],
  },
  {
    label: 'Saltwater',
    items: [
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
    ],
  },
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
  onAvatarUpdated,
}: {
  profile: AnglerProfile;
  isOwn: boolean;
  onEdit?: () => void;
  onFollowToggle?: () => void;
  followLoading?: boolean;
  onAvatarUpdated?: (url: string) => void;
}) {
  const { stats } = profile;
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile.profilePhotoUrl);

  async function handleAvatarPress() {
    if (!isOwn) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Allow photo library access to upload a profile picture.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
      // Guidelines: JPG/PNG/WebP · max 5 MB · min 400×400 px · square (1:1)
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    const mimeType = asset.mimeType ?? 'image/jpeg';
    setAvatarLoading(true);
    try {
      const { avatarUrl: url } = await uploadAvatar(asset.uri, mimeType);
      setAvatarUrl(url);
      onAvatarUpdated?.(url);
    } catch (e: any) {
      Alert.alert('Upload failed', e.message);
    } finally {
      setAvatarLoading(false);
    }
  }

  return (
    <ScrollView style={s.screen} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={handleAvatarPress} disabled={!isOwn} style={{ position: 'relative' }}>
          <View style={s.avatarWrap}>
            {avatarUrl
              ? <Image source={{ uri: avatarUrl }} style={s.avatar} />
              : <Text style={s.avatarEmoji}>🎣</Text>
            }
            {avatarLoading && (
              <View style={s.avatarOverlay}>
                <ActivityIndicator color={colors.green} size="small" />
              </View>
            )}
          </View>
          {isOwn && !avatarLoading && (
            <View style={s.avatarEditBadge}>
              <Text style={{ fontSize: 10, color: colors.bg }}>✏️</Text>
            </View>
          )}
        </TouchableOpacity>
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
            {(profile.homeCity || profile.homeState || profile.zipCode) && (
              <Text style={s.metaText}>📍 {[profile.homeCity, profile.homeState, profile.zipCode].filter(Boolean).join(', ')}</Text>
            )}
            {profile.birthday && (() => {
              const bd = new Date(profile.birthday);
              const age = Math.floor((Date.now() - bd.getTime()) / (365.25 * 24 * 3600 * 1000));
              return <Text style={s.metaText}>🎂 {bd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} · Age {age}</Text>;
            })()}
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

// ── Birthday Picker ───────────────────────────────────────────────────────────

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: currentYear - 1919 }, (_, i) => currentYear - 13 - i);

function BirthdayPicker({ value, onChange }: { value?: string; onChange: (iso: string | undefined) => void }) {
  const [open, setOpen] = useState(false);
  const parsed = value ? new Date(value) : null;
  const [selMonth, setSelMonth] = useState(parsed ? parsed.getMonth() : 0);
  const [selDay, setSelDay]     = useState(parsed ? parsed.getDate() : 1);
  const [selYear, setSelYear]   = useState(parsed ? parsed.getFullYear() : currentYear - 25);
  const [tab, setTab]           = useState<'month' | 'day' | 'year'>('month');

  const daysInMonth = new Date(selYear, selMonth + 1, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  function confirm() {
    const safeDay = Math.min(selDay, daysInMonth);
    const d = new Date(selYear, selMonth, safeDay);
    onChange(d.toISOString());
    setOpen(false);
  }

  function clear() { onChange(undefined); setOpen(false); }

  const display = parsed
    ? parsed.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : 'Select birthday';

  return (
    <View style={{ marginBottom: 12 }}>
      <TouchableOpacity
        style={[bp.trigger, !!value && { borderColor: colors.green + '60' }]}
        onPress={() => setOpen(true)}
      >
        <Text style={[bp.triggerText, !value && { color: colors.textMuted }]}>🎂  {display}</Text>
        <Text style={bp.arrow}>›</Text>
      </TouchableOpacity>

      <Modal visible={open} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setOpen(false)}>
        <View style={bp.modal}>
          <View style={bp.header}>
            <TouchableOpacity onPress={clear}><Text style={bp.clearBtn}>Clear</Text></TouchableOpacity>
            <Text style={bp.title}>Birthday</Text>
            <TouchableOpacity onPress={confirm}><Text style={bp.doneBtn}>Done</Text></TouchableOpacity>
          </View>

          {/* Preview */}
          <View style={bp.preview}>
            <Text style={bp.previewText}>
              {MONTHS[selMonth]} {Math.min(selDay, daysInMonth)}, {selYear}
            </Text>
          </View>

          {/* Tabs */}
          <View style={bp.tabs}>
            {(['month', 'day', 'year'] as const).map(t => (
              <TouchableOpacity key={t} style={[bp.tab, tab === t && bp.tabActive]} onPress={() => setTab(t)}>
                <Text style={[bp.tabText, tab === t && { color: colors.green }]}>
                  {t === 'month' ? MONTHS[selMonth] : t === 'day' ? String(Math.min(selDay, daysInMonth)) : String(selYear)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* List */}
          {tab === 'month' && (
            <FlatList
              data={MONTHS}
              keyExtractor={m => m}
              renderItem={({ item, index }) => (
                <TouchableOpacity style={[bp.listRow, index === selMonth && bp.listRowActive]} onPress={() => { setSelMonth(index); setTab('day'); }}>
                  <Text style={[bp.listText, index === selMonth && { color: colors.green, fontWeight: '700' }]}>{item}</Text>
                  {index === selMonth && <Text style={{ color: colors.green }}>✓</Text>}
                </TouchableOpacity>
              )}
            />
          )}
          {tab === 'day' && (
            <FlatList
              data={days}
              keyExtractor={d => String(d)}
              renderItem={({ item }) => (
                <TouchableOpacity style={[bp.listRow, item === selDay && bp.listRowActive]} onPress={() => { setSelDay(item); setTab('year'); }}>
                  <Text style={[bp.listText, item === selDay && { color: colors.green, fontWeight: '700' }]}>{item}</Text>
                  {item === selDay && <Text style={{ color: colors.green }}>✓</Text>}
                </TouchableOpacity>
              )}
            />
          )}
          {tab === 'year' && (
            <FlatList
              data={YEARS}
              keyExtractor={y => String(y)}
              renderItem={({ item }) => (
                <TouchableOpacity style={[bp.listRow, item === selYear && bp.listRowActive]} onPress={() => { setSelYear(item); confirm(); }}>
                  <Text style={[bp.listText, item === selYear && { color: colors.green, fontWeight: '700' }]}>{item}</Text>
                  {item === selYear && <Text style={{ color: colors.green }}>✓</Text>}
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      </Modal>
    </View>
  );
}

const bp = StyleSheet.create({
  trigger: { backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 10, flexDirection: 'row', alignItems: 'center', minHeight: 42 },
  triggerText: { flex: 1, color: colors.textPrimary, fontSize: 14 },
  arrow: { color: colors.textMuted, fontSize: 18 },
  modal: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  title: { fontSize: 17, fontWeight: '700', color: colors.textPrimary },
  clearBtn: { color: colors.red, fontSize: 15, fontWeight: '600' },
  doneBtn: { color: colors.green, fontSize: 15, fontWeight: '700' },
  preview: { padding: 16, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.border },
  previewText: { fontSize: 20, fontWeight: '700', color: colors.textPrimary },
  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.border },
  tab: { flex: 1, padding: 12, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: colors.green },
  tabText: { fontSize: 14, fontWeight: '600', color: colors.textMuted },
  listRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border + '50' },
  listRowActive: { backgroundColor: colors.greenMuted },
  listText: { fontSize: 16, color: colors.textPrimary },
});

// ── Species Picker Modal ──────────────────────────────────────────────────────

function SpeciesPicker({ selected, onChange }: { selected: string[]; onChange: (v: string[]) => void }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  function toggle(species: string) {
    onChange(selected.includes(species) ? selected.filter(x => x !== species) : [...selected, species]);
  }

  const q = search.toLowerCase();
  const filtered = SPECIES_GROUPED
    .map(g => ({ ...g, items: g.items.filter(s => s.toLowerCase().includes(q)) }))
    .filter(g => g.items.length > 0);

  const flatData: ({ type: 'header'; label: string } | { type: 'item'; species: string })[] = [];
  filtered.forEach(g => {
    flatData.push({ type: 'header', label: g.label });
    g.items.forEach(s => flatData.push({ type: 'item', species: s }));
  });

  return (
    <View style={{ marginBottom: 12 }}>
      <TouchableOpacity
        onPress={() => setOpen(true)}
        style={[sp.trigger, selected.length > 0 && { borderColor: colors.green + '60' }]}
      >
        {selected.length === 0
          ? <Text style={sp.placeholder}>Select species…</Text>
          : (
            <View style={sp.chipWrap}>
              {selected.map(s => (
                <View key={s} style={sp.chip}>
                  <Text style={sp.chipText}>{s}</Text>
                  <TouchableOpacity onPress={() => toggle(s)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                    <Text style={sp.chipX}>×</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )
        }
        <Text style={sp.arrow}>›</Text>
      </TouchableOpacity>

      <Modal visible={open} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setOpen(false)}>
        <View style={sp.modal}>
          <View style={sp.modalHeader}>
            <Text style={sp.modalTitle}>Select Species</Text>
            <TouchableOpacity onPress={() => { setOpen(false); setSearch(''); }}>
              <Text style={sp.modalDone}>Done {selected.length > 0 ? `(${selected.length})` : ''}</Text>
            </TouchableOpacity>
          </View>
          <View style={sp.searchWrap}>
            <TextInput
              style={sp.searchInput}
              value={search}
              onChangeText={setSearch}
              placeholder="Search species…"
              placeholderTextColor={colors.textMuted}
              autoCorrect={false}
              clearButtonMode="while-editing"
            />
          </View>
          <FlatList
            data={flatData}
            keyExtractor={(item, i) => `${i}`}
            renderItem={({ item }) => {
              if (item.type === 'header') {
                return <Text style={sp.groupHeader}>{item.label.toUpperCase()}</Text>;
              }
              const checked = selected.includes(item.species);
              return (
                <TouchableOpacity style={[sp.speciesRow, checked && sp.speciesRowChecked]} onPress={() => toggle(item.species)}>
                  <View style={[sp.checkbox, checked && sp.checkboxChecked]}>
                    {checked && <Text style={sp.checkmark}>✓</Text>}
                  </View>
                  <Text style={[sp.speciesName, checked && { color: colors.green }]}>{item.species}</Text>
                </TouchableOpacity>
              );
            }}
            keyboardShouldPersistTaps="handled"
          />
          {selected.length > 0 && (
            <TouchableOpacity style={sp.clearAll} onPress={() => onChange([])}>
              <Text style={sp.clearAllText}>Clear all ({selected.length})</Text>
            </TouchableOpacity>
          )}
        </View>
      </Modal>
    </View>
  );
}

const sp = StyleSheet.create({
  trigger: { backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 10, flexDirection: 'row', alignItems: 'center', minHeight: 42 },
  placeholder: { color: colors.textMuted, fontSize: 14, flex: 1 },
  chipWrap: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surfaceHigh, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3, borderWidth: 1, borderColor: colors.border, gap: 4 },
  chipText: { color: colors.textSecondary, fontSize: 12 },
  chipX: { color: colors.textMuted, fontSize: 14, fontWeight: '700', lineHeight: 16 },
  arrow: { color: colors.textMuted, fontSize: 18, marginLeft: 6 },
  modal: { flex: 1, backgroundColor: colors.bg },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  modalTitle: { fontSize: 17, fontWeight: '700', color: colors.textPrimary },
  modalDone: { fontSize: 15, color: colors.green, fontWeight: '700' },
  searchWrap: { padding: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  searchInput: { backgroundColor: colors.surface, borderRadius: 8, padding: 10, color: colors.textPrimary, fontSize: 14, borderWidth: 1, borderColor: colors.border },
  groupHeader: { fontSize: 10, fontWeight: '800', color: colors.textMuted, letterSpacing: 0.8, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4 },
  speciesRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 12, borderBottomWidth: 1, borderBottomColor: colors.border + '50' },
  speciesRowChecked: { backgroundColor: colors.greenMuted },
  checkbox: { width: 20, height: 20, borderRadius: 4, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { backgroundColor: colors.green, borderColor: colors.green },
  checkmark: { color: colors.bg, fontSize: 12, fontWeight: '800' },
  speciesName: { color: colors.textPrimary, fontSize: 15 },
  clearAll: { padding: 14, borderTopWidth: 1, borderTopColor: colors.border, alignItems: 'center' },
  clearAllText: { color: colors.red, fontSize: 14, fontWeight: '600' },
});

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
    birthday: existing?.birthday ?? undefined,
    profilePhotoUrl: existing?.profilePhotoUrl ?? '',
    homeState: existing?.homeState ?? '',
    homeCity: existing?.homeCity ?? '',
    country: existing?.country ?? '',
    zipCode: existing?.zipCode ?? '',
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
        <Text style={s.fieldLabel}>Birthday</Text>
        <BirthdayPicker value={form.birthday} onChange={v => setForm(f => ({ ...f, birthday: v }))} />
        <FLInput label="Profile Photo URL" value={form.profilePhotoUrl ?? ''} onChangeText={v => setForm(f => ({ ...f, profilePhotoUrl: v }))} placeholder="https://..." />
      </FormSection>

      <FormSection title="Location">
        <FLInput label="State / Province" value={form.homeState ?? ''} onChangeText={v => setForm(f => ({ ...f, homeState: v }))} placeholder="Texas" />
        <FLInput label="City" value={form.homeCity ?? ''} onChangeText={v => setForm(f => ({ ...f, homeCity: v }))} placeholder="Austin" />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ flex: 1 }}>
            <FLInput label="Country" value={form.country ?? ''} onChangeText={v => setForm(f => ({ ...f, country: v }))} placeholder="USA" />
          </View>
          <View style={{ flex: 1 }}>
            <FLInput label="Zip / Postal Code" value={form.zipCode ?? ''} onChangeText={v => setForm(f => ({ ...f, zipCode: v }))} placeholder="78701" />
          </View>
        </View>
      </FormSection>

      <FormSection title="Fishing Preferences">
        <Text style={s.fieldLabel}>Primary Species</Text>
        <SpeciesPicker selected={form.primarySpecies ?? []} onChange={v => setForm(f => ({ ...f, primarySpecies: v }))} />
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
  avatarOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 36, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' },
  avatarEditBadge: { position: 'absolute', bottom: 0, right: 0, width: 20, height: 20, borderRadius: 10, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center' },
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
