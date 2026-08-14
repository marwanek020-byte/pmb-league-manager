import { prisma } from "@/lib/prisma";
import { SeasonsManager } from "@/components/admin/SeasonsManager";

export const dynamic = "force-dynamic";

export default async function AdminSeasonsPage() {
  const [leagues, seasons] = await Promise.all([
    prisma.league.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        country: true,
        _count: {
          select: {
            clubs: true,
          },
        },
      },
    }),

    prisma.season.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        league: {
          select: {
            id: true,
            name: true,
            country: true,
          },
        },
        _count: {
          select: {
            classifications: true,
          },
        },
      },
    }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">
          Season Management
        </h1>

        <p className="mt-1 text-sm text-gray-400">
          Manage league seasons and record official final classifications.
        </p>
      </div>

      <SeasonsManager
        initialLeagues={leagues}
        initialSeasons={seasons.map((season) => ({
          id: season.id,
          name: season.name,
          status: season.status,
          startDate: season.startDate?.toISOString() ?? null,
          endDate: season.endDate?.toISOString() ?? null,
          league: season.league,
          classificationCount: season._count.classifications,
        }))}
      />
    </div>
  );
}