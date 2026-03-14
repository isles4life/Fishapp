'use client';
import { useEffect, useCallback, useState } from 'react';
import Nav from '../../components/Nav';
import { api, isLoggedIn } from '../../lib/api';
import type { FishingIntelResponse, FishingSpot } from '../../lib/api';
import Link from 'next/link';

const C = {
  bg:          '#0D1A0D',
  surface:     '#152515',
  surfaceHigh: '#1D331D',
  border:      '#2A4A2A',
  borderGold:  '#C9A450',
  accent:      '#C9A450',
  accentDark:  '#9E7A30',
  text:        '#F0EDE4',
  textSub:     '#8BA88B',
  textMuted:   '#4A6A4A',
  error:       '#C0392B',
  errorBg:     '#3A1414',
  green:       '#3DAF5A',
  orange:      '#E67E22',
};

function weatherEmoji(code?: number, sunriseIso?: string, sunsetIso?: string): string {
  if (!code && code !== 0) return '🌡';
  const now = Date.now();
  const isNight = sunriseIso && sunsetIso
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

function trendArrow(trend: string): string {
  if (trend === 'rising') return '↑';
  if (trend === 'falling') return '↓';
  return '→';
}

function activityColor(level: string): string {
  switch (level) {
    case 'EXCELLENT': return C.accent;
    case 'HIGH': return C.green;
    case 'MODERATE': return C.orange;
    default: return C.textMuted;
  }
}

function qualityColor(quality: string): string {
  return quality === 'EXCELLENT' ? C.accent : C.green;
}

function spotIcon(type: string): string {
  if (type === 'River' || type === 'Stream') return '🌊';
  if (type === 'Fishing Access') return '🎣';
  if (type === 'Reservoir') return '💧';
  return '🏞';
}

function Card({ children, accentLeft }: { children: React.ReactNode; accentLeft?: string }) {
  return (
    <div style={{
      backgroundColor: C.surface,
      borderRadius: 14,
      border: `1px solid ${C.border}`,
      borderLeft: accentLeft ? `4px solid ${accentLeft}` : `1px solid ${C.border}`,
      padding: '18px 20px',
    }}>
      {children}
    </div>
  );
}

function CardTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 800, color: C.textMuted, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 14 }}>
      {children}
    </div>
  );
}

function DataRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderTop: `1px solid ${C.border}` }}>
      <span style={{ fontSize: 13, color: C.textSub }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 700, color: valueColor ?? C.text }}>{value}</span>
    </div>
  );
}

function speciesActivityColor(activity: 'HIGH' | 'MODERATE' | 'LOW'): string {
  if (activity === 'HIGH') return C.green;
  if (activity === 'MODERATE') return C.orange;
  return C.textMuted;
}

function SpeciesRow({ species }: { species: { name: string; activity: 'HIGH' | 'MODERATE' | 'LOW'; reason: string } }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '9px 0', borderTop: `1px solid ${C.border}` }}>
      <div style={{ marginTop: 2, width: 8, height: 8, borderRadius: 4, flexShrink: 0, backgroundColor: speciesActivityColor(species.activity) }} />
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{species.name}</span>
          <span style={{ fontSize: 10, fontWeight: 800, color: speciesActivityColor(species.activity), letterSpacing: 0.5 }}>{species.activity}</span>
        </div>
        <div style={{ fontSize: 12, color: C.textMuted, lineHeight: 1.4 }}>{species.reason}</div>
      </div>
    </div>
  );
}

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

