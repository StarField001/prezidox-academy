-- AlterTable
ALTER TABLE "User" ADD COLUMN     "battlePoints" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "battleRank" TEXT NOT NULL DEFAULT 'Recruit',
ADD COLUMN     "examLeaveActive" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "examLeaveEarnedAt" TIMESTAMP(3),
ADD COLUMN     "profileComplete" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "studyHallId" TEXT,
ADD COLUMN     "studyHallName" TEXT NOT NULL DEFAULT 'Preparatory';

-- CreateTable
CREATE TABLE "AcademicPoints" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "sessionId" TEXT,
    "weekKey" TEXT NOT NULL,
    "monthKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AcademicPoints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcademicRank" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "totalPoints" INTEGER NOT NULL DEFAULT 0,
    "weekPoints" INTEGER NOT NULL DEFAULT 0,
    "monthPoints" INTEGER NOT NULL DEFAULT 0,
    "rank" TEXT NOT NULL DEFAULT 'Freshman',
    "weekRank" INTEGER,
    "monthRank" INTEGER,
    "allTimeRank" INTEGER,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AcademicRank_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeasonPoints" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "weekKey" TEXT NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 0,
    "hallId" TEXT,
    "position" INTEGER,

    CONSTRAINT "SeasonPoints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudyHall" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "weekKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudyHall_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudyHallStanding" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "hallId" TEXT NOT NULL,
    "weekKey" TEXT NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 0,
    "position" INTEGER,
    "promoted" BOOLEAN NOT NULL DEFAULT false,
    "relegated" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "StudyHallStanding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BattlePoints" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "battleId" TEXT,
    "weekKey" TEXT NOT NULL,
    "monthKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BattlePoints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BattleRank" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "totalBattlePoints" INTEGER NOT NULL DEFAULT 0,
    "rank" TEXT NOT NULL DEFAULT 'Recruit',
    "wins" INTEGER NOT NULL DEFAULT 0,
    "losses" INTEGER NOT NULL DEFAULT 0,
    "draws" INTEGER NOT NULL DEFAULT 0,
    "winRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currentWinStreak" INTEGER NOT NULL DEFAULT 0,
    "bestWinStreak" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BattleRank_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Battle" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "challengerId" TEXT NOT NULL,
    "opponentId" TEXT,
    "isAI" BOOLEAN NOT NULL DEFAULT false,
    "aiLevel" TEXT,
    "subject" TEXT NOT NULL,
    "questionCount" INTEGER NOT NULL,
    "questions" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "challengerScore" INTEGER,
    "opponentScore" INTEGER,
    "winnerId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Battle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BattleAnswer" (
    "id" TEXT NOT NULL,
    "battleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL,
    "timeTaken" INTEGER NOT NULL,
    "answeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BattleAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TopicMastery" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "level" TEXT NOT NULL DEFAULT 'Not Started',
    "bestScore" INTEGER NOT NULL DEFAULT 0,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TopicMastery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "YearVaultCompletion" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "score" INTEGER NOT NULL,
    "passedCutoff" BOOLEAN NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "YearVaultCompletion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpeedStats" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "accuracy" DOUBLE PRECISION NOT NULL,
    "avgTimePerQ" DOUBLE PRECISION NOT NULL,
    "fastestAnswer" DOUBLE PRECISION NOT NULL,
    "slowestAnswer" DOUBLE PRECISION NOT NULL,
    "bestStreak" INTEGER NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SpeedStats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tournament" (
    "id" TEXT NOT NULL,
    "weekKey" TEXT NOT NULL,
    "division" TEXT NOT NULL,
    "bracket" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "winnerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tournament_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubjectMastery" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "level" TEXT NOT NULL DEFAULT 'Unranked',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubjectMastery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StreakRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "currentStreak" INTEGER NOT NULL DEFAULT 0,
    "bestStreak" INTEGER NOT NULL DEFAULT 0,
    "examLeaveActive" BOOLEAN NOT NULL DEFAULT false,
    "examLeaveEarnedAt" TIMESTAMP(3),
    "lastStudyDate" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StreakRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "ctaText" TEXT,
    "ctaUrl" TEXT,
    "channel" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminBroadcast" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "targetAudience" TEXT NOT NULL,
    "recipientCount" INTEGER NOT NULL DEFAULT 0,
    "channels" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminBroadcast_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AcademicRank_userId_key" ON "AcademicRank"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "SeasonPoints_userId_weekKey_key" ON "SeasonPoints"("userId", "weekKey");

-- CreateIndex
CREATE UNIQUE INDEX "StudyHallStanding_userId_weekKey_key" ON "StudyHallStanding"("userId", "weekKey");

-- CreateIndex
CREATE UNIQUE INDEX "BattleRank_userId_key" ON "BattleRank"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Battle_code_key" ON "Battle"("code");

-- CreateIndex
CREATE UNIQUE INDEX "TopicMastery_userId_subject_topic_key" ON "TopicMastery"("userId", "subject", "topic");

-- CreateIndex
CREATE UNIQUE INDEX "YearVaultCompletion_userId_category_year_key" ON "YearVaultCompletion"("userId", "category", "year");

-- CreateIndex
CREATE UNIQUE INDEX "SubjectMastery_userId_subject_key" ON "SubjectMastery"("userId", "subject");

-- CreateIndex
CREATE UNIQUE INDEX "StreakRecord_userId_key" ON "StreakRecord"("userId");
