import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import * as Location from 'expo-location';
import * as api from '../../services/api';
import type { FishingIntelResponse, FishingSpot } from '../../models';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';

// ── Weather emoji lookup by WMO code ─────────────────────────────────────────

function weatherEmoji(code: number): string {
  if (code === 0) return '☀️';
  if (code <= 2) return '🌤';
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

// ── Activity level color ──────────────────────────────────────────────────────

function activityColor(level: string): string {
  switch (level) {
    case 'EXCELLENT': return colors.accent;        // gold
    case 'HIGH':      return '#3DAF5A';             // green
    case 'MODERATE':  return '#E67E22';             // orange
    default:          return colors.textMuted;      // muted
  }
}

// ── Quality badge color ───────────────────────────────────────────────────────

function qualityColor(quality: string): string {
  return quality === 'EXCELLENT' ? colors.accent : '#3DAF5A';
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionCard({ children, style }: { children: React.ReactNode; style?: object }) {
  return (
    <View style={[styles.card, style]}>
      {children}
    </View>
  );
}

function DataRow({
  label,
  value,
  valueStyle,
}: {
  label: string;
  value: string;
  valueStyle?: object;
}) {
  return (
    <View style={styles.dataRow}>
      <Text style={styles.dataLabel}>{label}</Text>
      <Text style={[styles.dataValue, valueStyle]}>{value}</Text>
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function FishingIntelligenceScreen() {
  const [data, setData] = useState<FishingIntelResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchIntel = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Location permission denied. Please enable location access in Settings.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      const result = await api.getFishingIntel(loc.coords.latitude, loc.coords.longitude);
      setData(result);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIntel();
  }, [fetchIntel]);

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>FISH INTEL</Text>
        <Text style={styles.headerSub}>Weather-based fishing forecast</Text>
      </View>

      {/* Loading */}
      {loading && (
        <View style={styles.centerWrap}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.loadingText}>Analyzing conditions…</Text>
        </View>
      )}

      {/* Error */}
      {!loading && error && (
        <View style={styles.centerWrap}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchIntel} activeOpacity={0.8}>
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
        >
          {/* Location status */}
          <View style={styles.locationRow}>
            <Text style={styles.locationIcon}>📍</Text>
            <Text style={styles.locationText}>{data.locationLabel}</Text>
            <Text style={styles.localTime}>{data.conditions.localTime}</Text>
          </View>

          {/* ── Conditions card ──────────────────────────────────────────── */}
          <SectionCard>
            <Text style={styles.cardTitle}>CONDITIONS</Text>
            <View style={styles.weatherRow}>
              <Text style={styles.weatherEmoji}>
                {weatherEmoji(data.conditions.weatherCode)}
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
                  data.conditions.pressureTrend === 'falling'
                    ? colors.accent
                    : data.conditions.pressureTrend === 'rising'
                    ? '#E67E22'
                    : colors.text,
              }}
            />
          </SectionCard>

          {/* ── Activity card ────────────────────────────────────────────── */}
          <SectionCard style={{ borderLeftWidth: 4, borderLeftColor: activityColor(data.activity.level) }}>
            <View style={styles.activityHeader}>
              <Text style={[styles.activityLevel, { color: activityColor(data.activity.level) }]}>
                {data.activity.level}
              </Text>
              <Text style={styles.cardTitle}>ACTIVITY</Text>
            </View>
            <Text style={styles.activityHeadline}>{data.activity.headline}</Text>
            <Text style={styles.activityReason}>{data.activity.reason}</Text>
          </SectionCard>

          {/* ── Recommendations card ─────────────────────────────────────── */}
          <SectionCard>
            <Text style={styles.cardTitle}>RECOMMENDATIONS</Text>
            <View style={styles.recRow}>
              <Text style={styles.recIcon}>🎣</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.recSubLabel}>LURE</Text>
                <Text style={styles.recPrimary}>{data.recommendations.lure}</Text>
                <Text style={styles.recAlt}>Alt: {data.recommendations.altLure}</Text>
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.recRow}>
              <Text style={styles.recIcon}>📏</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.recSubLabel}>DEPTH</Text>
                <Text style={styles.recPrimary}>{data.recommendations.depth}</Text>
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.recRow}>
              <Text style={styles.recIcon}>🎯</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.recSubLabel}>TECHNIQUE</Text>
                <Text style={styles.recPrimary}>{data.recommendations.technique}</Text>
              </View>
            </View>
          </SectionCard>

          {/* ── Bite windows ─────────────────────────────────────────────── */}
          {data.windows.length > 0 && (
            <SectionCard>
              <Text style={styles.cardTitle}>BITE WINDOWS</Text>
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
              {data.windows.length === 0 && (
                <Text style={styles.noWindowsText}>No upcoming bite windows today.</Text>
              )}
            </SectionCard>
          )}

          {/* ── Nearby fishing spots ─────────────────────────────────────── */}
          {data.spots.length > 0 && (
            <SectionCard>
              <Text style={styles.cardTitle}>NEARBY FISHING SPOTS</Text>
              <Text style={styles.spotsSubtitle}>Within 20 miles · Powered by OpenStreetMap</Text>
              {data.spots.map((spot: FishingSpot, i: number) => (
                <View
                  key={`${spot.name}-${i}`}
                  style={[styles.spotRow, i < data.spots.length - 1 && styles.spotRowBorder]}
                >
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

          {/* ── Refresh button ───────────────────────────────────────────── */}
          <TouchableOpacity style={styles.refreshBtn} onPress={fetchIntel} activeOpacity={0.8}>
            <Text style={styles.refreshBtnText}>↻  REFRESH CONDITIONS</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
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
  headerTitle: {
    ...typography.displayMd,
    color: colors.text,
  },
  headerSub: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
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
  scroll: {
    flex: 1,
  },
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
  locationIcon: {
    fontSize: 13,
  },
  locationText: {
    ...typography.caption,
    color: colors.textSub,
    flex: 1,
  },
  localTime: {
    ...typography.caption,
    color: colors.textMuted,
  },
  // Card base
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
  weatherEmoji: {
    fontSize: 40,
  },
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
  recIcon: {
    fontSize: 20,
    marginTop: 2,
  },
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
  noWindowsText: {
    ...typography.bodyMd,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: 8,
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
  spotIconText: {
    fontSize: 16,
  },
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
