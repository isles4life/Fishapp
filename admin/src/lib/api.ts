const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

function authHeader(): HeadersInit {
  const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...authHeader(), ...init?.headers },
  });
  if (!res.ok) throw new Error(`API ${path} → ${res.status}`);
  return res.json();
}

export const api = {
  getPending: (tournamentId?: string) =>
    apiFetch<any[]>(`/admin/moderation/pending${tournamentId ? `?tournamentId=${tournamentId}` : ''}`),

  getFlagged: () => apiFetch<any[]>('/admin/moderation/flagged'),

  getSubmission: (id: string) => apiFetch<any>(`/admin/moderation/${id}`),

  moderate: (id: string, action: string, note?: string) =>
    apiFetch(`/admin/moderation/${id}/action`, {
      method: 'POST',
      body: JSON.stringify({ action, note }),
    }),

  getTournaments: () => apiFetch<any[]>('/tournaments'),

  getRegions: () => apiFetch<any[]>('/users/regions'),

  createTournament: (data: any) =>
    apiFetch('/tournaments', { method: 'POST', body: JSON.stringify(data) }),

  openTournament: (id: string) => apiFetch(`/tournaments/${id}/open`, { method: 'PATCH' }),

  closeTournament: (id: string) => apiFetch(`/tournaments/${id}/close`, { method: 'PATCH' }),

  getLeaderboard: (tournamentId: string) =>
    apiFetch<any[]>(`/leaderboard/${tournamentId}`),

  getUsers: () => apiFetch<any[]>('/users'),

  updateUser: (id: string, data: { role?: 'USER' | 'ADMIN'; suspended?: boolean }) =>
    apiFetch(`/users/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
};
