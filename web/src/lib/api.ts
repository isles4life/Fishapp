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
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    throw new Error(data?.message ?? `HTTP ${res.status}`);
  }
  return data;
}

export interface Region { id: string; name: string; }
export interface Tournament {
  id: string; name: string; weekNumber: number; year: number;
  startsAt: string; endsAt: string; isOpen: boolean;
  entryFeeCents: number; prizePoolCents: number;
  region: { name: string };
}
export interface LeaderboardEntry {
  rank: number; submissionId?: string; userId: string; displayName: string; fishLengthCm: number;
  profilePhotoUrl?: string | null; username?: string | null;
  speciesName?: string | null; speciesCategory?: string | null;
}
export interface CatchComment {
  id: string; submissionId: string; userId: string; body: string; createdAt: string;
  user: { id: string; displayName: string };
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
  birthday?: string;
  profilePhotoUrl?: string;
  homeState?: string; homeCity?: string; country?: string; zipCode?: string;
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

async function apiUpload<T>(path: string, formData: FormData): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, { method: 'POST', headers, body: formData });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error(data?.message ?? `HTTP ${res.status}`);
  return data;
}

export const api = {
  getRegions: () => apiFetch<Region[]>('/users/regions'),
  getActiveTournament: () => apiFetch<Tournament>('/tournaments/open'),
  getLeaderboard: (id: string, species?: string) => {
    const qs = species ? `?species=${encodeURIComponent(species)}` : '';
    return apiFetch<LeaderboardEntry[]>(`/leaderboard/${id}${qs}`);
  },
  toggleProp: (submissionId: string) =>
    apiFetch<{ propped: boolean; count: number }>(`/submissions/${submissionId}/prop`, { method: 'POST' }, true),
  getProps: (submissionId: string) =>
    apiFetch<{ count: number; userHasPropped: boolean }>(`/submissions/${submissionId}/props`, undefined, false),
  getComments: (submissionId: string) =>
    apiFetch<CatchComment[]>(`/submissions/${submissionId}/comments`, undefined, false),
  addComment: (submissionId: string, body: string) =>
    apiFetch<CatchComment>(`/submissions/${submissionId}/comments`, { method: 'POST', body: JSON.stringify({ body }) }, true),
  deleteComment: (commentId: string) =>
    apiFetch<{ ok: boolean }>(`/comments/${commentId}`, { method: 'DELETE' }, true),
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
  getMyProfile: () =>
    apiFetch<AnglerProfile>('/profile/me', undefined, true).catch(e =>
      e.message === 'no_profile' || e.message?.includes('404') ? null : Promise.reject(e)
    ),
  updateProfile: (data: UpdateProfilePayload) =>
    apiFetch<AnglerProfile>('/profile/me', { method: 'PUT', body: JSON.stringify(data) }, true),
  getProfile: (username: string) => apiFetch<AnglerProfile>(`/profile/${username}`),
  followAngler: (username: string) =>
    apiFetch<{ following: boolean }>(`/profile/${username}/follow`, { method: 'POST' }, true),
  unfollowAngler: (username: string) =>
    apiFetch<{ following: boolean }>(`/profile/${username}/follow`, { method: 'DELETE' }, true),
  uploadAvatar: (file: File) => {
    const form = new FormData();
    form.append('avatar', file);
    return apiUpload<{ avatarUrl: string }>('/profile/me/avatar', form);
  },
};
