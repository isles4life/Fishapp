import React, { useCallback, useContext, useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, SafeAreaView, Modal, Alert, Image,
  TextInput, KeyboardAvoidingView, Platform, FlatList, RefreshControl,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as api from '../../services/api';
import * as ImagePicker from 'expo-image-picker';
import type { Tournament, FeedItem, CatchComment, UserWarning, AnglerProfile } from '../../models';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { FishLeagueLogoFull } from '../../components/icons/Logo';
import { TournamentContext } from '../../navigation';
import type { RootStackParamList } from '../../navigation';
import { storage } from '../../services/storage';
import { drainQueue } from '../../services/submissionQueue';

function getInitials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function countdownTo(dateStr: string): string {
  const diff = new Date(dateStr).getTime() - Date.now();
  if (diff <= 0) return 'Ended';
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  if (days > 0) return `${days}d ${hours}h remaining`;
  const minutes = Math.floor((diff % 3600000) / 60000);
  return `${hours}h ${minutes}m remaining`;
}

function TournamentBanner({ tournament }: { tournament: Tournament }) {
  const entryFee = tournament.entryFeeCents > 0
    ? `$${(tournament.entryFeeCents / 100).toFixed(2)} entry`
    : 'Free';
  const prizePool = tournament.prizePoolCents > 0
    ? `$${(tournament.prizePoolCents / 100).toFixed(2)} prize pool`
    : null;
  return (
    <View style={styles.tournamentBanner}>
      <View style={styles.tournamentBannerTop}>
        <View style={styles.activeBadge}>
          <Text style={styles.activeBadgeText}>ACTIVE</Text>
        </View>
        <Text style={styles.tournamentCountdown}>{countdownTo(tournament.endsAt)}</Text>
      </View>
      <Text style={styles.tournamentName}>{tournament.name}</Text>
      <View style={styles.tournamentMeta}>
        <Text style={styles.tournamentMetaText}>Week {tournament.weekNumber} · {tournament.region?.name ?? 'All Regions'}</Text>
      </View>
      <View style={[styles.tournamentMeta, { marginTop: 6 }]}>
        <Text style={[styles.tournamentMetaText, { color: colors.textSub }]}>{entryFee}</Text>
        {prizePool && (
          <>
            <Text style={[styles.tournamentMetaText, { marginHorizontal: 6 }]}> · </Text>
            <Text style={[styles.tournamentMetaText, { color: colors.accent, fontWeight: '700' }]}>🏆 {prizePool}</Text>
          </>
        )}
      </View>
    </View>
  );
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

function PropButton({ submissionId, initialCount }: { submissionId: string; initialCount: number }) {
  const [propped, setPropped] = useState(false);
  const [count, setCount] = useState(initialCount);
  const [loading, setLoading] = useState(false);
  const [showWho, setShowWho] = useState(false);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    api.getProps(submissionId)
      .then(r => { setCount(r.count); setPropped(r.userHasPropped); })
      .catch(() => {});
  }, [submissionId]);

  async function handleToggle() {
    if (loading) return;
    setLoading(true);
    try {
      const r = await api.toggleProp(submissionId);
      setPropped(r.propped);
      setCount(r.count);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }

  return (
    <>
      <TouchableOpacity
        style={[styles.feedActionBtn, propped && styles.feedActionBtnActive]}
        onPress={handleToggle}
        onLongPress={() => count > 0 && setShowWho(true)}
        disabled={loading}
        activeOpacity={0.7}
      >
        <Text style={styles.feedActionIcon}>👍</Text>
        <Text style={[styles.feedActionText, propped && { color: colors.accent }]}>
          PROPS{count > 0 ? ` ${count}` : ''}
        </Text>
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
        multiline
      />
    </View>
  );
}

function CommentPropsWhoModal({ fetchWho, onClose }: { fetchWho: () => Promise<Propper[]>; onClose: () => void }) {
  const [proppers, setProppers] = useState<Propper[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { fetchWho().then(setProppers).catch(() => {}).finally(() => setLoading(false)); }, []);
  return (
    <Modal visible animationType="fade" transparent onRequestClose={onClose}>
      <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={{ backgroundColor: '#2E3D38', borderRadius: 16, padding: 20, width: 280, maxHeight: 360 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <Text style={{ fontWeight: '700', fontSize: 15, color: '#F0EDE4' }}>👍 Props</Text>
            <TouchableOpacity onPress={onClose}><Text style={{ color: '#6B7D73', fontSize: 20 }}>×</Text></TouchableOpacity>
          </View>
          {loading ? <Text style={{ color: '#6B7D73', fontSize: 13, textAlign: 'center' }}>Loading…</Text>
            : proppers.length === 0 ? <Text style={{ color: '#6B7D73', fontSize: 13, textAlign: 'center' }}>No props yet.</Text>
            : <FlatList data={proppers} keyExtractor={p => p.id} renderItem={({ item: p }) => (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: '#445C54' }}>
                  {p.profilePhotoUrl
                    ? <Image source={{ uri: p.profilePhotoUrl }} style={{ width: 30, height: 30, borderRadius: 15 }} />
                    : <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: '#445C54', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#CFC29C', fontWeight: '700', fontSize: 12 }}>{p.displayName[0]?.toUpperCase()}</Text></View>
                  }
                  <Text style={{ color: '#F0EDE4', fontSize: 13, fontWeight: '600' }}>{p.displayName}</Text>
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

function CommentsModal({ submissionId, myUserId, onClose }: { submissionId: string; myUserId: string | null; onClose: () => void }) {
  const navigation = useNavigation<any>();
  const [comments, setComments] = useState<CatchComment[]>([]);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [whoCommentId, setWhoCommentId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [gifUrl, setGifUrl] = useState<string | null>(null);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [gifQuery, setGifQuery] = useState('');
  const [gifResults, setGifResults] = useState<Array<{ id: string; preview: string; full: string }>>([]);
  const [gifSearching, setGifSearching] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  useEffect(() => {
    api.getComments(submissionId).then(setComments).catch(() => {});
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

  async function handleSend() {
    if (!body.trim() && !gifUrl && !photoUri || sending) return;
    setSending(true);
    try {
      let photoKey: string | undefined;
      if (photoUri) {
        const r = await api.uploadCommentMedia(submissionId, photoUri);
        photoKey = r.photoKey;
      }
      const c = await api.addComment(submissionId, body.trim(), gifUrl ?? undefined, photoKey);
      setComments(prev => [...prev, c]);
      setBody('');
      setGifUrl(null);
      setPhotoUri(null);
      setShowGifPicker(false);
    } catch { /* silent */ }
    finally { setSending(false); }
  }

  function startEdit(comment: CatchComment) {
    setEditingId(comment.id);
    setEditBody(comment.body);
  }

  async function handleSaveEdit() {
    if (!editingId || !editBody.trim() || savingEdit) return;
    setSavingEdit(true);
    try {
      const updated = await api.editComment(editingId, editBody.trim());
      setComments(prev => prev.map(c => c.id === editingId ? updated : c));
      setEditingId(null);
      setEditBody('');
    } catch { /* silent */ }
    finally { setSavingEdit(false); }
  }

  async function handleDelete(commentId: string) {
    try {
      await api.deleteComment(commentId);
      setComments(prev => prev.filter(c => c.id !== commentId));
    } catch { /* silent */ }
  }

  async function handleToggleProp(commentId: string) {
    if (!myUserId) return;
    try {
      const res = await api.toggleCommentProp(commentId);
      setComments(prev => prev.map(c => c.id === commentId ? { ...c, propCount: res.propCount, userHasPropped: res.userHasPropped } : c));
    } catch { /* silent */ }
  }

  function handleLongPress(comment: CatchComment) {
    if (comment.user.id !== myUserId) return;
    Alert.alert('Your Comment', undefined, [
      { text: 'Edit', onPress: () => startEdit(comment) },
      { text: 'Delete', style: 'destructive', onPress: () => handleDelete(comment.id) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={cm.container}>
          <View style={cm.header}>
            <Text style={cm.title}>COMMENTS</Text>
            <TouchableOpacity onPress={onClose}><Text style={cm.closeBtn}>✕</Text></TouchableOpacity>
          </View>
          <FlatList
            data={comments}
            keyExtractor={c => c.id}
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: 16, gap: 12 }}
            ListEmptyComponent={<Text style={cm.empty}>No comments yet. Be the first!</Text>}
            renderItem={({ item }) => (
              <TouchableOpacity
                onLongPress={() => handleLongPress(item)}
                delayLongPress={400}
                activeOpacity={0.85}
              >
                <View style={cm.comment}>
                  <View style={{ flex: 1 }}>
                    <Text style={[cm.commentName, item.user.profile?.username && { color: colors.accent }]} onPress={item.user.profile?.username ? () => { onClose(); navigation.navigate('PublicProfile', { username: item.user.profile!.username }); } : undefined}>
                      {item.user.profile?.username ? `@${item.user.profile.username}` : item.user.displayName}
                    </Text>
                    {editingId === item.id ? (
                      <View style={cm.editRow}>
                        <TextInput
                          style={cm.editInput}
                          value={editBody}
                          onChangeText={setEditBody}
                          maxLength={500}
                          multiline
                          autoFocus
                        />
                        <View style={cm.editActions}>
                          <TouchableOpacity
                            style={[cm.editSaveBtn, (!editBody.trim() || savingEdit) && { opacity: 0.4 }]}
                            onPress={handleSaveEdit}
                            disabled={!editBody.trim() || savingEdit}
                          >
                            <Text style={cm.editSaveBtnText}>{savingEdit ? '…' : 'SAVE'}</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={cm.editCancelBtn} onPress={() => setEditingId(null)}>
                            <Text style={cm.editCancelBtnText}>CANCEL</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ) : (
                      <>
                        <Text style={cm.commentBody}>{renderWithMentions(item.body, (u) => { onClose(); navigation.navigate('PublicProfile', { username: u }); })}</Text>
                        {(item.gifUrl || item.photoUrl) ? <Image source={{ uri: item.gifUrl ?? item.photoUrl ?? '' }} style={{ width: '100%', height: 120, borderRadius: 8, marginTop: 4 }} resizeMode="cover" /> : null}
                      </>
                    )}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                      <Text style={cm.commentTime}>{timeAgo(item.createdAt)}</Text>
                      <TouchableOpacity onPress={() => myUserId && handleToggleProp(item.id)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }} style={{ opacity: item.userHasPropped ? 1 : 0.35 }}>
                        <Text style={{ fontSize: 13 }}>👍</Text>
                      </TouchableOpacity>
                      {(item.propCount ?? 0) > 0 && (
                        <TouchableOpacity onPress={() => setWhoCommentId(item.id)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                          <Text style={{ fontSize: 11, color: item.userHasPropped ? colors.accent : colors.textSub, fontWeight: '700' }}>{item.propCount}</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                  {item.user.id === myUserId && editingId !== item.id && (
                    <Text style={cm.editHint}>···</Text>
                  )}
                </View>
              </TouchableOpacity>
            )}
          />
          <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
            <View style={cm.inputRow}>
              <MentionTextInput
                style={cm.input}
                placeholder="Add a comment..."
                value={body}
                onChangeText={setBody}
              />
              <TouchableOpacity
                style={[cm.sendBtn, ((!body.trim() && !gifUrl && !photoUri) || sending) && { opacity: 0.4 }]}
                onPress={handleSend}
                disabled={(!body.trim() && !gifUrl && !photoUri) || sending}
              >
                <Text style={cm.sendBtnText}>POST</Text>
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
          </View>
        </View>
      </KeyboardAvoidingView>
      {whoCommentId && (
        <CommentPropsWhoModal
          fetchWho={() => api.getCommentPropsWho(whoCommentId)}
          onClose={() => setWhoCommentId(null)}
        />
      )}
    </Modal>
  );
}

function FeedCard({ item, region, onComment }: { item: FeedItem; region: string; onComment: () => void }) {
  const lengthIn = (item.fishLengthCm / 2.54).toFixed(1);
  const initials = getInitials(item.displayName);
  const firstName = item.displayName.split(' ')[0].toUpperCase();
  const speciesLabel = item.speciesName ? item.speciesName.toUpperCase() : 'FISH';
  const [lightboxOpen, setLightboxOpen] = useState(false);

  return (
    <View style={styles.feedCard}>
      {/* Card header */}
      <View style={styles.feedCardHeader}>
        <View style={styles.feedAvatar}>
          {item.profilePhotoUrl ? (
            <Image source={{ uri: item.profilePhotoUrl }} style={styles.feedAvatarImg} />
          ) : (
            <Text style={styles.feedAvatarText}>{initials}</Text>
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.feedAnglerName}>{item.displayName}</Text>
          {item.username && <Text style={styles.feedUsername}>@{item.username}</Text>}
        </View>
        {item.released && (
          <View style={styles.releasedBadge}>
            <Text style={styles.releasedBadgeText}>🐟 RELEASED</Text>
          </View>
        )}
        <View style={[styles.verifiedBadge, { marginLeft: 6 }]}>
          <Text style={styles.verifiedBadgeText}>✓ VERIFIED</Text>
        </View>
      </View>

      {/* Fish photo */}
      <TouchableOpacity activeOpacity={item.photoUrl ? 0.9 : 1} onPress={() => item.photoUrl && setLightboxOpen(true)} disabled={!item.photoUrl}>
        <View style={styles.feedPhotoPlaceholder}>
          {item.photoUrl ? (
            <Image source={{ uri: item.photoUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          ) : null}
          <View style={[styles.feedFishInfo, item.photoUrl && styles.feedFishInfoOverlay]}>
            <Text style={[styles.feedFishLengthLabel, item.photoUrl && { color: 'rgba(255,255,255,0.8)' }]}>CATCH LENGTH</Text>
            <Text style={[styles.feedFishLength, item.photoUrl && { color: '#FFFFFF' }]}>{lengthIn}{'"'}</Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* Photo lightbox */}
      {item.photoUrl && (
        <Modal visible={lightboxOpen} transparent animationType="fade" onRequestClose={() => setLightboxOpen(false)}>
          <View style={styles.lightboxOverlay}>
            <TouchableOpacity style={styles.lightboxClose} onPress={() => setLightboxOpen(false)}>
              <Text style={styles.lightboxCloseText}>✕</Text>
            </TouchableOpacity>
            <Image source={{ uri: item.photoUrl }} style={styles.lightboxImage} resizeMode="contain" />
          </View>
        </Modal>
      )}

      {/* Caption */}
      <View style={styles.feedCaption}>
        <Text style={styles.feedCaptionText}>
          <Text style={{ color: colors.charcoal, fontWeight: '700' }}>{firstName} </Text>
          <Text>CAUGHT A </Text>
          <Text style={{ color: colors.accent, fontWeight: '800' }}>{lengthIn}"</Text>
          <Text> {speciesLabel}.</Text>
        </Text>
        <View style={styles.feedMeta}>
          <Text style={styles.feedMetaText}>📍 {region}</Text>
          <Text style={styles.feedMetaDot}>·</Text>
          <Text style={styles.feedMetaText}>🕐 {timeAgo(item.submittedAt)}</Text>
        </View>
      </View>

      {/* Action row */}
      <View style={styles.feedActions}>
        <PropButton submissionId={item.submissionId} initialCount={item.propsCount} />
        <View style={styles.feedActionDivider} />
        <TouchableOpacity style={styles.feedActionBtn} onPress={onComment} activeOpacity={0.7}>
          <Text style={styles.feedActionIcon}>💬</Text>
          <Text style={styles.feedActionText}>COMMENT</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const WARNING_LEVEL_COLORS: Record<string, string> = {
  MINOR: '#D4820A',
  MAJOR: '#C0392B',
  FINAL: '#8B0000',
};

function WarningsModal({
  warnings,
  onDismiss,
}: {
  warnings: UserWarning[];
  onDismiss: () => void;
}) {
  const [idx, setIdx] = useState(0);
  const [acknowledging, setAcknowledging] = useState(false);
  const warning = warnings[idx];
  if (!warning) return null;

  async function handleAcknowledge() {
    setAcknowledging(true);
    try {
      await api.acknowledgeWarning(warning.id);
      if (idx < warnings.length - 1) {
        setIdx(i => i + 1);
      } else {
        onDismiss();
      }
    } catch {
      onDismiss();
    } finally {
      setAcknowledging(false);
    }
  }

  const levelColor = WARNING_LEVEL_COLORS[warning.level] ?? colors.textSub;

  return (
    <Modal visible transparent animationType="fade">
      <View style={warningStyles.overlay}>
        <View style={warningStyles.card}>
          <Text style={warningStyles.header}>⚠ LEAGUE WARNING</Text>
          <View style={[warningStyles.levelBadge, { backgroundColor: levelColor + '20', borderColor: levelColor + '60' }]}>
            <Text style={[warningStyles.levelText, { color: levelColor }]}>{warning.level}</Text>
          </View>
          <Text style={warningStyles.reason}>{warning.reason}</Text>
          <Text style={warningStyles.sub}>
            {idx + 1} of {warnings.length} unacknowledged warning{warnings.length > 1 ? 's' : ''}
          </Text>
          <TouchableOpacity
            style={[warningStyles.btn, { opacity: acknowledging ? 0.6 : 1 }]}
            onPress={handleAcknowledge}
            disabled={acknowledging}
            activeOpacity={0.8}
          >
            <Text style={warningStyles.btnText}>{acknowledging ? 'ACKNOWLEDGING…' : 'I UNDERSTAND'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

export default function HomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { setTournamentId } = useContext(TournamentContext);
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pendingWarnings, setPendingWarnings] = useState<UserWarning[]>([]);
  const [profile, setProfile] = useState<AnglerProfile | null>(null);
  const [commentSubmissionId, setCommentSubmissionId] = useState<string | null>(null);

  useEffect(() => {
    api.getMyWarnings()
      .then(ws => { if (ws.length > 0) setPendingWarnings(ws); })
      .catch(() => {});
    api.getMyProfile()
      .then(p => { if (p) setProfile(p); })
      .catch(() => {});
    drainQueue()
      .then(({ succeeded }) => {
        if (succeeded > 0) {
          Alert.alert('Catch Submitted', `${succeeded} queued catch${succeeded > 1 ? 'es' : ''} submitted successfully.`);
        }
      })
      .catch(() => {});
  }, []);

  async function load(isRefresh = false) {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const t = await api.getActiveTournament();
      setTournament(t);
      setTournamentId(t.id);
      const items = await api.getFeed(t.id);
      setFeed(items);
    } catch {
      // no active tournament or network issue
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useFocusEffect(useCallback(() => { load(); }, []));

  const region = tournament?.region?.name ?? 'All Regions';

  function handleSignOut() {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out', style: 'destructive',
        onPress: async () => { await storage.deleteToken(); navigation.replace('Login'); },
      },
    ]);
  }

  function handleAvatarPress() {
    Alert.alert(profile?.user?.displayName ?? 'My Account', undefined, [
      { text: 'View Profile', onPress: () => navigation.navigate('Profile' as any) },
      { text: 'Sign Out', style: 'destructive', onPress: handleSignOut },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {pendingWarnings.length > 0 && (
        <WarningsModal warnings={pendingWarnings} onDismiss={() => setPendingWarnings([])} />
      )}
      {commentSubmissionId && (
        <CommentsModal
          submissionId={commentSubmissionId}
          myUserId={profile?.userId ?? null}
          onClose={() => setCommentSubmissionId(null)}
        />
      )}
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.accent} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <FishLeagueLogoFull width={240} />
          <TouchableOpacity onPress={handleAvatarPress} style={styles.avatarBtn} activeOpacity={0.8}>
            {profile?.profilePhotoUrl ? (
              <Image source={{ uri: profile.profilePhotoUrl }} style={styles.avatarImg} />
            ) : (
              <View style={styles.avatarInitials}>
                <Text style={styles.avatarInitialsText}>{getInitials(profile?.user?.displayName ?? '?')}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingWrap}>
            <Image source={require('../../../assets/icon.png')} style={{ width: 100, height: 100 }} resizeMode="contain" />
            <ActivityIndicator size="small" color={colors.accent} style={{ marginTop: 16 }} />
          </View>
        ) : (
          <>
            {tournament && <TournamentBanner tournament={tournament} />}
            {!tournament && (
              <View style={styles.noTournamentCard}>
                <Text style={styles.noTournamentTitle}>NO ACTIVE TOURNAMENT</Text>
                <Text style={styles.noTournamentSub}>Check back when a new week opens.</Text>
              </View>
            )}

            <TouchableOpacity style={styles.forecastCard} onPress={() => navigation.navigate('Forecast')} activeOpacity={0.85}>
              <View style={{ flex: 1 }}>
                <Text style={styles.forecastLabel}>⚡ FISHING INTELLIGENCE</Text>
                <Text style={styles.forecastSub}>Weather, bite windows & recommendations</Text>
              </View>
              <Text style={styles.forecastArrow}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.hotSpotsCard} onPress={() => navigation.navigate('HotSpots')} activeOpacity={0.85}>
              <View style={{ flex: 1 }}>
                <Text style={styles.hotSpotsLabel}>🗺️ CATCH HOT SPOTS</Text>
                <Text style={styles.hotSpotsSub}>See where fish are being caught</Text>
              </View>
              <Text style={styles.forecastArrow}>›</Text>
            </TouchableOpacity>

            {feed.length > 0 && (
              <>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionLabel}>RECENT CATCHES</Text>
                  <View style={styles.sectionLine} />
                </View>
                {feed.map(item => (
                  <FeedCard
                    key={item.submissionId}
                    item={item}
                    region={region}
                    onComment={() => setCommentSubmissionId(item.submissionId)}
                  />
                ))}
              </>
            )}

            {feed.length === 0 && tournament && (
              <View style={styles.emptyFeed}>
                <Text style={styles.emptyFeedText}>No catches yet — be the first!</Text>
                <Text style={styles.emptyFeedSub}>Submit a catch to appear on the leaderboard.</Text>
              </View>
            )}
          </>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  scroll: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.bg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  avatarBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    overflow: 'hidden',
  },
  avatarImg: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2,
    borderColor: colors.borderGold,
  },
  avatarInitials: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surfaceHigh,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitialsText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSub,
  },
  loadingWrap: {
    paddingTop: 60,
    alignItems: 'center',
  },
  forecastCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.accent + '50',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  forecastLabel: {
    ...typography.label,
    color: colors.accent,
    marginBottom: 3,
  },
  forecastSub: {
    ...typography.caption,
    color: colors.textMuted,
  },
  forecastArrow: {
    fontSize: 22,
    color: colors.accent,
    marginLeft: 8,
  },
  hotSpotsCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  hotSpotsLabel: {
    ...typography.label,
    color: colors.text,
    marginBottom: 3,
  },
  hotSpotsSub: {
    ...typography.caption,
    color: colors.textMuted,
  },
  tournamentBanner: {
    margin: 16,
    backgroundColor: colors.surfaceCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderGold,
    padding: 16,
  },
  tournamentBannerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  activeBadge: {
    backgroundColor: colors.accent,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  activeBadgeText: {
    ...typography.labelSm,
    color: colors.bg,
  },
  tournamentCountdown: {
    ...typography.caption,
    color: colors.textSub,
  },
  tournamentName: {
    ...typography.displaySm,
    color: colors.text,
    marginBottom: 6,
  },
  tournamentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tournamentMetaText: {
    ...typography.caption,
    color: colors.textMuted,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 20,
    marginBottom: 12,
    gap: 10,
  },
  sectionLabel: {
    ...typography.label,
    color: colors.textDarkMuted,
  },
  sectionLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.borderGold + '60',
  },
  feedCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: colors.white,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  feedCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 10,
  },
  feedAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceHigh,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  feedAvatarImg: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  feedAvatarText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
  },
  releasedBadge: {
    backgroundColor: '#0F3A1E',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: colors.verified + '50',
  },
  releasedBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.verified,
    letterSpacing: 0.5,
  },
  feedAnglerName: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'Inter_500Medium',
    color: colors.charcoal,
  },
  feedUsername: {
    fontSize: 11,
    color: colors.textDarkMuted,
    marginTop: 1,
  },
  verifiedBadge: {
    backgroundColor: colors.verifiedBg,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: colors.verified + '50',
  },
  verifiedBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.verified,
    letterSpacing: 0.5,
  },
  feedDots: {
    color: colors.textMuted,
    fontSize: 16,
    paddingLeft: 4,
  },
  feedPhotoPlaceholder: {
    height: 200,
    backgroundColor: colors.surfaceCard,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  feedFishInfo: {
    alignItems: 'center',
  },
  feedFishInfoOverlay: {
    backgroundColor: 'rgba(46,61,56,0.65)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  feedFishLengthLabel: {
    ...typography.labelSm,
    color: colors.textMuted,
    marginBottom: 4,
  },
  feedFishLength: {
    ...typography.numLg,
    color: colors.accent,
  },
  feedFishLengthIn: {
    ...typography.bodyMd,
    color: colors.textSub,
    marginTop: 4,
  },
  feedRankBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: colors.accent,
    borderRadius: 20,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedRankBadgeText: {
    fontSize: 12,
    fontWeight: '900',
    color: colors.bg,
  },
  feedCaption: {
    padding: 12,
    paddingBottom: 8,
  },
  feedCaptionText: {
    ...typography.bodyMd,
    color: colors.textDarkSub,
    letterSpacing: 0.3,
  },
  feedMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  feedMetaText: {
    ...typography.caption,
    color: colors.textDarkMuted,
  },
  feedMetaDot: {
    color: colors.textDarkMuted,
    fontSize: 12,
  },
  feedActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  feedActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 5,
  },
  feedActionIcon: {
    fontSize: 13,
  },
  feedActionText: {
    ...typography.labelSm,
    color: colors.textMuted,
  },
  feedActionBtnActive: {
    backgroundColor: colors.accent + '15',
  },
  feedActionDivider: {
    width: 1,
    backgroundColor: colors.border,
    marginVertical: 8,
  },
  noTournamentCard: {
    margin: 16,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 24,
    alignItems: 'center',
  },
  noTournamentTitle: {
    ...typography.displaySm,
    color: colors.textMuted,
    marginBottom: 8,
  },
  noTournamentSub: {
    ...typography.bodyMd,
    color: colors.textMuted,
    textAlign: 'center',
  },
  emptyFeed: {
    margin: 16,
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyFeedText: {
    ...typography.displaySm,
    color: colors.textMuted,
    marginBottom: 8,
  },
  emptyFeedSub: {
    ...typography.bodyMd,
    color: colors.textMuted,
    textAlign: 'center',
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
  lightboxOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.93)', alignItems: 'center', justifyContent: 'center' },
  lightboxImage: { width: '100%', height: '85%' },
  lightboxClose: { position: 'absolute', top: 52, right: 18, zIndex: 10, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  lightboxCloseText: { color: '#fff', fontSize: 18, fontWeight: '700' },
});

const cm = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 20, paddingHorizontal: 20, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  title: { ...typography.displaySm, color: colors.text },
  closeBtn: { fontSize: 18, color: colors.textSub, paddingLeft: 16 },
  empty: { ...typography.bodyMd, color: colors.textMuted, textAlign: 'center', paddingTop: 40 },
  comment: {
    flexDirection: 'row', backgroundColor: colors.surface,
    borderRadius: 10, padding: 12, borderWidth: 1, borderColor: colors.border,
  },
  commentName: { ...typography.label, color: colors.accent, marginBottom: 4 },
  commentBody: { ...typography.bodyMd, color: colors.text, lineHeight: 20 },
  commentTime: { ...typography.caption, color: colors.textMuted, marginTop: 4 },
  editHint: { color: colors.textMuted, fontSize: 18, paddingLeft: 12, alignSelf: 'center', letterSpacing: 1 },
  editRow: { marginTop: 6 },
  editInput: {
    ...typography.bodyMd, color: colors.text,
    backgroundColor: colors.bg, borderRadius: 8, borderWidth: 1,
    borderColor: colors.accent + '80', paddingHorizontal: 10, paddingVertical: 8,
    maxHeight: 80,
  },
  editActions: { flexDirection: 'row', gap: 8, marginTop: 8 },
  editSaveBtn: {
    backgroundColor: colors.accent, borderRadius: 6,
    paddingHorizontal: 14, paddingVertical: 6,
  },
  editSaveBtnText: { ...typography.button, color: colors.bg, fontSize: 12 },
  editCancelBtn: {
    borderRadius: 6, paddingHorizontal: 14, paddingVertical: 6,
    borderWidth: 1, borderColor: colors.border,
  },
  editCancelBtnText: { ...typography.button, color: colors.textMuted, fontSize: 12 },
  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 10,
    padding: 16, borderTopWidth: 1, borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  input: {
    flex: 1, ...typography.bodyMd, color: colors.text,
    backgroundColor: colors.bg, borderRadius: 10, borderWidth: 1,
    borderColor: colors.border, paddingHorizontal: 12, paddingVertical: 10,
    maxHeight: 100,
  },
  sendBtn: {
    backgroundColor: colors.accent, borderRadius: 10,
    paddingHorizontal: 16, paddingVertical: 10,
  },
  sendBtnText: { ...typography.button, color: colors.bg, fontSize: 13 },
});

const warningStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  header: {
    fontSize: 18,
    fontWeight: '900',
    fontFamily: 'Oswald_700Bold',
    color: colors.text,
    marginBottom: 16,
    letterSpacing: 1,
  },
  levelBadge: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginBottom: 16,
  },
  levelText: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  reason: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: colors.text,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 12,
  },
  sub: {
    fontSize: 12,
    color: colors.textSub,
    marginBottom: 20,
  },
  btn: {
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 32,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  btnText: {
    fontSize: 14,
    fontWeight: '800',
    fontFamily: 'Inter_600SemiBold',
    color: colors.bg,
    letterSpacing: 0.8,
  },
});
