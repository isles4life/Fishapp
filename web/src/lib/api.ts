const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.fishleague.app'; // v2

/** Rewrite internal Docker hostnames to browser-accessible equivalents for local dev. */
export function fixS3Url(url: string | null | undefined): string | null | undefined {
  if (!url) return url;
  return url.replace('http://localstack:', 'http://localhost:');
}

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

export function getMyUserId(): string | null {
  const token = getToken();
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.sub ?? null;
  } catch { return null; }
}

export function getMyRole(): string | null {
  const token = getToken();
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.role ?? null;
  } catch { return null; }
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
  entryFeeCents: number; prizePoolCents: number; scoringMethod?: string;
  description?: string | null;
  bannerUrl?: string | null;
  region: { name: string };
  director?: { id: string; displayName: string; profile?: { username?: string | null; profilePhotoUrl?: string | null } | null } | null;
  _count?: { submissions: number; checkIns: number };
  top3?: LeaderboardEntry[];
}

export interface TournamentPost {
  id: string;
  type: 'CATCH' | 'ANNOUNCEMENT' | 'CHECK_IN' | 'ANGLER_POST';
  body?: string | null;
  photoUrl?: string | null;
  createdAt: string;
  user: { id: string; displayName: string; profile?: { username?: string | null; profilePhotoUrl?: string | null } | null };
  submission?: {
    id: string;
    fishLengthCm: number;
    fishWeightOz?: number | null;
    speciesName?: string | null;
    released?: boolean;
  } | null;
}
export interface PostComment {
  id: string;
  postId: string;
  userId: string;
  body: string;
  createdAt: string;
  user: { id: string; displayName: string; profile?: { username?: string | null; profilePhotoUrl?: string | null } | null };
}

export interface LeaderboardEntry {
  rank: number; submissionId?: string; userId: string; displayName: string; fishLengthCm: number;
  score: number; scoringMethod?: string; fishWeightOz?: number | null;
  profilePhotoUrl?: string | null; username?: string | null;
  speciesName?: string | null; speciesCategory?: string | null;
  photoUrl?: string | null; submittedAt?: string | null;
  released?: boolean;
}
export interface CatchComment {
  id: string; submissionId: string; userId: string; body: string; createdAt: string;
  user: { id: string; displayName: string; profile?: { username?: string | null; profilePhotoUrl?: string | null } | null };
}
export interface AuthResponse { token: string; userId: string; }
export interface TournamentAdminRequest {
  id: string; tournamentId: string; status: 'PENDING' | 'APPROVED' | 'REJECTED';
  message: string | null; createdAt: string;
  tournament: { id: string; name: string; weekNumber: number; year: number };
}

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

// ── Hot Spots ──────────────────────────────────────────────────────────────

export interface HotSpot {
  lat: number;
  lng: number;
  species: string;
  lengthCm: number;
}

// ── Fishing Intelligence ───────────────────────────────────────────────────

export interface FishingSpot {
  name: string;
  type: string;
  distanceMi: number;
  lat: number;
  lon: number;
}

export interface TidePrediction { time: string; heightFt: number; type: 'H' | 'L'; }

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
    freshwater: { name: string; activity: 'HIGH' | 'MODERATE' | 'LOW'; reason: string }[];
    saltwater: { name: string; activity: 'HIGH' | 'MODERATE' | 'LOW'; reason: string }[];
  };
}

