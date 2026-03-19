import React, { useCallback, useContext, useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, SafeAreaView, Modal, Alert, Image,
  TextInput, KeyboardAvoidingView, Platform, FlatList, RefreshControl,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as api from '../../services/api';
import type { Tournament, FeedItem, CatchComment, UserWarning, AnglerProfile } from '../../models';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { FishLeagueLogoFull } from '../../components/icons/Logo';
import { TournamentContext } from '../../navigation';
import type { RootStackParamList } from '../../navigation';
import { storage } from '../../services/storage';
import { drainQueue } from '../../services/submissionQueue';

function getInitials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function countdownTo(dateStr: string): string {
  const diff = new Date(dateStr).getTime() - Date.now();
  if (diff <= 0) return 'Ended';
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  if (days > 0) return `${days}d ${hours}h remaining`;
  const minutes = Math.floor((diff % 3600000) / 60000);
  return `${hours}h ${minutes}m remaining`;
}

function TournamentBanner({ tournament }: { tournament: Tournament }) {
  const entryFee = tournament.entryFeeCents > 0
    ? `$${(tournament.entryFeeCents / 100).toFixed(2)} entry`
    : 'Free';
  const prizePool = tournament.prizePoolCents > 0
    ? `$${(tournament.prizePoolCents / 100).toFixed(2)} prize pool`
    : null;
  return (
    <View style={styles.tournamentBanner}>
      <View style={styles.tournamentBannerTop}>
        <View style={styles.activeBadge}>
          <Text style={styles.activeBadgeText}>ACTIVE</Text>
        </View>
        <Text style={styles.tournamentCountdown}>{countdownTo(tournament.endsAt)}</Text>
      </View>
      <Text style={styles.tournamentName}>{tournament.name}</Text>
      <View style={styles.tournamentMeta}>
        <Text style={styles.tournamentMetaText}>Week {tournament.weekNumber} · {tournament.region?.name ?? 'All Regions'}</Text>
      </View>
      <View style={[styles.tournamentMeta, { marginTop: 6 }]}>
        <Text style={[styles.tournamentMetaText, { color: colors.textSub }]}>{entryFee}</Text>
        {prizePool && (
          <>
            <Text style={[styles.tournamentMetaText, { marginHorizontal: 6 }]}> · </Text>
            <Text style={[styles.tournamentMetaText, { color: colors.accent, fontWeight: '700' }]}>🏆 {prizePool}</Text>
          </>
        )}
      </View>
    </View>
  );
}

function PropButton({ submissionId, initialCount }: { submissionId: string; initialCount: number }) {
  const [propped, setPropped] = useState(false);
  const [count, setCount] = useState(initialCount);
  const [loading, setLoading] = useState(false);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    api.getProps(submissionId)
      .then(r => { setCount(r.count); setPropped(r.userHasPropped); })
      .catch(() => {});
  }, [submissionId]);

  async function handleToggle() {
    if (loading) return;
    setLoading(true);
    try {
      const r = await api.toggleProp(submissionId);
      setPropped(r.propped);
      setCount(r.count);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }

  return (
    <TouchableOpacity
      style={[styles.feedActionBtn, propped && styles.feedActionBtnActive]}
      onPress={handleToggle}
      disabled={loading}
      activeOpacity={0.7}
    >
      <Text style={styles.feedActionIcon}>👍</Text>
      <Text style={[styles.feedActionText, propped && { color: colors.accent }]}>
        PROPS{count > 0 ? ` ${count}` : ''}
      </Text>
    </TouchableOpacity>
  );
}

