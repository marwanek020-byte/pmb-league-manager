"use client";

import { useMemo, useState } from "react";
import { ClubBadge } from "@/components/ClubBadge";

export type AdminClub = {
  id: string;
  name: string;
  managerUsername: string | null;
};

export type AdminLeague = {
  id: string;
  name: string;
  country: string;
  clubs: AdminClub[];
};

export function LeagueOverview({ leagues }: { leagues: AdminLeague[] }) {
  const [query, setQuery] = useState("");

  const filteredLeagues = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return leagues;

    return leagues
      .map((league) => ({
        ...league,
        clubs: league.clubs.filter(
          (club) =>
            club.name.toLowerCase().includes(q) ||
            club.managerUsername?.toLowerCase().includes(q) ||
            league.name.toLowerCase().includes(q)
        ),
      }))
      .filter((league) => league.clubs.length > 0);
  }, [leagues, query]);

  return (
    <div className="space-y-6">
      <div>
        <label htmlFor="search" className="pmb-label">
          Search leagues, clubs, or managers
        </label>
        <input
          id="search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. Liverpool, Real Madrid, laliga-realmadrid..."
          className="pmb-input max-w-md"
        />
      </div>

      {filteredLeagues.length === 0 && (
        <p className="text-sm text-gray-500">No leagues, clubs, or managers match your search.</p>
      )}

      <div className="space-y-8">
        {filteredLeagues.map((league) => (
          <section key={league.id}>
            <div className="mb-3 flex items-center gap-2">
              <h3 className="text-lg font-semibold text-white">{league.name}</h3>
              <span className="pmb-badge">{league.clubs.length} clubs</span>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {league.clubs.map((club) => (
                <div key={club.id} className="pmb-card flex items-center gap-3 p-4">
                  <ClubBadge name={club.name} size="sm" />
                  <div className="min-w-0">
                    <p className="truncate font-medium text-white">{club.name}</p>
                    <p className="truncate text-xs text-gray-500">
                      {club.managerUsername ?? "No manager assigned"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
