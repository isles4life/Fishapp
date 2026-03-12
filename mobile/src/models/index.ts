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
