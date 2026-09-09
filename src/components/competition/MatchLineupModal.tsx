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
                    teamName={data.homeClub.name}
                    badgeLogo={data.homeClub.logo}
                    lineup={data.homeLineup}
                    isHome={true}
                  />
                </div>

                {/* Away Team Panel */}
                <div className={activeTeamTab === "away" ? "block" : "hidden lg:block"}>
                  <TeamLineupCard
                    teamName={data.awayClub.name}
                    badgeLogo={data.awayClub.logo}
                    lineup={data.awayLineup}
                    isHome={false}
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

function TeamLineupCard({
  teamName,
  badgeLogo,
  lineup,
  isHome,
}: {
  teamName: string;
  badgeLogo: string | null;
  lineup: TeamLineup | null;
  isHome: boolean;
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
                <div className="relative flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-full bg-pmb-gold text-pmb-black font-black text-[9px] sm:text-[10px] shadow-md border border-white/80">
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
                </div>
                {/* Name Tag */}
                <span className="mt-0.5 max-w-[70px] truncate rounded bg-black/80 px-1 py-0.2 text-[8px] sm:text-[9px] font-bold text-white shadow">
                  {s.player.fullName.split(" ").slice(-1)[0]}
                </span>
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
          return (
            <div
              key={s.id}
              className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-white/5 hover:bg-white/10"
            >
              <div className="flex items-center gap-2">
                <span className="w-6 text-[10px] font-black text-pmb-gold uppercase">
                  {s.slotRole || s.player.position}
                </span>
                <span className="font-semibold text-white truncate">{s.player.fullName}</span>
                {isCap && (
                  <span className="text-[8px] font-black bg-red-600/90 text-white px-1 rounded">
                    CAPTAIN
                  </span>
                )}
                {isVc && (
                  <span className="text-[8px] font-black bg-blue-600/90 text-white px-1 rounded">
                    VC
                  </span>
                )}
              </div>
              <span className="text-[10px] font-bold text-gray-400">
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
            {substitutes.map((sub, idx) => (
              <div
                key={sub.id}
                className="flex items-center justify-between text-xs py-1 px-2 rounded-md bg-white/5"
              >
                <div className="flex items-center gap-1.5 truncate">
                  <span className="text-[9px] font-bold text-gray-500 w-4">#{idx + 1}</span>
                  <span className="text-[9px] font-bold text-amber-400">
                    {sub.player.position}
                  </span>
                  <span className="font-medium text-gray-300 truncate">{sub.player.fullName}</span>
                </div>
                <span className="text-[9px] text-gray-500 shrink-0">
                  {sub.player.overallRating || 75}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
