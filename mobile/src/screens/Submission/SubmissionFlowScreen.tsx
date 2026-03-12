import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, Image, TextInput,
} from 'react-native';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import * as Location from 'expo-location';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation';
import { validateQR } from '../../utils/qrValidator';
import { uploadSubmission } from '../../services/api';

type Props = NativeStackScreenProps<RootStackParamList, 'Submission'>;

type Step = 'photo1' | 'photo2' | 'details' | 'uploading' | 'success' | 'error';

export default function SubmissionFlowScreen({ navigation, route }: Props) {
  const { tournamentId } = route.params;
  const [permission, requestPermission] = useCameraPermissions();
  const [step, setStep] = useState<Step>('photo1');
  const [photo1Uri, setPhoto1Uri] = useState<string | null>(null);
  const [photo2Uri, setPhoto2Uri] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [fishLength, setFishLength] = useState('');
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const cameraRef = useRef<CameraView>(null);
  const qrScanned = useRef(false);

  useEffect(() => {
    Location.requestForegroundPermissionsAsync().then(({ status }) => {
      if (status === 'granted') {
        Location.getCurrentPositionAsync({}).then(pos => {
          setLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        });
      }
    });
  }, []);

  async function takePicture() {
    const photo = await cameraRef.current?.takePictureAsync({ quality: 0.85 });
    if (!photo) return;

    if (step === 'photo1') {
      setPhoto1Uri(photo.uri);
      setStep('photo2');
      qrScanned.current = false;
    } else if (step === 'photo2') {
      setPhoto2Uri(photo.uri);
      setStep('details');
    }
  }

  function handleBarcode(result: BarcodeScanningResult) {
    if (qrScanned.current || step !== 'photo1') return;
    const validation = validateQR(result.data);
    if (validation.valid) {
      qrScanned.current = true;
      setQrCode(validation.code);
    }
  }

  async function handleSubmit() {
    if (!photo1Uri || !photo2Uri || !qrCode || !location) {
      return Alert.alert('Missing data', 'Ensure QR was scanned, both photos taken, and GPS is available.');
    }
    if (!fishLength || isNaN(Number(fishLength))) {
      return Alert.alert('Missing data', 'Enter a valid fish length in cm.');
    }

    setStep('uploading');
    try {
      await uploadSubmission({
        tournamentId,
        matSerialCode: qrCode,
        fishLengthCm: fishLength,
        gpsLat: String(location.latitude),
        gpsLng: String(location.longitude),
        capturedAt: new Date().toISOString(),
        photo1Uri,
        photo2Uri,
      });
      setStep('success');
    } catch (e: any) {
      setErrorMessage(e.message);
      setStep('error');
    }
  }

  // ── Permission check ──────────────────────────────────────────────────────

  if (!permission) return <View style={styles.center}><ActivityIndicator /></View>;
  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.permText}>Camera access is required to submit a catch.</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Success ───────────────────────────────────────────────────────────────

  if (step === 'success') {
    return (
      <View style={styles.center}>
        <Text style={styles.bigEmoji}>🎣</Text>
        <Text style={styles.successTitle}>Catch Submitted!</Text>
        <Text style={styles.successText}>Your submission is pending review.</Text>
        <TouchableOpacity style={styles.button} onPress={() => navigation.goBack()}>
          <Text style={styles.buttonText}>Back to Home</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────

  if (step === 'error') {
    return (
      <View style={styles.center}>
        <Text style={styles.bigEmoji}>❌</Text>
        <Text style={styles.successTitle}>Submission Failed</Text>
        <Text style={styles.successText}>{errorMessage}</Text>
        <TouchableOpacity style={styles.button} onPress={() => setStep('photo1')}>
          <Text style={styles.buttonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Uploading ─────────────────────────────────────────────────────────────

  if (step === 'uploading') {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1a5276" />
        <Text style={styles.uploadingText}>Uploading your catch...</Text>
      </View>
    );
  }

  // ── Details form ──────────────────────────────────────────────────────────

  if (step === 'details') {
    return (
      <View style={styles.detailsContainer}>
        <Text style={styles.stepTitle}>Review & Submit</Text>

        <View style={styles.photoRow}>
          {photo1Uri && <Image source={{ uri: photo1Uri }} style={styles.thumbnail} />}
          {photo2Uri && <Image source={{ uri: photo2Uri }} style={styles.thumbnail} />}
        </View>

        <Text style={styles.label}>Mat QR Code</Text>
        <Text style={[styles.qrValue, !qrCode && styles.missing]}>
          {qrCode ?? 'Not detected — retake photo 1'}
        </Text>

        <Text style={styles.label}>Fish Length (cm)</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. 42.5"
          keyboardType="decimal-pad"
          value={fishLength}
          onChangeText={setFishLength}
        />

        <Text style={styles.label}>GPS</Text>
        <Text style={styles.gpsValue}>
          {location ? `${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}` : 'Acquiring...'}
        </Text>

        <TouchableOpacity style={styles.button} onPress={handleSubmit}>
          <Text style={styles.buttonText}>Submit Catch</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setStep('photo1')} style={styles.retakeLink}>
          <Text style={styles.retakeLinkText}>Retake photos</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Camera ────────────────────────────────────────────────────────────────

  return (
    <View style={styles.flex}>
      <CameraView
        ref={cameraRef}
        style={styles.flex}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={step === 'photo1' ? handleBarcode : undefined}
      >
        <View style={styles.cameraOverlay}>
          <Text style={styles.stepHint}>
            {step === 'photo1'
              ? 'Photo 1: Fish on mat with QR code visible'
              : 'Photo 2: Full fish with ruler/measuring tape'}
          </Text>

          {step === 'photo1' && (
            <View style={styles.qrBadge}>
              <Text style={styles.qrBadgeText}>
                {qrCode ? `✓ QR: ${qrCode}` : 'Point camera at mat QR code'}
              </Text>
            </View>
          )}

          <TouchableOpacity style={styles.captureButton} onPress={takePicture}>
            <View style={styles.captureInner} />
          </TouchableOpacity>
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  cameraOverlay: {
    flex: 1, justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 48, backgroundColor: 'transparent',
  },
  stepHint: {
    color: '#fff', fontSize: 16, fontWeight: '600',
    textAlign: 'center', paddingHorizontal: 24,
    backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 8, padding: 10,
  },
  qrBadge: {
    backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 8, padding: 10, marginTop: 8,
  },
  qrBadgeText: { color: '#fff', fontSize: 14 },
  captureButton: {
    width: 72, height: 72, borderRadius: 36, borderWidth: 4,
    borderColor: '#fff', justifyContent: 'center', alignItems: 'center',
  },
  captureInner: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#fff' },
  detailsContainer: { flex: 1, backgroundColor: '#fff', padding: 24 },
  stepTitle: { fontSize: 22, fontWeight: '700', color: '#1a5276', marginBottom: 16 },
  photoRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  thumbnail: { width: 140, height: 105, borderRadius: 8, backgroundColor: '#eee' },
  label: { fontSize: 13, fontWeight: '600', color: '#555', marginBottom: 4 },
  qrValue: { fontSize: 15, color: '#1a5276', marginBottom: 16 },
  missing: { color: '#e74c3c' },
  input: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 8,
    padding: 12, fontSize: 16, marginBottom: 16,
  },
  gpsValue: { fontSize: 14, color: '#555', marginBottom: 24 },
  button: { backgroundColor: '#1a5276', borderRadius: 8, padding: 16, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  retakeLink: { marginTop: 16, alignItems: 'center' },
  retakeLinkText: { color: '#1a5276', fontSize: 15 },
  bigEmoji: { fontSize: 64, marginBottom: 16 },
  successTitle: { fontSize: 24, fontWeight: '700', color: '#333', marginBottom: 8 },
  successText: { fontSize: 15, color: '#666', textAlign: 'center', marginBottom: 24 },
  uploadingText: { marginTop: 16, fontSize: 16, color: '#555' },
  permText: { fontSize: 15, color: '#555', textAlign: 'center', marginBottom: 20 },
});
