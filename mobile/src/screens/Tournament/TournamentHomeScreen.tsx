import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  FlatList, ActivityIndicator, Image,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation';
import * as api from '../../services/api';
import { storage } from '../../services/storage';
import type { Tournament, MySubmission } from '../../models';
import { colors } from '../../theme/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'TournamentHome'>;

export default function TournamentHomeScreen({ navigation }: Props) {
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [submissions, setSubmissions] = useState<MySubmission[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      async function load() {
        setLoading(true);
        try {
          const t = await api.getActiveTournament();
          setTournament(t);
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
    return <View style={styles.center}><ActivityIndicator size="large" color={colors.green} /></View>;
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
    if (status === 'approved') return colors.green;
    if (status === 'rejected') return colors.red;
    return colors.orange;
  };

  const statusLabel = (status: string) => {
    if (status === 'approved') return '✓ Approved';
    if (status === 'rejected') return '✕ Rejected';
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
        <TouchableOpacity onPress={handleLogout} style={styles.logoutPill}>
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

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
  logoutPill: {
    borderWidth: 1, borderColor: colors.border,
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5,
  },
  logoutText: { color: colors.textSecondary, fontSize: 13 },
  actions: { padding: 16, gap: 10 },
  primaryButton: {
    backgroundColor: colors.green, borderRadius: 12,
    padding: 16, alignItems: 'center',
    shadowColor: colors.green, shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 },
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
