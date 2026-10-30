import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isAnyAdmin, canAccessLeague } from "@/lib/admin-auth";
import { AdminMissionsClient } from "@/components/admin/AdminMissionsClient";

export const dynamic = "force-dynamic";

export default async function AdminMissionsPage() {
  const session = await auth();

  if (!session?.user || !isAnyAdmin(session.user)) {
    redirect("/login");
  }

  // Fetch leagues and active seasons for dropdowns
  const leagues = await prisma.league.findMany({
    include: {
      clubs: { select: { id: true, name: true, logo: true } },
      seasons: {
        where: { status: { in: ["ACTIVE", "DRAFT"] } },
        select: { id: true, name: true, status: true },
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: { name: "asc" },
  });

  const accessibleLeagues = leagues.filter((l) =>
    canAccessLeague(session.user, l.id)
  );

  // Fetch initial missions list
  const missions = await prisma.clubMission.findMany({
    include: {
      club: { select: { id: true, name: true, logo: true, leagueId: true } },
      match: {
        select: {
          id: true,
          matchday: true,
          status: true,
          homeGoals: true,
          awayGoals: true,
          homeClub: { select: { id: true, name: true, logo: true } },
          awayClub: { select: { id: true, name: true, logo: true } },
        },
      },
      league: { select: { id: true, name: true } },
    },
    orderBy: [{ createdAt: "desc" }],
    take: 100,
  });

  // Fetch paired missions
  const pairedIds = missions
    .map((m) => m.pairedMissionId)
    .filter((id): id is string => Boolean(id));

  const pairedMissions =
    pairedIds.length > 0
      ? await prisma.clubMission.findMany({
          where: { id: { in: pairedIds } },
          include: {
            club: { select: { name: true, logo: true } },
          },
        })
      : [];

  const pairedMap = new Map(pairedMissions.map((p) => [p.id, p]));

  const enrichedMissions = missions.map((m) => {
    const opp = m.pairedMissionId ? pairedMap.get(m.pairedMissionId) : null;
    return {
      id: m.id,
      clubId: m.clubId,
      clubName: m.club.name,
      clubLogo: m.club.logo,
      leagueId: m.leagueId,
      leagueName: m.league?.name || null,
      category: m.category,
      title: m.title,
      description: m.description,
      conditionType: m.conditionType,
      targetValue: m.targetValue,
      currentProgress: m.currentProgress,
      rewardAmount: Number(m.rewardAmount),
      penaltyAmount: Number(m.penaltyAmount),
      status: m.status,
      startMatchday: m.startMatchday,
      endMatchday: m.endMatchday,
      createdAt: m.createdAt.toISOString(),
      completedAt: m.completedAt?.toISOString() || null,
      failedAt: m.failedAt?.toISOString() || null,
      match: m.match,
      opponentMission: opp
        ? {
            clubName: opp.club.name,
            clubLogo: opp.club.logo,
            title: opp.title,
          }
        : null,
    };
  });

  return (
    <div className="space-y-6 pb-16">
      {/* Admin Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin/dashboard"
              className="text-xs font-bold uppercase tracking-wider text-pmb-gold hover:underline"
            >
              ← Admin Dashboard
            </Link>
          </div>
          <h1 className="mt-1 text-2xl font-black uppercase tracking-tight text-white sm:text-3xl">
            Missions &amp; Bounties Control
          </h1>
          <p className="mt-1 text-xs text-gray-400">
            Generate relative matchday missions, campaign goals, and manage financial stakes across all clubs.
          </p>
        </div>
      </div>

      <AdminMissionsClient
        leagues={accessibleLeagues}
        initialMissions={enrichedMissions}
      />
    </div>
  );
}

