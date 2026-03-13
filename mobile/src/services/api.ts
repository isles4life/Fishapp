import Constants from 'expo-constants';
import { storage } from './storage';
import type {
  AuthResponse,
  Region,
  Tournament,
  MySubmission,
  SubmissionResult,
  LeaderboardEntry,
  UserRank,
  AnglerProfile,
  UpdateProfilePayload,
} from '../models';

const BASE_URL =
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
  regionId: string
): Promise<AuthResponse> {
  return request(
    '/auth/register',
    { method: 'POST', body: JSON.stringify({ email, password, displayName, regionId }) },
    false
  );
}

export function appleLogin(
  identityToken: string,
  displayName: string | null,
  regionId: string
): Promise<AuthResponse> {
  return request(
    '/auth/apple',
    { method: 'POST', body: JSON.stringify({ identityToken, displayName, regionId }), headers: { 'X-Platform': 'mobile' } },
    false
  );
}

// ── Tournaments ───────────────────────────────────────────────────────────────

export function getActiveTournament(): Promise<Tournament> {
  return request('/tournaments/active');
}

// ── Submissions ───────────────────────────────────────────────────────────────

export function getMySubmissions(tournamentId: string): Promise<MySubmission[]> {
  return request(`/submissions/mine?tournamentId=${tournamentId}`);
}

export async function uploadSubmission(fields: {
  tournamentId: string;
  matSerialCode: string;
  fishLengthCm: string;
  gpsLat: string;
  gpsLng: string;
  capturedAt: string;
  photo1Uri: string;
  photo2Uri: string;
}): Promise<SubmissionResult> {
  const token = await storage.getToken();
  const form = new FormData();

  Object.entries(fields).forEach(([key, value]) => {
    if (key !== 'photo1Uri' && key !== 'photo2Uri') {
      form.append(key, value);
    }
  });

  // Append photos as blobs
  form.append('photo1', { uri: fields.photo1Uri, name: 'photo1.jpg', type: 'image/jpeg' } as any);
  form.append('photo2', { uri: fields.photo2Uri, name: 'photo2.jpg', type: 'image/jpeg' } as any);

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

export function getLeaderboard(tournamentId: string): Promise<LeaderboardEntry[]> {
  return request(`/leaderboard/${tournamentId}`);
}

export function getMyRank(tournamentId: string): Promise<UserRank> {
  return request(`/leaderboard/${tournamentId}/me`);
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
