import Constants from 'expo-constants';
import { storage } from './storage';
import type {
  AuthResponse,
  Region,
  Tournament,
  MySubmission,
  SubmissionResult,
  LeaderboardEntry,
  FeedItem,
  UserRank,
  AnglerProfile,
  UpdateProfilePayload,
  CatchComment,
  UserWarning,
  FishingIntelResponse,
  HotSpot,
  TournamentCheckIn,
  TournamentAdminRequest,
  TournamentPost,
} from '../models';

export const BASE_URL =
  (Constants.expoConfig?.extra?.apiBaseUrl as string) ?? 'https://api.fishleague.app';

async function request<T>(
  path: string,
  options: RequestInit = {},
  authenticated = true
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (authenticated) {
    const token = await storage.getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    throw new Error(data?.message ?? `HTTP ${res.status}`);
  }

  return data;
}

// ── Push ──────────────────────────────────────────────────────────────────────

export function savePushToken(token: string): Promise<{ ok: boolean }> {
  return request('/users/me/push-token', { method: 'PATCH', body: JSON.stringify({ token }) });
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export function getRegions(): Promise<Region[]> {
  return request('/users/regions', {}, false);
}

export function login(email: string, password: string): Promise<AuthResponse> {
  return request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }), headers: { 'X-Platform': 'mobile' } }, false);
}

export function register(
  email: string,
  password: string,
  displayName: string,
  termsAcceptedAt?: string
): Promise<AuthResponse> {
  return request(
    '/auth/register',
    { method: 'POST', body: JSON.stringify({ email, password, displayName, termsAcceptedAt }) },
    false
  );
}

export function appleLogin(
  identityToken: string,
  displayName: string | null,
): Promise<AuthResponse> {
  return request(
    '/auth/apple',
    { method: 'POST', body: JSON.stringify({ identityToken, displayName }), headers: { 'X-Platform': 'mobile' } },
    false
  );
}

// ── Tournaments ───────────────────────────────────────────────────────────────

export function getActiveTournament(): Promise<Tournament> {
  return request('/tournaments/active');
}

export function getTournaments(): Promise<Tournament[]> {
  return request('/tournaments');
}

export function getOpenTournaments(): Promise<Tournament[]> {
  return request('/tournaments/open-all');
}

export function editTournamentPost(postId: string, body: string, removePhoto?: boolean, photoKey?: string, gifUrl?: string): Promise<TournamentPost> {
  return request(`/tournaments/posts/${postId}`, { method: 'PATCH', body: JSON.stringify({ body, removePhoto, photoKey, gifUrl }) });
}

export function deleteTournamentPost(postId: string): Promise<{ ok: boolean }> {
  return request(`/tournaments/posts/${postId}`, { method: 'DELETE' });
}

export type PostComment = {
  id: string;
  postId: string;
  userId: string;
  body: string;
  createdAt: string;
  user: { id: string; displayName: string; profile: { username: string; profilePhotoUrl: string | null } | null };
};

export function getPostComments(postId: string): Promise<PostComment[]> {
  return request(`/tournaments/posts/${postId}/comments`);
}

export function addPostComment(postId: string, body: string): Promise<PostComment> {
  return request(`/tournaments/posts/${postId}/comments`, { method: 'POST', body: JSON.stringify({ body }) });
}

export function deletePostComment(commentId: string): Promise<{ deleted: boolean }> {
  return request(`/tournaments/posts/comments/${commentId}`, { method: 'DELETE' });
}

export function getClosedTournaments(): Promise<(Tournament & { _count: { submissions: number } })[]> {
  return request('/tournaments/history');
}

export function getTournamentDetail(id: string): Promise<Tournament> {
  return request(`/tournaments/${id}`);
}

export function getTournamentFeed(id: string, cursor?: string): Promise<{ posts: TournamentPost[]; nextCursor: string | null }> {
  const qs = cursor ? `?cursor=${encodeURIComponent(cursor)}` : '';
  return request(`/tournaments/${id}/feed${qs}`);
}

