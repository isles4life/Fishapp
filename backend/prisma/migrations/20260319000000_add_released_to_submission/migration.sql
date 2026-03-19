-- Add catch-and-release flag to Submission
ALTER TABLE "Submission" ADD COLUMN "released" BOOLEAN NOT NULL DEFAULT false;
