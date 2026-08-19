import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { computeStandings } from "@/lib/services/standings-service";
import { ClubBadge } from "@/components/ClubBadge";

export const dynamic = "force-dynamic";

type Props = { params: { leagueId: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const league = await prisma.league.findUnique({
    where: { id: params.leagueId },
    select: { name: true, country: true },
  });

  if (!league) return { title: "League Not Found — PMB" };

  return {
    title: `${league.name} — PMB Competition`,
    description: `Follow the ${league.name} from ${league.country} on the PMB Competition platform. Live standings, fixtures and results.`,
  };
}

export default async function PublicLeaguePage({ params }: Props) {
  const league = await prisma.league.findUnique({
    where: { id: params.leagueId },
    include: {
      clubs: {
        orderBy: { name: "asc" },
        select: { id: true, name: true, logo: true },
      },
    },
  });

  if (!league) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-6xl">⚽</p>
          <h1 className="mt-4 text-2xl font-bold text-white">League not found</h1>
          <Link href="/" className="mt-4 inline-block text-pmb-gold hover:underline">
            ← Back to home
          </Link>
        </div>
      </div>
    );
  }

  // Find the most relevant season
  const activeSeason = await prisma.season.findFirst({
    where: { leagueId: league.id, status: "ACTIVE" },
    include: {
      competitionSeason: { select: { name: true } },
      _count: { select: { matches: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const latestSeason =
    activeSeason ??
    (await prisma.season.findFirst({
      where: { leagueId: league.id },
      include: {
        competitionSeason: { select: { name: true } },
        _count: { select: { matches: true } },
      },
      orderBy: { createdAt: "desc" },
    }));

  const seasonName =
    latestSeason?.competitionSeason?.name ?? latestSeason?.name ?? "–";

  // Load matches + compute standings
  const allMatches = latestSeason
    ? await prisma.match.findMany({
        where: { seasonId: latestSeason.id },
        orderBy: [{ matchday: "asc" }, { createdAt: "asc" }],
        include: {
          homeClub: { select: { id: true, name: true, logo: true } },
          awayClub: { select: { id: true, name: true, logo: true } },
        },
      })
    : [];

  const standings = latestSeason
    ? computeStandings(allMatches, league.clubs)
    : [];

  const completedMatches = allMatches.filter((m) => m.status === "COMPLETED");
  const upcomingMatches = allMatches.filter((m) => m.status === "UPCOMING");

  const maxMatchday = allMatches.reduce((max, m) => Math.max(max, m.matchday), 0);
  const lastCompletedMatchday = completedMatches.reduce(
    (max, m) => Math.max(max, m.matchday),
    0
  );

  // Recent results (last 5)
  const recentResults = [...completedMatches]
    .sort((a, b) => b.matchday - a.matchday)
    .slice(0, 5);

  // Next fixtures (first 5)
  const nextFixtures = upcomingMatches.slice(0, 5);

  const totalGoals = completedMatches.reduce(
    (sum, m) => sum + (m.homeGoals ?? 0) + (m.awayGoals ?? 0),
    0
  );

  const formColor = (r: "W" | "D" | "L") =>
    ({ W: "bg-emerald-500", D: "bg-gray-500", L: "bg-red-600" }[r]);

  return (
    <div className="min-h-screen">
      {/* Top bar */}
      <header className="border-b border-pmb-border/50 bg-pmb-black/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-xs font-bold uppercase tracking-widest text-pmb-gold hover:opacity-80 transition">
              PMB
            </Link>
            <span className="text-gray-700">/</span>
            <span className="text-xs font-semibold text-gray-400">{league.name}</span>
          </div>
          <Link
            href="/login"
            className="text-xs font-bold uppercase tracking-widest text-gray-500 hover:text-pmb-gold transition"
          >
            Manager Login →
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-10 px-4 py-8 sm:px-6">
        {/* League hero */}
        <section className="relative overflow-hidden rounded-2xl border border-pmb-gold/25 bg-gradient-to-br from-[#0d0d0b] via-[#13110c] to-[#0a0908] p-7 sm:p-10">
          <div
            className="pointer-events-none absolute inset-0 opacity-10"
            style={{
              backgroundImage:
                "repeating-linear-gradient(135deg,transparent 0 52px,rgba(212,175,55,.4) 53px 54px)",
            }}
            aria-hidden
          />
          <div className="relative">
            <p className="text-[10px] font-bold uppercase tracking-[.35em] text-pmb-gold">
              PMB · {league.country}
            </p>
            <h1 className="mt-3 text-4xl font-black tracking-tight text-white sm:text-5xl">
              {league.name}
            </h1>
            <p className="mt-2 text-sm text-gray-400">
              Season{" "}
              <span className="font-semibold text-white">{seasonName}</span>
            </p>

            {/* Stats row */}
            <div className="mt-6 flex flex-wrap gap-6">
              {[
                { label: "Clubs", value: league.clubs.length },
                { label: "Matchdays", value: maxMatchday || "–" },
                { label: "Played", value: completedMatches.length },
                { label: "Goals", value: totalGoals },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-2xl font-bold text-pmb-gold">{value}</p>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600">
                    {label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Content grid */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_320px]">
          {/* Left: standings + recent results */}
          <div className="space-y-8">
            {/* Classification */}
            <section>
              <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-gray-500">
                Classification
              </h2>

              {standings.length === 0 ? (
                <div className="pmb-card p-8 text-center text-sm text-gray-500">
                  No results yet. Season hasn't started.
                </div>
              ) : (
                <div className="pmb-card overflow-hidden">
                  {/* Header */}
                  <div className="grid grid-cols-[2.5rem_1fr_2.5rem_2.5rem_2.5rem_2.5rem_2.5rem_2.5rem_3rem_3.5rem] border-b border-pmb-border px-3 py-2 text-center text-[9px] font-bold uppercase tracking-widest text-gray-600 sm:px-5">
                    <span>#</span>
                    <span className="text-left">Club</span>
                    <span>P</span>
                    <span>W</span>
                    <span>D</span>
                    <span>L</span>
                    <span>GF</span>
                    <span>GA</span>
                    <span>GD</span>
                    <span>PTS</span>
                  </div>

                  <div className="divide-y divide-pmb-border/40">
                    {standings.map((row) => (
                      <div
                        key={row.clubId}
                        className="grid grid-cols-[2.5rem_1fr_2.5rem_2.5rem_2.5rem_2.5rem_2.5rem_2.5rem_3rem_3.5rem] items-center px-3 py-3 text-center text-sm hover:bg-white/3 transition sm:px-5"
                      >
                        <span
                          className={[
                            "font-bold",
                            row.position === 1
                              ? "text-pmb-gold"
                              : row.position <= 3
                              ? "text-yellow-500"
                              : "text-gray-600",
                          ].join(" ")}
                        >
                          {row.position}
                        </span>

                        <div className="flex items-center gap-2 text-left overflow-hidden">
                          <ClubBadge
                            name={row.clubName}
                            logo={row.clubLogo}
                            size="xs"
                          />
                          <span className="truncate font-semibold text-white">
                            {row.clubName}
                          </span>
                        </div>

                        <span className="text-gray-400">{row.played}</span>
                        <span className="text-gray-400">{row.wins}</span>
                        <span className="text-gray-400">{row.draws}</span>
                        <span className="text-gray-400">{row.losses}</span>
                        <span className="text-gray-400">{row.goalsFor}</span>
                        <span className="text-gray-400">{row.goalsAgainst}</span>
                        <span
                          className={
                            row.goalDifference > 0
                              ? "text-emerald-400 font-semibold"
                              : row.goalDifference < 0
                              ? "text-red-400 font-semibold"
                              : "text-gray-500"
                          }
                        >
                          {row.goalDifference > 0 ? "+" : ""}
                          {row.goalDifference}
                        </span>
                        <span className="font-bold text-white">{row.points}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {/* Recent results */}
            {recentResults.length > 0 && (
              <section>
                <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-gray-500">
                  Recent Results
                </h2>
                <div className="space-y-2">
                  {recentResults.map((match) => (
                    <div
                      key={match.id}
                      className="pmb-card flex items-center gap-4 p-4"
                    >
                      <div className="flex flex-1 items-center gap-2 overflow-hidden justify-end">
                        <span className="truncate text-sm font-semibold text-white text-right">
                          {match.homeClub.name}
                        </span>
                        <ClubBadge
                          name={match.homeClub.name}
                          logo={match.homeClub.logo}
                          size="xs"
                        />
                      </div>

                      <div className="shrink-0 text-center">
                        <span className="text-lg font-black text-white">
                          {match.homeGoals} — {match.awayGoals}
                        </span>
                        <p className="text-[9px] font-bold uppercase tracking-widest text-gray-600">
                          MD {match.matchday}
                        </p>
                      </div>

                      <div className="flex flex-1 items-center gap-2 overflow-hidden">
                        <ClubBadge
                          name={match.awayClub.name}
                          logo={match.awayClub.logo}
                          size="xs"
                        />
                        <span className="truncate text-sm font-semibold text-white">
                          {match.awayClub.name}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Right: upcoming + clubs */}
          <div className="space-y-8">
            {/* Upcoming fixtures */}
            {nextFixtures.length > 0 && (
              <section>
                <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-gray-500">
                  Upcoming Matches
                </h2>
                <div className="space-y-2">
                  {nextFixtures.map((match) => (
                    <div
                      key={match.id}
                      className="pmb-card p-4"
                    >
                      <p className="mb-2 text-[9px] font-bold uppercase tracking-widest text-gray-600">
                        Matchday {match.matchday}
                      </p>
                      <div className="flex items-center justify-between gap-2 text-sm font-semibold">
                        <span className="flex-1 truncate text-white">
                          {match.homeClub.name}
                        </span>
                        <span className="shrink-0 text-xs font-bold uppercase tracking-widest text-gray-600">
                          vs
                        </span>
                        <span className="flex-1 truncate text-right text-white">
                          {match.awayClub.name}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Form guide (top 10) */}
            {standings.length > 0 && (
              <section>
                <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-gray-500">
                  Form Guide
                </h2>
                <div className="pmb-card divide-y divide-pmb-border/40 overflow-hidden">
                  {standings.slice(0, 10).map((row) => (
                    <div
                      key={row.clubId}
                      className="flex items-center justify-between px-4 py-2.5"
                    >
                      <div className="flex items-center gap-2 overflow-hidden">
                        <span className="w-5 text-center text-xs font-bold text-gray-600">
                          {row.position}
                        </span>
                        <span className="truncate text-sm font-semibold text-white">
                          {row.clubName}
                        </span>
                      </div>
                      <div className="flex gap-1 ml-3">
                        {row.form.length === 0 ? (
                          <span className="text-xs text-gray-700">—</span>
                        ) : (
                          row.form.map((r, i) => (
                            <span
                              key={i}
                              className={`flex h-4 w-4 items-center justify-center rounded text-[9px] font-bold text-white ${formColor(r)}`}
                            >
                              {r}
                            </span>
                          ))
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Clubs list */}
            <section>
              <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-gray-500">
                Clubs ({league.clubs.length})
              </h2>
              <div className="pmb-card divide-y divide-pmb-border/40 overflow-hidden">
                {league.clubs.map((club) => (
                  <div key={club.id} className="flex items-center gap-3 px-4 py-2.5">
                    <ClubBadge name={club.name} logo={club.logo} size="xs" />
                    <span className="text-sm font-semibold text-white">{club.name}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </main>

      <footer className="border-t border-pmb-border/30 mt-16 py-8 text-center">
        <p className="text-xs text-gray-700">
          PMB · PES Moroccan Bourgeois · Competition Platform
        </p>
      </footer>
    </div>
  );
}
