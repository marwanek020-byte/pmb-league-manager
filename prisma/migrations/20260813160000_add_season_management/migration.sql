CREATE TYPE "SeasonStatus" AS ENUM (
  'DRAFT',
  'ACTIVE',
  'FINISHED'
);

CREATE TABLE "Season" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "leagueId" TEXT NOT NULL,
  "startDate" TIMESTAMP(3),
  "endDate" TIMESTAMP(3),
  "status" "SeasonStatus" NOT NULL DEFAULT 'DRAFT',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Season_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SeasonClassification" (
  "id" TEXT NOT NULL,
  "seasonId" TEXT NOT NULL,
  "clubId" TEXT NOT NULL,
  "position" INTEGER NOT NULL,
  "points" INTEGER,
  "played" INTEGER,
  "wins" INTEGER,
  "draws" INTEGER,
  "losses" INTEGER,
  "goalDifference" INTEGER,
  "goalsFor" INTEGER,
  "goalsAgainst" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "SeasonClassification_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Season_leagueId_name_key"
ON "Season"("leagueId", "name");

CREATE INDEX "Season_leagueId_idx"
ON "Season"("leagueId");

CREATE INDEX "Season_status_idx"
ON "Season"("status");

CREATE UNIQUE INDEX "SeasonClassification_seasonId_clubId_key"
ON "SeasonClassification"("seasonId", "clubId");

CREATE UNIQUE INDEX "SeasonClassification_seasonId_position_key"
ON "SeasonClassification"("seasonId", "position");

CREATE INDEX "SeasonClassification_seasonId_idx"
ON "SeasonClassification"("seasonId");

CREATE INDEX "SeasonClassification_clubId_idx"
ON "SeasonClassification"("clubId");

ALTER TABLE "Season"
ADD CONSTRAINT "Season_leagueId_fkey"
FOREIGN KEY ("leagueId")
REFERENCES "League"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;

ALTER TABLE "SeasonClassification"
ADD CONSTRAINT "SeasonClassification_seasonId_fkey"
FOREIGN KEY ("seasonId")
REFERENCES "Season"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

ALTER TABLE "SeasonClassification"
ADD CONSTRAINT "SeasonClassification_clubId_fkey"
FOREIGN KEY ("clubId")
REFERENCES "Club"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;
