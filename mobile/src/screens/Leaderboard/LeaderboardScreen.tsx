import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  ActivityIndicator, TouchableOpacity,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation';
import * as api from '../../services/api';
import { wsService } from '../../services/websocket';
import type { LeaderboardEntry, UserRank } from '../../models';

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
    const unsubscribe = wsService.onUpdate(update => {
      setEntries(update.entries);
    });

    return () => {
      unsubscribe();
      wsService.disconnect();
    };
  }, [tournamentId]);

  const medalFor = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#1a5276" /></View>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Leaderboard</Text>
        <View style={{ width: 60 }} />
      </View>

      {myRank?.rank && (
        <View style={styles.myRankBanner}>
          <Text style={styles.myRankText}>
            Your rank: #{myRank.rank}  ·  {myRank.fishLengthCm} cm
          </Text>
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
              <Text style={styles.medal}>{medalFor(item.rank)}</Text>
              <View style={styles.info}>
                <Text style={styles.name}>{item.displayName}</Text>
                <Text style={styles.length}>{item.fishLengthCm} cm</Text>
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
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    backgroundColor: '#1a5276', paddingTop: 56, paddingBottom: 16, paddingHorizontal: 16,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  back: { color: '#aed6f1', fontSize: 16 },
  title: { color: '#fff', fontSize: 20, fontWeight: '700' },
  myRankBanner: { backgroundColor: '#d6eaf8', padding: 14, alignItems: 'center' },
  myRankText: { color: '#1a5276', fontWeight: '600', fontSize: 15 },
  row: {
    backgroundColor: '#fff', borderRadius: 10, padding: 16,
    flexDirection: 'row', alignItems: 'center',
  },
  topRow: { borderWidth: 1.5, borderColor: '#1a5276' },
  medal: { fontSize: 28, width: 44, textAlign: 'center' },
  info: { marginLeft: 12 },
  name: { fontSize: 16, fontWeight: '600', color: '#333' },
  length: { fontSize: 14, color: '#1a5276', fontWeight: '700', marginTop: 2 },
  emptyText: { color: '#888', fontSize: 16 },
});
