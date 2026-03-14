import { Injectable, BadGatewayException } from '@nestjs/common';

// ── Open-Meteo API response types ────────────────────────────────────────────

interface OpenMeteoResponse {
  current: {
    temperature_2m: number;        // °C
    wind_speed_10m: number;        // km/h
    surface_pressure: number;      // hPa
    precipitation: number;         // mm
    weathercode: number;
    time: string;                  // ISO local time
  };
  hourly: {
    time: string[];
    surface_pressure: number[];
  };
  daily: {
    sunrise: string[];             // ISO datetime
    sunset: string[];              // ISO datetime
  };
  timezone: string;
}

// ── Rule-engine output types ──────────────────────────────────────────────────

export interface FishingConditions {
  temperatureF: number;
  windMph: number;
  pressureHpa: number;
  pressureTrend: 'rising' | 'falling' | 'stable';
  weatherCode: number;
  weatherDesc: string;
  season: string;
  localTime: string;
}

export interface ActivityLevel {
  level: 'LOW' | 'MODERATE' | 'HIGH' | 'EXCELLENT';
  headline: string;
  reason: string;
}

export interface Recommendations {
  lure: string;
  altLure: string;
  depth: string;
  technique: string;
}

export interface BiteWindow {
  label: string;
  start: string;
  end: string;
  quality: 'GOOD' | 'EXCELLENT';
}

export interface FishingSpot {
  name: string;
  type: string;
  distanceMi: number;
  lat: number;
  lon: number;
}

export interface TidePrediction {
  time: string;   // e.g. "6:23 AM"
  heightFt: number;
  type: 'H' | 'L';
}

export interface TideInfo {
  stationName: string;
  distanceMi: number;
  predictions: TidePrediction[];
}

export interface FishingIntelResponse {
  conditions: FishingConditions;
  activity: ActivityLevel;
  recommendations: Recommendations;
  windows: BiteWindow[];
  locationLabel: string;
  spots: FishingSpot[];
  sunriseIso: string;
  sunsetIso: string;
  tides: TideInfo | null;
  activeSpecies: ActiveSpeciesReport;
}

export interface SpeciesActivity {
  name: string;
  activity: 'HIGH' | 'MODERATE' | 'LOW';
  reason: string;
}

export interface ActiveSpeciesReport {
  freshwater: SpeciesActivity[];
  saltwater: SpeciesActivity[];
}

// ── WMO weather code descriptions ────────────────────────────────────────────

const WEATHER_DESCRIPTIONS: Record<number, string> = {
  0:  'Clear sky',
  1:  'Mainly clear',
  2:  'Partly cloudy',
  3:  'Overcast',
  45: 'Foggy',
  48: 'Depositing rime fog',
  51: 'Light drizzle',
  53: 'Moderate drizzle',
  55: 'Dense drizzle',
  61: 'Slight rain',
  63: 'Moderate rain',
  65: 'Heavy rain',
  71: 'Slight snow',
  73: 'Moderate snow',
  75: 'Heavy snow',
  80: 'Slight showers',
  81: 'Moderate showers',
  82: 'Violent showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm with slight hail',
  99: 'Thunderstorm with heavy hail',
};

// ── Utility helpers ───────────────────────────────────────────────────────────

function celsiusToFahrenheit(c: number): number {
  return Math.round((c * 9) / 5 + 32);
}

function kmhToMph(kmh: number): number {
  return Math.round(kmh * 0.621371);
}

/**
 * Get Northern-Hemisphere season from a calendar month (0-indexed).
 */
function getSeason(month: number): string {
  if (month <= 1 || month === 11) return 'winter'; // Dec, Jan, Feb
  if (month <= 4) return 'spring';                  // Mar, Apr, May
  if (month <= 7) return 'summer';                  // Jun, Jul, Aug
  return 'fall';                                     // Sep, Oct, Nov
}

/**
 * Determine pressure trend by comparing current pressure to the hourly value
 * ~3 hours ago.  Open-Meteo returns hourly data; we walk backwards in the
 * hourly array to find the entry closest to 3 hours before the current time.
 */
