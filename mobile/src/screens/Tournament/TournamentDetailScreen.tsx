import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity,
  ActivityIndicator, Image, TextInput, KeyboardAvoidingView, Platform,
  Alert, Share,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation';
import * as api from '../../services/api';
import { storage } from '../../services/storage';
import type { Tournament, TournamentPost } from '../../models';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { TournamentContext } from '../../navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'TournamentDetail'>;

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatCents(cents: number): string {
  if (cents === 0) return 'Free';
  return `$${(cents / 100).toFixed(2)}`;
}

function formatScore(entry: { score: number; fishLengthCm: number; fishWeightOz?: number | null }, scoringMethod?: string): string {
  if (scoringMethod === 'WEIGHT') return `${entry.fishWeightOz?.toFixed(1) ?? '0'} oz`;
  if (scoringMethod === 'FISH_COUNT') return `${Math.round(entry.score)} fish`;
  if (scoringMethod === 'SPECIES_COUNT') return `${Math.round(entry.score)} species`;
  return `${(entry.fishLengthCm / 2.54).toFixed(1)}"`;
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function medalEmoji(rank: number): string {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return `#${rank}`;
}

function scoringLabel(method?: string): string {
  if (method === 'WEIGHT') return '⚖️ Weight';
  if (method === 'FISH_COUNT') return '🐟 Fish Count';
  if (method === 'SPECIES_COUNT') return '🎣 Species Count';
  return '📏 Length';
}

// ── Post card ─────────────────────────────────────────────────────────────────

function PostCard({ post, currentUserId }: { post: TournamentPost; currentUserId: string | null }) {
  const username = post.user.profile?.username ?? post.user.displayName;
  const avatar = post.user.profile?.profilePhotoUrl;
  const initials = post.user.displayName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <View style={ps.card}>
      {/* Avatar + name row */}
      <View style={ps.header}>
        {avatar ? (
          <Image source={{ uri: avatar }} style={ps.avatar} />
        ) : (
          <View style={[ps.avatar, ps.avatarFallback]}>
            <Text style={ps.avatarInitials}>{initials}</Text>
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={ps.name}>{username}</Text>
          <Text style={ps.time}>{relativeTime(post.createdAt)}</Text>
        </View>
        <PostTypeBadge type={post.type} />
      </View>

      {/* CATCH post */}
      {post.type === 'CATCH' && post.submission && (
        <View style={ps.catchBody}>
          {post.photoUrl && (
            <Image source={{ uri: post.photoUrl }} style={ps.catchPhoto} resizeMode="cover" />
          )}
          <View style={ps.catchMeta}>
            <Text style={ps.catchLength}>
              {(post.submission.fishLengthCm / 2.54).toFixed(1)}"
              {post.submission.speciesName ? `  ·  ${post.submission.speciesName}` : ''}
            </Text>
            {post.submission.released && (
              <Text style={ps.releasedBadge}>↩ Released</Text>
            )}
          </View>
        </View>
      )}

      {/* ANNOUNCEMENT — render title bold, message below */}
      {post.type === 'ANNOUNCEMENT' && post.body && (() => {
        const [titleLine, ...rest] = post.body.split('\n');
        const title = titleLine.replace(/\*\*(.*?)\*\*/g, '$1');
        const message = rest.join('\n').trim();
        return (
          <>
            <Text style={ps.announceTitle}>{title}</Text>
            {message ? <Text style={ps.body}>{message}</Text> : null}
          </>
        );
      })()}

      {/* ANGLER_POST / CHECK_IN body */}
      {post.type !== 'ANNOUNCEMENT' && post.body ? <Text style={ps.body}>{post.body}</Text> : null}

      {post.type === 'CHECK_IN' && !post.body && (
        <Text style={ps.body}>Checked in to the tournament 🎣</Text>
      )}

      {post.photoUrl && post.type === 'ANGLER_POST' && (
        <Image source={{ uri: post.photoUrl }} style={ps.anglerPhoto} resizeMode="cover" />
      )}
    </View>
  );
}

function PostTypeBadge({ type }: { type: TournamentPost['type'] }) {
  const map: Record<string, { label: string; color: string }> = {
    CATCH:        { label: '🎣 Catch', color: colors.verified },
    ANNOUNCEMENT: { label: '📢 News',  color: '#E67E22' },
    CHECK_IN:     { label: '✅ Check-In', color: colors.accent },
    ANGLER_POST:  { label: '💬 Post',  color: colors.textMuted },
  };
  const { label, color } = map[type] ?? { label: type, color: colors.textMuted };
  return (
    <View style={[ps.typeBadge, { borderColor: color + '60', backgroundColor: color + '18' }]}>
      <Text style={[ps.typeBadgeText, { color }]}>{label}</Text>
    </View>
  );
}

const ps = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 10,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  avatar: { width: 36, height: 36, borderRadius: 18 },
  avatarFallback: {
    backgroundColor: colors.surfaceHigh,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: { fontSize: 13, fontWeight: '700', color: colors.textSub },
  name: { fontSize: 13, fontWeight: '700', color: colors.text },
  time: { ...typography.caption, color: colors.textMuted, marginTop: 1 },
  typeBadge: {
    borderRadius: 6, borderWidth: 1,
    paddingHorizontal: 7, paddingVertical: 2,
  },
  typeBadgeText: { fontSize: 10, fontWeight: '700' },
  catchBody: {},
  catchPhoto: { width: '100%', height: 180, borderRadius: 10, marginBottom: 8 },
  catchMeta: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  catchLength: { fontSize: 15, fontWeight: '700', color: colors.text },
  releasedBadge: { ...typography.caption, color: colors.verified, fontSize: 11 },
  announceTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 4 },
  body: { ...typography.bodyMd, color: colors.text, lineHeight: 20 },
  anglerPhoto: { width: '100%', height: 200, borderRadius: 10, marginTop: 8 },
});

