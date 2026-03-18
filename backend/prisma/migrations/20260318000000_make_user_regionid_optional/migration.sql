-- Make User.regionId optional (GPS-based region detection replaces fixed region assignment)
ALTER TABLE "User" ALTER COLUMN "regionId" DROP NOT NULL;
