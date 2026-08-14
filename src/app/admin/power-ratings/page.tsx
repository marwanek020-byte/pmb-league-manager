import { prisma } from "@/lib/prisma";
import { ClubPowerRatingManager } from "@/components/admin/ClubPowerRatingManager";

export const dynamic = "force-dynamic";

export default async function AdminPowerRatingsPage() {
  const ratings = await prisma.clubPowerRating.findMany({
    orderBy: [
      { rating: "desc" },
      { titles: "desc" },
      { topThree: "desc" },
      { topFive: "desc" },
    ],
    include: {
      club: {
        select: {
          id: true,
          name: true,
          logo: true,
          league: {
            select: {
              id: true,
              name: true,
              country: true,
            },
          },
        },
      },
    },
  });

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-pmb-gold">
          PMB Historical Rankings
        </p>

        <h1 className="mt-2 text-3xl font-bold text-white">
          Club Power Rating
        </h1>

        <p className="mt-2 max-w-2xl text-sm text-gray-400">
          A historical ranking of clubs based on their performances
          across completed PMB seasons.
        </p>
      </div>

      <ClubPowerRatingManager
        initialRatings={ratings.map((item) => ({
          id: item.id,
          clubId: item.clubId,
          rating: item.rating,
          seasonsPlayed: item.seasonsPlayed,
          titles: item.titles,
          topThree: item.topThree,
          topFive: item.topFive,
          club: {
            id: item.club.id,
            name: item.club.name,
            logo: item.club.logo,
            league: item.club.league,
          },
        }))}
      />
    </div>
  );
}