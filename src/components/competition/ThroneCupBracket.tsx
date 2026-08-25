"use client";

import { useState, useEffect } from "react";
import { ClubBadge } from "@/components/ClubBadge";
import { CupStage } from "@prisma/client";

interface Club {
  id: string;
  name: string;
  logo: string | null;
}

interface Player {
  id: string;
  fullName: string;
  position: string;
}

interface CupMatchEvent {
  id: string;
  type: string;
  clubId: string;
  playerId: string;
  assistPlayerId?: string | null;
  minute?: number | null;
  player?: Player;
}

interface CupMatch {
  id: string;
  stage: CupStage;
  matchOrder: number;
  linkedMatchday: number;
  homeClubId: string | null;
  awayClubId: string | null;
  winnerClubId: string | null;
  homeGoals: number | null;
  awayGoals: number | null;
  homePenalties: number | null;
  awayPenalties: number | null;
  isPenaltyShootout: boolean;
  status: "UPCOMING" | "COMPLETED" | "CANCELLED";
  playedAt: string | null;
  manOfTheMatchId: string | null;
  prizeAmount: string | number;
  prizeAwarded: boolean;
  homeClub: Club | null;
  awayClub: Club | null;
  winnerClub: Club | null;
  manOfTheMatch: Player | null;
  events: CupMatchEvent[];
}

interface ThroneCupData {
  id: string;
  name: string;
  season: string;
  status: string;
  championClubId: string | null;
  championClub: Club | null;
  matches: CupMatch[];
}

const STAGES: { stage: CupStage; title: string; timing: string; prize: string; color: string }[] = [
  {
    stage: "ROUND_OF_16",
    title: "Round of 16 (ثمن النهائي)",
    timing: "Scheduled After Matchday 4",
    prize: "€2,000,000 per Winner",
    color: "from-amber-600/30 to-amber-950/20 border-amber-500/30",
  },
  {
    stage: "QUARTER_FINALS",
    title: "Quarter-Finals (ربع النهائي)",
    timing: "Scheduled After Matchday 8",
    prize: "€4,000,000 per Winner (+2M)",
    color: "from-emerald-600/30 to-emerald-950/20 border-emerald-500/30",
  },
  {
    stage: "SEMI_FINALS",
    title: "Semi-Finals (نصف النهائي)",
    timing: "Scheduled After Matchday 12",
    prize: "€6,000,000 per Winner (+2M)",
    color: "from-blue-600/30 to-blue-950/20 border-blue-500/30",
  },
  {
    stage: "FINAL",
    title: "Grand Final (النهائي الكبير)",
    timing: "Scheduled After Matchday 16",
    prize: "€8,000,000 Champion Prize (+2M)",
    color: "from-yellow-500/40 via-amber-500/30 to-yellow-950/40 border-yellow-400/50",
  },
];

