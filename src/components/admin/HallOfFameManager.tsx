"use client";

import { useEffect, useState } from "react";

type SeasonHistory = {
  seasonId: string;
  seasonName: string;
  leagueName: string;
  position: number;
};

type HistoricalClub = {
  clubId: string;
  clubName: string;
  clubLogo: string | null;
};

type HistoricalSeason = {
  seasonId: string;
  seasonName: string;

  leagueId: string;
  leagueName: string;
  country: string;

  champion: HistoricalClub | null;
  runnerUp: HistoricalClub | null;
  thirdPlace: HistoricalClub | null;

  startDate: string | null;
  endDate: string | null;
  createdAt: string;
};

type HallOfFameClub = {
  clubId: string;
  clubName: string;
  clubLogo: string | null;

  titles: number;
  topThree: number;
  topFive: number;
  seasonsPlayed: number;

  bestPosition: number;
  powerRating: number;

  seasons: SeasonHistory[];
};

export function HallOfFameManager() {
  const [clubs, setClubs] = useState<HallOfFameClub[]>([]);
  const [historicalSeasons, setHistoricalSeasons] =
    useState<HistoricalSeason[]>([]);

  const [totalFinishedSeasons, setTotalFinishedSeasons] =
    useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadHallOfFame() {
      try {
        const res = await fetch(
          "/api/admin/hall-of-fame"
        );

        const data = await res.json();

        if (!res.ok) {
          setError(
            data.error ??
              "Could not load Hall of Fame."
          );
          return;
        }

        setClubs(data.hallOfFame ?? []);

        setHistoricalSeasons(
          data.historicalSeasons ?? []
        );

        setTotalFinishedSeasons(
          data.totalFinishedSeasons ?? 0
        );
      } catch {
        setError(
          "Network error. Please try again."
        );
      } finally {
        setLoading(false);
      }
    }

    loadHallOfFame();
  }, []);

  if (loading) {
    return (
      <div className="pmb-card p-8 text-center text-sm text-gray-400">
        Loading Hall of Fame...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="pmb-card p-6 text-center">
          <p className="text-3xl font-bold text-pmb-gold">
            {totalFinishedSeasons}
          </p>

          <p className="mt-1 text-sm text-gray-400">
            Finished Seasons
          </p>
        </div>

        <div className="pmb-card p-6 text-center">
          <p className="text-3xl font-bold text-pmb-gold">
            {clubs.length}
          </p>

          <p className="mt-1 text-sm text-gray-400">
            Clubs in Hall of Fame
          </p>
        </div>

        <div className="pmb-card p-6 text-center">
          <p className="text-3xl font-bold text-pmb-gold">
            {clubs[0]?.titles ?? 0}
          </p>

          <p className="mt-1 text-sm text-gray-400">
            Most Titles
          </p>
        </div>
      </div>

      {/* Club Hall of Fame */}
      <section className="pmb-card overflow-hidden">
        <div className="border-b border-pmb-border px-6 py-5">
          <h2 className="text-xl font-semibold text-white">
            🏆 Club Hall of Fame
          </h2>

          <p className="mt-1 text-sm text-gray-400">
            Clubs ranked by titles, podium finishes,
            and historical performance.
          </p>
        </div>

        {clubs.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-gray-400">
            No finished seasons yet.
          </div>
        ) : (
          <div className="divide-y divide-pmb-border">
            {clubs.map((club, index) => (
              <div
                key={club.clubId}
                className="px-6 py-5"
              >
                <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                  {/* Club */}
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-pmb-gold/10 font-bold text-pmb-gold">
                      {index + 1}
                    </div>

                    {club.clubLogo ? (
                      <img
                        src={club.clubLogo}
                        alt={club.clubName}
                        className="h-12 w-12 object-contain"
                      />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-pmb-border bg-black/20 text-xs text-gray-500">
                        CLUB
                      </div>
                    )}

                    <div>
                      <h3 className="font-semibold text-white">
                        {club.clubName}
                      </h3>

                      <p className="text-xs text-gray-500">
                        {club.seasonsPlayed} seasons
                        played
                      </p>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                    <Stat
                      label="Titles"
                      value={club.titles}
                    />

                    <Stat
                      label="Top 3"
                      value={club.topThree}
                    />

                    <Stat
                      label="Top 5"
                      value={club.topFive}
                    />

                    <Stat
                      label="Best"
                      value={
                        club.bestPosition > 0
                          ? `#${club.bestPosition}`
                          : "-"
                      }
                    />

                    <Stat
                      label="Power"
                      value={club.powerRating}
                    />
                  </div>
                </div>

                {/* Club Season History */}
                {club.seasons.length > 0 && (
                  <div className="mt-5 border-t border-pmb-border pt-4">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Season History
                    </p>

                    <div className="flex flex-wrap gap-2">
                      {club.seasons.map(
                        (season) => (
                          <div
                            key={`${club.clubId}-${season.seasonId}`}
                            className="rounded-lg border border-pmb-border bg-black/20 px-3 py-2 text-xs"
                          >
                            <span className="font-semibold text-white">
                              {season.seasonName}
                            </span>

                            <span className="mx-2 text-gray-600">
                              ·
                            </span>

                            <span className="text-gray-400">
                              {season.leagueName}
                            </span>

                            <span className="mx-2 text-gray-600">
                              ·
                            </span>

                            <span
                              className={
                                season.position ===
                                1
                                  ? "font-bold text-pmb-gold"
                                  : season.position <=
                                      3
                                    ? "font-semibold text-white"
                                    : "text-gray-300"
                              }
                            >
                              #{season.position}
                            </span>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Historical Seasons */}
      <section className="pmb-card overflow-hidden">
        <div className="border-b border-pmb-border px-6 py-5">
          <h2 className="text-xl font-semibold text-white">
            📜 Historical Seasons
          </h2>

          <p className="mt-1 text-sm text-gray-400">
            Official results from every finished PMB
            season.
          </p>
        </div>

        {historicalSeasons.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-gray-400">
            No historical seasons yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="border-b border-pmb-border bg-pmb-charcoal/60 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-5 py-4">
                    Season
                  </th>

                  <th className="px-5 py-4">
                    League
                  </th>

                  <th className="px-5 py-4">
                    🥇 Champion
                  </th>

                  <th className="px-5 py-4">
                    🥈 Runner-up
                  </th>

                  <th className="px-5 py-4">
                    🥉 3rd Place
                  </th>

                  <th className="px-5 py-4">
                    Date
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-pmb-border">
                {historicalSeasons.map(
                  (season) => (
                    <tr
                      key={season.seasonId}
                      className="hover:bg-pmb-charcoal/40"
                    >
                      {/* Season */}
                      <td className="px-5 py-5">
                        <div className="font-semibold text-white">
                          {season.seasonName}
                        </div>

                        <div className="mt-1 text-xs text-gray-500">
                          {season.country}
                        </div>
                      </td>

                      {/* League */}
                      <td className="px-5 py-5">
                        <span className="font-medium text-gray-300">
                          {season.leagueName}
                        </span>
                      </td>

                      {/* Champion */}
                      <td className="px-5 py-5">
                        <HistoricalClubDisplay
                          club={season.champion}
                          position={1}
                        />
                      </td>

                      {/* Runner-up */}
                      <td className="px-5 py-5">
                        <HistoricalClubDisplay
                          club={season.runnerUp}
                          position={2}
                        />
                      </td>

                      {/* Third */}
                      <td className="px-5 py-5">
                        <HistoricalClubDisplay
                          club={season.thirdPlace}
                          position={3}
                        />
                      </td>

                      {/* Date */}
                      <td className="px-5 py-5">
                        <div className="text-gray-300">
                          {formatSeasonDate(
                            season.endDate ??
                              season.createdAt
                          )}
                        </div>

                        {season.endDate && (
                          <div className="mt-1 text-xs text-gray-600">
                            Finished
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function HistoricalClubDisplay({
  club,
  position,
}: {
  club: HistoricalClub | null;
  position: number;
}) {
  if (!club) {
    return (
      <span className="text-gray-600">
        —
      </span>
    );
  }

  return (
    <div className="flex items-center gap-3">
      {club.clubLogo ? (
        <img
          src={club.clubLogo}
          alt={club.clubName}
          className="h-8 w-8 object-contain"
        />
      ) : (
        <div className="flex h-8 w-8 items-center justify-center rounded border border-pmb-border bg-black/20 text-[9px] text-gray-600">
          CLUB
        </div>
      )}

      <div>
        <p
          className={
            position === 1
              ? "font-bold text-pmb-gold"
              : "font-semibold text-white"
          }
        >
          {club.clubName}
        </p>

        <p className="text-[10px] uppercase tracking-wide text-gray-600">
          {position === 1
            ? "Champion"
            : position === 2
              ? "Runner-up"
              : "Third Place"}
        </p>
      </div>
    </div>
  );
}

function formatSeasonDate(
  value: string
) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function Stat({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="min-w-[80px] rounded-lg border border-pmb-border bg-black/20 px-3 py-2 text-center">
      <p className="text-sm font-bold text-white">
        {value}
      </p>

      <p className="mt-1 text-[10px] uppercase tracking-wide text-gray-500">
        {label}
      </p>
    </div>
  );
}