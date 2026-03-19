ALTER TABLE "Submission" ADD COLUMN "flagSuspectSpecies" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Submission" ADD COLUMN "aiSuggestedSpecies" TEXT;