export function ThroneCupBracket({ isAdmin = false }: { isAdmin?: boolean }) {
  const [cup, setCup] = useState<ThroneCupData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Editing state
  const [editingMatch, setEditingMatch] = useState<CupMatch | null>(null);
  const [homeGoals, setHomeGoals] = useState<number | string>("");
  const [awayGoals, setAwayGoals] = useState<number | string>("");
  const [homePenalties, setHomePenalties] = useState<number | string>("");
  const [awayPenalties, setAwayPenalties] = useState<number | string>("");
  const [isShootout, setIsShootout] = useState(false);
  const [motmId, setMotmId] = useState<string>("");
  const [squadPlayers, setSquadPlayers] = useState<Player[]>([]);
  const [saving, setSaving] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);

  async function fetchCup() {
    setLoading(true);
    try {
      const res = await fetch("/api/throne-cup");
      const data = await res.json();
      if (res.ok && data.cup) {
        setCup(data.cup);
      } else {
        setError(data.error || "Failed to load Throne Cup.");
      }
    } catch {
      setError("Network error while loading Throne Cup.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchCup();
  }, []);

  async function handleRedraw() {
    if (!confirm("Are you sure you want to re-draw the Throne Cup tournament bracket? All current cup results will be reset.")) {
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/admin/throne-cup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ forceRegenerate: true }),
      });
      const data = await res.json();
      if (res.ok) {
        setCup(data.cup);
      } else {
        alert(data.error || "Failed to re-draw tournament.");
      }
    } catch {
      alert("Network error.");
    } finally {
      setLoading(false);
    }
  }

  async function openEditDialog(match: CupMatch) {
    setEditingMatch(match);
    setHomeGoals(match.homeGoals !== null ? match.homeGoals : "");
    setAwayGoals(match.awayGoals !== null ? match.awayGoals : "");
    setHomePenalties(match.homePenalties !== null ? match.homePenalties : "");
    setAwayPenalties(match.awayPenalties !== null ? match.awayPenalties : "");
    setIsShootout(match.isPenaltyShootout);
    setMotmId(match.manOfTheMatchId || "");
    setDialogError(null);

    // Fetch players for both clubs for MOTM selector
    if (match.homeClubId && match.awayClubId) {
      try {
        const [homeRes, awayRes] = await Promise.all([
          fetch(`/api/admin/clubs/${match.homeClubId}/players`),
          fetch(`/api/admin/clubs/${match.awayClubId}/players`),
        ]);
        const homeData = await homeRes.json().catch(() => ({ players: [] }));
        const awayData = await awayRes.json().catch(() => ({ players: [] }));
        setSquadPlayers([...(homeData.players || []), ...(awayData.players || [])]);
      } catch {
        setSquadPlayers([]);
      }
    }
  }

  async function handleSaveResult() {
    if (!editingMatch) return;
    const hg = parseInt(String(homeGoals), 10);
    const ag = parseInt(String(awayGoals), 10);

    if (isNaN(hg) || isNaN(ag) || hg < 0 || ag < 0) {
      setDialogError("Please enter valid scores for both clubs.");
      return;
    }

    let hp: number | null = null;
    let ap: number | null = null;

    if (hg === ag) {
      hp = parseInt(String(homePenalties), 10);
      ap = parseInt(String(awayPenalties), 10);
      if (isNaN(hp) || isNaN(ap) || hp === ap) {
        setDialogError("For tied knockout matches, enter different penalty shootout scores to decide the winner.");
        return;
      }
    }

    setSaving(true);
    setDialogError(null);

    try {
      const res = await fetch(`/api/admin/throne-cup/matches/${editingMatch.id}`, {
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
      if (res.ok) {
        setEditingMatch(null);
        await fetchCup();
      } else {
        setDialogError(data.error || "Failed to save match result.");
      }
    } catch {
      setDialogError("Network error.");
    } finally {
      setSaving(false);
    }
  }

  async function handleCancelResult(matchId: string) {
    if (!confirm("Are you sure you want to cancel this match result?\n\nThis will reverse the prize money, remove the winner from the next round, and reset the match to UPCOMING.")) {
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/admin/throne-cup/matches/${matchId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok) {
        setEditingMatch(null);
        await fetchCup();
      } else {
        alert(data.error || "Failed to cancel match result.");
      }
    } catch {
      alert("Network error.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="pmb-card p-12 text-center text-pmb-gold animate-pulse">
        <span className="text-3xl">👑</span>
        <p className="mt-2 font-bold">Loading Throne Cup Tournament Bracket...</p>
      </div>
    );
  }

  if (error || !cup) {
    return (
      <div className="pmb-card p-8 text-center text-red-400">
        <p>{error || "Throne Cup is not available."}</p>
        <button onClick={fetchCup} className="pmb-btn-primary mt-4 text-xs px-4 py-2">
          Retry
        </button>
      </div>
    );
  }

  const matchesByStage: Record<CupStage, CupMatch[]> = {
    ROUND_OF_16: cup.matches.filter((m) => m.stage === "ROUND_OF_16"),
    QUARTER_FINALS: cup.matches.filter((m) => m.stage === "QUARTER_FINALS"),
    SEMI_FINALS: cup.matches.filter((m) => m.stage === "SEMI_FINALS"),
    FINAL: cup.matches.filter((m) => m.stage === "FINAL"),
  };

  return (
    <div className="space-y-8">
      {/* Royal Moroccan Header */}
      <div className="relative overflow-hidden rounded-2xl border-2 border-pmb-gold/40 bg-gradient-to-r from-red-950/40 via-black to-emerald-950/40 p-6 sm:p-8 shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-yellow-400 via-pmb-gold to-amber-600 flex items-center justify-center text-3xl shadow-xl shadow-pmb-gold/20 border border-yellow-300">
              👑
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-widest text-pmb-gold">
                  PMB Moroccan Royal Tournament
                </span>
                <span className="text-[10px] bg-red-600/30 text-red-400 border border-red-500/40 px-2 py-0.5 rounded-full font-bold">
                  🇲🇦 Botola Pro
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-0.5">
                Throne Cup <span className="text-pmb-gold font-serif">كأس العرش</span>
              </h1>
              <p className="text-xs text-gray-300 mt-1 max-w-xl">
                16 Botola Pro clubs competing in a 4-round progressive knockout tournament. Matches take place after every 4 league matchdays with €52,000,000 total prize pool!
              </p>
            </div>
          </div>

          {/* Champion Display & Admin Redraw */}
          <div className="flex items-center gap-3">
            {cup.championClub && (
              <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border-2 border-yellow-400/60 shadow-lg shadow-yellow-500/10">
                <ClubBadge name={cup.championClub.name} logo={cup.championClub.logo} size="md" />
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-pmb-gold">Reigning Champion</p>
                  <p className="text-sm font-extrabold text-white">{cup.championClub.name} 🏆</p>
                </div>
              </div>
            )}

            {isAdmin && (
              <button
                onClick={handleRedraw}
                className="px-3.5 py-2 rounded-xl border border-pmb-gold/40 bg-pmb-gold/15 text-pmb-gold hover:bg-pmb-gold hover:text-black transition font-bold text-xs shadow-sm flex items-center gap-1.5"
              >
                <span>🎲</span>
                <span>Re-Draw Tournament</span>
              </button>
            )}
          </div>
        </div>

        {/* Prize Pool Progression Ribbon */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 border-t border-pmb-border/40">
          <div className="p-2.5 rounded-xl bg-black/40 border border-pmb-border/50 text-center">
            <span className="text-[10px] font-bold text-gray-400 uppercase">Round of 16 (After MD 4)</span>
            <p className="text-sm font-extrabold text-pmb-gold">€2,000,000</p>
          </div>
          <div className="p-2.5 rounded-xl bg-black/40 border border-pmb-border/50 text-center">
            <span className="text-[10px] font-bold text-gray-400 uppercase">Quarter-Finals (After MD 8)</span>
            <p className="text-sm font-extrabold text-emerald-400">€4,000,000</p>
          </div>
          <div className="p-2.5 rounded-xl bg-black/40 border border-pmb-border/50 text-center">
            <span className="text-[10px] font-bold text-gray-400 uppercase">Semi-Finals (After MD 12)</span>
            <p className="text-sm font-extrabold text-blue-400">€6,000,000</p>
          </div>
          <div className="p-2.5 rounded-xl bg-black/40 border border-yellow-500/40 text-center">
            <span className="text-[10px] font-bold text-yellow-400 uppercase">Grand Final (After MD 16)</span>
            <p className="text-sm font-extrabold text-yellow-300">€8,000,000 🏆</p>
          </div>
        </div>
      </div>

      {/* Tournament Bracket Columns (Horizontal Scrollable Grid) */}
      <div className="overflow-x-auto pb-6">
        <div className="min-w-[1000px] grid grid-cols-4 gap-4 items-start">
          {STAGES.map(({ stage, title, timing, prize, color }) => {
            const matches = matchesByStage[stage];

            return (
              <div key={stage} className="space-y-4">
                {/* Stage Header */}
                <div className={`p-3 rounded-xl border bg-gradient-to-b ${color} text-center shadow-md`}>
                  <h3 className="text-xs font-black uppercase text-white tracking-wide">{title}</h3>
                  <p className="text-[10px] font-bold text-pmb-gold mt-0.5">{timing}</p>
                  <span className="inline-block mt-1 text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-black/60 text-emerald-300 border border-emerald-500/30">
                    💰 {prize}
                  </span>
                </div>

                {/* Match Cards */}
                <div className="space-y-3">
                  {matches.map((match) => {
                    const isCompleted = match.status === "COMPLETED";

                    return (
                      <div
                        key={match.id}
                        className={[
                          "pmb-card p-3 rounded-xl border transition-all duration-200 shadow-md",
                          isCompleted
                            ? "border-pmb-gold/40 bg-pmb-dark-surface/90"
                            : "border-pmb-border/60 hover:border-pmb-gold/30",
                        ].join(" ")}
                      >
                        {/* Match Order Header */}
                        <div className="flex items-center justify-between text-[10px] text-gray-500 font-bold mb-2 pb-1 border-b border-pmb-border/30">
                          <span>Match #{match.matchOrder}</span>
                          <span className={isCompleted ? "text-emerald-400" : "text-yellow-500"}>
                            {isCompleted ? "✓ Completed" : "Upcoming"}
                          </span>
                        </div>

                        {/* Home Club */}
                        <div
                          className={[
                            "flex items-center justify-between p-2 rounded-lg transition",
                            match.winnerClubId === match.homeClubId && isCompleted
                              ? "bg-emerald-500/15 border border-emerald-500/30 font-bold"
                              : "bg-black/20",
                          ].join(" ")}
                        >
                          <div className="flex items-center gap-2 truncate">
                            {match.homeClub ? (
                              <>
                                <ClubBadge name={match.homeClub.name} logo={match.homeClub.logo} size="xs" />
                                <span className="text-xs text-white truncate">{match.homeClub.name}</span>
                              </>
                            ) : (
                              <span className="text-xs text-gray-500 italic">TBD (Winner)</span>
                            )}
                          </div>
                          <span className="text-xs font-bold text-white ml-2">
                            {isCompleted ? match.homeGoals : "–"}
                            {isCompleted && match.isPenaltyShootout && (
                              <span className="text-[10px] text-pmb-gold ml-1">({match.homePenalties}p)</span>
                            )}
                          </span>
                        </div>

                        {/* Away Club */}
                        <div
                          className={[
                            "flex items-center justify-between p-2 rounded-lg mt-1.5 transition",
                            match.winnerClubId === match.awayClubId && isCompleted
                              ? "bg-emerald-500/15 border border-emerald-500/30 font-bold"
                              : "bg-black/20",
                          ].join(" ")}
                        >
                          <div className="flex items-center gap-2 truncate">
                            {match.awayClub ? (
                              <>
                                <ClubBadge name={match.awayClub.name} logo={match.awayClub.logo} size="xs" />
                                <span className="text-xs text-white truncate">{match.awayClub.name}</span>
                              </>
                            ) : (
                              <span className="text-xs text-gray-500 italic">TBD (Winner)</span>
                            )}
                          </div>
                          <span className="text-xs font-bold text-white ml-2">
                            {isCompleted ? match.awayGoals : "–"}
                            {isCompleted && match.isPenaltyShootout && (
                              <span className="text-[10px] text-pmb-gold ml-1">({match.awayPenalties}p)</span>
                            )}
                          </span>
                        </div>

                        {/* MOTM Footer */}
                        {match.manOfTheMatch && (
                          <div className="mt-2 pt-1 text-[10px] text-pmb-gold flex items-center gap-1 border-t border-pmb-border/30">
                            <span>⭐ MOTM:</span>
                            <span className="text-white font-medium truncate">{match.manOfTheMatch.fullName}</span>
                          </div>
                        )}

                        {/* Admin Action Buttons */}
                        {isAdmin && match.homeClubId && match.awayClubId && (
                          <div className="mt-2.5 pt-2 flex items-center justify-end gap-1.5 border-t border-pmb-border/40">
                            <button
                              onClick={() => openEditDialog(match)}
                              className="text-[11px] px-2.5 py-1 rounded-lg font-bold bg-pmb-gold/20 text-pmb-gold hover:bg-pmb-gold hover:text-black transition"
                            >
                              {isCompleted ? "Edit Stats" : "Enter Result"}
                            </button>
                            {isCompleted && (
                              <button
                                onClick={() => handleCancelResult(match.id)}
                                className="text-[11px] px-2 py-1 rounded-lg font-bold bg-red-600/20 text-red-300 hover:bg-red-600/40 hover:text-white transition"
                                title="Cancel match result and reverse prize"
                              >
                                ↺ Reset
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Admin Result & Stats Modal */}
      {editingMatch && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={() => setEditingMatch(null)}
        >
          <div
            className="pmb-card w-full max-w-lg p-6 border-2 border-pmb-gold/50 shadow-2xl space-y-5 bg-pmb-dark-surface"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-pmb-border/60 pb-3">
              <div>
                <span className="text-[10px] font-black uppercase text-pmb-gold">
                  Throne Cup Match Entry
                </span>
                <h3 className="text-lg font-black text-white">
                  {editingMatch.homeClub?.name} vs {editingMatch.awayClub?.name}
                </h3>
              </div>
              <button
                onClick={() => setEditingMatch(null)}
                className="text-gray-400 hover:text-white text-xl font-bold"
              >
                ✕
              </button>
            </div>

            {/* Score Inputs */}
            <div className="flex items-center justify-center gap-4 py-2">
              <div className="text-center">
                <p className="text-xs font-bold text-gray-300 mb-1">{editingMatch.homeClub?.name}</p>
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
                  className="pmb-input w-16 text-center text-2xl font-black"
                  placeholder="0"
                  autoFocus
                />
              </div>

              <span className="text-2xl font-black text-pmb-gold mt-4">—</span>

              <div className="text-center">
                <p className="text-xs font-bold text-gray-300 mb-1">{editingMatch.awayClub?.name}</p>
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
                  className="pmb-input w-16 text-center text-2xl font-black"
                  placeholder="0"
                />
              </div>
            </div>

            {/* Penalty Shootout (Shown on Draw) */}
            {(isShootout || homeGoals === awayGoals) && homeGoals !== "" && (
              <div className="p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-yellow-400">🥅 Penalty Shootout (Required for Draw)</span>
                </div>
                <div className="flex items-center justify-center gap-3">
                  <input
                    type="number"
                    min={0}
                    max={30}
                    placeholder="Home pens"
                    value={homePenalties}
                    onChange={(e) => setHomePenalties(e.target.value)}
                    className="pmb-input w-24 text-center text-sm font-bold"
                  />
                  <span className="text-yellow-400 font-bold">vs</span>
                  <input
                    type="number"
                    min={0}
                    max={30}
                    placeholder="Away pens"
                    value={awayPenalties}
                    onChange={(e) => setAwayPenalties(e.target.value)}
                    className="pmb-input w-24 text-center text-sm font-bold"
                  />
                </div>
              </div>
            )}

            {/* Man of the Match Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-300 flex items-center gap-1">
                <span>⭐ Man of the Match (MOTM)</span>
              </label>
              <select
                value={motmId}
                onChange={(e) => setMotmId(e.target.value)}
                className="pmb-input w-full text-xs"
              >
                <option value="">-- Select Star Player --</option>
                {squadPlayers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.fullName} ({p.position})
                  </option>
                ))}
              </select>
            </div>

            {/* Prize Notice */}
            <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/30 text-xs text-emerald-300 flex items-center justify-between">
              <span>Stage Winner Prize Reward:</span>
              <span className="font-extrabold text-emerald-200">
                +€{Number(editingMatch.prizeAmount) / 1000000}M Budget
              </span>
            </div>

            {dialogError && (
              <div className="p-2.5 rounded-lg bg-red-500/15 border border-red-500/30 text-xs text-red-300 font-semibold text-center">
                {dialogError}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-pmb-border/60">
              <button
                type="button"
                onClick={() => setEditingMatch(null)}
                disabled={saving}
                className="pmb-btn-secondary text-xs px-4 py-2"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveResult}
                disabled={saving}
                className="pmb-btn-primary text-xs px-5 py-2 font-bold disabled:opacity-50"
              >
                {saving ? "Saving & Awarding Prize..." : "Save Match Result"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