function CommentsModal({ submissionId, myUserId, onClose }: { submissionId: string; myUserId: string | null; onClose: () => void }) {
  const [comments, setComments] = useState<CatchComment[]>([]);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    api.getComments(submissionId).then(setComments).catch(() => {});
  }, [submissionId]);

  async function handleSend() {
    if (!body.trim() || sending) return;
    setSending(true);
    try {
      const c = await api.addComment(submissionId, body.trim());
      setComments(prev => [...prev, c]);
      setBody('');
    } catch { /* silent */ }
    finally { setSending(false); }
  }

  function startEdit(comment: CatchComment) {
    setEditingId(comment.id);
    setEditBody(comment.body);
  }

  async function handleSaveEdit() {
    if (!editingId || !editBody.trim() || savingEdit) return;
    setSavingEdit(true);
    try {
      const updated = await api.editComment(editingId, editBody.trim());
      setComments(prev => prev.map(c => c.id === editingId ? updated : c));
      setEditingId(null);
      setEditBody('');
    } catch { /* silent */ }
    finally { setSavingEdit(false); }
  }

  async function handleDelete(commentId: string) {
    try {
      await api.deleteComment(commentId);
      setComments(prev => prev.filter(c => c.id !== commentId));
    } catch { /* silent */ }
  }

  function handleLongPress(comment: CatchComment) {
    if (comment.user.id !== myUserId) return;
    Alert.alert('Your Comment', undefined, [
      { text: 'Edit', onPress: () => startEdit(comment) },
      { text: 'Delete', style: 'destructive', onPress: () => handleDelete(comment.id) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={cm.container}>
          <View style={cm.header}>
            <Text style={cm.title}>COMMENTS</Text>
            <TouchableOpacity onPress={onClose}><Text style={cm.closeBtn}>✕</Text></TouchableOpacity>
          </View>
          <FlatList
            data={comments}
            keyExtractor={c => c.id}
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: 16, gap: 12 }}
            ListEmptyComponent={<Text style={cm.empty}>No comments yet. Be the first!</Text>}
            renderItem={({ item }) => (
              <TouchableOpacity
                onLongPress={() => handleLongPress(item)}
                delayLongPress={400}
                activeOpacity={0.85}
              >
                <View style={cm.comment}>
                  <View style={{ flex: 1 }}>
                    <Text style={cm.commentName}>{item.user.displayName}</Text>
                    {editingId === item.id ? (
                      <View style={cm.editRow}>
                        <TextInput
                          style={cm.editInput}
                          value={editBody}
                          onChangeText={setEditBody}
                          maxLength={500}
                          multiline
                          autoFocus
                        />
                        <View style={cm.editActions}>
                          <TouchableOpacity
                            style={[cm.editSaveBtn, (!editBody.trim() || savingEdit) && { opacity: 0.4 }]}
                            onPress={handleSaveEdit}
                            disabled={!editBody.trim() || savingEdit}
                          >
                            <Text style={cm.editSaveBtnText}>{savingEdit ? '…' : 'SAVE'}</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={cm.editCancelBtn} onPress={() => setEditingId(null)}>
                            <Text style={cm.editCancelBtnText}>CANCEL</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ) : (
                      <Text style={cm.commentBody}>{item.body}</Text>
                    )}
                    <Text style={cm.commentTime}>{timeAgo(item.createdAt)}</Text>
                  </View>
                  {item.user.id === myUserId && editingId !== item.id && (
                    <Text style={cm.editHint}>···</Text>
                  )}
                </View>
              </TouchableOpacity>
            )}
          />
          <View style={cm.inputRow}>
            <TextInput
              style={cm.input}
              placeholder="Add a comment..."
              placeholderTextColor={colors.textMuted}
              value={body}
              onChangeText={setBody}
              maxLength={500}
              multiline
            />
            <TouchableOpacity
              style={[cm.sendBtn, (!body.trim() || sending) && { opacity: 0.4 }]}
              onPress={handleSend}
              disabled={!body.trim() || sending}
            >
              <Text style={cm.sendBtnText}>POST</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function FeedCard({ item, region, onComment }: { item: FeedItem; region: string; onComment: () => void }) {
  const lengthIn = (item.fishLengthCm / 2.54).toFixed(1);
  const initials = getInitials(item.displayName);
  const firstName = item.displayName.split(' ')[0].toUpperCase();
  const speciesLabel = item.speciesName ? item.speciesName.toUpperCase() : 'FISH';

  return (
    <View style={styles.feedCard}>
      {/* Card header */}
      <View style={styles.feedCardHeader}>
        <View style={styles.feedAvatar}>
          {item.profilePhotoUrl ? (
            <Image source={{ uri: item.profilePhotoUrl }} style={styles.feedAvatarImg} />
          ) : (
            <Text style={styles.feedAvatarText}>{initials}</Text>
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.feedAnglerName}>{item.displayName}</Text>
          {item.username && <Text style={styles.feedUsername}>@{item.username}</Text>}
        </View>
        {item.released && (
          <View style={styles.releasedBadge}>
            <Text style={styles.releasedBadgeText}>🐟 RELEASED</Text>
          </View>
        )}
        <View style={[styles.verifiedBadge, { marginLeft: 6 }]}>
          <Text style={styles.verifiedBadgeText}>✓ VERIFIED</Text>
        </View>
      </View>

      {/* Fish photo */}
      <View style={styles.feedPhotoPlaceholder}>
        {item.photoUrl ? (
          <Image source={{ uri: item.photoUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        ) : null}
        <View style={[styles.feedFishInfo, item.photoUrl && styles.feedFishInfoOverlay]}>
          <Text style={[styles.feedFishLengthLabel, item.photoUrl && { color: 'rgba(255,255,255,0.8)' }]}>CATCH LENGTH</Text>
          <Text style={[styles.feedFishLength, item.photoUrl && { color: '#FFFFFF' }]}>{lengthIn}{'"'}</Text>
        </View>
      </View>

      {/* Caption */}
      <View style={styles.feedCaption}>
        <Text style={styles.feedCaptionText}>
          <Text style={{ color: colors.charcoal, fontWeight: '700' }}>{firstName} </Text>
          <Text>CAUGHT A </Text>
          <Text style={{ color: colors.accent, fontWeight: '800' }}>{lengthIn}"</Text>
          <Text> {speciesLabel}.</Text>
        </Text>
        <View style={styles.feedMeta}>
          <Text style={styles.feedMetaText}>📍 {region}</Text>
          <Text style={styles.feedMetaDot}>·</Text>
          <Text style={styles.feedMetaText}>🕐 {timeAgo(item.submittedAt)}</Text>
        </View>
      </View>

      {/* Action row */}
      <View style={styles.feedActions}>
        <PropButton submissionId={item.submissionId} initialCount={item.propsCount} />
        <View style={styles.feedActionDivider} />
        <TouchableOpacity style={styles.feedActionBtn} onPress={onComment} activeOpacity={0.7}>
          <Text style={styles.feedActionIcon}>💬</Text>
          <Text style={styles.feedActionText}>COMMENT</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const WARNING_LEVEL_COLORS: Record<string, string> = {
  MINOR: '#D4820A',
  MAJOR: '#C0392B',
  FINAL: '#8B0000',
};

function WarningsModal({
  warnings,
  onDismiss,
}: {
  warnings: UserWarning[];
  onDismiss: () => void;
}) {
  const [idx, setIdx] = useState(0);
  const [acknowledging, setAcknowledging] = useState(false);
  const warning = warnings[idx];
  if (!warning) return null;

  async function handleAcknowledge() {
    setAcknowledging(true);
    try {
      await api.acknowledgeWarning(warning.id);
      if (idx < warnings.length - 1) {
        setIdx(i => i + 1);
      } else {
        onDismiss();
      }
    } catch {
      onDismiss();
    } finally {
      setAcknowledging(false);
    }
  }

  const levelColor = WARNING_LEVEL_COLORS[warning.level] ?? colors.textSub;

  return (
    <Modal visible transparent animationType="fade">
      <View style={warningStyles.overlay}>
        <View style={warningStyles.card}>
          <Text style={warningStyles.header}>⚠ LEAGUE WARNING</Text>
          <View style={[warningStyles.levelBadge, { backgroundColor: levelColor + '20', borderColor: levelColor + '60' }]}>
            <Text style={[warningStyles.levelText, { color: levelColor }]}>{warning.level}</Text>
          </View>
          <Text style={warningStyles.reason}>{warning.reason}</Text>
          <Text style={warningStyles.sub}>
            {idx + 1} of {warnings.length} unacknowledged warning{warnings.length > 1 ? 's' : ''}
          </Text>
          <TouchableOpacity
            style={[warningStyles.btn, { opacity: acknowledging ? 0.6 : 1 }]}
            onPress={handleAcknowledge}
            disabled={acknowledging}
            activeOpacity={0.8}
          >
            <Text style={warningStyles.btnText}>{acknowledging ? 'ACKNOWLEDGING…' : 'I UNDERSTAND'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

export default function HomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { setTournamentId } = useContext(TournamentContext);
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pendingWarnings, setPendingWarnings] = useState<UserWarning[]>([]);
  const [profile, setProfile] = useState<AnglerProfile | null>(null);
  const [commentSubmissionId, setCommentSubmissionId] = useState<string | null>(null);

  useEffect(() => {
    api.getMyWarnings()
      .then(ws => { if (ws.length > 0) setPendingWarnings(ws); })
      .catch(() => {});
    api.getMyProfile()
      .then(p => { if (p) setProfile(p); })
      .catch(() => {});
    drainQueue()
      .then(({ succeeded }) => {
        if (succeeded > 0) {
          Alert.alert('Catch Submitted', `${succeeded} queued catch${succeeded > 1 ? 'es' : ''} submitted successfully.`);
        }
      })
      .catch(() => {});
  }, []);

  async function load(isRefresh = false) {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const t = await api.getActiveTournament();
      setTournament(t);
      setTournamentId(t.id);
      const items = await api.getFeed(t.id);
      setFeed(items);
    } catch {
      // no active tournament or network issue
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useFocusEffect(useCallback(() => { load(); }, []));

  const region = tournament?.region?.name ?? 'All Regions';

  function handleSignOut() {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out', style: 'destructive',
        onPress: async () => { await storage.deleteToken(); navigation.replace('Login'); },
      },
    ]);
  }

  function handleAvatarPress() {
    Alert.alert(profile?.user?.displayName ?? 'My Account', undefined, [
      { text: 'View Profile', onPress: () => navigation.navigate('Profile' as any) },
      { text: 'Sign Out', style: 'destructive', onPress: handleSignOut },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {pendingWarnings.length > 0 && (
        <WarningsModal warnings={pendingWarnings} onDismiss={() => setPendingWarnings([])} />
      )}
      {commentSubmissionId && (
        <CommentsModal
          submissionId={commentSubmissionId}
          myUserId={profile?.userId ?? null}
          onClose={() => setCommentSubmissionId(null)}
        />
      )}
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.accent} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <FishLeagueLogoFull width={240} />
          <TouchableOpacity onPress={handleAvatarPress} style={styles.avatarBtn} activeOpacity={0.8}>
            {profile?.profilePhotoUrl ? (
              <Image source={{ uri: profile.profilePhotoUrl }} style={styles.avatarImg} />
            ) : (
              <View style={styles.avatarInitials}>
                <Text style={styles.avatarInitialsText}>{getInitials(profile?.user?.displayName ?? '?')}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingWrap}>
            <Image source={require('../../../assets/icon.png')} style={{ width: 100, height: 100 }} resizeMode="contain" />
            <ActivityIndicator size="small" color={colors.accent} style={{ marginTop: 16 }} />
          </View>
        ) : (
          <>
            {tournament && <TournamentBanner tournament={tournament} />}
            {!tournament && (
              <View style={styles.noTournamentCard}>
                <Text style={styles.noTournamentTitle}>NO ACTIVE TOURNAMENT</Text>
                <Text style={styles.noTournamentSub}>Check back when a new week opens.</Text>
              </View>
            )}

            <TouchableOpacity style={styles.forecastCard} onPress={() => navigation.navigate('Forecast')} activeOpacity={0.85}>
              <View style={{ flex: 1 }}>
                <Text style={styles.forecastLabel}>⚡ FISHING INTELLIGENCE</Text>
                <Text style={styles.forecastSub}>Weather, bite windows & recommendations</Text>
              </View>
              <Text style={styles.forecastArrow}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.hotSpotsCard} onPress={() => navigation.navigate('HotSpots')} activeOpacity={0.85}>
              <View style={{ flex: 1 }}>
                <Text style={styles.hotSpotsLabel}>🗺️ CATCH HOT SPOTS</Text>
                <Text style={styles.hotSpotsSub}>See where fish are being caught</Text>
              </View>
              <Text style={styles.forecastArrow}>›</Text>
            </TouchableOpacity>

            {feed.length > 0 && (
              <>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionLabel}>RECENT CATCHES</Text>
                  <View style={styles.sectionLine} />
                </View>
                {feed.map(item => (
                  <FeedCard
                    key={item.submissionId}
                    item={item}
                    region={region}
                    onComment={() => setCommentSubmissionId(item.submissionId)}
                  />
                ))}
              </>
            )}

            {feed.length === 0 && tournament && (
              <View style={styles.emptyFeed}>
                <Text style={styles.emptyFeedText}>No catches yet — be the first!</Text>
                <Text style={styles.emptyFeedSub}>Submit a catch to appear on the leaderboard.</Text>
              </View>
            )}
          </>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  scroll: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.bg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  avatarBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    overflow: 'hidden',
  },
  avatarImg: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2,
    borderColor: colors.borderGold,
  },
  avatarInitials: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surfaceHigh,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitialsText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSub,
  },
  loadingWrap: {
    paddingTop: 60,
    alignItems: 'center',
  },
  forecastCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.accent + '50',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  forecastLabel: {
    ...typography.label,
    color: colors.accent,
    marginBottom: 3,
  },
  forecastSub: {
    ...typography.caption,
    color: colors.textMuted,
  },
  forecastArrow: {
    fontSize: 22,
    color: colors.accent,
    marginLeft: 8,
  },
  hotSpotsCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  hotSpotsLabel: {
    ...typography.label,
    color: colors.text,
    marginBottom: 3,
  },
  hotSpotsSub: {
    ...typography.caption,
    color: colors.textMuted,
  },
  tournamentBanner: {
    margin: 16,
    backgroundColor: colors.surfaceCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderGold,
    padding: 16,
  },
  tournamentBannerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  activeBadge: {
    backgroundColor: colors.accent,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  activeBadgeText: {
    ...typography.labelSm,
    color: colors.bg,
  },
  tournamentCountdown: {
    ...typography.caption,
    color: colors.textSub,
  },
  tournamentName: {
    ...typography.displaySm,
    color: colors.text,
    marginBottom: 6,
  },
  tournamentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tournamentMetaText: {
    ...typography.caption,
    color: colors.textMuted,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 20,
    marginBottom: 12,
    gap: 10,
  },
  sectionLabel: {
    ...typography.label,
    color: colors.textDarkMuted,
  },
  sectionLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.borderGold + '60',
  },
  feedCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: colors.white,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  feedCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 10,
  },
  feedAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceHigh,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  feedAvatarImg: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  feedAvatarText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
  },
  releasedBadge: {
    backgroundColor: '#0F3A1E',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: colors.verified + '50',
  },
  releasedBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.verified,
    letterSpacing: 0.5,
  },
  feedAnglerName: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'Inter_500Medium',
    color: colors.charcoal,
  },
  feedUsername: {
    fontSize: 11,
    color: colors.textDarkMuted,
    marginTop: 1,
  },
  verifiedBadge: {
    backgroundColor: colors.verifiedBg,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: colors.verified + '50',
  },
  verifiedBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.verified,
    letterSpacing: 0.5,
  },
  feedDots: {
    color: colors.textMuted,
    fontSize: 16,
    paddingLeft: 4,
  },
  feedPhotoPlaceholder: {
    height: 200,
    backgroundColor: colors.surfaceCard,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  feedFishInfo: {
    alignItems: 'center',
  },
  feedFishInfoOverlay: {
    backgroundColor: 'rgba(46,61,56,0.65)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  feedFishLengthLabel: {
    ...typography.labelSm,
    color: colors.textMuted,
    marginBottom: 4,
  },
  feedFishLength: {
    ...typography.numLg,
    color: colors.accent,
  },
  feedFishLengthIn: {
    ...typography.bodyMd,
    color: colors.textSub,
    marginTop: 4,
  },
  feedRankBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: colors.accent,
    borderRadius: 20,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedRankBadgeText: {
    fontSize: 12,
    fontWeight: '900',
    color: colors.bg,
  },
  feedCaption: {
    padding: 12,
    paddingBottom: 8,
  },
  feedCaptionText: {
    ...typography.bodyMd,
    color: colors.textDarkSub,
    letterSpacing: 0.3,
  },
  feedMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  feedMetaText: {
    ...typography.caption,
    color: colors.textDarkMuted,
  },
  feedMetaDot: {
    color: colors.textDarkMuted,
    fontSize: 12,
  },
  feedActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  feedActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 5,
  },
  feedActionIcon: {
    fontSize: 13,
  },
  feedActionText: {
    ...typography.labelSm,
    color: colors.textMuted,
  },
  feedActionBtnActive: {
    backgroundColor: colors.accent + '15',
  },
  feedActionDivider: {
    width: 1,
    backgroundColor: colors.border,
    marginVertical: 8,
  },
  noTournamentCard: {
    margin: 16,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 24,
    alignItems: 'center',
  },
  noTournamentTitle: {
    ...typography.displaySm,
    color: colors.textMuted,
    marginBottom: 8,
  },
  noTournamentSub: {
    ...typography.bodyMd,
    color: colors.textMuted,
    textAlign: 'center',
  },
  emptyFeed: {
    margin: 16,
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyFeedText: {
    ...typography.displaySm,
    color: colors.textMuted,
    marginBottom: 8,
  },
  emptyFeedSub: {
    ...typography.bodyMd,
    color: colors.textMuted,
    textAlign: 'center',
  },
});

