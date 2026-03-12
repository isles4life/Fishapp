import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, ScrollView, Image,
} from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation';
import * as api from '../../services/api';
import { storage } from '../../services/storage';
import type { Region } from '../../models';
import { colors } from '../../theme/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export default function LoginScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [regions, setRegions] = useState<Region[]>([]);
  const [selectedRegion, setSelectedRegion] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.getRegions().then(r => {
      setRegions(r);
      if (r.length) setSelectedRegion(r[0].id);
    }).catch(() => {});
  }, []);

  async function handleLogin() {
    if (!email || !password) return Alert.alert('Error', 'Enter email and password');
    setLoading(true);
    try {
      const { token } = await api.login(email, password);
      await storage.setToken(token);
      navigation.replace('TournamentHome');
    } catch (e: any) {
      Alert.alert('Login failed', e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleAppleLogin() {
    if (!selectedRegion) return Alert.alert('Error', 'Select a region first');
    try {
      const cred = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      const displayName = [cred.fullName?.givenName, cred.fullName?.familyName]
        .filter(Boolean).join(' ') || null;
      setLoading(true);
      const { token } = await api.appleLogin(cred.identityToken!, displayName, selectedRegion);
      await storage.setToken(token);
      navigation.replace('TournamentHome');
    } catch (e: any) {
      if (e.code !== 'ERR_REQUEST_CANCELED') Alert.alert('Apple Sign In failed', e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Image source={require('../../../assets/icon.png')} style={styles.logo} resizeMode="contain" />
      <Text style={styles.title}>FishLeague</Text>
      <Text style={styles.subtitle}>Sign in to compete</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor={colors.textMuted}
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor={colors.textMuted}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
        {loading
          ? <ActivityIndicator color={colors.bg} />
          : <Text style={styles.buttonText}>Sign In</Text>}
      </TouchableOpacity>

      <View style={styles.divider}>
        <View style={styles.line} />
        <Text style={styles.dividerText}>or</Text>
        <View style={styles.line} />
      </View>

      {regions.length > 0 && (
        <>
          <Text style={styles.label}>Select your region for Apple Sign In</Text>
          {regions.map(r => (
            <TouchableOpacity
              key={r.id}
              style={[styles.regionButton, selectedRegion === r.id && styles.regionSelected]}
              onPress={() => setSelectedRegion(r.id)}
            >
              <Text style={selectedRegion === r.id ? styles.regionTextSelected : styles.regionText}>
                {r.name}
              </Text>
            </TouchableOpacity>
          ))}
        </>
      )}

      <AppleAuthentication.AppleAuthenticationButton
        buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
        buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE_OUTLINE}
        cornerRadius={8}
        style={styles.appleButton}
        onPress={handleAppleLogin}
      />

      <TouchableOpacity onPress={() => navigation.navigate('Register')} style={styles.link}>
        <Text style={styles.linkText}>
          Don't have an account? <Text style={styles.linkAccent}>Register</Text>
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 28, backgroundColor: colors.bg, justifyContent: 'center' },
  logo: { width: 110, height: 110, alignSelf: 'center', marginBottom: 10 },
  title: { fontSize: 32, fontWeight: '800', color: colors.textPrimary, textAlign: 'center', marginBottom: 4 },
  subtitle: { fontSize: 15, color: colors.textSecondary, textAlign: 'center', marginBottom: 32 },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: 10,
    padding: 14, marginBottom: 12, fontSize: 16,
    color: colors.textPrimary, backgroundColor: colors.surface,
  },
  button: {
    backgroundColor: colors.green, borderRadius: 10,
    padding: 16, alignItems: 'center', marginBottom: 16,
  },
  buttonText: { color: colors.bg, fontSize: 16, fontWeight: '700' },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 16 },
  line: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { marginHorizontal: 12, color: colors.textMuted, fontSize: 13 },
  label: { fontSize: 13, color: colors.textSecondary, marginBottom: 8 },
  regionButton: {
    borderWidth: 1, borderColor: colors.border, borderRadius: 10,
    padding: 12, marginBottom: 8, backgroundColor: colors.surface,
  },
  regionSelected: { borderColor: colors.green, backgroundColor: colors.greenMuted },
  regionText: { color: colors.textSecondary },
  regionTextSelected: { color: colors.green, fontWeight: '600' },
  appleButton: { width: '100%', height: 50, marginTop: 8 },
  link: { marginTop: 24, alignItems: 'center' },
  linkText: { color: colors.textMuted, fontSize: 15 },
  linkAccent: { color: colors.green, fontWeight: '600' },
});
