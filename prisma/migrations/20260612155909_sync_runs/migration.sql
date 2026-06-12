-- CreateTable
CREATE TABLE "SyncRun" (
    "id" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "ranAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ranBy" TEXT,
    "adsSeen" INTEGER NOT NULL,
    "matched" INTEGER NOT NULL,
    "newlyMarked" INTEGER NOT NULL,
    "unmatched" TEXT[],

    CONSTRAINT "SyncRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SyncRun_ranAt_idx" ON "SyncRun"("ranAt");
