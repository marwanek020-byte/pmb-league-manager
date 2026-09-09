"use client";

import { useEffect, useState } from "react";
import { ClubBadge } from "@/components/ClubBadge";

type Player = {
  id: string;
  fullName: string;
  position: string;
  overallRating?: number | null;
  shirtNumber?: number | null;
  photo?: string | null;
};

type Starter = {
  id: string;
  playerId: string;
  slotKey: string;
  slotRole: string;
  positionX: number;
  positionY: number;
  positionAffinity?: number;
  player: Player;
};

type Substitute = {
  id: string;
  playerId: string;
  order: number;
  player: Player;
};

type SetPiece = {
  type: string;
  playerId: string;
  player: Player;
};

type MatchEvent = {
  id: string;
  clubId: string;
  playerId: string;
  assistPlayerId?: string | null;
  type: "GOAL" | "ASSIST" | "SUBSTITUTION";
  minute?: number | null;
  player?: Player;
  assistPlayer?: Player;
  club?: { id: string; name: string; logo?: string | null };
};

type TeamLineup = {
  id?: string;
  formation: string;
  isFrozen: boolean;
  captainId?: string | null;
  viceCaptainId?: string | null;
  starters: Starter[];
  substitutes: Substitute[];
  setPieces?: SetPiece[];
};

type MatchLineupData = {
  matchId: string;
  matchday: number;
  status: "UPCOMING" | "COMPLETED";
  homeClub: { id: string; name: string; logo: string | null };
  awayClub: { id: string; name: string; logo: string | null };
  homeGoals: number | null;
  awayGoals: number | null;
  homeLineup: TeamLineup | null;
  awayLineup: TeamLineup | null;
  events?: MatchEvent[];
};

type Props = {
  matchId: string | null;
  isOpen: boolean;
  onClose: () => void;
};

