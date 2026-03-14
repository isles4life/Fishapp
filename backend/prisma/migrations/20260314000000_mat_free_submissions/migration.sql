-- Mat-free submissions: make matSerialId, photo1Key, and imageHash1 optional
ALTER TABLE "Submission" ALTER COLUMN "matSerialId" DROP NOT NULL;
ALTER TABLE "Submission" ALTER COLUMN "photo1Key" DROP NOT NULL;
ALTER TABLE "Submission" ALTER COLUMN "imageHash1" DROP NOT NULL;
