import React, { useContext, useEffect, useRef, useState, useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import {
  View, Text, StyleSheet, FlatList,
  ActivityIndicator, TouchableOpacity, Image, SafeAreaView,
  ScrollView, TextInput, Modal,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as api from '../../services/api';
import { storage } from '../../services/storage';
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

type Propper = { id: string; displayName: string; profilePhotoUrl: string | null };

function PropsWhoModal({ submissionId, onClose }: { submissionId: string; onClose: () => void }) {
  const [proppers, setProppers] = useState<Propper[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getPropsWho(submissionId)
      .then(setProppers)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [submissionId]);

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose} />
      <View style={styles.propsSheet}>
        <View style={styles.propsSheetHandle} />
        <Text style={styles.propsSheetTitle}>Props</Text>
        {loading ? (
          <ActivityIndicator color={colors.accent} style={{ marginTop: 24 }} />
        ) : proppers.length === 0 ? (
          <Text style={styles.propsEmpty}>No props yet — be the first!</Text>
        ) : (
          <FlatList
            data={proppers}
            keyExtractor={p => p.id}
            renderItem={({ item }) => (
              <View style={styles.propperRow}>
                {item.profilePhotoUrl ? (
                  <Image source={{ uri: item.profilePhotoUrl }} style={styles.propperAvatar} />
                ) : (
                  <View style={[styles.propperAvatar, styles.propperAvatarFallback]}>
                    <Text style={styles.propperInitial}>{item.displayName[0]?.toUpperCase()}</Text>
                  </View>
                )}
                <Text style={styles.propperName}>{item.displayName}</Text>
              </View>
            )}
          />
        )}
      </View>
    </Modal>
  );
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
  const [showWho, setShowWho] = useState(false);
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
    <>
      <TouchableOpacity
        style={[styles.propBtn, propped && styles.propBtnActive]}
        onPress={handleProp}
        onLongPress={() => count > 0 && setShowWho(true)}
        activeOpacity={0.7}
      >
        <Text style={styles.propIcon}>👍</Text>
        <Text style={[styles.propCount, propped && { color: colors.accent }]}>{count}</Text>
      </TouchableOpacity>
      {count > 0 && (
        <TouchableOpacity onPress={() => setShowWho(true)}>
          <Text style={styles.propsWhoLink}>who?</Text>
        </TouchableOpacity>
      )}
      {showWho && <PropsWhoModal submissionId={submissionId} onClose={() => setShowWho(false)} />}
    </>
  );
}

type MentionUser = { id: string; username: string; displayName: string };

function renderWithMentions(text: string, onMentionPress?: (username: string) => void): React.ReactNode {
  const parts = text.split(/(@\w+)/g);
  return parts.map((part, i) =>
    /^@\w+$/.test(part)
      ? <Text key={i} style={{ color: colors.accent, fontWeight: '700' }} onPress={onMentionPress ? () => onMentionPress(part.slice(1)) : undefined}>{part}</Text>
      : <Text key={i}>{part}</Text>
  );
}

function MentionTextInput({
  value, onChangeText, style, placeholder,
}: {
  value: string;
  onChangeText: (v: string) => void;
  style?: object;
  placeholder?: string;
}) {
  const [suggestions, setSuggestions] = useState<MentionUser[]>([]);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleChange(v: string) {
    onChangeText(v);
    const match = v.match(/@(\w*)$/);
    if (match) {
      const q = match[1];
      setMentionQuery(q);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(async () => {
        if (q.length === 0) { setSuggestions([]); return; }
        try { setSuggestions(await api.searchUsers(q)); }
        catch { setSuggestions([]); }
      }, 250);
    } else {
      setMentionQuery(null);
      setSuggestions([]);
    }
  }

  function selectMention(user: MentionUser) {
    onChangeText(value.replace(/@(\w*)$/, `@${user.username} `));
    setSuggestions([]);
    setMentionQuery(null);
  }

  return (
    <View style={{ flex: 1 }}>
      {suggestions.length > 0 && mentionQuery !== null && (
        <View style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.accentDark, borderRadius: 8, marginBottom: 4, overflow: 'hidden' }}>
          {suggestions.map(u => (
            <TouchableOpacity key={u.id} onPress={() => selectMention(u)} style={{ paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row' }}>
              <Text style={{ color: colors.accent, fontWeight: '700', fontSize: 13 }}>@{u.username}</Text>
              {u.displayName !== u.username && <Text style={{ color: colors.textSub, fontSize: 13 }}> {u.displayName}</Text>}
            </TouchableOpacity>
          ))}
        </View>
      )}
      <TextInput
        style={style}
        value={value}
        onChangeText={handleChange}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        maxLength={500}
      />
    </View>
  );
}

