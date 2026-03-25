import React, { useCallback, useContext, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, SafeAreaView, Platform, Image, Modal,
} from 'react-native';
import MapView, { Marker, Callout, Region as MapRegion } from 'react-native-maps';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import * as api from '../../services/api';
import type { HotSpot } from '../../models';
import { TournamentContext } from '../../navigation';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';

const SPECIES_EMOJI: Record<string, string> = {
  bass: '🐟',
  trout: '🐠',
  catfish: '🐡',
  walleye: '🐟',
  pike: '🐟',
  salmon: '🐠',
  unknown: '🎣',
};

function speciesEmoji(species: string): string {
  const key = species.toLowerCase();
  for (const [k, v] of Object.entries(SPECIES_EMOJI)) {
    if (key.includes(k)) return v;
  }
  return '🎣';
}

function cmToIn(cm: number): string {
  return (cm / 2.54).toFixed(1);
}

function initialRegion(spots: HotSpot[]): MapRegion {
  if (spots.length === 0) {
    return { latitude: 39.5, longitude: -98.35, latitudeDelta: 30, longitudeDelta: 40 };
  }
  const lats = spots.map(s => s.lat);
  const lngs = spots.map(s => s.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const centerLat = (minLat + maxLat) / 2;
  const centerLng = (minLng + maxLng) / 2;
  const latDelta = Math.max((maxLat - minLat) * 1.4, 0.1);
  const lngDelta = Math.max((maxLng - minLng) * 1.4, 0.1);
  return { latitude: centerLat, longitude: centerLng, latitudeDelta: latDelta, longitudeDelta: lngDelta };
}

export default function HotSpotsScreen() {
  const navigation = useNavigation();
  const { tournamentId } = useContext(TournamentContext);
  const [spots, setSpots] = useState<HotSpot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lightboxSpot, setLightboxSpot] = useState<HotSpot | null>(null);
  const mapRef = useRef<MapView>(null);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      setError(null);
      api.getHotSpots(tournamentId ?? undefined)
        .then(data => {
          setSpots(data);
          setLoading(false);
        })
        .catch(e => {
          setError(e.message ?? 'Failed to load hot spots');
          setLoading(false);
        });
    }, [tournamentId])
  );

  function fitToSpots() {
    if (mapRef.current && spots.length > 0) {
      mapRef.current.fitToCoordinates(
        spots.map(s => ({ latitude: s.lat, longitude: s.lng })),
        { edgePadding: { top: 60, right: 60, bottom: 60, left: 60 }, animated: true }
      );
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>🗺️ CATCH HOT SPOTS</Text>
          <Text style={styles.subtitle}>
            {tournamentId ? 'This tournament' : 'All-time catches'}
            {' · '}{spots.length} verified {spots.length === 1 ? 'catch' : 'catches'}
          </Text>
        </View>
        {spots.length > 0 && (
          <TouchableOpacity onPress={fitToSpots} style={styles.fitBtn}>
            <Text style={styles.fitBtnText}>Fit</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.centerWrap}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.loadingText}>Loading catches…</Text>
        </View>
      ) : error ? (
        <View style={styles.centerWrap}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : spots.length === 0 ? (
        <View style={styles.centerWrap}>
          <Text style={styles.emptyIcon}>🎣</Text>
          <Text style={styles.emptyTitle}>No catches yet</Text>
          <Text style={styles.emptySub}>Approved catches will appear here as pins on the map.</Text>
        </View>
      ) : (
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={initialRegion(spots)}
          mapType="standard"
          showsUserLocation
          showsCompass
        >
          {spots.map((spot, i) => (
            <Marker
              key={i}
              coordinate={{ latitude: spot.lat, longitude: spot.lng }}
              pinColor={colors.accent}
            >
              <Callout tooltip={false} onPress={() => spot.photoUrl && setLightboxSpot(spot)}>
                <View style={styles.callout}>
                  {spot.photoUrl ? (
                    <>
                      <Image source={{ uri: spot.photoUrl }} style={styles.calloutPhoto} resizeMode="cover" />
                      <Text style={styles.calloutHint}>Tap to expand</Text>
                    </>
                  ) : (
                    <Text style={styles.calloutEmoji}>{speciesEmoji(spot.species)}</Text>
                  )}
                  <Text style={styles.calloutSpecies}>{spot.species}</Text>
                  <Text style={styles.calloutLength}>{cmToIn(spot.lengthCm)}"</Text>
                </View>
              </Callout>
            </Marker>
          ))}
        </MapView>
      )}

      {/* Legend */}
      {spots.length > 0 && (
        <View style={styles.legend}>
          <View style={styles.legendPin} />
          <Text style={styles.legendText}>Tap a pin to see catch photo &amp; details</Text>
        </View>
      )}

      {/* Photo lightbox */}
      <Modal
        visible={!!lightboxSpot}
        transparent
        animationType="fade"
        onRequestClose={() => setLightboxSpot(null)}
      >
        <TouchableOpacity
          style={styles.lightboxOverlay}
          activeOpacity={1}
          onPress={() => setLightboxSpot(null)}
        >
          {lightboxSpot?.photoUrl && (
            <Image
              source={{ uri: lightboxSpot.photoUrl }}
              style={styles.lightboxImage}
              resizeMode="contain"
            />
          )}
          {lightboxSpot && (
            <View style={styles.lightboxCaption}>
              <Text style={styles.lightboxSpecies}>{lightboxSpot.species}</Text>
              <Text style={styles.lightboxLength}>{cmToIn(lightboxSpot.lengthCm)}"</Text>
            </View>
          )}
          <TouchableOpacity style={styles.lightboxClose} onPress={() => setLightboxSpot(null)}>
            <Text style={styles.lightboxCloseText}>✕</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 12,
  },
  backBtn: {
    paddingRight: 4,
  },
  backArrow: {
    fontSize: 28,
    color: colors.textSub,
    lineHeight: 30,
  },
  title: {
    ...typography.label,
    color: colors.text,
    fontSize: 13,
  },
  subtitle: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  fitBtn: {
    backgroundColor: colors.accent,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  fitBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.bg,
  },
  map: {
    flex: 1,
  },
  centerWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  loadingText: {
    ...typography.caption,
    color: colors.textMuted,
  },
  errorText: {
    ...typography.bodyMd,
    color: colors.error,
    textAlign: 'center',
  },
  emptyIcon: {
    fontSize: 48,
  },
  emptyTitle: {
    ...typography.displaySm,
    color: colors.text,
    textAlign: 'center',
  },
  emptySub: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
  },
  callout: {
    alignItems: 'center',
    padding: 8,
    width: 120,
  },
  calloutPhoto: {
    width: 100,
    height: 100,
    borderRadius: 8,
    marginBottom: 4,
  },
  calloutHint: {
    fontSize: 10,
    color: colors.accent,
    marginBottom: 4,
  },
  calloutEmoji: {
    fontSize: 20,
    marginBottom: 2,
  },
  calloutSpecies: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.charcoal,
    marginBottom: 2,
    textAlign: 'center',
  },
  calloutLength: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textDarkSub,
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 8,
  },
  legendPin: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.accent,
  },
  legendText: {
    ...typography.caption,
    color: colors.textMuted,
  },
  lightboxOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lightboxImage: {
    width: '92%',
    height: '75%',
  },
  lightboxCaption: {
    marginTop: 16,
    alignItems: 'center',
    gap: 4,
  },
  lightboxSpecies: {
    ...typography.displaySm,
    color: colors.text,
  },
  lightboxLength: {
    ...typography.numMd,
    color: colors.accent,
  },
  lightboxClose: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lightboxCloseText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
});
