import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  ActivityIndicator, TouchableOpacity, Image,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation';
import * as api from '../../services/api';
import { wsService } from '../../services/websocket';
import type { LeaderboardEntry, UserRank } from '../../models';
import { colors } from '../../theme/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'Leaderboard'>;

export default function LeaderboardScreen({ navigation, route }: Props) {
  const { tournamentId } = route.params;
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [myRank, setMyRank] = useState<UserRank | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [board, rank] = await Promise.all([
          api.getLeaderboard(tournamentId),
          api.getMyRank(tournamentId),
        ]);
        setEntries(board);
        setMyRank(rank);
      } catch {
        // silently handle
      } finally {
        setLoading(false);
      }
    }

    load();
    wsService.connect(tournamentId);
    const unsubscribe = wsService.onUpdate(update => setEntries(update.entries));
    return () => { unsubscribe(); wsService.disconnect(); };
  }, [tournamentId]);

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={colors.green} /></View>;
  }

  const rankColor = (rank: number) => {
    if (rank === 1) return '#FFD700';
    if (rank === 2) return '#C0C0C0';
    if (rank === 3) return '#CD7F32';
    return colors.textMuted;
  };

  const medalFor = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Image source={require('../../../assets/icon.png')} style={styles.headerLogo} resizeMode="contain" />
          <Text style={styles.title}>Leaderboard</Text>
        </View>
        <View style={{ width: 70 }} />
      </View>

      {/* My rank banner */}
      {myRank?.rank && (
        <View style={styles.myRankBanner}>
          <Text style={styles.myRankLabel}>YOUR RANK</Text>
          <Text style={styles.myRankValue}>#{myRank.rank}</Text>
          <Text style={styles.myRankLength}>{myRank.fishLengthCm} cm</Text>
        </View>
      )}

      {entries.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>No entries yet — be the first!</Text>
        </View>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={item => item.userId}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => (
            <View style={[styles.row, item.rank <= 3 && styles.topRow]}>
              <View style={[styles.rankBadge, { borderColor: rankColor(item.rank) + '60' }]}>
                <Text style={[styles.rankText, { color: rankColor(item.rank) }]}>
                  {item.rank <= 3 ? medalFor(item.rank) : `#${item.rank}`}
                </Text>
              </View>
              <View style={styles.info}>
                <Text style={styles.name}>{item.displayName}</Text>
              </View>
              <Text style={styles.length}>{item.fishLengthCm} cm</Text>
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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg },
  header: {
    backgroundColor: colors.surface,
    paddingTop: 56, paddingBottom: 16, paddingHorizontal: 16,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backBtn: { width: 70 },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerLogo: { width: 26, height: 26 },
  back: { color: colors.green, fontSize: 15, fontWeight: '600' },
  title: { color: colors.textPrimary, fontSize: 18, fontWeight: '700' },
  myRankBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16,
    backgroundColor: colors.greenMuted, padding: 14,
    borderBottomWidth: 1, borderBottomColor: colors.green + '40',
  },
  myRankLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  myRankValue: { color: colors.green, fontSize: 22, fontWeight: '800' },
  myRankLength: { color: colors.textSecondary, fontSize: 15, fontWeight: '600' },
  row: {
    backgroundColor: colors.surface, borderRadius: 12, padding: 14,
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: colors.borderLight,
  },
  topRow: { borderColor: colors.green + '40', backgroundColor: colors.surfaceHigh },
  rankBadge: {
    width: 44, height: 44, borderRadius: 22, borderWidth: 1.5,
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  rankText: { fontSize: 16, fontWeight: '800' },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: '600', color: colors.textPrimary },
  length: { fontSize: 18, fontWeight: '800', color: colors.green },
  emptyText: { color: colors.textMuted, fontSize: 16 },
});
