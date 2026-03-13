'use client';
import { useEffect, useState, useCallback } from 'react';
import Nav from '../../components/Nav';
import { api, isLoggedIn } from '../../lib/api';
import type { FishingIntelResponse } from '../../lib/api';

const C = {
  bg:          '#0D1A0D',
  surface:     '#152515',
  surfaceHigh: '#1D331D',
  border:      '#2A4A2A',
  borderGold:  '#C9A450',
  accent:      '#C9A450',
  accentDark:  '#9E7A30',
  verified:    '#3DAF5A',
  verifiedBg:  '#0F3A1E',
  error:       '#C0392B',
  errorBg:     '#3A1414',
  text:        '#F0EDE4',
  textSub:     '#8BA88B',
  textMuted:   '#4A6A4A',
  orange:      '#E67E22',
};

// ── Weather emoji lookup ──────────────────────────────────────────────────────

function weatherEmoji(code: number | undefined): string {
  if (code === undefined) return '🌡';
  if (code === 0) return '☀️';
  if (code <= 2) return '🌤';
  if (code === 3) return '☁️';
  if (code <= 48) return '🌫';
  if (code <= 67) return '🌧';
  if (code <= 77) return '❄️';
  if (code <= 82) return '🌦';
  return '⛈';
}

function trendArrow(trend: 'rising' | 'falling' | 'stable'): string {
  if (trend === 'rising') return '↑';
  if (trend === 'falling') return '↓';
  return '→';
}

function trendColor(trend: 'rising' | 'falling' | 'stable'): string {
  if (trend === 'falling') return C.accent;
  if (trend === 'rising') return C.orange;
  return C.text;
}

function activityBorderColor(level: string): string {
  switch (level) {
    case 'EXCELLENT': return C.accent;
    case 'HIGH':      return C.verified;
    case 'MODERATE':  return C.orange;
    default:          return C.textMuted;
  }
}

function qualityColor(quality: string): string {
  return quality === 'EXCELLENT' ? C.accent : C.verified;
}

// ── Card wrapper ──────────────────────────────────────────────────────────────

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      backgroundColor: C.surface,
      border: `1px solid ${C.border}`,
      borderRadius: 14,
      padding: '20px 22px',
      ...style,
    }}>
      {children}
    </div>
  );
}

function CardTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 800, color: C.textMuted, letterSpacing: 1.5,
      textTransform: 'uppercase', marginBottom: 16,
    }}>
      {children}
    </div>
  );
}

