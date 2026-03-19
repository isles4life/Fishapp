import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, Image, TextInput, SafeAreaView, ScrollView, FlatList,
} from 'react-native';

const COMMON_SPECIES = [
  'Largemouth Bass', 'Smallmouth Bass', 'Striped Bass', 'Spotted Bass',
  'Crappie', 'Bluegill', 'Walleye', 'Northern Pike', 'Muskie',
  'Rainbow Trout', 'Brown Trout', 'Brook Trout', 'Salmon', 'Catfish',
  'Redfish', 'Flounder', 'Snook', 'Tarpon', 'Grouper', 'Mahi-Mahi',
  'Speckled Trout', 'King Mackerel', 'Cobia', 'Wahoo',
];
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation';
import { uploadSubmission, identifyFish } from '../../services/api';
import { enqueue } from '../../services/submissionQueue';
import * as ImagePicker from 'expo-image-picker';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';

type Props = NativeStackScreenProps<RootStackParamList, 'Submission'>;
type Step = 'photo' | 'measure' | 'details' | 'uploading' | 'success' | 'error';

function cmToIn(cm: number): string {
  return (cm / 2.54).toFixed(1);
}

function inToCm(inches: number): number {
  return Math.round(inches * 2.54 * 10) / 10;
}

export default function SubmissionFlowScreen({ navigation, route }: Props) {
  const { tournamentId } = route.params;
  const [permission, requestPermission] = useCameraPermissions();
  const [step, setStep] = useState<Step>('photo');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [fishLength, setFishLength] = useState('');
  const [speciesName, setSpeciesName] = useState('');
  const [released, setReleased] = useState(false);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [aiSuggestions, setAiSuggestions] = useState<{ species: string; confidence: number }[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [photoSource, setPhotoSource] = useState<'camera' | 'library'>('camera');
  const [errorMessage, setErrorMessage] = useState('');
  const [failedFields, setFailedFields] = useState<Parameters<typeof uploadSubmission>[0] | null>(null);
  const cameraRef = useRef<CameraView>(null);

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
    setAiSuggestions([]);
    setPhotoSource('camera');
    setStep('measure');
    // Fire AI identification in background while user measures
    setAiLoading(true);
    identifyFish(photo.uri, 'image/jpeg')
      .then(result => {
        setAiSuggestions(result.suggestions);
        // Auto-select top suggestion if high confidence and user hasn't picked yet
        if (result.suggestions[0]?.confidence >= 70) {
          setSpeciesName(prev => prev || result.suggestions[0].species);
        }
      })
      .catch(() => {})
      .finally(() => setAiLoading(false));
  }

  async function handlePickPhoto() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow photo library access to upload a photo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.85,
    });
    if (result.canceled || !result.assets[0]) return;
    const uri = result.assets[0].uri;
    setPhotoUri(uri);
    setAiSuggestions([]);
    setPhotoSource('library');
    setStep('measure');
    setAiLoading(true);
    identifyFish(uri, 'image/jpeg')
      .then(r => {
        setAiSuggestions(r.suggestions);
        if (r.suggestions[0]?.confidence >= 70) {
          setSpeciesName(prev => prev || r.suggestions[0].species);
        }
      })
      .catch(() => {})
      .finally(() => setAiLoading(false));
  }

  async function handleSubmit() {
    if (!photoUri || !location) {
      return Alert.alert('Missing data', 'Ensure photo is taken and GPS is available.');
    }
    if (!fishLength || isNaN(Number(fishLength))) {
      return Alert.alert('Missing data', 'Enter a valid fish length in inches.');
    }
    const fishLengthCm = String(inToCm(Number(fishLength)));
    setStep('uploading');
    try {
      await uploadSubmission({
        tournamentId,
        fishLengthCm,
        gpsLat: String(location.latitude),
        gpsLng: String(location.longitude),
        capturedAt: new Date().toISOString(),
        photoUri,
        speciesName: speciesName.trim() || undefined,
        released: String(released),
      });
      setStep('success');
    } catch (e: any) {
      setErrorMessage(e.message);
      setFailedFields({
        tournamentId,
        fishLengthCm,
        gpsLat: String(location!.latitude),
        gpsLng: String(location!.longitude),
        capturedAt: new Date().toISOString(),
        photoUri: photoUri!,
        speciesName: speciesName.trim() || undefined,
        released: String(released),
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
                try {
                  await enqueue(failedFields);
                  Alert.alert('Saved', 'Your catch will be submitted automatically when you reconnect.');
                  navigation.goBack();
                } catch (e: any) {
                  Alert.alert('Save Failed', e.message ?? 'Could not save catch. Please try submitting again.');
                }
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
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.detailsHeader}>
          <TouchableOpacity
            onPress={() => photoSource === 'library' ? handlePickPhoto() : setStep('photo')}
            style={styles.backBtn}
          >
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <Text style={styles.detailsTitle}>ENTER LENGTH</Text>
          <TouchableOpacity onPress={() => setStep('details')} style={styles.skipBtn}>
            <Text style={styles.skipBtnText}>SKIP</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.measureImageWrap}>
          <Image
            source={{ uri: photoUri! }}
            style={StyleSheet.absoluteFill}
            resizeMode="contain"
          />
        </View>

        <View style={styles.measurePanel}>
          <Text style={styles.measurePrompt}>Read your mat, ruler, or tape — enter length below</Text>
          <TextInput
            style={styles.measureInput}
            placeholder="e.g. 16.5"
            placeholderTextColor={colors.textMuted}
            keyboardType="decimal-pad"
            value={fishLength}
            onChangeText={setFishLength}
            autoFocus
          />
          {fishLength !== '' && !isNaN(Number(fishLength)) && (
            <Text style={styles.measureResultNum}>{fishLength}″</Text>
          )}
          <TouchableOpacity
            style={[styles.goldBtn, { marginTop: 16, opacity: (!fishLength || isNaN(Number(fishLength))) ? 0.4 : 1 }]}
            onPress={() => setStep('details')}
            disabled={!fishLength || isNaN(Number(fishLength))}
          >
            <Text style={styles.goldBtnText}>NEXT →</Text>
          </TouchableOpacity>
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
            <Text style={styles.detailsFieldLabel}>FISH LENGTH (INCHES)</Text>
            <TextInput
              style={styles.lengthInput}
              placeholder="e.g. 16.5"
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
              value={fishLength}
              onChangeText={setFishLength}
            />
            {fishLength !== '' && !isNaN(Number(fishLength)) && (
              <Text style={styles.lengthPreview}>{fishLength}"</Text>
            )}
          </View>

          {/* Species */}
          <View style={styles.detailsCard}>
            <Text style={styles.detailsFieldLabel}>SPECIES (OPTIONAL)</Text>

            {/* AI identification banner */}
            {aiLoading && (
              <View style={styles.aiBanner}>
                <ActivityIndicator size="small" color={colors.accent} />
                <Text style={styles.aiLabel}>Identifying species…</Text>
              </View>
            )}
            {!aiLoading && aiSuggestions.length > 0 && (
              <View style={styles.aiBanner}>
                <Text style={styles.aiLabel}>🤖 AI identified</Text>
                <View style={styles.aiChips}>
                  {aiSuggestions.map(s => (
                    <TouchableOpacity
                      key={s.species}
                      style={[styles.aiChip, speciesName === s.species && styles.aiChipSelected]}
                      onPress={() => setSpeciesName(speciesName === s.species ? '' : s.species)}
                    >
                      <Text style={[styles.aiChipText, speciesName === s.species && styles.aiChipTextSelected]}>
                        {s.species}
                      </Text>
                      <Text style={styles.aiConfidence}>{s.confidence}%</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            <FlatList
              data={COMMON_SPECIES}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={item => item}
              style={{ marginBottom: 10 }}
              renderItem={({ item }) => {
                const selected = speciesName === item;
                return (
                  <TouchableOpacity
                    onPress={() => setSpeciesName(selected ? '' : item)}
                    style={[styles.speciesChip, selected && styles.speciesChipSelected]}
                  >
                    <Text style={[styles.speciesChipText, selected && styles.speciesChipTextSelected]}>
                      {item}
                    </Text>
                  </TouchableOpacity>
                );
              }}
            />
            <TextInput
              style={styles.lengthInput}
              placeholder="Or type a custom species..."
              placeholderTextColor={colors.textMuted}
              value={speciesName}
              onChangeText={setSpeciesName}
              autoCapitalize="words"
            />
          </View>

          {/* Catch & Release */}
          <TouchableOpacity
            style={[styles.detailsCard, styles.releaseRow]}
            onPress={() => setReleased(r => !r)}
            activeOpacity={0.8}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.detailsFieldLabel}>CATCH & RELEASE</Text>
              <Text style={styles.releaseSubtext}>Fish was safely returned to water</Text>
            </View>
            <View style={[styles.releaseToggle, released && styles.releaseToggleOn]}>
              <View style={[styles.releaseThumb, released && styles.releaseThumbOn]} />
            </View>
          </TouchableOpacity>

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
              <Text style={styles.guideLabel}>FISH + MEASURING DEVICE VISIBLE</Text>
            </View>
          </View>

          <View style={styles.checklistSide}>
            <View style={styles.checklistItem}>
              <Text style={{ fontSize: 22 }}>📏</Text>
              <Text style={styles.checklistText}>Mat, ruler, or tape in frame</Text>
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

          <View style={styles.shutterRow}>
            <TouchableOpacity style={styles.uploadBtn} onPress={handlePickPhoto} activeOpacity={0.8}>
              <Text style={styles.uploadBtnText}>⬆ Upload</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.shutterBtn} onPress={takePicture} activeOpacity={0.8}>
              <View style={styles.shutterInner} />
            </TouchableOpacity>
            <View style={{ width: 64 }} />
          </View>
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
  measurePanel: {
    backgroundColor: colors.surface, borderTopWidth: 1,
    borderTopColor: colors.border, paddingHorizontal: 20,
    paddingTop: 16, paddingBottom: 20,
  },
  measurePrompt: { ...typography.bodyMd, color: colors.textSub, textAlign: 'center', marginBottom: 12 },
  measureInput: {
    ...typography.numLg, color: colors.accent,
    borderBottomWidth: 1, borderBottomColor: colors.borderGold,
    paddingVertical: 4, textAlign: 'center', fontSize: 28,
  },
  measureResultNum: { ...typography.numLg, color: colors.accent, textAlign: 'center', fontSize: 32, marginTop: 8 },
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
  speciesChip: {
    borderRadius: 20, borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: 12, paddingVertical: 6, marginRight: 8, backgroundColor: colors.bg,
  },
  speciesChipSelected: {
    borderColor: colors.accent, backgroundColor: colors.accent + '20',
  },
  speciesChipText: { ...typography.caption, color: colors.textSub },
  speciesChipTextSelected: { color: colors.accent, fontWeight: '600' },
  aiBanner: {
    backgroundColor: colors.surfaceHigh,
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.accent + '30',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  aiLabel: { ...typography.label, color: colors.accent, fontSize: 11 },
  aiChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, flex: 1 },
  aiChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.surface, borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: colors.accent + '50',
  },
  aiChipSelected: { backgroundColor: colors.accent + '20', borderColor: colors.accent },
  aiChipText: { ...typography.caption, color: colors.textSub, fontSize: 13 },
  aiChipTextSelected: { color: colors.accent, fontWeight: '700' },
  aiConfidence: { ...typography.caption, color: colors.textMuted, fontSize: 11 },
  lengthInput: {
    ...typography.numMd, color: colors.accent,
    borderBottomWidth: 1, borderBottomColor: colors.borderGold, paddingVertical: 4,
  },
  lengthPreview: { ...typography.numLg, color: colors.accent, marginTop: 8 },
  gpsValue: { ...typography.bodyMd, color: colors.textSub },
  releaseRow: { flexDirection: 'row', alignItems: 'center' },
  releaseSubtext: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  releaseToggle: {
    width: 48, height: 28, borderRadius: 14,
    backgroundColor: colors.border, justifyContent: 'center', paddingHorizontal: 2,
  },
  releaseToggleOn: { backgroundColor: colors.verified },
  releaseThumb: {
    width: 22, height: 22, borderRadius: 11, backgroundColor: colors.textMuted,
  },
  releaseThumbOn: { backgroundColor: '#fff', alignSelf: 'flex-end' },
  retakeLink: { marginTop: 12, alignItems: 'center', paddingVertical: 8 },
  retakeLinkText: { ...typography.bodyMd, color: colors.textSub },

  // Camera
  cameraOverlay: { flex: 1, backgroundColor: 'transparent' },
  cameraHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 52, paddingHorizontal: 16, paddingBottom: 16,
    backgroundColor: 'rgba(46,61,56,0.9)',
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
    backgroundColor: 'rgba(46,61,56,0.8)', paddingHorizontal: 10,
    paddingVertical: 4, borderRadius: 4,
  },
  checklistSide: { position: 'absolute', left: 16, top: 130, gap: 16 },
  checklistItem: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(46,61,56,0.85)', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 6,
    borderWidth: 1, borderColor: colors.accent + '50',
  },
  checklistText: { ...typography.caption, color: colors.accent },
  shutterRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    marginBottom: 40, gap: 20,
  },
  shutterBtn: {
    width: 72, height: 72,
    borderRadius: 36, borderWidth: 3, borderColor: colors.accent,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(207,194,156,0.15)',
  },
  shutterInner: { width: 54, height: 54, borderRadius: 27, backgroundColor: colors.cream },
  uploadBtn: {
    width: 64, height: 64, borderRadius: 12,
    borderWidth: 1, borderColor: colors.accent + '80',
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(46,61,56,0.85)',
  },
  uploadBtnText: { ...typography.caption, color: colors.accent, textAlign: 'center', fontSize: 11 },
});
