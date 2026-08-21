"use client";

import { useEffect, useState } from "react";
import { PmbDataAnalyticsPrediction } from "@/lib/services/ultras-analytics-service";

export function CurvaAnalyticsPredictor({ clubName }: { clubName: string }) {
  const [data, setData] = useState<PmbDataAnalyticsPrediction | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/manager/ultras/analytics")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json) setData(json);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [clubName]);

  const getFormColor = (res: "W" | "D" | "L") => {
    if (res === "W") return "bg-emerald-500/20 text-emerald-400 border-emerald-500/40";
    if (res === "D") return "bg-amber-500/20 text-amber-400 border-amber-500/40";
    return "bg-rose-500/20 text-rose-400 border-rose-500/40";
  };

  return (
    <div className="relative overflow-hidden rounded-3xl border border-pmb-gold/40 bg-gradient-to-br from-black via-zinc-950 to-zinc-900 p-6 shadow-[0_15px_45px_rgba(0,0,0,0.85)] backdrop-blur-xl space-y-6">
      {/* Background Glow */}
      <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-pmb-gold/10 blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4 relative z-10">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-[10px] font-black uppercase tracking-[.25em] text-pmb-gold">
              PMB Live Data Grounding
            </span>
          </div>
          <h3 className="mt-1 text-2xl font-black uppercase tracking-tight text-white">
            🔮 AI Supporter Analytics & Match Predictor
          </h3>
        </div>

        {data && (
          <span className="rounded-full border border-pmb-gold/40 bg-pmb-gold/10 px-3.5 py-1 text-xs font-black text-pmb-gold">
            {data.confidenceScore}% Data Confidence
          </span>
        )}
      </div>

      {loading ? (
        <div className="rounded-2xl border border-white/10 bg-black/60 p-8 text-center backdrop-blur-md">
          <p className="text-xs font-bold text-pmb-gold animate-pulse">
            Processing Power Ratings, Form Coefficients, and xG Deltas...
          </p>
        </div>
      ) : data ? (
        <div className="space-y-6 relative z-10">
          {/* Match Score & Verdict Card */}
          <div className="rounded-2xl border border-white/10 bg-black/60 p-5 text-center backdrop-blur-md">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{data.stadiumName}</p>
            <h4 className="text-xl font-black text-white mt-1">{data.fixtureMatchup}</h4>
            <div className="my-3 inline-flex items-center gap-3 rounded-2xl bg-zinc-900/90 border border-pmb-gold/40 px-6 py-2 shadow-inner">
              <span className="text-xs font-black text-gray-400 uppercase">Projected Score:</span>
              <span className="text-2xl font-black text-pmb-gold">{data.projectedScore}</span>
            </div>
            <p className="text-xs font-semibold text-gray-300 italic">"{data.capoAnalyticalVerdict}"</p>
          </div>

          {/* Probabilities Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider">
              <span className="text-emerald-400">Win: {data.probabilities.win}%</span>
              <span className="text-amber-400">Draw: {data.probabilities.draw}%</span>
              <span className="text-rose-400">Loss: {data.probabilities.loss}%</span>
            </div>
            <div className="flex h-3.5 w-full overflow-hidden rounded-full border border-white/10 bg-black">
              <div style={{ width: `${data.probabilities.win}%` }} className="bg-emerald-500 transition-all duration-700" />
              <div style={{ width: `${data.probabilities.draw}%` }} className="bg-amber-500 transition-all duration-700" />
              <div style={{ width: `${data.probabilities.loss}%` }} className="bg-rose-500 transition-all duration-700" />
            </div>
          </div>

          {/* ═══ 4 PMB DATA PILLARS GRID ═══ */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Pillar 1: Team Power Rating & Average OVR */}
            <div className="rounded-2xl border border-white/10 bg-black/60 p-4 backdrop-blur-md space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-pmb-gold">
                  1. Power Rating & Squad OVR
                </span>
                <span className="rounded bg-pmb-gold/15 px-2 py-0.5 text-[10px] font-black text-pmb-gold">
                  Δ {data.pmbMetrics.ovrDelta > 0 ? `+${data.pmbMetrics.ovrDelta}` : data.pmbMetrics.ovrDelta} OVR
                </span>
              </div>
              <div className="flex items-center justify-between text-xs font-bold text-gray-300 pt-1">
                <span>Home: {data.pmbMetrics.homePowerRating} PR ({data.pmbMetrics.homeAvgOvr} OVR)</span>
                <span>Away: {data.pmbMetrics.awayPowerRating} PR ({data.pmbMetrics.awayAvgOvr} OVR)</span>
              </div>
            </div>

            {/* Pillar 2: Last 5 Matches Form */}
            <div className="rounded-2xl border border-white/10 bg-black/60 p-4 backdrop-blur-md space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-400">
                  2. 5-Match Form Index
                </span>
                <span className="text-[10px] font-black text-gray-300">
                  {data.pmbMetrics.homeFormPoints} pts vs {data.pmbMetrics.awayFormPoints} pts
                </span>
              </div>
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-1">
                  {data.pmbMetrics.homeFormSequence.map((f, i) => (
                    <span key={i} className={`flex h-4 w-4 items-center justify-center rounded border text-[8px] font-black ${getFormColor(f)}`}>{f}</span>
                  ))}
                </div>
                <span className="text-[10px] text-gray-500 font-bold">vs</span>
                <div className="flex items-center gap-1">
                  {data.pmbMetrics.awayFormSequence.map((f, i) => (
                    <span key={i} className={`flex h-4 w-4 items-center justify-center rounded border text-[8px] font-black ${getFormColor(f)}`}>{f}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* Pillar 3: Home Field Advantage Coefficient */}
            <div className="rounded-2xl border border-white/10 bg-black/60 p-4 backdrop-blur-md space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">
                  3. Home Advantage Coefficient
                </span>
                <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-black text-emerald-300">
                  +{data.pmbMetrics.homeFieldAdvantageBoost}% Fortress Boost
                </span>
              </div>
              <p className="text-xs font-semibold text-gray-300">
                Stadium: {data.pmbMetrics.stadiumCapacity} · Atmospheric noise elevates pressing intensity.
              </p>
            </div>

            {/* Pillar 4: Attacking vs Defensive Matchups & xG */}
            <div className="rounded-2xl border border-white/10 bg-black/60 p-4 backdrop-blur-md space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-rose-400">
                  4. Attacking vs Defensive xG
                </span>
                <span className="text-[10px] font-black text-gray-300">
                  xG: {data.pmbMetrics.projectedHomeXg} vs {data.pmbMetrics.projectedAwayXg}
                </span>
              </div>
              <p className="text-xs font-semibold text-gray-300">
                Scored: {data.pmbMetrics.homeGoalsPerGame} G/M · Conceded: {data.pmbMetrics.awayConcededPerGame} G/M
              </p>
            </div>
          </div>

          {/* Disclaimer Banner */}
          <div className="rounded-xl border border-white/10 bg-black/40 p-3 text-center text-[11px] font-bold text-gray-400">
            {data.disclaimer}
          </div>
        </div>
      ) : null}
    </div>
  );
}
