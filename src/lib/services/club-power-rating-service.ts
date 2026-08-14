import { prisma } from "@/lib/prisma";

function getRatingChange(position: number): number {
  if (position === 1) return 100;
  if (position === 2) return 70;
  if (position === 3) return 50;
  if (position === 4) return 35;
  if (position >= 5 && position <= 8) return 20;
  if (position >= 9 && position <= 12) return 10;
  if (position >= 13 && position <= 16) return 5;

  return 0;
}

/**
 * Updates Club Power Rating after a season is officially finished.
 *
 * This intentionally does NOT use a long interactive Prisma transaction.
 * Neon can close long-running interactive transactions, which causes P2028.
 */
export async function updateClubPowerRatingsForSeason(
  seasonId: string
) {
  const season = await prisma.season.findUnique({
    where: {
      id: seasonId,
    },
    include: {
      league: {
        select: {
          id: true,
          name: true,
        },
      },
      classifications: {
        orderBy: {
          position: "asc",
        },
        select: {
          clubId: true,
          position: true,
        },
      },
    },
  });

  if (!season) {
    throw new Error("Season not found.");
  }

  if (season.status !== "FINISHED") {
    throw new Error(
      "Club Power Rating can only be updated for a finished season."
    );
  }

  if (season.classifications.length === 0) {
    throw new Error(
      "Cannot update Club Power Rating without a final classification."
    );
  }

  const updatedRatings = [];

  for (const classification of season.classifications) {
    const position = classification.position;
    const ratingChange = getRatingChange(position);

    const existing = await prisma.clubPowerRating.findUnique({
      where: {
        clubId: classification.clubId,
      },
    });

    const currentRating = existing?.rating ?? 1000;

    const newRating = currentRating + ratingChange;
    const seasonsPlayed = (existing?.seasonsPlayed ?? 0) + 1;
    const titles =
      (existing?.titles ?? 0) + (position === 1 ? 1 : 0);
    const topThree =
      (existing?.topThree ?? 0) + (position <= 3 ? 1 : 0);
    const topFive =
      (existing?.topFive ?? 0) + (position <= 5 ? 1 : 0);

    const rating = await prisma.clubPowerRating.upsert({
      where: {
        clubId: classification.clubId,
      },
      create: {
        clubId: classification.clubId,
        rating: newRating,
        seasonsPlayed,
        titles,
        topThree,
        topFive,
      },
      update: {
        rating: newRating,
        seasonsPlayed,
        titles,
        topThree,
        topFive,
      },
    });

    updatedRatings.push({
      clubId: classification.clubId,
      position,
      ratingChange,
      rating: rating.rating,
      seasonsPlayed: rating.seasonsPlayed,
      titles: rating.titles,
      topThree: rating.topThree,
      topFive: rating.topFive,
    });
  }

  return {
    seasonId: season.id,
    seasonName: season.name,
    leagueName: season.league.name,
    updatedRatings,
  };
}