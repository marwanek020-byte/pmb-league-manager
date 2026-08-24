"use client";

import { useState, useCallback, useEffect } from "react";
import { ClubBadge } from "@/components/ClubBadge";

type PlayerSummary = {
  id: string;
  fullName: string;
  position: string;
  overallRating?: number | null;
  photo?: string | null;
};

type Club = {
  id: string;
  name: string;
  logo: string | null;
  players?: PlayerSummary[];
};

type MatchEvent = {
  id?: string;
  clubId: string;
  playerId: string;
  assistPlayerId?: string | null;
  type: "GOAL" | "ASSIST" | "YELLOW_CARD" | "RED_CARD" | "OWN_GOAL";
  minute?: number | null;
  player?: PlayerSummary;
  assistPlayer?: PlayerSummary;
  club?: { id: string; name: string };
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
  manOfTheMatchId?: string | null;
  manOfTheMatch?: PlayerSummary | null;
  events?: MatchEvent[];
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
  const [motmId, setMotmId] = useState<string>("");
  const [matchEvents, setMatchEvents] = useState<MatchEvent[]>([]);
  const [matchDetailsLoading, setMatchDetailsLoading] = useState(false);
  const [matchSquads, setMatchSquads] = useState<{
    homeClub: Club;
    awayClub: Club;
  } | null>(null);

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

  async function startEdit(match: Match) {
    setEditingId(match.id);
    setHomeGoals(match.homeGoals !== null ? String(match.homeGoals) : "");
    setAwayGoals(match.awayGoals !== null ? String(match.awayGoals) : "");
    setMotmId(match.manOfTheMatchId || "");
    setMatchEvents(match.events || []);
    setMatchErrors((prev) => ({ ...prev, [match.id]: "" }));
    setMatchDetailsLoading(true);

    try {
      const res = await fetch(`/api/admin/matches/${match.id}`);
      const data = await res.json();
      if (res.ok && data.match) {
        setMatchSquads({
          homeClub: data.match.homeClub,
          awayClub: data.match.awayClub,
        });
        if (data.match.events) {
          setMatchEvents(data.match.events);
        }
        if (data.match.manOfTheMatchId) {
          setMotmId(data.match.manOfTheMatchId);
        }
      }
    } catch {
      // ignore
    } finally {
      setMatchDetailsLoading(false);
    }
  }

  function cancelEdit() {
    setEditingId(null);
    setHomeGoals("");
    setAwayGoals("");
    setMotmId("");
    setMatchEvents([]);
    setMatchSquads(null);
  }

  function addGoalEvent(clubId: string) {
    setMatchEvents((prev) => [
      ...prev,
      {
        clubId,
        playerId: "",
        assistPlayerId: null,
        type: "GOAL",
        minute: null,
      },
    ]);
  }

  function removeGoalEvent(index: number) {
    setMatchEvents((prev) => prev.filter((_, i) => i !== index));
  }

  function updateEvent(index: number, field: keyof MatchEvent, value: any) {
    setMatchEvents((prev) =>
      prev.map((ev, i) => (i === index ? { ...ev, [field]: value } : ev))
    );
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

    // Filter out incomplete events
    const validEvents = matchEvents.filter((ev) => ev.playerId && ev.clubId);

    setSaving(true);
    setMatchErrors((prev) => ({ ...prev, [matchId]: "" }));

    try {
      const res = await fetch(`/api/admin/matches/${matchId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          homeGoals: hg,
          awayGoals: ag,
          manOfTheMatchId: motmId || null,
          events: validEvents,
        }),
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
                manOfTheMatchId: data.match.manOfTheMatchId,
                manOfTheMatch: data.match.manOfTheMatch,
                events: validEvents,
                status: "COMPLETED" as const,
              }
            : m
        );
        return { ...prev, [day]: updated };
      });

      setMatchSuccesses((prev) => ({ ...prev, [matchId]: "Result & stats saved." }));
      setEditingId(null);
      setMatchSquads(null);

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

  async function cancelMatchResult(matchId: string) {
    if (
      !confirm(
        "Are you sure you want to cancel this match result?\n\nThis will reset the match back to UPCOMING (as if it never began), delete all match goals/assists, and reverse club budget rewards."
      )
    ) {
      return;
    }

    setSaving(true);
    setMatchErrors((prev) => ({ ...prev, [matchId]: "" }));
    setMatchSuccesses((prev) => ({ ...prev, [matchId]: "" }));

    try {
      const res = await fetch(`/api/admin/matches/${matchId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        setMatchErrors((prev) => ({
          ...prev,
          [matchId]: data.error ?? "Failed to cancel match result.",
        }));
        return;
      }

      // Update state to set status back to UPCOMING
      const day = currentMatchday;
      setMatchesByDay((prev) => {
        const current = prev[day] ?? [];
        const updated = current.map((m) =>
          m.id === matchId
            ? {
                ...m,
                homeGoals: null,
                awayGoals: null,
                manOfTheMatchId: null,
                manOfTheMatch: null,
                events: [],
                status: "UPCOMING" as const,
              }
            : m
        );
        return { ...prev, [day]: updated };
      });

      setMatchSuccesses((prev) => ({
        ...prev,
        [matchId]: "✓ Match result cancelled and reset to UPCOMING.",
      }));
      setEditingId(null);
      setMatchSquads(null);

      // Reload after 800ms so standings & leaderboards immediately refresh
      setTimeout(() => {
        window.location.reload();
      }, 800);
    } catch {
      setMatchErrors((prev) => ({ ...prev, [matchId]: "Network error." }));
    } finally {
      setSaving(false);
    }
  }

  const currentMatches = matchesByDay[currentMatchday] ?? [];

  return (
    <div className="space-y-5">
      {/* Matchday selector */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-xs font-bold uppercase tracking-widest text-gray-500">
          Matchday
        </span>

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
                    ? "bg-pmb-gold text-pmb-black scale-110 shadow-lg shadow-pmb-gold/20"
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
          {currentMatches.filter((m) => m.status === "COMPLETED").length}/
          {currentMatches.length} completed
        </span>
        {loadingMatchday && (
          <span className="text-xs text-pmb-gold animate-pulse">Loading...</span>
        )}
      </div>

      {/* Match list */}
      <div className="space-y-3">
        {currentMatches.length === 0 && (
          <div className="rounded-xl border border-pmb-border p-8 text-center text-sm text-gray-500">
            No matches for matchday {currentMatchday}.
          </div>
        )}

        {currentMatches.map((match) => {
          const isEditing = editingId === match.id;
          const isCompleted = match.status === "COMPLETED";

          const homePlayers = matchSquads?.homeClub?.players || [];
          const awayPlayers = matchSquads?.awayClub?.players || [];
          const allSquadPlayers = [...homePlayers, ...awayPlayers];

          return (
            <div
              key={match.id}
              className={[
                "pmb-card overflow-hidden transition-all duration-200",
                isEditing
                  ? "border-pmb-gold shadow-lg shadow-pmb-gold/10 bg-pmb-dark-surface/90"
                  : "hover:border-pmb-border/80",
              ].join(" ")}
            >
              <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
                {/* Home club */}
                <div className="flex flex-1 items-center gap-3">
                  <ClubBadge
                    name={match.homeClub.name}
                    logo={match.homeClub.logo}
                    size="sm"
                  />
                  <span className="font-semibold text-white">
                    {match.homeClub.name}
                  </span>
                </div>

                {/* Score / VS */}
                <div className="flex items-center justify-center">
                  {isCompleted && !isEditing ? (
                    <div className="flex items-center gap-1 text-center">
                      <span className="w-8 text-center text-2xl font-bold text-white">
                        {match.homeGoals}
                      </span>
                      <span className="px-1 text-gray-600 font-bold">—</span>
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
                      <span className="text-pmb-gold font-bold">—</span>
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
                  <span className="font-semibold text-white">
                    {match.awayClub.name}
                  </span>
                  <ClubBadge
                    name={match.awayClub.name}
                    logo={match.awayClub.logo}
                    size="sm"
                  />
                </div>

                {/* Action buttons */}
                {canEdit && (
                  <div className="flex items-center justify-center gap-2 sm:ml-4 sm:justify-end flex-wrap">
                    {isEditing ? (
                      <>
                        <button
                          onClick={() => saveResult(match.id)}
                          disabled={saving}
                          className="pmb-btn-primary text-xs px-3 py-1.5 disabled:opacity-50"
                        >
                          {saving ? "Saving..." : "Save All"}
                        </button>
                        <button
                          onClick={cancelEdit}
                          disabled={saving}
                          className="pmb-btn-secondary text-xs px-3 py-1.5"
                        >
                          Cancel
                        </button>
                        {isCompleted && (
                          <button
                            type="button"
                            onClick={() => cancelMatchResult(match.id)}
                            disabled={saving}
                            className="text-xs px-3 py-1.5 rounded-lg font-semibold transition bg-red-500/15 border border-red-500/30 text-red-400 hover:bg-red-500/25 hover:text-red-300 disabled:opacity-50 flex items-center gap-1"
                            title="Reset match result back to UPCOMING as if it never began"
                          >
                            <span>↺</span>
                            <span>Reset Match</span>
                          </button>
                        )}
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => startEdit(match)}
                          className={[
                            "text-xs px-3 py-1.5 rounded-lg font-semibold transition",
                            isCompleted
                              ? "border border-pmb-border text-gray-400 hover:border-pmb-gold/40 hover:text-pmb-gold"
                              : "pmb-btn-primary",
                          ].join(" ")}
                        >
                          {isCompleted ? "Edit Stats" : "Enter Result"}
                        </button>
                        {isCompleted && (
                          <button
                            type="button"
                            onClick={() => cancelMatchResult(match.id)}
                            disabled={saving}
                            className="text-xs px-2.5 py-1.5 rounded-lg font-semibold transition bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 hover:text-red-300 disabled:opacity-50 flex items-center gap-1"
                            title="Reset match result back to UPCOMING as if it never began"
                          >
                            <span>↺</span>
                            <span>Reset</span>
                          </button>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Detailed Editing Drawer (MOTM & Goals/Assists) */}
              {isEditing && (
                <div className="border-t border-pmb-border/60 bg-pmb-dark/40 p-4 space-y-4">
                  {matchDetailsLoading ? (
                    <div className="text-center py-4 text-xs text-pmb-gold animate-pulse">
                      Loading club rosters & match stats...
                    </div>
                  ) : (
                    <>
                      {/* ⭐ Man of the Match Selector */}
                      <div className="p-3 bg-pmb-dark-surface/60 rounded-xl border border-pmb-gold/20">
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="text-xs font-bold uppercase tracking-wider text-pmb-gold flex items-center gap-1.5">
                            <span>⭐</span> Man of the Match (MOTM)
                          </span>
                          {motmId && (
                            <button
                              type="button"
                              onClick={() => setMotmId("")}
                              className="text-[10px] text-gray-500 hover:text-red-400"
                            >
                              Clear
                            </button>
                          )}
                        </div>

                        <select
                          value={motmId}
                          onChange={(e) => setMotmId(e.target.value)}
                          className="pmb-input w-full text-xs font-medium bg-pmb-dark"
                        >
                          <option value="">-- Select Man of the Match --</option>
                          <optgroup label={`${match.homeClub.name} (Home)`}>
                            {homePlayers.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.fullName} ({p.position}) - OVR {p.overallRating || 75}
                              </option>
                            ))}
                          </optgroup>
                          <optgroup label={`${match.awayClub.name} (Away)`}>
                            {awayPlayers.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.fullName} ({p.position}) - OVR {p.overallRating || 75}
                              </option>
                            ))}
                          </optgroup>
                        </select>
                      </div>

                      {/* ⚽ Goals & Assists Section */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                            <span>⚽</span> Goals & Assists
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => addGoalEvent(match.homeClubId)}
                              className="text-[10px] font-bold px-2 py-1 bg-pmb-gold/10 text-pmb-gold border border-pmb-gold/30 rounded-lg hover:bg-pmb-gold/20 transition"
                            >
                              + Goal ({match.homeClub.name})
                            </button>
                            <button
                              type="button"
                              onClick={() => addGoalEvent(match.awayClubId)}
                              className="text-[10px] font-bold px-2 py-1 bg-pmb-gold/10 text-pmb-gold border border-pmb-gold/30 rounded-lg hover:bg-pmb-gold/20 transition"
                            >
                              + Goal ({match.awayClub.name})
                            </button>
                          </div>
                        </div>

                        {matchEvents.length === 0 ? (
                          <div className="text-center py-3 text-xs text-gray-600 bg-pmb-dark/30 rounded-lg border border-dashed border-pmb-border/40">
                            No goal events added yet. Tap a button above to record scorers and assists.
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {matchEvents.map((ev, index) => {
                              const isHome = ev.clubId === match.homeClubId;
                              const currentClubPlayers = isHome
                                ? homePlayers
                                : awayPlayers;
                              const clubName = isHome
                                ? match.homeClub.name
                                : match.awayClub.name;

                              return (
                                <div
                                  key={index}
                                  className="flex flex-col sm:flex-row items-start sm:items-center gap-2 p-2.5 bg-pmb-dark/80 rounded-lg border border-pmb-border/60 text-xs"
                                >
                                  {/* Team Tag */}
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-pmb-gold/20 text-pmb-gold whitespace-nowrap">
                                    ⚽ {clubName}
                                  </span>

                                  {/* Scorer Picker */}
                                  <select
                                    value={ev.playerId}
                                    onChange={(e) =>
                                      updateEvent(index, "playerId", e.target.value)
                                    }
                                    className="pmb-input flex-1 text-xs py-1"
                                  >
                                    <option value="">-- Scorer (Required) --</option>
                                    {currentClubPlayers.map((p) => (
                                      <option key={p.id} value={p.id}>
                                        {p.fullName} ({p.position})
                                      </option>
                                    ))}
                                  </select>

                                  {/* Assist Picker */}
                                  <select
                                    value={ev.assistPlayerId || ""}
                                    onChange={(e) =>
                                      updateEvent(
                                        index,
                                        "assistPlayerId",
                                        e.target.value || null
                                      )
                                    }
                                    className="pmb-input flex-1 text-xs py-1"
                                  >
                                    <option value="">-- Assist (Optional) --</option>
                                    {currentClubPlayers
                                      .filter((p) => p.id !== ev.playerId)
                                      .map((p) => (
                                        <option key={p.id} value={p.id}>
                                          👟 {p.fullName} ({p.position})
                                        </option>
                                      ))}
                                  </select>

                                  {/* Minute (optional) */}
                                  <input
                                    type="number"
                                    min={1}
                                    max={120}
                                    placeholder="Min '"
                                    value={ev.minute || ""}
                                    onChange={(e) =>
                                      updateEvent(
                                        index,
                                        "minute",
                                        e.target.value
                                          ? parseInt(e.target.value, 10)
                                          : null
                                      )
                                    }
                                    className="pmb-input w-16 text-center text-xs py-1"
                                  />

                                  {/* Delete Button */}
                                  <button
                                    type="button"
                                    onClick={() => removeGoalEvent(index)}
                                    className="text-red-400 hover:text-red-300 p-1 text-sm font-bold"
                                    title="Delete Goal"
                                  >
                                    ✕
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Status / MOTM / Match summary footer */}
              <div className="border-t border-pmb-border/50 px-4 py-2 flex flex-wrap items-center justify-between gap-2 bg-pmb-dark/20 text-xs">
                <div className="flex items-center gap-3 flex-wrap">
                  <span
                    className={[
                      "text-[10px] font-bold uppercase tracking-widest",
                      isCompleted ? "text-emerald-400" : "text-yellow-500",
                    ].join(" ")}
                  >
                    {isCompleted ? "✓ Completed" : "Upcoming"}
                  </span>

                  {match.manOfTheMatch && (
                    <span className="text-[11px] font-semibold text-pmb-gold flex items-center gap-1">
                      <span>⭐ MOTM:</span>
                      <span className="text-white">
                        {match.manOfTheMatch.fullName}
                      </span>
                    </span>
                  )}

                  {match.events && match.events.length > 0 && (
                    <span className="text-[10px] text-gray-500">
                      ⚽ {match.events.length} goals recorded
                    </span>
                  )}
                </div>

                {matchErrors[match.id] && (
                  <span className="text-xs text-red-400 font-medium">
                    {matchErrors[match.id]}
                  </span>
                )}
                {matchSuccesses[match.id] && (
                  <span className="text-xs text-emerald-400 font-medium">
                    {matchSuccesses[match.id]}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
