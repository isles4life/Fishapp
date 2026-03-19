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

  moderateBulk: (submissionIds: string[], action: string, note?: string) =>
    apiFetch<{ succeeded: number; failed: number }>('/admin/moderation/bulk', {
      method: 'POST',
      body: JSON.stringify({ submissionIds, action, note }),
    }),

  getTournaments: () => apiFetch<any[]>('/tournaments'),

  getRegions: () => apiFetch<any[]>('/users/regions'),

  createTournament: (data: any) =>
    apiFetch('/tournaments', { method: 'POST', body: JSON.stringify(data) }),

  openTournament: (id: string) => apiFetch(`/tournaments/${id}/open`, { method: 'PATCH' }),

  closeTournament: (id: string) => apiFetch(`/tournaments/${id}/close`, { method: 'PATCH' }),

  announceTournament: (id: string, title: string, message: string) =>
    apiFetch<{ sent: number }>(`/tournaments/${id}/announce`, { method: 'POST', body: JSON.stringify({ title, message }) }),

  drawPrizeWinner: (id: string, weighted = false) =>
    apiFetch<{ winner: { userId: string; displayName: string; email: string }; pool: number }>(
      `/tournaments/${id}/draw`, { method: 'POST', body: JSON.stringify({ weighted }) }
    ),

  getLeaderboard: (tournamentId: string) =>
    apiFetch<any[]>(`/leaderboard/${tournamentId}`),

  getUsers: () => apiFetch<any[]>('/users'),

  updateUser: (id: string, data: { role?: 'USER' | 'ADMIN'; suspended?: boolean; regionId?: string }) =>
    apiFetch(`/users/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  resetPassword: (id: string, password: string) =>
    apiFetch(`/users/${id}/password`, { method: 'PATCH', body: JSON.stringify({ password }) }),

  getSubmissionsHistory: (tournamentId?: string, status?: string, page = 1, limit = 50) => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (tournamentId) params.set('tournamentId', tournamentId);
    if (status) params.set('status', status);
    return apiFetch<{ data: any[]; total: number }>(`/admin/moderation/submissions?${params}`);
  },

  getAuditLog: (page = 1, limit = 50) =>
    apiFetch<{ data: any[]; total: number }>(`/admin/audit?page=${page}&limit=${limit}`),

  impersonateUser: (id: string) =>
    apiFetch<{ token: string; userId: string }>(`/users/${id}/impersonate`, { method: 'POST' }),

  issueWarning: (userId: string, level: 'MINOR' | 'MAJOR' | 'FINAL', reason: string) =>
    apiFetch('/admin/warnings', { method: 'POST', body: JSON.stringify({ userId, level, reason }) }),

  getUserWarnings: (userId: string) =>
    apiFetch<any[]>(`/admin/warnings?userId=${userId}`),

  updateTournament: (id: string, data: { description?: string; directorId?: string | null }) =>
    apiFetch(`/tournaments/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  generateCheckInCode: (id: string) =>
    apiFetch<{ id: string; checkInCode: string }>(`/tournaments/${id}/check-in-code`, { method: 'PATCH' }),

  getCheckIns: (id: string) =>
    apiFetch<{ count: number; checkIns: { id: string; checkedInAt: string; user: { displayName: string; email: string } }[] }>(`/tournaments/${id}/check-ins`),

  getTournamentAdminRequests: () =>
    apiFetch<any[]>('/admin/tournament-admin/requests'),

  approveTournamentAdminRequest: (id: string) =>
    apiFetch<{ ok: boolean }>(`/admin/tournament-admin/requests/${id}/approve`, { method: 'PATCH' }),

  rejectTournamentAdminRequest: (id: string, note?: string) =>
    apiFetch<{ ok: boolean }>(`/admin/tournament-admin/requests/${id}/reject`, {
      method: 'PATCH',
      body: JSON.stringify({ note }),
    }),
};