type Propper = { id: string; displayName: string; profilePhotoUrl: string | null };

function CommentPropsWhoModal({ fetchWho, onClose }: { fetchWho: () => Promise<Propper[]>; onClose: () => void }) {
  const [proppers, setProppers] = useState<Propper[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { fetchWho().then(setProppers).catch(() => {}).finally(() => setLoading(false)); }, []);
  return (
    <Modal visible animationType="fade" transparent onRequestClose={onClose}>
      <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={{ backgroundColor: colors.surface, borderRadius: 16, padding: 20, width: 280, maxHeight: 360 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <Text style={{ fontWeight: '700', fontSize: 15, color: colors.text }}>👍 Props</Text>
            <TouchableOpacity onPress={onClose}><Text style={{ color: colors.textMuted, fontSize: 20 }}>×</Text></TouchableOpacity>
          </View>
          {loading ? <Text style={{ color: colors.textMuted, fontSize: 13, textAlign: 'center' }}>Loading…</Text>
            : proppers.length === 0 ? <Text style={{ color: colors.textMuted, fontSize: 13, textAlign: 'center' }}>No props yet.</Text>
            : <FlatList data={proppers} keyExtractor={p => p.id} renderItem={({ item: p }) => (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: colors.surfaceHigh }}>
                  {p.profilePhotoUrl
                    ? <Image source={{ uri: p.profilePhotoUrl }} style={{ width: 30, height: 30, borderRadius: 15 }} />
                    : <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: colors.surfaceHigh, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: colors.accent, fontWeight: '700', fontSize: 12 }}>{p.displayName[0]?.toUpperCase()}</Text></View>
                  }
                  <Text style={{ color: colors.text, fontSize: 13, fontWeight: '600' }}>{p.displayName}</Text>
                </View>
              )} />
          }
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const COMMENT_EMOJI_CATS = [
  { label: '🎣 Fishing', emojis: ['🎣','🐟','🐠','🐡','🦈','🌊','⚓','🚤','🛶','🏖️','🌅','🎯'] },
  { label: '🏆 Sports',  emojis: ['🏆','🥇','🥈','🥉','💪','🤙','👊','🙌','👏','🎉','🔥','⚡'] },
  { label: '😀 Faces',   emojis: ['😀','😂','🤣','😍','😎','🤩','😅','😭','🥳','😤','🤯','😱'] },
];

