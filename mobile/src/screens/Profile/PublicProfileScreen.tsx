import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation';
import { colors } from '../../theme/colors';
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
      <View style={s.center}>
        <ActivityIndicator color={colors.green} size="large" />
      </View>
    );
  }

  if (error || !profile) {
    return (
      <View style={s.center}>
        <Text style={s.errorIcon}>🎣</Text>
        <Text style={s.errorText}>{error || 'Profile not found'}</Text>
      </View>
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
  center: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: 32 },
  errorIcon: { fontSize: 48, marginBottom: 12 },
  errorText: { color: colors.textSecondary, fontSize: 16, textAlign: 'center' },
});