function calcPressureTrend(
  currentPressure: number,
  hourlyTimes: string[],
  hourlyPressures: number[],
  currentTime: string,
): 'rising' | 'falling' | 'stable' {
  const nowMs = new Date(currentTime).getTime();
  const targetMs = nowMs - 3 * 60 * 60 * 1000; // 3 hours ago

  // Find the hourly index closest to targetMs
  let bestIdx = 0;
  let bestDiff = Infinity;
  for (let i = 0; i < hourlyTimes.length; i++) {
    const diff = Math.abs(new Date(hourlyTimes[i]).getTime() - targetMs);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestIdx = i;
    }
  }

  const delta = currentPressure - hourlyPressures[bestIdx];
  if (delta >= 0.5) return 'rising';
  if (delta <= -0.5) return 'falling';
  return 'stable';
}

/**
 * Format a Date to a human-readable 12-hour clock string like "6:30 AM".
 */
function formatTime(date: Date): string {
  const h = date.getHours();
  const m = date.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  const mm = String(m).padStart(2, '0');
  return `${h12}:${mm} ${ampm}`;
}

/**
 * Add minutes to a Date and return the result.
 */
function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

// ── Activity-level scoring ────────────────────────────────────────────────────

type LevelIndex = 0 | 1 | 2 | 3; // LOW=0, MODERATE=1, HIGH=2, EXCELLENT=3
const LEVELS: Array<'LOW' | 'MODERATE' | 'HIGH' | 'EXCELLENT'> = [
  'LOW',
  'MODERATE',
  'HIGH',
  'EXCELLENT',
];

function clampLevel(n: number): LevelIndex {
  return Math.max(0, Math.min(3, n)) as LevelIndex;
}

function calcActivityLevel(
  trend: 'rising' | 'falling' | 'stable',
  pressureHpa: number,
  tempF: number,
  windMph: number,
  season: string,
): { index: LevelIndex; primaryReason: string } {
  let score = 1; // Start at MODERATE
  let primaryReason = '';

  // Pressure-based rules (highest priority — affects 2 levels)
  if (trend === 'falling') {
    // Falling pressure = feeding frenzy before incoming storm
    score = 3; // Jump to EXCELLENT as base
    primaryReason = 'Falling pressure';
  } else if (trend === 'rising') {
    // Rising pressure after storm = fish go deep, tough bite
    score = 0; // Start at LOW
    primaryReason = 'Rising pressure';
  } else if (pressureHpa > 1020) {
    // Stable high pressure = decent but fish can be picky
    score = 1; // MODERATE
    primaryReason = 'Stable high pressure';
  } else {
    primaryReason = 'Stable pressure';
  }

  // Temperature modifier
  if (tempF >= 65 && tempF <= 75) {
    score += 1; // Prime feeding temp range
  } else if (tempF < 45 || tempF > 85) {
    score -= 1; // Extreme temps reduce activity
  }

  // Wind modifier — very high wind makes presentation difficult
  if (windMph > 25) {
    score -= 1;
  }

  // Season modifier — spring and fall are prime
  if (season === 'spring' || season === 'fall') {
    score += 1;
  }

  return { index: clampLevel(score), primaryReason };
}

// ── Bite-window builder ───────────────────────────────────────────────────────

function buildBiteWindows(
  sunrise: Date,
  sunset: Date,
  now: Date,
): BiteWindow[] {
  const windows: Array<{ label: string; start: Date; end: Date; quality: 'GOOD' | 'EXCELLENT' }> = [
    // Dawn window: sunrise to sunrise+90min
    {
      label: 'Dawn window',
      start: sunrise,
      end: addMinutes(sunrise, 90),
      quality: 'EXCELLENT',
    },
    // Morning window: sunrise+90min to sunrise+210min
    {
      label: 'Morning window',
      start: addMinutes(sunrise, 90),
      end: addMinutes(sunrise, 210),
      quality: 'GOOD',
    },
    // Afternoon window: sunset-210min to sunset-120min
    {
      label: 'Afternoon window',
      start: addMinutes(sunset, -210),
      end: addMinutes(sunset, -120),
      quality: 'GOOD',
    },
    // Evening window: sunset-120min to sunset+30min
    {
      label: 'Peak evening bite',
      start: addMinutes(sunset, -120),
      end: addMinutes(sunset, 30),
      quality: 'EXCELLENT',
    },
  ];

  // Only return windows that haven't fully passed yet
  return windows
    .filter(w => w.end > now)
    .map(w => ({
      label: w.label,
      start: formatTime(w.start),
      end: formatTime(w.end),
      quality: w.quality,
    }));
}

