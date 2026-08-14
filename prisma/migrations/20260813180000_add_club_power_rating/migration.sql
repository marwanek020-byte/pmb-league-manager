CREATE TABLE "ClubPowerRating" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL DEFAULT 1000,
    "seasonsPlayed" INTEGER NOT NULL DEFAULT 0,
    "titles" INTEGER NOT NULL DEFAULT 0,
    "topThree" INTEGER NOT NULL DEFAULT 0,
    "topFive" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClubPowerRating_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ClubPowerRating_clubId_key"
ON "ClubPowerRating"("clubId");

CREATE INDEX "ClubPowerRating_rating_idx"
ON "ClubPowerRating"("rating");

ALTER TABLE "ClubPowerRating"
ADD CONSTRAINT "ClubPowerRating_clubId_fkey"
FOREIGN KEY ("clubId")
REFERENCES "Club"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;