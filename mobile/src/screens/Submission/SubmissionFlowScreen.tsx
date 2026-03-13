import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, Image, TextInput, SafeAreaView,
} from 'react-native';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import * as Location from 'expo-location';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation';
import { validateQR } from '../../utils/qrValidator';
import { uploadSubmission } from '../../services/api';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { FishOnMatIcon, MouthClosedIcon, TailPinchedIcon } from '../../components/icons/VerificationIcons';

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
  const [speciesName, setSpeciesName] = useState('');
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
        speciesName: speciesName.trim() || undefined,
      });
      setStep('success');
    } catch (e: any) {
      setErrorMessage(e.message);
      setStep('error');
    }
  }

  // ── Permission check ──────────────────────────────────────────────────────

  if (!permission) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.center}>
          <Text style={styles.permTitle}>CAMERA ACCESS REQUIRED</Text>
          <Text style={styles.permText}>Camera access is required to submit a catch.</Text>
          <TouchableOpacity style={styles.goldBtn} onPress={requestPermission}>
            <Text style={styles.goldBtnText}>GRANT PERMISSION</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Success ───────────────────────────────────────────────────────────────

  if (step === 'success') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.center}>
          <View style={styles.successCheckWrap}>
            <Text style={{ fontSize: 48, color: colors.verified }}>✓</Text>
          </View>
          <Text style={styles.successTitle}>CATCH SUBMITTED</Text>
          <Text style={styles.successSub}>Pending verification by league officials.</Text>
          <TouchableOpacity style={styles.goldBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.goldBtnText}>BACK TO HOME</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────

  if (step === 'error') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.center}>
          <Text style={styles.errorIcon}>✕</Text>
          <Text style={styles.errorTitle}>SUBMISSION FAILED</Text>
          <Text style={styles.errorSub}>{errorMessage}</Text>
          <TouchableOpacity style={styles.goldBtn} onPress={() => setStep('photo1')}>
            <Text style={styles.goldBtnText}>TRY AGAIN</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Uploading ─────────────────────────────────────────────────────────────

  if (step === 'uploading') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.uploadingText}>SUBMITTING...</Text>
          <Text style={styles.uploadingSub}>Uploading your catch to the league</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Details form ──────────────────────────────────────────────────────────

  if (step === 'details') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.detailsContainer}>
          {/* Header */}
          <View style={styles.detailsHeader}>
            <TouchableOpacity onPress={() => setStep('photo1')} style={styles.backBtn}>
              <Text style={styles.backArrow}>←</Text>
            </TouchableOpacity>
            <Text style={styles.detailsTitle}>REVIEW CATCH</Text>
            <View style={{ width: 44 }} />
          </View>

          {/* Photo thumbnails */}
          <View style={styles.photoRow}>
            {photo1Uri && (
              <View style={styles.thumbWrap}>
                <Image source={{ uri: photo1Uri }} style={styles.thumbnail} />
                <Text style={styles.thumbLabel}>MAT PHOTO</Text>
              </View>
            )}
            {photo2Uri && (
              <View style={styles.thumbWrap}>
                <Image source={{ uri: photo2Uri }} style={styles.thumbnail} />
                <Text style={styles.thumbLabel}>FISH PHOTO</Text>
              </View>
            )}
          </View>

          {/* QR Code */}
          <View style={styles.detailsCard}>
            <Text style={styles.detailsFieldLabel}>MAT QR CODE</Text>
            <Text style={[styles.detailsFieldValue, !qrCode && { color: colors.error }]}>
              {qrCode ?? 'Not detected — retake photo 1'}
            </Text>
          </View>

          {/* Fish Length */}
          <View style={styles.detailsCard}>
            <Text style={styles.detailsFieldLabel}>FISH LENGTH (CM)</Text>
            <TextInput
              style={styles.lengthInput}
              placeholder="e.g. 42.5"
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
              value={fishLength}
              onChangeText={setFishLength}
            />
            {fishLength !== '' && !isNaN(Number(fishLength)) && (
              <Text style={styles.lengthPreview}>{fishLength} CM</Text>
            )}
          </View>

          {/* Species */}
          <View style={styles.detailsCard}>
            <Text style={styles.detailsFieldLabel}>SPECIES (OPTIONAL)</Text>
            <TextInput
              style={styles.lengthInput}
              placeholder="e.g. Largemouth Bass"
              placeholderTextColor={colors.textMuted}
              value={speciesName}
              onChangeText={setSpeciesName}
              autoCapitalize="words"
            />
          </View>

          {/* GPS */}
          <View style={styles.detailsCard}>
            <Text style={styles.detailsFieldLabel}>GPS LOCATION</Text>
            <Text style={styles.gpsValue}>
              {location
                ? `${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}`
                : 'Acquiring location...'}
            </Text>
          </View>

          <TouchableOpacity style={styles.goldBtn} onPress={handleSubmit}>
            <Text style={styles.goldBtnText}>SUBMIT CATCH</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setStep('photo1')} style={styles.retakeLink}>
            <Text style={styles.retakeLinkText}>Retake photos</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
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
        {/* Dark overlay with camera UI */}
        <View style={styles.cameraOverlay}>
          {/* Camera header */}
          <View style={styles.cameraHeader}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.cameraBackBtn}>
              <Text style={styles.cameraBackText}>←</Text>
            </TouchableOpacity>
            <Text style={styles.cameraTitle}>
              {step === 'photo1' ? 'SUBMIT CATCH' : 'FISH PHOTO'}
            </Text>
            <View style={{ width: 44 }} />
          </View>

          {/* Fish guide rectangle */}
          <View style={styles.guideContainer}>
            <View style={styles.guideDashed}>
              <Text style={styles.guideLabel}>
                {step === 'photo1' ? 'FISH ON MAT + QR CODE' : 'FULL FISH VISIBLE'}
              </Text>
            </View>
          </View>

          {/* Verification checklist (photo1 only) */}
          {step === 'photo1' && (
            <View style={styles.checklistSide}>
              <View style={styles.checklistItem}>
                <FishOnMatIcon size={28} color={qrCode ? colors.verified : colors.accent} />
                <Text style={[styles.checklistText, qrCode && { color: colors.verified }]}>
                  Fish on mat
                </Text>
              </View>
              <View style={styles.checklistItem}>
                <MouthClosedIcon size={28} color={colors.accent} />
                <Text style={styles.checklistText}>Mouth closed</Text>
              </View>
              <View style={styles.checklistItem}>
                <TailPinchedIcon size={28} color={colors.accent} />
                <Text style={styles.checklistText}>Tail pinched</Text>
              </View>
            </View>
          )}

          {/* QR status badge */}
          {step === 'photo1' && (
            <View style={[styles.qrBadge, qrCode && styles.qrBadgeDetected]}>
              <Text style={[styles.qrBadgeText, qrCode && { color: colors.verified }]}>
                {qrCode ? `✓ QR: ${qrCode}` : 'Point camera at mat QR code'}
              </Text>
            </View>
          )}

          {/* Gold shutter button */}
          <TouchableOpacity style={styles.shutterBtn} onPress={takePicture} activeOpacity={0.8}>
            <View style={styles.shutterInner} />
          </TouchableOpacity>
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: colors.bg },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: colors.bg,
  },

  // Permission
  permTitle: {
    ...typography.displaySm,
    color: colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  permText: {
    ...typography.bodyMd,
    color: colors.textSub,
    textAlign: 'center',
    marginBottom: 28,
  },

  // Buttons
  goldBtn: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
    marginTop: 8,
    alignSelf: 'stretch',
  },
  goldBtnText: {
    ...typography.button,
    color: colors.bg,
  },

  // Success
  successCheckWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.verifiedBg,
    borderWidth: 2,
    borderColor: colors.verified,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  successTitle: {
    ...typography.displayMd,
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  successSub: {
    ...typography.bodyMd,
    color: colors.textSub,
    textAlign: 'center',
    marginBottom: 28,
  },

  // Error
  errorIcon: {
    fontSize: 48,
    color: colors.error,
    marginBottom: 16,
  },
  errorTitle: {
    ...typography.displayMd,
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorSub: {
    ...typography.bodyMd,
    color: colors.textSub,
    textAlign: 'center',
    marginBottom: 28,
  },

  // Uploading
  uploadingText: {
    ...typography.displaySm,
    color: colors.text,
    marginTop: 20,
  },
  uploadingSub: {
    ...typography.bodyMd,
    color: colors.textSub,
    marginTop: 8,
  },

  // Details
  detailsContainer: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingBottom: 24,
  },
  detailsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 52,
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: {
    fontSize: 22,
    color: colors.accent,
    fontWeight: '600',
  },
  detailsTitle: {
    ...typography.displaySm,
    color: colors.text,
  },
  photoRow: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
  },
  thumbWrap: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  thumbnail: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: 10,
    backgroundColor: colors.surface,
  },
  thumbLabel: {
    ...typography.labelSm,
    color: colors.textMuted,
  },
  detailsCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  detailsFieldLabel: {
    ...typography.label,
    color: colors.textMuted,
    marginBottom: 6,
  },
  detailsFieldValue: {
    ...typography.bodyMd,
    color: colors.verified,
    fontWeight: '600',
  },
  lengthInput: {
    ...typography.numMd,
    color: colors.accent,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderGold,
    paddingVertical: 4,
  },
  lengthPreview: {
    ...typography.numLg,
    color: colors.accent,
    marginTop: 8,
  },
  gpsValue: {
    ...typography.bodyMd,
    color: colors.textSub,
  },
  retakeLink: {
    marginTop: 12,
    alignItems: 'center',
    paddingVertical: 8,
  },
  retakeLinkText: {
    ...typography.bodyMd,
    color: colors.textSub,
  },

  // Camera overlay
  cameraOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  cameraHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 52,
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: 'rgba(13,26,13,0.8)',
  },
  cameraBackBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraBackText: {
    fontSize: 22,
    color: colors.accent,
    fontWeight: '600',
  },
  cameraTitle: {
    ...typography.displaySm,
    color: colors.text,
  },
  guideContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  guideDashed: {
    width: '100%',
    height: 180,
    borderWidth: 2,
    borderColor: colors.accent,
    borderStyle: 'dashed',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 10,
  },
  guideLabel: {
    ...typography.labelSm,
    color: colors.accent,
    backgroundColor: 'rgba(13,26,13,0.7)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  checklistSide: {
    position: 'absolute',
    left: 16,
    top: 130,
    gap: 16,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(13,26,13,0.75)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(201,164,80,0.3)',
  },
  checklistText: {
    ...typography.caption,
    color: colors.accent,
  },
  qrBadge: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: 'rgba(201,164,80,0.15)',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(201,164,80,0.4)',
    alignItems: 'center',
  },
  qrBadgeDetected: {
    backgroundColor: colors.verifiedBg,
    borderColor: colors.verified + '60',
  },
  qrBadgeText: {
    ...typography.caption,
    color: colors.accent,
  },
  shutterBtn: {
    alignSelf: 'center',
    marginBottom: 40,
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 3,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(201,164,80,0.15)',
  },
  shutterInner: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.accent,
  },
});
