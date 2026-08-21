"use client";

import React from "react";

interface ExecutiveBriefingProps {
  briefing: {
    clubName: string;
    squadHealthScore: number;
    treasuryBudgetEur: number;
    primarySquadRisk: {
      id: string;
      severity: string;
      title: string;
      description: string;
      targetPositions: string[];
    } | null;
    valueRadarOpportunity: {
      id: string;
      fullName: string;
      position: string;
      overallRating: number;
      marketValue: number;
      fitScore?: number;
      fitTier?: string;
      archetype?: string;
    } | null;
    opponentPreMatchAlert: {
      opponentName: string;
      matchday: number;
      isHome: boolean;
      winProbability: number;
      keyThreat: string;
      tacticalMentality: string;
    } | null;
  };
  transferPriorities?: Array<{
    tier: string;
    tierLabel: string;
    position: string;
    reason: string;
    recommendedPlayer: {
      fullName: string;
      position: string;
      overallRating: number;
      marketValue: number;
    } | null;
  }>;
  onOpenDossier?: (playerId: string) => void;
  onSearchPosition?: (pos: string) => void;
  onOpenWhatIf?: () => void;
}

export function ExecutiveBriefingCard({
  briefing,
  transferPriorities,
  onOpenDossier,
  onSearchPosition,
  onOpenWhatIf,
}: ExecutiveBriefingProps) {
  const {
    clubName,
    squadHealthScore,
    treasuryBudgetEur,
    primarySquadRisk,
    valueRadarOpportunity,
    opponentPreMatchAlert,
  } = briefing;

  return (
    <div className="rounded-2xl border border-pmb-gold/40 bg-gradient-to-b from-pmb-charcoal via-black to-black p-6 space-y-6 shadow-2xl backdrop-blur-md">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-pmb-gold/20 border border-pmb-gold/50 text-2xl shadow-lg">
            🧠
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded bg-pmb-gold/20 border border-pmb-gold/40 px-2 py-0.5 text-[10px] font-black text-pmb-gold uppercase tracking-wider">
                EXECUTIVE INTELLIGENCE
              </span>
              <span className="text-xs text-gray-400">Chief Scout Morning Briefing</span>
            </div>
            <h2 className="text-xl font-black text-white font-serif mt-0.5">
              Sporting Director Strategic Report
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Health Score Pill */}
          <div className="flex flex-col items-end">
            <span className="text-[10px] uppercase font-bold text-gray-400">Squad Health</span>
            <div className="flex items-center gap-1.5">
              <span className="text-2xl font-black text-pmb-gold">{squadHealthScore}</span>
              <span className="text-xs text-gray-400 font-bold">/100</span>
            </div>
          </div>

          {/* What-If Simulator Action Button */}
          {onOpenWhatIf && (
            <button
              onClick={onOpenWhatIf}
              className="flex items-center gap-1.5 rounded-xl bg-pmb-gold/20 border border-pmb-gold/60 px-3.5 py-2 text-xs font-black text-pmb-gold hover:bg-pmb-gold hover:text-black transition shadow-lg"
            >
              <span>🔮</span>
              <span>What-If Simulator</span>
            </button>
          )}
        </div>
      </div>

      {/* 3 Executive Pillars Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 1. Primary Squad Risk Alert */}
        <div className="rounded-xl border border-rose-500/30 bg-rose-950/20 p-4 flex flex-col justify-between space-y-3">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-rose-400 text-lg">🚨</span>
              <span className="text-xs font-black text-rose-300 uppercase tracking-wider">
                Primary Squad Risk
              </span>
            </div>
            {primarySquadRisk ? (
              <>
                <h4 className="text-sm font-bold text-white">{primarySquadRisk.title}</h4>
                <p className="text-xs text-gray-300 leading-relaxed">
                  {primarySquadRisk.description}
                </p>
              </>
            ) : (
              <>
                <h4 className="text-sm font-bold text-emerald-400">Squad Balanced</h4>
                <p className="text-xs text-gray-300">
                  No immediate critical vacancy detected in your registered squad.
                </p>
              </>
            )}
          </div>

          {primarySquadRisk && primarySquadRisk.targetPositions[0] && (
            <button
              onClick={() => onSearchPosition && onSearchPosition(primarySquadRisk.targetPositions[0])}
              className="rounded-lg bg-rose-600/30 border border-rose-500/40 px-3 py-1.5 text-xs font-bold text-rose-200 hover:bg-rose-600 hover:text-white transition w-full text-center"
            >
              🔍 Scout {primarySquadRisk.targetPositions.join(" / ")} Options
            </button>
          )}
        </div>

        {/* 2. Value Radar Opportunity */}
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-4 flex flex-col justify-between space-y-3">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-emerald-400 text-lg">💰</span>
              <span className="text-xs font-black text-emerald-300 uppercase tracking-wider">
                Value Radar Opportunity
              </span>
            </div>
            {valueRadarOpportunity ? (
              <>
                <div className="flex justify-between items-center">
                  <h4 className="text-sm font-bold text-white truncate">{valueRadarOpportunity.fullName}</h4>
                  <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-black text-emerald-300">
                    {valueRadarOpportunity.overallRating} OVR
                  </span>
                </div>
                <p className="text-xs text-gray-300 leading-relaxed">
                  {valueRadarOpportunity.archetype || "Tactical depth"} target fitting within your €{(treasuryBudgetEur / 1_000_000).toFixed(1)}M budget.
                </p>
              </>
            ) : (
              <p className="text-xs text-gray-300">Scanning global database for emerging value deals...</p>
            )}
          </div>

          {valueRadarOpportunity && (
            <button
              onClick={() => onOpenDossier && onOpenDossier(valueRadarOpportunity.id)}
              className="rounded-lg bg-emerald-600/30 border border-emerald-500/40 px-3 py-1.5 text-xs font-bold text-emerald-200 hover:bg-emerald-600 hover:text-white transition w-full text-center"
            >
              📋 Open Scout Dossier
            </button>
          )}
        </div>

        {/* 3. Pre-Match Opponent Alert */}
        <div className="rounded-xl border border-blue-500/30 bg-blue-950/20 p-4 flex flex-col justify-between space-y-3">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-blue-400 text-lg">⚔️</span>
              <span className="text-xs font-black text-blue-300 uppercase tracking-wider">
                Matchday Intelligence
              </span>
            </div>
            {opponentPreMatchAlert ? (
              <>
                <div className="flex justify-between items-center">
                  <h4 className="text-sm font-bold text-white truncate">
                    vs {opponentPreMatchAlert.opponentName} (MD {opponentPreMatchAlert.matchday})
                  </h4>
                  <span className="rounded bg-blue-500/20 px-1.5 py-0.5 text-[10px] font-black text-blue-300">
                    {opponentPreMatchAlert.winProbability}% Win
                  </span>
                </div>
                <p className="text-xs text-gray-300 leading-relaxed">
                  Primary Threat: <strong className="text-white">{opponentPreMatchAlert.keyThreat}</strong>. Recommended Style: {opponentPreMatchAlert.tacticalMentality}.
                </p>
              </>
            ) : (
              <p className="text-xs text-gray-300">No upcoming fixtures scheduled in active competition.</p>
            )}
          </div>

          {opponentPreMatchAlert && (
            <div className="rounded-lg bg-blue-950/50 border border-blue-500/30 px-3 py-1 text-[11px] font-bold text-blue-200 text-center">
              🏟️ {opponentPreMatchAlert.isHome ? "Playing at HOME 🏠" : "Playing AWAY ✈️"}
            </div>
          )}
        </div>
      </div>

      {/* 4-Tier Transfer Priorities Banner */}
      {transferPriorities && transferPriorities.length > 0 && (
        <div className="pt-4 border-t border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
              <span>🎯</span>
              <span>4-Tier Recruitment Priorities:</span>
            </span>
            <span className="text-[11px] text-gray-400">Chief Scout Action Board</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {transferPriorities.map((tp, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-white/10 bg-black/60 p-3 flex flex-col justify-between space-y-2 hover:border-pmb-gold transition"
              >
                <div>
                  <span className="text-[10px] font-black uppercase text-pmb-gold">
                    {tp.tierLabel}
                  </span>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-sm font-black text-white">{tp.position}</span>
                    {tp.recommendedPlayer && (
                      <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-bold text-gray-200">
                        {tp.recommendedPlayer.overallRating} OVR
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1 leading-tight">{tp.reason}</p>
                </div>

                {tp.recommendedPlayer && (
                  <button
                    onClick={() => onSearchPosition && onSearchPosition(tp.position)}
                    className="rounded-lg bg-white/5 hover:bg-pmb-gold border border-white/10 px-2 py-1 text-[11px] font-bold text-gray-300 hover:text-black transition text-center"
                  >
                    Target: {tp.recommendedPlayer.fullName}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