export function MatchLineupModal({ matchId, isOpen, onClose }: Props) {
  const [data, setData] = useState<MatchLineupData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTeamTab, setActiveTeamTab] = useState<"home" | "away">("home");

  useEffect(() => {
    if (!isOpen || !matchId) {
      setData(null);
      setError(null);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    fetch(`/api/lineups/match/${matchId}`)
      .then(async (res) => {
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || "Failed to load match lineup");
        }
        return res.json();
      })
      .then((json: MatchLineupData) => {
        if (isMounted) {
          setData(json);
        }
      })
      .catch((err: any) => {
        if (isMounted) {
          setError(err.message || "Could not load lineup data");
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, matchId]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-5xl bg-pmb-dark-surface border border-pmb-gold/40 rounded-2xl sm:rounded-3xl shadow-2xl shadow-black/90 overflow-hidden my-auto max-h-[92vh] flex flex-col text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Gradient Ribbon */}
        <div className="h-1.5 w-full bg-gradient-to-r from-pmb-gold via-amber-300 to-pmb-gold" />

        {/* Modal Header */}
        <div className="p-4 sm:p-6 border-b border-white/10 flex items-center justify-between gap-4 bg-black/40">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-pmb-gold/15 border border-pmb-gold/30 text-xl">
              📋
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black tracking-widest text-pmb-gold uppercase">
                  Matchday Lineup
                </span>
                {data && (
                  <span
                    className={[
                      "text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full border",
                      data.status === "COMPLETED"
                        ? "bg-emerald-950/70 border-emerald-500/50 text-emerald-300"
                        : "bg-amber-950/70 border-amber-500/50 text-amber-300",
                    ].join(" ")}
                  >
                    {data.status === "COMPLETED" ? "🔒 Official Frozen Match Sheet" : "Tactical Lineup"}
                  </span>
                )}
              </div>
              <h2 className="text-lg sm:text-xl font-black text-white">
                {data ? `${data.homeClub.name} vs ${data.awayClub.name}` : "Loading Match Sheet…"}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="h-9 w-9 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 flex items-center justify-center text-gray-400 hover:text-white transition cursor-pointer text-sm font-bold"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {loading && (
            <div className="py-16 text-center space-y-3">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-pmb-gold border-t-transparent" />
              <p className="text-xs font-bold uppercase tracking-widest text-pmb-gold">
                Retrieving official match squads…
              </p>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/40 text-red-300 text-sm text-center">
              <p className="font-bold">Unable to load lineup</p>
              <p className="text-xs text-red-400 mt-1">{error}</p>
            </div>
          )}

          {!loading && !error && data && (
            <>
              {/* Score / Match Summary Banner */}
              <div className="flex items-center justify-between p-4 rounded-2xl bg-black/60 border border-white/10 shadow-inner">
                {/* Home Club */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <ClubBadge name={data.homeClub.name} logo={data.homeClub.logo} size="md" />
                  <div className="min-w-0">
                    <p className="text-sm sm:text-base font-black truncate">{data.homeClub.name}</p>
                    <p className="text-[10px] uppercase font-bold text-gray-400">
                      Formation:{" "}
                      <span className="text-pmb-gold">
                        {data.homeLineup?.formation.replace(/^F_/, "").replace(/_/g, "-") || "4-3-3"}
                      </span>
                    </p>
                  </div>
                </div>

                {/* Center Score / VS */}
                <div className="shrink-0 px-4 text-center">
                  {data.status === "COMPLETED" ? (
                    <div className="flex items-center gap-2 text-xl sm:text-2xl font-black">
                      <span className="text-white">{data.homeGoals ?? 0}</span>
                      <span className="text-gray-500">—</span>
                      <span className="text-white">{data.awayGoals ?? 0}</span>
                    </div>
                  ) : (
                    <span className="text-sm font-black uppercase tracking-widest text-pmb-gold">
                      VS
                    </span>
                  )}
                  <span className="text-[9px] uppercase font-extrabold tracking-widest text-gray-500 block mt-0.5">
                    Matchday {data.matchday}
                  </span>
                </div>

                {/* Away Club */}
                <div className="flex items-center justify-end gap-3 flex-1 min-w-0 text-right">
                  <div className="min-w-0">
                    <p className="text-sm sm:text-base font-black truncate">{data.awayClub.name}</p>
                    <p className="text-[10px] uppercase font-bold text-gray-400">
                      Formation:{" "}
                      <span className="text-pmb-gold">
                        {data.awayLineup?.formation.replace(/^F_/, "").replace(/_/g, "-") || "4-3-3"}
                      </span>
                    </p>
                  </div>
                  <ClubBadge name={data.awayClub.name} logo={data.awayClub.logo} size="md" />
                </div>
              </div>

              {/* Match Timeline (Goals & In-Game Substitutions) */}
              <MatchTimelineSection
                events={data.events || []}
                homeClub={data.homeClub}
                awayClub={data.awayClub}
              />

              {/* Mobile Team Switcher (on screens < lg) */}
              <div className="flex lg:hidden rounded-xl border border-white/10 bg-black/40 p-1">
                <button
                  type="button"
                  onClick={() => setActiveTeamTab("home")}
                  className={[
                    "flex-1 py-2 text-xs font-black uppercase tracking-wide rounded-lg transition",
                    activeTeamTab === "home"
                      ? "bg-pmb-gold text-pmb-black shadow-md"
                      : "text-gray-400 hover:text-white",
                  ].join(" ")}
                >
                  {data.homeClub.name} (Home)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTeamTab("away")}
                  className={[
                    "flex-1 py-2 text-xs font-black uppercase tracking-wide rounded-lg transition",
                    activeTeamTab === "away"
                      ? "bg-pmb-gold text-pmb-black shadow-md"
                      : "text-gray-400 hover:text-white",
                  ].join(" ")}
                >
                  {data.awayClub.name} (Away)
                </button>
              </div>

              {/* Team Lineups Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Home Team Panel */}
                <div className={activeTeamTab === "home" ? "block" : "hidden lg:block"}>
                  <TeamLineupCard
                    clubId={data.homeClub.id}
                    teamName={data.homeClub.name}
                    badgeLogo={data.homeClub.logo}
                    lineup={data.homeLineup}
                    isHome={true}
                    events={data.events}
                  />
                </div>

                {/* Away Team Panel */}
                <div className={activeTeamTab === "away" ? "block" : "hidden lg:block"}>
                  <TeamLineupCard
                    clubId={data.awayClub.id}
                    teamName={data.awayClub.name}
                    badgeLogo={data.awayClub.logo}
                    lineup={data.awayLineup}
                    isHome={false}
                    events={data.events}
                  />
                </div>
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-white/10 bg-black/50 flex items-center justify-between text-xs text-gray-400">
          <span className="flex items-center gap-1.5 text-[11px]">
            <span className="text-pmb-gold">★</span> Match sheet includes 11 Starters + 12 Substitutes (23-man squad)
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Chronological Match Timeline Section ─────────────────────────────────────
function MatchTimelineSection({
  events,
  homeClub,
  awayClub,
}: {
  events: MatchEvent[];
  homeClub: { id: string; name: string; logo: string | null };
  awayClub: { id: string; name: string; logo: string | null };
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Strictly GOAL and SUBSTITUTION events — NO yellow or red cards
  const timelineEvents = events
    .filter((e) => e.type === "GOAL" || e.type === "SUBSTITUTION")
    .sort((a, b) => (a.minute ?? 0) - (b.minute ?? 0));

  const goalCount = timelineEvents.filter((e) => e.type === "GOAL").length;
  const subCount = timelineEvents.filter((e) => e.type === "SUBSTITUTION").length;

  if (timelineEvents.length === 0) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-black/40 overflow-hidden shadow-lg">
      {/* Header / Toggle */}
      <button
        type="button"
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="w-full p-3.5 sm:p-4 flex items-center justify-between gap-3 bg-white/[0.03] hover:bg-white/[0.06] transition text-left cursor-pointer"
      >
        <div className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-pmb-gold/15 text-pmb-gold text-sm border border-pmb-gold/30">
            ⏱️
          </span>
          <div>
            <h4 className="text-xs sm:text-sm font-black text-white flex items-center gap-2">
              <span>Match Timeline & Substitutions</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/10 text-gray-300">
                {timelineEvents.length} events
              </span>
            </h4>
            <p className="text-[10px] text-gray-400">
              ⚽ {goalCount} {goalCount === 1 ? "goal" : "goals"} · 🔄 {subCount}{" "}
              {subCount === 1 ? "substitution" : "substitutions"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 font-bold">{isCollapsed ? "Show" : "Hide"}</span>
          <span className="text-gray-400 text-xs">{isCollapsed ? "▼" : "▲"}</span>
        </div>
      </button>

      {/* Timeline Content */}
      {!isCollapsed && (
        <div className="p-4 sm:p-6 border-t border-white/10">
          <div className="relative max-w-2xl mx-auto py-2">
            {/* Central vertical track */}
            <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-0.5 bg-gradient-to-b from-white/10 via-pmb-gold/30 to-white/10 hidden sm:block" />

            <div className="space-y-4">
              {timelineEvents.map((ev, idx) => {
                const isHome = ev.clubId === homeClub.id;
                const isGoal = ev.type === "GOAL";
                const minute = ev.minute != null ? `${ev.minute}'` : "--'";

                return (
                  <div
                    key={ev.id || idx}
                    className="relative flex flex-col sm:flex-row items-center sm:justify-between gap-2 sm:gap-4"
                  >
                    {/* Home side event */}
                    <div className="w-full sm:w-[calc(50%-2rem)] flex justify-start sm:justify-end">
                      {isHome ? (
                        <div
                          className={[
                            "p-2.5 rounded-xl border max-w-full text-xs transition shadow-sm",
                            isGoal
                              ? "bg-amber-950/30 border-pmb-gold/50 text-white"
                              : "bg-emerald-950/25 border-emerald-500/40 text-white",
                          ].join(" ")}
                        >
                          {isGoal ? (
                            <div className="flex items-center sm:flex-row-reverse gap-2 text-left sm:text-right">
                              <span className="text-base shrink-0">⚽</span>
                              <div className="min-w-0">
                                <p className="font-extrabold text-pmb-gold truncate">
                                  {ev.player?.fullName || "Goal"}
                                </p>
                                {ev.assistPlayer && (
                                  <p className="text-[10px] text-gray-300">
                                    👟 Assist: {ev.assistPlayer.fullName}
                                  </p>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center sm:flex-row-reverse gap-2 text-left sm:text-right">
                              <span className="text-base shrink-0">🔄</span>
                              <div className="min-w-0 text-[11px]">
                                <p className="font-bold text-emerald-300 truncate flex items-center sm:justify-end gap-1">
                                  <span>🟢 IN:</span>
                                  <span>{ev.player?.fullName || "Bench Player"}</span>
                                </p>
                                <p className="text-[10px] text-red-300 truncate flex items-center sm:justify-end gap-1">
                                  <span>🔴 OUT:</span>
                                  <span>{ev.assistPlayer?.fullName || "Starter"}</span>
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="hidden sm:block" />
                      )}
                    </div>

                    {/* Center minute badge */}
                    <div className="relative z-10 shrink-0">
                      <span className="flex h-7 px-2.5 items-center justify-center rounded-full bg-pmb-black border border-pmb-gold/60 text-[11px] font-black text-pmb-gold shadow-md">
                        {minute}
                      </span>
                    </div>

                    {/* Away side event */}
                    <div className="w-full sm:w-[calc(50%-2rem)] flex justify-start">
                      {!isHome ? (
                        <div
                          className={[
                            "p-2.5 rounded-xl border max-w-full text-xs transition shadow-sm",
                            isGoal
                              ? "bg-amber-950/30 border-pmb-gold/50 text-white"
                              : "bg-emerald-950/25 border-emerald-500/40 text-white",
                          ].join(" ")}
                        >
                          {isGoal ? (
                            <div className="flex items-center gap-2 text-left">
                              <span className="text-base shrink-0">⚽</span>
                              <div className="min-w-0">
                                <p className="font-extrabold text-pmb-gold truncate">
                                  {ev.player?.fullName || "Goal"}
                                </p>
                                {ev.assistPlayer && (
                                  <p className="text-[10px] text-gray-300">
                                    👟 Assist: {ev.assistPlayer.fullName}
                                  </p>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-left">
                              <span className="text-base shrink-0">🔄</span>
                              <div className="min-w-0 text-[11px]">
                                <p className="font-bold text-emerald-300 truncate flex items-center gap-1">
                                  <span>🟢 IN:</span>
                                  <span>{ev.player?.fullName || "Bench Player"}</span>
                                </p>
                                <p className="text-[10px] text-red-300 truncate flex items-center gap-1">
                                  <span>🔴 OUT:</span>
                                  <span>{ev.assistPlayer?.fullName || "Starter"}</span>
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="hidden sm:block" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Team Lineup Card with Visual Pitch & Bench ────────────────────────────────
function TeamLineupCard({
  clubId,
  teamName,
  badgeLogo,
  lineup,
  isHome,
  events,
}: {
  clubId: string;
  teamName: string;
  badgeLogo: string | null;
  lineup: TeamLineup | null;
  isHome: boolean;
  events?: MatchEvent[];
}) {
  if (!lineup || !lineup.starters || lineup.starters.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-black/30 p-8 text-center space-y-3">
        <ClubBadge name={teamName} logo={badgeLogo} size="md" />
        <h3 className="text-sm font-black text-white">{teamName}</h3>
        <p className="text-xs text-gray-400">
          No tactical lineup submitted for this match. Default squad list applies.
        </p>
      </div>
    );
  }

  const starters = lineup.starters;
  const substitutes = lineup.substitutes || [];
  const captainId = lineup.captainId;
  const viceCaptainId = lineup.viceCaptainId;
  const formationLabel = lineup.formation.replace(/^F_/, "").replace(/_/g, "-");

  // Calculate in-game stats & substitutions for this club
  const clubEvents = (events || []).filter((e) => e.clubId === clubId);

  const playerGoals = new Map<string, number[]>();
  clubEvents
    .filter((e) => e.type === "GOAL" && e.playerId)
    .forEach((e) => {
      const list = playerGoals.get(e.playerId) || [];
      if (e.minute != null) list.push(e.minute);
      playerGoals.set(e.playerId, list);
    });

  // e.playerId is Player IN (Sub), e.assistPlayerId is Player OUT (Starter)
  const subbedOutMap = new Map<string, { minute: number; replacedByName?: string }>();
  const subbedInMap = new Map<string, { minute: number; replacedName?: string }>();

  clubEvents
    .filter((e) => e.type === "SUBSTITUTION")
    .forEach((e) => {
      const min = e.minute ?? 0;
      if (e.assistPlayerId) {
        subbedOutMap.set(e.assistPlayerId, {
          minute: min,
          replacedByName: e.player?.fullName,
        });
      }
      if (e.playerId) {
        subbedInMap.set(e.playerId, {
          minute: min,
          replacedName: e.assistPlayer?.fullName,
        });
      }
    });

  return (
    <div className="rounded-2xl border border-white/15 bg-black/40 overflow-hidden shadow-lg space-y-4 p-4">
      {/* Team Header */}
      <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-3">
        <div className="flex items-center gap-2.5">
          <ClubBadge name={teamName} logo={badgeLogo} size="sm" />
          <div>
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              <span>{teamName}</span>
              <span className="text-[9px] uppercase font-bold text-gray-400">
                ({isHome ? "Home" : "Away"})
              </span>
            </h3>
            <p className="text-[10px] text-pmb-gold font-bold uppercase tracking-wider">
              Tactics: {formationLabel}
            </p>
          </div>
        </div>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white/10 text-gray-300">
          11 XI + {substitutes.length} Subs
        </span>
      </div>

      {/* Mini Pitch for Starters */}
      <div>
        <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 mb-2 block">
          Starting XI (11 Players)
        </span>
        <div
          className="relative w-full aspect-[4/3] rounded-xl overflow-hidden border border-emerald-500/40 shadow-inner"
          style={{
            background:
              "repeating-linear-gradient(0deg, #134e2a, #134e2a 12px, #0f3e21 12px, #0f3e21 24px)",
          }}
        >
          {/* Pitch Lines */}
          <div className="absolute inset-2 border border-white/25 rounded-lg pointer-events-none" />
          <div className="absolute top-1/2 left-2 right-2 border-t border-white/25 pointer-events-none" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full border border-white/25 pointer-events-none" />

          {/* Goal areas */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-24 h-8 border-b border-x border-white/25 pointer-events-none" />
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-24 h-8 border-t border-x border-white/25 pointer-events-none" />

          {/* Player Nodes */}
          {starters.map((s) => {
            const isCap = s.playerId === captainId;
            const isVc = s.playerId === viceCaptainId;
            const goals = playerGoals.get(s.playerId);
            const subOut = subbedOutMap.get(s.playerId);

            return (
              <div
                key={s.id}
                className="absolute flex flex-col items-center -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                style={{
                  left: `${s.positionX}%`,
                  top: `${s.positionY}%`,
                }}
              >
                {/* Jersey / Bubble */}
                <div
                  className={[
                    "relative flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-full font-black text-[9px] sm:text-[10px] shadow-md border",
                    subOut
                      ? "bg-gray-400 text-gray-900 border-red-500 opacity-85"
                      : "bg-pmb-gold text-pmb-black border-white/80",
                  ].join(" ")}
                >
                  {s.player.position.slice(0, 2)}
                  {isCap && (
                    <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-600 text-[7px] font-black text-white shadow">
                      C
                    </span>
                  )}
                  {isVc && !isCap && (
                    <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-blue-600 text-[7px] font-black text-white shadow">
                      V
                    </span>
                  )}
                  {/* Goal Indicator on Pitch */}
                  {goals && goals.length > 0 && (
                    <span
                      title={`Scored: ${goals.map((m) => `${m}'`).join(", ")}`}
                      className="absolute -bottom-1 -left-1 flex h-4 min-w-4 px-0.5 items-center justify-center rounded-full bg-black/90 border border-pmb-gold text-[8px] font-black text-pmb-gold shadow"
                    >
                      ⚽{goals.length > 1 ? goals.length : ""}
                    </span>
                  )}
                  {/* Subbed Out Indicator on Pitch */}
                  {subOut && (
                    <span
                      title={`Subbed off at ${subOut.minute}'`}
                      className="absolute -top-1 -left-1 flex h-4 px-1 items-center justify-center rounded-full bg-red-600 border border-red-300 text-[7px] font-black text-white shadow"
                    >
                      🔻{subOut.minute}'
                    </span>
                  )}
                </div>

                {/* Name Tag */}
                <div className="flex items-center gap-0.5 mt-0.5">
                  <span
                    className={[
                      "max-w-[70px] truncate rounded px-1 py-0.2 text-[8px] sm:text-[9px] font-bold shadow",
                      subOut ? "bg-red-950/80 text-red-200" : "bg-black/80 text-white",
                    ].join(" ")}
                  >
                    {s.player.fullName.split(" ").slice(-1)[0]}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Starting XI List Table */}
      <div className="space-y-1">
        {starters.map((s) => {
          const isCap = s.playerId === captainId;
          const isVc = s.playerId === viceCaptainId;
          const goals = playerGoals.get(s.playerId);
          const subOut = subbedOutMap.get(s.playerId);

          return (
            <div
              key={s.id}
              className={[
                "flex items-center justify-between text-xs py-1.5 px-2.5 rounded-lg transition",
                subOut
                  ? "bg-white/[0.03] border border-red-500/20"
                  : "bg-white/5 hover:bg-white/10",
              ].join(" ")}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-6 text-[10px] font-black text-pmb-gold uppercase shrink-0">
                  {s.slotRole || s.player.position}
                </span>
                <span
                  className={[
                    "font-semibold truncate",
                    subOut
                      ? "text-gray-300 line-through decoration-red-400/50 decoration-1"
                      : "text-white",
                  ].join(" ")}
                >
                  {s.player.fullName}
                </span>
                {isCap && (
                  <span className="text-[8px] font-black bg-red-600/90 text-white px-1 rounded shrink-0">
                    CAPTAIN
                  </span>
                )}
                {isVc && (
                  <span className="text-[8px] font-black bg-blue-600/90 text-white px-1 rounded shrink-0">
                    VC
                  </span>
                )}
                {goals && goals.length > 0 && (
                  <span className="text-[9px] font-extrabold text-amber-300 bg-amber-950/60 border border-amber-500/40 px-1.5 py-0.5 rounded-full flex items-center gap-1 shrink-0">
                    <span>⚽</span>
                    <span>{goals.map((m) => `${m}'`).join(", ")}</span>
                  </span>
                )}
                {subOut && (
                  <span
                    className="text-[9px] font-bold text-red-300 bg-red-950/60 border border-red-500/40 px-1.5 py-0.5 rounded-full flex items-center gap-1 shrink-0"
                    title={
                      subOut.replacedByName
                        ? `Replaced by ${subOut.replacedByName}`
                        : undefined
                    }
                  >
                    <span>🔻</span> {subOut.minute}' OFF
                  </span>
                )}
              </div>
              <span className="text-[10px] font-bold text-gray-400 shrink-0 ml-2">
                OVR {s.player.overallRating || 75}
              </span>
            </div>
          );
        })}
      </div>

      {/* Substitutes Bench (12 players) */}
      <div className="border-t border-white/10 pt-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">
            Substitutes Bench ({substitutes.length}/12)
          </span>
          <span className="text-[9px] font-bold text-gray-500">Official Reserves</span>
        </div>

        {substitutes.length === 0 ? (
          <p className="text-xs text-gray-500 italic">No substitutes on bench.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {substitutes.map((sub, idx) => {
              const subGoals = playerGoals.get(sub.playerId);
              const subIn = subbedInMap.get(sub.playerId);

              return (
                <div
                  key={sub.id}
                  className={[
                    "flex items-center justify-between text-xs py-1.5 px-2 rounded-md transition",
                    subIn
                      ? "bg-emerald-950/30 border border-emerald-500/35"
                      : "bg-white/5",
                  ].join(" ")}
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="text-[9px] font-bold text-gray-500 w-4 shrink-0">
                      #{idx + 1}
                    </span>
                    <span className="text-[9px] font-bold text-amber-400 shrink-0">
                      {sub.player.position}
                    </span>
                    <span
                      className={[
                        "font-medium truncate",
                        subIn ? "text-emerald-100 font-semibold" : "text-gray-300",
                      ].join(" ")}
                    >
                      {sub.player.fullName}
                    </span>
                    {subIn && (
                      <span
                        className="text-[8px] font-black text-emerald-300 bg-emerald-500/20 px-1.5 py-0.5 rounded border border-emerald-400/40 shrink-0 flex items-center gap-0.5"
                        title={
                          subIn.replacedName
                            ? `Replaced ${subIn.replacedName}`
                            : undefined
                        }
                      >
                        <span>🔺</span> {subIn.minute}' ON
                      </span>
                    )}
                    {subGoals && subGoals.length > 0 && (
                      <span className="text-[8px] font-extrabold text-amber-300 bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-500/30 shrink-0 flex items-center gap-0.5">
                        <span>⚽</span> {subGoals.map((m) => `${m}'`).join(", ")}
                      </span>
                    )}
                  </div>
                  <span className="text-[9px] text-gray-500 shrink-0 ml-1">
                    {sub.player.overallRating || 75}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
