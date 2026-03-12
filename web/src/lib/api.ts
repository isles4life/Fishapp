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

export const api = {
  getRegions: () => apiFetch<Region[]>('/users/regions'),
  getActiveTournament: () => apiFetch<Tournament>('/tournaments/open'),
  getLeaderboard: (id: string) => apiFetch<LeaderboardEntry[]>(`/leaderboard/${id}`),
  login: (email: string, password: string) =>
    apiFetch<AuthResponse>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  register: (email: string, password: string, displayName: string, regionId: string) =>
    apiFetch<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, displayName, regionId }),
    }),
};
