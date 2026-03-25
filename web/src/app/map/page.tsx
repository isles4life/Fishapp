'use client';
import { useEffect, useRef, useState } from 'react';
import Nav from '../../components/Nav';
import { api, isLoggedIn } from '../../lib/api';
import type { HotSpot } from '../../lib/api';
import Link from 'next/link';

const C = {
  bg:          '#3A4C44',
  surface:     '#2E3D38',
  surfaceHigh: '#445C54',
  border:      '#4A6058',
  accent:      '#CFC29C',
  text:        '#F0EDE4',
  textSub:     '#9DB5A8',
  textMuted:   '#6B7D73',
};

function cmToIn(cm: number): string {
  return (cm / 2.54).toFixed(1);
}

function speciesEmoji(species: string): string {
  const s = species.toLowerCase();
  if (s.includes('bass')) return '🐟';
  if (s.includes('trout')) return '🐠';
  if (s.includes('salmon')) return '🐠';
  if (s.includes('catfish')) return '🐡';
  return '🎣';
}

export default function MapPage() {
  const mapRef = useRef<HTMLDivElement>(null);
  const [spots, setSpots] = useState<HotSpot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loggedIn] = useState(() => isLoggedIn());
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [lightboxSpot, setLightboxSpot] = useState<HotSpot | null>(null);
  const leafletLoaded = useRef(false);

  // Expose lightbox opener to Leaflet popup onclick handlers
  useEffect(() => {
    (window as any).__openLightbox = (index: number) => {
      const spot = spots[index];
      if (spot?.photoUrl) {
        setLightboxUrl(spot.photoUrl);
        setLightboxSpot(spot);
      }
    };
    return () => { delete (window as any).__openLightbox; };
  }, [spots]);

  // Close lightbox on ESC
  useEffect(() => {
    if (!lightboxUrl) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setLightboxUrl(null); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [lightboxUrl]);

  useEffect(() => {
    if (!loggedIn) { setLoading(false); return; }
    api.getHotSpots()
      .then(data => { setSpots(data); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [loggedIn]);

  useEffect(() => {
    if (!loggedIn || loading || leafletLoaded.current || !mapRef.current) return;
    leafletLoaded.current = true;

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = () => {
      const L = (window as any).L;
      if (!mapRef.current) return;

      const center = spots.length > 0
        ? [
            spots.reduce((s, p) => s + p.lat, 0) / spots.length,
            spots.reduce((s, p) => s + p.lng, 0) / spots.length,
          ]
        : [39.5, -98.35];

      const zoom = spots.length === 0 ? 4 : spots.length === 1 ? 10 : 7;
      const map = L.map(mapRef.current).setView(center, zoom);

      L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
        {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
          subdomains: 'abcd',
          maxZoom: 19,
        }
      ).addTo(map);

      spots.forEach((spot, index) => {
        const circle = L.circleMarker([spot.lat, spot.lng], {
          radius: 9,
          fillColor: C.accent,
          color: '#fff',
          weight: 2,
          opacity: 1,
          fillOpacity: 0.92,
        }).addTo(map);

        const photoHtml = spot.photoUrl
          ? `<img
               src="${spot.photoUrl}"
               onclick="window.__openLightbox(${index})"
               style="width:110px;height:110px;object-fit:cover;border-radius:8px;margin-bottom:6px;cursor:pointer;display:block"
               title="Click to expand"
             />
             <div style="font-size:10px;color:${C.accent};margin-bottom:4px;cursor:pointer" onclick="window.__openLightbox(${index})">Click to expand</div>`
          : `<div style="font-size:24px;margin-bottom:4px">${speciesEmoji(spot.species)}</div>`;

        circle.bindPopup(
          `<div style="font-family:sans-serif;text-align:center;min-width:120px;padding:4px">
            ${photoHtml}
            <div style="font-weight:700;font-size:13px;margin:2px 0">${spot.species}</div>
            <div style="font-size:13px;color:#555">${cmToIn(spot.lengthCm)}"</div>
          </div>`
        );
      });

      if (spots.length > 1) {
        const bounds = L.latLngBounds(spots.map(s => [s.lat, s.lng]));
        map.fitBounds(bounds, { padding: [40, 40] });
      }
    };
    document.head.appendChild(script);
  }, [loading, spots, loggedIn]);

  if (!loggedIn) {
    return (
      <>
        <Nav active="map" />
        <div style={{ minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg }}>
          <div style={{ textAlign: 'center', padding: 32 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🗺️</div>
            <p style={{ color: C.text, fontWeight: 700, fontSize: 18, marginBottom: 8 }}>Sign in to view the catch map</p>
            <p style={{ color: C.textMuted, fontSize: 14, marginBottom: 24 }}>See where verified catches are being made across the region.</p>
            <Link href="/login" style={{ backgroundColor: C.accent, color: C.bg, padding: '10px 24px', borderRadius: 8, fontWeight: 700, textDecoration: 'none' }}>Sign In</Link>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Nav active="map" />
      <div style={{ backgroundColor: C.bg, minHeight: '100vh' }}>
        {/* Header */}
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 20px 16px' }}>
          <h1 style={{ color: C.text, fontSize: 20, fontWeight: 800, margin: 0, letterSpacing: 1 }}>
            🗺️ CATCH HOT SPOTS
          </h1>
          <p style={{ color: C.textMuted, fontSize: 13, margin: '4px 0 0' }}>
            {loading ? 'Loading…' : `${spots.length} verified ${spots.length === 1 ? 'catch' : 'catches'} · tap a pin for details`}
          </p>
        </div>

        {/* Map + Sidebar layout */}
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 20px 40px', display: 'flex', gap: 20, alignItems: 'flex-start' }}>
          {/* Map */}
          <div style={{ flex: 1, borderRadius: 12, overflow: 'hidden', border: `1px solid ${C.border}`, minHeight: 520, position: 'relative' }}>
            {loading && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: C.surface, zIndex: 10 }}>
                <p style={{ color: C.textMuted }}>Loading map…</p>
              </div>
            )}
            {error && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: C.surface, zIndex: 10 }}>
                <p style={{ color: '#E05050' }}>{error}</p>
              </div>
            )}
            {!loading && spots.length === 0 && !error && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: C.surface, zIndex: 10, gap: 8 }}>
                <span style={{ fontSize: 40 }}>🎣</span>
                <p style={{ color: C.text, fontWeight: 700, margin: 0 }}>No catches yet</p>
                <p style={{ color: C.textMuted, fontSize: 13, margin: 0 }}>Approved catches will appear as pins on the map.</p>
              </div>
            )}
            <div ref={mapRef} style={{ width: '100%', height: 520 }} />
          </div>

          {/* Sidebar: catch list */}
          {spots.length > 0 && (
            <div style={{ width: 240, flexShrink: 0 }}>
              <div style={{ backgroundColor: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
                <div style={{ padding: '12px 16px', borderBottom: `1px solid ${C.border}` }}>
                  <p style={{ color: C.textMuted, fontSize: 11, fontWeight: 700, letterSpacing: 1, margin: 0 }}>ALL CATCHES</p>
                </div>
                <div style={{ maxHeight: 460, overflowY: 'auto' }}>
                  {spots.map((spot, i) => (
                    <div
                      key={i}
                      onClick={() => spot.photoUrl && (setLightboxUrl(spot.photoUrl), setLightboxSpot(spot))}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderBottom: `1px solid ${C.border}`, cursor: spot.photoUrl ? 'pointer' : 'default' }}
                    >
                      {spot.photoUrl
                        ? <img src={spot.photoUrl} style={{ width: 36, height: 36, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }} />
                        : <span style={{ fontSize: 18 }}>{speciesEmoji(spot.species)}</span>
                      }
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ color: C.text, fontSize: 13, fontWeight: 600, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{spot.species}</p>
                        <p style={{ color: C.textMuted, fontSize: 11, margin: 0 }}>{cmToIn(spot.lengthCm)}"</p>
                      </div>
                      <div style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.accent, flexShrink: 0 }} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Photo lightbox */}
      {lightboxUrl && (
        <div
          onClick={() => setLightboxUrl(null)}
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.92)', zIndex: 1000, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}
        >
          <img
            src={lightboxUrl}
            onClick={e => e.stopPropagation()}
            style={{ maxWidth: '92vw', maxHeight: '75vh', objectFit: 'contain', borderRadius: 8 }}
          />
          {lightboxSpot && (
            <div style={{ marginTop: 16, textAlign: 'center' }}>
              <p style={{ color: C.text, fontWeight: 800, fontSize: 18, margin: 0, letterSpacing: 1, textTransform: 'uppercase' }}>{lightboxSpot.species}</p>
              <p style={{ color: C.accent, fontWeight: 700, fontSize: 22, margin: '4px 0 0' }}>{cmToIn(lightboxSpot.lengthCm)}"</p>
            </div>
          )}
          <button
            onClick={() => setLightboxUrl(null)}
            style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: 36, height: 36, color: '#fff', fontSize: 16, fontWeight: 700, cursor: 'pointer' }}
          >✕</button>
        </div>
      )}
    </>
  );
}
