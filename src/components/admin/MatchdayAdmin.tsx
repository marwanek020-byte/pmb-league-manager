"use client";

import { useState, useCallback, useEffect } from "react";
import { ClubBadge } from "@/components/ClubBadge";
import { MatchLineupModal } from "@/components/competition/MatchLineupModal";
import { MatchAIScannerModal } from "@/components/admin/MatchAIScannerModal";
import { AdminSubmissionReviewModal } from "@/components/admin/AdminSubmissionReviewModal";

type PlayerSummary = {
  id: string;
  fullName: string;
  position: string;
  overallRating?: number | null;
  photo?: string | null;
};

type LineupStarter = {
  id: string;
  playerId: string;
  slotKey: string;
  slotRole: string;
  player?: PlayerSummary;
};

type LineupSub = {
  id: string;
  playerId: string;
  order: number;
  player?: PlayerSummary;
};

type ClubLineupData = {
  id?: string;
  formation: string;
  captainId?: string | null;
  viceCaptainId?: string | null;
  starters: LineupStarter[];
  substitutes: LineupSub[];
};

type Club = {
  id: string;
  name: string;
  logo: string | null;
  players?: PlayerSummary[];
  lineup?: ClubLineupData | null;
};

type MatchEvent = {
  id?: string;
  clubId: string;
  playerId: string;
  assistPlayerId?: string | null;
  type: "GOAL" | "ASSIST" | "YELLOW_CARD" | "RED_CARD" | "OWN_GOAL" | "SUBSTITUTION";
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
  overrideStadiumName?: string | null;
  ticketPriceConfirmed?: boolean;
  standardTicketPrice?: number | null;
  vipTicketPrice?: number | null;
  submissions?: { id: string; status: string; penaltyApplied: number | null; createdAt?: any }[];
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
  const [viewingLineupMatchId, setViewingLineupMatchId] = useState<string | null>(null);
  const [currentMatchLineups, setCurrentMatchLineups] = useState<any[]>([]);
  const [aiScannerMatch, setAiScannerMatch] = useState<Match | null>(null);
  const [reviewSubmissionMatchId, setReviewSubmissionMatchId] = useState<string | null>(null);

  async function openAIScanner(m: Match) {
    setAiScannerMatch(m);
    try {
      const res = await fetch(`/api/admin/matches/${m.id}`);
      const data = await res.json();
      if (res.ok && data.match) {
        setMatchSquads({
          homeClub: data.match.homeClub,
          awayClub: data.match.awayClub,
        });
        setCurrentMatchLineups(data.match.matchLineups || []);
      }
    } catch {
      // ignore
    }
  }

  async function handleScanConfirmResult(
    matchId: string,
    resultData: {
      homeGoals: number;
      awayGoals: number;
      events: MatchEvent[];
      manOfTheMatchId?: string | null;
    }
  ) {
    const res = await fetch(`/api/admin/matches/${matchId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        homeGoals: resultData.homeGoals,
        awayGoals: resultData.awayGoals,
        manOfTheMatchId: resultData.manOfTheMatchId || null,
        events: resultData.events,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error ?? "Failed to save match result.");
    }

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
              events: resultData.events,
              status: "COMPLETED" as const,
            }
          : m
      );
      return { ...prev, [day]: updated };
    });

    setMatchSuccesses((prev) => ({
      ...prev,
      [matchId]: "✓ Result scanned, verified & saved successfully!",
    }));
  }

  // ── Helper to group club players by XI / Bench / Reserve ───────────────
  const categorizeClubPlayers = useCallback((club?: Club, matchLineups?: any[]) => {
    if (!club || !club.players) return [];

    const frozen = matchLineups?.find((ml: any) => ml.clubId === club.id);
    const lineup = frozen || club.lineup;

    const starterMap = new Map<string, { role: string; isCap: boolean }>();
    if (lineup?.starters) {
      for (const s of lineup.starters) {
        starterMap.set(s.playerId, {
          role: s.slotRole || "XI",
          isCap: s.playerId === lineup.captainId,
        });
      }
    }

    const benchMap = new Map<string, number>();
    if (lineup?.substitutes) {
      for (const sub of lineup.substitutes) {
        benchMap.set(sub.playerId, sub.order);
      }
    }

    return club.players.map((p) => {
      const starter = starterMap.get(p.id);
      const benchOrder = benchMap.get(p.id);

      let category: "XI" | "BENCH" | "RESERVE" = "RESERVE";
      let label = "";

      if (starter) {
        category = "XI";
        label = `⭐ [XI] ${p.fullName} (${p.position}) · OVR ${p.overallRating || 75}${starter.isCap ? " (C)" : ""}`;
      } else if (benchOrder !== undefined) {
        category = "BENCH";
        label = `🪑 [BENCH #${benchOrder}] ${p.fullName} (${p.position}) · OVR ${p.overallRating || 75}`;
      } else {
        category = "RESERVE";
        label = `[RES] ${p.fullName} (${p.position}) · OVR ${p.overallRating || 75}`;
      }

      return {
        ...p,
        category,
        label,
        rank: category === "XI" ? 1 : category === "BENCH" ? 2 : 3,
      };
    }).sort((a, b) => a.rank - b.rank || (b.overallRating || 0) - (a.overallRating || 0));
  }, []);

  // ── Throne Cup Knockout Integration in Matchday Admin ─────────────────
  const [selectedCupStage, setSelectedCupStage] = useState<"ROUND_OF_16" | "QUARTER_FINALS" | "SEMI_FINALS" | "FINAL" | null>(null);
  const [cupData, setCupData] = useState<any | null>(null);
  const [loadingCup, setLoadingCup] = useState(false);
  const [homePenalties, setHomePenalties] = useState("");
  const [awayPenalties, setAwayPenalties] = useState("");
  const [isShootout, setIsShootout] = useState(false);

  // ── Stadium Rental Approvals ──────────────────────────────────────────
  const [pendingRentals, setPendingRentals] = useState<{
    id: string;
    matchday: number;
    fromClub: { id: string; name: string; logo: string | null };
    toClub: { id: string; name: string; logo: string | null };
    offerAmount: number;
    messageNote?: string | null;
  }[]>([]);
  const [rentalActionLoading, setRentalActionLoading] = useState<string | null>(null);
  const [rentalActionMsg, setRentalActionMsg] = useState<string | null>(null);

  const fetchPendingRentals = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/stadium-rentals");
      if (res.ok) {
        const data = await res.json();
        setPendingRentals(data.pending || []);
      }
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    fetchPendingRentals();
  }, [fetchPendingRentals]);

  async function handleRentalAction(offerId: string, action: "APPROVE" | "REJECT") {
    setRentalActionLoading(offerId + action);
    setRentalActionMsg(null);
    try {
      const res = await fetch(`/api/admin/stadium-rentals/${offerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (res.ok) {
        setRentalActionMsg(
          action === "APPROVE"
            ? `✓ Rental approved! Matchday venue relocated and Dugout announcement posted.`
            : `✓ Rental request rejected.`
        );
        await fetchPendingRentals();
      } else {
        alert(data.error ?? "Failed to perform action");
      }
    } catch {
      alert("Network error processing rental action");
    } finally {
      setRentalActionLoading(null);
    }
  }

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
        setCurrentMatchLineups(data.match.matchLineups || []);
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
    setCurrentMatchLineups([]);
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

  function addSubstitutionEvent(clubId: string) {
    const clubSubs = matchEvents.filter(
      (e) => e.clubId === clubId && e.type === "SUBSTITUTION"
    );
    if (clubSubs.length >= 5) {
      alert("A team can make a maximum of 5 substitutions per match (FIFA regulations).");
      return;
    }
    setMatchEvents((prev) => [
      ...prev,
      {
        clubId,
        playerId: "", // Sub IN (from bench)
        assistPlayerId: "", // Sub OUT (from pitch)
        type: "SUBSTITUTION",
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

    // Filter out incomplete events (Goals require playerId; Subs require both playerId and assistPlayerId)
    const validEvents = matchEvents.filter(
      (ev) =>
        ev.clubId &&
        ev.playerId &&
        (ev.type !== "SUBSTITUTION" || (ev.playerId && ev.assistPlayerId))
    );

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
      {/* ── STADIUM RENTAL APPROVALS BANNER (ADMIN) ── */}
      {pendingRentals.length > 0 && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-950/60 to-gray-900 border border-blue-600/50 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">🏟️</span>
              <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">
                Pending Stadium Rental Approvals ({pendingRentals.length})
              </h3>
            </div>
            <span className="text-xs bg-blue-900/60 border border-blue-700/60 text-blue-300 px-2.5 py-0.5 rounded-full font-bold">
              Action Required
            </span>
          </div>

          {rentalActionMsg && (
            <div className="p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-600/50 text-xs text-emerald-300 font-semibold">
              {rentalActionMsg}
            </div>
          )}

          <div className="space-y-2">
            {pendingRentals.map((r) => (
              <div
                key={r.id}
                className="bg-black/40 border border-gray-800 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2 text-sm font-bold text-white">
                    <span>{r.fromClub.name}</span>
                    <span className="text-gray-500 font-normal">wants to rent</span>
                    <span className="text-blue-400">{r.toClub.name}&apos;s Stadium</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Matchday <strong className="text-white">{r.matchday}</strong> · Agreed Fee: <strong className="text-yellow-400">€{r.offerAmount.toLocaleString()}</strong>
                  </p>
                  {r.messageNote && (
                    <p className="text-xs text-gray-500 italic mt-0.5">&ldquo;{r.messageNote}&rdquo;</p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleRentalAction(r.id, "APPROVE")}
                    disabled={rentalActionLoading !== null}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition cursor-pointer disabled:opacity-50"
                  >
                    {rentalActionLoading === r.id + "APPROVE" ? "Approving…" : "✓ Approve & Relocate"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRentalAction(r.id, "REJECT")}
                    disabled={rentalActionLoading !== null}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-red-800 hover:bg-red-700 text-white transition cursor-pointer disabled:opacity-50"
                  >
                    {rentalActionLoading === r.id + "REJECT" ? "Rejecting…" : "✕ Reject"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
                            <button
                              type="button"
                              onClick={() => setViewingLineupMatchId(match.id)}
                              className="text-xs px-2.5 py-1.5 rounded-lg font-bold transition bg-white/5 border border-white/15 text-gray-300 hover:text-white hover:bg-white/10 flex items-center gap-1 shadow-sm"
                              title="View Matchday Tactical Lineup"
                            >
                              <span>📋</span>
                              <span>Lineup</span>
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
                  {match.overrideStadiumName && (
                    <span className="text-[11px] text-blue-400 bg-blue-950/60 border border-blue-700/50 rounded-md px-2 py-0.5 font-medium flex items-center gap-1">
                      <span>📍</span> {match.overrideStadiumName}
                    </span>
                  )}
                  {match.ticketPriceConfirmed && match.standardTicketPrice && (
                    <span className="text-[11px] text-emerald-400 bg-emerald-950/60 border border-emerald-700/50 rounded-md px-2 py-0.5 font-medium">
                      🎟️ €{Number(match.standardTicketPrice)}
                    </span>
                  )}
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
                          type="button"
                          onClick={() => openAIScanner(match)}
                          className="text-xs px-3 py-1.5 rounded-lg font-bold transition bg-gradient-to-r from-amber-500/20 via-pmb-gold/25 to-amber-500/20 border border-pmb-gold/50 text-pmb-gold hover:border-pmb-gold hover:bg-pmb-gold/30 flex items-center gap-1.5 shadow-sm cursor-pointer"
                          title="Scan eFootball Match Screenshots with AI (Full Time & Goal Highlights)"
                        >
                          <span>📸</span>
                          <span>Scan AI</span>
                        </button>
                        {(() => {
                          const hasPending = match.submissions?.some((s) => s.status === "PENDING_ADMIN_REVIEW");
                          const count = match.submissions?.length || 0;
                          return (
                            <button
                              type="button"
                              onClick={() => setReviewSubmissionMatchId(match.id)}
                              className={`text-xs px-2.5 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer ${
                                hasPending
                                  ? "bg-amber-500/25 text-amber-300 border border-amber-500 ring-2 ring-amber-400/40 animate-pulse"
                                  : count > 0
                                  ? "bg-emerald-950/50 text-emerald-300 border border-emerald-500/50 hover:bg-emerald-900/50"
                                  : "bg-emerald-950/40 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-900/40"
                              }`}
                              title="Review Manager Screenshot Submissions & Anti-Cheat Audit"
                            >
                              <span>🛡️</span>
                              <span>
                                {hasPending ? `Review Subs (${count})` : count > 0 ? `Manager Subs (${count})` : "Manager Subs"}
                              </span>
                            </button>
                          );
                        })()}
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
                        <button
                          type="button"
                          onClick={() => setViewingLineupMatchId(match.id)}
                          className="text-xs px-2.5 py-1.5 rounded-lg font-bold transition bg-white/5 border border-white/15 text-gray-300 hover:text-white hover:bg-white/10 flex items-center gap-1 shadow-sm"
                          title="View Matchday Tactical Lineup (11 Starters + 12 Bench)"
                        >
                          <span>📋</span>
                          <span>Lineup</span>
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

              {/* Detailed Editing Drawer (MOTM & Goals/Assists & Matchday Lineups) */}
              {isEditing && (
                <div className="border-t border-pmb-border/60 bg-pmb-dark/40 p-4 space-y-4">
                  {matchDetailsLoading ? (
                    <div className="text-center py-4 text-xs text-pmb-gold animate-pulse">
                      Loading official matchday lineups & rosters...
                    </div>
                  ) : (
                    <>
                      {/* 📋 Official Matchday Tactical Lineup Panel */}
                      {(() => {
                        const homeCategorized = categorizeClubPlayers(matchSquads?.homeClub, currentMatchLineups);
                        const awayCategorized = categorizeClubPlayers(matchSquads?.awayClub, currentMatchLineups);
                        const homeLineup = currentMatchLineups.find((l) => l.clubId === match.homeClubId) || matchSquads?.homeClub?.lineup;
                        const awayLineup = currentMatchLineups.find((l) => l.clubId === match.awayClubId) || matchSquads?.awayClub?.lineup;

                        return (
                          <div className="p-3.5 bg-pmb-dark-surface/90 rounded-xl border border-pmb-gold/30 shadow-md space-y-3">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-2">
                              <div className="flex items-center gap-2">
                                <span className="text-base">📋</span>
                                <div>
                                  <span className="text-xs font-black uppercase tracking-wider text-pmb-gold block">
                                    Official Matchday Lineup & Tactics
                                  </span>
                                  <span className="text-[10px] text-gray-400">
                                    Active club tactics automatically applied (11 Starters + 12 Bench)
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
                                <button
                                  type="button"
                                  onClick={() => openAIScanner(match)}
                                  className="text-xs font-bold px-3 py-1.5 bg-gradient-to-r from-pmb-gold/20 to-amber-500/20 border border-pmb-gold/50 text-pmb-gold rounded-lg hover:bg-pmb-gold/30 transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                                  title="Scan eFootball Match Screenshots with AI"
                                >
                                  <span>📸</span>
                                  <span>Scan AI</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setReviewSubmissionMatchId(match.id)}
                                  className="text-xs font-bold px-3 py-1.5 bg-emerald-950/40 text-emerald-300 border border-emerald-500/40 rounded-lg hover:bg-emerald-900/40 transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                                  title="Review Manager Screenshot Submissions & Anti-Cheat Audit"
                                >
                                  <span>🛡️</span>
                                  <span>Manager Subs</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setViewingLineupMatchId(match.id)}
                                  className="text-xs font-bold px-3 py-1.5 bg-pmb-gold text-pmb-black rounded-lg hover:bg-amber-300 transition flex items-center gap-1.5 shadow"
                                >
                                  <span>👁️</span>
                                  <span>Open Pitch Board</span>
                                </button>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                              {/* Home Side Lineup */}
                              <div className="p-2.5 rounded-lg bg-black/40 border border-white/10 space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="font-black text-white flex items-center gap-1.5">
                                    <ClubBadge name={match.homeClub.name} logo={match.homeClub.logo} size="xs" />
                                    {match.homeClub.name}
                                  </span>
                                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-pmb-gold/20 text-pmb-gold">
                                    {homeLineup?.formation ? homeLineup.formation.replace(/^F_/, "").replace(/_/g, "-") : "4-3-3"}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-[10px] font-bold text-gray-400 uppercase block mb-1">
                                    Starting XI ({homeCategorized.filter((p) => p.category === "XI").length}/11)
                                  </span>
                                  <div className="flex flex-wrap gap-1">
                                    {homeCategorized.filter((p) => p.category === "XI").map((p) => (
                                      <span key={p.id} className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-gray-200 font-medium">
                                        {p.fullName.split(" ").slice(-1)[0]} ({p.position})
                                      </span>
                                    ))}
                                    {homeCategorized.filter((p) => p.category === "XI").length === 0 && (
                                      <span className="text-[10px] text-gray-500 italic">No starting XI submitted</span>
                                    )}
                                  </div>
                                </div>
                                <div className="pt-1 border-t border-white/5">
                                  <span className="text-[9px] font-bold text-gray-500 uppercase block mb-1">
                                    Bench ({homeCategorized.filter((p) => p.category === "BENCH").length}/12)
                                  </span>
                                  <div className="flex flex-wrap gap-1">
                                    {homeCategorized.filter((p) => p.category === "BENCH").map((p) => (
                                      <span key={p.id} className="text-[9px] px-1 py-0.2 rounded bg-white/5 text-gray-400">
                                        {p.fullName.split(" ").slice(-1)[0]}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              </div>

                              {/* Away Side Lineup */}
                              <div className="p-2.5 rounded-lg bg-black/40 border border-white/10 space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="font-black text-white flex items-center gap-1.5">
                                    <ClubBadge name={match.awayClub.name} logo={match.awayClub.logo} size="xs" />
                                    {match.awayClub.name}
                                  </span>
                                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-pmb-gold/20 text-pmb-gold">
                                    {awayLineup?.formation ? awayLineup.formation.replace(/^F_/, "").replace(/_/g, "-") : "4-3-3"}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-[10px] font-bold text-gray-400 uppercase block mb-1">
                                    Starting XI ({awayCategorized.filter((p) => p.category === "XI").length}/11)
                                  </span>
                                  <div className="flex flex-wrap gap-1">
                                    {awayCategorized.filter((p) => p.category === "XI").map((p) => (
                                      <span key={p.id} className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-gray-200 font-medium">
                                        {p.fullName.split(" ").slice(-1)[0]} ({p.position})
                                      </span>
                                    ))}
                                    {awayCategorized.filter((p) => p.category === "XI").length === 0 && (
                                      <span className="text-[10px] text-gray-500 italic">No starting XI submitted</span>
                                    )}
                                  </div>
                                </div>
                                <div className="pt-1 border-t border-white/5">
                                  <span className="text-[9px] font-bold text-gray-500 uppercase block mb-1">
                                    Bench ({awayCategorized.filter((p) => p.category === "BENCH").length}/12)
                                  </span>
                                  <div className="flex flex-wrap gap-1">
                                    {awayCategorized.filter((p) => p.category === "BENCH").map((p) => (
                                      <span key={p.id} className="text-[9px] px-1 py-0.2 rounded bg-white/5 text-gray-400">
                                        {p.fullName.split(" ").slice(-1)[0]}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                      {/* ⭐ Man of the Match Selector */}
                      {(() => {
                        const homeCategorized = categorizeClubPlayers(matchSquads?.homeClub, currentMatchLineups);
                        const awayCategorized = categorizeClubPlayers(matchSquads?.awayClub, currentMatchLineups);

                        return (
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
                              <optgroup label={`⭐ ${match.homeClub.name} Starting XI`}>
                                {homeCategorized.filter((p) => p.category === "XI").map((p) => (
                                  <option key={p.id} value={p.id}>
                                    {p.label}
                                  </option>
                                ))}
                              </optgroup>
                              <optgroup label={`🪑 ${match.homeClub.name} Bench`}>
                                {homeCategorized.filter((p) => p.category === "BENCH").map((p) => (
                                  <option key={p.id} value={p.id}>
                                    {p.label}
                                  </option>
                                ))}
                              </optgroup>
                              <optgroup label={`⭐ ${match.awayClub.name} Starting XI`}>
                                {awayCategorized.filter((p) => p.category === "XI").map((p) => (
                                  <option key={p.id} value={p.id}>
                                    {p.label}
                                  </option>
                                ))}
                              </optgroup>
                              <optgroup label={`🪑 ${match.awayClub.name} Bench`}>
                                {awayCategorized.filter((p) => p.category === "BENCH").map((p) => (
                                  <option key={p.id} value={p.id}>
                                    {p.label}
                                  </option>
                                ))}
                              </optgroup>
                            </select>
                          </div>
                        );
                      })()}

                      {/* ⚽ Match Events & In-Game Substitutions Section */}
                      <div className="space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <span className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                            <span>⚽</span> Goals & <span>🔄</span> Substitutions
                          </span>
                          <div className="flex items-center gap-2 flex-wrap">
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
                            <button
                              type="button"
                              onClick={() => addSubstitutionEvent(match.homeClubId)}
                              className="text-[10px] font-bold px-2 py-1 bg-emerald-950/40 text-emerald-300 border border-emerald-600/40 rounded-lg hover:bg-emerald-900/40 transition flex items-center gap-1"
                            >
                              <span>+ 🔄 Sub</span>
                              <span>({match.homeClub.name.slice(0, 10)})</span>
                              <span className="text-[9px] text-emerald-400 font-extrabold">
                                {matchEvents.filter((e) => e.clubId === match.homeClubId && e.type === "SUBSTITUTION").length}/5
                              </span>
                            </button>
                            <button
                              type="button"
                              onClick={() => addSubstitutionEvent(match.awayClubId)}
                              className="text-[10px] font-bold px-2 py-1 bg-emerald-950/40 text-emerald-300 border border-emerald-600/40 rounded-lg hover:bg-emerald-900/40 transition flex items-center gap-1"
                            >
                              <span>+ 🔄 Sub</span>
                              <span>({match.awayClub.name.slice(0, 10)})</span>
                              <span className="text-[9px] text-emerald-400 font-extrabold">
                                {matchEvents.filter((e) => e.clubId === match.awayClubId && e.type === "SUBSTITUTION").length}/5
                              </span>
                            </button>
                          </div>
                        </div>

                        {matchEvents.length === 0 ? (
                          <div className="text-center py-3 text-xs text-gray-600 bg-pmb-dark/30 rounded-lg border border-dashed border-pmb-border/40">
                            No match events recorded yet. Tap buttons above to record goals or in-game substitutions.
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {matchEvents.map((ev, index) => {
                              const isHome = ev.clubId === match.homeClubId;
                              const currentClub = isHome ? matchSquads?.homeClub : matchSquads?.awayClub;
                              const currentCategorized = categorizeClubPlayers(currentClub, currentMatchLineups);
                              const clubName = isHome
                                ? match.homeClub.name
                                : match.awayClub.name;

                              const isSub = ev.type === "SUBSTITUTION";
                              const xiPlayers = currentCategorized.filter((p) => p.category === "XI");
                              const benchPlayers = currentCategorized.filter((p) => p.category === "BENCH");
                              const reservePlayers = currentCategorized.filter((p) => p.category === "RESERVE");

                              if (isSub) {
                                return (
                                  <div
                                    key={index}
                                    className="flex flex-col sm:flex-row items-start sm:items-center gap-2 p-2.5 bg-emerald-950/20 rounded-lg border border-emerald-500/30 text-xs"
                                  >
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-300 whitespace-nowrap flex items-center gap-1">
                                      <span>🔄</span> Sub · {clubName}
                                    </span>

                                    {/* Player IN (from Bench) */}
                                    <select
                                      value={ev.playerId}
                                      onChange={(e) =>
                                        updateEvent(index, "playerId", e.target.value)
                                      }
                                      className="pmb-input flex-1 text-xs py-1 text-emerald-300 font-medium"
                                    >
                                      <option value="">-- Player IN (🟢 from Bench) --</option>
                                      {benchPlayers.map((p) => (
                                        <option key={p.id} value={p.id}>
                                          🟢 IN: {p.label}
                                        </option>
                                      ))}
                                    </select>

                                    {/* Player OUT (from Starting XI) */}
                                    <select
                                      value={ev.assistPlayerId || ""}
                                      onChange={(e) =>
                                        updateEvent(index, "assistPlayerId", e.target.value || null)
                                      }
                                      className="pmb-input flex-1 text-xs py-1 text-red-300 font-medium"
                                    >
                                      <option value="">-- Player OUT (🔴 from Starters) --</option>
                                      {xiPlayers.map((p) => (
                                        <option key={p.id} value={p.id}>
                                          🔴 OUT: {p.label}
                                        </option>
                                      ))}
                                    </select>

                                    {/* Minute */}
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
                                          e.target.value ? parseInt(e.target.value, 10) : null
                                        )
                                      }
                                      className="pmb-input w-16 text-center text-xs py-1 font-bold"
                                    />

                                    <button
                                      type="button"
                                      onClick={() => removeGoalEvent(index)}
                                      className="text-red-400 hover:text-red-300 p-1 text-sm font-bold"
                                      title="Delete Substitution"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                );
                              }

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
                                    {xiPlayers.length > 0 && (
                                      <optgroup label="⭐ Starting XI (11 Players)">
                                        {xiPlayers.map((p) => (
                                          <option key={p.id} value={p.id}>
                                            {p.label}
                                          </option>
                                        ))}
                                      </optgroup>
                                    )}
                                    {benchPlayers.length > 0 && (
                                      <optgroup label="🪑 Substitutes Bench (12 Players)">
                                        {benchPlayers.map((p) => (
                                          <option key={p.id} value={p.id}>
                                            {p.label}
                                          </option>
                                        ))}
                                      </optgroup>
                                    )}
                                    {reservePlayers.length > 0 && (
                                      <optgroup label="Reserves (Other Players)">
                                        {reservePlayers.map((p) => (
                                          <option key={p.id} value={p.id}>
                                            {p.label}
                                          </option>
                                        ))}
                                      </optgroup>
                                    )}
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
                                    {xiPlayers
                                      .filter((p) => p.id !== ev.playerId)
                                      .length > 0 && (
                                      <optgroup label="⭐ Starting XI">
                                        {xiPlayers
                                          .filter((p) => p.id !== ev.playerId)
                                          .map((p) => (
                                            <option key={p.id} value={p.id}>
                                              👟 {p.label}
                                            </option>
                                          ))}
                                      </optgroup>
                                    )}
                                    {benchPlayers
                                      .filter((p) => p.id !== ev.playerId)
                                      .length > 0 && (
                                      <optgroup label="🪑 Substitutes Bench">
                                        {benchPlayers
                                          .filter((p) => p.id !== ev.playerId)
                                          .map((p) => (
                                            <option key={p.id} value={p.id}>
                                              👟 {p.label}
                                            </option>
                                          ))}
                                      </optgroup>
                                    )}
                                    {reservePlayers
                                      .filter((p) => p.id !== ev.playerId)
                                      .length > 0 && (
                                      <optgroup label="Reserves">
                                        {reservePlayers
                                          .filter((p) => p.id !== ev.playerId)
                                          .map((p) => (
                                            <option key={p.id} value={p.id}>
                                              👟 {p.label}
                                            </option>
                                          ))}
                                      </optgroup>
                                    )}
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
                    <span className="text-[10px] text-gray-400 flex items-center gap-1.5">
                      <span>⚽ {match.events.filter((e) => e.type !== "SUBSTITUTION").length} goals</span>
                      {match.events.some((e) => e.type === "SUBSTITUTION") && (
                        <span>· 🔄 {match.events.filter((e) => e.type === "SUBSTITUTION").length} subs</span>
                      )}
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

      {/* Matchday Tactical Lineup Modal */}
      <MatchLineupModal
        matchId={viewingLineupMatchId}
        isOpen={!!viewingLineupMatchId}
        onClose={() => setViewingLineupMatchId(null)}
      />

      {/* eFootball AI Vision Screenshot Scanner & Confirmation Modal */}
      <MatchAIScannerModal
        match={aiScannerMatch}
        matchSquads={matchSquads}
        isOpen={!!aiScannerMatch}
        onClose={() => setAiScannerMatch(null)}
        onConfirmResult={handleScanConfirmResult}
      />

      {/* Admin Review & Anti-Cheat Audit for Manager Submissions */}
      <AdminSubmissionReviewModal
        matchId={reviewSubmissionMatchId}
        isOpen={!!reviewSubmissionMatchId}
        onClose={() => setReviewSubmissionMatchId(null)}
        onApproved={() => {
          loadMatchday(currentMatchday);
        }}
      />
    </div>
  );
}
