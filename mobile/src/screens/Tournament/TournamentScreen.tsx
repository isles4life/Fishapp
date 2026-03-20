import React, { useCallback, useContext, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, SafeAreaView, ScrollView, Modal, Pressable, Image, Share, Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as Location from 'expo-location';
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

function isEligible(t: Tournament, loc: { lat: number; lng: number } | null): boolean {
  if (!loc) return false;
  const r = t.region;
  if (!r || r.minLat == null || r.maxLat == null || r.minLng == null || r.maxLng == null) return true;
  return loc.lat >= r.minLat && loc.lat <= r.maxLat && loc.lng >= r.minLng && loc.lng <= r.maxLng;
}

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
  const { setTournamentId, setScoringMethod } = useContext(TournamentContext);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [myLocation, setMyLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationStatus, setLocationStatus] = useState<'loading' | 'granted' | 'denied'>('loading');
  const [submissions, setSubmissions] = useState<Record<string, MySubmission[]>>({});
  const [profile, setProfile] = useState<AnglerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [pendingQueue, setPendingQueue] = useState<QueuedSubmission[]>([]);
  const [retrying, setRetrying] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      async function load() {
        setLoading(true);
        try {
          const [ts, p, pq] = await Promise.all([
            api.getOpenTournaments(),
            api.getMyProfile().catch(() => null),
            getPendingQueue(),
          ]);
          if (!active) return;
          setTournaments(ts);
          setProfile(p);
          setPendingQueue(pq);

          // Get GPS location
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (!active) return;
          if (status !== 'granted') {
            setLocationStatus('denied');
          } else {
            setLocationStatus('granted');
            try {
              const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
              if (!active) return;
              const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
              setMyLocation(loc);

              // Load submissions for each eligible tournament
              const eligible = ts.filter(t => isEligible(t, loc));
              const subResults = await Promise.all(
                eligible.map(t => api.getMySubmissions(t.id).then(subs => ({ id: t.id, subs })).catch(() => ({ id: t.id, subs: [] as MySubmission[] })))
              );
              if (!active) return;
              const subsMap: Record<string, MySubmission[]> = {};
              subResults.forEach(r => { subsMap[r.id] = r.subs; });
              setSubmissions(subsMap);

              // Set context to first eligible tournament
              if (eligible.length > 0) {
                setTournamentId(eligible[0].id);
                setScoringMethod(eligible[0].scoringMethod ?? 'LENGTH');
              }
            } catch {
              setLocationStatus('denied');
            }
          }
        } catch {
          if (active) setTournaments([]);
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
      if (succeeded > 0) {
        // Refresh submissions for eligible tournaments
        const eligibleIds = tournaments.filter(t => isEligible(t, myLocation)).map(t => t.id);
        const subResults = await Promise.all(
          eligibleIds.map(id => api.getMySubmissions(id).then(subs => ({ id, subs })).catch(() => ({ id, subs: [] as MySubmission[] })))
        );
        const subsMap: Record<string, MySubmission[]> = {};
        subResults.forEach(r => { subsMap[r.id] = r.subs; });
        setSubmissions(subsMap);
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

  function handleSubmit(t: Tournament) {
    setTournamentId(t.id);
    setScoringMethod(t.scoringMethod ?? 'LENGTH');
    // Paid tournaments must go through TournamentDetail to handle payment
    if (t.entryFeeCents > 0) {
      navigation.navigate('TournamentDetail', { tournamentId: t.id });
    } else {
      navigation.navigate('Submission', { tournamentId: t.id, scoringMethod: t.scoringMethod ?? 'LENGTH' });
    }
  }

  const initials = (name: string) =>
    name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  const displayName = profile?.user?.displayName ?? '';

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingWrap}>
          <Image source={require('../../../assets/icon.png')} style={{ width: 100, height: 100 }} resizeMode="contain" />
          <ActivityIndicator size="small" color={colors.accent} style={{ marginTop: 16 }} />
        </View>
      </SafeAreaView>
    );
  }

  const eligible = tournaments.filter(t => isEligible(t, myLocation));
  const ineligible = tournaments.filter(t => !isEligible(t, myLocation));
  const allSubs = Object.values(submissions).flat();

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

        {/* Location denied banner */}
        {locationStatus === 'denied' && (
          <View style={styles.locationBanner}>
            <Text style={styles.locationBannerText}>
              📍 Enable location to see which tournaments you're eligible for
            </Text>
          </View>
        )}

        {/* No open tournaments */}
        {tournaments.length === 0 && (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>NO ACTIVE TOURNAMENTS</Text>
            <Text style={styles.emptySub}>Check back when a new tournament opens.</Text>
          </View>
        )}

        {/* Eligible tournaments */}
        {eligible.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionLabel, { color: colors.verified }]}>✅ YOUR REGION</Text>
              <View style={[styles.sectionLine, { backgroundColor: colors.verified + '40' }]} />
            </View>
            {eligible.map(t => {
              const mySubs = submissions[t.id] ?? [];
              const daysLeft = Math.max(0, Math.ceil((new Date(t.endsAt).getTime() - Date.now()) / 86400000));
              return (
                <View key={t.id} style={[styles.tournamentCard, styles.tournamentCardEligible]}>
                  <View style={styles.tournamentCardTop}>
                    <View style={styles.activePill}>
                      <Text style={styles.activePillText}>OPEN</Text>
                    </View>
                    <Text style={styles.tournamentWeek}>Week {t.weekNumber}</Text>
                  </View>
                  <Text style={styles.tournamentCardName}>{t.name}</Text>
                  <Text style={styles.tournamentRegion}>{t.region?.name ?? 'All Regions'}</Text>

                  <View style={styles.tournamentStatsRow}>
                    <View style={styles.tournamentStat}>
                      <Text style={styles.tournamentStatVal}>{mySubs.length}</Text>
                      <Text style={styles.tournamentStatLabel}>MY CATCHES</Text>
                    </View>
                    <View style={styles.tournamentStatDivider} />
                    <View style={styles.tournamentStat}>
                      <Text style={styles.tournamentStatVal}>{daysLeft}</Text>
                      <Text style={styles.tournamentStatLabel}>DAYS LEFT</Text>
                    </View>
                    {t._count != null && (
                      <>
                        <View style={styles.tournamentStatDivider} />
                        <View style={styles.tournamentStat}>
                          <Text style={styles.tournamentStatVal}>{t._count.submissions}</Text>
                          <Text style={styles.tournamentStatLabel}>CATCHES</Text>
                        </View>
                      </>
                    )}
                  </View>

                  <TouchableOpacity
                    style={styles.submitCatchBtn}
                    activeOpacity={0.85}
                    onPress={() => handleSubmit(t)}
                  >
                    <Text style={styles.submitCatchBtnText}>SUBMIT A CATCH</Text>
                  </TouchableOpacity>
                  <View style={styles.cardBtnRow}>
                    <TouchableOpacity
                      style={[styles.cardBtn, { flex: 1 }]}
                      activeOpacity={0.75}
                      onPress={() => Share.share({
                        message: `Watch the live leaderboard for ${t.name} 🎣\nhttps://www.fishleague.app/leaderboard/${t.id}`,
                        url: `https://www.fishleague.app/leaderboard/${t.id}`,
                      })}
                    >
                      <Text style={styles.cardBtnText}>🔗 Share</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.cardBtn, { flex: 1 }]}
                      activeOpacity={0.75}
                      onPress={() => navigation.navigate('CheckIn')}
                    >
                      <Text style={styles.cardBtnText}>📱 Check In</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.cardBtn, { flex: 1 }]}
                      activeOpacity={0.75}
                      onPress={() => navigation.navigate('TournamentDetail', { tournamentId: t.id })}
                    >
                      <Text style={styles.cardBtnText}>Details →</Text>
                    </TouchableOpacity>
                  </View>

                  {/* My submissions for this tournament */}
                  {mySubs.length > 0 && (
                    <View style={{ marginTop: 12 }}>
                      <Text style={styles.subsLabel}>MY SUBMISSIONS</Text>
                      {mySubs.map(item => <SubmissionRow key={item.id} item={item} />)}
                    </View>
                  )}
                </View>
              );
            })}
          </>
        )}

        {/* Ineligible / other region tournaments */}
        {ineligible.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionLabel}>
                {locationStatus === 'denied' ? 'OPEN TOURNAMENTS' : '📍 OTHER REGIONS'}
              </Text>
              <View style={styles.sectionLine} />
            </View>
            {ineligible.map(t => {
              const daysLeft = Math.max(0, Math.ceil((new Date(t.endsAt).getTime() - Date.now()) / 86400000));
              return (
                <View key={t.id} style={styles.tournamentCard}>
                  <View style={styles.tournamentCardTop}>
                    <View style={[styles.activePill, { backgroundColor: colors.surfaceHigh }]}>
                      <Text style={[styles.activePillText, { color: colors.textMuted }]}>OPEN</Text>
                    </View>
                    <Text style={styles.tournamentWeek}>Week {t.weekNumber}</Text>
                  </View>
                  <Text style={[styles.tournamentCardName, { color: colors.textSub }]}>{t.name}</Text>
                  <Text style={styles.tournamentRegion}>{t.region?.name ?? 'All Regions'}</Text>

                  <View style={{ flexDirection: 'row', gap: 16, marginBottom: 12 }}>
                    <Text style={styles.tournamentStatLabel}>{daysLeft} DAYS LEFT</Text>
                    {t._count != null && (
                      <Text style={styles.tournamentStatLabel}>{t._count.submissions} CATCHES</Text>
                    )}
                  </View>

                  {locationStatus === 'granted' && (
                    <View style={styles.ineligibleBadge}>
                      <Text style={styles.ineligibleBadgeText}>📍 Outside your region — view only</Text>
                    </View>
                  )}
                  <TouchableOpacity
                    style={[styles.cardBtn, { marginTop: 8 }]}
                    activeOpacity={0.75}
                    onPress={() => navigation.navigate('TournamentDetail', { tournamentId: t.id })}
                  >
                    <Text style={styles.cardBtnText}>View Details →</Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </>
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
  safeArea: { flex: 1, backgroundColor: colors.bg },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: 52, paddingHorizontal: 20, paddingBottom: 16,
    backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerTitle: { ...typography.displayMd, color: colors.text },
  avatarBtn: { padding: 2 },
  avatarImg: { width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: colors.accent },
  avatarFallback: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surfaceHigh,
    borderWidth: 2, borderColor: colors.accent, alignItems: 'center', justifyContent: 'center',
  },
  avatarInitials: { fontSize: 13, fontWeight: '700', color: colors.textSub },
  modalBackdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-start', alignItems: 'flex-end', paddingTop: 90, paddingRight: 16,
  },
  menuCard: {
    backgroundColor: colors.surface, borderRadius: 14, borderWidth: 1,
    borderColor: colors.border, minWidth: 220, overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 8,
  },
  menuHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  menuAvatar: { width: 44, height: 44, borderRadius: 22 },
  menuAvatarFallback: {
    backgroundColor: colors.surfaceHigh, alignItems: 'center',
    justifyContent: 'center', borderWidth: 1, borderColor: colors.border,
  },
  menuAvatarText: { color: colors.textSub, fontSize: 16, fontWeight: '700' },
  menuName: { ...typography.bodyMd, color: colors.text, fontWeight: '700' },
  menuUsername: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  menuDivider: { height: 1, backgroundColor: colors.border },
  menuItem: { padding: 14, paddingHorizontal: 16 },
  menuItemText: { ...typography.bodyMd, color: colors.text, fontWeight: '600' },
  locationBanner: {
    marginHorizontal: 16, marginTop: 12, marginBottom: 4,
    backgroundColor: colors.accent + '15', borderRadius: 10,
    borderWidth: 1, borderColor: colors.accent + '40', padding: 12,
  },
  locationBannerText: { ...typography.caption, color: colors.accent, textAlign: 'center' },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, marginTop: 16, marginBottom: 8, gap: 10,
  },
  sectionLabel: { ...typography.label, color: colors.textMuted },
  sectionLine: { flex: 1, height: 1, backgroundColor: colors.border },
  tournamentCard: {
    marginHorizontal: 16, marginBottom: 12,
    backgroundColor: colors.surfaceCard, borderRadius: 16,
    borderWidth: 1, borderColor: colors.border, padding: 18,
  },
  tournamentCardEligible: {
    borderColor: colors.verified + '60',
  },
  tournamentCardTop: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10,
  },
  activePill: {
    backgroundColor: colors.accent, borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3,
  },
  activePillText: { ...typography.labelSm, color: colors.bg },
  tournamentWeek: { ...typography.caption, color: colors.textMuted },
  tournamentCardName: { ...typography.displaySm, color: colors.text, marginBottom: 4 },
  tournamentRegion: { ...typography.caption, color: colors.textSub, marginBottom: 16 },
  tournamentStatsRow: {
    flexDirection: 'row', backgroundColor: colors.surface,
    borderRadius: 10, padding: 12, marginBottom: 16,
  },
  tournamentStat: { flex: 1, alignItems: 'center' },
  tournamentStatVal: { ...typography.numMd, color: colors.accent },
  tournamentStatLabel: { ...typography.labelSm, color: colors.textMuted, marginTop: 2 },
  tournamentStatDivider: { width: 1, backgroundColor: colors.border, marginVertical: 4 },
  submitCatchBtn: { backgroundColor: colors.accent, borderRadius: 12, padding: 16, alignItems: 'center' },
  submitCatchBtnText: { ...typography.button, color: colors.bg },
  cardBtnRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  cardBtn: {
    paddingVertical: 11, alignItems: 'center',
    borderRadius: 10, borderWidth: 1, borderColor: colors.border,
  },
  cardBtnText: { ...typography.label, color: colors.textSub },
  ineligibleBadge: {
    backgroundColor: colors.textMuted + '20', borderRadius: 8,
    paddingVertical: 6, paddingHorizontal: 12, alignItems: 'center',
  },
  ineligibleBadgeText: { ...typography.caption, color: colors.textMuted },
  subsLabel: { ...typography.labelSm, color: colors.textMuted, marginBottom: 8, marginLeft: 2 },
  queueBanner: {
    marginHorizontal: 16, marginBottom: 16,
    backgroundColor: colors.warning + '12',
    borderRadius: 12, borderWidth: 1, borderColor: colors.warning + '40', padding: 14,
  },
  queueBannerText: { ...typography.caption, color: colors.warning, marginBottom: 10 },
  queueItem: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface, borderRadius: 8, padding: 10, marginBottom: 6,
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
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 6, backgroundColor: colors.surface, borderRadius: 10,
    padding: 12, borderWidth: 1, borderColor: colors.border,
  },
  submissionLength: { ...typography.numMd, color: colors.text },
  submissionDate: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  releasedLabel: { ...typography.caption, color: colors.verified, marginTop: 2, fontSize: 11 },
  rejectionNote: { ...typography.caption, color: colors.error, marginTop: 4, fontStyle: 'italic' },
  statusBadge: { borderRadius: 8, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { ...typography.labelSm },
  emptyCard: {
    margin: 16, backgroundColor: colors.surface, borderRadius: 16,
    borderWidth: 1, borderColor: colors.border, padding: 32, alignItems: 'center',
  },
  emptyTitle: { ...typography.displaySm, color: colors.textMuted, marginBottom: 8, textAlign: 'center' },
  emptySub: { ...typography.bodyMd, color: colors.textMuted, textAlign: 'center' },
  historyBtn: {
    marginHorizontal: 16, marginTop: 20, paddingVertical: 12,
    alignItems: 'center', borderRadius: 10, borderWidth: 1, borderColor: colors.border,
  },
  historyBtnText: { ...typography.label, color: colors.accent },
});