// ── Lure + depth recommendation engine ───────────────────────────────────────

interface LureRec {
  lure: string;
  altLure: string;
  technique: string;
}

function getLureRecommendation(
  trend: 'rising' | 'falling' | 'stable',
  tempF: number,
  windMph: number,
  weatherCode: number,
): LureRec {
  // High wind overrides everything — wind-resistant presentations
  if (windMph > 15) {
    return {
      lure: 'Spinnerbait',
      altLure: 'Chatterbait',
      technique: 'Steady retrieve parallel to wind-blown banks',
    };
  }

  // Overcast sky — reaction baits shine
  if (weatherCode === 3) {
    return {
      lure: 'Spinnerbait',
      altLure: 'Swimjig',
      technique: 'Work through shallow cover and weed edges',
    };
  }

  // Falling pressure — pre-storm feeding frenzy
  if (trend === 'falling') {
    if (tempF > 65) {
      return {
        lure: 'Topwater popper',
        altLure: 'Crankbait',
        technique: 'Aggressive topwater action at dawn/dusk; run crankbait fast along points',
      };
    } else {
      // Cooler falling-pressure — slower finesse still best
      return {
        lure: 'Ned rig',
        altLure: 'Shaky head worm',
        technique: 'Slow drag along bottom structure; pause on every rock',
      };
    }
  }

  // Rising pressure — fish have retreated deep
  if (trend === 'rising') {
    if (tempF < 45) {
      return {
        lure: 'Blade bait',
        altLure: 'Jigging spoon',
        technique: 'Vertical jigging over deep structure; short hops off bottom',
      };
    } else {
      return {
        lure: 'Deep crankbait',
        altLure: 'Football jig',
        technique: 'Slow roll along deep ledges; drag football jig on hard bottom',
      };
    }
  }

  // Stable pressure
  if (tempF > 65) {
    return {
      lure: 'Drop shot',
      altLure: 'Finesse worm',
      technique: 'Hover drop shot rig over structure; deadstick between twitches',
    };
  } else {
    return {
      lure: 'Jig',
      altLure: 'Swimbait',
      technique: 'Hop jig along bottom; slow-roll swimbait past submerged timber',
    };
  }
}

function getDepthRecommendation(
  tempF: number,
  trend: 'rising' | 'falling' | 'stable',
  isDawnOrDusk: boolean,
): string {
  let base: string;

  if (tempF < 50) {
    base = '18–30 ft';
  } else if (tempF < 65) {
    base = '8–16 ft';
  } else if (tempF <= 75) {
    base = isDawnOrDusk ? '2–6 ft' : '4–12 ft';
  } else {
    // Hot water
    base = isDawnOrDusk ? '2–6 ft' : '10–20 ft';
  }

  // Pressure-based depth modifier (add a qualitative note)
  if (trend === 'rising') {
    return `${base} (go deeper — rising pressure pushes fish down)`;
  }
  if (trend === 'falling') {
    return `${base} (stay shallower — fish moving up pre-storm)`;
  }
  return base;
}

// ── Active species by conditions ─────────────────────────────────────────────

