import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  FlatList, ActivityIndicator, SafeAreaView,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as api from '../../services/api';
import type { LeaderboardEntry, Tournament } from '../../models';
import type { RootStackParamList } from '../../navigation';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';

type ClosedTournament = Tournament & { _count: { submissions: number } };

export default function TournamentHistoryScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [tournaments, setTournaments] = useState<ClosedTournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [leaderboards, setLeaderboards] = useState<Record<string, LeaderboardEntry[]>>({});
  const [leaderboardLoading, setLeaderboardLoading] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      api.getClosedTournaments().then(data => {
        if (active) { setTournaments(data); setLoading(false); }
      }).catch(() => { if (active) setLoading(false); });
      return () => { active = false; };
    }, [])
  );

  async function toggleExpand(t: ClosedTournament) {
    if (expanded === t.id) { setExpanded(null); return; }
    setExpanded(t.id);
    if (leaderboards[t.id]) return;
    setLeaderboardLoading(t.id);
    try {
      const entries = await api.getLeaderboard(t.id);
      setLeaderboards(prev => ({ ...prev, [t.id]: entries.slice(0, 10) }));
    } catch {}
    setLeaderboardLoading(null);
  }

  function renderEntry(entry: LeaderboardEntry, index: number) {
    const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : null;
    return (
      <View key={entry.userId} style={styles.entryRow}>
        <Text style={styles.rank}>{medal ?? `#${index + 1}`}</Text>
        <Text style={styles.angler} numberOfLines={1}>{entry.displayName}</Text>
        <Text style={styles.length}>{(entry.fishLengthCm / 2.54).toFixed(1)}"</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backText}>‹ Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>PAST TOURNAMENTS</Text>
          <View style={{ width: 60 }} />
        </View>
        <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>PAST TOURNAMENTS</Text>
        <View style={{ width: 60 }} />
      </View>

      {tournaments.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No past tournaments yet.</Text>
        </View>
      ) : (
        <FlatList
          data={tournaments}
          keyExtractor={t => t.id}
          contentContainerStyle={{ paddingBottom: 40 }}
          renderItem={({ item: t }) => {
            const isOpen = expanded === t.id;
            const entries = leaderboards[t.id];
            const loadingThis = leaderboardLoading === t.id;
            return (
              <View style={styles.card}>
                <TouchableOpacity onPress={() => toggleExpand(t)} activeOpacity={0.75} style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>{t.name}</Text>
                    <Text style={styles.cardSub}>
                      {new Date(t.endsAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      {'  ·  '}{t._count.submissions} approved
                    </Text>
                  </View>
                  <Text style={styles.chevron}>{isOpen ? '▲' : '▼'}</Text>
                </TouchableOpacity>

                {isOpen && (
                  <View style={styles.leaderboardPanel}>
                    {loadingThis ? (
                      <ActivityIndicator color={colors.accent} style={{ paddingVertical: 16 }} />
                    ) : entries && entries.length > 0 ? (
                      <>
                        <View style={styles.tableHeader}>
                          <Text style={[styles.tableLabel, { width: 36 }]}>#</Text>
                          <Text style={[styles.tableLabel, { flex: 1 }]}>ANGLER</Text>
                          <Text style={[styles.tableLabel, { width: 60, textAlign: 'right' }]}>LENGTH</Text>
                        </View>
                        {entries.map((e, i) => renderEntry(e, i))}
                      </>
                    ) : (
                      <Text style={styles.emptyText}>No entries.</Text>
                    )}
                    <TouchableOpacity
                      onPress={() => navigation.navigate('TournamentDetail', { tournamentId: t.id })}
                      style={styles.detailBtn}
                      activeOpacity={0.75}
                    >
                      <Text style={styles.detailBtnText}>View Tournament Details →</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 52, paddingHorizontal: 16, paddingBottom: 16,
    backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backBtn: { width: 60 },
  backText: { ...typography.body, color: colors.accent, fontWeight: '600' },
  title: { ...typography.displaySm, color: colors.text },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { ...typography.body, color: colors.textMuted, textAlign: 'center' },
  card: {
    marginHorizontal: 16, marginTop: 12,
    backgroundColor: colors.surface, borderRadius: 12,
    borderWidth: 1, borderColor: colors.border, overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row', alignItems: 'center',
    padding: 16,
  },
  cardTitle: { ...typography.labelMd, color: colors.text },
  cardSub: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  chevron: { ...typography.body, color: colors.accent, marginLeft: 8 },
  leaderboardPanel: {
    borderTopWidth: 1, borderTopColor: colors.border,
    paddingHorizontal: 16, paddingBottom: 12,
  },
  tableHeader: {
    flexDirection: 'row', paddingTop: 10, paddingBottom: 6,
    borderBottomWidth: 1, borderBottomColor: colors.border, marginBottom: 4,
  },
  tableLabel: { ...typography.labelSm, color: colors.textMuted },
  entryRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: colors.border + '50',
  },
  rank: { ...typography.label, color: colors.accent, width: 36 },
  angler: { ...typography.body, color: colors.text, flex: 1 },
  length: { ...typography.numSm, color: colors.accent, width: 60, textAlign: 'right' },
  detailBtn: {
    marginTop: 12, paddingVertical: 10, paddingHorizontal: 12,
    backgroundColor: colors.surfaceHigh, borderRadius: 8,
    borderWidth: 1, borderColor: colors.border, alignItems: 'center',
  },
  detailBtnText: { ...typography.labelSm, color: colors.accent },
});
