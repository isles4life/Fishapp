import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, ScrollView,
} from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation';
import * as api from '../../services/api';
import { storage } from '../../services/storage';
import { registerPushToken } from '../../services/notifications';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { FishLeagueLogo } from '../../components/icons/Logo';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export default function LoginScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  async function handleLogin() {
    if (!email || !password) return Alert.alert('Error', 'Enter email and password');
    setLoading(true);
    try {
      const { token } = await api.login(email, password);
      await storage.setToken(token);
      navigation.replace('MainTabs');
      registerPushToken().catch(() => {});
    } catch (e: any) {
      Alert.alert('Login failed', e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleAppleLogin() {
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
      const { token } = await api.appleLogin(cred.identityToken!, displayName);
      await storage.setToken(token);
      navigation.replace('MainTabs');
      registerPushToken().catch(() => {});
    } catch (e: any) {
      if (e.code !== 'ERR_REQUEST_CANCELED') Alert.alert('Apple Sign In failed', e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      {/* Logo */}
      <View style={styles.logoWrap}>
        <FishLeagueLogo size={190} />
        <Text style={styles.title}>FISHLEAGUE</Text>
        <Text style={styles.subtitle}>Sign in to compete</Text>
      </View>

      {/* Email input */}
      <TextInput
        style={[styles.input, emailFocused && styles.inputFocused]}
        placeholder="Email"
        placeholderTextColor={colors.textMuted}
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        onFocus={() => setEmailFocused(true)}
        onBlur={() => setEmailFocused(false)}
      />

      {/* Password input */}
      <TextInput
        style={[styles.input, passwordFocused && styles.inputFocused]}
        placeholder="Password"
        placeholderTextColor={colors.textMuted}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        onFocus={() => setPasswordFocused(true)}
        onBlur={() => setPasswordFocused(false)}
      />

      {/* Sign In button */}
      <TouchableOpacity style={styles.goldBtn} onPress={handleLogin} disabled={loading} activeOpacity={0.85}>
        {loading ? (
          <ActivityIndicator color={colors.bg} />
        ) : (
          <Text style={styles.goldBtnText}>SIGN IN</Text>
        )}
      </TouchableOpacity>

      {/* Divider */}
      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>or</Text>
        <View style={styles.dividerLine} />
      </View>

      {/* Apple Sign In */}
      <AppleAuthentication.AppleAuthenticationButton
        buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
        buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE_OUTLINE}
        cornerRadius={12}
        style={styles.appleBtn}
        onPress={handleAppleLogin}
      />

      {/* Register link */}
      <TouchableOpacity onPress={() => navigation.navigate('Register')} style={styles.link}>
        <Text style={styles.linkText}>
          Don't have an account?{' '}
          <Text style={styles.linkAccent}>Create Account</Text>
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  container: {
    flexGrow: 1,
    padding: 28,
    justifyContent: 'center',
    paddingTop: 60,
  },
  logoWrap: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    ...typography.displayMd,
    color: colors.text,
    marginTop: 12,
  },
  subtitle: {
    ...typography.bodyMd,
    color: colors.textSub,
    marginTop: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  inputFocused: {
    borderColor: colors.accent,
  },
  goldBtn: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 8,
  },
  goldBtnText: {
    ...typography.button,
    color: colors.bg,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    ...typography.caption,
    color: colors.textMuted,
  },
  regionLabel: {
    ...typography.labelSm,
    color: colors.textMuted,
    marginBottom: 10,
  },
  regionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  regionBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: colors.surface,
  },
  regionBtnActive: {
    borderColor: colors.accent,
    backgroundColor: colors.greenMuted,
  },
  regionBtnText: {
    ...typography.caption,
    color: colors.textSub,
  },
  regionBtnTextActive: {
    color: colors.accent,
    fontWeight: '700',
  },
  appleBtn: {
    width: '100%',
    height: 52,
    marginBottom: 12,
  },
  link: {
    marginTop: 20,
    alignItems: 'center',
  },
  linkText: {
    ...typography.bodyMd,
    color: colors.textMuted,
  },
  linkAccent: {
    color: colors.accent,
    fontWeight: '700',
  },
});
