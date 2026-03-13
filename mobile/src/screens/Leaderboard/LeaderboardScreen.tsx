import React, { useContext, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  ActivityIndicator, TouchableOpacity, Image, SafeAreaView,
} from 'react-native';
import * as api from '../../services/api';
import { wsService } from '../../services/websocket';
import type { LeaderboardEntry, UserRank } from '../../models';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { TournamentContext } from '../../navigation';

type Tab = 'largest' | 'season';

function rankColor(rank: number): string {
  if (rank === 1) return '#FFD700';
  if (rank === 2) return '#C0C0C0';
  if (rank === 3) return '#CD7F32';
  return colors.textMuted;
}

function getInitials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function LeaderboardRow({ item }: { item: LeaderboardEntry }) {
  const isTop = item.rank <= 3;
  const rc = rankColor(item.rank);
  const isFirst = item.rank === 1;

  return (
    <View style={[styles.row, isFirst && styles.firstRow, isTop && !isFirst && styles.topRow]}>
      {/* Rank number */}
      <View style={[styles.rankBox, { borderColor: rc + '60' }]}>
        <Text style={[styles.rankNum, { color: rc }]}>
          {item.rank <= 3 ? ['🥇', '🥈', '🥉'][item.rank - 1] : `#${item.rank}`}
        </Text>
      </View>

      {/* Avatar */}
      <View style={styles.avatarWrap}>
        {item.profilePhotoUrl ? (
          <Image source={{ uri: item.profilePhotoUrl }} style={styles.avatar} />
        ) : (
          <Text style={styles.avatarInitials}>{getInitials(item.displayName)}</Text>
        )}
      </View>

      {/* Info */}
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{item.displayName}</Text>
        {item.username && <Text style={styles.username}>@{item.username}</Text>}
      </View>

      {/* Measurement */}
      <View style={styles.measureWrap}>
        <Text style={[styles.measurement, isFirst && { color: colors.accent }]}>
          {item.fishLengthCm}
        </Text>
        <Text style={styles.measureUnit}>CM</Text>
      </View>
    </View>
  );
}

export default function LeaderboardScreen() {
  const { tournamentId } = useContext(TournamentContext);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [myRank, setMyRank] = useState<UserRank | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('largest');

  useEffect(() => {
    if (!tournamentId) {
      setLoading(false);
      return;
    }

    let active = true;
    async function load() {
      setLoading(true);
      try {
        const [board, rank] = await Promise.all([
          api.getLeaderboard(tournamentId!),
          api.getMyRank(tournamentId!),
        ]);
        if (!active) return;
        setEntries(board);
        setMyRank(rank);
      } catch {
        // silently handle
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    wsService.connect(tournamentId);
    const unsubscribe = wsService.onUpdate(update => setEntries(update.entries));
    return () => {
      active = false;
      unsubscribe();
      wsService.disconnect();
    };
  }, [tournamentId]);

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>LEADERBOARD</Text>
      </View>

      {/* Tab row */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'largest' && styles.tabBtnActive]}
          onPress={() => setActiveTab('largest')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabBtnText, activeTab === 'largest' && styles.tabBtnTextActive]}>
            LARGEST FISH
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'season' && styles.tabBtnActive]}
          onPress={() => setActiveTab('season')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabBtnText, activeTab === 'season' && styles.tabBtnTextActive]}>
            SEASON STANDINGS
          </Text>
        </TouchableOpacity>
      </View>

      {/* No tournament */}
      {!tournamentId && !loading && (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyTitle}>NO ACTIVE TOURNAMENT</Text>
          <Text style={styles.emptySub}>Visit the Compete tab to join a tournament.</Text>
        </View>
      )}

      {/* Loading */}
      {loading && tournamentId && (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      )}

      {/* List */}
      {!loading && tournamentId && entries.length === 0 && (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyTitle}>NO ENTRIES YET</Text>
          <Text style={styles.emptySub}>Submit a catch to be the first on the board!</Text>
        </View>
      )}

      {!loading && tournamentId && entries.length > 0 && (
        <FlatList
          data={entries}
          keyExtractor={item => item.userId}
          contentContainerStyle={{ padding: 16, paddingBottom: myRank?.rank ? 80 : 24 }}
          renderItem={({ item }) => <LeaderboardRow item={item} />}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* My rank banner */}
      {myRank?.rank && tournamentId && (
        <View style={styles.myRankBanner}>
          <Text style={styles.myRankLabel}>YOUR RANK</Text>
          <Text style={styles.myRankValue}>#{myRank.rank}</Text>
          {myRank.fishLengthCm != null && (
            <Text style={styles.myRankLength}>{myRank.fishLengthCm} cm</Text>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
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
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
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
  row: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  firstRow: {
    borderColor: colors.accent + '60',
    backgroundColor: colors.surfaceCard,
  },
  topRow: {
    borderColor: colors.border,
    backgroundColor: colors.surfaceHigh,
  },
  rankBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    flexShrink: 0,
  },
  rankNum: {
    fontSize: 16,
    fontWeight: '900',
  },
  avatarWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surfaceHigh,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginRight: 10,
    flexShrink: 0,
  },
  avatar: {
    width: 38,
    height: 38,
  },
  avatarInitials: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSub,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  username: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 1,
  },
  measureWrap: {
    alignItems: 'flex-end',
  },
  measurement: {
    ...typography.numMd,
    color: colors.text,
  },
  measureUnit: {
    ...typography.labelSm,
    color: colors.textMuted,
    marginTop: -2,
  },
  myRankBanner: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    backgroundColor: colors.verifiedBg,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: colors.verified + '40',
  },
  myRankLabel: {
    ...typography.label,
    color: colors.textMuted,
  },
  myRankValue: {
    ...typography.numMd,
    color: colors.verified,
  },
  myRankLength: {
    ...typography.bodyMd,
    color: colors.textSub,
    fontWeight: '600',
  },
});
