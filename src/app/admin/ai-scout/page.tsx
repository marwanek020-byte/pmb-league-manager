import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AdminAiScoutManager } from "@/components/admin/AdminAiScoutManager";

export const dynamic = "force-dynamic";

export default async function AdminAiScoutPage() {
  const session = await auth();

  if (!session || session.user.role !== "ADMINISTRATOR") {
    redirect("/unauthorized");
  }

  const leagues = await prisma.league.findMany({
    orderBy: { name: "asc" },
    include: {
      clubs: {
        orderBy: { name: "asc" },
        include: {
          manager: {
            select: {
              id: true,
              username: true,
            },
          },
          players: {
            where: { status: "REGISTERED" },
            select: { id: true },
          },
        },
      },
    },
  });

  const formattedLeagues = leagues.map((league) => ({
    id: league.id,
    name: league.name,
    country: league.country,
    clubs: league.clubs.map((club) => ({
      id: club.id,
      name: club.name,
      logo: club.logo,
      managerId: club.manager?.id ?? null,
      managerUsername: club.manager?.username ?? null,
      registeredPlayerCount: club.players.length,
      budget: Number(club.budget),
      aiScoutEnabled: club.aiScoutEnabled,
      aiScoutTier: club.aiScoutTier,
    })),
  }));

  let totalClubs = 0;
  let enabledClubs = 0;

  for (const league of formattedLeagues) {
    for (const club of league.clubs) {
      totalClubs++;
      if (club.aiScoutEnabled) {
        enabledClubs++;
      }
    }
  }

  return (
    <div className="space-y-6">
      <AdminAiScoutManager
        initialLeagues={formattedLeagues}
        initialStats={{
          totalLeagues: leagues.length,
          totalClubs,
          enabledClubs,
          disabledClubs: totalClubs - enabledClubs,
        }}
      />
    </div>
  );
}