export default function FishingIntelligencePage() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [data, setData] = useState<FishingIntelResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locationStatus, setLocationStatus] = useState<'idle' | 'requesting' | 'denied' | 'ok'>('idle');
  const [zip, setZip] = useState('');
  const [zipError, setZipError] = useState('');

  const fetchIntel = useCallback((lat: number, lon: number) => {
    setLoading(true);
    setError(null);
    api.getFishingIntel(lat, lon)
      .then(result => { setData(result); setLocationStatus('ok'); })
      .catch(e => setError(e.message ?? 'Failed to load fishing intelligence'))
      .finally(() => setLoading(false));
  }, []);

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      return;
    }
    setLocationStatus('requesting');
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      pos => fetchIntel(pos.coords.latitude, pos.coords.longitude),
      () => {
        setLocationStatus('denied');
        setLoading(false);
        setError('Location access denied. Please enable location in your browser settings and try again.');
      },
      { timeout: 10000 },
    );
  }, [fetchIntel]);

  async function handleZipSubmit(e: React.FormEvent) {
    e.preventDefault();
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
  }

  useEffect(() => {
    const li = isLoggedIn();
    setLoggedIn(li);
    if (li) requestLocation();
  }, [requestLocation]);

  if (!loggedIn) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: C.bg }}>
        <Nav active="forecast" />
        <div style={{ maxWidth: 600, margin: '0 auto', padding: '80px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 20 }}>⚡</div>
          <h1 style={{ color: C.text, fontSize: 24, fontWeight: 900, margin: '0 0 12px', textTransform: 'uppercase' }}>Fishing Intelligence</h1>
          <p style={{ color: C.textSub, fontSize: 15, margin: '0 0 28px' }}>Sign in to access weather-based fishing forecasts and nearby spot recommendations.</p>
          <Link href="/login" style={{ backgroundColor: C.accent, color: C.bg, fontWeight: 700, padding: '12px 28px', borderRadius: 10, textDecoration: 'none', fontSize: 14, letterSpacing: 1, textTransform: 'uppercase' }}>
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: C.bg }}>
      <Nav active="forecast" />
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px 88px' }}>

        {/* Page header */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 'clamp(20px, 5vw, 28px)', fontWeight: 900, color: C.text, margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: -0.5 }}>
            ⚡ Fishing Intelligence
          </h1>
          <p style={{ color: C.textMuted, fontSize: 13, margin: 0, textTransform: 'uppercase', letterSpacing: 1 }}>
            Weather-based forecast · Nearby spots
          </p>
        </div>

        {/* Zip code input — always visible */}
        <form onSubmit={handleZipSubmit} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 20, flexWrap: 'wrap' }}>
          <input
            value={zip}
            onChange={e => { setZip(e.target.value); setZipError(''); }}
            placeholder="Enter zip code…"
            maxLength={10}
            style={{ flex: '1 1 160px', maxWidth: 200, backgroundColor: C.surface, border: `1px solid ${zipError ? C.error : C.border}`, borderRadius: 8, padding: '8px 12px', color: C.text, fontSize: 14, outline: 'none' }}
          />
          <button
            type="submit"
            disabled={loading}
            style={{ backgroundColor: C.accent, color: C.bg, border: 'none', borderRadius: 8, padding: '8px 18px', fontWeight: 700, fontSize: 13, cursor: 'pointer', letterSpacing: 0.5, textTransform: 'uppercase', whiteSpace: 'nowrap' }}
          >
            Get Forecast
          </button>
          <button
            type="button"
            onClick={requestLocation}
            disabled={loading}
            style={{ background: 'none', border: `1px solid ${C.border}`, color: C.textSub, borderRadius: 8, padding: '8px 14px', fontSize: 13, cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap' }}
          >
            📍 Use My Location
          </button>
          {zipError && <span style={{ color: C.error, fontSize: 12, width: '100%' }}>{zipError}</span>}
        </form>

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: C.textMuted }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🎣</div>
            <div style={{ fontSize: 15 }}>
              {locationStatus === 'requesting' ? 'Requesting location…' : 'Analyzing conditions…'}
            </div>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div style={{ backgroundColor: C.errorBg, border: `1px solid ${C.error}50`, borderRadius: 14, padding: '16px 20px', marginBottom: 16 }}>
            <div style={{ color: C.error, fontSize: 14 }}>{error}</div>
          </div>
        )}

        {/* Content */}
        {!loading && !error && data && (
          <>
            {/* Location + time bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16, fontSize: 13, color: C.textSub }}>
              <span>📍</span>
              <span style={{ flex: 1 }}>{data.locationLabel}</span>
              <span style={{ color: C.textMuted }}>{data.conditions.localTime}</span>
            </div>

            <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>

              {/* Conditions card */}
              <Card>
                <CardTitle>Conditions</CardTitle>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 14 }}>
                  <span style={{ fontSize: 44 }}>{weatherEmoji(data.conditions.weatherCode, data.sunriseIso, data.sunsetIso)}</span>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 600, color: C.text, marginBottom: 6 }}>{data.conditions.weatherDesc}</div>
                    <div style={{ display: 'inline-block', backgroundColor: C.accent + '20', border: `1px solid ${C.accent}50`, borderRadius: 6, padding: '2px 10px', fontSize: 11, fontWeight: 800, color: C.accent, letterSpacing: 0.5, textTransform: 'uppercase' }}>
                      {data.conditions.season}
                    </div>
                  </div>
                </div>
                <DataRow label="Temperature" value={`${data.conditions.temperatureF}°F`} />
                <DataRow label="Wind" value={`${data.conditions.windMph} mph`} />
                <DataRow
                  label="Pressure"
                  value={`${data.conditions.pressureHpa} hPa  ${trendArrow(data.conditions.pressureTrend)}`}
                  valueColor={data.conditions.pressureTrend === 'falling' ? C.accent : data.conditions.pressureTrend === 'rising' ? C.orange : C.text}
                />
              </Card>

              {/* Activity card */}
              <Card accentLeft={activityColor(data.activity.level)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span style={{ fontSize: 22, fontWeight: 900, color: activityColor(data.activity.level), letterSpacing: 1 }}>{data.activity.level}</span>
                  <CardTitle>Activity</CardTitle>
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 8, lineHeight: 1.4 }}>{data.activity.headline}</div>
                <div style={{ fontSize: 13, color: C.textSub, lineHeight: 1.6 }}>{data.activity.reason}</div>
              </Card>

              {/* Recommendations card */}
              <Card>
                <CardTitle>Recommendations</CardTitle>
                {[
                  { icon: '🎣', label: 'LURE', primary: data.recommendations.lure, alt: `Alt: ${data.recommendations.altLure}` },
                  { icon: '📏', label: 'DEPTH', primary: data.recommendations.depth },
                  { icon: '🎯', label: 'TECHNIQUE', primary: data.recommendations.technique },
                ].map((rec, i) => (
                  <div key={i}>
                    {i > 0 && <div style={{ height: 1, backgroundColor: C.border }} />}
                    <div style={{ display: 'flex', gap: 12, padding: '12px 0', alignItems: 'flex-start' }}>
                      <span style={{ fontSize: 20, marginTop: 2 }}>{rec.icon}</span>
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 800, color: C.textMuted, letterSpacing: 1, marginBottom: 3 }}>{rec.label}</div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: C.text, lineHeight: 1.4 }}>{rec.primary}</div>
                        {rec.alt && <div style={{ fontSize: 12, color: C.textSub, marginTop: 2 }}>{rec.alt}</div>}
                      </div>
                    </div>
                  </div>
                ))}
              </Card>

              {/* Bite windows card */}
              {data.windows.length > 0 && (
                <Card>
                  <CardTitle>Bite Windows</CardTitle>
                  {data.windows.map((w, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', padding: '12px 0', borderBottom: i < data.windows.length - 1 ? `1px solid ${C.border}` : 'none', gap: 12 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 3 }}>{w.label}</div>
                        <div style={{ fontSize: 12, color: C.textSub }}>{w.start} – {w.end}</div>
                      </div>
                      <div style={{ border: `1px solid ${qualityColor(w.quality)}`, borderRadius: 6, padding: '3px 10px' }}>
                        <span style={{ fontSize: 11, fontWeight: 800, color: qualityColor(w.quality), letterSpacing: 0.5 }}>{w.quality}</span>
                      </div>
                    </div>
                  ))}
                </Card>
              )}

              {/* Active Species card — full width */}
              {data.activeSpecies && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <Card>
                    <CardTitle>🐟 Active Species</CardTitle>
                    <div style={{ fontSize: 12, color: C.textMuted, marginTop: -10, marginBottom: 18 }}>
                      Based on water temp · season · pressure · {data.tides ? 'coastal proximity' : 'inland location'}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
                      {/* Freshwater */}
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                          <span style={{ fontSize: 16 }}>🏞</span>
                          <span style={{ fontSize: 12, fontWeight: 800, color: C.textSub, letterSpacing: 1, textTransform: 'uppercase' }}>Freshwater</span>
                        </div>
                        {data.activeSpecies.freshwater.map((s) => (
                          <SpeciesRow key={s.name} species={s} />
                        ))}
                      </div>
                      {/* Saltwater */}
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                          <span style={{ fontSize: 16 }}>🌊</span>
                          <span style={{ fontSize: 12, fontWeight: 800, color: C.textSub, letterSpacing: 1, textTransform: 'uppercase' }}>Saltwater</span>
                          {!data.tides && <span style={{ fontSize: 10, color: C.textMuted, fontWeight: 600 }}>(offshore / travel)</span>}
                        </div>
                        {data.activeSpecies.saltwater.map((s) => (
                          <SpeciesRow key={s.name} species={s} />
                        ))}
                      </div>
                    </div>
                  </Card>
                </div>
              )}

              {/* Tides card */}
              {data.tides && (
                <Card>
                  <CardTitle>🌊 Tides — {data.tides.stationName}</CardTitle>
                  <div style={{ fontSize: 12, color: C.textMuted, marginTop: -10, marginBottom: 14 }}>
                    NOAA station · {data.tides.distanceMi} mi away
                  </div>
                  {data.tides.predictions.map((t, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderTop: `1px solid ${C.border}` }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: 16, flexShrink: 0,
                        backgroundColor: t.type === 'H' ? '#0A2A4A' : '#1A1A3A',
                        border: `1px solid ${t.type === 'H' ? '#1A6090' : '#3A3A7A'}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 14,
                      }}>
                        {t.type === 'H' ? '▲' : '▼'}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>
                          {t.type === 'H' ? 'High Tide' : 'Low Tide'}
                        </div>
                        <div style={{ fontSize: 12, color: C.textMuted }}>{t.time}</div>
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: t.type === 'H' ? '#5BB8F5' : '#8BA88B' }}>
                        {t.heightFt} ft
                      </div>
                    </div>
                  ))}
                </Card>
              )}

              {/* Nearby spots card — full width */}
              {data.spots.length > 0 && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <Card>
                    <CardTitle>Nearby Fishing Spots</CardTitle>
                    <div style={{ fontSize: 12, color: C.textMuted, marginTop: -10, marginBottom: 16 }}>Within 20 miles · Powered by OpenStreetMap</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 1, backgroundColor: C.border, borderRadius: 8, overflow: 'hidden', border: `1px solid ${C.border}` }}>
                      {data.spots.map((spot: FishingSpot, i: number) => (
                        <div key={`${spot.name}-${i}`} style={{ backgroundColor: C.surface, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: C.surfaceHigh, border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
                            {spotIcon(spot.type)}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 14, fontWeight: 700, color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{spot.name}</div>
                            <div style={{ fontSize: 11, color: C.textMuted }}>{spot.type}</div>
                          </div>
                          <div style={{ backgroundColor: C.surfaceHigh, border: `1px solid ${C.border}`, borderRadius: 6, padding: '3px 8px', flexShrink: 0 }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: C.textSub }}>{spot.distanceMi} mi</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
