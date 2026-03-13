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
  region?: { name: string };
}

export interface MySubmission {
  id: string;
  status: string;
  fishLengthCm: number;
  capturedAt: string;
}

export interface SubmissionResult {
  submissionId: string;
  status: string;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string;
  fishLengthCm: number;
}

export interface UserRank {
  rank?: number;
  fishLengthCm?: number;
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
  profilePhotoUrl: string | null;
  verifiedAngler: boolean;
  homeState: string | null;
  homeCity: string | null;
  country: string | null;
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

export interface UpdateProfilePayload {
  username?: string;
  bio?: string;
  profilePhotoUrl?: string;
  homeState?: string;
  homeCity?: string;
  country?: string;
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
