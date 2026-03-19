-- Add ScoringMethod enum
CREATE TYPE "ScoringMethod" AS ENUM ('LENGTH', 'WEIGHT', 'FISH_COUNT', 'SPECIES_COUNT');

-- Add scoringMethod to Tournament
ALTER TABLE "Tournament" ADD COLUMN "scoringMethod" "ScoringMethod" NOT NULL DEFAULT 'LENGTH';

-- Add fishWeightOz to Submission
ALTER TABLE "Submission" ADD COLUMN "fishWeightOz" DOUBLE PRECISION;

-- Add score to LeaderboardEntry
ALTER TABLE "LeaderboardEntry" ADD COLUMN "score" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- Back-fill score from existing fishLengthCm (all existing tournaments are LENGTH-scored)
UPDATE "LeaderboardEntry" SET "score" = "fishLengthCm";
