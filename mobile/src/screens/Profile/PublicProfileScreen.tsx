import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, Text, StyleSheet, SafeAreaView } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { getProfile, followAngler, unfollowAngler } from '../../services/api';
import type { AnglerProfile } from '../../models';
import { ProfileView } from './ProfileScreen';

type Props = NativeStackScreenProps<RootStackParamList, 'PublicProfile'>;

export default function PublicProfileScreen({ route, navigation }: Props) {
  const { username } = route.params;
  const [profile, setProfile] = useState<AnglerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [followLoading, setFollowLoading] = useState(false);

  useEffect(() => {
    navigation.setOptions({ title: `@${username}` });
    getProfile(username)
      .then(setProfile)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [username]);

  async function handleFollowToggle() {
    if (!profile) return;
    setFollowLoading(true);
    try {
      if (profile.isFollowing) {
        await unfollowAngler(username);
        setProfile(p => p ? { ...p, isFollowing: false, followersCount: p.followersCount - 1 } : p);
      } else {
        await followAngler(username);
        setProfile(p => p ? { ...p, isFollowing: true, followersCount: p.followersCount + 1 } : p);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setFollowLoading(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={s.safeArea}>
        <View style={s.center}>
          <ActivityIndicator color={colors.accent} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !profile) {
    return (
      <SafeAreaView style={s.safeArea}>
        <View style={s.center}>
          <Text style={s.errorIcon}>🎣</Text>
          <Text style={s.errorText}>{error || 'Profile not found'}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <ProfileView
      profile={profile}
      isOwn={false}
      onFollowToggle={handleFollowToggle}
      followLoading={followLoading}
    />
  );
}

const s = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: 32 },
  errorIcon: { fontSize: 48, marginBottom: 12 },
  errorText: { ...typography.bodyMd, color: colors.textSub, textAlign: 'center' },
});