function getActiveSpecies(
  tempF: number,
  season: string,
  pressureTrend: 'rising' | 'falling' | 'stable',
  isCoastal: boolean,
  windMph: number,
): ActiveSpeciesReport {
  const act = (
    name: string,
    activity: 'HIGH' | 'MODERATE' | 'LOW',
    reason: string,
  ): SpeciesActivity => ({ name, activity, reason });

  // ── Freshwater ──────────────────────────────────────────────────────────────
  const fw: SpeciesActivity[] = [];

  if (season === 'spring') {
    if (tempF >= 55 && tempF <= 72) {
      fw.push(act('Largemouth Bass', 'HIGH', 'Active pre-spawn feeding'));
      fw.push(act('Crappie', 'HIGH', 'Spawning in shallow brush'));
    } else {
      fw.push(act('Largemouth Bass', pressureTrend === 'rising' ? 'LOW' : 'MODERATE', pressureTrend === 'rising' ? 'Rising pressure pushes fish deep' : 'Transitional feeding'));
      fw.push(act('Crappie', 'MODERATE', 'Moving toward structure'));
    }
    if (tempF >= 48 && tempF <= 65) fw.push(act('Walleye', 'HIGH', 'Post-spawn feeding binge'));
    if (pressureTrend !== 'rising') fw.push(act('White Bass', 'HIGH', 'Spring run active'));
    fw.push(act('Bluegill', 'MODERATE', 'Warming shallow water'));
  } else if (season === 'summer') {
    if (tempF >= 80) {
      fw.push(act('Catfish', 'HIGH', 'Night feeders most active in heat'));
      fw.push(act('Carp', 'HIGH', 'Surface feeding in warm shallows'));
      fw.push(act('Largemouth Bass', pressureTrend === 'falling' ? 'HIGH' : 'LOW', pressureTrend === 'falling' ? 'Pre-storm feeding surge' : 'Lethargic — deep structure only'));
      fw.push(act('Bluegill', 'MODERATE', 'Active near beds'));
    } else {
      fw.push(act('Largemouth Bass', pressureTrend === 'falling' ? 'HIGH' : 'MODERATE', pressureTrend === 'falling' ? 'Pre-storm feeding surge' : 'Dawn/dusk bite'));
      fw.push(act('Smallmouth Bass', 'HIGH', 'Active in cool, moving water'));
      fw.push(act('Bluegill', 'HIGH', 'Peak spawn activity'));
      fw.push(act('Catfish', 'MODERATE', 'Feeding on bottom structure'));
    }
  } else if (season === 'fall') {
    fw.push(act('Largemouth Bass', pressureTrend === 'falling' ? 'HIGH' : 'MODERATE', pressureTrend === 'falling' ? 'Pre-front feeding frenzy' : 'Chasing baitfish to structure'));
    fw.push(act('Smallmouth Bass', 'HIGH', 'Aggressive fall feed-up'));
    if (tempF < 58) {
      fw.push(act('Walleye', 'HIGH', 'Fall transition — top of the food chain'));
      fw.push(act('Muskie', 'HIGH', 'Trophy season peak activity'));
    } else {
      fw.push(act('Crappie', 'MODERATE', 'Suspending near main lake structure'));
      fw.push(act('Striped Bass', 'MODERATE', 'Chasing shad schools'));
    }
  } else {
    // winter
    fw.push(act('Walleye', tempF > 38 ? 'MODERATE' : 'LOW', tempF > 38 ? 'Feeding at twilight on flats' : 'Ice/cold bite — very slow'));
    fw.push(act('Yellow Perch', 'MODERATE', 'Schools tight to deep structure'));
    if (tempF > 42) fw.push(act('Largemouth Bass', 'LOW', 'Lethargic — finesse only, 15–25 ft'));
    fw.push(act('Chain Pickerel', 'MODERATE', 'Most active species in cold water'));
  }

  // ── Saltwater ───────────────────────────────────────────────────────────────
  const sw: SpeciesActivity[] = [];

  // Coastal proximity modulates activity
  const coastalActivity = (base: 'HIGH' | 'MODERATE') =>
    isCoastal ? base : base === 'HIGH' ? 'MODERATE' : 'LOW';

  if (season === 'spring') {
    sw.push(act('Striped Bass', coastalActivity('HIGH'), isCoastal ? 'Migration run in full swing' : 'Migratory — best near coast'));
    sw.push(act('Flounder', coastalActivity('HIGH'), 'Moving into estuaries'));
    if (tempF >= 58) sw.push(act('Cobia', coastalActivity('MODERATE'), 'Following rays into bays'));
    sw.push(act('Speckled Trout', coastalActivity('MODERATE'), 'Flats and grass beds warming up'));
  } else if (season === 'summer') {
    if (tempF >= 72) {
      sw.push(act('Red Drum', coastalActivity('HIGH'), isCoastal ? 'Tailing on flats at low tide' : 'Nearshore structure'));
      sw.push(act('Snook', coastalActivity('HIGH'), 'Feeding aggressively on structure'));
      sw.push(act('Tarpon', coastalActivity('MODERATE'), 'Rolling in passes and inlets'));
    }
    sw.push(act('Flounder', coastalActivity('MODERATE'), 'Holding in inlets and channels'));
    if (pressureTrend === 'falling') sw.push(act('Bluefish', 'HIGH', 'Pre-storm blitz feeding'));
    sw.push(act('Spanish Mackerel', coastalActivity('HIGH'), 'Schooling near surface in warm water'));
  } else if (season === 'fall') {
    sw.push(act('Striped Bass', coastalActivity('HIGH'), 'Fall migration — trophy fish feeding hard'));
    sw.push(act('Bluefish', coastalActivity('HIGH'), 'Blitzing schools on the surface'));
    sw.push(act('Red Drum', coastalActivity('MODERATE'), 'Post-spawn moving to nearshore structure'));
    if (windMph > 10) sw.push(act('Flounder', 'HIGH', 'Wind creates current — flounder active in cuts'));
  } else {
    // winter
    sw.push(act('Speckled Trout', coastalActivity('MODERATE'), 'Coldwater grass flats'));
    sw.push(act('Striped Bass', coastalActivity('MODERATE'), 'Wintering in deep channels'));
    sw.push(act('Sheepshead', coastalActivity('HIGH'), 'Pier/dock pilings in winter'));
    sw.push(act('Red Drum', tempF < 50 ? 'LOW' : coastalActivity('MODERATE'), tempF < 50 ? 'Very lethargic below 50°F' : 'Slow retrieve near structure'));
  }

  return { freshwater: fw.slice(0, 5), saltwater: sw.slice(0, 5) };
}

