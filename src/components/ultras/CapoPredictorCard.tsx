"use client";

import { useEffect, useState } from "react";
import { CapoPredictionDetail } from "@/lib/services/ultras-interaction-service";

export function CapoPredictorCard({ clubName }: { clubName: string }) {
  const [data, setData] = useState<CapoPredictionDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/manager/ultras/predictor")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json) setData(json);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [clubName]);

  return (
    <div className="relative overflow-hidden rounded-3xl border border-pmb-gold/30 bg-gradient-to-br from-black via-zinc-950 to-zinc-900 p-6 shadow-[0_15px_45px_rgba(0,0,0,0.85)] backdrop-blur-xl space-y-6">
      {/* Glow */}
      <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4 relative z-10">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-amber-400 animate-ping" />
            <span className="text-[10px] font-black uppercase tracking-[.25em] text-pmb-gold">
              AI Statistical Forecast
            </span>
          </div>
          <h3 className="mt-1 text-2xl font-black uppercase tracking-tight text-white">
            🔮 Capo Match Predictor & Odds
          </h3>
        </div>

        {data && (
          <span className="rounded-full border border-pmb-gold/40 bg-pmb-gold/10 px-3.5 py-1 text-xs font-black text-pmb-gold">
            {data.confidenceMeter}% Confidence
          </span>
        )}
      </div>

      {loading ? (
        <div className="rounded-2xl border border-white/10 bg-black/60 p-8 text-center backdrop-blur-md">
          <p className="text-xs font-bold text-pmb-gold animate-pulse">
            Simulating tactical match outcomes & crowd factor...
          </p>
        </div>
      ) : data ? (
        <div className="space-y-6 relative z-10">
          {/* Matchup & Score Card */}
          <div className="rounded-2xl border border-white/10 bg-black/60 p-5 text-center backdrop-blur-md">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{data.stadium}</p>
            <h4 className="text-xl font-black text-white mt-1">{data.fixtureMatchup}</h4>
            <div className="my-3 inline-flex items-center gap-3 rounded-2xl bg-zinc-900/90 border border-pmb-gold/40 px-6 py-2 shadow-inner">
              <span className="text-xs font-black text-gray-400 uppercase">Projected Score:</span>
              <span className="text-2xl font-black text-pmb-gold">{data.projectedScore}</span>
            </div>
            <p className="text-xs font-semibold text-gray-300 italic">"{data.capoVerdict}"</p>
          </div>

          {/* Probability Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider">
              <span className="text-emerald-400">Win: {data.probabilities.win}%</span>
              <span className="text-amber-400">Draw: {data.probabilities.draw}%</span>
              <span className="text-rose-400">Loss: {data.probabilities.loss}%</span>
            </div>
            <div className="flex h-3 w-full overflow-hidden rounded-full border border-white/10 bg-black">
              <div style={{ width: `${data.probabilities.win}%` }} className="bg-emerald-500 transition-all duration-700" />
              <div style={{ width: `${data.probabilities.draw}%` }} className="bg-amber-500 transition-all duration-700" />
              <div style={{ width: `${data.probabilities.loss}%` }} className="bg-rose-500 transition-all duration-700" />
            </div>
          </div>

          {/* Tactical Edge vs Opponent Weakness */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-4">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">
                ⭐ Curva Tactical Advantage
              </span>
              <p className="mt-1 text-xs font-bold text-gray-200">{data.tacticalAdvantage}</p>
            </div>
            <div className="rounded-xl border border-rose-500/30 bg-rose-950/20 p-4">
              <span className="text-[10px] font-black uppercase tracking-wider text-rose-400">
                ⚠️ Opponent Exploit Point
              </span>
              <p className="mt-1 text-xs font-bold text-gray-200">{data.opponentWeakness}</p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
