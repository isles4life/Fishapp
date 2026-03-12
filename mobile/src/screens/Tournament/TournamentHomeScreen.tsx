import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  FlatList, ActivityIndicator, Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation';
import * as api from '../../services/api';
import { storage } from '../../services/storage';
import type { Tournament, MySubmission } from '../../models';

type Props = NativeStackScreenProps<RootStackParamList, 'TournamentHome'>;

export default function TournamentHomeScreen({ navigation }: Props) {
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [submissions, setSubmissions] = useState<MySubmission[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
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
  }, []);

  useFocusEffect(load);

  async function handleLogout() {
    await storage.deleteToken();
    navigation.replace('Login');
  }

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#1a5276" /></View>;
  }

  if (!tournament) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyTitle}>No Active Tournament</Text>
        <Text style={styles.emptyText}>Check back when a new week opens.</Text>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const statusColor = (status: string) => {
    if (status === 'approved') return '#27ae60';
    if (status === 'rejected') return '#e74c3c';
    return '#f39c12';
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.tournamentName}>{tournament.name}</Text>
          <Text style={styles.regionName}>{tournament.region?.name}</Text>
        </View>
        <TouchableOpacity onPress={handleLogout}>
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
        <Text style={styles.emptyText}>No submissions yet — go catch something!</Text>
      ) : (
        <FlatList
          data={submissions}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <View style={styles.submissionRow}>
              <View>
                <Text style={styles.submissionLength}>{item.fishLengthCm} cm</Text>
                <Text style={styles.submissionDate}>
                  {new Date(item.capturedAt).toLocaleDateString()}
                </Text>
              </View>
              <Text style={[styles.submissionStatus, { color: statusColor(item.status) }]}>
                {item.status.toUpperCase()}
              </Text>
            </View>
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  header: {
    backgroundColor: '#1a5276',
    padding: 20,
    paddingTop: 56,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  tournamentName: { color: '#fff', fontSize: 20, fontWeight: '700' },
  regionName: { color: '#aed6f1', fontSize: 14, marginTop: 2 },
  logoutText: { color: '#aed6f1', fontSize: 14 },
  actions: { padding: 16, gap: 12 },
  primaryButton: { backgroundColor: '#1a5276', borderRadius: 10, padding: 16, alignItems: 'center' },
  primaryButtonText: { color: '#fff', fontSize: 17, fontWeight: '600' },
  secondaryButton: { backgroundColor: '#fff', borderRadius: 10, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#1a5276' },
  secondaryButtonText: { color: '#1a5276', fontSize: 17, fontWeight: '600' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#333', paddingHorizontal: 16, marginBottom: 8 },
  emptyTitle: { fontSize: 22, fontWeight: '700', color: '#333', marginBottom: 8 },
  emptyText: { color: '#888', fontSize: 15, textAlign: 'center', paddingHorizontal: 16 },
  submissionRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#fff', padding: 16, marginHorizontal: 16, borderRadius: 8,
  },
  submissionLength: { fontSize: 18, fontWeight: '700', color: '#1a5276' },
  submissionDate: { fontSize: 13, color: '#888', marginTop: 2 },
  submissionStatus: { fontSize: 13, fontWeight: '700' },
  separator: { height: 8 },
  logoutButton: { marginTop: 24, padding: 12 },
});
