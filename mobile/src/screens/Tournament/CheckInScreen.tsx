import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Alert, ActivityIndicator,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation';
import * as api from '../../services/api';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';

type Props = NativeStackScreenProps<RootStackParamList, 'CheckIn'>;

function extractCode(raw: string): string {
  // Handle deep link: fishleague://check-in?code=UUID
  try {
    const match = raw.match(/[?&]code=([^&]+)/);
    if (match) return decodeURIComponent(match[1]);
  } catch {}
  return raw;
}

export default function CheckInScreen() {
  const navigation = useNavigation();
  const route = useRoute<Props['route']>();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!permission?.granted) requestPermission();
  }, []);

  // Auto-submit if arrived via deep link with a code param
  useEffect(() => {
    const code = route.params?.code;
    if (code) handleScan({ data: code });
  }, []);

  async function handleScan({ data }: { data: string }) {
    if (scanned || loading) return;
    setScanned(true);
    setLoading(true);
    try {
      const result = await api.checkInTournament(extractCode(data));
      const t = result.tournament;
      const endsAt = new Date(t.endsAt);
      const daysLeft = Math.max(0, Math.ceil((endsAt.getTime() - Date.now()) / 86400000));
      Alert.alert(
        '✅ Checked In!',
        `${t.name}\n${t.region} · Week ${t.weekNumber}\n${daysLeft}d remaining`,
        [{ text: 'Got it', onPress: () => navigation.goBack() }],
      );
    } catch (e: any) {
      Alert.alert('Check-In Failed', e.message ?? 'Invalid or expired QR code.', [
        { text: 'Try Again', onPress: () => setScanned(false) },
        { text: 'Cancel', style: 'cancel', onPress: () => navigation.goBack() },
      ]);
    } finally {
      setLoading(false);
    }
  }

  if (!permission) {
    return (
      <SafeAreaView style={s.center}>
        <ActivityIndicator color={colors.accent} />
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={s.center}>
        <Text style={s.permText}>Camera access is required to scan the check-in QR code.</Text>
        <TouchableOpacity style={s.permBtn} onPress={requestPermission}>
          <Text style={s.permBtnText}>GRANT ACCESS</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.cancelLink} onPress={() => navigation.goBack()}>
          <Text style={s.cancelLinkText}>Cancel</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <View style={s.container}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        onBarcodeScanned={scanned ? undefined : handleScan}
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
      />

      {/* Overlay */}
      <SafeAreaView style={s.overlay}>
        <View style={s.topBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
            <Text style={s.backBtnText}>✕</Text>
          </TouchableOpacity>
          <Text style={s.title}>TOURNAMENT CHECK-IN</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={s.frame}>
          <View style={s.frameInner}>
            <View style={[s.corner, s.cornerTL]} />
            <View style={[s.corner, s.cornerTR]} />
            <View style={[s.corner, s.cornerBL]} />
            <View style={[s.corner, s.cornerBR]} />
          </View>
        </View>

        <View style={s.bottomBar}>
          {loading ? (
            <ActivityIndicator color={colors.accent} size="large" />
          ) : (
            <Text style={s.hint}>
              {scanned ? 'Processing…' : 'Point your camera at the tournament QR code'}
            </Text>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

const FRAME = 240;
const CORNER = 28;
const BORDER = 3;

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: 32 },
  overlay: { flex: 1 },
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16,
    backgroundColor: 'rgba(46,61,56,0.85)',
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backBtnText: { fontSize: 20, color: colors.text },
  title: { ...typography.label, color: colors.text, letterSpacing: 1.5 },
  frame: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  frameInner: { width: FRAME, height: FRAME, position: 'relative' },
  corner: {
    position: 'absolute', width: CORNER, height: CORNER,
    borderColor: colors.accent,
  },
  cornerTL: { top: 0, left: 0, borderTopWidth: BORDER, borderLeftWidth: BORDER },
  cornerTR: { top: 0, right: 0, borderTopWidth: BORDER, borderRightWidth: BORDER },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: BORDER, borderLeftWidth: BORDER },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: BORDER, borderRightWidth: BORDER },
  bottomBar: {
    paddingVertical: 32, paddingHorizontal: 32, alignItems: 'center',
    backgroundColor: 'rgba(46,61,56,0.85)',
  },
  hint: { ...typography.bodyMd, color: colors.textSub, textAlign: 'center' },
  permText: { ...typography.bodyMd, color: colors.text, textAlign: 'center', marginBottom: 24 },
  permBtn: {
    backgroundColor: colors.accent, borderRadius: 12,
    paddingVertical: 14, paddingHorizontal: 32,
  },
  permBtnText: { ...typography.button, color: colors.bg },
  cancelLink: { marginTop: 16 },
  cancelLinkText: { ...typography.bodyMd, color: colors.textMuted },
});