function CommentsSection({ submissionId }: { submissionId: string }) {
  const navigation = useNavigation<any>();
  const [comments, setComments] = useState<CatchComment[]>([]);
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [whoCommentId, setWhoCommentId] = useState<string | null>(null);
  const [gifUrl, setGifUrl] = useState<string | null>(null);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [gifQuery, setGifQuery] = useState('');
  const [gifResults, setGifResults] = useState<Array<{ id: string; preview: string; full: string }>>([]);
  const [gifSearching, setGifSearching] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  useEffect(() => {
    storage.getToken().then(token => {
      if (!token) return;
      try { const p = JSON.parse(atob(token.split('.')[1])); setCurrentUserId(p.sub ?? null); } catch {}
    });
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    api.getComments(submissionId)
      .then(c => { if (active) setComments(c); })
      .catch(() => {})
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [submissionId]);

  async function searchGifs(q: string) {
    if (!q.trim()) return;
    setGifSearching(true);
    try {
      const res = await fetch(`${api.BASE_URL}/gifs/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setGifResults(data.data ?? []);
    } catch { setGifResults([]); }
    finally { setGifSearching(false); }
  }

  async function handlePickPhoto() {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
      setGifUrl(null);
    }
  }

  async function handleSubmit() {
    const trimmed = body.trim();
    if (!trimmed && !gifUrl && !photoUri || submitting) return;
    setSubmitting(true);
    try {
      let photoKey: string | undefined;
      if (photoUri) {
        const r = await api.uploadCommentMedia(submissionId, photoUri);
        photoKey = r.photoKey;
      }
      const comment = await api.addComment(submissionId, trimmed, gifUrl ?? undefined, photoKey);
      setComments(prev => [...prev, comment]);
      setBody('');
      setGifUrl(null);
      setPhotoUri(null);
      setShowGifPicker(false);
    } catch {
      // silently handle
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleProp(commentId: string) {
    if (!currentUserId) return;
    try {
      const res = await api.toggleCommentProp(commentId);
      setComments(prev => prev.map(c => c.id === commentId ? { ...c, propCount: res.propCount, userHasPropped: res.userHasPropped } : c));
    } catch { /* silent */ }
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
                <Text style={styles.commentAuthor} onPress={() => c.user.profile?.username && navigation.navigate('PublicProfile', { username: c.user.profile.username })} >
                  {c.user.profile?.username ? `@${c.user.profile.username}` : c.user.displayName}
                </Text>
                <Text style={styles.commentTime}>{timeAgo(c.createdAt)}</Text>
                <TouchableOpacity onPress={() => currentUserId && handleToggleProp(c.id)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }} style={{ marginLeft: 'auto', opacity: c.userHasPropped ? 1 : 0.35 }}>
                  <Text style={{ fontSize: 13 }}>👍</Text>
                </TouchableOpacity>
                {(c.propCount ?? 0) > 0 && (
                  <TouchableOpacity onPress={() => setWhoCommentId(c.id)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                    <Text style={{ fontSize: 11, color: c.userHasPropped ? colors.accent : colors.textSub, fontWeight: '700' }}>{c.propCount}</Text>
                  </TouchableOpacity>
                )}
              </View>
              <Text style={styles.commentBody}>{renderWithMentions(c.body, (u) => navigation.navigate('PublicProfile', { username: u }))}</Text>
              {(c.gifUrl || c.photoUrl) ? <Image source={{ uri: c.gifUrl ?? c.photoUrl ?? '' }} style={{ width: '100%', height: 120, borderRadius: 8, marginTop: 4 }} resizeMode="cover" /> : null}
            </View>
          ))}
        </>
      )}
      <View style={styles.commentInputRow}>
        <MentionTextInput
          style={styles.commentInput}
          placeholder="Add a comment..."
          value={body}
          onChangeText={setBody}
        />
        <TouchableOpacity
          style={[styles.commentSubmitBtn, ((!body.trim() && !gifUrl && !photoUri) || submitting) && { opacity: 0.5 }]}
          onPress={handleSubmit}
          disabled={(!body.trim() && !gifUrl && !photoUri) || submitting}
          activeOpacity={0.7}
        >
          <Text style={styles.commentSubmitText}>{submitting ? '…' : '↑'}</Text>
        </TouchableOpacity>
      </View>
      {(gifUrl || photoUri) && (
        <View style={{ marginTop: 4, position: 'relative', alignSelf: 'flex-start' }}>
          <Image source={{ uri: gifUrl ?? photoUri ?? '' }} style={{ height: 70, width: 110, borderRadius: 8 }} resizeMode="cover" />
          <TouchableOpacity onPress={() => { setGifUrl(null); setPhotoUri(null); }} style={{ position: 'absolute', top: 3, right: 3, width: 16, height: 16, borderRadius: 8, backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: '#fff', fontSize: 10 }}>×</Text>
          </TouchableOpacity>
        </View>
      )}
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
        <TouchableOpacity onPress={handlePickPhoto}
          style={{ borderWidth: 1, borderColor: photoUri ? colors.accent : 'rgba(255,255,255,0.35)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
          <Text style={{ fontSize: 15, color: photoUri ? colors.accent : colors.textSub }}>📎</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => { setShowGifPicker(v => !v); setShowEmojiPicker(false); setGifQuery(''); setGifResults([]); }}
          style={{ borderWidth: 1, borderColor: showGifPicker ? colors.accent : 'rgba(255,255,255,0.35)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
          <Text style={{ color: showGifPicker ? colors.accent : colors.textMuted, fontSize: 11, fontWeight: '700' }}>GIF</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => { setShowEmojiPicker(v => !v); setShowGifPicker(false); }}
          style={{ borderWidth: 1, borderColor: showEmojiPicker ? colors.accent : 'rgba(255,255,255,0.35)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
          <Text style={{ fontSize: 15 }}>😊</Text>
        </TouchableOpacity>
      </View>
      {showEmojiPicker && (
        <View style={{ marginTop: 8, backgroundColor: colors.surfaceHigh, borderRadius: 10, padding: 10 }}>
          {COMMENT_EMOJI_CATS.map(cat => (
            <View key={cat.label} style={{ marginBottom: 8 }}>
              <Text style={{ color: colors.textMuted, fontSize: 10, fontWeight: '800', letterSpacing: 1.2, marginBottom: 4 }}>{cat.label}</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 2 }}>
                {cat.emojis.map(em => (
                  <TouchableOpacity key={em} onPress={() => setBody(b => b + em)} hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}>
                    <Text style={{ fontSize: 20, padding: 3 }}>{em}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))}
        </View>
      )}
      {showGifPicker && (
        <View style={{ marginTop: 8, backgroundColor: colors.surfaceHigh, borderRadius: 10, padding: 10 }}>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
            <TextInput value={gifQuery} onChangeText={setGifQuery} onSubmitEditing={() => searchGifs(gifQuery)}
              placeholder="Search GIFs…" placeholderTextColor={colors.textMuted}
              style={{ flex: 1, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.textMuted, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6, color: colors.text, fontSize: 12 }} autoFocus />
            <TouchableOpacity onPress={() => searchGifs(gifQuery)} style={{ backgroundColor: colors.accent, borderRadius: 6, paddingHorizontal: 12, justifyContent: 'center' }}>
              <Text style={{ color: colors.bg, fontWeight: '700', fontSize: 12 }}>Search</Text>
            </TouchableOpacity>
          </View>
          {gifSearching && <Text style={{ color: colors.textMuted, fontSize: 12, textAlign: 'center', padding: 12 }}>Searching…</Text>}
          {!gifSearching && gifResults.length > 0 && (
            <FlatList data={gifResults} numColumns={3} keyExtractor={g => g.id} style={{ maxHeight: 180 }}
              renderItem={({ item: g }) => (
                <TouchableOpacity onPress={() => { setGifUrl(g.full); setPhotoUri(null); setShowGifPicker(false); }} style={{ flex: 1, aspectRatio: 1, margin: 2, borderRadius: 6, overflow: 'hidden', backgroundColor: colors.bg }}>
                  <Image source={{ uri: g.preview }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                </TouchableOpacity>
              )} />
          )}
          {!gifSearching && gifResults.length === 0 && (
            <Text style={{ color: colors.textMuted, fontSize: 12, textAlign: 'center', padding: 10 }}>{gifQuery ? 'No results.' : 'Search for a GIF above'}</Text>
          )}
        </View>
      )}
      {whoCommentId && (
        <CommentPropsWhoModal
          fetchWho={() => api.getCommentPropsWho(whoCommentId)}
          onClose={() => setWhoCommentId(null)}
        />
      )}
    </View>
  );
}

function formatScore(entry: LeaderboardEntry): string {
  switch (entry.scoringMethod) {
    case 'WEIGHT': return `${(entry.fishWeightOz ?? entry.score).toFixed(1)} oz`;
    case 'FISH_COUNT': return `${entry.score} fish`;
    case 'SPECIES_COUNT': return `${entry.score} species`;
    default: return `${(entry.fishLengthCm / 2.54).toFixed(1)}"`;
  }
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
            {formatScore(item)}
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
          {(myRank.score != null || myRank.fishLengthCm != null) && (
            <Text style={styles.myRankLength}>{
              (() => {
                const sm = entries[0]?.scoringMethod;
                if (sm === 'WEIGHT') return `${(myRank.score ?? 0).toFixed(1)} oz`;
                if (sm === 'FISH_COUNT') return `${myRank.score ?? 0} fish`;
                if (sm === 'SPECIES_COUNT') return `${myRank.score ?? 0} species`;
                return `${((myRank.fishLengthCm ?? 0) / 2.54).toFixed(1)}"`;
              })()
            }</Text>
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
  propsWhoLink: {
    ...typography.labelSm,
    color: colors.accent,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  propsSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: 40,
    maxHeight: '60%',
  },
  propsSheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.textMuted,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 16,
  },
  propsSheetTitle: {
    ...typography.headingMd,
    color: colors.text,
    marginBottom: 16,
  },
  propsEmpty: {
    ...typography.bodyMd,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 24,
    marginBottom: 24,
  },
  propperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  propperAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 12,
  },
  propperAvatarFallback: {
    backgroundColor: colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  propperInitial: {
    ...typography.labelSm,
    color: colors.accent,
    fontWeight: '700',
  },
  propperName: {
    ...typography.bodyMd,
    color: colors.text,
  },
});
