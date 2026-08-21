"use client";

import { useEffect, useState } from "react";
import { CurvaUltimatumData } from "@/lib/services/ultras-innovations-service";

export function CurvaUltimatumBoardroom({ clubName }: { clubName: string }) {
  const [data, setData] = useState<CurvaUltimatumData | null>(null);
  const [loading, setLoading] = useState(true);
  const [pledged, setPledged] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/manager/ultras/innovations/ultimatum")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json) setData(json);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [clubName]);

  const handlePledge = (optionId: string) => {
    setPledged(optionId);
    setTimeout(() => {
      // simulate boost
    }, 2000);
  };

  return (
    <div className="relative overflow-hidden rounded-3xl border border-red-600/50 bg-gradient-to-br from-black via-zinc-950 to-zinc-900 p-6 shadow-[0_15px_45px_rgba(0,0,0,0.85)] backdrop-blur-xl space-y-6">
      {/* Background Glow */}
      <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-red-600/15 blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4 relative z-10">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-red-500 animate-ping" />
            <span className="text-[10px] font-black uppercase tracking-[.25em] text-red-400">
              Innovation #5: Crisis Dynamic Meeting
            </span>
          </div>
          <h3 className="mt-1 text-2xl font-black uppercase tracking-tight text-white">
            🚨 Curva Ultimatum: Emergency Boardroom Pressure
          </h3>
        </div>

        {data && (
          <span className="rounded-full border border-red-500/50 bg-red-500/20 px-3.5 py-1 text-xs font-black text-red-300">
            Morale: {data.moraleScore}% ({data.crisisSeverity})
          </span>
        )}
      </div>

      {loading ? (
        <div className="rounded-2xl border border-white/10 bg-black/60 p-8 text-center backdrop-blur-md">
          <p className="text-xs font-bold text-red-400 animate-pulse">
            Curva delegation entering the boardroom...
          </p>
        </div>
      ) : data ? (
        <div className="space-y-6 relative z-10">
          {/* Capo Confrontation Dialogue Card */}
          <div className="rounded-2xl border border-red-500/40 bg-red-950/20 p-5 backdrop-blur-md space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xl">😡</span>
              <span className="text-xs font-black uppercase tracking-wider text-red-400">
                Capo Delegation Confrontation:
              </span>
            </div>
            <p className="text-sm font-bold leading-relaxed text-gray-100 italic pt-1">
              "{data.capoConfrontationSpeech}"
            </p>
          </div>

          {/* Curva Demands Checklist */}
          <div className="rounded-2xl border border-white/10 bg-black/60 p-5 backdrop-blur-md space-y-3">
            <span className="text-[10px] font-black uppercase tracking-wider text-pmb-gold">
              📋 3 Non-Negotiable Curva Demands:
            </span>
            <div className="space-y-2">
              {data.demands.map((demand, idx) => (
                <div key={idx} className="flex items-center gap-2 text-xs font-bold text-gray-200">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-red-500/20 text-red-400 text-[10px] font-black">
                    {idx + 1}
                  </span>
                  <span>{demand}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Manager Pledge Choices */}
          <div className="space-y-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">
              Manager Tactical Response & Pledge:
            </span>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {data.managerPledgeOptions.map((option) => (
                <button
                  key={option.id}
                  onClick={() => handlePledge(option.id)}
                  className={`rounded-2xl border p-4 text-left text-xs transition flex flex-col justify-between ${
                    pledged === option.id
                      ? "border-emerald-500 bg-emerald-950/40 text-emerald-300 font-black shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                      : "border-white/10 bg-zinc-900/80 text-gray-300 hover:border-pmb-gold hover:text-white"
                  }`}
                >
                  <p className="font-bold leading-relaxed">{option.text}</p>
                  <span className="mt-3 rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-black text-emerald-400 self-start">
                    {pledged === option.id ? "✓ Pledged" : `+${option.moraleBonus}% Morale Restore`}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
