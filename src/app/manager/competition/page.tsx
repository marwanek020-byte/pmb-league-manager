import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { computeStandings } from "@/lib/services/standings-service";
import { CompetitionHub } from "@/components/manager/competition/CompetitionHub";

export const dynamic = "force-dynamic";

export default async function ManagerCompetitionPage() {
  const session = await auth();

  if (!session || session.user.role !== "CLUB_MANAGER") {
    redirect("/unauthorized");
  }

  const club = await prisma.club.findUnique({
    where: { id: session.user.clubId ?? "" },
    include: {
      league: { select: { id: true, name: true } },
    },
  });

  if (!club) redirect("/unauthorized");

  // Find the most recent active (or latest) season for this club's league
  const activeSeason = await prisma.season.findFirst({
    where: { leagueId: club.leagueId, status: "ACTIVE" },
    include: {
      competitionSeason: true,
      _count: { select: { matches: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const latestSeason =
    activeSeason ??
    (await prisma.season.findFirst({
      where: { leagueId: club.leagueId },
      include: {
        competitionSeason: true,
        _count: { select: { matches: true } },
      },
      orderBy: { createdAt: "desc" },
    }));

  // No season / no fixtures yet
  if (!latestSeason || latestSeason._count.matches === 0) {
    return (
      <div className="space-y-8">
        <section className="manager-hero pmb-card relative flex flex-col items-start gap-5 overflow-hidden p-7">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.2em] text-pmb-gold">
              Competition
            </p>
            <h1 className="mt-1 text-2xl font-bold text-white">
              {club.league?.name ?? "PMB League"}
            </h1>
          </div>
        </section>

        <div className="pmb-card p-10 text-center">
          <p className="text-4xl">⚽</p>
          <h2 className="mt-4 text-lg font-bold text-white">
            No active competition
          </h2>
          <p className="mt-2 text-sm text-gray-400">
            The competition season for{" "}
            <span className="font-semibold text-white">{club.league?.name ?? "PMB League"}</span>{" "}
            hasn't started yet. The administrator will generate fixtures when the
            season begins.
          </p>
        </div>
      </div>
    );
  }

  // Load all matches for this season
  const allMatchesRaw = await prisma.match.findMany({
    where: { seasonId: latestSeason.id },
    orderBy: [{ matchday: "asc" }, { createdAt: "asc" }],
    include: {
      homeClub: { select: { id: true, name: true, logo: true } },
      awayClub: { select: { id: true, name: true, logo: true } },
    },
  });

  // Load clubs for standings
  const leagueClubs = await prisma.club.findMany({
    where: { leagueId: club.leagueId },
    select: { id: true, name: true, logo: true },
    orderBy: { name: "asc" },
  });

  // Compute live standings
  const standings = computeStandings(allMatchesRaw, leagueClubs);

  // Get total matchdays
  const maxMatchday = allMatchesRaw.reduce(
    (max, m) => Math.max(max, m.matchday),
    0
  );

  const seasonName =
    latestSeason.competitionSeason?.name ?? latestSeason.name;

  // Serialize for client component
  const allMatches = allMatchesRaw.map((m) => ({
    id: m.id,
    matchday: m.matchday,
    homeClub: m.homeClub,
    awayClub: m.awayClub,
    homeGoals: m.homeGoals,
    awayGoals: m.awayGoals,
    status: m.status as "UPCOMING" | "COMPLETED",
  }));

  return (
    <div className="space-y-6">
      {/* Section header */}
      <section className="manager-hero pmb-card relative flex flex-col items-start gap-3 overflow-hidden p-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.2em] text-pmb-gold">
            My Competition
          </p>
          <h1 className="mt-1 text-2xl font-bold text-white">
            {club.league?.name ?? "PMB League"}
          </h1>
          <p className="mt-1 text-sm text-gray-400">{seasonName}</p>
        </div>
      </section>

      {/* Main competition hub */}
      <CompetitionHub
        seasonId={latestSeason.id}
        myClubId={club.id}
        myClubName={club.name}
        myClubLogo={club.logo}
        leagueName={club.league?.name ?? "PMB League"}
        seasonName={seasonName}
        totalMatchdays={maxMatchday}
        standings={standings}
        allMatches={allMatches}
      />
    </div>
  );
}
