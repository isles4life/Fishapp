import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, Image, TextInput, SafeAreaView, ScrollView,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation';
import { uploadSubmission } from '../../services/api';
import { enqueue } from '../../services/submissionQueue';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';

type Props = NativeStackScreenProps<RootStackParamList, 'Submission'>;
type Step = 'photo' | 'measure' | 'details' | 'uploading' | 'success' | 'error';
type Point = { x: number; y: number };

// Credit card ISO standard long edge = 85.6 mm
const CARD_LONG_EDGE_CM = 8.56;
const DOT_R = 9;

function ptDist(a: Point, b: Point) {
  return Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2);
}

function MeasureLine({ p1, p2, color }: { p1: Point; p2: Point; color: string }) {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx) * (180 / Math.PI);
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: (p1.x + p2.x) / 2 - len / 2,
        top: (p1.y + p2.y) / 2 - 1.5,
        width: len,
        height: 3,
        backgroundColor: color,
        opacity: 0.9,
        borderRadius: 2,
        transform: [{ rotate: `${angle}deg` }],
      }}
    />
  );
}

export default function SubmissionFlowScreen({ navigation, route }: Props) {
  const { tournamentId } = route.params;
  const [permission, requestPermission] = useCameraPermissions();
  const [step, setStep] = useState<Step>('photo');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [fishLength, setFishLength] = useState('');
  const [speciesName, setSpeciesName] = useState('');
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [failedFields, setFailedFields] = useState<Parameters<typeof uploadSubmission>[0] | null>(null);
  const cameraRef = useRef<CameraView>(null);

  // Measure state
  const [measurePhase, setMeasurePhase] = useState<'card' | 'fish' | 'done'>('card');
  const [cardPoints, setCardPoints] = useState<Point[]>([]);
  const [fishPoints, setFishPoints] = useState<Point[]>([]);
  const [measuredCm, setMeasuredCm] = useState<number | null>(null);

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
    setPhotoUri(photo.uri);
    setMeasurePhase('card');
    setCardPoints([]);
    setFishPoints([]);
    setMeasuredCm(null);
    setStep('measure');
  }

  function handleMeasureTap(x: number, y: number) {
    if (measurePhase === 'card') {
      const next = [...cardPoints, { x, y }];
      setCardPoints(next);
      if (next.length === 2) setMeasurePhase('fish');
    } else if (measurePhase === 'fish') {
      const next = [...fishPoints, { x, y }];
      setFishPoints(next);
      if (next.length === 2) {
        const cardPx = ptDist(cardPoints[0], cardPoints[1]);
        const fishPx = ptDist(next[0], next[1]);
        const cm = Math.round((fishPx / cardPx) * CARD_LONG_EDGE_CM * 10) / 10;
        setMeasuredCm(cm);
        setMeasurePhase('done');
      }
    }
  }

  function handleMeasureUndo() {
    if (fishPoints.length > 0 || measurePhase === 'done') {
      setFishPoints(fishPoints.slice(0, -1));
      setMeasurePhase('fish');
      setMeasuredCm(null);
    } else if (measurePhase === 'fish') {
      setCardPoints(cardPoints.slice(0, -1));
      setMeasurePhase('card');
    } else if (cardPoints.length > 0) {
      setCardPoints(cardPoints.slice(0, -1));
    }
  }

  function handleUseMeasurement() {
    if (measuredCm !== null) setFishLength(String(measuredCm));
    setStep('details');
  }

  async function handleSubmit() {
    if (!photoUri || !location) {
      return Alert.alert('Missing data', 'Ensure photo is taken and GPS is available.');
    }
    if (!fishLength || isNaN(Number(fishLength))) {
      return Alert.alert('Missing data', 'Enter a valid fish length in cm.');
    }
    setStep('uploading');
    try {
      await uploadSubmission({
        tournamentId,
        fishLengthCm: fishLength,
        gpsLat: String(location.latitude),
        gpsLng: String(location.longitude),
        capturedAt: new Date().toISOString(),
        photoUri,
        speciesName: speciesName.trim() || undefined,
      });
      setStep('success');
    } catch (e: any) {
      setErrorMessage(e.message);
      setFailedFields({
        tournamentId,
        fishLengthCm: fishLength,
        gpsLat: String(location!.latitude),
        gpsLng: String(location!.longitude),
        capturedAt: new Date().toISOString(),
        photoUri: photoUri!,
        speciesName: speciesName.trim() || undefined,
      });
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
          <TouchableOpacity style={styles.goldBtn} onPress={() => setStep('details')}>
            <Text style={styles.goldBtnText}>TRY AGAIN</Text>
          </TouchableOpacity>
          {failedFields && (
            <TouchableOpacity
              style={[styles.outlineBtn, { marginTop: 10 }]}
              onPress={async () => {
                await enqueue(failedFields);
                Alert.alert('Saved', 'Your catch will be submitted automatically when you reconnect.');
                navigation.goBack();
              }}
            >
              <Text style={styles.outlineBtnText}>SAVE & RETRY LATER</Text>
            </TouchableOpacity>
          )}
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

  // ── Measure ───────────────────────────────────────────────────────────────

  if (step === 'measure') {
    const done = measurePhase === 'done';
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.detailsHeader}>
          <TouchableOpacity onPress={() => setStep('photo')} style={styles.backBtn}>
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <Text style={styles.detailsTitle}>MEASURE FISH</Text>
          <TouchableOpacity onPress={() => setStep('details')} style={styles.skipBtn}>
            <Text style={styles.skipBtnText}>SKIP</Text>
          </TouchableOpacity>
        </View>

        <View
          style={styles.measureImageWrap}
          onTouchStart={!done ? (e) => handleMeasureTap(e.nativeEvent.locationX, e.nativeEvent.locationY) : undefined}
        >
          <Image
            source={{ uri: photoUri! }}
            style={StyleSheet.absoluteFill}
            resizeMode="contain"
            pointerEvents="none"
          />
          {cardPoints.length === 2 && <MeasureLine p1={cardPoints[0]} p2={cardPoints[1]} color="#4CAF50" />}
          {fishPoints.length === 2 && <MeasureLine p1={fishPoints[0]} p2={fishPoints[1]} color={colors.accent} />}
          {cardPoints.map((pt, i) => (
            <View key={`c${i}`} pointerEvents="none"
              style={[styles.measureDot, { left: pt.x - DOT_R, top: pt.y - DOT_R, backgroundColor: '#4CAF50' }]} />
          ))}
          {fishPoints.map((pt, i) => (
            <View key={`f${i}`} pointerEvents="none"
              style={[styles.measureDot, { left: pt.x - DOT_R, top: pt.y - DOT_R, backgroundColor: colors.accent }]} />
          ))}
        </View>

        <View style={styles.measurePanel}>
          {done ? (
            <>
              <Text style={styles.measureResultNum}>📏 {measuredCm} CM</Text>
              <Text style={styles.measureResultSub}>Measured via credit card (85.6 mm reference)</Text>
              <TouchableOpacity style={[styles.goldBtn, { marginTop: 16 }]} onPress={handleUseMeasurement}>
                <Text style={styles.goldBtnText}>USE {measuredCm} CM</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.outlineBtn, { marginTop: 10 }]}
                onPress={() => { setMeasurePhase('card'); setCardPoints([]); setFishPoints([]); setMeasuredCm(null); }}
              >
                <Text style={styles.outlineBtnText}>RETAP</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={styles.measureSteps}>
                <View style={[styles.measureStepPill, measurePhase === 'card' && styles.measureStepPillActive]}>
                  <View style={[styles.measureStepDot, { backgroundColor: '#4CAF50' }]} />
                  <Text style={[styles.measureStepText, measurePhase === 'card' && { color: colors.text }]}>
                    {cardPoints.length < 2 ? `Tap card long edge  ${cardPoints.length}/2` : '✓ Card set'}
                  </Text>
                </View>
                <View style={[styles.measureStepPill, measurePhase === 'fish' && styles.measureStepPillActive]}>
                  <View style={[styles.measureStepDot, { backgroundColor: colors.accent }]} />
                  <Text style={[styles.measureStepText, measurePhase === 'fish' && { color: colors.text }]}>
                    {`Tap fish nose & tail  ${fishPoints.length}/2`}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.outlineBtn, { marginTop: 12, opacity: cardPoints.length === 0 ? 0.3 : 1 }]}
                onPress={handleMeasureUndo}
                disabled={cardPoints.length === 0}
              >
                <Text style={styles.outlineBtnText}>UNDO LAST TAP</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </SafeAreaView>
    );
  }

  // ── Details form ──────────────────────────────────────────────────────────

  if (step === 'details') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScrollView style={styles.detailsContainer} contentContainerStyle={{ paddingBottom: 40 }}>
          <View style={styles.detailsHeader}>
            <TouchableOpacity onPress={() => setStep('measure')} style={styles.backBtn}>
              <Text style={styles.backArrow}>←</Text>
            </TouchableOpacity>
            <Text style={styles.detailsTitle}>REVIEW CATCH</Text>
            <View style={{ width: 44 }} />
          </View>

          {/* Photo thumbnail */}
          {photoUri && (
            <View style={{ padding: 16 }}>
              <Image source={{ uri: photoUri }} style={styles.photoThumb} />
              <Text style={[styles.thumbLabel, { marginTop: 6 }]}>FISH PHOTO</Text>
            </View>
          )}

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
            {measuredCm !== null && (
              <Text style={styles.measuredBadge}>📏 Auto-measured via credit card</Text>
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

          <View style={{ paddingHorizontal: 16, marginTop: 8 }}>
            <TouchableOpacity style={styles.goldBtn} onPress={handleSubmit}>
              <Text style={styles.goldBtnText}>SUBMIT CATCH</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setStep('photo')} style={styles.retakeLink}>
              <Text style={styles.retakeLinkText}>Retake photo</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Camera ────────────────────────────────────────────────────────────────

  return (
    <View style={styles.flex}>
      <CameraView ref={cameraRef} style={styles.flex} facing="back">
        <View style={styles.cameraOverlay}>
          <View style={styles.cameraHeader}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.cameraBackBtn}>
              <Text style={styles.cameraBackText}>←</Text>
            </TouchableOpacity>
            <Text style={styles.cameraTitle}>SUBMIT CATCH</Text>
            <View style={{ width: 44 }} />
          </View>

          <View style={styles.guideContainer}>
            <View style={styles.guideDashed}>
              <Text style={styles.guideLabel}>FISH + CREDIT CARD VISIBLE</Text>
            </View>
          </View>

          <View style={styles.checklistSide}>
            <View style={styles.checklistItem}>
              <Text style={{ fontSize: 22 }}>💳</Text>
              <Text style={styles.checklistText}>Credit card in frame</Text>
            </View>
            <View style={styles.checklistItem}>
              <Text style={{ fontSize: 22 }}>🐟</Text>
              <Text style={styles.checklistText}>Full fish visible</Text>
            </View>
            <View style={styles.checklistItem}>
              <Text style={{ fontSize: 22 }}>📍</Text>
              <Text style={styles.checklistText}>GPS acquiring...</Text>
            </View>
          </View>

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
    flex: 1, justifyContent: 'center', alignItems: 'center',
    padding: 32, backgroundColor: colors.bg,
  },

  permTitle: { ...typography.displaySm, color: colors.text, marginBottom: 12, textAlign: 'center' },
  permText: { ...typography.bodyMd, color: colors.textSub, textAlign: 'center', marginBottom: 28 },

  goldBtn: {
    backgroundColor: colors.accent, borderRadius: 12,
    paddingVertical: 16, paddingHorizontal: 32,
    alignItems: 'center', marginTop: 8, alignSelf: 'stretch',
  },
  goldBtnText: { ...typography.button, color: colors.bg },
  outlineBtn: {
    borderRadius: 12, paddingVertical: 14, paddingHorizontal: 32,
    alignItems: 'center', alignSelf: 'stretch',
    borderWidth: 1, borderColor: colors.border,
  },
  outlineBtnText: { ...typography.button, color: colors.textSub },

  successCheckWrap: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: colors.verifiedBg, borderWidth: 2, borderColor: colors.verified,
    alignItems: 'center', justifyContent: 'center', marginBottom: 20,
  },
  successTitle: { ...typography.displayMd, color: colors.text, marginBottom: 8, textAlign: 'center' },
  successSub: { ...typography.bodyMd, color: colors.textSub, textAlign: 'center', marginBottom: 28 },

  errorIcon: { fontSize: 48, color: colors.error, marginBottom: 16 },
  errorTitle: { ...typography.displayMd, color: colors.text, marginBottom: 8, textAlign: 'center' },
  errorSub: { ...typography.bodyMd, color: colors.textSub, textAlign: 'center', marginBottom: 28 },

  uploadingText: { ...typography.displaySm, color: colors.text, marginTop: 20 },
  uploadingSub: { ...typography.bodyMd, color: colors.textSub, marginTop: 8 },

  // Measure
  measureImageWrap: { flex: 1, backgroundColor: '#000' },
  measureDot: {
    position: 'absolute', width: DOT_R * 2, height: DOT_R * 2,
    borderRadius: DOT_R, borderWidth: 2, borderColor: '#fff',
  },
  measurePanel: {
    backgroundColor: colors.surface, borderTopWidth: 1,
    borderTopColor: colors.border, paddingHorizontal: 20,
    paddingTop: 16, paddingBottom: 20,
  },
  measureSteps: { gap: 10 },
  measureStepPill: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 10, paddingHorizontal: 14,
    borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bg,
  },
  measureStepPillActive: { borderColor: colors.borderGold, backgroundColor: 'rgba(201,164,80,0.08)' },
  measureStepDot: { width: 10, height: 10, borderRadius: 5 },
  measureStepText: { ...typography.bodyMd, color: colors.textMuted, flex: 1 },
  measureResultNum: { ...typography.numLg, color: colors.accent, textAlign: 'center', fontSize: 32 },
  measureResultSub: { ...typography.caption, color: colors.textMuted, textAlign: 'center', marginTop: 4 },
  skipBtn: { width: 44, alignItems: 'flex-end', justifyContent: 'center' },
  skipBtnText: { ...typography.labelSm, color: colors.textSub },

  // Details
  detailsContainer: { flex: 1, backgroundColor: colors.bg },
  detailsHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 52, paddingHorizontal: 16, paddingBottom: 16,
    backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  backArrow: { fontSize: 22, color: colors.accent, fontWeight: '600' },
  detailsTitle: { ...typography.displaySm, color: colors.text },
  photoThumb: { width: '100%', aspectRatio: 4 / 3, borderRadius: 12, backgroundColor: colors.surface },
  thumbLabel: { ...typography.labelSm, color: colors.textMuted },
  detailsCard: {
    marginHorizontal: 16, marginBottom: 12, backgroundColor: colors.surface,
    borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 14,
  },
  detailsFieldLabel: { ...typography.label, color: colors.textMuted, marginBottom: 6 },
  lengthInput: {
    ...typography.numMd, color: colors.accent,
    borderBottomWidth: 1, borderBottomColor: colors.borderGold, paddingVertical: 4,
  },
  lengthPreview: { ...typography.numLg, color: colors.accent, marginTop: 8 },
  measuredBadge: { ...typography.caption, color: colors.textMuted, marginTop: 6 },
  gpsValue: { ...typography.bodyMd, color: colors.textSub },
  retakeLink: { marginTop: 12, alignItems: 'center', paddingVertical: 8 },
  retakeLinkText: { ...typography.bodyMd, color: colors.textSub },

  // Camera
  cameraOverlay: { flex: 1, backgroundColor: 'transparent' },
  cameraHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 52, paddingHorizontal: 16, paddingBottom: 16,
    backgroundColor: 'rgba(13,26,13,0.8)',
  },
  cameraBackBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  cameraBackText: { fontSize: 22, color: colors.accent, fontWeight: '600' },
  cameraTitle: { ...typography.displaySm, color: colors.text },
  guideContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  guideDashed: {
    width: '100%', height: 180, borderWidth: 2,
    borderColor: colors.accent, borderStyle: 'dashed', borderRadius: 12,
    alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 10,
  },
  guideLabel: {
    ...typography.labelSm, color: colors.accent,
    backgroundColor: 'rgba(13,26,13,0.7)', paddingHorizontal: 10,
    paddingVertical: 4, borderRadius: 4,
  },
  checklistSide: { position: 'absolute', left: 16, top: 130, gap: 16 },
  checklistItem: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(13,26,13,0.75)', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 6,
    borderWidth: 1, borderColor: 'rgba(201,164,80,0.3)',
  },
  checklistText: { ...typography.caption, color: colors.accent },
  shutterBtn: {
    alignSelf: 'center', marginBottom: 40, width: 72, height: 72,
    borderRadius: 36, borderWidth: 3, borderColor: colors.accent,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(201,164,80,0.15)',
  },
  shutterInner: { width: 54, height: 54, borderRadius: 27, backgroundColor: colors.accent },
});
