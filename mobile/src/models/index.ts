export interface AuthResponse {
  token: string;
  userId: string;
}

export interface Region {
  id: string;
  name: string;
}

export interface User {
  id: string;
  displayName: string;
  email?: string;
  regionId: string;
  authProvider: string;
}

export interface Tournament {
  id: string;
  name: string;
  weekNumber: number;
  year: number;
  startsAt: string;
  endsAt: string;
  isOpen: boolean;
  entryFeeCents: number;
  prizePoolCents: number;
  prizeStructure?: Record<string, any> | null;
  description?: string | null;
  region?: { name: string; minLat?: number; maxLat?: number; minLng?: number; maxLng?: number };
  scoringMethod?: string;
  checkInCode?: string | null;
  director?: {
    id: string;
    displayName: string;
    profile?: { username?: string | null; profilePhotoUrl?: string | null } | null;
  } | null;
  directorId?: string | null;
  bannerUrl?: string | null;
  _count?: { submissions: number; checkIns: number };
  top3?: Array<{
    rank: number | null;
    score: number;
    fishLengthCm: number;
    user: { displayName: string; profile?: { username?: string | null; profilePhotoUrl?: string | null } | null };
  }>;
}

export interface TournamentPost {
  id: string;
  tournamentId: string;
  userId: string;
  type: 'CATCH' | 'ANNOUNCEMENT' | 'CHECK_IN' | 'ANGLER_POST';
  body: string | null;
  photoUrl: string | null;
  createdAt: string;
  user: {
    id: string;
    displayName: string;
    profile?: { username?: string | null; profilePhotoUrl?: string | null } | null;
  };
  submission?: {
    id: string;
    fishLengthCm: number;
    fishWeightOz?: number | null;
    speciesName?: string | null;
    released: boolean;
  } | null;
}

export interface MySubmission {
  id: string;
  status: string;
  fishLengthCm: number;
  capturedAt: string;
  rejectionNote?: string | null;
  released?: boolean;
}

export interface SubmissionResult {
  submissionId: string;
  status: string;
}

export interface LeaderboardEntry {
  rank: number;
  submissionId?: string;
  userId: string;
  displayName: string;
  fishLengthCm: number;
  score: number;
  scoringMethod?: string;
  fishWeightOz?: number | null;
  profilePhotoUrl?: string | null;
  username?: string | null;
  speciesName?: string | null;
  speciesCategory?: string | null;
  photoUrl?: string | null;
  submittedAt?: string | null;
  released?: boolean;
}

export interface CatchComment {
  id: string;
  submissionId: string;
  userId: string;
  body: string;
  gifUrl?: string | null;
  photoUrl?: string | null;
  createdAt: string;
  propCount?: number;
  userHasPropped?: boolean;
  user: { id: string; displayName: string; profile?: { username?: string | null; profilePhotoUrl?: string | null } | null };
}

export interface UserWarning {
  id: string;
  level: 'MINOR' | 'MAJOR' | 'FINAL';
  reason: string;
  acknowledged: boolean;
  createdAt: string;
}

export interface UserRank {
  rank?: number;
  fishLengthCm?: number;
  score?: number | null;
}

export interface LeaderboardUpdate {
  tournamentId: string;
  entries: LeaderboardEntry[];
  updatedAt: string;
}

// ── Angler Profile ────────────────────────────────────────────────────────────

export type WaterType = 'FRESHWATER' | 'SALTWATER' | 'BOTH';

export interface AnglerStats {
  totalCatches: number;
  totalTournamentsEntered: number;
  tournamentsWon: number;
  largestCatchCm: number | null;
  averageCatchCm: number | null;
  verifiedCatches: number;
}

export interface Achievement {
  id: string;
  badge: string;
  earnedAt: string;
}

export interface AnglerProfile {
  id: string;
  userId: string;
  username: string;
  bio: string | null;
  birthday: string | null;
  profilePhotoUrl: string | null;
  verifiedAngler: boolean;
  homeState: string | null;
  homeCity: string | null;
  country: string | null;
  zipCode: string | null;
  primarySpecies: string[];
  favoriteTechniques: string[];
  favoriteBaits: string[];
  preferredWaterType: WaterType | null;
  favoriteRod: string | null;
  favoriteReel: string | null;
  favoriteLine: string | null;
  favoriteBoat: string | null;
  sponsorTags: string[];
  sportsmanshipScore: number;
  followersCount: number;
  followingCount: number;
  allowFollowers: boolean;
  publicProfile: boolean;
  badges: string[];
  lastActiveAt: string;
  profileViews: number;
  achievements: Achievement[];
  stats: AnglerStats;
  isFollowing?: boolean;
  user: { displayName: string; createdAt: string };
}

// ── Feed ──────────────────────────────────────────────────────────────────

export interface FeedItem {
  submissionId: string;
  userId: string;
  displayName: string;
  username: string | null;
  profilePhotoUrl: string | null;
  fishLengthCm: number;
  speciesName: string | null;
  released: boolean;
  photoUrl: string | null;
  submittedAt: string;
  propsCount: number;
  lat?: number | null;
  lng?: number | null;
}

// ── Hot Spots ──────────────────────────────────────────────────────────────

export interface HotSpot {
  lat: number;
  lng: number;
  species: string;
  lengthCm: number;
  photoUrl?: string | null;
}

export interface TournamentCheckIn {
  tournament: {
    id: string;
    name: string;
    weekNumber: number;
    region: string;
    endsAt: string;
  };
}

export interface TournamentAdminRequest {
  id: string;
  tournamentId: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  message: string | null;
  createdAt: string;
  tournament: { id: string; name: string; weekNumber: number; year: number };
}

// ── Fishing Intelligence ───────────────────────────────────────────────────

export interface FishingSpot {
  name: string;
  type: string;
  distanceMi: number;
  lat: number;
  lon: number;
}

export interface TidePrediction {
  time: string;
  heightFt: number;
  type: 'H' | 'L';
}

export interface SpeciesActivity {
  name: string;
  activity: 'HIGH' | 'MODERATE' | 'LOW';
  reason: string;
}

export interface FishingIntelResponse {
  conditions: {
    temperatureF: number;
    windMph: number;
    pressureHpa: number;
    pressureTrend: 'rising' | 'falling' | 'stable';
    weatherDesc: string;
    season: string;
    localTime: string;
    weatherCode?: number;
  };
  activity: { level: string; headline: string; reason: string };
  recommendations: { lure: string; altLure: string; depth: string; technique: string };
  windows: { label: string; start: string; end: string; quality: string }[];
  locationLabel: string;
  spots: FishingSpot[];
  sunriseIso: string;
  sunsetIso: string;
  tides: { stationName: string; distanceMi: number; predictions: TidePrediction[] } | null;
  activeSpecies: {
    freshwater: SpeciesActivity[];
    saltwater: SpeciesActivity[];
  };
}

export interface UpdateProfilePayload {
  username?: string;
  bio?: string;
  birthday?: string;
  profilePhotoUrl?: string;
  homeState?: string;
  homeCity?: string;
  country?: string;
  zipCode?: string;
  primarySpecies?: string[];
  favoriteTechniques?: string[];
  favoriteBaits?: string[];
  preferredWaterType?: WaterType;
  favoriteRod?: string;
  favoriteReel?: string;
  favoriteLine?: string;
  favoriteBoat?: string;
  sponsorTags?: string[];
  allowFollowers?: boolean;
  publicProfile?: boolean;
}
