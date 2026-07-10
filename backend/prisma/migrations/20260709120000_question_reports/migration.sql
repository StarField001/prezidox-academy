-- CreateTable
CREATE TABLE "QuestionReport" (
    "id" TEXT NOT NULL,
    "questionId" TEXT,
    "userId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "comment" TEXT,
    "mode" TEXT,
    "page" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "QuestionReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "QuestionReport_status_idx" ON "QuestionReport"("status");

-- CreateIndex
CREATE INDEX "QuestionReport_questionId_idx" ON "QuestionReport"("questionId");
