import React, { useContext, useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  ActivityIndicator, TouchableOpacity, Image, SafeAreaView,
  ScrollView, TextInput,
} from 'react-native';
import * as api from '../../services/api';
import { wsService } from '../../services/websocket';
import type { LeaderboardEntry, UserRank, CatchComment } from '../../models';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { TournamentContext } from '../../navigation';

type Tab = 'largest' | 'season';

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

const SPECIES_FILTERS = ['All', 'Bass', 'Walleye', 'Trout', 'Pike', 'Catfish', 'Panfish', 'Other'];

function rankColor(rank: number): string {
  if (rank === 1) return '#FFD700';
  if (rank === 2) return '#C0C0C0';
  if (rank === 3) return '#CD7F32';
  return colors.textMuted;
}

function getInitials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function PropButton({
  submissionId,
  initialCount,
}: {
  submissionId: string;
  initialCount?: number;
}) {
  const [propped, setPropped] = useState(false);
  const [count, setCount] = useState(initialCount ?? 0);
  const [loading, setLoading] = useState(false);
  const initialized = React.useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    api.getProps(submissionId)
      .then(r => { setCount(r.count); setPropped(r.userHasPropped); })
      .catch(() => {});
  }, [submissionId]);

  const handleProp = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    try {
      const result = await api.toggleProp(submissionId);
      setPropped(result.propped);
      setCount(result.count);
    } catch {
      // silently handle
    } finally {
      setLoading(false);
    }
  }, [submissionId, loading]);

  return (
    <TouchableOpacity
      style={[styles.propBtn, propped && styles.propBtnActive]}
      onPress={handleProp}
      activeOpacity={0.7}
    >
      <Text style={styles.propIcon}>👍</Text>
      <Text style={[styles.propCount, propped && { color: colors.accent }]}>{count}</Text>
    </TouchableOpacity>
  );
}

