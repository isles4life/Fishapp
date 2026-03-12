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
      <Text style={styles.title}>Create Account</Text>

      <TextInput style={styles.input} placeholder="Display Name" value={displayName} onChangeText={setDisplayName} />
      <TextInput
        style={styles.input}
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
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
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Create Account</Text>}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.link}>
        <Text style={styles.linkText}>Already have an account? Sign In</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 24, backgroundColor: '#fff', justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: '800', color: '#1a5276', textAlign: 'center', marginBottom: 32 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 14, marginBottom: 12, fontSize: 16 },
  label: { fontSize: 14, color: '#333', marginBottom: 8 },
  regionButton: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, marginBottom: 8 },
  regionSelected: { borderColor: '#1a5276', backgroundColor: '#eaf4fb' },
  regionText: { color: '#333' },
  regionTextSelected: { color: '#1a5276', fontWeight: '600' },
  button: { backgroundColor: '#1a5276', borderRadius: 8, padding: 16, alignItems: 'center', marginTop: 8 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  link: { marginTop: 24, alignItems: 'center' },
  linkText: { color: '#1a5276', fontSize: 15 },
});
