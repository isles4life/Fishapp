-- CreateTable
CREATE TABLE "TournamentPostComment" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "body" VARCHAR(500) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TournamentPostComment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TournamentPostComment_postId_createdAt_idx" ON "TournamentPostComment"("postId", "createdAt");

-- AddForeignKey
ALTER TABLE "TournamentPostComment" ADD CONSTRAINT "TournamentPostComment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "TournamentPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentPostComment" ADD CONSTRAINT "TournamentPostComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