function CommentsSection({ submissionId }: { submissionId: string }) {
  const [comments, setComments] = useState<CatchComment[]>([]);
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    api.getComments(submissionId)
      .then(c => { if (active) setComments(c); })
      .catch(() => {})
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [submissionId]);

  async function handleSubmit() {
    const trimmed = body.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    try {
      const comment = await api.addComment(submissionId, trimmed);
      setComments(prev => [...prev, comment]);
      setBody('');
    } catch {
      // silently handle
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.commentsSection}>
      {loading ? (
        <ActivityIndicator size="small" color={colors.accent} style={{ padding: 8 }} />
      ) : (
        <>
          {comments.length === 0 && (
            <Text style={styles.noCommentsText}>No comments yet.</Text>
          )}
          {comments.map(c => (
            <View key={c.id} style={styles.commentRow}>
              <View style={styles.commentMeta}>
                <Text style={styles.commentAuthor}>{c.user.displayName}</Text>
                <Text style={styles.commentTime}>{timeAgo(c.createdAt)}</Text>
              </View>
              <Text style={styles.commentBody}>{c.body}</Text>
            </View>
          ))}
        </>
      )}
      <View style={styles.commentInputRow}>
        <TextInput
          style={styles.commentInput}
          placeholder="Add a comment..."
          placeholderTextColor={colors.textMuted}
          value={body}
          onChangeText={setBody}
          maxLength={500}
        />
        <TouchableOpacity
          style={[styles.commentSubmitBtn, (!body.trim() || submitting) && { opacity: 0.5 }]}
          onPress={handleSubmit}
          disabled={!body.trim() || submitting}
          activeOpacity={0.7}
        >
          <Text style={styles.commentSubmitText}>{submitting ? '…' : '↑'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function LeaderboardRow({
  item,
  expanded,
  onToggle,
}: {
  item: LeaderboardEntry;
  expanded: boolean;
  onToggle: () => void;
}) {
  const isTop = item.rank <= 3;
  const rc = rankColor(item.rank);
  const isFirst = item.rank === 1;

  return (
    <View>
      <TouchableOpacity
        style={[styles.row, isFirst && styles.firstRow, isTop && !isFirst && styles.topRow]}
        onPress={onToggle}
        activeOpacity={0.85}
      >
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
          {item.speciesName && <Text style={styles.speciesLabel}>{item.speciesName}</Text>}
          {item.released && <Text style={styles.releasedBadge}>↩ Released</Text>}
        </View>

        {/* Measurement + prop */}
        <View style={styles.measureWrap}>
          <Text style={[styles.measurement, isFirst && { color: colors.accent }]}>
            {(item.fishLengthCm / 2.54).toFixed(1)}{'"'}
          </Text>
          {item.submissionId && (
            <PropButton submissionId={item.submissionId} />
          )}
        </View>
      </TouchableOpacity>

      {/* Inline comments */}
      {expanded && item.submissionId && (
        <CommentsSection submissionId={item.submissionId} />
      )}
    </View>
  );
}

export default function LeaderboardScreen() {
  const { tournamentId } = useContext(TournamentContext);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [myRank, setMyRank] = useState<UserRank | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('largest');
  const [speciesFilter, setSpeciesFilter] = useState('All');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (!tournamentId) {
      setLoading(false);
      return;
    }

    let active = true;
    async function load() {
      setLoading(true);
      try {
        const species = speciesFilter === 'All' ? undefined : speciesFilter;
        const [board, rank] = await Promise.all([
          api.getLeaderboard(tournamentId!, species),
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
  }, [tournamentId, speciesFilter]);

  function toggleExpanded(userId: string) {
    setExpandedId(prev => (prev === userId ? null : userId));
  }

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

      {/* Species filter pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.pillsContainer}
        style={styles.pillsScroll}
      >
        {SPECIES_FILTERS.map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.pill, speciesFilter === f && styles.pillActive]}
            onPress={() => setSpeciesFilter(f)}
            activeOpacity={0.8}
          >
            <Text style={[styles.pillText, speciesFilter === f && styles.pillTextActive]}>
              {f}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

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
          <Image source={require('../../../assets/icon.png')} style={{ width: 100, height: 100 }} resizeMode="contain" />
          <ActivityIndicator size="small" color={colors.accent} style={{ marginTop: 16 }} />
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
          renderItem={({ item }) => (
            <LeaderboardRow
              item={item}
              expanded={expandedId === item.userId}
              onToggle={() => toggleExpanded(item.userId)}
            />
          )}
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
            <Text style={styles.myRankLength}>{(myRank.fishLengthCm / 2.54).toFixed(1)}"</Text>
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
    marginBottom: 0,
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
  pillsScroll: {
    flexGrow: 0,
    marginTop: 12,
  },
  pillsContainer: {
    paddingHorizontal: 16,
    gap: 8,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 8,
  },
  pillActive: {
    backgroundColor: colors.accent + '25',
    borderColor: colors.accent,
  },
  pillText: {
    ...typography.caption,
    color: colors.textMuted,
  },
  pillTextActive: {
    color: colors.accent,
    fontWeight: '700',
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
    fontSize: 18,
    fontWeight: '900',
    fontFamily: 'Oswald_700Bold',
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
  speciesLabel: {
    ...typography.caption,
    color: colors.accent,
    marginTop: 2,
  },
  releasedBadge: {
    ...typography.caption,
    color: colors.verified,
    marginTop: 2,
    fontSize: 11,
  },
  measureWrap: {
    alignItems: 'flex-end',
  },
  measurement: {
    ...typography.numMd,
    color: colors.text,
    fontFamily: 'Oswald_700Bold',
  },
  propBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: colors.surfaceHigh,
    borderWidth: 1,
    borderColor: colors.border,
  },
  propBtnActive: {
    borderColor: colors.accent + '70',
    backgroundColor: colors.accent + '18',
  },
  propIcon: {
    fontSize: 12,
  },
  propCount: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
  },
  commentsSection: {
    backgroundColor: colors.surfaceHigh,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderTopWidth: 0,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    padding: 12,
    marginBottom: 2,
  },
  noCommentsText: {
    ...typography.caption,
    color: colors.textMuted,
    marginBottom: 8,
  },
  commentRow: {
    marginBottom: 8,
  },
  commentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  commentAuthor: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSub,
  },
  commentTime: {
    fontSize: 11,
    color: colors.textMuted,
  },
  commentBody: {
    fontSize: 13,
    color: colors.text,
  },
  commentInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  commentInput: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: colors.text,
  },
  commentSubmitBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentSubmitText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.bg,
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
