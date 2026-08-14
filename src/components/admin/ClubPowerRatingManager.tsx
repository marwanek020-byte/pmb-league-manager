"use client";

import { useMemo, useState } from "react";
import { ClubBadge } from "@/components/ClubBadge";

type Rating = {
  id: string;
  clubId: string;
  rating: number;
  seasonsPlayed: number;
  titles: number;
  topThree: number;
  topFive: number;
  club: {
    id: string;
    name: string;
    logo: string | null;
    league: {
      id: string;
      name: string;
      country: string;
    };
  };
};

export function ClubPowerRatingManager({
  initialRatings,
}: {
  initialRatings: Rating[];
}) {
  const [search, setSearch] = useState("");
  const [leagueFilter, setLeagueFilter] = useState("ALL");

  const leagues = useMemo(() => {
    const map = new Map<string, string>();

    for (const rating of initialRatings) {
      map.set(rating.club.league.id, rating.club.league.name);
    }

    return Array.from(map.entries()).sort((a, b) =>
      a[1].localeCompare(b[1])
    );
  }, [initialRatings]);

  const filteredRatings = useMemo(() => {
    const query = search.trim().toLowerCase();

    return initialRatings.filter((rating) => {
      const matchesSearch =
        !query ||
        rating.club.name.toLowerCase().includes(query) ||
        rating.club.league.name.toLowerCase().includes(query);

      const matchesLeague =
        leagueFilter === "ALL" ||
        rating.club.league.id === leagueFilter;

      return matchesSearch && matchesLeague;
    });
  }, [initialRatings, search, leagueFilter]);

  return (
    <div className="space-y-6">
      {/* Top statistics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="pmb-card p-5">
          <p className="text-xs uppercase tracking-wide text-gray-500">
            Ranked Clubs
          </p>
          <p className="mt-2 text-3xl font-bold text-pmb-gold">
            {initialRatings.length}
          </p>
        </div>

        <div className="pmb-card p-5">
          <p className="text-xs uppercase tracking-wide text-gray-500">
            Highest Rating
          </p>
          <p className="mt-2 text-3xl font-bold text-white">
            {initialRatings[0]?.rating ?? 1000}
          </p>
        </div>

        <div className="pmb-card p-5">
          <p className="text-xs uppercase tracking-wide text-gray-500">
            Total Titles
          </p>
          <p className="mt-2 text-3xl font-bold text-white">
            {initialRatings.reduce(
              (total, item) => total + item.titles,
              0
            )}
          </p>
        </div>

        <div className="pmb-card p-5">
          <p className="text-xs uppercase tracking-wide text-gray-500">
            Top 3 Finishes
          </p>
          <p className="mt-2 text-3xl font-bold text-white">
            {initialRatings.reduce(
              (total, item) => total + item.topThree,
              0
            )}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="pmb-card p-4">
        <div className="flex flex-col gap-3 md:flex-row">
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search club or league..."
            className="pmb-input flex-1"
          />

          <select
            value={leagueFilter}
            onChange={(event) =>
              setLeagueFilter(event.target.value)
            }
            className="pmb-input md:w-64"
          >
            <option value="ALL">All leagues</option>

            {leagues.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Ranking */}
      <div className="pmb-card overflow-hidden">
        <div className="border-b border-pmb-border px-6 py-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white">
                Club Power Ranking
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Historical performance across finished seasons.
              </p>
            </div>

            <span className="rounded-full bg-pmb-gold/10 px-3 py-1 text-xs font-semibold text-pmb-gold">
              {filteredRatings.length} clubs
            </span>
          </div>
        </div>

        {filteredRatings.length === 0 ? (
          <div className="px-6 py-16 text-center text-sm text-gray-500">
            No clubs match your search.
          </div>
        ) : (
          <div className="divide-y divide-pmb-border">
            {filteredRatings.map((rating, index) => {
              const rank = initialRatings.findIndex(
                (item) => item.id === rating.id
              ) + 1;

              return (
                <div
                  key={rating.id}
                  className="flex flex-col gap-5 px-6 py-5 transition hover:bg-pmb-charcoal/40 lg:flex-row lg:items-center"
                >
                  {/* Rank */}
                  <div className="flex w-16 shrink-0 items-center gap-3">
                    <span
                      className={`text-2xl font-black ${
                        rank === 1
                          ? "text-pmb-gold"
                          : rank === 2
                            ? "text-gray-300"
                            : rank === 3
                              ? "text-amber-700"
                              : "text-gray-600"
                      }`}
                    >
                      {rank}
                    </span>

                    {rank <= 3 && (
                      <span className="text-lg">
                        {rank === 1
                          ? "🏆"
                          : rank === 2
                            ? "🥈"
                            : "🥉"}
                      </span>
                    )}
                  </div>

                  {/* Club */}
                  <div className="flex min-w-0 flex-1 items-center gap-4">
                    {rating.club.logo ? (
                      <img
                        src={rating.club.logo}
                        alt={`${rating.club.name} logo`}
                        className="h-12 w-12 rounded-full object-cover"
                      />
                    ) : (
                      <ClubBadge
                        name={rating.club.name}
                        size="sm"
                      />
                    )}

                    <div className="min-w-0">
                      <h3 className="truncate font-semibold text-white">
                        {rating.club.name}
                      </h3>

                      <p className="mt-1 text-xs text-gray-500">
                        {rating.club.league.name} ·{" "}
                        {rating.club.league.country}
                      </p>
                    </div>
                  </div>

                  {/* Rating */}
                  <div className="min-w-[110px]">
                    <p className="text-xs uppercase tracking-wide text-gray-600">
                      Rating
                    </p>

                    <p className="mt-1 text-2xl font-black text-pmb-gold">
                      {rating.rating}
                    </p>
                  </div>

                  {/* Statistics */}
                  <div className="grid grid-cols-4 gap-5 text-center">
                    <div>
                      <p className="text-xs text-gray-600">
                        Seasons
                      </p>
                      <p className="mt-1 font-semibold text-white">
                        {rating.seasonsPlayed}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-gray-600">
                        Titles
                      </p>
                      <p className="mt-1 font-semibold text-white">
                        {rating.titles}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-gray-600">
                        Top 3
                      </p>
                      <p className="mt-1 font-semibold text-white">
                        {rating.topThree}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-gray-600">
                        Top 5
                      </p>
                      <p className="mt-1 font-semibold text-white">
                        {rating.topFive}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Rating explanation */}
      <div className="pmb-card p-6">
        <h3 className="font-semibold text-white">
          How Power Rating works
        </h3>

        <div className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4 lg:grid-cols-8">
          {[
            ["1st", "+100"],
            ["2nd", "+70"],
            ["3rd", "+50"],
            ["4th", "+35"],
            ["5th–8th", "+20"],
            ["9th–12th", "+10"],
            ["13th–16th", "+5"],
            ["17th+", "+0"],
          ].map(([position, points]) => (
            <div
              key={position}
              className="rounded-lg border border-pmb-border bg-black/20 p-3 text-center"
            >
              <p className="text-xs text-gray-500">
                {position}
              </p>
              <p className="mt-1 font-bold text-pmb-gold">
                {points}
              </p>
            </div>
          ))}
        </div>

        <p className="mt-4 text-xs text-gray-600">
          Every club starts at 1000 rating. Rating changes are
          applied when a season is officially finished.
        </p>
      </div>
    </div>
  );
}