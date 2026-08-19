-- CreateEnum
CREATE TYPE "CompetitionSeasonStatus" AS ENUM ('DRAFT', 'ACTIVE', 'FINISHED');

-- CreateEnum
CREATE TYPE "MatchFormat" AS ENUM ('SINGLE_ROUND_ROBIN', 'DOUBLE_ROUND_ROBIN');

-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('UPCOMING', 'COMPLETED');

-- CreateTable
CREATE TABLE "CompetitionSeason" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "CompetitionSeasonStatus" NOT NULL DEFAULT 'DRAFT',
    "format" "MatchFormat" NOT NULL DEFAULT 'DOUBLE_ROUND_ROBIN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompetitionSeason_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Match" (
    "id" TEXT NOT NULL,
    "competitionSeasonId" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "matchday" INTEGER NOT NULL,
    "homeClubId" TEXT NOT NULL,
    "awayClubId" TEXT NOT NULL,
    "homeGoals" INTEGER,
    "awayGoals" INTEGER,
    "status" "MatchStatus" NOT NULL DEFAULT 'UPCOMING',
    "playedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Match_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Season" ADD COLUMN "competitionSeasonId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "CompetitionSeason_name_key" ON "CompetitionSeason"("name");

-- CreateIndex
CREATE INDEX "CompetitionSeason_status_idx" ON "CompetitionSeason"("status");

-- CreateIndex
CREATE INDEX "Match_competitionSeasonId_idx" ON "Match"("competitionSeasonId");

-- CreateIndex
CREATE INDEX "Match_seasonId_idx" ON "Match"("seasonId");

-- CreateIndex
CREATE INDEX "Match_leagueId_idx" ON "Match"("leagueId");

-- CreateIndex
CREATE INDEX "Match_homeClubId_idx" ON "Match"("homeClubId");

-- CreateIndex
CREATE INDEX "Match_awayClubId_idx" ON "Match"("awayClubId");

-- CreateIndex
CREATE INDEX "Match_status_idx" ON "Match"("status");

-- CreateIndex
CREATE INDEX "Match_matchday_idx" ON "Match"("matchday");

-- CreateIndex
CREATE INDEX "Match_seasonId_matchday_idx" ON "Match"("seasonId", "matchday");

-- CreateIndex
CREATE INDEX "Season_competitionSeasonId_idx" ON "Season"("competitionSeasonId");

-- AddForeignKey
ALTER TABLE "Season" ADD CONSTRAINT "Season_competitionSeasonId_fkey" FOREIGN KEY ("competitionSeasonId") REFERENCES "CompetitionSeason"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_competitionSeasonId_fkey" FOREIGN KEY ("competitionSeasonId") REFERENCES "CompetitionSeason"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_homeClubId_fkey" FOREIGN KEY ("homeClubId") REFERENCES "Club"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_awayClubId_fkey" FOREIGN KEY ("awayClubId") REFERENCES "Club"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
