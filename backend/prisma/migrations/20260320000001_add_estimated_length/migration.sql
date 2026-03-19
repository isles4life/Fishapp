ALTER TABLE "Submission" ADD COLUMN "flagSuspectLength" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Submission" ADD COLUMN "estimatedLengthCm" DOUBLE PRECISION;
