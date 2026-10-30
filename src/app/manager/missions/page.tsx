import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ClubBadge } from "@/components/ClubBadge";
import { MissionCard, MissionData } from "@/components/manager/MissionCard";
import { generateMatchdayMissions } from "@/lib/services/mission-service";

export const dynamic = "force-dynamic";

export default async function ManagerMissionsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role !== "CLUB_MANAGER") {
    redirect("/unauthorized");
  }

  const clubId = session.user.clubId;
  if (!clubId) {
    redirect("/unauthorized");
  }

  const club = await prisma.club.findUnique({
    where: { id: clubId },
    include: {
      league: true,
      powerRating: true,
    },
  });

  if (!club) {
    redirect("/unauthorized");
  }

  // Auto-generate missions on-demand if upcoming match doesn't have one yet
  try {
    const nextMatch = await prisma.match.findFirst({
      where: {
        status: "UPCOMING",
        OR: [{ homeClubId: clubId }, { awayClubId: clubId }],
      },
      orderBy: { matchday: "asc" },
    });

    if (nextMatch) {
      const existing = await prisma.clubMission.findFirst({
        where: { clubId, matchId: nextMatch.id },
      });
      if (!existing) {
        await generateMatchdayMissions({
          seasonId: nextMatch.seasonId,
          matchday: nextMatch.matchday,
          leagueId: nextMatch.leagueId,
        });
      }
    }
  } catch (err) {
    console.error("Auto-generation of missions failed:", err);
  }

  // Fetch all missions for this club
  const rawMissions = await prisma.clubMission.findMany({
    where: { clubId },
    include: {
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
    },
    orderBy: [{ createdAt: "desc" }],
  });

  // Fetch paired missions
  const pairedIds = rawMissions
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

  const missions: MissionData[] = rawMissions.map((m) => {
    const opp = m.pairedMissionId ? pairedMap.get(m.pairedMissionId) : null;
    return {
      id: m.id,
      category: m.category as any,
      title: m.title,
      description: m.description,
      conditionType: m.conditionType,
      targetValue: m.targetValue,
      currentProgress: m.currentProgress,
      rewardAmount: m.rewardAmount.toString(),
      penaltyAmount: m.penaltyAmount.toString(),
      status: m.status as any,
      startMatchday: m.startMatchday,
      endMatchday: m.endMatchday,
      completedAt: m.completedAt ? m.completedAt.toISOString() : null,
      failedAt: m.failedAt ? m.failedAt.toISOString() : null,
      match: m.match,
      opponentMission: opp
        ? {
            clubName: opp.club.name,
            clubLogo: opp.club.logo,
            title: opp.title,
            description: opp.description,
            status: opp.status,
          }
        : null,
    };
  });

  const activeMissions = missions.filter((m) => m.status === "ACTIVE");
  const completedMissions = missions.filter((m) => m.status === "COMPLETED");
  const failedMissions = missions.filter((m) => m.status === "FAILED");

  let totalEarned = 0;
  for (const m of completedMissions) {
    totalEarned += Number(m.rewardAmount || 0);
  }

  let totalLost = 0;
  for (const m of failedMissions) {
    totalLost += Number(m.penaltyAmount || 0);
  }

  const netImpact = totalEarned - totalLost;

  const formatEUR = (val: number) =>
    new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(val);

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <section className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/manager/dashboard"
              className="text-xs font-bold uppercase tracking-wider text-pmb-gold hover:underline"
            >
              ← Dashboard
            </Link>
          </div>
          <h1 className="mt-1 text-2xl font-black uppercase tracking-tight text-white sm:text-3xl">
            Club Missions &amp; Bounties
          </h1>
          <p className="mt-1 text-xs text-gray-400">
            High-stakes tactical objectives. Win money on completion, get fined on failure.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-black/60 p-2 shadow-xl">
            <ClubBadge name={club.name} logo={club.logo} size="sm" />
          </div>
          <div>
            <span className="block text-sm font-black text-white">{club.name}</span>
            <span className="block text-[10px] font-bold uppercase tracking-wider text-pmb-gold">
              {club.league?.name ?? "PMB League"}
            </span>
          </div>
        </div>
      </section>

      {/* Financial Ledger Widget */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="pmb-card rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/30 via-black to-black p-5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">
              Total Rewards Earned
            </span>
            <span className="text-xl">💰</span>
          </div>
          <p className="mt-2 text-2xl font-black text-emerald-400">
            +{formatEUR(totalEarned)}
          </p>
          <p className="mt-1 text-[11px] text-gray-400">
            {completedMissions.length} mission(s) completed
          </p>
        </div>

        <div className="pmb-card rounded-2xl border border-red-500/30 bg-gradient-to-br from-red-950/30 via-black to-black p-5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-red-400">
              Penalties Incurred
            </span>
            <span className="text-xl">⚠️</span>
          </div>
          <p className="mt-2 text-2xl font-black text-red-400">
            -{formatEUR(totalLost)}
          </p>
          <p className="mt-1 text-[11px] text-gray-400">
            {failedMissions.length} mission(s) failed
          </p>
        </div>

        <div className={`pmb-card rounded-2xl border p-5 ${
          netImpact >= 0
            ? "border-pmb-gold/40 bg-gradient-to-br from-pmb-charcoal via-black to-black"
            : "border-red-500/30 bg-gradient-to-br from-red-950/20 via-black to-black"
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-pmb-gold">
              Net Financial Balance
            </span>
            <span className="text-xl">⚖️</span>
          </div>
          <p className={`mt-2 text-2xl font-black ${netImpact >= 0 ? "text-pmb-gold" : "text-red-400"}`}>
            {netImpact >= 0 ? "+" : ""}{formatEUR(netImpact)}
          </p>
          <p className="mt-1 text-[11px] text-gray-400">
            Current season mission ledger
          </p>
        </div>
      </section>

      {/* Active Missions */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">🎯</span>
            <h2 className="text-lg font-black uppercase tracking-tight text-white">
              Active Missions ({activeMissions.length})
            </h2>
          </div>
        </div>

        {activeMissions.length === 0 ? (
          <div className="pmb-card flex flex-col items-center justify-center p-8 text-center">
            <span className="text-3xl">📭</span>
            <p className="mt-2 text-sm font-bold text-white">No Active Missions</p>
            <p className="mt-1 text-xs text-gray-400 max-w-sm">
              Missions are automatically assigned each matchday or transfer window by the league commissioner.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {activeMissions.map((m) => (
              <MissionCard key={m.id} mission={m} />
            ))}
          </div>
        )}
      </section>

      {/* History: Completed & Failed */}
      {(completedMissions.length > 0 || failedMissions.length > 0) && (
        <section className="space-y-4 pt-4 border-t border-white/10">
          <div className="flex items-center gap-2">
            <span className="text-lg">📜</span>
            <h2 className="text-lg font-black uppercase tracking-tight text-white">
              Mission Log History
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {completedMissions.map((m) => (
              <MissionCard key={m.id} mission={m} />
            ))}
            {failedMissions.map((m) => (
              <MissionCard key={m.id} mission={m} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

