const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.fishleague.app';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('fl_token');
}

export function setToken(token: string) {
  localStorage.setItem('fl_token', token);
}

export function clearToken() {
  localStorage.removeItem('fl_token');
}

export function isLoggedIn(): boolean {
  return !!getToken();
}

async function apiFetch<T>(path: string, init?: RequestInit, auth = false): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch(`${BASE}${path}`, { ...init, headers: { ...headers, ...init?.headers } });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export interface Region { id: string; name: string; }
export interface Tournament {
  id: string; name: string; weekNumber: number; year: number;
  startsAt: string; endsAt: string; isOpen: boolean;
  region: { name: string };
}
export interface LeaderboardEntry {
  rank: number; userId: string; displayName: string; fishLengthCm: number;
}
export interface AuthResponse { token: string; userId: string; }

export interface AnglerStats {
  totalCatches: number;
  totalTournamentsEntered: number;
  tournamentsWon: number;
  largestCatchCm: number | null;
  averageCatchCm: number | null;
  verifiedCatches: number;
}

export interface Achievement { id: string; badge: string; earnedAt: string; }

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
  preferredWaterType: 'FRESHWATER' | 'SALTWATER' | 'BOTH' | null;
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
  homeState?: string; homeCity?: string; country?: string;
  primarySpecies?: string[];
  favoriteTechniques?: string[];
  favoriteBaits?: string[];
  preferredWaterType?: 'FRESHWATER' | 'SALTWATER' | 'BOTH';
  favoriteRod?: string; favoriteReel?: string;
  favoriteLine?: string; favoriteBoat?: string;
  sponsorTags?: string[];
  allowFollowers?: boolean;
  publicProfile?: boolean;
}

export const api = {
  getRegions: () => apiFetch<Region[]>('/users/regions'),
  getActiveTournament: () => apiFetch<Tournament>('/tournaments/open'),
  getLeaderboard: (id: string) => apiFetch<LeaderboardEntry[]>(`/leaderboard/${id}`),
  login: (email: string, password: string) =>
    apiFetch<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
      headers: { 'X-Platform': 'web' },
    }),
  register: (email: string, password: string, displayName: string, regionId: string) =>
    apiFetch<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, displayName, regionId }),
    }),
  getMyProfile: () => apiFetch<AnglerProfile | null>('/profile/me', undefined, true),
  updateProfile: (data: UpdateProfilePayload) =>
    apiFetch<AnglerProfile>('/profile/me', { method: 'PUT', body: JSON.stringify(data) }, true),
  getProfile: (username: string) => apiFetch<AnglerProfile>(`/profile/${username}`),
  followAngler: (username: string) =>
    apiFetch<{ following: boolean }>(`/profile/${username}/follow`, { method: 'POST' }, true),
  unfollowAngler: (username: string) =>
    apiFetch<{ following: boolean }>(`/profile/${username}/follow`, { method: 'DELETE' }, true),
};
