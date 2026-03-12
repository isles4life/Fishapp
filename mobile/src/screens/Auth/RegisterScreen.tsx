import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, ScrollView, Image,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation';
import * as api from '../../services/api';
import { storage } from '../../services/storage';
import type { Region } from '../../models';
import { colors } from '../../theme/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'Register'>;

export default function RegisterScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [regions, setRegions] = useState<Region[]>([]);
  const [selectedRegion, setSelectedRegion] = useState('');
  const [loading, setLoading] = useState(false);

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
      navigation.replace('TournamentHome');
    } catch (e: any) {
      Alert.alert('Registration failed', e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Image source={require('../../../assets/icon.png')} style={styles.logo} resizeMode="contain" />
      <Text style={styles.title}>Create Account</Text>
      <Text style={styles.subtitle}>Join the competition</Text>

      <TextInput
        style={styles.input}
        placeholder="Display Name"
        placeholderTextColor={colors.textMuted}
        value={displayName}
        onChangeText={setDisplayName}
      />
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

      {regions.length > 0 && (
        <>
          <Text style={styles.label}>Select your region</Text>
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

      <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={loading}>
        {loading
          ? <ActivityIndicator color={colors.bg} />
          : <Text style={styles.buttonText}>Create Account</Text>}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.link}>
        <Text style={styles.linkText}>
          Already have an account? <Text style={styles.linkAccent}>Sign In</Text>
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 28, backgroundColor: colors.bg, justifyContent: 'center' },
  logo: { width: 100, height: 100, alignSelf: 'center', marginBottom: 10 },
  title: { fontSize: 28, fontWeight: '800', color: colors.textPrimary, textAlign: 'center', marginBottom: 4 },
  subtitle: { fontSize: 15, color: colors.textSecondary, textAlign: 'center', marginBottom: 28 },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: 10,
    padding: 14, marginBottom: 12, fontSize: 16,
    color: colors.textPrimary, backgroundColor: colors.surface,
  },
  label: { fontSize: 13, color: colors.textSecondary, marginBottom: 8 },
  regionButton: {
    borderWidth: 1, borderColor: colors.border, borderRadius: 10,
    padding: 12, marginBottom: 8, backgroundColor: colors.surface,
  },
  regionSelected: { borderColor: colors.green, backgroundColor: colors.greenMuted },
  regionText: { color: colors.textSecondary },
  regionTextSelected: { color: colors.green, fontWeight: '600' },
  button: {
    backgroundColor: colors.green, borderRadius: 10,
    padding: 16, alignItems: 'center', marginTop: 8,
  },
  buttonText: { color: colors.bg, fontSize: 16, fontWeight: '700' },
  link: { marginTop: 24, alignItems: 'center' },
  linkText: { color: colors.textMuted, fontSize: 15 },
  linkAccent: { color: colors.green, fontWeight: '600' },
});
