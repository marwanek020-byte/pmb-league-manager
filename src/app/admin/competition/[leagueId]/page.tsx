import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { MatchdayAdmin } from "@/components/admin/MatchdayAdmin";
import { computeStandings } from "@/lib/services/standings-service";

export const dynamic = "force-dynamic";

export default async function LeagueMatchdayPage({
  params,
  searchParams,
}: {
  params: { leagueId: string };
  searchParams: { csId?: string; seasonId?: string; matchday?: string };
}) {
  const session = await auth();
  if (!session || session.user.role !== "ADMINISTRATOR") redirect("/unauthorized");

  const { leagueId } = params;
  const { csId, seasonId, matchday: matchdayParam } = searchParams;

  if (!csId || !seasonId) redirect("/admin/competition");

  const [league, cs, season] = await Promise.all([
    prisma.league.findUnique({
      where: { id: leagueId },
      include: {
        clubs: {
          orderBy: { name: "asc" },
          select: { id: true, name: true, logo: true },
        },
      },
    }),
    prisma.competitionSeason.findUnique({ where: { id: csId } }),
    prisma.season.findUnique({
      where: { id: seasonId },
      include: { _count: { select: { matches: true } } },
    }),
  ]);

  if (!league || !cs || !season) redirect("/admin/competition");

  // Get total matchdays
  const maxMatchdayResult = await prisma.match.aggregate({
    where: { seasonId },
    _max: { matchday: true },
  });
  const totalMatchdays = maxMatchdayResult._max.matchday ?? 1;

  // Determine current matchday: first with any upcoming match, else 1
  const currentMatchday = matchdayParam
    ? Math.max(1, Math.min(parseInt(matchdayParam, 10) || 1, totalMatchdays))
    : (() => {
        // Will be computed on client if not specified; default to 1
        return 1;
      })();

  // Load matches for the current matchday
  const matches = await prisma.match.findMany({
    where: { seasonId, matchday: currentMatchday },
    orderBy: { createdAt: "asc" },
    include: {
      homeClub: { select: { id: true, name: true, logo: true } },
      awayClub: { select: { id: true, name: true, logo: true } },
    },
  });

  // Compute live standings
  const allMatches = await prisma.match.findMany({
    where: { seasonId },
    select: {
      id: true,
      status: true,
      homeClubId: true,
      awayClubId: true,
      homeGoals: true,
      awayGoals: true,
      matchday: true,
      playedAt: true,
    },
  });

  const standings = computeStandings(allMatches, league.clubs);

  const completedTotal = allMatches.filter((m) => m.status === "COMPLETED").length;
  const upcomingTotal = allMatches.filter((m) => m.status === "UPCOMING").length;

  return (
    <div className="space-y-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/admin/competition" className="hover:text-pmb-gold transition">
          Competition
        </Link>
        <span>›</span>
        <Link
          href={`/admin/competition?csId=${csId}`}
          className="hover:text-pmb-gold transition"
        >
          {cs.name}
        </Link>
        <span>›</span>
        <span className="font-semibold text-white">{league.name}</span>
      </nav>

      {/* Header */}
      <section className="admin-hero relative overflow-hidden rounded-2xl border border-pmb-gold/35 p-6 sm:p-8">
        <div className="relative flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.25em] text-pmb-gold">
              {cs.name}
            </p>
            <h1 className="mt-1 text-2xl font-bold text-white sm:text-3xl">
              {league.name}
            </h1>
            <p className="mt-1 text-sm text-gray-400">
              {league.country} · {league.clubs.length} clubs · {totalMatchdays} matchdays
            </p>
          </div>

          <div className="flex items-center gap-4 text-right">
            <div>
              <p className="text-xl font-bold text-emerald-400">{completedTotal}</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600">Played</p>
            </div>
            <div>
              <p className="text-xl font-bold text-gray-400">{upcomingTotal}</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600">Remaining</p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_360px]">
        {/* Matchday admin (left) */}
        <div>
          <MatchdayAdmin
            matches={matches as any}
            totalMatchdays={totalMatchdays}
            initialMatchday={currentMatchday}
            seasonId={seasonId}
            seasonStatus={season.status}
            competitionSeasonStatus={cs.status}
          />
        </div>

        {/* Live standings (right) */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-widest text-gray-500">
            Live Table
          </h3>

          <div className="pmb-card overflow-hidden">
            <div className="border-b border-pmb-border px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-widest text-gray-500">
                {league.name} · {cs.name}
              </p>
            </div>

            <div className="divide-y divide-pmb-border/50">
              {standings.map((row) => (
                <div
                  key={row.clubId}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm"
                >
                  <span
                    className={`w-5 text-center text-xs font-bold ${
                      row.position === 1
                        ? "text-pmb-gold"
                        : row.position <= 3
                        ? "text-yellow-500"
                        : "text-gray-600"
                    }`}
                  >
                    {row.position}
                  </span>

                  <span className="flex-1 truncate font-semibold text-white">
                    {row.clubName}
                  </span>

                  <div className="hidden sm:flex items-center gap-2 text-xs text-gray-500">
                    <span>{row.played}</span>
                    <span className="text-gray-700">|</span>
                    <span className={row.goalDifference > 0 ? "text-emerald-400" : row.goalDifference < 0 ? "text-red-400" : "text-gray-500"}>
                      {row.goalDifference > 0 ? "+" : ""}{row.goalDifference}
                    </span>
                  </div>

                  <span className="w-8 text-center font-bold text-pmb-gold">
                    {row.points}
                  </span>
                </div>
              ))}

              {standings.length === 0 && (
                <div className="px-4 py-8 text-center text-sm text-gray-600">
                  No results yet
                </div>
              )}
            </div>
          </div>

          {/* Legend */}
          <p className="text-xs text-gray-600 px-1">
            Columns: POS · CLUB · P · GD · PTS
          </p>
        </div>
      </div>
    </div>
  );
}