// ── Activity-level headline generator ────────────────────────────────────────

function buildHeadline(
  levelIndex: LevelIndex,
  season: string,
  pressureTrend: 'rising' | 'falling' | 'stable',
  primaryReason: string,
): { headline: string; reason: string } {
  const seasonCap = season.charAt(0).toUpperCase() + season.slice(1);

  const headlines: Record<string, string> = {
    EXCELLENT: 'Exceptional bite window — get on the water',
    HIGH: `${seasonCap} bass active — prime conditions`,
    MODERATE: 'Decent conditions — work structure methodically',
    LOW: 'Tough bite — finesse presentations only',
  };

  const level = LEVELS[levelIndex];

  let reason: string;
  if (pressureTrend === 'falling') {
    reason = 'Falling pressure + pre-storm feeding window';
  } else if (pressureTrend === 'rising') {
    reason = 'Rising pressure — fish holding deep off structure';
  } else {
    reason = `${primaryReason} · ${seasonCap} seasonal patterns in effect`;
  }

  return { headline: headlines[level], reason };
}

// ── Haversine distance (miles) ────────────────────────────────────────────────

function haversineDistanceMi(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3958.8; // Earth radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Overpass (OpenStreetMap) nearby fishing spots ─────────────────────────────

interface OverpassElement {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

function spotTypeLabel(tags: Record<string, string>): string {
  if (tags['leisure'] === 'fishing') return 'Fishing Access';
  if (tags['water'] === 'reservoir') return 'Reservoir';
  if (tags['water'] === 'lake' || tags['natural'] === 'water') return 'Lake';
  if (tags['waterway'] === 'river') return 'River';
  if (tags['waterway'] === 'stream') return 'Stream';
  if (tags['water'] === 'pond') return 'Pond';
  return 'Water Body';
}

async function getNearbySpots(lat: number, lon: number): Promise<FishingSpot[]> {
  const radius = 32186; // 20 miles in metres
  const query = `
[out:json][timeout:20];
(
  node["leisure"="fishing"](around:${radius},${lat},${lon});
  way["leisure"="fishing"](around:${radius},${lat},${lon});
  node["natural"="water"]["name"](around:${radius},${lat},${lon});
  way["natural"="water"]["name"](around:${radius},${lat},${lon});
  way["water"="lake"]["name"](around:${radius},${lat},${lon});
  way["water"="reservoir"]["name"](around:${radius},${lat},${lon});
  way["waterway"="river"]["name"](around:${radius},${lat},${lon});
  way["waterway"="stream"]["name"](around:${radius},${lat},${lon});
);
out center 30;
  `.trim();

  try {
    const res = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(query)}`,
      signal: AbortSignal.timeout(22000),
    });
    if (!res.ok) return [];
    const json = (await res.json()) as { elements: OverpassElement[] };

    const seen = new Set<string>();
    const spots: FishingSpot[] = [];

    for (const el of json.elements) {
      const tags = el.tags ?? {};
      const name = tags['name'];
      if (!name) continue;
      if (seen.has(name)) continue;
      seen.add(name);

      const elLat = el.lat ?? el.center?.lat;
      const elLon = el.lon ?? el.center?.lon;
      if (elLat === undefined || elLon === undefined) continue;

      spots.push({
        name,
        type: spotTypeLabel(tags),
        distanceMi: Math.round(haversineDistanceMi(lat, lon, elLat, elLon) * 10) / 10,
        lat: elLat,
        lon: elLon,
      });
    }

    return spots.sort((a, b) => a.distanceMi - b.distanceMi).slice(0, 12);
  } catch {
    return [];
  }
}

// ── Nominatim reverse geocode ─────────────────────────────────────────────────

async function getLocationLabel(lat: number, lon: number): Promise<string> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=12`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'FishLeague/1.0 (admin@fishleague.app)' },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return 'Your location';
    const data = (await res.json()) as {
      address?: {
        city?: string; town?: string; village?: string;
        county?: string; state?: string; postcode?: string;
      };
    };
    const addr = data.address ?? {};
    const city = addr.city ?? addr.town ?? addr.village ?? addr.county ?? '';
    const state = addr.state ?? '';
    const zip = addr.postcode ?? '';
    if (city && state && zip) return `${city}, ${state} ${zip}`;
    if (city && state) return `${city}, ${state}`;
    return 'Your location';
  } catch {
    return 'Your location';
  }
}

