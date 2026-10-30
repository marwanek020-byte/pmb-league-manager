-- Add new BudgetTransactionType values
ALTER TYPE "BudgetTransactionType" ADD VALUE IF NOT EXISTS 'MISSION_REWARD';
ALTER TYPE "BudgetTransactionType" ADD VALUE IF NOT EXISTS 'MISSION_PENALTY';

-- Create Mission enums
DO $$ BEGIN
    CREATE TYPE "MissionCategory" AS ENUM ('MATCHDAY', 'TRANSFER', 'LONG_TERM');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "MissionStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'FAILED', 'CANCELLED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "MissionConditionType" AS ENUM (
        'SCORE_AT_LEAST',
        'CONCEDE_AT_MOST',
        'WIN_MATCH',
        'DRAW_OR_WIN',
        'CLEAN_SHEET',
        'WIN_BY_MARGIN',
        'SCORE_AND_DRAW_OR_WIN',
        'CONCEDE_MAX_AND_WIN',
        'WIN_STREAK',
        'SCORE_TOTAL',
        'CONCEDE_TOTAL_MAX',
        'CLEAN_SHEETS_COUNT',
        'UNBEATEN_STREAK',
        'COMPLETE_TRANSFERS',
        'SIGN_PLAYER_VALUE'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create ClubMission table
CREATE TABLE IF NOT EXISTS "ClubMission" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "category" "MissionCategory" NOT NULL DEFAULT 'MATCHDAY',
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "conditionType" "MissionConditionType" NOT NULL,
    "targetValue" INTEGER,
    "targetValueDecimal" DECIMAL(14,2),
    "currentProgress" INTEGER NOT NULL DEFAULT 0,
    "rewardAmount" DECIMAL(14,2) NOT NULL,
    "penaltyAmount" DECIMAL(14,2) NOT NULL,
    "status" "MissionStatus" NOT NULL DEFAULT 'ACTIVE',
    "startMatchday" INTEGER,
    "endMatchday" INTEGER,
    "matchId" TEXT,
    "pairedMissionId" TEXT,
    "seasonId" TEXT,
    "leagueId" TEXT,
    "completedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClubMission_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ClubMission_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ClubMission_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ClubMission_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ClubMission_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS "ClubMission_clubId_idx" ON "ClubMission"("clubId");
CREATE INDEX IF NOT EXISTS "ClubMission_matchId_idx" ON "ClubMission"("matchId");
CREATE INDEX IF NOT EXISTS "ClubMission_seasonId_idx" ON "ClubMission"("seasonId");
CREATE INDEX IF NOT EXISTS "ClubMission_leagueId_idx" ON "ClubMission"("leagueId");
CREATE INDEX IF NOT EXISTS "ClubMission_status_idx" ON "ClubMission"("status");
CREATE INDEX IF NOT EXISTS "ClubMission_category_idx" ON "ClubMission"("category");

