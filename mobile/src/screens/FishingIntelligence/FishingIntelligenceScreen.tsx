import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Image,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as Location from 'expo-location';
import * as api from '../../services/api';
import type { FishingIntelResponse, FishingSpot, SpeciesActivity } from '../../models';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';

// ── Weather emoji — day/night aware ──────────────────────────────────────────

function weatherEmoji(code?: number, sunriseIso?: string, sunsetIso?: string): string {
  if (code === undefined || code === null) return '🌡';
  const now = Date.now();
  const isNight =
    sunriseIso && sunsetIso
      ? now < new Date(sunriseIso).getTime() || now > new Date(sunsetIso).getTime()
      : new Date().getHours() < 6 || new Date().getHours() >= 20;
  if (code === 0) return isNight ? '🌙' : '☀️';
  if (code <= 2) return isNight ? '🌙' : '🌤';
  if (code === 3) return '☁️';
  if (code <= 48) return '🌫';
  if (code <= 67) return '🌧';
  if (code <= 77) return '❄️';
  if (code <= 82) return '🌦';
  return '⛈';
}

// ── Pressure trend arrow ──────────────────────────────────────────────────────

function trendArrow(trend: 'rising' | 'falling' | 'stable'): string {
  if (trend === 'rising') return '↑';
  if (trend === 'falling') return '↓';
  return '→';
}

// ── Color helpers ─────────────────────────────────────────────────────────────

function activityColor(level: string): string {
  switch (level) {
    case 'EXCELLENT': return colors.accent;
    case 'HIGH':      return '#3DAF5A';
    case 'MODERATE':  return '#E67E22';
    default:          return colors.textMuted;
  }
}

function qualityColor(quality: string): string {
  return quality === 'EXCELLENT' ? colors.accent : '#3DAF5A';
}

function speciesActivityColor(activity: 'HIGH' | 'MODERATE' | 'LOW'): string {
  if (activity === 'HIGH') return '#3DAF5A';
  if (activity === 'MODERATE') return '#E67E22';
  return colors.textMuted;
}

// ── Geocode a US zip code via Nominatim ───────────────────────────────────────

