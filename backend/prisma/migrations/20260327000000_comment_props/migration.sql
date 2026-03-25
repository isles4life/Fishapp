-- CreateTable
CREATE TABLE "CatchCommentProp" (
    "id" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CatchCommentProp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TournamentPostCommentProp" (
    "id" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TournamentPostCommentProp_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CatchCommentProp_commentId_idx" ON "CatchCommentProp"("commentId");

-- CreateIndex
CREATE UNIQUE INDEX "CatchCommentProp_commentId_userId_key" ON "CatchCommentProp"("commentId", "userId");

-- CreateIndex
CREATE INDEX "TournamentPostCommentProp_commentId_idx" ON "TournamentPostCommentProp"("commentId");

-- CreateIndex
CREATE UNIQUE INDEX "TournamentPostCommentProp_commentId_userId_key" ON "TournamentPostCommentProp"("commentId", "userId");

-- AddForeignKey
ALTER TABLE "CatchCommentProp" ADD CONSTRAINT "CatchCommentProp_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "CatchComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatchCommentProp" ADD CONSTRAINT "CatchCommentProp_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentPostCommentProp" ADD CONSTRAINT "TournamentPostCommentProp_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "TournamentPostComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentPostCommentProp" ADD CONSTRAINT "TournamentPostCommentProp_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