const cm = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 20, paddingHorizontal: 20, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  title: { ...typography.displaySm, color: colors.text },
  closeBtn: { fontSize: 18, color: colors.textSub, paddingLeft: 16 },
  empty: { ...typography.bodyMd, color: colors.textMuted, textAlign: 'center', paddingTop: 40 },
  comment: {
    flexDirection: 'row', backgroundColor: colors.surface,
    borderRadius: 10, padding: 12, borderWidth: 1, borderColor: colors.border,
  },
  commentName: { ...typography.label, color: colors.accent, marginBottom: 4 },
  commentBody: { ...typography.bodyMd, color: colors.text, lineHeight: 20 },
  commentTime: { ...typography.caption, color: colors.textMuted, marginTop: 4 },
  editHint: { color: colors.textMuted, fontSize: 18, paddingLeft: 12, alignSelf: 'center', letterSpacing: 1 },
  editRow: { marginTop: 6 },
  editInput: {
    ...typography.bodyMd, color: colors.text,
    backgroundColor: colors.bg, borderRadius: 8, borderWidth: 1,
    borderColor: colors.accent + '80', paddingHorizontal: 10, paddingVertical: 8,
    maxHeight: 80,
  },
  editActions: { flexDirection: 'row', gap: 8, marginTop: 8 },
  editSaveBtn: {
    backgroundColor: colors.accent, borderRadius: 6,
    paddingHorizontal: 14, paddingVertical: 6,
  },
  editSaveBtnText: { ...typography.button, color: colors.bg, fontSize: 12 },
  editCancelBtn: {
    borderRadius: 6, paddingHorizontal: 14, paddingVertical: 6,
    borderWidth: 1, borderColor: colors.border,
  },
  editCancelBtnText: { ...typography.button, color: colors.textMuted, fontSize: 12 },
  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 10,
    padding: 16, borderTopWidth: 1, borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  input: {
    flex: 1, ...typography.bodyMd, color: colors.text,
    backgroundColor: colors.bg, borderRadius: 10, borderWidth: 1,
    borderColor: colors.border, paddingHorizontal: 12, paddingVertical: 10,
    maxHeight: 100,
  },
  sendBtn: {
    backgroundColor: colors.accent, borderRadius: 10,
    paddingHorizontal: 16, paddingVertical: 10,
  },
  sendBtnText: { ...typography.button, color: colors.bg, fontSize: 13 },
});

const warningStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  header: {
    fontSize: 18,
    fontWeight: '900',
    fontFamily: 'Oswald_700Bold',
    color: colors.text,
    marginBottom: 16,
    letterSpacing: 1,
  },
  levelBadge: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginBottom: 16,
  },
  levelText: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  reason: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: colors.text,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 12,
  },
  sub: {
    fontSize: 12,
    color: colors.textSub,
    marginBottom: 20,
  },
  btn: {
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 32,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  btnText: {
    fontSize: 14,
    fontWeight: '800',
    fontFamily: 'Inter_600SemiBold',
    color: colors.bg,
    letterSpacing: 0.8,
  },
});
