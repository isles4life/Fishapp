import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Switch, Alert, Image, Modal, FlatList, SafeAreaView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { getMyProfile, updateProfile, uploadAvatar } from '../../services/api';
import type { AnglerProfile, UpdateProfilePayload, WaterType } from '../../models';
import { GenericBadge, TournamentWinBadge, VerifiedAnglerBadge } from '../../components/icons/BadgeIcons';

const WATER_OPTIONS: { label: string; value: WaterType }[] = [
  { label: 'Freshwater', value: 'FRESHWATER' },
  { label: 'Saltwater', value: 'SALTWATER' },
  { label: 'Both', value: 'BOTH' },
];

// ── Species list ───────────────────────────────────────────────────────────────

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

// ── Profile Screen ─────────────────────────────────────────────────────────────

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
      <SafeAreaView style={s.safeArea}>
        <View style={s.center}>
          <ActivityIndicator color={colors.accent} size="large" />
        </View>
      </SafeAreaView>
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
      <SafeAreaView style={s.safeArea}>
        <View style={s.center}>
          <Text style={s.emptyIcon}>🎣</Text>
          <Text style={s.emptyTitle}>SET UP YOUR PROFILE</Text>
          <Text style={s.emptySubtitle}>Tell the FishLeague community who you are.</Text>
          <TouchableOpacity style={s.goldBtn} onPress={() => setEditing(true)}>
            <Text style={s.goldBtnText}>CREATE PROFILE</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return <ProfileView profile={profile} isOwn onEdit={() => setEditing(true)} />;
}

