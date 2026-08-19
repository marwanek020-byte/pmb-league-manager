import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { CompetitionControlCenter } from "@/components/admin/CompetitionControlCenter";
import { NewSeasonWidget } from "./NewSeasonWidget";

export const dynamic = "force-dynamic";

export default async function AdminCompetitionPage({
  searchParams,
}: {
  searchParams: { csId?: string };
}) {
  const session = await auth();
  if (!session || session.user.role !== "ADMINISTRATOR") redirect("/unauthorized");

  const csId = searchParams.csId;

  // ═══════════════════════════════════════════════════════════
  // LIST VIEW — show all CompetitionSeasons
  // ═══════════════════════════════════════════════════════════
  if (!csId) {
    const competitionSeasons = await prisma.competitionSeason.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { matches: true, seasons: true } },
      },
    });

    return (
      <div className="space-y-8">
        {/* Hero */}
        <section className="admin-hero relative overflow-hidden rounded-2xl border border-pmb-gold/35 p-7 sm:p-10">
          <div className="relative max-w-xl">
            <p className="text-[10px] font-bold uppercase tracking-[.25em] text-pmb-gold">
              PMB Competition Engine · Global Authority
            </p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight text-white sm:text-5xl">
              Competition{" "}
              <span className="text-pmb-gold">Control Center</span>
            </h1>
            <p className="mt-4 text-sm leading-6 text-gray-300">
              Create competition seasons, generate fixtures across all 7 leagues,
              enter match results. The system automatically calculates standings and statistics.
            </p>
          </div>
        </section>

        {/* Create new season */}
        <section className="pmb-card p-6">
          <h2 className="mb-1 text-lg font-semibold text-white">
            New Competition Season
          </h2>
          <p className="mb-5 text-sm text-gray-400">
            Create an umbrella season (e.g.{" "}
            <span className="font-mono text-pmb-gold">2026/2027</span>) that
            covers all 7 PMB leagues. Then generate fixtures per league.
          </p>
          <NewSeasonWidget />
        </section>

        {/* Season list */}
        <section className="pmb-card overflow-hidden">
          <div className="border-b border-pmb-border px-6 py-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">
              Competition Seasons
            </h2>
            <span className="text-sm text-gray-500">
              {competitionSeasons.length} total
            </span>
          </div>

          {competitionSeasons.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-gray-500">
              No competition seasons yet. Create your first one above.
            </div>
          ) : (
            <div className="divide-y divide-pmb-border">
              {competitionSeasons.map((cs) => {
                const statusColor =
                  cs.status === "ACTIVE"
                    ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                    : cs.status === "FINISHED"
                    ? "bg-gray-500/15 text-gray-400 border-gray-500/30"
                    : "bg-yellow-500/15 text-yellow-400 border-yellow-500/30";

                return (
                  <div
                    key={cs.id}
                    className="flex flex-col gap-4 px-6 py-5 lg:flex-row lg:items-center lg:justify-between"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="font-bold text-white text-lg">
                          {cs.name}
                        </h3>
                        <span
                          className={`rounded-full border px-3 py-0.5 text-xs font-bold uppercase ${statusColor}`}
                        >
                          {cs.status}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-gray-500">
                        {cs.format === "DOUBLE_ROUND_ROBIN"
                          ? "Double Round-Robin"
                          : "Single Round-Robin"}{" "}
                        · {cs._count.seasons} league seasons ·{" "}
                        {cs._count.matches} matches
                      </p>
                    </div>

                    <Link
                      href={`/admin/competition?csId=${cs.id}`}
                      className="pmb-btn-primary whitespace-nowrap text-sm"
                    >
                      Manage →
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════
  // DETAIL VIEW — manage a specific CompetitionSeason
  // ═══════════════════════════════════════════════════════════
  const cs = await prisma.competitionSeason.findUnique({
    where: { id: csId },
    include: {
      seasons: {
        include: {
          league: {
            include: {
              clubs: { select: { id: true, name: true } },
            },
          },
          _count: { select: { matches: true } },
        },
      },
    },
  });

  if (!cs) redirect("/admin/competition");

  const allLeagues = await prisma.league.findMany({
    orderBy: { name: "asc" },
    include: {
      clubs: { select: { id: true, name: true } },
    },
  });

  const leagueSeasonsData = await Promise.all(
    allLeagues.map(async (league) => {
      const season = cs.seasons.find((s) => s.league.id === league.id);
      if (!season) {
        return {
          leagueId: league.id,
          seasonId: null as string | null,
          matchesCount: 0,
          completedCount: 0,
          upcomingCount: 0,
          generated: false,
        };
      }

      const [completedCount, upcomingCount] = await Promise.all([
        prisma.match.count({
          where: { seasonId: season.id, status: "COMPLETED" },
        }),
        prisma.match.count({
          where: { seasonId: season.id, status: "UPCOMING" },
        }),
      ]);

      return {
        leagueId: league.id,
        seasonId: season.id,
        matchesCount: season._count.matches,
        completedCount,
        upcomingCount,
        generated: season._count.matches > 0,
      };
    })
  );

  return (
    <div className="space-y-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500">
        <Link
          href="/admin/competition"
          className="hover:text-pmb-gold transition"
        >
          Competition
        </Link>
        <span>›</span>
        <span className="font-semibold text-white">{cs.name}</span>
      </nav>

      {/* Hero */}
      <section className="admin-hero relative overflow-hidden rounded-2xl border border-pmb-gold/35 p-7">
        <div className="relative">
          <p className="text-[10px] font-bold uppercase tracking-[.25em] text-pmb-gold">
            Competition Season
          </p>
          <h1 className="mt-2 text-3xl font-bold text-white">
            PMB <span className="text-pmb-gold">{cs.name}</span>
          </h1>
          <p className="mt-2 text-sm text-gray-400">
            Generate fixtures, enter results, and manage all{" "}
            {allLeagues.length} leagues.
          </p>
        </div>
      </section>

      {/* Competition Control Center */}
      <CompetitionControlCenter
        competitionSeasonId={cs.id}
        competitionSeasonName={cs.name}
        competitionSeasonStatus={cs.status}
        format={cs.format}
        leagues={allLeagues}
        leagueSeasons={leagueSeasonsData}
      />
    </div>
  );
}
