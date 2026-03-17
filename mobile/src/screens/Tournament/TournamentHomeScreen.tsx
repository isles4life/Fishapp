import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  FlatList, ActivityIndicator, Image, Modal, Pressable,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation';
import * as api from '../../services/api';
import { storage } from '../../services/storage';
import type { Tournament, MySubmission, AnglerProfile } from '../../models';
import { colors } from '../../theme/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'TournamentHome'>;

export default function TournamentHomeScreen({ navigation }: Props) {
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [submissions, setSubmissions] = useState<MySubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<AnglerProfile | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useFocusEffect(
    useCallback(() => {
      async function load() {
        setLoading(true);
        try {
          const [t, p] = await Promise.all([
            api.getActiveTournament(),
            api.getMyProfile().catch(() => null),
          ]);
          setTournament(t);
          setProfile(p);
          const subs = await api.getMySubmissions(t.id);
          setSubmissions(subs);
        } catch {
          setTournament(null);
        } finally {
          setLoading(false);
        }
      }
      load();
    }, [])
  );

  async function handleLogout() {
    await storage.deleteToken();
    navigation.replace('Login');
  }

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={colors.accent} /></View>;
  }

  if (!tournament) {
    return (
      <View style={styles.center}>
        <Image source={require('../../../assets/icon.png')} style={styles.centerLogo} resizeMode="contain" />
        <Text style={styles.emptyTitle}>No Active Tournament</Text>
        <Text style={styles.emptyText}>Check back when a new week opens.</Text>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const statusColor = (status: string) => {
    if (status === 'APPROVED') return colors.green;
    if (status === 'REJECTED') return colors.red;
    return colors.orange;
  };

  const statusLabel = (status: string) => {
    if (status === 'APPROVED') return '✓ Approved';
    if (status === 'REJECTED') return '✕ Rejected';
    return '⏳ Pending';
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Image source={require('../../../assets/icon.png')} style={styles.headerLogo} resizeMode="contain" />
          <View>
            <Text style={styles.tournamentName}>{tournament.name}</Text>
            <Text style={styles.regionName}>{tournament.region?.name}</Text>
          </View>
        </View>
        {/* Avatar menu trigger */}
        <TouchableOpacity onPress={() => setMenuOpen(true)} style={styles.avatarBtn}>
          {profile?.profilePhotoUrl
            ? <Image source={{ uri: profile.profilePhotoUrl }} style={styles.avatarImg} />
            : <View style={styles.avatarInitialsWrap}>
                <Text style={styles.avatarInitialsText}>
                  {(profile?.user?.displayName ?? '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                </Text>
              </View>
          }
        </TouchableOpacity>
      </View>

      {/* Profile dropdown modal */}
      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setMenuOpen(false)}>
          <View style={styles.menuCard}>
            {profile && (
              <View style={styles.menuHeader}>
                {profile.profilePhotoUrl
                  ? <Image source={{ uri: profile.profilePhotoUrl }} style={styles.menuAvatar} />
                  : <View style={[styles.menuAvatar, styles.menuAvatarFallback]}>
                      <Text style={styles.menuAvatarText}>{(profile.user?.displayName ?? '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}</Text>
                    </View>
                }
                <View>
                  <Text style={styles.menuName}>{profile.user?.displayName}</Text>
                  <Text style={styles.menuUsername}>@{profile.username}</Text>
                </View>
              </View>
            )}
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => { setMenuOpen(false); (navigation as any).navigate('Profile'); }}
            >
              <Text style={styles.menuItemText}>👤  My Profile</Text>
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
              <Text style={[styles.menuItemText, { color: colors.red }]}>Sign Out</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {/* Action Buttons */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => navigation.navigate('Submission', { tournamentId: tournament.id })}
        >
          <Text style={styles.primaryButtonText}>📷  Submit Catch</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => navigation.navigate('Leaderboard', { tournamentId: tournament.id })}
        >
          <Text style={styles.secondaryButtonText}>🏆  Leaderboard</Text>
        </TouchableOpacity>
      </View>

      {/* My Submissions */}
      <Text style={styles.sectionTitle}>My Submissions</Text>
      {submissions.length === 0 ? (
        <View style={styles.emptySubmissions}>
          <Text style={styles.emptySubmissionsText}>No submissions yet</Text>
          <Text style={styles.emptySubmissionsHint}>Go catch something!</Text>
        </View>
      ) : (
        <FlatList
          data={submissions}
          keyExtractor={item => item.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
          renderItem={({ item }) => (
            <View style={styles.submissionRow}>
              <View style={styles.submissionLeft}>
                <Text style={styles.submissionLength}>{item.fishLengthCm} cm</Text>
                <Text style={styles.submissionDate}>
                  {new Date(item.capturedAt).toLocaleDateString()}
                </Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: statusColor(item.status) + '22', borderColor: statusColor(item.status) + '55' }]}>
                <Text style={[styles.submissionStatus, { color: statusColor(item.status) }]}>
                  {statusLabel(item.status)}
                </Text>
              </View>
            </View>
          )}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: colors.bg },
  centerLogo: { width: 90, height: 90, marginBottom: 20, opacity: 0.7 },
  header: {
    backgroundColor: colors.surface,
    padding: 20,
    paddingTop: 56,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerLogo: { width: 38, height: 38 },
  tournamentName: { color: colors.textPrimary, fontSize: 17, fontWeight: '700' },
  regionName: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
  avatarBtn: { padding: 2 },
  avatarImg: { width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, borderColor: colors.border },
  avatarInitialsWrap: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surfaceHigh, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  avatarInitialsText: { color: colors.textSecondary, fontSize: 13, fontWeight: '700' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-start', alignItems: 'flex-end', paddingTop: 80, paddingRight: 16 },
  menuCard: { backgroundColor: colors.surface, borderRadius: 14, borderWidth: 1, borderColor: colors.border, minWidth: 220, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 8 },
  menuHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  menuAvatar: { width: 44, height: 44, borderRadius: 22 },
  menuAvatarFallback: { backgroundColor: colors.surfaceHigh, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  menuAvatarText: { color: colors.textSecondary, fontSize: 16, fontWeight: '700' },
  menuName: { color: colors.textPrimary, fontSize: 15, fontWeight: '700' },
  menuUsername: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  menuItem: { padding: 14, paddingHorizontal: 16 },
  menuItemText: { color: colors.textPrimary, fontSize: 15, fontWeight: '600' },
  menuDivider: { height: 1, backgroundColor: colors.border },
  logoutText: { color: colors.textSecondary, fontSize: 13 },
  actions: { padding: 16, gap: 10 },
  primaryButton: {
    backgroundColor: colors.accent, borderRadius: 12,
    padding: 16, alignItems: 'center',
    shadowColor: colors.accent, shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 },
  },
  primaryButtonText: { color: colors.bg, fontSize: 16, fontWeight: '700' },
  secondaryButton: {
    backgroundColor: colors.surface, borderRadius: 12,
    padding: 16, alignItems: 'center',
    borderWidth: 1, borderColor: colors.border,
  },
  secondaryButtonText: { color: colors.textPrimary, fontSize: 16, fontWeight: '600' },
  sectionTitle: {
    fontSize: 13, fontWeight: '700', color: colors.textMuted,
    paddingHorizontal: 16, marginBottom: 10, letterSpacing: 1,
    textTransform: 'uppercase',
  },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: colors.textPrimary, marginBottom: 8 },
  emptyText: { color: colors.textSecondary, fontSize: 15, textAlign: 'center' },
  emptySubmissions: { alignItems: 'center', paddingVertical: 32 },
  emptySubmissionsText: { color: colors.textSecondary, fontSize: 16 },
  emptySubmissionsHint: { color: colors.textMuted, fontSize: 13, marginTop: 4 },
  submissionRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: colors.surface, padding: 16, borderRadius: 10,
    borderWidth: 1, borderColor: colors.borderLight,
  },
  submissionLeft: { gap: 2 },
  submissionLength: { fontSize: 20, fontWeight: '800', color: colors.textPrimary },
  submissionDate: { fontSize: 12, color: colors.textMuted },
  statusBadge: { borderRadius: 8, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 4 },
  submissionStatus: { fontSize: 12, fontWeight: '700' },
  logoutButton: { marginTop: 24, padding: 12 },
});