async function geocodeZip(zip: string): Promise<{ lat: number; lon: number } | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&postalcode=${encodeURIComponent(zip)}&country=US&limit=1`,
      { headers: { Accept: 'application/json' } },
    );
    const json = await res.json();
    if (!json[0]) return null;
    return { lat: parseFloat(json[0].lat), lon: parseFloat(json[0].lon) };
  } catch {
    return null;
  }
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionCard({ children, style }: { children: React.ReactNode; style?: object }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

function CardTitle({ children }: { children: React.ReactNode }) {
  return <Text style={styles.cardTitle}>{children}</Text>;
}

function DataRow({ label, value, valueStyle }: { label: string; value: string; valueStyle?: object }) {
  return (
    <View style={styles.dataRow}>
      <Text style={styles.dataLabel}>{label}</Text>
      <Text style={[styles.dataValue, valueStyle]}>{value}</Text>
    </View>
  );
}

function SpeciesRow({ species }: { species: SpeciesActivity }) {
  const color = speciesActivityColor(species.activity);
  return (
    <View style={styles.speciesRow}>
      <View style={[styles.speciesDot, { backgroundColor: color }]} />
      <View style={{ flex: 1 }}>
        <View style={styles.speciesNameRow}>
          <Text style={styles.speciesName}>{species.name}</Text>
          <Text style={[styles.speciesActivityBadge, { color }]}>{species.activity}</Text>
        </View>
        <Text style={styles.speciesReason}>{species.reason}</Text>
      </View>
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function FishingIntelligenceScreen() {
  const navigation = useNavigation();
  const [data, setData] = useState<FishingIntelResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locationStatus, setLocationStatus] = useState<'idle' | 'requesting' | 'ok'>('idle');
  const [zip, setZip] = useState('');
  const [zipError, setZipError] = useState('');

  const fetchIntel = useCallback((lat: number, lon: number) => {
    setLoading(true);
    setError(null);
    api.getFishingIntel(lat, lon)
      .then(result => { setData(result); setLocationStatus('ok'); })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Failed to load fishing intelligence'))
      .finally(() => setLoading(false));
  }, []);

  const requestLocation = useCallback(async () => {
    setLocationStatus('requesting');
    setLoading(true);
    setError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Location permission denied. Please enable location access in Settings.');
        setLoading(false);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      fetchIntel(loc.coords.latitude, loc.coords.longitude);
    } catch {
      setError('Could not get your location. Try entering a zip code.');
      setLoading(false);
    }
  }, [fetchIntel]);

  const handleZipSubmit = useCallback(async () => {
    const z = zip.trim();
    if (!z) return;
    setZipError('');
    setLoading(true);
    const coords = await geocodeZip(z);
    if (!coords) {
      setLoading(false);
      setZipError('Zip code not found.');
      return;
    }
    fetchIntel(coords.lat, coords.lon);
  }, [zip, fetchIntel]);

  // No auto-load — user chooses zip or current location

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
            <Text style={styles.backBtnText}>‹ Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>⚡ FISH INTEL</Text>
          <Text style={styles.headerSub}>Weather-based fishing forecast · Nearby spots</Text>
        </View>

        {/* Zip code input — always visible */}
        <View style={styles.zipContainer}>
          <View style={styles.zipRow}>
            <TextInput
              style={[styles.zipInput, zipError ? styles.zipInputError : null]}
              value={zip}
              onChangeText={t => { setZip(t); setZipError(''); }}
              placeholder="Enter zip code…"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              maxLength={10}
              returnKeyType="search"
              onSubmitEditing={handleZipSubmit}
            />
            <TouchableOpacity
              style={[styles.zipBtn, loading && styles.btnDisabled]}
              onPress={handleZipSubmit}
              disabled={loading}
              activeOpacity={0.8}
            >
              <Text style={styles.zipBtnText}>GET FORECAST</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={[styles.locationBtn, loading && styles.btnDisabled]}
            onPress={requestLocation}
            disabled={loading}
            activeOpacity={0.8}
          >
            <Text style={styles.locationBtnText}>📍 Use My Location</Text>
          </TouchableOpacity>
          {zipError ? <Text style={styles.zipErrorText}>{zipError}</Text> : null}
        </View>

        {/* Idle prompt */}
        {!loading && !error && !data && (
          <View style={styles.centerWrap}>
            <Image source={require('../../../assets/icon.png')} style={{ width: 90, height: 90, marginBottom: 16, opacity: 0.7 }} resizeMode="contain" />
            <Text style={styles.idleTitle}>Check fishing conditions</Text>
            <Text style={styles.idleSubtitle}>Enter a zip code above or tap{'\n'}"Use My Location" to get started.</Text>
          </View>
        )}

        {/* Loading */}
        {loading && (
          <View style={styles.centerWrap}>
            <Image source={require('../../../assets/icon.png')} style={{ width: 100, height: 100, marginBottom: 16 }} resizeMode="contain" />
            <ActivityIndicator size="small" color={colors.accent} />
            <Text style={styles.loadingText}>
              {locationStatus === 'requesting' ? 'Requesting location…' : 'Analyzing conditions…'}
            </Text>
          </View>
        )}

        {/* Error */}
        {!loading && error && (
          <View style={styles.centerWrap}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={requestLocation} activeOpacity={0.8}>
              <Text style={styles.retryBtnText}>RETRY</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Content */}
        {!loading && !error && data && (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Location bar */}
            <View style={styles.locationRow}>
              <Text style={styles.locationIcon}>📍</Text>
              <Text style={styles.locationText}>{data.locationLabel}</Text>
              <Text style={styles.localTime}>{data.conditions.localTime}</Text>
            </View>

            {/* ── Conditions ──────────────────────────────────────────────── */}
            <SectionCard>
              <CardTitle>CONDITIONS</CardTitle>
              <View style={styles.weatherRow}>
                <Text style={styles.weatherEmoji}>
                  {weatherEmoji(data.conditions.weatherCode, data.sunriseIso, data.sunsetIso)}
                </Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.weatherDesc}>{data.conditions.weatherDesc}</Text>
                  <View style={styles.seasonBadge}>
                    <Text style={styles.seasonBadgeText}>
                      {data.conditions.season.toUpperCase()}
                    </Text>
                  </View>
                </View>
              </View>
              <DataRow label="Temperature" value={`${data.conditions.temperatureF}°F`} />
              <DataRow label="Wind" value={`${data.conditions.windMph} mph`} />
              <DataRow
                label="Pressure"
                value={`${data.conditions.pressureHpa} hPa  ${trendArrow(data.conditions.pressureTrend)}`}
                valueStyle={{
                  color:
                    data.conditions.pressureTrend === 'falling' ? colors.accent :
                    data.conditions.pressureTrend === 'rising' ? '#E67E22' :
                    colors.text,
                }}
              />
            </SectionCard>

            {/* ── Activity ────────────────────────────────────────────────── */}
            <SectionCard style={{ borderLeftWidth: 4, borderLeftColor: activityColor(data.activity.level) }}>
              <View style={styles.activityHeader}>
                <Text style={[styles.activityLevel, { color: activityColor(data.activity.level) }]}>
                  {data.activity.level}
                </Text>
                <CardTitle>ACTIVITY</CardTitle>
              </View>
              <Text style={styles.activityHeadline}>{data.activity.headline}</Text>
              <Text style={styles.activityReason}>{data.activity.reason}</Text>
            </SectionCard>

            {/* ── Recommendations ─────────────────────────────────────────── */}
            <SectionCard>
              <CardTitle>RECOMMENDATIONS</CardTitle>
              {[
                { icon: '🎣', label: 'LURE', primary: data.recommendations.lure, alt: `Alt: ${data.recommendations.altLure}` },
                { icon: '📏', label: 'DEPTH', primary: data.recommendations.depth },
                { icon: '🎯', label: 'TECHNIQUE', primary: data.recommendations.technique },
              ].map((rec, i) => (
                <View key={i}>
                  {i > 0 && <View style={styles.divider} />}
                  <View style={styles.recRow}>
                    <Text style={styles.recIcon}>{rec.icon}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.recSubLabel}>{rec.label}</Text>
                      <Text style={styles.recPrimary}>{rec.primary}</Text>
                      {rec.alt && <Text style={styles.recAlt}>{rec.alt}</Text>}
                    </View>
                  </View>
                </View>
              ))}
            </SectionCard>

            {/* ── Bite windows ────────────────────────────────────────────── */}
            {data.windows.length > 0 && (
              <SectionCard>
                <CardTitle>BITE WINDOWS</CardTitle>
                {data.windows.map((w, i) => (
                  <View key={i} style={[styles.windowRow, i < data.windows.length - 1 && styles.windowRowBorder]}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.windowLabel}>{w.label}</Text>
                      <Text style={styles.windowTime}>{w.start} – {w.end}</Text>
                    </View>
                    <View style={[styles.qualityBadge, { borderColor: qualityColor(w.quality) }]}>
                      <Text style={[styles.qualityText, { color: qualityColor(w.quality) }]}>
                        {w.quality}
                      </Text>
                    </View>
                  </View>
                ))}
              </SectionCard>
            )}

            {/* ── Tides ───────────────────────────────────────────────────── */}
            {data.tides && (
              <SectionCard>
                <CardTitle>🌊 TIDES — {data.tides.stationName}</CardTitle>
                <Text style={styles.tidesSubtitle}>NOAA station · {data.tides.distanceMi} mi away</Text>
                {data.tides.predictions.map((t, i) => (
                  <View key={i} style={styles.tideRow}>
                    <View style={[styles.tideIcon, { backgroundColor: t.type === 'H' ? '#0A2A4A' : '#1A1A3A', borderColor: t.type === 'H' ? '#1A6090' : '#3A3A7A' }]}>
                      <Text style={styles.tideArrow}>{t.type === 'H' ? '▲' : '▼'}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.tideLabel}>{t.type === 'H' ? 'High Tide' : 'Low Tide'}</Text>
                      <Text style={styles.tideTime}>{t.time}</Text>
                    </View>
                    <Text style={[styles.tideHeight, { color: t.type === 'H' ? '#5BB8F5' : '#9DB5A8' }]}>
                      {t.heightFt} ft
                    </Text>
                  </View>
                ))}
              </SectionCard>
            )}

            {/* ── Active Species ───────────────────────────────────────────── */}
            {data.activeSpecies && (
              <SectionCard>
                <CardTitle>🐟 ACTIVE SPECIES</CardTitle>
                <Text style={styles.speciesSubtitle}>
                  Based on water temp · season · pressure · {data.tides ? 'coastal proximity' : 'inland location'}
                </Text>

                {/* Freshwater */}
                <View style={styles.speciesSection}>
                  <View style={styles.speciesSectionHeader}>
                    <Text style={styles.speciesSectionIcon}>🏞</Text>
                    <Text style={styles.speciesSectionLabel}>FRESHWATER</Text>
                  </View>
                  {data.activeSpecies.freshwater.map((s) => (
                    <SpeciesRow key={s.name} species={s} />
                  ))}
                </View>

                {/* Saltwater */}
                <View style={[styles.speciesSection, { marginTop: 16 }]}>
                  <View style={styles.speciesSectionHeader}>
                    <Text style={styles.speciesSectionIcon}>🌊</Text>
                    <Text style={styles.speciesSectionLabel}>SALTWATER</Text>
                    {!data.tides && (
                      <Text style={styles.speciesOffshoreNote}>(offshore / travel)</Text>
                    )}
                  </View>
                  {data.activeSpecies.saltwater.map((s) => (
                    <SpeciesRow key={s.name} species={s} />
                  ))}
                </View>
              </SectionCard>
            )}

            {/* ── Nearby spots ────────────────────────────────────────────── */}
            {data.spots.length > 0 && (
              <SectionCard>
                <CardTitle>NEARBY FISHING SPOTS</CardTitle>
                <Text style={styles.spotsSubtitle}>Within 20 miles · Powered by OpenStreetMap</Text>
                {data.spots.map((spot: FishingSpot, i: number) => (
                  <View key={`${spot.name}-${i}`} style={[styles.spotRow, i < data.spots.length - 1 && styles.spotRowBorder]}>
                    <View style={styles.spotIcon}>
                      <Text style={styles.spotIconText}>
                        {spot.type === 'River' || spot.type === 'Stream' ? '🌊' :
                         spot.type === 'Fishing Access' ? '🎣' :
                         spot.type === 'Reservoir' ? '💧' : '🏞'}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.spotName}>{spot.name}</Text>
                      <Text style={styles.spotType}>{spot.type}</Text>
                    </View>
                    <View style={styles.spotDistanceBadge}>
                      <Text style={styles.spotDistanceText}>{spot.distanceMi} mi</Text>
                    </View>
                  </View>
                ))}
              </SectionCard>
            )}

            {/* ── Refresh ─────────────────────────────────────────────────── */}
            <TouchableOpacity style={styles.refreshBtn} onPress={requestLocation} activeOpacity={0.8}>
              <Text style={styles.refreshBtnText}>↻  REFRESH CONDITIONS</Text>
            </TouchableOpacity>
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    paddingTop: 52,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    marginBottom: 8,
  },
  backBtnText: {
    fontSize: 16,
    color: colors.accent,
    fontWeight: '600',
  },
  headerTitle: {
    ...typography.displayMd,
    color: colors.text,
  },
  headerSub: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  // Zip input
  zipContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 8,
  },
  zipRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  zipInput: {
    flex: 1,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    color: colors.text,
    fontSize: 14,
  },
  zipInputError: {
    borderColor: colors.error,
  },
  zipBtn: {
    backgroundColor: colors.accent,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  zipBtnText: {
    ...typography.button,
    color: colors.bg,
    fontSize: 12,
  },
  locationBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingVertical: 9,
    alignItems: 'center',
  },
  locationBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSub,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  zipErrorText: {
    ...typography.caption,
    color: colors.error,
  },
  // Idle
  idleTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  idleSubtitle: {
    ...typography.bodyMd,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },
  // States
  centerWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 16,
  },
  loadingText: {
    ...typography.bodyMd,
    color: colors.textMuted,
    marginTop: 12,
  },
  errorText: {
    ...typography.bodyMd,
    color: colors.error,
    textAlign: 'center',
    lineHeight: 22,
  },
  retryBtn: {
    backgroundColor: colors.accent,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 8,
  },
  retryBtnText: {
    ...typography.button,
    color: colors.bg,
  },
  scroll: { flex: 1 },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
    gap: 12,
  },
  // Location row
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
    paddingHorizontal: 2,
  },
  locationIcon: { fontSize: 13 },
  locationText: {
    ...typography.caption,
    color: colors.textSub,
    flex: 1,
  },
  localTime: {
    ...typography.caption,
    color: colors.textMuted,
  },
  // Card
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: {
    ...typography.label,
    color: colors.textMuted,
    marginBottom: 12,
  },
  // Conditions
  weatherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 14,
  },
  weatherEmoji: { fontSize: 40 },
  weatherDesc: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6,
  },
  seasonBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.accent + '20',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: colors.accent + '50',
  },
  seasonBadgeText: {
    ...typography.labelSm,
    color: colors.accent,
  },
  dataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 7,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  dataLabel: {
    ...typography.caption,
    color: colors.textSub,
  },
  dataValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  // Activity
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  activityLevel: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 1,
  },
  activityHeadline: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
    lineHeight: 22,
  },
  activityReason: {
    ...typography.bodyMd,
    color: colors.textSub,
    lineHeight: 20,
  },
  // Recommendations
  recRow: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 10,
    alignItems: 'flex-start',
  },
  recIcon: { fontSize: 20, marginTop: 2 },
  recSubLabel: {
    ...typography.labelSm,
    color: colors.textMuted,
    marginBottom: 3,
  },
  recPrimary: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    lineHeight: 20,
  },
  recAlt: {
    ...typography.caption,
    color: colors.textSub,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
  // Bite windows
  windowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  windowRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  windowLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 3,
  },
  windowTime: {
    ...typography.caption,
    color: colors.textSub,
  },
  qualityBadge: {
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
  },
  qualityText: {
    ...typography.labelSm,
    fontSize: 10,
  },
  // Active species
  speciesSubtitle: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: -8,
    marginBottom: 16,
  },
  speciesSection: {},
  speciesSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  speciesSectionIcon: { fontSize: 14 },
  speciesSectionLabel: {
    ...typography.labelSm,
    color: colors.textSub,
    letterSpacing: 1,
  },
  speciesOffshoreNote: {
    ...typography.caption,
    color: colors.textMuted,
    marginLeft: 4,
  },
  speciesRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 9,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  speciesDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 4,
    flexShrink: 0,
  },
  speciesNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  speciesName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  speciesActivityBadge: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  speciesReason: {
    ...typography.caption,
    color: colors.textMuted,
    lineHeight: 18,
  },
  // Tides
  tidesSubtitle: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: -8,
    marginBottom: 12,
  },
  tideRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  tideIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    flexShrink: 0,
  },
  tideArrow: {
    fontSize: 14,
    color: colors.text,
  },
  tideLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  tideTime: {
    ...typography.caption,
    color: colors.textMuted,
  },
  tideHeight: {
    fontSize: 15,
    fontWeight: '800',
  },
  // Spots
  spotsSubtitle: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: -8,
    marginBottom: 12,
  },
  spotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    gap: 12,
  },
  spotRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  spotIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    flexShrink: 0,
  },
  spotIconText: { fontSize: 16 },
  spotName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  spotType: {
    ...typography.caption,
    color: colors.textMuted,
  },
  spotDistanceBadge: {
    backgroundColor: colors.surfaceHigh,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  spotDistanceText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSub,
  },
  // Refresh
  refreshBtn: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  refreshBtnText: {
    ...typography.button,
    color: colors.bg,
  },
});
