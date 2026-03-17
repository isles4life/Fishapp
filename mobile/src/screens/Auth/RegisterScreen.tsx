import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, ScrollView, Switch, Modal, FlatList,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation';
import * as api from '../../services/api';
import { storage } from '../../services/storage';
import { registerPushToken } from '../../services/notifications';
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
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [regionPickerOpen, setRegionPickerOpen] = useState(false);

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
    if (!agreedToTerms) {
      return Alert.alert('Terms Required', 'You must agree to the Terms of Service and Privacy Policy to create an account.');
    }
    setLoading(true);
    try {
      const { token } = await api.register(email, password, displayName, selectedRegion, new Date().toISOString());
      await storage.setToken(token);
      navigation.replace('MainTabs');
      registerPushToken().catch(() => {});
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
        <FishLeagueLogo size={160} />
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
          <TouchableOpacity style={styles.regionDropdown} onPress={() => setRegionPickerOpen(true)} activeOpacity={0.8}>
            <Text style={styles.regionDropdownText}>
              {regions.find(r => r.id === selectedRegion)?.name ?? 'Select a region'}
            </Text>
            <Text style={styles.regionDropdownChevron}>▾</Text>
          </TouchableOpacity>
          <Modal visible={regionPickerOpen} transparent animationType="fade" onRequestClose={() => setRegionPickerOpen(false)}>
            <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setRegionPickerOpen(false)}>
              <View style={styles.modalSheet}>
                <Text style={styles.modalTitle}>SELECT REGION</Text>
                <FlatList
                  data={regions}
                  keyExtractor={r => r.id}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[styles.modalOption, selectedRegion === item.id && styles.modalOptionActive]}
                      onPress={() => { setSelectedRegion(item.id); setRegionPickerOpen(false); }}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.modalOptionText, selectedRegion === item.id && styles.modalOptionTextActive]}>
                        {item.name}
                      </Text>
                      {selectedRegion === item.id && <Text style={styles.modalOptionCheck}>✓</Text>}
                    </TouchableOpacity>
                  )}
                />
              </View>
            </TouchableOpacity>
          </Modal>
        </>
      )}

      {/* Terms of Service */}
      <View style={styles.termsRow}>
        <Switch
          value={agreedToTerms}
          onValueChange={setAgreedToTerms}
          trackColor={{ false: colors.border, true: colors.accent }}
          thumbColor={agreedToTerms ? colors.bg : colors.textMuted}
        />
        <Text style={styles.termsText}>
          I agree to the{' '}
          <Text style={styles.termsLink} onPress={() => navigation.navigate('Legal')}>
            Terms of Service and Privacy Policy
          </Text>
        </Text>
      </View>

      {/* Submit */}
      <TouchableOpacity style={[styles.goldBtn, !agreedToTerms && styles.goldBtnDisabled]} onPress={handleRegister} disabled={loading || !agreedToTerms} activeOpacity={0.85}>
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
  regionDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    backgroundColor: colors.surface,
  },
  regionDropdownText: {
    fontSize: 16,
    color: colors.text,
  },
  regionDropdownChevron: {
    fontSize: 16,
    color: colors.textMuted,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 24,
  },
  modalSheet: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    maxHeight: 360,
  },
  modalTitle: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    padding: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalOptionActive: {
    backgroundColor: colors.greenMuted,
  },
  modalOptionText: {
    fontSize: 16,
    color: colors.textSub,
  },
  modalOptionTextActive: {
    color: colors.accent,
    fontWeight: '700',
  },
  modalOptionCheck: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: '700',
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
    paddingHorizontal: 2,
  },
  termsText: {
    flex: 1,
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  termsLink: {
    color: colors.accent,
    fontWeight: '600',
  },
  goldBtn: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 8,
  },
  goldBtnDisabled: {
    opacity: 0.4,
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
