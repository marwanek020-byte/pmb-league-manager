"use client";

import { useEffect, useState } from "react";
import { PyroPressureMetrics } from "@/lib/services/ultras-innovations-service";

export function PyroPressureMeter({ clubName }: { clubName: string }) {
  const [data, setData] = useState<PyroPressureMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/manager/ultras/innovations/pyro-pressure")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json) setData(json);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [clubName]);

  return (
    <div className="relative overflow-hidden rounded-3xl border border-pmb-gold/40 bg-gradient-to-br from-black via-zinc-950 to-zinc-900 p-6 shadow-[0_15px_45px_rgba(0,0,0,0.85)] backdrop-blur-xl space-y-6">
      {/* Background Glow */}
      <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4 relative z-10">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-amber-400 animate-ping" />
            <span className="text-[10px] font-black uppercase tracking-[.25em] text-pmb-gold">
              Innovation #3: Atmosphere Physics Engine
            </span>
          </div>
          <h3 className="mt-1 text-2xl font-black uppercase tracking-tight text-white">
            🔥 Pyro & Dynamic Curva Pressure Meter
          </h3>
        </div>

        {data && (
          <span className="rounded-full border border-amber-500/40 bg-amber-500/15 px-3.5 py-1 text-xs font-black text-amber-300">
            {data.atmosphereTier.replace("_", " ")}
          </span>
        )}
      </div>

      {loading ? (
        <div className="rounded-2xl border border-white/10 bg-black/60 p-8 text-center backdrop-blur-md">
          <p className="text-xs font-bold text-pmb-gold animate-pulse">
            Measuring acoustic decibels and terrace pyrotechnics...
          </p>
        </div>
      ) : data ? (
        <div className="space-y-6 relative z-10">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-white/10 bg-black/60 p-4 text-center backdrop-blur-md">
              <span className="text-[10px] font-black uppercase tracking-wider text-pmb-gold">
                🔊 Acoustic Pressure
              </span>
              <p className="mt-1 text-3xl font-black text-white">{data.crowdDecibels} <span className="text-sm text-gray-400">dB</span></p>
              <p className="text-[10px] text-gray-400 font-semibold mt-1">Sustained Terrace Vocals</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/60 p-4 text-center backdrop-blur-md">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-400">
                🎆 Pyro Smoke Flares
              </span>
              <p className="mt-1 text-3xl font-black text-amber-300">+{data.pyroFlareCount}</p>
              <p className="text-[10px] text-gray-400 font-semibold mt-1">Pre-Match Craquage</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/60 p-4 text-center backdrop-blur-md">
              <span className="text-[10px] font-black uppercase tracking-wider text-rose-400">
                ⚡ Intimidation Index
              </span>
              <p className="mt-1 text-3xl font-black text-rose-300">{data.intimidationFactor}%</p>
              <p className="text-[10px] text-gray-400 font-semibold mt-1">Away Team Disruption</p>
            </div>
          </div>

          {/* Intimidation Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-gray-300">
              <span>Curva Intimidation Factor</span>
              <span className="text-pmb-gold font-black">{data.intimidationFactor}%</span>
            </div>
            <div className="flex h-3.5 w-full overflow-hidden rounded-full border border-white/10 bg-black">
              <div
                style={{ width: `${data.intimidationFactor}%` }}
                className="bg-gradient-to-r from-amber-500 via-rose-500 to-red-600 transition-all duration-700 shadow-[0_0_15px_rgba(239,68,68,0.5)]"
              />
            </div>
          </div>

          {/* Pitch Advantage Directive */}
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-4">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">
              ⭐ Pitch Impact on Next Match
            </span>
            <p className="mt-1 text-xs font-bold text-gray-200 leading-relaxed">
              {data.pitchAdvantageBoost}
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
