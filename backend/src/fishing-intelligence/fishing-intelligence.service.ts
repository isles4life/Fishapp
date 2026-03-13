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

export interface FishingIntelResponse {
  conditions: FishingConditions;
  activity: ActivityLevel;
  recommendations: Recommendations;
  windows: BiteWindow[];
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

// ── Main service ──────────────────────────────────────────────────────────────

@Injectable()
export class FishingIntelligenceService {
  async getRecommendations(lat: number, lon: number): Promise<FishingIntelResponse> {
    const url =
      `https://api.open-meteo.com/v1/forecast` +
      `?latitude=${lat}&longitude=${lon}` +
      `&current=temperature_2m,wind_speed_10m,surface_pressure,precipitation,weathercode` +
      `&hourly=surface_pressure` +
      `&daily=sunrise,sunset` +
      `&forecast_days=1` +
      `&timezone=auto`;

    let raw: OpenMeteoResponse;
    try {
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Open-Meteo returned ${res.status}`);
      }
      raw = (await res.json()) as OpenMeteoResponse;
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
    };
  }
}
