import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity,
  ActivityIndicator, Image, TextInput, KeyboardAvoidingView, Platform,
  Alert, Share, Modal, FlatList, Linking,
} from 'react-native';
import { useStripe } from '@stripe/stripe-react-native';
import * as ImagePicker from 'expo-image-picker';
import QRCode from 'react-native-qrcode-svg';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation';
import * as api from '../../services/api';
import { storage } from '../../services/storage';
import type { Tournament, TournamentPost } from '../../models';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { TournamentContext } from '../../navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'TournamentDetail'>;

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatCents(cents: number): string {
  if (cents === 0) return 'Free';
  return `$${(cents / 100).toFixed(2)}`;
}

function formatScore(entry: { score: number; fishLengthCm: number; fishWeightOz?: number | null }, scoringMethod?: string): string {
  if (scoringMethod === 'WEIGHT') return `${entry.fishWeightOz?.toFixed(1) ?? '0'} oz`;
  if (scoringMethod === 'FISH_COUNT') return `${Math.round(entry.score)} fish`;
  if (scoringMethod === 'SPECIES_COUNT') return `${Math.round(entry.score)} species`;
  return `${(entry.fishLengthCm / 2.54).toFixed(1)}"`;
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function medalEmoji(rank: number): string {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return `#${rank}`;
}

function scoringLabel(method?: string): string {
  if (method === 'WEIGHT') return '⚖️ Weight';
  if (method === 'FISH_COUNT') return '🐟 Fish Count';
  if (method === 'SPECIES_COUNT') return '🎣 Species Count';
  return '📏 Length';
}

// ── Mention helpers ───────────────────────────────────────────────────────────

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
  value, onChangeText, onSend, style, placeholder,
}: {
  value: string;
  onChangeText: (v: string) => void;
  onSend: () => void;
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
    const replaced = value.replace(/@(\w*)$/, `@${user.username} `);
    onChangeText(replaced);
    setSuggestions([]);
    setMentionQuery(null);
  }

  return (
    <View style={{ flex: 1 }}>
      {suggestions.length > 0 && mentionQuery !== null && (
        <View style={mentionStyles.dropdown}>
          {suggestions.map(u => (
            <TouchableOpacity key={u.id} onPressIn={() => selectMention(u)} style={mentionStyles.suggestionRow}>
              <Text style={mentionStyles.suggestionUsername}>@{u.username}</Text>
              {u.displayName !== u.username && (
                <Text style={mentionStyles.suggestionDisplay}> {u.displayName}</Text>
              )}
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
        multiline
        maxLength={500}
        blurOnSubmit={false}
      />
    </View>
  );
}

const mentionStyles = StyleSheet.create({
  dropdown: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.accentDark,
    borderRadius: 8,
    marginBottom: 4,
    overflow: 'hidden',
  },
  suggestionRow: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  suggestionUsername: {
    color: colors.accent,
    fontWeight: '700',
    fontSize: 13,
  },
  suggestionDisplay: {
    color: colors.textSub,
    fontSize: 13,
  },
});

// ── Comment Props Who Modal ────────────────────────────────────────────────────

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

// ── Post Comments ─────────────────────────────────────────────────────────────

const COMMENT_EMOJI_CATS = [
  { label: '🎣 Fishing', emojis: ['🎣','🐟','🐠','🐡','🦈','🌊','⚓','🚤','🛶','🏖️','🌅','🎯'] },
  { label: '🏆 Sports', emojis: ['🏆','🥇','🥈','🥉','💪','🤙','👊','🙌','👏','🎉','🔥','⚡'] },
  { label: '😀 Faces', emojis: ['😀','😂','🤣','😍','😎','🤩','😅','😭','🥳','😤','🤯','😱'] },
];

function PostComments({ postId, tournamentId, currentUserId }: { postId: string; tournamentId: string; currentUserId: string | null }) {
  const navigation = useNavigation<any>();
  const [comments, setComments] = useState<api.PostComment[]>([]);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [whoCommentId, setWhoCommentId] = useState<string | null>(null);
  const [gifUrl, setGifUrl] = useState<string | null>(null);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [gifQuery, setGifQuery] = useState('');
  const [gifResults, setGifResults] = useState<Array<{ id: string; preview: string; full: string }>>([]);
  const [gifSearching, setGifSearching] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  useEffect(() => {
    api.getPostComments(postId).then(setComments).catch(() => {});
  }, [postId]);

  async function searchCommentGifs(q: string) {
    if (!q.trim()) return;
    setGifSearching(true);
    try {
      const res = await fetch(`${api.BASE_URL}/gifs/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setGifResults(data.data ?? []);
    } catch { setGifResults([]); }
    finally { setGifSearching(false); }
  }

  async function handlePickCommentPhoto() {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
      setGifUrl(null);
    }
  }

  async function handleSend() {
    const trimmed = body.trim();
    if (!trimmed && !gifUrl && !photoUri || sending) return;
    setSending(true);
    try {
      let photoKey: string | undefined;
      if (photoUri) {
        const r = await api.uploadPostMedia(tournamentId, photoUri);
        photoKey = r.photoKey;
      }
      const c = await api.addPostComment(postId, trimmed, gifUrl ?? undefined, photoKey);
      setComments(prev => [c, ...prev]);
      setBody('');
      setGifUrl(null);
      setPhotoUri(null);
      setShowGifPicker(false);
      setShowEmojiPicker(false);
      setExpanded(true);
    } catch { /* silent */ }
    finally { setSending(false); }
  }

  async function handleDelete(commentId: string) {
    try {
      await api.deletePostComment(commentId);
      setComments(prev => prev.filter(c => c.id !== commentId));
    } catch { /* silent */ }
  }

  async function handleToggleProp(commentId: string) {
    if (!currentUserId) return;
    try {
      const res = await api.togglePostCommentProp(commentId);
      setComments(prev => prev.map(c => c.id === commentId ? { ...c, propCount: res.propCount, userHasPropped: res.userHasPropped } : c));
    } catch { /* silent */ }
  }

  return (
    <View style={ps.commentsContainer}>
      {comments.length > 0 && (
        <TouchableOpacity onPress={() => setExpanded(e => !e)} style={ps.commentToggle}>
          <Text style={ps.commentToggleText}>
            {expanded
              ? `▲ Hide comments (${comments.length})`
              : `💬 ${comments.length} comment${comments.length !== 1 ? 's' : ''}`}
          </Text>
        </TouchableOpacity>
      )}

      {expanded && comments.length > 0 && (
        comments.map(c => {
          const name = c.user.profile?.username ?? c.user.displayName;
          const avatarUrl = c.user.profile?.profilePhotoUrl ?? null;
          const isOwn = currentUserId === c.userId;
          return (
            <View key={c.id} style={ps.commentRow}>
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={ps.commentAvatar} />
              ) : (
                <View style={ps.commentAvatarFallback}>
                  <Text style={ps.commentAvatarInitial}>{name.charAt(0).toUpperCase()}</Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                  <Text style={ps.commentAuthor}>
                    <Text onPress={() => c.user.profile?.username && navigation.navigate('PublicProfile', { username: c.user.profile.username })} style={c.user.profile?.username ? { color: colors.accent } : undefined}>{name}</Text>
                    {' '}<Text style={ps.commentTime}>{relativeTime(c.createdAt)}</Text>
                  </Text>
                  <TouchableOpacity onPress={() => currentUserId && handleToggleProp(c.id)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }} style={{ marginLeft: 'auto', opacity: c.userHasPropped ? 1 : 0.35 }}>
                    <Text style={{ fontSize: 13 }}>👍</Text>
                  </TouchableOpacity>
                  {(c.propCount ?? 0) > 0 && (
                    <TouchableOpacity onPress={() => setWhoCommentId(c.id)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                      <Text style={{ fontSize: 11, color: c.userHasPropped ? colors.accent : colors.textSub, fontWeight: '700' }}>{c.propCount}</Text>
                    </TouchableOpacity>
                  )}
                  {isOwn && (
                    <TouchableOpacity onPress={() => handleDelete(c.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Text style={ps.commentDelete}>✕</Text>
                    </TouchableOpacity>
                  )}
                </View>
                <Text style={ps.commentBody}>{renderWithMentions(c.body, (u) => navigation.navigate('PublicProfile', { username: u }))}</Text>
                {(c.gifUrl || c.photoUrl) ? <Image source={{ uri: c.gifUrl ?? c.photoUrl ?? '' }} style={{ width: '100%', height: 120, borderRadius: 8, marginTop: 4 }} resizeMode="cover" /> : null}
              </View>
            </View>
          );
        })
      )}

      {currentUserId && (
        <View>
          <View style={ps.commentInputRow}>
            <MentionTextInput
              style={ps.commentInput}
              placeholder="Add a comment…"
              value={body}
              onChangeText={setBody}
              onSend={handleSend}
            />
            <TouchableOpacity
              style={[ps.commentSend, ((!body.trim() && !gifUrl && !photoUri) || sending) && { opacity: 0.4 }]}
              onPress={handleSend}
              disabled={(!body.trim() && !gifUrl && !photoUri) || sending}
            >
              <Text style={ps.commentSendText}>Post</Text>
            </TouchableOpacity>
          </View>
          {(gifUrl || photoUri) ? (
            <View style={{ marginTop: 4, position: 'relative', alignSelf: 'flex-start' }}>
              <Image source={{ uri: gifUrl ?? photoUri ?? '' }} style={{ height: 80, width: 120, borderRadius: 8 }} resizeMode="cover" />
              <TouchableOpacity onPress={() => { setGifUrl(null); setPhotoUri(null); }} style={{ position: 'absolute', top: 4, right: 4, width: 18, height: 18, borderRadius: 9, backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: '#fff', fontSize: 11, lineHeight: 14 }}>×</Text>
              </TouchableOpacity>
            </View>
          ) : null}
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
            <TouchableOpacity onPress={handlePickCommentPhoto}
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
                <TextInput
                  value={gifQuery}
                  onChangeText={setGifQuery}
                  onSubmitEditing={() => searchCommentGifs(gifQuery)}
                  placeholder="Search GIFs…"
                  placeholderTextColor={colors.textMuted}
                  style={{ flex: 1, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.textMuted, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6, color: colors.text, fontSize: 12 }}
                  autoFocus
                />
                <TouchableOpacity onPress={() => searchCommentGifs(gifQuery)} style={{ backgroundColor: colors.accent, borderRadius: 6, paddingHorizontal: 12, justifyContent: 'center' }}>
                  <Text style={{ color: colors.bg, fontWeight: '700', fontSize: 12 }}>Search</Text>
                </TouchableOpacity>
              </View>
              {gifSearching && <Text style={{ color: colors.textMuted, fontSize: 12, textAlign: 'center', padding: 12 }}>Searching…</Text>}
              {!gifSearching && gifResults.length > 0 && (
                <ScrollView style={{ maxHeight: 240 }} nestedScrollEnabled keyboardShouldPersistTaps="handled">
                  {Array.from({ length: Math.ceil(gifResults.length / 3) }, (_, ri) => (
                    <View key={ri} style={{ flexDirection: 'row' }}>
                      {gifResults.slice(ri * 3, ri * 3 + 3).map(g => (
                        <TouchableOpacity key={g.id} onPress={() => { setGifUrl(g.full); setShowGifPicker(false); }} style={{ flex: 1, aspectRatio: 1, margin: 2, borderRadius: 6, overflow: 'hidden', backgroundColor: colors.bg }}>
                          <Image source={{ uri: g.preview }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                        </TouchableOpacity>
                      ))}
                    </View>
                  ))}
                </ScrollView>
              )}
              {!gifSearching && gifResults.length === 0 && (
                <Text style={{ color: colors.textMuted, fontSize: 12, textAlign: 'center', padding: 10 }}>{gifQuery ? 'No results.' : 'Search for a GIF above'}</Text>
              )}
            </View>
          )}
        </View>
      )}
      {whoCommentId && (
        <CommentPropsWhoModal
          fetchWho={() => api.getPostCommentPropsWho(whoCommentId)}
          onClose={() => setWhoCommentId(null)}
        />
      )}
    </View>
  );
}

// ── Post card ─────────────────────────────────────────────────────────────────

interface PostCardProps {
  post: TournamentPost;
  currentUserId: string | null;
  userRole: string;
  directorId?: string | null;
  tournamentId: string;
  onEdit: (post: TournamentPost) => void;
  onDelete: (postId: string) => void;
}

function PostCard({ post, currentUserId, userRole, directorId, tournamentId, onEdit, onDelete }: PostCardProps) {
  const navigation = useNavigation<any>();
  const profileUsername = post.user.profile?.username ?? null;
  const username = profileUsername ?? post.user.displayName;
  const avatar = post.user.profile?.profilePhotoUrl;
  const initials = post.user.displayName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const isAuthor = currentUserId && post.user.id === currentUserId;
  const isAdmin = userRole === 'ADMIN' || userRole === 'TOURNAMENT_ADMIN';
  const isDirector = currentUserId && directorId === currentUserId;
  const canEdit = post.type === 'ANGLER_POST' && isAuthor;
  const canDelete = post.type === 'ANGLER_POST' && (isAuthor || isAdmin || isDirector);

  function showMenu() {
    const options: string[] = [];
    if (canEdit) options.push('Edit');
    if (canDelete) options.push('Delete');
    options.push('Cancel');
    Alert.alert('Post Options', undefined, [
      ...(canEdit ? [{ text: 'Edit', onPress: () => onEdit(post) }] : []),
      ...(canDelete ? [{ text: 'Delete', style: 'destructive' as const, onPress: () => onDelete(post.id) }] : []),
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  return (
    <View style={ps.card}>
      {/* Avatar + name row */}
      <View style={ps.header}>
        {avatar ? (
          <Image source={{ uri: avatar }} style={ps.avatar} />
        ) : (
          <View style={[ps.avatar, ps.avatarFallback]}>
            <Text style={ps.avatarInitials}>{initials}</Text>
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={ps.name} onPress={profileUsername ? () => navigation.navigate('PublicProfile', { username: profileUsername }) : undefined}>{username}</Text>
          <Text style={ps.time}>{relativeTime(post.createdAt)}</Text>
        </View>
        <PostTypeBadge type={post.type} />
        {(canEdit || canDelete) && (
          <TouchableOpacity onPress={showMenu} style={ps.menuBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={ps.menuBtnText}>⋮</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* CATCH post */}
      {post.type === 'CATCH' && post.submission && (
        <View style={ps.catchBody}>
          {post.photoUrl && (
            <TouchableOpacity activeOpacity={0.9} onPress={() => setLightboxUrl(post.photoUrl!)}>
              <Image source={{ uri: post.photoUrl }} style={ps.catchPhoto} resizeMode="cover" />
            </TouchableOpacity>
          )}
          <View style={ps.catchMeta}>
            <Text style={ps.catchLength}>
              {(post.submission.fishLengthCm / 2.54).toFixed(1)}"
              {post.submission.speciesName ? `  ·  ${post.submission.speciesName}` : ''}
            </Text>
            {post.submission.released && (
              <Text style={ps.releasedBadge}>↩ Released</Text>
            )}
          </View>
        </View>
      )}

      {/* ANNOUNCEMENT — render title bold, message below */}
      {post.type === 'ANNOUNCEMENT' && post.body && (() => {
        const [titleLine, ...rest] = post.body.split('\n');
        const title = titleLine.replace(/\*\*(.*?)\*\*/g, '$1');
        const message = rest.join('\n').trim();
        return (
          <>
            <Text style={ps.announceTitle}>{title}</Text>
            {message ? <Text style={ps.body}>{message}</Text> : null}
          </>
        );
      })()}

      {/* ANGLER_POST / CHECK_IN body */}
      {post.type !== 'ANNOUNCEMENT' && post.body ? <Text style={ps.body}>{renderWithMentions(post.body, (u) => navigation.navigate('PublicProfile', { username: u }))}</Text> : null}

      {post.type === 'CHECK_IN' && !post.body && (
        <Text style={ps.body}>Checked in to the tournament 🎣</Text>
      )}

      {post.photoUrl && post.type === 'ANGLER_POST' && (
        <TouchableOpacity activeOpacity={0.9} onPress={() => setLightboxUrl(post.photoUrl!)}>
          <Image source={{ uri: post.photoUrl }} style={ps.anglerPhoto} resizeMode="cover" />
        </TouchableOpacity>
      )}

      <PostComments postId={post.id} tournamentId={tournamentId} currentUserId={currentUserId} />

      {/* Photo lightbox */}
      <Modal visible={!!lightboxUrl} transparent animationType="fade" onRequestClose={() => setLightboxUrl(null)}>
        <View style={ps.lightboxOverlay}>
          <TouchableOpacity style={ps.lightboxClose} onPress={() => setLightboxUrl(null)}>
            <Text style={ps.lightboxCloseText}>✕</Text>
          </TouchableOpacity>
          {lightboxUrl && (
            <Image source={{ uri: lightboxUrl }} style={ps.lightboxImage} resizeMode="contain" />
          )}
        </View>
      </Modal>
    </View>
  );
}

function PostTypeBadge({ type }: { type: TournamentPost['type'] }) {
  const map: Record<string, { label: string; color: string }> = {
    CATCH:        { label: '🎣 Catch', color: colors.verified },
    ANNOUNCEMENT: { label: '📢 News',  color: '#E67E22' },
    CHECK_IN:     { label: '✅ Check-In', color: colors.accent },
    ANGLER_POST:  { label: '💬 Post',  color: colors.textMuted },
  };
  const { label, color } = map[type] ?? { label: type, color: colors.textMuted };
  return (
    <View style={[ps.typeBadge, { borderColor: color + '60', backgroundColor: color + '18' }]}>
      <Text style={[ps.typeBadgeText, { color }]}>{label}</Text>
    </View>
  );
}

const ps = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 10,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  menuBtn: { padding: 4, marginLeft: 4 },
  menuBtnText: { color: colors.textMuted, fontSize: 20, fontWeight: '700', lineHeight: 20 },
  avatar: { width: 36, height: 36, borderRadius: 18 },
  avatarFallback: {
    backgroundColor: colors.surfaceHigh,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: { fontSize: 13, fontWeight: '700', color: colors.textSub },
  name: { fontSize: 13, fontWeight: '700', color: colors.text },
  time: { ...typography.caption, color: colors.textMuted, marginTop: 1 },
  typeBadge: {
    borderRadius: 6, borderWidth: 1,
    paddingHorizontal: 7, paddingVertical: 2,
  },
  typeBadgeText: { fontSize: 10, fontWeight: '700' },
  catchBody: {},
  catchPhoto: { width: '100%', height: 180, borderRadius: 10, marginBottom: 8 },
  catchMeta: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  catchLength: { fontSize: 15, fontWeight: '700', color: colors.text },
  releasedBadge: { ...typography.caption, color: colors.verified, fontSize: 11 },
  announceTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 4 },
  body: { ...typography.bodyMd, color: colors.text, lineHeight: 20 },
  anglerPhoto: { width: '100%', height: 200, borderRadius: 10, marginTop: 8 },
  commentsContainer: { marginTop: 10, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8 },
  commentToggle: { paddingVertical: 4 },
  commentToggleText: { fontSize: 12, fontWeight: '600', color: colors.textSub },
  noComments: { fontSize: 12, color: colors.textMuted, marginTop: 6, marginBottom: 4 },
  commentRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 8 },
  commentAvatar: { width: 26, height: 26, borderRadius: 13, marginTop: 1 },
  commentAvatarFallback: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.surfaceHigh, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  commentAvatarInitial: { fontSize: 11, fontWeight: '700', color: colors.textMuted },
  commentAuthor: { fontSize: 12, fontWeight: '700', color: colors.text },
  commentTime: { fontSize: 11, fontWeight: '400', color: colors.textMuted },
  commentBody: { fontSize: 13, color: colors.textSub, marginTop: 2, lineHeight: 18 },
  commentDelete: { fontSize: 12, color: colors.textMuted, paddingLeft: 4 },
  commentInputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 10 },
  commentInput: {
    flex: 1, backgroundColor: colors.surfaceHigh, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 8, color: colors.text,
    fontSize: 13, maxHeight: 80, borderWidth: 1, borderColor: colors.border,
  },
  commentSend: { backgroundColor: colors.accent, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  commentSendText: { fontSize: 13, fontWeight: '700', color: colors.bg },
  lightboxOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.93)', alignItems: 'center', justifyContent: 'center' },
  lightboxImage: { width: '100%', height: '85%' },
  lightboxClose: { position: 'absolute', top: 52, right: 18, zIndex: 10, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  lightboxCloseText: { color: '#fff', fontSize: 18, fontWeight: '700' },
});

// ── Main screen ───────────────────────────────────────────────────────────────

export default function TournamentDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute<Props['route']>();
  const { tournamentId } = route.params;
  const { scoringMethod: activeScoringMethod } = useContext(TournamentContext);

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<TournamentPost[]>([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const [feedCursor, setFeedCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [composeText, setComposeText] = useState('');
  const [posting, setPosting] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>('USER');
  const [postPhotoUri, setPostPhotoUri] = useState<string | null>(null);
  const [postGifUrl, setPostGifUrl] = useState<string | null>(null);
  const [postGifPreview, setPostGifPreview] = useState<string | null>(null);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [gifQuery, setGifQuery] = useState('');
  const [gifResults, setGifResults] = useState<Array<{ id: string; preview: string; full: string }>>([]);
  const [gifSearching, setGifSearching] = useState(false);
  const [editingPost, setEditingPost] = useState<TournamentPost | null>(null);
  const [editBody, setEditBody] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [editPhotoUri, setEditPhotoUri] = useState<string | null>(null);
  const [editGifUrlForEdit, setEditGifUrlForEdit] = useState<string | null>(null);
  const [editGifPreviewForEdit, setEditGifPreviewForEdit] = useState<string | null>(null);
  const [showEditGifPicker, setShowEditGifPicker] = useState(false);
  const [showEditEmojiPicker, setShowEditEmojiPicker] = useState(false);
  const [editGifQuery, setEditGifQuery] = useState('');
  const [editGifResults, setEditGifResults] = useState<Array<{ id: string; preview: string; full: string }>>([]);
  const [editGifSearching, setEditGifSearching] = useState(false);
  const [entryStatus, setEntryStatus] = useState<'PAID' | 'PENDING' | null>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);

  const { initPaymentSheet, presentPaymentSheet } = useStripe();

  useEffect(() => {
    storage.getToken().then(async (token) => {
      if (!token) return;
      // Decode JWT to get userId and role (base64 payload)
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setCurrentUserId(payload.sub ?? null);
        setUserRole(payload.role ?? 'USER');
      } catch {}
    });
  }, []);

  useEffect(() => {
    api.getTournamentDetail(tournamentId)
      .then(setTournament)
      .catch(() => Alert.alert('Error', 'Could not load tournament details.'))
      .finally(() => setLoading(false));

    api.getMyEntry(tournamentId)
      .then(entry => { if (entry) setEntryStatus(entry.status as 'PAID' | 'PENDING'); })
      .catch(() => {});

    api.getTournamentFeed(tournamentId)
      .then(({ posts: p, nextCursor }) => {
        setPosts(p);
        setFeedCursor(nextCursor);
      })
      .catch(() => {})
      .finally(() => setFeedLoading(false));
  }, [tournamentId]);

  const loadMoreFeed = useCallback(async () => {
    if (!feedCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const { posts: more, nextCursor } = await api.getTournamentFeed(tournamentId, feedCursor);
      setPosts(prev => [...prev, ...more]);
      setFeedCursor(nextCursor);
    } catch {}
    setLoadingMore(false);
  }, [feedCursor, loadingMore, tournamentId]);

  const handlePost = useCallback(async () => {
    const text = composeText.trim();
    if (!text && !postPhotoUri && !postGifUrl) return;
    setPosting(true);
    try {
      let photoKey: string | undefined;
      if (postPhotoUri) {
        const r = await api.uploadPostMedia(tournamentId, postPhotoUri);
        photoKey = r.photoKey;
      }
      const post = await api.postToTournamentFeed(tournamentId, text, photoKey, postGifUrl ?? undefined);
      setPosts(prev => [post, ...prev]);
      setComposeText('');
      setPostPhotoUri(null);
      setPostGifUrl(null);
      setPostGifPreview(null);
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Could not post.');
    }
    setPosting(false);
  }, [composeText, postPhotoUri, postGifUrl, tournamentId]);

  const handleEditPress = useCallback((post: TournamentPost) => {
    setEditingPost(post);
    setEditBody(post.body ?? '');
    setEditPhotoUri(null);
    setEditGifUrlForEdit(null);
    setEditGifPreviewForEdit(null);
    setShowEditGifPicker(false);
    setShowEditEmojiPicker(false);
    setEditGifQuery('');
    setEditGifResults([]);
  }, []);

  const handleDeletePress = useCallback((postId: string) => {
    Alert.alert('Delete Post', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await api.deleteTournamentPost(postId);
          setPosts(prev => prev.filter(p => p.id !== postId));
        } catch { Alert.alert('Error', 'Could not delete post.'); }
      }},
    ]);
  }, []);

  const handleSaveEdit = useCallback(async () => {
    if (!editingPost || editSaving) return;
    setEditSaving(true);
    try {
      let photoKey: string | undefined;
      let gifUrl: string | undefined;
      if (editPhotoUri) {
        const r = await api.uploadPostMedia(tournamentId, editPhotoUri);
        photoKey = r.photoKey;
      } else if (editGifUrlForEdit) {
        gifUrl = editGifUrlForEdit;
      }
      const updated = await api.editTournamentPost(editingPost.id, editBody.trim(), undefined, photoKey, gifUrl);
      setPosts(prev => prev.map(p => p.id === editingPost.id ? { ...p, body: updated.body, photoUrl: updated.photoUrl ?? p.photoUrl } : p));
      setEditingPost(null);
      setEditPhotoUri(null);
      setEditGifUrlForEdit(null);
      setEditGifPreviewForEdit(null);
    } catch { Alert.alert('Error', 'Could not save edit.'); }
    finally { setEditSaving(false); }
  }, [editingPost, editBody, editSaving, editPhotoUri, editGifUrlForEdit, tournamentId]);

  const handleEditPickPhoto = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted' && (status as string) !== 'limited') {
      Alert.alert(
        'Photo Library Access Required',
        'Please allow photo library access in Settings to attach images.',
        [{ text: 'Cancel', style: 'cancel' }, { text: 'Open Settings', onPress: () => Linking.openSettings() }]
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets[0]) {
      setEditPhotoUri(result.assets[0].uri);
      setEditGifUrlForEdit(null);
      setEditGifPreviewForEdit(null);
    }
  }, []);

  const searchEditGifs = useCallback(async (q: string) => {
    if (!q.trim()) return;
    setEditGifSearching(true);
    try {
      const res = await fetch(`${api.BASE_URL}/gifs/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setEditGifResults(data.data ?? []);
    } catch { setEditGifResults([]); }
    finally { setEditGifSearching(false); }
  }, []);

  const selectEditGif = useCallback((gif: { id: string; preview: string; full: string }) => {
    setEditGifUrlForEdit(gif.full);
    setEditGifPreviewForEdit(gif.preview);
    setEditPhotoUri(null);
    setShowEditGifPicker(false);
    setEditGifResults([]);
    setEditGifQuery('');
  }, []);

  const handlePickPhoto = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted' && (status as string) !== 'limited') {
      Alert.alert(
        'Photo Library Access Required',
        'Please allow photo library access in Settings to attach images.',
        [{ text: 'Cancel', style: 'cancel' }, { text: 'Open Settings', onPress: () => Linking.openSettings() }]
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets[0]) {
      setPostPhotoUri(result.assets[0].uri);
      setPostGifUrl(null);
      setPostGifPreview(null);
    }
  }, []);

  const searchGifs = useCallback(async (q: string) => {
    if (!q.trim()) return;
    setGifSearching(true);
    try {
      const res = await fetch(`${api.BASE_URL}/gifs/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setGifResults(data.data ?? []);
    } catch { setGifResults([]); }
    finally { setGifSearching(false); }
  }, []);

  const selectGif = useCallback((gif: { id: string; preview: string; full: string }) => {
    setPostGifUrl(gif.full);
    setPostGifPreview(gif.preview);
    setPostPhotoUri(null);
    setShowGifPicker(false);
    setGifResults([]);
    setGifQuery('');
  }, []);

  const handleEnterTournament = useCallback(async () => {
    if (!tournament) return;

    // Free tournament — go straight to submission
    if (tournament.entryFeeCents === 0) {
      (navigation as any).navigate('SubmissionFlow', { tournamentId: tournament.id, scoringMethod: tournament.scoringMethod });
      return;
    }

    // Already paid — go straight to submission
    if (entryStatus === 'PAID') {
      (navigation as any).navigate('SubmissionFlow', { tournamentId: tournament.id, scoringMethod: tournament.scoringMethod });
      return;
    }

    setPaymentLoading(true);
    try {
      const { clientSecret, entryFeeCents } = await api.createEntryPaymentIntent(tournament.id);

      const { error: initError } = await initPaymentSheet({
        paymentIntentClientSecret: clientSecret,
        merchantDisplayName: 'FishLeague',
        applePay: { merchantCountryCode: 'US' },
      });
      if (initError) {
        Alert.alert('Payment Error', initError.message);
        return;
      }

      const { error: presentError } = await presentPaymentSheet();
      if (presentError) {
        if (presentError.code !== 'Canceled') {
          Alert.alert('Payment Error', presentError.message);
        }
        return;
      }

      // Payment succeeded — webhook will mark PAID on backend
      setEntryStatus('PAID');
      Alert.alert(
        '🎣 You\'re In!',
        `Entry fee of $${(entryFeeCents / 100).toFixed(2)} paid. Go catch a big one!`,
        [{ text: 'Submit a Catch', onPress: () => (navigation as any).navigate('SubmissionFlow', { tournamentId: tournament.id, scoringMethod: tournament.scoringMethod }) }, { text: 'OK' }],
      );
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Could not process payment');
    } finally {
      setPaymentLoading(false);
    }
  }, [tournament, entryStatus, initPaymentSheet, presentPaymentSheet, navigation]);

  const isAdminOrDirector = userRole === 'ADMIN' || userRole === 'TOURNAMENT_ADMIN';

  if (loading) {
    return (
      <SafeAreaView style={s.safeArea}>
        <View style={s.loadingWrap}>
          <Image source={require('../../../assets/icon.png')} style={{ width: 90, height: 90 }} resizeMode="contain" />
          <ActivityIndicator size="small" color={colors.accent} style={{ marginTop: 16 }} />
        </View>
      </SafeAreaView>
    );
  }

  if (!tournament) {
    return (
      <SafeAreaView style={s.safeArea}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Text style={s.backBtnText}>‹ Back</Text>
        </TouchableOpacity>
        <View style={s.loadingWrap}>
          <Text style={s.errorText}>Tournament not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const method = tournament.scoringMethod ?? activeScoringMethod ?? 'LENGTH';
  const daysLeft = tournament.endsAt
    ? Math.max(0, Math.ceil((new Date(tournament.endsAt).getTime() - Date.now()) / 86400000))
    : null;
  const isOpen = tournament.isOpen;
  const qrValue = tournament.checkInCode
    ? `fishleague://check-in?code=${tournament.checkInCode}`
    : null;

  return (
    <SafeAreaView style={s.safeArea}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

          {/* ── Header ──────────────────────────────────────────────────────── */}
          <View style={s.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn} activeOpacity={0.7}>
              <Text style={s.backBtnText}>‹ Back</Text>
            </TouchableOpacity>
          </View>

          {/* ── Banner ──────────────────────────────────────────────────────── */}
          {tournament.bannerUrl && (
            <View style={s.bannerWrap}>
              <Image source={{ uri: tournament.bannerUrl }} style={s.bannerImage} resizeMode="cover" />
              <View style={s.bannerOverlay} />
            </View>
          )}

          {/* ── Hero card ───────────────────────────────────────────────────── */}
          <View style={s.heroCard}>
            <View style={s.heroTop}>
              <View style={[s.statusPill, { backgroundColor: isOpen ? colors.verified + '20' : colors.textMuted + '20', borderColor: isOpen ? colors.verified + '60' : colors.textMuted + '40' }]}>
                <Text style={[s.statusPillText, { color: isOpen ? colors.verified : colors.textMuted }]}>
                  {isOpen ? '● ACTIVE' : '◉ CLOSED'}
                </Text>
              </View>
              <Text style={s.weekLabel}>Week {tournament.weekNumber} · {tournament.year}</Text>
            </View>
            <Text style={s.heroName}>{tournament.name}</Text>
            <Text style={s.heroRegion}>{tournament.region?.name ?? 'All Regions'}</Text>

            {/* Stats row */}
            <View style={s.statsRow}>
              <View style={s.stat}>
                <Text style={s.statVal}>{scoringLabel(method)}</Text>
                <Text style={s.statLabel}>SCORING</Text>
              </View>
              <View style={s.statDivider} />
              {daysLeft !== null && isOpen ? (
                <View style={s.stat}>
                  <Text style={s.statVal}>{daysLeft}d</Text>
                  <Text style={s.statLabel}>REMAINING</Text>
                </View>
              ) : (
                <View style={s.stat}>
                  <Text style={s.statVal}>
                    {new Date(tournament.endsAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </Text>
                  <Text style={s.statLabel}>ENDED</Text>
                </View>
              )}
              <View style={s.statDivider} />
              <View style={s.stat}>
                <Text style={s.statVal}>{tournament._count?.submissions ?? '—'}</Text>
                <Text style={s.statLabel}>CATCHES</Text>
              </View>
            </View>

            {/* Dates */}
            <View style={s.datesRow}>
              <Text style={s.dateLabel}>
                {new Date(tournament.startsAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                {' – '}
                {new Date(tournament.endsAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </Text>
            </View>

            {/* Entry fee + prize */}
            <View style={s.feeRow}>
              <View style={s.feeItem}>
                <Text style={s.feeLabel}>ENTRY FEE</Text>
                <Text style={s.feeVal}>{formatCents(tournament.entryFeeCents)}</Text>
              </View>
              {tournament.prizePoolCents > 0 && (
                <>
                  <View style={s.statDivider} />
                  <View style={s.feeItem}>
                    <Text style={s.feeLabel}>PRIZE POOL</Text>
                    <Text style={[s.feeVal, { color: colors.accent }]}>{formatCents(tournament.prizePoolCents)}</Text>
                  </View>
                </>
              )}
            </View>

            {/* Description */}
            {tournament.description ? (
              <View style={s.descBox}>
                <Text style={s.descText}>{tournament.description}</Text>
              </View>
            ) : null}

            {/* Action buttons */}
            {isOpen && (
              <View style={s.actionRow}>
                <TouchableOpacity
                  style={[s.enterBtn, paymentLoading && { opacity: 0.6 }]}
                  activeOpacity={0.75}
                  disabled={paymentLoading}
                  onPress={handleEnterTournament}
                >
                  {paymentLoading ? (
                    <ActivityIndicator size="small" color={colors.bg} />
                  ) : (
                    <Text style={s.enterBtnText}>
                      {entryStatus === 'PAID' || tournament.entryFeeCents === 0
                        ? '🎣 Submit a Catch'
                        : `💳 Enter Tournament · ${formatCents(tournament.entryFeeCents)}`}
                    </Text>
                  )}
                </TouchableOpacity>
                <View style={s.secondaryRow}>
                  <TouchableOpacity
                    style={s.shareBtn}
                    activeOpacity={0.75}
                    onPress={() => Share.share({
                      message: `Watch the live leaderboard for ${tournament.name} 🎣\nhttps://www.fishleague.app/leaderboard/${tournament.id}`,
                      url: `https://www.fishleague.app/leaderboard/${tournament.id}`,
                    })}
                  >
                    <Text style={s.shareBtnText}>🔗 Share</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={s.scanBtn}
                    activeOpacity={0.75}
                    onPress={() => (navigation as any).navigate('CheckIn')}
                  >
                    <Text style={s.scanBtnText}>📱 Check In</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>

          {/* ── Director ────────────────────────────────────────────────────── */}
          {tournament.director && (
            <View style={s.sectionCard}>
              <Text style={s.sectionTitle}>TOURNAMENT DIRECTOR</Text>
              <TouchableOpacity
                style={s.directorRow}
                activeOpacity={tournament.director.profile?.username ? 0.7 : 1}
                onPress={() => {
                  if (tournament.director?.profile?.username) {
                    (navigation as any).navigate('PublicProfile', { username: tournament.director.profile.username });
                  }
                }}
              >
                {tournament.director.profile?.profilePhotoUrl ? (
                  <Image
                    source={{ uri: tournament.director.profile.profilePhotoUrl }}
                    style={s.directorAvatar}
                    onError={() => {}}
                  />
                ) : (
                  <View style={[s.directorAvatar, s.directorAvatarFallback]}>
                    <Text style={s.directorInitials}>
                      {tournament.director.displayName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                    </Text>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={s.directorName}>{tournament.director.displayName}</Text>
                  {tournament.director.profile?.username ? (
                    <Text style={s.directorUsername}>@{tournament.director.profile.username}</Text>
                  ) : null}
                </View>
                {tournament.director.profile?.username && (
                  <Text style={{ color: colors.accent, fontSize: 18 }}>›</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* ── QR Check-In ─────────────────────────────────────────────────── */}
          <View style={s.sectionCard}>
            <Text style={s.sectionTitle}>CHECK-IN</Text>
            <Text style={s.checkInCount}>
              {tournament._count?.checkIns ?? 0} anglers checked in
            </Text>
            {isAdminOrDirector && qrValue ? (
              <>
                <Text style={s.qrHint}>Display this QR code at the event — anglers scan to check in.</Text>
                <View style={s.qrWrap}>
                  <QRCode
                    value={qrValue}
                    size={200}
                    backgroundColor={colors.surface}
                    color={colors.text}
                  />
                </View>
              </>
            ) : isAdminOrDirector && !qrValue ? (
              <Text style={s.qrHint}>No check-in code generated yet. Generate one from the admin panel.</Text>
            ) : (
              <TouchableOpacity
                style={s.scanBtn}
                activeOpacity={0.75}
                onPress={() => (navigation as any).navigate('CheckIn')}
              >
                <Text style={s.scanBtnText}>📱 Scan QR to Check In</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* ── Leaderboard preview ──────────────────────────────────────────── */}
          {tournament.top3 && tournament.top3.length > 0 && (
            <View style={s.sectionCard}>
              <View style={s.sectionTitleRow}>
                <Text style={s.sectionTitle}>LEADERBOARD</Text>
                <Text style={s.sectionSub}>Top 3</Text>
              </View>
              {tournament.top3.map((entry, i) => (
                <View key={i} style={[s.lbRow, i < tournament.top3!.length - 1 && s.lbRowBorder]}>
                  <Text style={s.lbMedal}>{medalEmoji(i + 1)}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={s.lbName}>
                      {entry.user.profile?.username ? `@${entry.user.profile.username}` : entry.user.displayName}
                    </Text>
                  </View>
                  <Text style={s.lbScore}>{formatScore(entry, method)}</Text>
                </View>
              ))}
            </View>
          )}

          {/* ── Social Feed ──────────────────────────────────────────────────── */}
          <View style={s.sectionCard}>
            <Text style={s.sectionTitle}>TOURNAMENT FEED</Text>

            {/* Compose */}
            <View style={s.composeWrap}>
              <TextInput
                style={s.composeInput}
                value={composeText}
                onChangeText={setComposeText}
                placeholder="Share something with the tournament…"
                placeholderTextColor={colors.textMuted}
                multiline
                maxLength={1000}
                returnKeyType="default"
              />

              {/* Media preview */}
              {(postPhotoUri || postGifPreview) && (
                <View style={s.mediaPreviewWrap}>
                  <Image source={{ uri: postPhotoUri ?? postGifPreview ?? '' }} style={s.mediaPreview} resizeMode="cover" />
                  <TouchableOpacity onPress={() => { setPostPhotoUri(null); setPostGifUrl(null); setPostGifPreview(null); }} style={s.mediaRemoveBtn}>
                    <Text style={s.mediaRemoveTxt}>×</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Action row */}
              <View style={s.composeActions}>
                <TouchableOpacity onPress={handlePickPhoto} style={s.composeActionBtn}>
                  <Text style={s.composeActionIcon}>📎</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { setShowGifPicker(true); setShowEmojiPicker(false); }} style={s.composeActionBtn}>
                  <Text style={s.composeActionGif}>GIF</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { setShowEmojiPicker(true); setShowGifPicker(false); }} style={s.composeActionBtn}>
                  <Text style={s.composeActionIcon}>😊</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.postBtn, (!composeText.trim() && !postPhotoUri && !postGifUrl || posting) && s.postBtnDisabled]}
                  onPress={handlePost}
                  disabled={(!composeText.trim() && !postPhotoUri && !postGifUrl) || posting}
                  activeOpacity={0.8}
                >
                  {posting
                    ? <ActivityIndicator size="small" color={colors.bg} />
                    : <Text style={s.postBtnText}>POST</Text>
                  }
                </TouchableOpacity>
              </View>
            </View>

            {/* Edit Post Modal */}
            <Modal visible={!!editingPost} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => { setEditingPost(null); setShowEditGifPicker(false); setShowEditEmojiPicker(false); }}>
              <SafeAreaView style={s.modalSafe}>
                <View style={s.modalHeader}>
                  <Text style={s.modalTitle}>Edit Post</Text>
                  <TouchableOpacity onPress={() => { setEditingPost(null); setShowEditGifPicker(false); setShowEditEmojiPicker(false); }} style={s.modalClose}>
                    <Text style={s.modalCloseTxt}>✕</Text>
                  </TouchableOpacity>
                </View>
                <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
                  <TextInput
                    value={editBody}
                    onChangeText={setEditBody}
                    multiline
                    style={[s.composeInput, { minHeight: 100, textAlignVertical: 'top' }]}
                    autoFocus
                  />
                  {/* New media preview */}
                  {(editPhotoUri || editGifPreviewForEdit) && (
                    <View style={{ marginTop: 8, position: 'relative', alignSelf: 'flex-start' }}>
                      <Image source={{ uri: editPhotoUri ?? editGifPreviewForEdit ?? '' }} style={{ width: 160, height: 120, borderRadius: 8 }} resizeMode="cover" />
                      <TouchableOpacity onPress={() => { setEditPhotoUri(null); setEditGifUrlForEdit(null); setEditGifPreviewForEdit(null); }}
                        style={{ position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ color: '#fff', fontSize: 13, lineHeight: 13 }}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                  {/* Action row */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 }}>
                    <TouchableOpacity onPress={handleEditPickPhoto} style={s.composeActionBtn} activeOpacity={0.7}>
                      <Text style={s.composeActionIcon}>📎</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => { setShowEditGifPicker(v => !v); setShowEditEmojiPicker(false); }}
                      style={[s.composeActionBtn, showEditGifPicker && { borderColor: colors.accent, backgroundColor: colors.accent + '20' }]} activeOpacity={0.7}>
                      <Text style={[s.composeActionIcon, { fontSize: 11, fontWeight: '800' as const }, showEditGifPicker && { color: colors.accent }]}>GIF</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => { setShowEditEmojiPicker(v => !v); setShowEditGifPicker(false); }}
                      style={[s.composeActionBtn, showEditEmojiPicker && { borderColor: colors.accent, backgroundColor: colors.accent + '20' }]} activeOpacity={0.7}>
                      <Text style={s.composeActionIcon}>😊</Text>
                    </TouchableOpacity>
                  </View>
                  {/* Inline GIF picker */}
                  {showEditGifPicker && (
                    <View style={{ marginTop: 10, backgroundColor: colors.surfaceHigh, borderRadius: 12, padding: 10 }}>
                      <View style={s.gifSearchRow}>
                        <TextInput
                          style={s.gifSearchInput}
                          value={editGifQuery}
                          onChangeText={setEditGifQuery}
                          placeholder="Search Giphy…"
                          placeholderTextColor={colors.textMuted}
                          returnKeyType="search"
                          onSubmitEditing={() => searchEditGifs(editGifQuery)}
                        />
                        <TouchableOpacity onPress={() => searchEditGifs(editGifQuery)} style={s.gifSearchBtn}>
                          <Text style={s.gifSearchBtnTxt}>Go</Text>
                        </TouchableOpacity>
                      </View>
                      {editGifSearching
                        ? <ActivityIndicator color={colors.accent} style={{ marginTop: 20 }} />
                        : <FlatList
                            data={editGifResults}
                            numColumns={3}
                            keyExtractor={g => g.id}
                            scrollEnabled={false}
                            contentContainerStyle={{ paddingTop: 4 }}
                            ListEmptyComponent={<Text style={s.gifEmpty}>{editGifQuery ? 'No results' : 'Search for a GIF above'}</Text>}
                            renderItem={({ item }) => (
                              <TouchableOpacity onPress={() => selectEditGif(item)} style={s.gifThumbWrap} activeOpacity={0.8}>
                                <Image source={{ uri: item.preview }} style={s.gifThumb} resizeMode="cover" />
                              </TouchableOpacity>
                            )}
                          />
                      }
                      <Text style={s.giphyAttr}>Powered by GIPHY</Text>
                    </View>
                  )}
                  {/* Inline Emoji picker */}
                  {showEditEmojiPicker && (
                    <View style={{ marginTop: 10 }}>
                      {[
                        { label: '🎣 Fishing', emojis: ['🎣', '🐟', '🐠', '🐡', '🦈', '🦑', '🦐', '🦀', '🦞', '🐙', '🌊', '⚓', '🚤', '🛶', '🏖️', '🌅'] },
                        { label: '🏆 Sports', emojis: ['🏆', '🥇', '🥈', '🥉', '🎯', '💪', '🤙', '👊', '🙌', '👏', '🎉', '🎊', '🔥', '⚡', '💥', '🌟'] },
                        { label: '😀 Faces', emojis: ['😀', '😂', '🤣', '😍', '🥰', '😎', '🤩', '😏', '🙃', '😅', '😭', '😤', '🤯', '😱', '🥳', '🤦'] },
                        { label: '🌿 Nature', emojis: ['🌊', '🌅', '🌄', '⛅', '🌤️', '☀️', '🌙', '⭐', '🌿', '🌱', '🍃', '🌲', '🏔️', '🗻', '⛰️', '🌾'] },
                      ].map(cat => (
                        <View key={cat.label} style={{ marginBottom: 12 }}>
                          <Text style={s.emojiCatLabel}>{cat.label}</Text>
                          <View style={s.emojiGrid}>
                            {cat.emojis.map(em => (
                              <TouchableOpacity key={em} onPress={() => { setEditBody(b => b + em); setShowEditEmojiPicker(false); }} style={s.emojiBtn} activeOpacity={0.7}>
                                <Text style={s.emojiChar}>{em}</Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                  <TouchableOpacity
                    style={[s.postBtn, ((!editBody.trim() && !editPhotoUri && !editGifUrlForEdit) || editSaving) && s.postBtnDisabled, { marginTop: 16 }]}
                    onPress={handleSaveEdit}
                    disabled={(!editBody.trim() && !editPhotoUri && !editGifUrlForEdit) || editSaving}
                    activeOpacity={0.85}
                  >
                    <Text style={s.postBtnText}>{editSaving ? 'Saving…' : 'Save'}</Text>
                  </TouchableOpacity>
                </ScrollView>
              </SafeAreaView>
            </Modal>

            {/* GIF Picker Modal */}
            <Modal visible={showGifPicker} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowGifPicker(false)}>
              <SafeAreaView style={s.modalSafe}>
                <View style={s.modalHeader}>
                  <Text style={s.modalTitle}>Search GIFs</Text>
                  <TouchableOpacity onPress={() => setShowGifPicker(false)} style={s.modalClose}>
                    <Text style={s.modalCloseTxt}>✕</Text>
                  </TouchableOpacity>
                </View>
                <View style={s.gifSearchRow}>
                  <TextInput
                    style={s.gifSearchInput}
                    value={gifQuery}
                    onChangeText={setGifQuery}
                    placeholder="Search Giphy…"
                    placeholderTextColor={colors.textMuted}
                    returnKeyType="search"
                    onSubmitEditing={() => searchGifs(gifQuery)}
                    autoFocus
                  />
                  <TouchableOpacity onPress={() => searchGifs(gifQuery)} style={s.gifSearchBtn}>
                    <Text style={s.gifSearchBtnTxt}>Go</Text>
                  </TouchableOpacity>
                </View>
                {gifSearching
                  ? <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />
                  : <FlatList
                      data={gifResults}
                      numColumns={3}
                      keyExtractor={g => g.id}
                      contentContainerStyle={{ padding: 4 }}
                      ListEmptyComponent={<Text style={s.gifEmpty}>{gifQuery ? 'No results' : 'Search for a GIF above'}</Text>}
                      renderItem={({ item }) => (
                        <TouchableOpacity onPress={() => selectGif(item)} style={s.gifThumbWrap} activeOpacity={0.8}>
                          <Image source={{ uri: item.preview }} style={s.gifThumb} resizeMode="cover" />
                        </TouchableOpacity>
                      )}
                    />
                }
                <Text style={s.giphyAttr}>Powered by GIPHY</Text>
              </SafeAreaView>
            </Modal>

            {/* Emoji Picker Modal */}
            <Modal visible={showEmojiPicker} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowEmojiPicker(false)}>
              <SafeAreaView style={s.modalSafe}>
                <View style={s.modalHeader}>
                  <Text style={s.modalTitle}>Emoji</Text>
                  <TouchableOpacity onPress={() => setShowEmojiPicker(false)} style={s.modalClose}>
                    <Text style={s.modalCloseTxt}>✕</Text>
                  </TouchableOpacity>
                </View>
                <ScrollView contentContainerStyle={{ padding: 16 }}>
                  {[
                    { label: '🎣 Fishing', emojis: ['🎣', '🐟', '🐠', '🐡', '🦈', '🦑', '🦐', '🦀', '🦞', '🐙', '🌊', '⚓', '🚤', '🛶', '🏖️', '🌅'] },
                    { label: '🏆 Sports', emojis: ['🏆', '🥇', '🥈', '🥉', '🎯', '💪', '🤙', '👊', '🙌', '👏', '🎉', '🎊', '🔥', '⚡', '💥', '🌟'] },
                    { label: '😀 Faces', emojis: ['😀', '😂', '🤣', '😍', '🥰', '😎', '🤩', '😏', '🙃', '😅', '😭', '😤', '🤯', '😱', '🥳', '🤦'] },
                    { label: '🌿 Nature', emojis: ['🌊', '🌅', '🌄', '⛅', '🌤️', '☀️', '🌙', '⭐', '🌿', '🌱', '🍃', '🌲', '🏔️', '🗻', '⛰️', '🌾'] },
                  ].map(cat => (
                    <View key={cat.label} style={{ marginBottom: 16 }}>
                      <Text style={s.emojiCatLabel}>{cat.label}</Text>
                      <View style={s.emojiGrid}>
                        {cat.emojis.map(em => (
                          <TouchableOpacity key={em} onPress={() => { setComposeText(t => t + em); setShowEmojiPicker(false); }} style={s.emojiBtn} activeOpacity={0.7}>
                            <Text style={s.emojiChar}>{em}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  ))}
                </ScrollView>
              </SafeAreaView>
            </Modal>

            {/* Feed */}
            {feedLoading ? (
              <View style={{ alignItems: 'center', paddingVertical: 24 }}>
                <ActivityIndicator color={colors.accent} />
              </View>
            ) : posts.length === 0 ? (
              <View style={s.emptyFeed}>
                <Text style={s.emptyFeedText}>No posts yet. Be the first!</Text>
              </View>
            ) : (
              <>
                {posts.map(p => (
                  <PostCard key={p.id} post={p} currentUserId={currentUserId} userRole={userRole}
                    directorId={tournament?.directorId} tournamentId={tournamentId}
                    onEdit={handleEditPress} onDelete={handleDeletePress} />
                ))}
                {feedCursor && (
                  <TouchableOpacity style={s.loadMoreBtn} onPress={loadMoreFeed} disabled={loadingMore} activeOpacity={0.8}>
                    {loadingMore
                      ? <ActivityIndicator size="small" color={colors.accent} />
                      : <Text style={s.loadMoreText}>Load more</Text>
                    }
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.bg },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { ...typography.bodyMd, color: colors.error, textAlign: 'center' },
  scroll: { paddingBottom: 32 },

  // Banner
  bannerWrap: { width: '100%', height: 180, marginBottom: -8 },
  bannerImage: { width: '100%', height: 180 },
  bannerOverlay: {},

  // Header
  header: { paddingTop: 8, paddingHorizontal: 16, paddingBottom: 4 },
  backBtn: { paddingVertical: 8 },
  backBtnText: { fontSize: 16, color: colors.accent, fontWeight: '600' },

  // Hero
  heroCard: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 12,
    backgroundColor: colors.surfaceCard ?? colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderGold ?? colors.border,
    padding: 18,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  statusPill: {
    borderRadius: 6, borderWidth: 1,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  statusPillText: { ...typography.labelSm },
  weekLabel: { ...typography.caption, color: colors.textMuted },
  heroName: { ...typography.displaySm, color: colors.text, marginBottom: 4 },
  heroRegion: { ...typography.caption, color: colors.textSub, marginBottom: 16 },

  statsRow: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  stat: { flex: 1, alignItems: 'center' },
  statVal: { fontSize: 13, fontWeight: '700', color: colors.accent, textAlign: 'center' },
  statLabel: { ...typography.labelSm, color: colors.textMuted, marginTop: 2, textAlign: 'center' },
  statDivider: { width: 1, backgroundColor: colors.border, marginVertical: 4 },

  datesRow: { marginBottom: 12 },
  dateLabel: { ...typography.caption, color: colors.textSub },

  feeRow: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  feeItem: { flex: 1, alignItems: 'center' },
  feeLabel: { ...typography.labelSm, color: colors.textMuted },
  feeVal: { fontSize: 16, fontWeight: '800', color: colors.text, marginTop: 2 },

  descBox: {
    backgroundColor: colors.bg,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  descText: { ...typography.bodyMd, color: colors.textSub, lineHeight: 22 },

  actionRow: { gap: 8, marginTop: 4 },
  enterBtn: {
    paddingVertical: 14, alignItems: 'center',
    borderRadius: 10, backgroundColor: colors.accent,
  },
  enterBtnText: { ...typography.label, color: colors.bg, fontSize: 13 },
  secondaryRow: { flexDirection: 'row', gap: 8 },
  shareBtn: {
    flex: 1, paddingVertical: 11, alignItems: 'center',
    borderRadius: 10, borderWidth: 1, borderColor: colors.border,
  },
  shareBtnText: { ...typography.label, color: colors.textSub },
  scanBtn: {
    flex: 1, paddingVertical: 11, alignItems: 'center',
    borderRadius: 10, borderWidth: 1,
    borderColor: colors.accent + '50',
    backgroundColor: colors.accent + '10',
  },
  scanBtnText: { ...typography.label, color: colors.accent },

  // Section card
  sectionCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  sectionTitle: { ...typography.label, color: colors.textMuted, marginBottom: 14 },
  sectionSub: { ...typography.caption, color: colors.textMuted },

  // Director
  directorRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: -6 },
  directorAvatar: { width: 48, height: 48, borderRadius: 24 },
  directorAvatarFallback: {
    backgroundColor: colors.surfaceHigh,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  directorInitials: { fontSize: 16, fontWeight: '700', color: colors.textSub },
  directorName: { fontSize: 16, fontWeight: '700', color: colors.text },
  directorUsername: { ...typography.caption, color: colors.textMuted, marginTop: 2 },

  // QR
  checkInCount: { ...typography.caption, color: colors.textSub, marginTop: -8, marginBottom: 10 },
  qrHint: { ...typography.caption, color: colors.textMuted, marginBottom: 14 },
  qrWrap: { alignItems: 'center', padding: 16, backgroundColor: colors.bg, borderRadius: 12, borderWidth: 1, borderColor: colors.border },

  // Leaderboard
  lbRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, gap: 12 },
  lbRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  lbMedal: { fontSize: 20, width: 28 },
  lbName: { fontSize: 14, fontWeight: '600', color: colors.text },
  lbScore: { fontSize: 16, fontWeight: '800', color: colors.accent },

  // Feed / compose
  composeWrap: { marginBottom: 16 },
  composeInput: {
    backgroundColor: colors.bg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.text,
    fontSize: 14,
    minHeight: 42,
    maxHeight: 100,
    marginBottom: 8,
  },
  mediaPreviewWrap: { marginBottom: 8, position: 'relative', alignSelf: 'flex-start' },
  mediaPreview: { width: 120, height: 90, borderRadius: 8, borderWidth: 1, borderColor: colors.border },
  mediaRemoveBtn: { position: 'absolute', top: -8, right: -8, width: 22, height: 22, borderRadius: 11, backgroundColor: colors.surfaceHigh, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  mediaRemoveTxt: { color: colors.text, fontSize: 14, lineHeight: 22 },
  composeActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  composeActionBtn: { backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border, borderRadius: 8, width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  composeActionIcon: { fontSize: 18, lineHeight: 22 },
  composeActionGif: { fontSize: 11, fontWeight: '800' as const, color: colors.textSub, letterSpacing: 0.5 },
  // GIF / Emoji Modals
  modalSafe: { flex: 1, backgroundColor: colors.surface },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  modalTitle: { color: colors.text, fontSize: 18, fontWeight: '800' },
  modalClose: { padding: 4 },
  modalCloseTxt: { color: colors.textMuted, fontSize: 20 },
  gifSearchRow: { flexDirection: 'row', gap: 8, padding: 12 },
  gifSearchInput: { flex: 1, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: colors.text, fontSize: 14 },
  gifSearchBtn: { backgroundColor: colors.accent, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10, alignItems: 'center', justifyContent: 'center' },
  gifSearchBtnTxt: { color: colors.bg, fontWeight: '800', fontSize: 14 },
  gifThumbWrap: { flex: 1, margin: 3, aspectRatio: 1, borderRadius: 8, overflow: 'hidden', backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border },
  gifThumb: { width: '100%', height: '100%' },
  gifEmpty: { color: colors.textMuted, textAlign: 'center', marginTop: 40, fontSize: 14 },
  giphyAttr: { color: colors.textMuted, fontSize: 10, textAlign: 'center', padding: 8 },
  emojiCatLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 8 },
  emojiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  emojiBtn: { padding: 6, borderRadius: 8 },
  emojiChar: { fontSize: 28 },
  postBtn: {
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    minWidth: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  postBtnDisabled: { opacity: 0.4 },
  postBtnText: { ...typography.button, color: colors.bg, fontSize: 12 },
  emptyFeed: { paddingVertical: 20, alignItems: 'center' },
  emptyFeedText: { ...typography.bodyMd, color: colors.textMuted },
  loadMoreBtn: { alignItems: 'center', paddingVertical: 14 },
  loadMoreText: { ...typography.label, color: colors.accent },
});
