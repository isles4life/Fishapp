import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, ScrollView,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation';
import * as api from '../../services/api';
import { storage } from '../../services/storage';
import type { Region } from '../../models';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { FishLeagueLogo } from '../../components/icons/Logo';

type Props = NativeStackScreenProps<RootStackParamList, 'Register'>;

export default function RegisterScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [regions, setRegions] = useState<Region[]>([]);
  const [selectedRegion, setSelectedRegion] = useState('');
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  useEffect(() => {
    api.getRegions().then(r => {
      setRegions(r);
      if (r.length) setSelectedRegion(r[0].id);
    }).catch(() => {});
  }, []);

  async function handleRegister() {
    if (!email || !password || !displayName || !selectedRegion) {
      return Alert.alert('Error', 'Fill in all fields and select a region');
    }
    setLoading(true);
    try {
      const { token } = await api.register(email, password, displayName, selectedRegion);
      await storage.setToken(token);
      navigation.replace('MainTabs');
    } catch (e: any) {
      Alert.alert('Registration failed', e.message);
    } finally {
      setLoading(false);
    }
  }

  const inputStyle = (field: string) => [
    styles.input,
    focusedField === field && styles.inputFocused,
  ];

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      {/* Logo */}
      <View style={styles.logoWrap}>
        <FishLeagueLogo size={80} />
        <Text style={styles.title}>CREATE ACCOUNT</Text>
        <Text style={styles.subtitle}>Join the competition</Text>
      </View>

      {/* Display Name */}
      <Text style={styles.fieldLabel}>DISPLAY NAME</Text>
      <TextInput
        style={inputStyle('name')}
        placeholder="Your angler name"
        placeholderTextColor={colors.textMuted}
        value={displayName}
        onChangeText={setDisplayName}
        onFocus={() => setFocusedField('name')}
        onBlur={() => setFocusedField(null)}
      />

      {/* Email */}
      <Text style={styles.fieldLabel}>EMAIL</Text>
      <TextInput
        style={inputStyle('email')}
        placeholder="your@email.com"
        placeholderTextColor={colors.textMuted}
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        onFocus={() => setFocusedField('email')}
        onBlur={() => setFocusedField(null)}
      />

      {/* Password */}
      <Text style={styles.fieldLabel}>PASSWORD</Text>
      <TextInput
        style={inputStyle('password')}
        placeholder="Choose a strong password"
        placeholderTextColor={colors.textMuted}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        onFocus={() => setFocusedField('password')}
        onBlur={() => setFocusedField(null)}
      />

      {/* Region */}
      {regions.length > 0 && (
        <>
          <Text style={styles.fieldLabel}>SELECT REGION</Text>
          <View style={styles.regionGrid}>
            {regions.map(r => (
              <TouchableOpacity
                key={r.id}
                style={[styles.regionBtn, selectedRegion === r.id && styles.regionBtnActive]}
                onPress={() => setSelectedRegion(r.id)}
                activeOpacity={0.8}
              >
                <Text style={[styles.regionBtnText, selectedRegion === r.id && styles.regionBtnTextActive]}>
                  {r.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      {/* Submit */}
      <TouchableOpacity style={styles.goldBtn} onPress={handleRegister} disabled={loading} activeOpacity={0.85}>
        {loading ? (
          <ActivityIndicator color={colors.bg} />
        ) : (
          <Text style={styles.goldBtnText}>JOIN THE LEAGUE</Text>
        )}
      </TouchableOpacity>

      {/* Back to login */}
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.link}>
        <Text style={styles.linkText}>
          Already have an account?{' '}
          <Text style={styles.linkAccent}>Sign In</Text>
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
    paddingTop: 60,
  },
  logoWrap: {
    alignItems: 'center',
    marginBottom: 36,
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
  fieldLabel: {
    ...typography.labelSm,
    color: colors.textMuted,
    marginBottom: 6,
    marginTop: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  inputFocused: {
    borderColor: colors.accent,
  },
  regionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  regionBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
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
  goldBtn: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 8,
  },
  goldBtnText: {
    ...typography.button,
    color: colors.bg,
  },
  link: {
    marginTop: 20,
    alignItems: 'center',
    paddingBottom: 20,
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