export function postToTournamentFeed(tournamentId: string, body: string, photoKey?: string, gifUrl?: string): Promise<TournamentPost> {
  return request(`/tournaments/${tournamentId}/posts`, { method: 'POST', body: JSON.stringify({ body, photoKey, gifUrl }) });
}

export async function uploadPostMedia(tournamentId: string, photoUri: string): Promise<{ photoKey: string }> {
  const token = await storage.getToken();
  const form = new FormData();
  form.append('photo', { uri: photoUri, name: 'post.jpg', type: 'image/jpeg' } as any);
  const res = await fetch(`${BASE_URL}/tournaments/${tournamentId}/posts/media`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message ?? `HTTP ${res.status}`);
  }
  return res.json();
}

// ── Submissions ───────────────────────────────────────────────────────────────

export function getMySubmissions(tournamentId: string): Promise<MySubmission[]> {
  return request(`/submissions/mine?tournamentId=${tournamentId}`);
}

export async function uploadSubmission(fields: {
  tournamentId: string;
  fishLengthCm: string;
  gpsLat: string;
  gpsLng: string;
  capturedAt: string;
  photoUri: string;
  speciesName?: string;
  released?: string; // 'true' | 'false' — FormData is strings
  fishWeightOz?: string;
}): Promise<SubmissionResult> {
  const token = await storage.getToken();
  const form = new FormData();

  Object.entries(fields).forEach(([key, value]) => {
    if (key !== 'photoUri' && value !== undefined) {
      form.append(key, value);
    }
  });

  // Fish photo (with credit card for measurement reference)
  form.append('photo2', { uri: fields.photoUri, name: 'photo2.jpg', type: 'image/jpeg' } as any);

  const res = await fetch(`${BASE_URL}/submissions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      // Do NOT set Content-Type — let fetch set multipart/form-data with boundary
    },
    body: form,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? `HTTP ${res.status}`);
  }

  return res.json();
}

// ── Leaderboard ───────────────────────────────────────────────────────────────

export function getLeaderboard(tournamentId: string, species?: string): Promise<LeaderboardEntry[]> {
  const qs = species ? `?species=${encodeURIComponent(species)}` : '';
  return request(`/leaderboard/${tournamentId}${qs}`);
}

export function getFeed(tournamentId: string): Promise<FeedItem[]> {
  return request(`/submissions/feed?tournamentId=${encodeURIComponent(tournamentId)}`);
}

export function getMyRank(tournamentId: string): Promise<UserRank> {
  return request(`/leaderboard/${tournamentId}/me`);
}

// ── Props ─────────────────────────────────────────────────────────────────────

export function toggleProp(submissionId: string): Promise<{ propped: boolean; count: number }> {
  return request(`/submissions/${submissionId}/prop`, { method: 'POST' });
}

export function getProps(submissionId: string): Promise<{ count: number; userHasPropped: boolean }> {
  return request(`/submissions/${submissionId}/props`, {}, false);
}

export function getPropsWho(submissionId: string): Promise<{ id: string; displayName: string; profilePhotoUrl: string | null }[]> {
  return request(`/submissions/${submissionId}/props/who`, {}, false);
}

// ── Comments ──────────────────────────────────────────────────────────────────

export function getComments(submissionId: string): Promise<CatchComment[]> {
  return request(`/submissions/${submissionId}/comments`, {}, false);
}

export function addComment(submissionId: string, body: string): Promise<CatchComment> {
  return request(`/submissions/${submissionId}/comments`, { method: 'POST', body: JSON.stringify({ body }) });
}

export function editComment(commentId: string, body: string): Promise<CatchComment> {
  return request(`/comments/${commentId}`, { method: 'PATCH', body: JSON.stringify({ body }) });
}

export function deleteComment(commentId: string): Promise<{ ok: boolean }> {
  return request(`/comments/${commentId}`, { method: 'DELETE' });
}

// ── Warnings ──────────────────────────────────────────────────────────────────

export function getMyWarnings(): Promise<UserWarning[]> {
  return request('/warnings/mine');
}

export function acknowledgeWarning(warningId: string): Promise<UserWarning> {
  return request(`/warnings/${warningId}/acknowledge`, { method: 'PATCH' });
}

// ── Profile ───────────────────────────────────────────────────────────────────

export function getMyProfile(): Promise<AnglerProfile | null> {
  return request<AnglerProfile>('/profile/me').catch(e => {
    if (e.message === 'no_profile' || e.message?.includes('404')) return null;
    throw e;
  });
}

export function updateProfile(data: UpdateProfilePayload): Promise<AnglerProfile> {
  return request('/profile/me', { method: 'PUT', body: JSON.stringify(data) });
}

export function getProfile(username: string): Promise<AnglerProfile> {
  return request(`/profile/${username}`, {}, false);
}

export function followAngler(username: string): Promise<{ following: boolean }> {
  return request(`/profile/${username}/follow`, { method: 'POST' });
}

export function unfollowAngler(username: string): Promise<{ following: boolean }> {
  return request(`/profile/${username}/follow`, { method: 'DELETE' });
}

// ── Fishing Intelligence ───────────────────────────────────────────────────

export function getFishingIntel(lat: number, lon: number): Promise<FishingIntelResponse> {
  return request<FishingIntelResponse>(`/fishing-intelligence?lat=${lat}&lon=${lon}`);
}

export function getHotSpots(tournamentId?: string): Promise<HotSpot[]> {
  const qs = tournamentId ? `?tournamentId=${encodeURIComponent(tournamentId)}` : '';
  return request<HotSpot[]>(`/submissions/hotspots${qs}`);
}

export async function identifyFish(
  uri: string,
  mimeType: string,
): Promise<{ suggestions: { species: string; confidence: number }[] }> {
  const token = await storage.getToken();
  const ext = mimeType.split('/')[1] ?? 'jpg';
  const form = new FormData();
  form.append('photo', { uri, name: `fish.${ext}`, type: mimeType } as any);
  const res = await fetch(`${BASE_URL}/submissions/identify`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  if (!res.ok) return { suggestions: [] };
  return res.json();
}

export function checkInTournament(code: string): Promise<TournamentCheckIn> {
  return request('/tournaments/check-in', { method: 'POST', body: JSON.stringify({ code }) });
}

export function requestTournamentAdmin(
  tournamentId: string,
  message?: string,
): Promise<TournamentAdminRequest> {
  return request('/tournament-admin/request', {
    method: 'POST',
    body: JSON.stringify({ tournamentId, message }),
  });
}

export function getMyTournamentAdminRequests(): Promise<TournamentAdminRequest[]> {
  return request('/tournament-admin/my-requests');
}

export async function uploadAvatar(uri: string, mimeType: string): Promise<{ avatarUrl: string }> {
  const token = await storage.getToken();
  const ext = mimeType.split('/')[1] ?? 'jpg';
  const form = new FormData();
  form.append('avatar', { uri, name: `avatar.${ext}`, type: mimeType } as any);
  const res = await fetch(`${BASE_URL}/profile/me/avatar`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? `HTTP ${res.status}`);
  }
  return res.json();
}

// ── Tournament Entry (Stripe) ─────────────────────────────────────────────────

export function createEntryPaymentIntent(tournamentId: string): Promise<{
  clientSecret: string;
  entryFeeCents: number;
  platformFeeCents: number;
}> {
  return request(`/tournaments/${tournamentId}/entry/intent`, { method: 'POST' });
}

export function getMyEntry(tournamentId: string): Promise<{
  status: string;
} | null> {
  return request(`/tournaments/${tournamentId}/entry/me`);
}
