-- Tournament detail fields
ALTER TABLE "Tournament" ADD COLUMN "description" TEXT;
ALTER TABLE "Tournament" ADD COLUMN "directorId" TEXT;
ALTER TABLE "Tournament" ADD CONSTRAINT "Tournament_directorId_fkey"
  FOREIGN KEY ("directorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- TournamentPost feed
CREATE TYPE "TournamentPostType" AS ENUM ('CATCH', 'ANNOUNCEMENT', 'CHECK_IN', 'ANGLER_POST');

CREATE TABLE "TournamentPost" (
  "id"           TEXT NOT NULL,
  "tournamentId" TEXT NOT NULL,
  "userId"       TEXT NOT NULL,
  "type"         "TournamentPostType" NOT NULL,
  "body"         VARCHAR(1000),
  "photoKey"     TEXT,
  "submissionId" TEXT,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "TournamentPost_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TournamentPost_tournamentId_fkey"
    FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "TournamentPost_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "TournamentPost_submissionId_fkey"
    FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "TournamentPost_submissionId_key" UNIQUE ("submissionId")
);

CREATE INDEX "TournamentPost_tournamentId_createdAt_idx"
  ON "TournamentPost"("tournamentId", "createdAt" DESC);
