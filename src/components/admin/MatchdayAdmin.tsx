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

  // ── Throne Cup Knockout Integration in Matchday Admin ─────────────────
  const [selectedCupStage, setSelectedCupStage] = useState<"ROUND_OF_16" | "QUARTER_FINALS" | "SEMI_FINALS" | "FINAL" | null>(null);
  const [cupData, setCupData] = useState<any | null>(null);
  const [loadingCup, setLoadingCup] = useState(false);
  const [homePenalties, setHomePenalties] = useState("");
  const [awayPenalties, setAwayPenalties] = useState("");
  const [isShootout, setIsShootout] = useState(false);

  const fetchCupData = useCallback(async () => {
    setLoadingCup(true);
    try {
      const res = await fetch("/api/throne-cup");
      const data = await res.json();
      if (res.ok && data.cup) {
        setCupData(data.cup);
      }
    } catch {
      // ignore
    } finally {
      setLoadingCup(false);
    }
  }, []);

  useEffect(() => {
    fetchCupData();
  }, [fetchCupData]);

  function selectCupStage(stage: "ROUND_OF_16" | "QUARTER_FINALS" | "SEMI_FINALS" | "FINAL") {
    setSelectedCupStage(stage);
    setEditingId(null);
    setMatchSquads(null);
    if (!cupData) fetchCupData();
  }

  function selectMatchday(day: number) {
    setSelectedCupStage(null);
    loadMatchday(day);
  }

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

  async function startEditCupMatch(m: any) {
    setEditingId(m.id);
    setHomeGoals(m.homeGoals !== null ? String(m.homeGoals) : "");
    setAwayGoals(m.awayGoals !== null ? String(m.awayGoals) : "");
    setHomePenalties(m.homePenalties !== null ? String(m.homePenalties) : "");
    setAwayPenalties(m.awayPenalties !== null ? String(m.awayPenalties) : "");
    setIsShootout(Boolean(m.isPenaltyShootout));
    setMotmId(m.manOfTheMatchId || "");
    setMatchEvents(m.events || []);
    setMatchErrors((prev) => ({ ...prev, [m.id]: "" }));
    setMatchDetailsLoading(true);

    try {
      const [homeRes, awayRes] = await Promise.all([
        m.homeClubId ? fetch(`/api/admin/clubs/${m.homeClubId}/players`) : Promise.resolve(null),
        m.awayClubId ? fetch(`/api/admin/clubs/${m.awayClubId}/players`) : Promise.resolve(null),
      ]);
      const homeData = homeRes ? await homeRes.json().catch(() => ({ players: [] })) : { players: [] };
      const awayData = awayRes ? await awayRes.json().catch(() => ({ players: [] })) : { players: [] };
      setMatchSquads({
        homeClub: { id: m.homeClubId, name: m.homeClub?.name || "Home", logo: m.homeClub?.logo, players: homeData.players || [] },
        awayClub: { id: m.awayClubId, name: m.awayClub?.name || "Away", logo: m.awayClub?.logo, players: awayData.players || [] },
      });
    } catch {
      // ignore
    } finally {
      setMatchDetailsLoading(false);
    }
  }

  async function saveCupResult(matchId: string) {
    const hg = parseInt(homeGoals, 10);
    const ag = parseInt(awayGoals, 10);
    if (isNaN(hg) || isNaN(ag) || hg < 0 || ag < 0) {
      setMatchErrors((prev) => ({ ...prev, [matchId]: "Enter valid scores for both clubs." }));
      return;
    }

    let hp: number | null = null;
    let ap: number | null = null;
    if (hg === ag) {
      hp = parseInt(homePenalties, 10);
      ap = parseInt(awayPenalties, 10);
      if (isNaN(hp) || isNaN(ap) || hp === ap) {
        setMatchErrors((prev) => ({ ...prev, [matchId]: "Tied cup matches require different penalty scores to determine the winner." }));
        return;
      }
    }

    setSaving(true);
    setMatchErrors((prev) => ({ ...prev, [matchId]: "" }));
    setMatchSuccesses((prev) => ({ ...prev, [matchId]: "" }));

    try {
      const res = await fetch(`/api/admin/throne-cup/matches/${matchId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          homeGoals: hg,
          awayGoals: ag,
          homePenalties: hp,
          awayPenalties: ap,
          isPenaltyShootout: hg === ag,
          manOfTheMatchId: motmId || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMatchErrors((prev) => ({ ...prev, [matchId]: data.error ?? "Failed to save cup result." }));
        return;
      }

      setMatchSuccesses((prev) => ({ ...prev, [matchId]: "✓ Cup result saved and prize money awarded!" }));
      setEditingId(null);
      setMatchSquads(null);
      await fetchCupData();
    } catch {
      setMatchErrors((prev) => ({ ...prev, [matchId]: "Network error." }));
    } finally {
      setSaving(false);
    }
  }

  async function cancelCupResult(matchId: string) {
    if (!confirm("Are you sure you want to cancel this Throne Cup result?\n\nThis will reverse the prize money from the winner's balance, clear the next round slot, and reset the match to UPCOMING.")) {
      return;
    }

    setSaving(true);
    setMatchErrors((prev) => ({ ...prev, [matchId]: "" }));
    setMatchSuccesses((prev) => ({ ...prev, [matchId]: "" }));

    try {
      const res = await fetch(`/api/admin/throne-cup/matches/${matchId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        setMatchErrors((prev) => ({ ...prev, [matchId]: data.error ?? "Failed to cancel cup result." }));
        return;
      }

      setMatchSuccesses((prev) => ({ ...prev, [matchId]: "✓ Cup match result cancelled and reset to UPCOMING." }));
      setEditingId(null);
      setMatchSquads(null);
      await fetchCupData();
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

        <div className="flex flex-wrap gap-1.5 items-center">
          {Array.from({ length: totalMatchdays }, (_, i) => i + 1).map((day) => {
            const dayMatches = matchesByDay[day] ?? [];
            const allCompleted =
              dayMatches.length > 0 &&
              dayMatches.every((m) => m.status === "COMPLETED");
            const someCompleted = dayMatches.some((m) => m.status === "COMPLETED");

            return (
              <div key={day} className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => selectMatchday(day)}
                  className={[
                    "h-8 w-8 rounded-full text-xs font-bold transition",
                    selectedCupStage === null && day === currentMatchday
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

                {/* Throne Cup Stage Bubbles slotted right after MD 4, 8, 12, 16 */}
                {day === 4 && (
                  <button
                    type="button"
                    onClick={() => selectCupStage("ROUND_OF_16")}
                    className={[
                      "h-8 px-3 rounded-full text-[11px] font-black tracking-wide transition flex items-center gap-1 border shadow-md",
                      selectedCupStage === "ROUND_OF_16"
                        ? "bg-gradient-to-r from-amber-400 via-pmb-gold to-yellow-500 text-black border-yellow-300 scale-110 shadow-pmb-gold/30"
                        : "bg-amber-500/15 border-amber-500/40 text-amber-300 hover:bg-amber-500/25 hover:text-white",
                    ].join(" ")}
                    title="Throne Cup Round of 16 (8 Matches · €2,000,000 Prize per winner)"
                  >
                    <span>👑</span>
                    <span>CUP R16</span>
                  </button>
                )}

                {day === 8 && (
                  <button
                    type="button"
                    onClick={() => selectCupStage("QUARTER_FINALS")}
                    className={[
                      "h-8 px-3 rounded-full text-[11px] font-black tracking-wide transition flex items-center gap-1 border shadow-md",
                      selectedCupStage === "QUARTER_FINALS"
                        ? "bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-500 text-black border-emerald-300 scale-110 shadow-emerald-500/30"
                        : "bg-emerald-500/15 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/25 hover:text-white",
                    ].join(" ")}
                    title="Throne Cup Quarter-Finals (4 Matches · €4,000,000 Prize per winner)"
                  >
                    <span>👑</span>
                    <span>CUP QF</span>
                  </button>
                )}

                {day === 12 && (
                  <button
                    type="button"
                    onClick={() => selectCupStage("SEMI_FINALS")}
                    className={[
                      "h-8 px-3 rounded-full text-[11px] font-black tracking-wide transition flex items-center gap-1 border shadow-md",
                      selectedCupStage === "SEMI_FINALS"
                        ? "bg-gradient-to-r from-blue-400 via-sky-400 to-indigo-500 text-black border-blue-300 scale-110 shadow-blue-500/30"
                        : "bg-blue-500/15 border-blue-500/40 text-blue-300 hover:bg-blue-500/25 hover:text-white",
                    ].join(" ")}
                    title="Throne Cup Semi-Finals (2 Matches · €6,000,000 Prize per winner)"
                  >
                    <span>👑</span>
                    <span>CUP SF</span>
                  </button>
                )}

                {day === 16 && (
                  <button
                    type="button"
                    onClick={() => selectCupStage("FINAL")}
                    className={[
                      "h-8 px-3 rounded-full text-[11px] font-black tracking-wide transition flex items-center gap-1 border shadow-md",
                      selectedCupStage === "FINAL"
                        ? "bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-500 text-black border-yellow-200 scale-110 shadow-yellow-500/40"
                        : "bg-yellow-500/20 border-yellow-400/50 text-yellow-300 hover:bg-yellow-500/30 hover:text-white",
                    ].join(" ")}
                    title="Throne Cup Grand Final (1 Match · €8,000,000 Champion Prize)"
                  >
                    <span>🏆</span>
                    <span>FINAL</span>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* When a Throne Cup Stage is selected */}
      {selectedCupStage !== null && (
        <div className="space-y-4">
          {/* Stage Header Banner */}
          {(() => {
            const stageConfig = {
              ROUND_OF_16: {
                title: "Throne Cup — Round of 16 (ثمن النهائي)",
                timing: "Scheduled After Botola Matchday 4",
                prize: "€2,000,000 per Winner",
                color: "from-amber-600/30 to-amber-950/20 border-amber-500/40",
              },
              QUARTER_FINALS: {
                title: "Throne Cup — Quarter-Finals (ربع النهائي)",
                timing: "Scheduled After Botola Matchday 8",
                prize: "€4,000,000 per Winner (+2M)",
                color: "from-emerald-600/30 to-emerald-950/20 border-emerald-500/40",
              },
              SEMI_FINALS: {
                title: "Throne Cup — Semi-Finals (نصف النهائي)",
                timing: "Scheduled After Botola Matchday 12",
                prize: "€6,000,000 per Winner (+2M)",
                color: "from-blue-600/30 to-blue-950/20 border-blue-500/40",
              },
              FINAL: {
                title: "Throne Cup — Grand Final (النهائي الكبير 🏆)",
                timing: "Scheduled After Botola Matchday 16",
                prize: "€8,000,000 Champion Prize (+2M)",
                color: "from-yellow-500/40 to-yellow-950/40 border-yellow-400/60",
              },
            }[selectedCupStage];

            const stageMatches = (cupData?.matches || []).filter((m: any) => m.stage === selectedCupStage);
            const completedCount = stageMatches.filter((m: any) => m.status === "COMPLETED").length;

            return (
              <div className={`p-4 rounded-2xl border bg-gradient-to-r ${stageConfig.color} shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4`}>
                <div className="flex items-center gap-3">
                  <span className="text-3xl">👑</span>
                  <div>
                    <h2 className="text-xl font-black text-white">{stageConfig.title}</h2>
                    <p className="text-xs font-bold text-pmb-gold mt-0.5">{stageConfig.timing}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-black/60 text-emerald-300 border border-emerald-500/30">
                    💰 {stageConfig.prize}
                  </span>
                  <span className="text-xs text-gray-300 font-bold">
                    {completedCount}/{stageMatches.length} completed
                  </span>
                </div>
              </div>
            );
          })()}

          {/* Cup Matches List */}
          <div className="space-y-3">
            {((cupData?.matches || []).filter((m: any) => m.stage === selectedCupStage) as any[]).map((match) => {
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
                      : isCompleted
                      ? "border-pmb-gold/40 bg-pmb-dark-surface/90"
                      : "hover:border-pmb-border/80",
                  ].join(" ")}
                >
                  <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
                    {/* Home Club */}
                    <div className="flex flex-1 items-center gap-3">
                      {match.homeClub ? (
                        <>
                          <ClubBadge name={match.homeClub.name} logo={match.homeClub.logo} size="sm" />
                          <span className="font-semibold text-white truncate">{match.homeClub.name}</span>
                        </>
                      ) : (
                        <span className="text-xs text-gray-500 italic">TBD (Previous Round Winner)</span>
                      )}
                    </div>

                    {/* Score / VS */}
                    <div className="flex items-center justify-center">
                      {isCompleted && !isEditing ? (
                        <div className="flex items-center gap-1 text-center">
                          <span className="w-8 text-center text-2xl font-bold text-white">
                            {match.homeGoals}
                            {match.isPenaltyShootout && (
                              <span className="text-[11px] text-pmb-gold ml-1">({match.homePenalties}p)</span>
                            )}
                          </span>
                          <span className="px-1 text-gray-600 font-bold">—</span>
                          <span className="w-8 text-center text-2xl font-bold text-white">
                            {match.awayGoals}
                            {match.isPenaltyShootout && (
                              <span className="text-[11px] text-pmb-gold ml-1">({match.awayPenalties}p)</span>
                            )}
                          </span>
                        </div>
                      ) : isEditing ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min={0}
                            max={99}
                            value={homeGoals}
                            onChange={(e) => {
                              setHomeGoals(e.target.value);
                              if (e.target.value === String(awayGoals) && e.target.value !== "") {
                                setIsShootout(true);
                              } else {
                                setIsShootout(false);
                              }
                            }}
                            className="pmb-input w-14 text-center text-lg font-bold"
                            autoFocus
                          />
                          <span className="text-pmb-gold font-bold">—</span>
                          <input
                            type="number"
                            min={0}
                            max={99}
                            value={awayGoals}
                            onChange={(e) => {
                              setAwayGoals(e.target.value);
                              if (String(homeGoals) === e.target.value && e.target.value !== "") {
                                setIsShootout(true);
                              } else {
                                setIsShootout(false);
                              }
                            }}
                            className="pmb-input w-14 text-center text-lg font-bold"
                          />
                        </div>
                      ) : (
                        <span className="px-4 text-sm font-bold uppercase tracking-widest text-gray-600">
                          vs
                        </span>
                      )}
                    </div>

                    {/* Away Club */}
                    <div className="flex flex-1 items-center justify-end gap-3">
                      {match.awayClub ? (
                        <>
                          <span className="font-semibold text-white truncate">{match.awayClub.name}</span>
                          <ClubBadge name={match.awayClub.name} logo={match.awayClub.logo} size="sm" />
                        </>
                      ) : (
                        <span className="text-xs text-gray-500 italic">TBD (Previous Round Winner)</span>
                      )}
                    </div>

                    {/* Admin Buttons */}
                    {canEdit && match.homeClubId && match.awayClubId && (
                      <div className="flex items-center justify-center gap-2 sm:ml-4 sm:justify-end flex-wrap">
                        {isEditing ? (
                          <>
                            <button
                              onClick={() => saveCupResult(match.id)}
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
                                onClick={() => cancelCupResult(match.id)}
                                disabled={saving}
                                className="text-xs px-3 py-1.5 rounded-lg font-bold transition bg-red-600/30 border border-red-500/60 text-red-200 hover:bg-red-600/50 hover:text-white disabled:opacity-50 flex items-center gap-1 shadow-md"
                                title="Reset cup match result and reverse prize"
                              >
                                <span>↺</span>
                                <span>Cancel Result</span>
                              </button>
                            )}
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => startEditCupMatch(match)}
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
                                onClick={() => cancelCupResult(match.id)}
                                disabled={saving}
                                className="text-xs px-3 py-1.5 rounded-lg font-bold transition bg-red-600/25 border border-red-500/50 text-red-300 hover:bg-red-600/40 hover:text-white disabled:opacity-50 flex items-center gap-1 shadow-sm"
                                title="Reset cup match result and reverse prize"
                              >
                                <span>↺</span>
                                <span>Cancel Result</span>
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* MOTM & Shootout Drawer */}
                  {isEditing && (
                    <div className="border-t border-pmb-border/60 bg-pmb-dark/40 p-4 space-y-4">
                      {/* Shootout input if draw */}
                      {(isShootout || homeGoals === awayGoals) && homeGoals !== "" && (
                        <div className="p-3 bg-yellow-500/10 rounded-xl border border-yellow-500/30 flex items-center justify-between gap-3">
                          <span className="text-xs font-bold text-yellow-400">🥅 Penalty Shootout (Required for Draw):</span>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min={0}
                              placeholder="Home"
                              value={homePenalties}
                              onChange={(e) => setHomePenalties(e.target.value)}
                              className="pmb-input w-20 text-center text-xs font-bold"
                            />
                            <span className="text-yellow-400 font-bold">—</span>
                            <input
                              type="number"
                              min={0}
                              placeholder="Away"
                              value={awayPenalties}
                              onChange={(e) => setAwayPenalties(e.target.value)}
                              className="pmb-input w-20 text-center text-xs font-bold"
                            />
                          </div>
                        </div>
                      )}

                      {/* MOTM */}
                      <div className="p-3 bg-pmb-dark-surface/60 rounded-xl border border-pmb-gold/20">
                        <span className="text-xs font-bold uppercase tracking-wider text-pmb-gold flex items-center gap-1.5 mb-2">
                          <span>⭐</span> Man of the Match (MOTM)
                        </span>
                        <select
                          value={motmId}
                          onChange={(e) => setMotmId(e.target.value)}
                          className="pmb-input w-full text-xs"
                        >
                          <option value="">-- Select Star Player --</option>
                          {allSquadPlayers.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.fullName} ({p.position})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Prize Info */}
                      <div className="p-2.5 rounded-lg bg-emerald-950/30 border border-emerald-500/30 text-xs text-emerald-300 flex items-center justify-between">
                        <span>Winner Stage Reward:</span>
                        <span className="font-extrabold text-emerald-200">+€{Number(match.prizeAmount) / 1000000}M Budget</span>
                      </div>
                    </div>
                  )}

                  {/* Feedback Messages */}
                  {matchErrors[match.id] && (
                    <div className="px-4 py-2 bg-red-500/10 border-t border-red-500/20 text-xs text-red-300">
                      {matchErrors[match.id]}
                    </div>
                  )}
                  {matchSuccesses[match.id] && (
                    <div className="px-4 py-2 bg-emerald-500/10 border-t border-emerald-500/20 text-xs text-emerald-300">
                      {matchSuccesses[match.id]}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* When a Regular Matchday is selected */}
      {selectedCupStage === null && (
        <>
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

          {/* Throne Cup Knockout Schedule Notice */}
          {currentMatchday === 4 && (
            <div className="p-3 rounded-xl bg-gradient-to-r from-amber-950/30 to-black border border-amber-500/40 text-xs text-amber-200 flex items-center justify-between shadow-md">
              <div className="flex items-center gap-2">
                <span className="text-lg">👑</span>
                <span>
                  <strong>Throne Cup Round of 16 (8 Matches)</strong> takes place after this Matchday! (Prize: <strong>€2,000,000</strong> per winner)
                </span>
              </div>
              <button
                type="button"
                onClick={() => selectCupStage("ROUND_OF_16")}
                className="text-pmb-gold underline font-bold hover:text-white shrink-0 ml-2"
              >
                Open R16 Matches →
              </button>
            </div>
          )}
          {currentMatchday === 8 && (
            <div className="p-3 rounded-xl bg-gradient-to-r from-emerald-950/30 to-black border border-emerald-500/40 text-xs text-emerald-200 flex items-center justify-between shadow-md">
              <div className="flex items-center gap-2">
                <span className="text-lg">👑</span>
                <span>
                  <strong>Throne Cup Quarter-Finals (4 Matches)</strong> takes place after this Matchday! (Prize: <strong>€4,000,000</strong> per winner)
                </span>
              </div>
              <button
                type="button"
                onClick={() => selectCupStage("QUARTER_FINALS")}
                className="text-emerald-400 underline font-bold hover:text-white shrink-0 ml-2"
              >
                Open QF Matches →
              </button>
            </div>
          )}
          {currentMatchday === 12 && (
            <div className="p-3 rounded-xl bg-gradient-to-r from-blue-950/30 to-black border border-blue-500/40 text-xs text-blue-200 flex items-center justify-between shadow-md">
              <div className="flex items-center gap-2">
                <span className="text-lg">👑</span>
                <span>
                  <strong>Throne Cup Semi-Finals (2 Matches)</strong> takes place after this Matchday! (Prize: <strong>€6,000,000</strong> per winner)
                </span>
              </div>
              <button
                type="button"
                onClick={() => selectCupStage("SEMI_FINALS")}
                className="text-blue-400 underline font-bold hover:text-white shrink-0 ml-2"
              >
                Open SF Matches →
              </button>
            </div>
          )}
          {currentMatchday === 16 && (
            <div className="p-3 rounded-xl bg-gradient-to-r from-yellow-950/40 via-black to-yellow-950/40 border border-yellow-500/50 text-xs text-yellow-200 flex items-center justify-between shadow-md">
              <div className="flex items-center gap-2">
                <span className="text-lg">🏆</span>
                <span>
                  <strong>Throne Cup Grand Final (1 Match)</strong> takes place after this Matchday! (Champion Prize: <strong>€8,000,000</strong>)
                </span>
              </div>
              <button
                type="button"
                onClick={() => selectCupStage("FINAL")}
                className="text-yellow-400 underline font-bold hover:text-white shrink-0 ml-2"
              >
                Open Final Match →
              </button>
            </div>
          )}
        </>
      )}

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
                            className="text-xs px-3 py-1.5 rounded-lg font-bold transition bg-red-600/30 border border-red-500/60 text-red-200 hover:bg-red-600/50 hover:text-white disabled:opacity-50 flex items-center gap-1 shadow-md shadow-red-900/20"
                            title="Reset match result back to UPCOMING as if it never began"
                          >
                            <span>↺</span>
                            <span>Cancel Result</span>
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
                            className="text-xs px-3 py-1.5 rounded-lg font-bold transition bg-red-600/25 border border-red-500/50 text-red-300 hover:bg-red-600/40 hover:text-white disabled:opacity-50 flex items-center gap-1 shadow-sm"
                            title="Reset match result back to UPCOMING as if it never began"
                          >
                            <span>↺</span>
                            <span>Cancel Result</span>
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
