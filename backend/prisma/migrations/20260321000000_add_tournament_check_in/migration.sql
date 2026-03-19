ALTER TABLE "Tournament" ADD COLUMN "checkInCode" TEXT;
CREATE UNIQUE INDEX "Tournament_checkInCode_key" ON "Tournament"("checkInCode");

CREATE TABLE "TournamentCheckIn" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "tournamentId" TEXT NOT NULL,
  "checkedInAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TournamentCheckIn_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TournamentCheckIn_userId_tournamentId_key" ON "TournamentCheckIn"("userId", "tournamentId");
CREATE INDEX "TournamentCheckIn_tournamentId_idx" ON "TournamentCheckIn"("tournamentId");

ALTER TABLE "TournamentCheckIn" ADD CONSTRAINT "TournamentCheckIn_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TournamentCheckIn" ADD CONSTRAINT "TournamentCheckIn_tournamentId_fkey"
  FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;