// ── Main screen ───────────────────────────────────────────────────────────────

export default function TournamentDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute<Props['route']>();
  const { tournamentId } = route.params;
  const { scoringMethod: activeScoringMethod } = useContext(TournamentContext);

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<TournamentPost[]>([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const [feedCursor, setFeedCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [composeText, setComposeText] = useState('');
  const [posting, setPosting] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>('USER');

  useEffect(() => {
    storage.getToken().then(async (token) => {
      if (!token) return;
      // Decode JWT to get userId and role (base64 payload)
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setCurrentUserId(payload.sub ?? null);
        setUserRole(payload.role ?? 'USER');
      } catch {}
    });
  }, []);

  useEffect(() => {
    api.getTournamentDetail(tournamentId)
      .then(setTournament)
      .catch(() => Alert.alert('Error', 'Could not load tournament details.'))
      .finally(() => setLoading(false));

    api.getTournamentFeed(tournamentId)
      .then(({ posts: p, nextCursor }) => {
        setPosts(p);
        setFeedCursor(nextCursor);
      })
      .catch(() => {})
      .finally(() => setFeedLoading(false));
  }, [tournamentId]);

  const loadMoreFeed = useCallback(async () => {
    if (!feedCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const { posts: more, nextCursor } = await api.getTournamentFeed(tournamentId, feedCursor);
      setPosts(prev => [...prev, ...more]);
      setFeedCursor(nextCursor);
    } catch {}
    setLoadingMore(false);
  }, [feedCursor, loadingMore, tournamentId]);

  const handlePost = useCallback(async () => {
    const text = composeText.trim();
    if (!text) return;
    setPosting(true);
    try {
      const post = await api.postToTournamentFeed(tournamentId, text);
      setPosts(prev => [post, ...prev]);
      setComposeText('');
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Could not post.');
    }
    setPosting(false);
  }, [composeText, tournamentId]);

  const isAdminOrDirector = userRole === 'ADMIN' || userRole === 'TOURNAMENT_ADMIN';

  if (loading) {
    return (
      <SafeAreaView style={s.safeArea}>
        <View style={s.loadingWrap}>
          <Image source={require('../../../assets/icon.png')} style={{ width: 90, height: 90 }} resizeMode="contain" />
          <ActivityIndicator size="small" color={colors.accent} style={{ marginTop: 16 }} />
        </View>
      </SafeAreaView>
    );
  }

  if (!tournament) {
    return (
      <SafeAreaView style={s.safeArea}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Text style={s.backBtnText}>‹ Back</Text>
        </TouchableOpacity>
        <View style={s.loadingWrap}>
          <Text style={s.errorText}>Tournament not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const method = tournament.scoringMethod ?? activeScoringMethod ?? 'LENGTH';
  const daysLeft = tournament.endsAt
    ? Math.max(0, Math.ceil((new Date(tournament.endsAt).getTime() - Date.now()) / 86400000))
    : null;
  const isOpen = tournament.isOpen;
  const qrValue = tournament.checkInCode
    ? `fishleague://check-in?code=${tournament.checkInCode}`
    : null;

  return (
    <SafeAreaView style={s.safeArea}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

          {/* ── Header ──────────────────────────────────────────────────────── */}
          <View style={s.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn} activeOpacity={0.7}>
              <Text style={s.backBtnText}>‹ Back</Text>
            </TouchableOpacity>
          </View>

          {/* ── Hero card ───────────────────────────────────────────────────── */}
          <View style={s.heroCard}>
            <View style={s.heroTop}>
              <View style={[s.statusPill, { backgroundColor: isOpen ? colors.verified + '20' : colors.textMuted + '20', borderColor: isOpen ? colors.verified + '60' : colors.textMuted + '40' }]}>
                <Text style={[s.statusPillText, { color: isOpen ? colors.verified : colors.textMuted }]}>
                  {isOpen ? '● ACTIVE' : '◉ CLOSED'}
                </Text>
              </View>
              <Text style={s.weekLabel}>Week {tournament.weekNumber} · {tournament.year}</Text>
            </View>
            <Text style={s.heroName}>{tournament.name}</Text>
            <Text style={s.heroRegion}>{tournament.region?.name ?? 'All Regions'}</Text>

            {/* Stats row */}
            <View style={s.statsRow}>
              <View style={s.stat}>
                <Text style={s.statVal}>{scoringLabel(method)}</Text>
                <Text style={s.statLabel}>SCORING</Text>
              </View>
              <View style={s.statDivider} />
              {daysLeft !== null && isOpen ? (
                <View style={s.stat}>
                  <Text style={s.statVal}>{daysLeft}d</Text>
                  <Text style={s.statLabel}>REMAINING</Text>
                </View>
              ) : (
                <View style={s.stat}>
                  <Text style={s.statVal}>
                    {new Date(tournament.endsAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </Text>
                  <Text style={s.statLabel}>ENDED</Text>
                </View>
              )}
              <View style={s.statDivider} />
              <View style={s.stat}>
                <Text style={s.statVal}>{tournament._count?.submissions ?? '—'}</Text>
                <Text style={s.statLabel}>CATCHES</Text>
              </View>
            </View>

            {/* Dates */}
            <View style={s.datesRow}>
              <Text style={s.dateLabel}>
                {new Date(tournament.startsAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                {' – '}
                {new Date(tournament.endsAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </Text>
            </View>

            {/* Entry fee + prize */}
            <View style={s.feeRow}>
              <View style={s.feeItem}>
                <Text style={s.feeLabel}>ENTRY FEE</Text>
                <Text style={s.feeVal}>{formatCents(tournament.entryFeeCents)}</Text>
              </View>
              {tournament.prizePoolCents > 0 && (
                <>
                  <View style={s.statDivider} />
                  <View style={s.feeItem}>
                    <Text style={s.feeLabel}>PRIZE POOL</Text>
                    <Text style={[s.feeVal, { color: colors.accent }]}>{formatCents(tournament.prizePoolCents)}</Text>
                  </View>
                </>
              )}
            </View>

            {/* Description */}
            {tournament.description ? (
              <View style={s.descBox}>
                <Text style={s.descText}>{tournament.description}</Text>
              </View>
            ) : null}

            {/* Action buttons */}
            {isOpen && (
              <View style={s.actionRow}>
                <TouchableOpacity
                  style={s.shareBtn}
                  activeOpacity={0.75}
                  onPress={() => Share.share({
                    message: `Watch the live leaderboard for ${tournament.name} 🎣\nhttps://www.fishleague.app/leaderboard/${tournament.id}`,
                    url: `https://www.fishleague.app/leaderboard/${tournament.id}`,
                  })}
                >
                  <Text style={s.shareBtnText}>🔗 Share Leaderboard</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={s.scanBtn}
                  activeOpacity={0.75}
                  onPress={() => navigation.navigate('CheckIn' as any)}
                >
                  <Text style={s.scanBtnText}>📱 Scan to Check In</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* ── Director ────────────────────────────────────────────────────── */}
          {tournament.director && (
            <View style={s.sectionCard}>
              <Text style={s.sectionTitle}>TOURNAMENT DIRECTOR</Text>
              <View style={s.directorRow}>
                {tournament.director.profile?.profilePhotoUrl ? (
                  <Image source={{ uri: tournament.director.profile.profilePhotoUrl }} style={s.directorAvatar} />
                ) : (
                  <View style={[s.directorAvatar, s.directorAvatarFallback]}>
                    <Text style={s.directorInitials}>
                      {tournament.director.displayName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                    </Text>
                  </View>
                )}
                <View>
                  <Text style={s.directorName}>{tournament.director.displayName}</Text>
                  {tournament.director.profile?.username ? (
                    <Text style={s.directorUsername}>@{tournament.director.profile.username}</Text>
                  ) : null}
                </View>
              </View>
            </View>
          )}

          {/* ── QR Check-In ─────────────────────────────────────────────────── */}
          <View style={s.sectionCard}>
            <Text style={s.sectionTitle}>CHECK-IN</Text>
            <Text style={s.checkInCount}>
              {tournament._count?.checkIns ?? 0} anglers checked in
            </Text>
            {isAdminOrDirector && qrValue ? (
              <>
                <Text style={s.qrHint}>Display this QR code at the event — anglers scan to check in.</Text>
                <View style={s.qrWrap}>
                  <QRCode
                    value={qrValue}
                    size={200}
                    backgroundColor={colors.surface}
                    color={colors.text}
                  />
                </View>
              </>
            ) : isAdminOrDirector && !qrValue ? (
              <Text style={s.qrHint}>No check-in code generated yet. Generate one from the admin panel.</Text>
            ) : (
              <TouchableOpacity
                style={s.scanBtn}
                activeOpacity={0.75}
                onPress={() => navigation.navigate('CheckIn' as any)}
              >
                <Text style={s.scanBtnText}>📱 Scan QR to Check In</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* ── Leaderboard preview ──────────────────────────────────────────── */}
          {tournament.top3 && tournament.top3.length > 0 && (
            <View style={s.sectionCard}>
              <View style={s.sectionTitleRow}>
                <Text style={s.sectionTitle}>LEADERBOARD</Text>
                <Text style={s.sectionSub}>Top 3</Text>
              </View>
              {tournament.top3.map((entry, i) => (
                <View key={i} style={[s.lbRow, i < tournament.top3!.length - 1 && s.lbRowBorder]}>
                  <Text style={s.lbMedal}>{medalEmoji(i + 1)}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={s.lbName}>
                      {entry.user.profile?.username ? `@${entry.user.profile.username}` : entry.user.displayName}
                    </Text>
                  </View>
                  <Text style={s.lbScore}>{formatScore(entry, method)}</Text>
                </View>
              ))}
            </View>
          )}

          {/* ── Social Feed ──────────────────────────────────────────────────── */}
          <View style={s.sectionCard}>
            <Text style={s.sectionTitle}>TOURNAMENT FEED</Text>

            {/* Compose */}
            <View style={s.composeRow}>
              <TextInput
                style={s.composeInput}
                value={composeText}
                onChangeText={setComposeText}
                placeholder="Share something with the tournament…"
                placeholderTextColor={colors.textMuted}
                multiline
                maxLength={1000}
                returnKeyType="default"
              />
              <TouchableOpacity
                style={[s.postBtn, (!composeText.trim() || posting) && s.postBtnDisabled]}
                onPress={handlePost}
                disabled={!composeText.trim() || posting}
                activeOpacity={0.8}
              >
                {posting
                  ? <ActivityIndicator size="small" color={colors.bg} />
                  : <Text style={s.postBtnText}>POST</Text>
                }
              </TouchableOpacity>
            </View>

            {/* Feed */}
            {feedLoading ? (
              <View style={{ alignItems: 'center', paddingVertical: 24 }}>
                <ActivityIndicator color={colors.accent} />
              </View>
            ) : posts.length === 0 ? (
              <View style={s.emptyFeed}>
                <Text style={s.emptyFeedText}>No posts yet. Be the first!</Text>
              </View>
            ) : (
              <>
                {posts.map(p => (
                  <PostCard key={p.id} post={p} currentUserId={currentUserId} />
                ))}
                {feedCursor && (
                  <TouchableOpacity style={s.loadMoreBtn} onPress={loadMoreFeed} disabled={loadingMore} activeOpacity={0.8}>
                    {loadingMore
                      ? <ActivityIndicator size="small" color={colors.accent} />
                      : <Text style={s.loadMoreText}>Load more</Text>
                    }
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.bg },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { ...typography.bodyMd, color: colors.error, textAlign: 'center' },
  scroll: { paddingBottom: 32 },

  // Header
  header: { paddingTop: 8, paddingHorizontal: 16, paddingBottom: 4 },
  backBtn: { paddingVertical: 8 },
  backBtnText: { fontSize: 16, color: colors.accent, fontWeight: '600' },

  // Hero
  heroCard: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 12,
    backgroundColor: colors.surfaceCard ?? colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderGold ?? colors.border,
    padding: 18,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  statusPill: {
    borderRadius: 6, borderWidth: 1,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  statusPillText: { ...typography.labelSm },
  weekLabel: { ...typography.caption, color: colors.textMuted },
  heroName: { ...typography.displaySm, color: colors.text, marginBottom: 4 },
  heroRegion: { ...typography.caption, color: colors.textSub, marginBottom: 16 },

  statsRow: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  stat: { flex: 1, alignItems: 'center' },
  statVal: { fontSize: 13, fontWeight: '700', color: colors.accent, textAlign: 'center' },
  statLabel: { ...typography.labelSm, color: colors.textMuted, marginTop: 2, textAlign: 'center' },
  statDivider: { width: 1, backgroundColor: colors.border, marginVertical: 4 },

  datesRow: { marginBottom: 12 },
  dateLabel: { ...typography.caption, color: colors.textSub },

  feeRow: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  feeItem: { flex: 1, alignItems: 'center' },
  feeLabel: { ...typography.labelSm, color: colors.textMuted },
  feeVal: { fontSize: 16, fontWeight: '800', color: colors.text, marginTop: 2 },

  descBox: {
    backgroundColor: colors.bg,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  descText: { ...typography.bodyMd, color: colors.textSub, lineHeight: 22 },

  actionRow: { gap: 8, marginTop: 4 },
  shareBtn: {
    paddingVertical: 11, alignItems: 'center',
    borderRadius: 10, borderWidth: 1, borderColor: colors.border,
  },
  shareBtnText: { ...typography.label, color: colors.textSub },
  scanBtn: {
    paddingVertical: 11, alignItems: 'center',
    borderRadius: 10, borderWidth: 1,
    borderColor: colors.accent + '50',
    backgroundColor: colors.accent + '10',
  },
  scanBtnText: { ...typography.label, color: colors.accent },

  // Section card
  sectionCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  sectionTitle: { ...typography.label, color: colors.textMuted, marginBottom: 14 },
  sectionSub: { ...typography.caption, color: colors.textMuted },

  // Director
  directorRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: -6 },
  directorAvatar: { width: 48, height: 48, borderRadius: 24 },
  directorAvatarFallback: {
    backgroundColor: colors.surfaceHigh,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  directorInitials: { fontSize: 16, fontWeight: '700', color: colors.textSub },
  directorName: { fontSize: 16, fontWeight: '700', color: colors.text },
  directorUsername: { ...typography.caption, color: colors.textMuted, marginTop: 2 },

  // QR
  checkInCount: { ...typography.caption, color: colors.textSub, marginTop: -8, marginBottom: 10 },
  qrHint: { ...typography.caption, color: colors.textMuted, marginBottom: 14 },
  qrWrap: { alignItems: 'center', padding: 16, backgroundColor: colors.bg, borderRadius: 12, borderWidth: 1, borderColor: colors.border },

  // Leaderboard
  lbRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, gap: 12 },
  lbRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  lbMedal: { fontSize: 20, width: 28 },
  lbName: { fontSize: 14, fontWeight: '600', color: colors.text },
  lbScore: { fontSize: 16, fontWeight: '800', color: colors.accent },

  // Feed / compose
  composeRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-end', marginBottom: 16 },
  composeInput: {
    flex: 1,
    backgroundColor: colors.bg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.text,
    fontSize: 14,
    minHeight: 42,
    maxHeight: 100,
  },
  postBtn: {
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    minWidth: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  postBtnDisabled: { opacity: 0.4 },
  postBtnText: { ...typography.button, color: colors.bg, fontSize: 12 },
  emptyFeed: { paddingVertical: 20, alignItems: 'center' },
  emptyFeedText: { ...typography.bodyMd, color: colors.textMuted },
  loadMoreBtn: { alignItems: 'center', paddingVertical: 14 },
  loadMoreText: { ...typography.label, color: colors.accent },
});