export const api = {
  getRegions: () => apiFetch<Region[]>('/users/regions'),
  getActiveTournament: () => apiFetch<Tournament>('/tournaments/open'),
  getActiveTournaments: () => apiFetch<Tournament[]>('/tournaments/open-all'),
  getLeaderboard: (id: string, species?: string) => {
    const qs = species ? `?species=${encodeURIComponent(species)}` : '';
    return apiFetch<LeaderboardEntry[]>(`/leaderboard/${id}${qs}`);
  },
  toggleProp: (submissionId: string) =>
    apiFetch<{ propped: boolean; count: number }>(`/submissions/${submissionId}/prop`, { method: 'POST' }, true),
  getProps: (submissionId: string) =>
    apiFetch<{ count: number; userHasPropped: boolean }>(`/submissions/${submissionId}/props`, undefined, false),
  getPropsWho: (submissionId: string) =>
    apiFetch<{ id: string; displayName: string; profilePhotoUrl: string | null }[]>(`/submissions/${submissionId}/props/who`, undefined, false),
  getComments: (submissionId: string) =>
    apiFetch<CatchComment[]>(`/submissions/${submissionId}/comments`, undefined, false),
  addComment: (submissionId: string, body: string) =>
    apiFetch<CatchComment>(`/submissions/${submissionId}/comments`, { method: 'POST', body: JSON.stringify({ body }) }, true),
  editComment: (commentId: string, body: string) =>
    apiFetch<CatchComment>(`/comments/${commentId}`, { method: 'PATCH', body: JSON.stringify({ body }) }, true),
  deleteComment: (commentId: string) =>
    apiFetch<{ ok: boolean }>(`/comments/${commentId}`, { method: 'DELETE' }, true),
  login: (email: string, password: string) =>
    apiFetch<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
      headers: { 'X-Platform': 'web' },
    }),
  register: (email: string, password: string, displayName: string, regionId: string, termsAcceptedAt?: string) =>
    apiFetch<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, displayName, regionId, termsAcceptedAt }),
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
  getFishingIntel: (lat: number, lon: number) =>
    apiFetch<FishingIntelResponse>(`/fishing-intelligence?lat=${lat}&lon=${lon}`, undefined, true),
  getHotSpots: (tournamentId?: string) => {
    const qs = tournamentId ? `?tournamentId=${encodeURIComponent(tournamentId)}` : '';
    return apiFetch<HotSpot[]>(`/submissions/hotspots${qs}`, undefined, true);
  },
  getTournaments: () => apiFetch<Tournament[]>('/tournaments'),
  getMyTournamentRequests: () =>
    apiFetch<TournamentAdminRequest[]>('/tournament-admin/my-requests', undefined, true),
  submitTournamentAdminRequest: (tournamentId: string, message?: string) =>
    apiFetch<TournamentAdminRequest>('/tournament-admin/request', {
      method: 'POST', body: JSON.stringify({ tournamentId, message }),
    }, true),
  getTournamentFeed: (id: string, cursor?: string) => {
    const qs = cursor ? `?cursor=${encodeURIComponent(cursor)}` : '';
    return apiFetch<{ posts: TournamentPost[]; nextCursor: string | null }>(`/tournaments/${id}/feed${qs}`, undefined, true);
  },
  createTournamentPost: (id: string, body: string, photoKey?: string, gifUrl?: string) =>
    apiFetch<TournamentPost>(`/tournaments/${id}/posts`, {
      method: 'POST',
      body: JSON.stringify({ body, photoKey, gifUrl }),
    }, true),
  uploadPostMedia: (tournamentId: string, file: File) => {
    const form = new FormData();
    form.append('photo', file);
    return apiUpload<{ photoKey: string }>(`/tournaments/${tournamentId}/posts/media`, form);
  },
  editTournamentPost: (postId: string, body: string, removePhoto?: boolean, photoKey?: string, gifUrl?: string) =>
    apiFetch<TournamentPost>(`/tournaments/posts/${postId}`, { method: 'PATCH', body: JSON.stringify({ body, removePhoto, photoKey, gifUrl }) }, true),
  deleteTournamentPost: (postId: string) =>
    apiFetch<{ ok: boolean }>(`/tournaments/posts/${postId}`, { method: 'DELETE' }, true),
  getPostComments: (postId: string) =>
    apiFetch<PostComment[]>(`/tournaments/posts/${postId}/comments`, undefined, true),
  addPostComment: (postId: string, body: string) =>
    apiFetch<PostComment>(`/tournaments/posts/${postId}/comments`, { method: 'POST', body: JSON.stringify({ body }) }, true),
  deletePostComment: (commentId: string) =>
    apiFetch<{ deleted: boolean }>(`/tournaments/posts/comments/${commentId}`, { method: 'DELETE' }, true),
  searchUsers: (q: string) =>
    apiFetch<{ id: string; username: string; displayName: string }[]>(`/users/search?q=${encodeURIComponent(q)}`, undefined, true),
};