// ── Shared Profile View ────────────────────────────────────────────────────────

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
    <SafeAreaView style={s.safeArea}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 48 }}>
        {/* Header bar */}
        <View style={s.headerBar}>
          <Text style={s.headerTitle}>MY PROFILE</Text>
          {isOwn && onEdit && (
            <TouchableOpacity style={s.editBtn} onPress={onEdit} activeOpacity={0.8}>
              <Text style={s.editBtnText}>EDIT</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Avatar + name section */}
        <View style={s.profileHero}>
          <TouchableOpacity onPress={handleAvatarPress} disabled={!isOwn} activeOpacity={0.8}>
            <View style={s.avatarRing}>
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={s.avatarImg} />
              ) : (
                <View style={s.avatarFallback}>
                  <Text style={s.avatarFallbackEmoji}>🎣</Text>
                </View>
              )}
              {avatarLoading && (
                <View style={s.avatarOverlay}>
                  <ActivityIndicator color={colors.accent} size="small" />
                </View>
              )}
            </View>
            {isOwn && !avatarLoading && (
              <View style={s.avatarEditBadge}>
                <Text style={{ fontSize: 9, color: colors.bg }}>✏️</Text>
              </View>
            )}
          </TouchableOpacity>

          <View style={{ alignItems: 'center', marginTop: 12 }}>
            <View style={s.nameRow}>
              <Text style={s.displayName}>{profile.user.displayName}</Text>
              {profile.verifiedAngler && (
                <View style={s.verifiedChip}>
                  <Text style={s.verifiedChipText}>✓ VERIFIED</Text>
                </View>
              )}
            </View>
            <Text style={s.username}>@{profile.username}</Text>
            {profile.bio ? <Text style={s.bio} numberOfLines={3}>{profile.bio}</Text> : null}
            <View style={s.metaRow}>
              <Text style={s.metaText}>
                <Text style={s.metaVal}>{profile.followersCount}</Text> followers
              </Text>
              <Text style={s.metaDot}>·</Text>
              <Text style={s.metaText}>
                <Text style={s.metaVal}>{profile.followingCount}</Text> following
              </Text>
              {(profile.homeCity || profile.homeState) && (
                <>
                  <Text style={s.metaDot}>·</Text>
                  <Text style={s.metaText}>
                    📍 {[profile.homeCity, profile.homeState].filter(Boolean).join(', ')}
                  </Text>
                </>
              )}
            </View>
          </View>
        </View>

        {/* Follow button for non-owners */}
        {!isOwn && onFollowToggle && profile.allowFollowers && (
          <TouchableOpacity
            style={[s.goldBtn, profile.isFollowing && s.ghostBtn, { marginHorizontal: 16, marginBottom: 16 }]}
            onPress={onFollowToggle}
            disabled={followLoading}
            activeOpacity={0.85}
          >
            {followLoading ? (
              <ActivityIndicator color={profile.isFollowing ? colors.accent : colors.bg} size="small" />
            ) : (
              <Text style={[s.goldBtnText, profile.isFollowing && { color: colors.textSub }]}>
                {profile.isFollowing ? 'Following' : '+ Follow'}
              </Text>
            )}
          </TouchableOpacity>
        )}

        {/* Stats grid */}
        <View style={s.statsGrid}>
          <StatCard label="TOTAL CATCHES" value={String(stats.totalCatches)} />
          <StatCard label="PB" value={stats.largestCatchCm ? `${stats.largestCatchCm}` : '—'} unit="CM" />
          <StatCard label="LEAGUE RANK" value={stats.tournamentsWon > 0 ? `#${stats.tournamentsWon}` : '—'} />
          <StatCard label="PROPS" value={String(Math.round(profile.sportsmanshipScore * 10))} />
        </View>

        {/* Achievements */}
        {profile.badges.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>EARNED ACHIEVEMENTS</Text>
            <View style={s.badgeGrid}>
              {profile.badges.map((b, i) => (
                <View key={b} style={s.badgeItem}>
                  <GenericBadge emoji={i === 0 ? '🎣' : i === 1 ? '🐟' : '🏆'} size={48} />
                  <Text style={s.badgeLabel} numberOfLines={2}>{b}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Fishing Preferences */}
        {(profile.primarySpecies.length > 0 || profile.favoriteTechniques.length > 0 || profile.favoriteBaits.length > 0) && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>FISHING PREFERENCES</Text>
            {profile.primarySpecies.length > 0 && (
              <TagRow label="Species" tags={profile.primarySpecies} />
            )}
            {profile.favoriteTechniques.length > 0 && (
              <TagRow label="Techniques" tags={profile.favoriteTechniques} />
            )}
            {profile.favoriteBaits.length > 0 && (
              <TagRow label="Baits" tags={profile.favoriteBaits} />
            )}
            {profile.preferredWaterType && (
              <Text style={s.infoLine}>
                <Text style={s.infoLabel}>Water: </Text>
                {WATER_OPTIONS.find(w => w.value === profile.preferredWaterType)?.label}
              </Text>
            )}
          </View>
        )}

        {/* Gear */}
        {(profile.favoriteRod || profile.favoriteReel || profile.favoriteLine || profile.favoriteBoat || profile.sponsorTags.length > 0) && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>GEAR</Text>
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
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Birthday Picker ────────────────────────────────────────────────────────────

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
        style={[bp.trigger, !!value && { borderColor: colors.accent + '60' }]}
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

          <View style={bp.preview}>
            <Text style={bp.previewText}>
              {MONTHS[selMonth]} {Math.min(selDay, daysInMonth)}, {selYear}
            </Text>
          </View>

          <View style={bp.tabs}>
            {(['month', 'day', 'year'] as const).map(t => (
              <TouchableOpacity key={t} style={[bp.tab, tab === t && bp.tabActive]} onPress={() => setTab(t)}>
                <Text style={[bp.tabText, tab === t && { color: colors.accent }]}>
                  {t === 'month' ? MONTHS[selMonth] : t === 'day' ? String(Math.min(selDay, daysInMonth)) : String(selYear)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {tab === 'month' && (
            <FlatList
              data={MONTHS}
              keyExtractor={m => m}
              renderItem={({ item, index }) => (
                <TouchableOpacity style={[bp.listRow, index === selMonth && bp.listRowActive]} onPress={() => { setSelMonth(index); setTab('day'); }}>
                  <Text style={[bp.listText, index === selMonth && { color: colors.accent, fontWeight: '700' }]}>{item}</Text>
                  {index === selMonth && <Text style={{ color: colors.accent }}>✓</Text>}
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
                  <Text style={[bp.listText, item === selDay && { color: colors.accent, fontWeight: '700' }]}>{item}</Text>
                  {item === selDay && <Text style={{ color: colors.accent }}>✓</Text>}
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
                  <Text style={[bp.listText, item === selYear && { color: colors.accent, fontWeight: '700' }]}>{item}</Text>
                  {item === selYear && <Text style={{ color: colors.accent }}>✓</Text>}
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
  trigger: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 10, flexDirection: 'row', alignItems: 'center', minHeight: 42 },
  triggerText: { flex: 1, color: colors.text, fontSize: 14 },
  arrow: { color: colors.textMuted, fontSize: 18 },
  modal: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  title: { fontSize: 17, fontWeight: '700', color: colors.text },
  clearBtn: { color: colors.error, fontSize: 15, fontWeight: '600' },
  doneBtn: { color: colors.accent, fontSize: 15, fontWeight: '700' },
  preview: { padding: 16, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.border },
  previewText: { fontSize: 20, fontWeight: '700', color: colors.text },
  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.border },
  tab: { flex: 1, padding: 12, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: colors.accent },
  tabText: { fontSize: 14, fontWeight: '600', color: colors.textMuted },
  listRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border + '50' },
  listRowActive: { backgroundColor: colors.greenMuted },
  listText: { fontSize: 16, color: colors.text },
});

// ── Species Picker Modal ───────────────────────────────────────────────────────

function SpeciesPicker({ selected, onChange }: { selected: string[]; onChange: (v: string[]) => void }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  function toggle(species: string) {
    onChange(selected.includes(species) ? selected.filter(x => x !== species) : [...selected, species]);
  }

  const q = search.toLowerCase();
  const filtered = SPECIES_GROUPED
    .map(g => ({ ...g, items: g.items.filter(sp => sp.toLowerCase().includes(q)) }))
    .filter(g => g.items.length > 0);

  const flatData: ({ type: 'header'; label: string } | { type: 'item'; species: string })[] = [];
  filtered.forEach(g => {
    flatData.push({ type: 'header', label: g.label });
    g.items.forEach(sp => flatData.push({ type: 'item', species: sp }));
  });

  return (
    <View style={{ marginBottom: 12 }}>
      <TouchableOpacity
        onPress={() => setOpen(true)}
        style={[sp.trigger, selected.length > 0 && { borderColor: colors.accent + '60' }]}
      >
        {selected.length === 0 ? (
          <Text style={sp.placeholder}>Select species…</Text>
        ) : (
          <View style={sp.chipWrap}>
            {selected.map(species => (
              <View key={species} style={sp.chip}>
                <Text style={sp.chipText}>{species}</Text>
                <TouchableOpacity onPress={() => toggle(species)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                  <Text style={sp.chipX}>×</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
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
                  <Text style={[sp.speciesName, checked && { color: colors.accent }]}>{item.species}</Text>
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
  trigger: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 10, flexDirection: 'row', alignItems: 'center', minHeight: 42 },
  placeholder: { color: colors.textMuted, fontSize: 14, flex: 1 },
  chipWrap: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surfaceHigh, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3, borderWidth: 1, borderColor: colors.border, gap: 4 },
  chipText: { color: colors.textSub, fontSize: 12 },
  chipX: { color: colors.textMuted, fontSize: 14, fontWeight: '700', lineHeight: 16 },
  arrow: { color: colors.textMuted, fontSize: 18, marginLeft: 6 },
  modal: { flex: 1, backgroundColor: colors.bg },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  modalTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  modalDone: { fontSize: 15, color: colors.accent, fontWeight: '700' },
  searchWrap: { padding: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  searchInput: { backgroundColor: colors.surface, borderRadius: 8, padding: 10, color: colors.text, fontSize: 14, borderWidth: 1, borderColor: colors.border },
  groupHeader: { fontSize: 10, fontWeight: '800', color: colors.textMuted, letterSpacing: 0.8, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4 },
  speciesRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 12, borderBottomWidth: 1, borderBottomColor: colors.border + '50' },
  speciesRowChecked: { backgroundColor: colors.greenMuted },
  checkbox: { width: 20, height: 20, borderRadius: 4, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { backgroundColor: colors.accent, borderColor: colors.accent },
  checkmark: { color: colors.bg, fontSize: 12, fontWeight: '800' },
  speciesName: { color: colors.text, fontSize: 15 },
  clearAll: { padding: 14, borderTopWidth: 1, borderTopColor: colors.border, alignItems: 'center' },
  clearAllText: { color: colors.error, fontSize: 14, fontWeight: '600' },
});

// ── Edit Profile Form ──────────────────────────────────────────────────────────

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
    setForm(f => ({ ...f, [field]: raw.split(',').map(str => str.trim()).filter(Boolean) }));
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
    <SafeAreaView style={s.safeArea}>
      <ScrollView contentContainerStyle={{ paddingBottom: 60 }}>
        <View style={s.formHeader}>
          <Text style={s.formTitle}>{existing ? 'EDIT PROFILE' : 'CREATE PROFILE'}</Text>
          {onCancel && (
            <TouchableOpacity onPress={onCancel}>
              <Text style={{ color: colors.textSub, fontSize: 15 }}>Cancel</Text>
            </TouchableOpacity>
          )}
        </View>

        {error ? (
          <View style={s.errorBanner}>
            <Text style={s.errorBannerText}>{error}</Text>
          </View>
        ) : null}

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
                <Text style={[s.waterOptionText, form.preferredWaterType === opt.value && { color: colors.accent }]}>
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
            <Switch
              value={form.publicProfile ?? true}
              onValueChange={v => setForm(f => ({ ...f, publicProfile: v }))}
              trackColor={{ true: colors.accent, false: colors.border }}
              thumbColor={colors.bg}
            />
          </View>
          <View style={s.toggleRow}>
            <Text style={s.toggleLabel}>Allow Followers</Text>
            <Switch
              value={form.allowFollowers ?? true}
              onValueChange={v => setForm(f => ({ ...f, allowFollowers: v }))}
              trackColor={{ true: colors.accent, false: colors.border }}
              thumbColor={colors.bg}
            />
          </View>
        </FormSection>

        <TouchableOpacity style={[s.goldBtn, { marginHorizontal: 16 }]} onPress={save} disabled={saving} activeOpacity={0.85}>
          {saving ? (
            <ActivityIndicator color={colors.bg} />
          ) : (
            <Text style={s.goldBtnText}>SAVE PROFILE</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Reusable components ────────────────────────────────────────────────────────

function StatCard({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <View style={s.statCard}>
      <View style={s.statValueRow}>
        <Text style={s.statValue}>{value}</Text>
        {unit && <Text style={s.statUnit}>{unit}</Text>}
      </View>
      <Text style={s.statLabel}>{label}</Text>
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

// ── Styles ─────────────────────────────────────────────────────────────────────

// Light/cream palette for profile view
const CREAM = '#F0EAD0';
const CREAM_CARD = '#FFFFFF';
const CREAM_BORDER = '#C8BEA0';
const DARK_TEXT = '#1A2A1A';
const DARK_SUB = '#2E4A2E';
const DARK_MUTED = '#5A7A5A';

const s = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.surface },
  center: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: 32 },

  // Header — stays dark green
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 52,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: colors.surface,
    borderBottomWidth: 0,
  },
  headerTitle: {
    ...typography.displayMd,
    color: colors.text,
  },
  editBtn: {
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  editBtnText: {
    ...typography.label,
    color: colors.accent,
  },

  // Hero — dark green background (matches web)
  profileHero: {
    alignItems: 'center',
    paddingTop: 28,
    paddingBottom: 24,
    paddingHorizontal: 16,
    backgroundColor: colors.bg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  avatarRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 4,
    borderColor: colors.accent,
    overflow: 'hidden',
    position: 'relative',
  },
  avatarImg: { width: '100%', height: '100%' },
  avatarFallback: {
    flex: 1,
    backgroundColor: colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarFallbackEmoji: {
    fontSize: 36,
  },
  avatarOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  displayName: {
    ...typography.displayMd,
    color: colors.text,
  },
  verifiedChip: {
    backgroundColor: colors.verifiedBg,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: colors.verified + '50',
  },
  verifiedChipText: {
    ...typography.labelSm,
    color: colors.verified,
  },
  username: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 4,
  },
  bio: {
    ...typography.bodySm,
    color: colors.textSub,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 18,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
    justifyContent: 'center',
  },
  metaText: {
    ...typography.caption,
    color: colors.textMuted,
  },
  metaVal: {
    fontWeight: '700',
    color: colors.textSub,
  },
  metaDot: {
    color: colors.textMuted,
    fontSize: 12,
  },

  // Stats grid — cream bg, white cards
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
    gap: 8,
    marginTop: 0,
    backgroundColor: CREAM,
  },
  statCard: {
    width: '47%',
    backgroundColor: CREAM_CARD,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: CREAM_BORDER,
    alignItems: 'center',
  },
  statValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 3,
  },
  statValue: {
    ...typography.numMd,
    color: DARK_TEXT,
  },
  statUnit: {
    ...typography.labelSm,
    color: DARK_MUTED,
  },
  statLabel: {
    ...typography.labelSm,
    color: DARK_MUTED,
    marginTop: 4,
    textAlign: 'center',
  },

  // Sections — white cards on cream
  section: {
    marginHorizontal: 12,
    marginTop: 10,
    backgroundColor: CREAM_CARD,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: CREAM_BORDER,
    marginBottom: 2,
  },
  sectionTitle: {
    ...typography.label,
    color: DARK_MUTED,
    marginBottom: 12,
  },
  badgeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  badgeItem: {
    alignItems: 'center',
    gap: 6,
    width: 64,
  },
  badgeLabel: {
    ...typography.labelSm,
    color: DARK_MUTED,
    textAlign: 'center',
  },

  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tagChip: { backgroundColor: '#EDE8D0', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3, borderWidth: 1, borderColor: CREAM_BORDER },
  tagText: { color: DARK_SUB, fontSize: 12 },
  infoLine: { fontSize: 13, color: DARK_SUB, marginBottom: 6 },
  infoLabel: { color: DARK_MUTED, fontSize: 11, fontWeight: '600', marginBottom: 4 },

  // Buttons
  goldBtn: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginVertical: 8,
  },
  goldBtnText: {
    ...typography.button,
    color: colors.bg,
  },
  ghostBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border,
  },

  // Empty state
  emptyIcon: { fontSize: 60, marginBottom: 16 },
  emptyTitle: {
    ...typography.displaySm,
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtitle: {
    ...typography.bodyMd,
    color: colors.textSub,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },

  // Form
  formHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 52,
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: 8,
  },
  formTitle: {
    ...typography.displaySm,
    color: colors.text,
  },
  formSection: {
    marginHorizontal: 16,
    marginBottom: 14,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  fieldLabel: {
    ...typography.labelSm,
    color: colors.textMuted,
    marginBottom: 6,
  },
  input: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 10,
    color: colors.text,
    fontSize: 14,
  },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  toggleLabel: { ...typography.bodyMd, color: colors.textSub },
  waterPicker: { flexDirection: 'row', gap: 8, marginTop: 4 },
  waterOption: { flex: 1, padding: 8, borderRadius: 8, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  waterOptionActive: { borderColor: colors.accent, backgroundColor: colors.greenMuted },
  waterOptionText: { color: colors.textMuted, fontSize: 13 },
  errorBanner: {
    backgroundColor: colors.errorBg,
    borderRadius: 8,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.error + '50',
  },
  errorBannerText: { color: colors.error, fontSize: 13 },
});