function DataRow({ label, value, valueStyle }: { label: string; value: string; valueStyle?: React.CSSProperties }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderTop: `1px solid ${C.border}` }}>
      <span style={{ fontSize: 13, color: C.textSub }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 700, color: C.text, ...valueStyle }}>{value}</span>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function FishingIntelligencePage() {
  const [data, setData] = useState<FishingIntelResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locationLabel, setLocationLabel] = useState<string>('Requesting location…');
  const [authRequired, setAuthRequired] = useState(false);

  const fetchIntel = useCallback(() => {
    if (!isLoggedIn()) {
      setAuthRequired(true);
      return;
    }

    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      setLocationLabel('Location unavailable');
      return;
    }

    setLoading(true);
    setError(null);
    setLocationLabel('Requesting location…');

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setLocationLabel('Using your location');
        try {
          const result = await api.getFishingIntel(pos.coords.latitude, pos.coords.longitude);
          setData(result);
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : 'Failed to fetch fishing intelligence';
          setError(msg);
        } finally {
          setLoading(false);
        }
      },
      (err) => {
        setError(`Location error: ${err.message}`);
        setLocationLabel('Location unavailable');
        setLoading(false);
      },
      { enableHighAccuracy: false, timeout: 10000 },
    );
  }, []);

  useEffect(() => {
    fetchIntel();
  }, [fetchIntel]);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: C.bg }}>
      <Nav active="forecast" />

      <div style={{ maxWidth: 760, margin: '0 auto', padding: '32px 20px' }}>
        {/* Page header */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ color: C.text, margin: 0, fontSize: 28, fontWeight: 900, letterSpacing: -0.5, textTransform: 'uppercase' }}>
            ⚡ Fish Intel
          </h1>
          <p style={{ color: C.textMuted, fontSize: 14, marginTop: 4, marginBottom: 0 }}>
            Weather-based fishing forecast for your location
          </p>
        </div>

        {/* Auth required */}
        {authRequired && (
          <Card>
            <p style={{ color: C.textSub, fontSize: 15, marginBottom: 16 }}>
              Sign in to access fishing intelligence.
            </p>
            <a href="/login" style={{ backgroundColor: C.accent, color: C.bg, fontWeight: 700, padding: '10px 22px', borderRadius: 8, textDecoration: 'none', fontSize: 14, letterSpacing: 1, textTransform: 'uppercase' as const }}>
              Sign In
            </a>
          </Card>
        )}

        {/* Loading */}
        {loading && (
          <Card>
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <div style={{ fontSize: 36, marginBottom: 16 }}>🎣</div>
              <p style={{ color: C.textSub, fontSize: 15 }}>Analyzing fishing conditions…</p>
            </div>
          </Card>
        )}

        {/* Error */}
        {!loading && error && (
          <Card style={{ borderColor: C.error }}>
            <p style={{ color: C.error, marginBottom: 16 }}>{error}</p>
            <button
              onClick={fetchIntel}
              style={{ backgroundColor: C.accent, color: C.bg, fontWeight: 700, padding: '10px 22px', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, letterSpacing: 1, textTransform: 'uppercase' as const }}
            >
              Retry
            </button>
          </Card>
        )}

        {/* Content */}
        {!loading && !error && data && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Location status */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingLeft: 2 }}>
              <span style={{ fontSize: 13 }}>📍</span>
              <span style={{ color: C.textSub, fontSize: 13 }}>{locationLabel}</span>
              <span style={{ marginLeft: 'auto', color: C.textMuted, fontSize: 13 }}>
                {data.conditions.localTime}
              </span>
            </div>

            {/* ── Conditions card ────────────────────────────────────────── */}
            <Card>
              <CardTitle>Conditions</CardTitle>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
                <span style={{ fontSize: 48, lineHeight: 1 }}>
                  {weatherEmoji(data.conditions.weatherCode)}
                </span>
                <div>
                  <div style={{ fontSize: 17, fontWeight: 700, color: C.text, marginBottom: 6 }}>
                    {data.conditions.weatherDesc}
                  </div>
                  <span style={{
                    fontSize: 11, fontWeight: 800, color: C.accent, letterSpacing: 1.2,
                    textTransform: 'uppercase' as const,
                    backgroundColor: C.accent + '18', padding: '3px 10px', borderRadius: 6,
                    border: `1px solid ${C.accent}50`,
                  }}>
                    {data.conditions.season}
                  </span>
                </div>
              </div>
              <DataRow label="Temperature" value={`${data.conditions.temperatureF}°F`} />
              <DataRow label="Wind" value={`${data.conditions.windMph} mph`} />
              <DataRow
                label="Pressure"
                value={`${data.conditions.pressureHpa} hPa  ${trendArrow(data.conditions.pressureTrend)}`}
                valueStyle={{ color: trendColor(data.conditions.pressureTrend) }}
              />
            </Card>

            {/* ── Activity banner ─────────────────────────────────────────── */}
            <Card style={{ borderLeft: `4px solid ${activityBorderColor(data.activity.level)}` }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <CardTitle>Activity</CardTitle>
                <span style={{
                  fontSize: 20, fontWeight: 900, color: activityBorderColor(data.activity.level),
                  letterSpacing: 1,
                }}>
                  {data.activity.level}
                </span>
              </div>
              <div style={{ fontSize: 17, fontWeight: 700, color: C.text, marginBottom: 6, lineHeight: 1.4 }}>
                {data.activity.headline}
              </div>
              <div style={{ fontSize: 13, color: C.textSub, lineHeight: 1.6 }}>
                {data.activity.reason}
              </div>
            </Card>

            {/* ── Recommendations grid ────────────────────────────────────── */}
            <Card>
              <CardTitle>Recommendations</CardTitle>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                {/* Lure */}
                <div style={{ backgroundColor: C.surfaceHigh, borderRadius: 10, padding: '14px 16px', border: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: C.textMuted, letterSpacing: 1.2, textTransform: 'uppercase' as const, marginBottom: 8 }}>
                    🎣 Lure
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 4 }}>
                    {data.recommendations.lure}
                  </div>
                  <div style={{ fontSize: 12, color: C.textSub }}>
                    Alt: {data.recommendations.altLure}
                  </div>
                </div>
                {/* Depth */}
                <div style={{ backgroundColor: C.surfaceHigh, borderRadius: 10, padding: '14px 16px', border: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: C.textMuted, letterSpacing: 1.2, textTransform: 'uppercase' as const, marginBottom: 8 }}>
                    📏 Depth
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: C.text, lineHeight: 1.5 }}>
                    {data.recommendations.depth}
                  </div>
                </div>
                {/* Technique */}
                <div style={{ backgroundColor: C.surfaceHigh, borderRadius: 10, padding: '14px 16px', border: `1px solid ${C.border}`, gridColumn: 'span 1' }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: C.textMuted, letterSpacing: 1.2, textTransform: 'uppercase' as const, marginBottom: 8 }}>
                    🎯 Technique
                  </div>
                  <div style={{ fontSize: 13, color: C.text, lineHeight: 1.6 }}>
                    {data.recommendations.technique}
                  </div>
                </div>
              </div>
            </Card>

            {/* ── Bite windows ────────────────────────────────────────────── */}
            {data.windows.length > 0 && (
              <Card>
                <CardTitle>Bite Windows</CardTitle>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  {data.windows.map((w, i) => (
                    <div
                      key={i}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 0',
                        borderTop: i === 0 ? 'none' : `1px solid ${C.border}`,
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 3 }}>
                          {w.label}
                        </div>
                        <div style={{ fontSize: 12, color: C.textSub }}>
                          {w.start} – {w.end}
                        </div>
                      </div>
                      <span style={{
                        fontSize: 11, fontWeight: 800, color: qualityColor(w.quality),
                        letterSpacing: 1, textTransform: 'uppercase' as const,
                        border: `1px solid ${qualityColor(w.quality)}`,
                        borderRadius: 6, padding: '3px 10px',
                      }}>
                        {w.quality}
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* ── Refresh button ───────────────────────────────────────────── */}
            <button
              onClick={fetchIntel}
              style={{
                backgroundColor: C.accent, color: C.bg, fontWeight: 700, fontSize: 14,
                border: 'none', borderRadius: 12, padding: '14px 28px', cursor: 'pointer',
                letterSpacing: 1, textTransform: 'uppercase' as const, width: '100%',
              }}
            >
              ↻  Refresh Conditions
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
