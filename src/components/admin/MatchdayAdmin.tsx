"use client";

import { useState, useCallback } from "react";
import { ClubBadge } from "@/components/ClubBadge";

type Club = {
  id: string;
  name: string;
  logo: string | null;
};

type Match = {
  id: string;
  matchday: number;
  homeClubId: string;
  awayClubId: string;
  homeGoals: number | null;
  awayGoals: number | null;
  status: "UPCOMING" | "COMPLETED";
  homeClub: Club;
  awayClub: Club;
};

type Props = {
  matches: Match[];
  totalMatchdays: number;
  initialMatchday: number;
  seasonId: string;
  seasonStatus: string;
  competitionSeasonStatus: string;
};

export function MatchdayAdmin({
  matches: initialMatches,
  totalMatchdays,
  initialMatchday,
  seasonStatus,
  competitionSeasonStatus,
}: Props) {
  const [currentMatchday, setCurrentMatchday] = useState(initialMatchday);
  const [matchesByDay, setMatchesByDay] = useState<Record<number, Match[]>>(
    groupByMatchday(initialMatches)
  );
  const [loadingMatchday, setLoadingMatchday] = useState(false);

  // Per-match editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [homeGoals, setHomeGoals] = useState("");
  const [awayGoals, setAwayGoals] = useState("");
  const [saving, setSaving] = useState(false);
  const [matchErrors, setMatchErrors] = useState<Record<string, string>>({});
  const [matchSuccesses, setMatchSuccesses] = useState<Record<string, string>>({});

  const canEdit = competitionSeasonStatus !== "FINISHED";

  function groupByMatchday(ms: Match[]): Record<number, Match[]> {
    const map: Record<number, Match[]> = {};
    for (const m of ms) {
      if (!map[m.matchday]) map[m.matchday] = [];
      map[m.matchday].push(m);
    }
    return map;
  }

  const loadMatchday = useCallback(async (day: number) => {
    setLoadingMatchday(true);
    setCurrentMatchday(day);
    setEditingId(null);
    try {
      // We get matches from the URL's seasonId — passed via the URL
      const url = new URL(window.location.href);
      const seasonId = url.searchParams.get("seasonId") ?? "";
      const res = await fetch(`/api/seasons/${seasonId}/matches?matchday=${day}`);
      const data = await res.json();
      if (res.ok) {
        setMatchesByDay((prev) => ({
          ...prev,
          [day]: data.matches,
        }));
      }
    } catch {
      // keep existing data
    } finally {
      setLoadingMatchday(false);
    }
  }, []);

  function startEdit(match: Match) {
    setEditingId(match.id);
    setHomeGoals(match.homeGoals !== null ? String(match.homeGoals) : "");
    setAwayGoals(match.awayGoals !== null ? String(match.awayGoals) : "");
    setMatchErrors((prev) => ({ ...prev, [match.id]: "" }));
  }

  function cancelEdit() {
    setEditingId(null);
    setHomeGoals("");
    setAwayGoals("");
  }

  async function saveResult(matchId: string) {
    const hg = parseInt(homeGoals, 10);
    const ag = parseInt(awayGoals, 10);

    if (!Number.isInteger(hg) || !Number.isInteger(ag) || hg < 0 || ag < 0) {
      setMatchErrors((prev) => ({
        ...prev,
        [matchId]: "Enter valid scores (0 or higher).",
      }));
      return;
    }

    setSaving(true);
    setMatchErrors((prev) => ({ ...prev, [matchId]: "" }));

    try {
      const res = await fetch(`/api/admin/matches/${matchId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ homeGoals: hg, awayGoals: ag }),
      });
      const data = await res.json();

      if (!res.ok) {
        setMatchErrors((prev) => ({
          ...prev,
          [matchId]: data.error ?? "Failed to save result.",
        }));
        return;
      }

      // Update local state
      setMatchesByDay((prev) => {
        const day = currentMatchday;
        const updated = (prev[day] ?? []).map((m) =>
          m.id === matchId
            ? {
                ...m,
                homeGoals: data.match.homeGoals,
                awayGoals: data.match.awayGoals,
                status: "COMPLETED" as const,
              }
            : m
        );
        return { ...prev, [day]: updated };
      });

      setMatchSuccesses((prev) => ({ ...prev, [matchId]: "Result saved." }));
      setEditingId(null);

      // Clear success message after 3s
      setTimeout(() => {
        setMatchSuccesses((prev) => ({ ...prev, [matchId]: "" }));
      }, 3000);
    } catch {
      setMatchErrors((prev) => ({
        ...prev,
        [matchId]: "Network error.",
      }));
    } finally {
      setSaving(false);
    }
  }

  const currentMatches = matchesByDay[currentMatchday] ?? [];

  return (
    <div className="space-y-5">
      {/* Matchday selector */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-xs font-bold uppercase tracking-widest text-gray-500">Matchday</span>

        <div className="flex flex-wrap gap-1.5">
          {Array.from({ length: totalMatchdays }, (_, i) => i + 1).map((day) => {
            const dayMatches = matchesByDay[day] ?? [];
            const allCompleted =
              dayMatches.length > 0 &&
              dayMatches.every((m) => m.status === "COMPLETED");
            const someCompleted = dayMatches.some((m) => m.status === "COMPLETED");

            return (
              <button
                key={day}
                onClick={() => loadMatchday(day)}
                className={[
                  "h-8 w-8 rounded-full text-xs font-bold transition",
                  day === currentMatchday
                    ? "bg-pmb-gold text-pmb-black scale-110"
                    : allCompleted
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:border-emerald-400"
                    : someCompleted
                    ? "bg-yellow-500/15 text-yellow-400 border border-yellow-500/30"
                    : "border border-pmb-border text-gray-500 hover:border-pmb-gold/40 hover:text-gray-300",
                ].join(" ")}
              >
                {day}
              </button>
            );
          })}
        </div>
      </div>

      {/* Matchday header */}
      <div className="flex items-baseline gap-3">
        <h2 className="text-2xl font-bold tracking-tight text-white">
          Matchday {currentMatchday}
        </h2>
        <span className="text-sm text-gray-500">
          {currentMatches.filter((m) => m.status === "COMPLETED").length}/{currentMatches.length} completed
        </span>
        {loadingMatchday && (
          <span className="text-xs text-gray-600">Loading...</span>
        )}
      </div>

      {/* Match list */}
      <div className="space-y-2">
        {currentMatches.length === 0 && (
          <div className="rounded-xl border border-pmb-border p-8 text-center text-sm text-gray-500">
            No matches for matchday {currentMatchday}.
          </div>
        )}

        {currentMatches.map((match) => {
          const isEditing = editingId === match.id;
          const isCompleted = match.status === "COMPLETED";

          return (
            <div
              key={match.id}
              className={[
                "pmb-card overflow-hidden transition-all",
                isEditing ? "border-pmb-gold/50" : "",
              ].join(" ")}
            >
              <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
                {/* Home club */}
                <div className="flex flex-1 items-center gap-3">
                  <ClubBadge name={match.homeClub.name} logo={match.homeClub.logo} size="sm" />
                  <span className="font-semibold text-white">{match.homeClub.name}</span>
                </div>

                {/* Score / VS */}
                <div className="flex items-center justify-center">
                  {isCompleted && !isEditing ? (
                    <div className="flex items-center gap-1 text-center">
                      <span className="w-8 text-center text-2xl font-bold text-white">
                        {match.homeGoals}
                      </span>
                      <span className="px-1 text-gray-600">—</span>
                      <span className="w-8 text-center text-2xl font-bold text-white">
                        {match.awayGoals}
                      </span>
                    </div>
                  ) : isEditing ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        max={99}
                        value={homeGoals}
                        onChange={(e) => setHomeGoals(e.target.value)}
                        className="pmb-input w-14 text-center text-lg font-bold"
                        autoFocus
                      />
                      <span className="text-gray-500 font-bold">—</span>
                      <input
                        type="number"
                        min={0}
                        max={99}
                        value={awayGoals}
                        onChange={(e) => setAwayGoals(e.target.value)}
                        className="pmb-input w-14 text-center text-lg font-bold"
                      />
                    </div>
                  ) : (
                    <span className="px-4 text-sm font-bold uppercase tracking-widest text-gray-600">
                      vs
                    </span>
                  )}
                </div>

                {/* Away club */}
                <div className="flex flex-1 items-center justify-end gap-3">
                  <span className="font-semibold text-white">{match.awayClub.name}</span>
                  <ClubBadge name={match.awayClub.name} logo={match.awayClub.logo} size="sm" />
                </div>

                {/* Action buttons */}
                {canEdit && (
                  <div className="flex items-center justify-center gap-2 sm:ml-4 sm:justify-end">
                    {isEditing ? (
                      <>
                        <button
                          onClick={() => saveResult(match.id)}
                          disabled={saving}
                          className="pmb-btn-primary text-xs px-3 py-1.5 disabled:opacity-50"
                        >
                          {saving ? "Saving..." : "Save"}
                        </button>
                        <button
                          onClick={cancelEdit}
                          disabled={saving}
                          className="pmb-btn-secondary text-xs px-3 py-1.5"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => startEdit(match)}
                        className={[
                          "text-xs px-3 py-1.5 rounded-lg font-semibold transition",
                          isCompleted
                            ? "border border-pmb-border text-gray-400 hover:border-pmb-gold/40 hover:text-pmb-gold"
                            : "pmb-btn-primary",
                        ].join(" ")}
                      >
                        {isCompleted ? "Edit" : "Enter Result"}
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Status + match error/success */}
              <div className="border-t border-pmb-border/50 px-4 py-2 flex items-center justify-between gap-2">
                <span
                  className={[
                    "text-[10px] font-bold uppercase tracking-widest",
                    isCompleted ? "text-emerald-400" : "text-yellow-500",
                  ].join(" ")}
                >
                  {isCompleted ? "✓ Completed" : "Upcoming"}
                </span>

                {matchErrors[match.id] && (
                  <span className="text-xs text-red-400">{matchErrors[match.id]}</span>
                )}
                {matchSuccesses[match.id] && (
                  <span className="text-xs text-emerald-400">{matchSuccesses[match.id]}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