// ── NOAA tide predictions ─────────────────────────────────────────────────────

interface NoaaStation { id: string; name: string; lat: number; lng: number; }

// Cache the full stations list for 24 h to avoid re-fetching on every request
let noaaStationsCache: { stations: NoaaStation[]; ts: number } | null = null;

async function getNearestTideStation(
  lat: number,
  lon: number,
): Promise<{ stationId: string; stationName: string; distanceMi: number } | null> {
  const now = Date.now();
  if (!noaaStationsCache || now - noaaStationsCache.ts > 24 * 60 * 60 * 1000) {
    try {
      const res = await fetch(
        'https://api.tidesandcurrents.noaa.gov/mdapi/prod/webapi/stations.json?type=tidepredictions',
        { signal: AbortSignal.timeout(10000) },
      );
      if (!res.ok) return null;
      const json = (await res.json()) as { stations?: NoaaStation[] };
      noaaStationsCache = { stations: json.stations ?? [], ts: now };
    } catch {
      return null;
    }
  }

  let nearest: { stationId: string; stationName: string; distanceMi: number } | null = null;
  let minDist = Infinity;
  for (const s of noaaStationsCache.stations) {
    const d = haversineDistanceMi(lat, lon, s.lat, s.lng);
    if (d < minDist) {
      minDist = d;
      nearest = { stationId: s.id, stationName: s.name, distanceMi: Math.round(d * 10) / 10 };
    }
  }
  return nearest;
}

async function fetchTidePredictions(stationId: string): Promise<TidePrediction[]> {
  const d = new Date();
  const dateStr = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const url =
    `https://api.tidesandcurrents.noaa.gov/api/prod/datagetter` +
    `?product=predictions&application=fishleague` +
    `&begin_date=${dateStr}&end_date=${dateStr}` +
    `&datum=MLLW&station=${stationId}&time_zone=lst_ldt&interval=hilo&units=english&format=json`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return [];
    const json = (await res.json()) as { predictions?: Array<{ t: string; v: string; type: string }> };
    if (!json.predictions) return [];
    return json.predictions.map(p => {
      const timePart = p.t.split(' ')[1] ?? '00:00';
      const [hh, mm] = timePart.split(':').map(Number);
      const ampm = hh >= 12 ? 'PM' : 'AM';
      const h12 = hh % 12 === 0 ? 12 : hh % 12;
      return {
        time: `${h12}:${String(mm).padStart(2, '0')} ${ampm}`,
        heightFt: Math.round(parseFloat(p.v) * 10) / 10,
        type: p.type as 'H' | 'L',
      };
    });
  } catch {
    return [];
  }
}

