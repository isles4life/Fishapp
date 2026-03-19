import React, { useCallback, useContext, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  FlatList, ActivityIndicator, SafeAreaView, ScrollView, Modal, Pressable, Image, Share,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as api from '../../services/api';
import { storage } from '../../services/storage';
import { getPendingQueue, drainQueue, removeFromQueue } from '../../services/submissionQueue';
import type { Tournament, MySubmission, AnglerProfile } from '../../models';
import type { QueuedSubmission } from '../../services/submissionQueue';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { TournamentContext } from '../../navigation';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

function statusColor(status: string): string {
  if (status === 'APPROVED') return colors.verified;
  if (status === 'REJECTED') return colors.error;
  return colors.warning;
}

function statusLabel(status: string): string {
  if (status === 'APPROVED') return '✓ APPROVED';
  if (status === 'REJECTED') return '✕ REJECTED';
  return '⏳ PENDING';
}

function SubmissionRow({ item }: { item: MySubmission }) {
  const sc = statusColor(item.status);
  return (
    <View style={styles.submissionRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.submissionLength}>{(item.fishLengthCm / 2.54).toFixed(1)}"</Text>
        <Text style={styles.submissionDate}>
          {new Date(item.capturedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </Text>
        {item.released && <Text style={styles.releasedLabel}>↩ Released</Text>}
        {item.status === 'REJECTED' && item.rejectionNote ? (
          <Text style={styles.rejectionNote}>"{item.rejectionNote}"</Text>
        ) : null}
      </View>
      <View style={[styles.statusBadge, { backgroundColor: sc + '20', borderColor: sc + '50' }]}>
        <Text style={[styles.statusText, { color: sc }]}>{statusLabel(item.status)}</Text>
      </View>
    </View>
  );
}

export default function TournamentScreen() {
  const navigation = useNavigation<NavProp>();
  const { setTournamentId } = useContext(TournamentContext);
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [submissions, setSubmissions] = useState<MySubmission[]>([]);
  const [profile, setProfile] = useState<AnglerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'active' | 'upcoming'>('active');
  const [pendingQueue, setPendingQueue] = useState<QueuedSubmission[]>([]);
  const [retrying, setRetrying] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      async function load() {
        setLoading(true);
        try {
          const [t, p, pq] = await Promise.all([
            api.getActiveTournament(),
            api.getMyProfile().catch(() => null),
            getPendingQueue(),
          ]);
          if (!active) return;
          setTournament(t);
          setProfile(p);
          setPendingQueue(pq);
          setTournamentId(t.id);
          const subs = await api.getMySubmissions(t.id);
          if (!active) return;
          setSubmissions(subs);
        } catch {
          if (active) {
            setTournament(null);
            getPendingQueue().then(pq => { if (active) setPendingQueue(pq); }).catch(() => {});
          }
        } finally {
          if (active) setLoading(false);
        }
      }
      load();
      return () => { active = false; };
    }, [])
  );

  async function handleLogout() {
    await storage.deleteToken();
    navigation.replace('Login');
  }

  async function handleRetryQueue() {
    setRetrying(true);
    try {
      const { succeeded, failed } = await drainQueue();
      const updated = await getPendingQueue();
      setPendingQueue(updated);
      if (succeeded > 0 && tournament) {
        const subs = await api.getMySubmissions(tournament.id);
        setSubmissions(subs);
      }
      if (succeeded > 0 && failed === 0) Alert.alert('All Uploaded', `${succeeded} catch${succeeded > 1 ? 'es' : ''} submitted successfully.`);
      else if (succeeded > 0) Alert.alert('Partial Upload', `${succeeded} uploaded, ${failed} still pending.`);
      else Alert.alert('Still Offline', 'Could not reach the server. Catches remain saved locally.');
    } catch { /* ignore */ }
    setRetrying(false);
  }

  async function handleDiscardQueued(id: string) {
    await removeFromQueue(id);
    setPendingQueue(prev => prev.filter(q => q.id !== id));
  }

  const initials = (name: string) =>
    name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  const displayName = profile?.user?.displayName ?? '';

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>TOURNAMENTS</Text>
        <TouchableOpacity onPress={() => setMenuOpen(true)} style={styles.avatarBtn} activeOpacity={0.8}>
          {profile?.profilePhotoUrl ? (
            <Image source={{ uri: profile.profilePhotoUrl }} style={styles.avatarImg} />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarInitials}>{initials(displayName || '?')}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Profile dropdown modal */}
      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setMenuOpen(false)}>
          <View style={styles.menuCard}>
            {profile && (
              <View style={styles.menuHeader}>
                {profile.profilePhotoUrl ? (
                  <Image source={{ uri: profile.profilePhotoUrl }} style={styles.menuAvatar} />
                ) : (
                  <View style={[styles.menuAvatar, styles.menuAvatarFallback]}>
                    <Text style={styles.menuAvatarText}>{initials(displayName || '?')}</Text>
                  </View>
                )}
                <View>
                  <Text style={styles.menuName}>{displayName}</Text>
                  <Text style={styles.menuUsername}>@{profile.username}</Text>
                </View>
              </View>
            )}
            <View style={styles.menuDivider} />
            <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
              <Text style={[styles.menuItemText, { color: colors.error }]}>Sign Out</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Tab selector */}
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'active' && styles.tabBtnActive]}
            onPress={() => setActiveTab('active')}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabBtnText, activeTab === 'active' && styles.tabBtnTextActive]}>ACTIVE</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'upcoming' && styles.tabBtnActive]}
            onPress={() => setActiveTab('upcoming')}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabBtnText, activeTab === 'upcoming' && styles.tabBtnTextActive]}>UPCOMING</Text>
          </TouchableOpacity>
        </View>

        {/* Active tournament card */}
        {activeTab === 'active' && (
          <>
            {tournament ? (
              <View style={styles.tournamentCard}>
                <View style={styles.tournamentCardTop}>
                  <View style={styles.activePill}>
                    <Text style={styles.activePillText}>ACTIVE</Text>
                  </View>
                  <Text style={styles.tournamentWeek}>Week {tournament.weekNumber}</Text>
                </View>
                <Text style={styles.tournamentCardName}>{tournament.name}</Text>
                <Text style={styles.tournamentRegion}>{tournament.region?.name ?? 'All Regions'}</Text>

                <View style={styles.tournamentStatsRow}>
                  <View style={styles.tournamentStat}>
                    <Text style={styles.tournamentStatVal}>{submissions.length}</Text>
                    <Text style={styles.tournamentStatLabel}>MY CATCHES</Text>
                  </View>
                  <View style={styles.tournamentStatDivider} />
                  <View style={styles.tournamentStat}>
                    <Text style={styles.tournamentStatVal}>
                      {tournament.endsAt
                        ? Math.max(0, Math.ceil((new Date(tournament.endsAt).getTime() - Date.now()) / 86400000))
                        : '—'}
                    </Text>
                    <Text style={styles.tournamentStatLabel}>DAYS LEFT</Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.submitCatchBtn}
                  activeOpacity={0.85}
                  onPress={() => navigation.navigate('Submission', { tournamentId: tournament.id })}
                >
                  <Text style={styles.submitCatchBtnText}>SUBMIT A CATCH</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.shareBtn}
                  activeOpacity={0.75}
                  onPress={() => Share.share({
                    message: `Watch the live leaderboard for ${tournament.name} 🎣\nhttps://www.fishleague.app/leaderboard/${tournament.id}`,
                    url: `https://www.fishleague.app/leaderboard/${tournament.id}`,
                  })}
                >
                  <Text style={styles.shareBtnText}>🔗 Share Leaderboard</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>NO ACTIVE TOURNAMENT</Text>
                <Text style={styles.emptySub}>Check back when a new week opens.</Text>
              </View>
            )}

            {/* Pending Upload Queue */}
            {pendingQueue.length > 0 && (
              <>
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionLabel, { color: colors.warning }]}>⏳ PENDING UPLOADS</Text>
                  <View style={[styles.sectionLine, { backgroundColor: colors.warning + '40' }]} />
                </View>
                <View style={styles.queueBanner}>
                  <Text style={styles.queueBannerText}>
                    {pendingQueue.length} catch{pendingQueue.length > 1 ? 'es' : ''} saved locally — not yet submitted.
                  </Text>
                  {pendingQueue.map(q => (
                    <View key={q.id} style={styles.queueItem}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.queueItemLength}>
                          {(parseFloat(q.fields.fishLengthCm) / 2.54).toFixed(1)}"
                          {q.fields.speciesName ? `  ·  ${q.fields.speciesName}` : ''}
                        </Text>
                        <Text style={styles.queueItemDate}>
                          Saved {new Date(q.queuedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                        </Text>
                      </View>
                      <TouchableOpacity onPress={() => handleDiscardQueued(q.id)} style={styles.queueDiscard}>
                        <Text style={styles.queueDiscardText}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                  <TouchableOpacity style={styles.retryBtn} onPress={handleRetryQueue} disabled={retrying} activeOpacity={0.8}>
                    <Text style={styles.retryBtnText}>{retrying ? 'Retrying...' : '↑ Retry Upload Now'}</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {/* My Submissions */}
            {tournament && (
              <>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionLabel}>MY SUBMISSIONS</Text>
                  <View style={styles.sectionLine} />
                </View>
                {submissions.length === 0 ? (
                  <View style={styles.emptySubmissions}>
                    <Text style={styles.emptySubmissionsText}>No submissions yet</Text>
                    <Text style={styles.emptySubmissionsSub}>Go catch something!</Text>
                  </View>
                ) : (
                  submissions.map(item => <SubmissionRow key={item.id} item={item} />)
                )}
              </>
            )}
          </>
        )}

        {activeTab === 'upcoming' && (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>UPCOMING TOURNAMENTS</Text>
            <Text style={styles.emptySub}>New weekly tournaments open every Monday.</Text>
          </View>
        )}

        {/* Past Tournaments link */}
        <TouchableOpacity
          style={styles.historyBtn}
          onPress={() => navigation.navigate('TournamentHistory')}
          activeOpacity={0.75}
        >
          <Text style={styles.historyBtnText}>View Past Tournaments →</Text>
        </TouchableOpacity>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 52,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    ...typography.displayMd,
    color: colors.text,
  },
  avatarBtn: {
    padding: 2,
  },
  avatarImg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: colors.accent,
  },
  avatarFallback: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceHigh,
    borderWidth: 2,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSub,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 90,
    paddingRight: 16,
  },
  menuCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    minWidth: 220,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  menuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
  },
  menuAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  menuAvatarFallback: {
    backgroundColor: colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  menuAvatarText: {
    color: colors.textSub,
    fontSize: 16,
    fontWeight: '700',
  },
  menuName: {
    ...typography.bodyMd,
    color: colors.text,
    fontWeight: '700',
  },
  menuUsername: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  menuDivider: {
    height: 1,
    backgroundColor: colors.border,
  },
  menuItem: {
    padding: 14,
    paddingHorizontal: 16,
  },
  menuItemText: {
    ...typography.bodyMd,
    color: colors.text,
    fontWeight: '600',
  },
  tabRow: {
    flexDirection: 'row',
    margin: 16,
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  tabBtnActive: {
    backgroundColor: colors.surfaceHigh,
    borderBottomWidth: 2,
    borderBottomColor: colors.accent,
  },
  tabBtnText: {
    ...typography.label,
    color: colors.textMuted,
  },
  tabBtnTextActive: {
    color: colors.accent,
  },
  tournamentCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: colors.surfaceCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderGold,
    padding: 18,
  },
  tournamentCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  activePill: {
    backgroundColor: colors.accent,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  activePillText: {
    ...typography.labelSm,
    color: colors.bg,
  },
  tournamentWeek: {
    ...typography.caption,
    color: colors.textMuted,
  },
  tournamentCardName: {
    ...typography.displaySm,
    color: colors.text,
    marginBottom: 4,
  },
  tournamentRegion: {
    ...typography.caption,
    color: colors.textSub,
    marginBottom: 16,
  },
  tournamentStatsRow: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  tournamentStat: {
    flex: 1,
    alignItems: 'center',
  },
  tournamentStatVal: {
    ...typography.numMd,
    color: colors.accent,
  },
  tournamentStatLabel: {
    ...typography.labelSm,
    color: colors.textMuted,
    marginTop: 2,
  },
  tournamentStatDivider: {
    width: 1,
    backgroundColor: colors.border,
    marginVertical: 4,
  },
  submitCatchBtn: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  submitCatchBtnText: {
    ...typography.button,
    color: colors.bg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 10,
  },
  sectionLabel: {
    ...typography.label,
    color: colors.textMuted,
  },
  sectionLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  queueBanner: {
    marginHorizontal: 16, marginBottom: 16,
    backgroundColor: colors.warning + '12',
    borderRadius: 12, borderWidth: 1, borderColor: colors.warning + '40',
    padding: 14,
  },
  queueBannerText: { ...typography.caption, color: colors.warning, marginBottom: 10 },
  queueItem: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface, borderRadius: 8,
    padding: 10, marginBottom: 6,
  },
  queueItemLength: { ...typography.label, color: colors.text },
  queueItemDate: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  queueDiscard: { padding: 6 },
  queueDiscardText: { color: colors.textMuted, fontSize: 16 },
  retryBtn: {
    marginTop: 8, paddingVertical: 10, alignItems: 'center',
    backgroundColor: colors.warning + '20', borderRadius: 8,
    borderWidth: 1, borderColor: colors.warning + '60',
  },
  retryBtnText: { ...typography.label, color: colors.warning },
  submissionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  submissionLength: {
    ...typography.numMd,
    color: colors.text,
  },
  submissionDate: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  releasedLabel: {
    ...typography.caption,
    color: colors.verified,
    marginTop: 2,
    fontSize: 11,
  },
  rejectionNote: {
    ...typography.caption,
    color: colors.error,
    marginTop: 4,
    fontStyle: 'italic',
  },
  statusBadge: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusText: {
    ...typography.labelSm,
  },
  emptyCard: {
    margin: 16,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 32,
    alignItems: 'center',
  },
  emptyTitle: {
    ...typography.displaySm,
    color: colors.textMuted,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySub: {
    ...typography.bodyMd,
    color: colors.textMuted,
    textAlign: 'center',
  },
  shareBtn: {
    marginTop: 10, paddingVertical: 11, alignItems: 'center',
    borderRadius: 10, borderWidth: 1, borderColor: colors.border,
  },
  shareBtnText: { ...typography.label, color: colors.textSub },
  historyBtn: {
    marginHorizontal: 16, marginTop: 20,
    paddingVertical: 12, alignItems: 'center',
    borderRadius: 10, borderWidth: 1, borderColor: colors.border,
  },
  historyBtnText: { ...typography.label, color: colors.accent },
  emptySubmissions: {
    alignItems: 'center',
    paddingVertical: 24,
    marginHorizontal: 16,
  },
  emptySubmissionsText: {
    ...typography.bodyMd,
    color: colors.textSub,
  },
  emptySubmissionsSub: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 4,
  },
});
