-- Add new enum value
ALTER TYPE "UserRole" ADD VALUE 'TOURNAMENT_ADMIN';

-- New requests table
CREATE TABLE "TournamentAdminRequest" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "tournamentId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "message" VARCHAR(500),
  "reviewedById" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TournamentAdminRequest_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TournamentAdminRequest_userId_tournamentId_key" ON "TournamentAdminRequest"("userId", "tournamentId");
CREATE INDEX "TournamentAdminRequest_status_idx" ON "TournamentAdminRequest"("status");

ALTER TABLE "TournamentAdminRequest" ADD CONSTRAINT "TournamentAdminRequest_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TournamentAdminRequest" ADD CONSTRAINT "TournamentAdminRequest_tournamentId_fkey"
  FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TournamentAdminRequest" ADD CONSTRAINT "TournamentAdminRequest_reviewedById_fkey"
  FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