async function getTidesForLocation(lat: number, lon: number): Promise<TideInfo | null> {
  try {
    const station = await getNearestTideStation(lat, lon);
    if (!station || station.distanceMi > 100) return null; // too far inland
    const predictions = await fetchTidePredictions(station.stationId);
    if (predictions.length === 0) return null;
    return { stationName: station.stationName, distanceMi: station.distanceMi, predictions };
  } catch {
    return null;
  }
}

// ── Main service ──────────────────────────────────────────────────────────────

@Injectable()
export class FishingIntelligenceService {
  async getRecommendations(lat: number, lon: number): Promise<FishingIntelResponse> {
    const weatherUrl =
      `https://api.open-meteo.com/v1/forecast` +
      `?latitude=${lat}&longitude=${lon}` +
      `&current=temperature_2m,wind_speed_10m,surface_pressure,precipitation,weathercode` +
      `&hourly=surface_pressure` +
      `&daily=sunrise,sunset` +
      `&forecast_days=1` +
      `&timezone=auto`;

    let raw: OpenMeteoResponse;
    let spots: FishingSpot[];
    let locationLabel: string;
    let tides: TideInfo | null;

    try {
      [raw, spots, locationLabel, tides] = await Promise.all([
        fetch(weatherUrl).then(r => {
          if (!r.ok) throw new Error(`Open-Meteo returned ${r.status}`);
          return r.json() as Promise<OpenMeteoResponse>;
        }),
        getNearbySpots(lat, lon),
        getLocationLabel(lat, lon),
        getTidesForLocation(lat, lon),
      ]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new BadGatewayException(`Weather fetch failed: ${msg}`);
    }

    const { current, hourly, daily } = raw;

    // ── Unit conversions ──────────────────────────────────────────────────────
    const tempF = celsiusToFahrenheit(current.temperature_2m);
    const windMph = kmhToMph(current.wind_speed_10m);
    const pressureHpa = Math.round(current.surface_pressure);

    // ── Pressure trend ────────────────────────────────────────────────────────
    const pressureTrend = calcPressureTrend(
      current.surface_pressure,
      hourly.time,
      hourly.surface_pressure,
      current.time,
    );

    // ── Season + local time ───────────────────────────────────────────────────
    const nowLocal = new Date(current.time);
    const season = getSeason(nowLocal.getMonth());
    const localTime = formatTime(nowLocal);
    const weatherDesc = WEATHER_DESCRIPTIONS[current.weathercode] ?? 'Unknown';

    // ── Sunrise / sunset ──────────────────────────────────────────────────────
    const sunrise = new Date(daily.sunrise[0]);
    const sunset = new Date(daily.sunset[0]);

    // Dawn/dusk check for depth recommendations
    const isDawnOrDusk =
      Math.abs(nowLocal.getTime() - sunrise.getTime()) < 90 * 60 * 1000 ||
      Math.abs(nowLocal.getTime() - sunset.getTime()) < 90 * 60 * 1000;

    // ── Rule engine ───────────────────────────────────────────────────────────
    const { index: activityIndex, primaryReason } = calcActivityLevel(
      pressureTrend,
      pressureHpa,
      tempF,
      windMph,
      season,
    );

    const { headline, reason } = buildHeadline(
      activityIndex,
      season,
      pressureTrend,
      primaryReason,
    );

    const lureRec = getLureRecommendation(
      pressureTrend,
      tempF,
      windMph,
      current.weathercode,
    );

    const depth = getDepthRecommendation(tempF, pressureTrend, isDawnOrDusk);

    const windows = buildBiteWindows(sunrise, sunset, nowLocal);

    return {
      conditions: {
        temperatureF: tempF,
        windMph,
        pressureHpa,
        pressureTrend,
        weatherCode: current.weathercode,
        weatherDesc,
        season,
        localTime,
      },
      activity: {
        level: LEVELS[activityIndex],
        headline,
        reason,
      },
      recommendations: {
        lure: lureRec.lure,
        altLure: lureRec.altLure,
        depth,
        technique: lureRec.technique,
      },
      windows,
      locationLabel,
      spots,
      sunriseIso: sunrise.toISOString(),
      sunsetIso: sunset.toISOString(),
      tides,
      activeSpecies: getActiveSpecies(tempF, season, pressureTrend, tides !== null, windMph),
    };
  }
}
