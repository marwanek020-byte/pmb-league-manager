"use client";

import { useEffect, useState } from "react";
import { StandingsPulseData } from "@/lib/services/ultras-interaction-service";

export function StandingsPulseCard({ clubName }: { clubName: string }) {
  const [data, setData] = useState<StandingsPulseData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/manager/ultras/standings-pulse")
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
    <div className="relative overflow-hidden rounded-3xl border border-pmb-gold/30 bg-gradient-to-br from-black via-zinc-950 to-zinc-900 p-6 shadow-[0_15px_45px_rgba(0,0,0,0.85)] backdrop-blur-xl space-y-6">
      {/* Glow */}
      <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-pmb-gold/10 blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4 relative z-10">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-[10px] font-black uppercase tracking-[.25em] text-pmb-gold">
              Live Title Race Engine
            </span>
          </div>
          <h3 className="mt-1 text-2xl font-black uppercase tracking-tight text-white">
            📊 Standings Pulse & Title Calculation
          </h3>
        </div>

        {data && (
          <div className="flex items-center gap-2 rounded-2xl bg-zinc-900/90 border border-white/10 px-4 py-2">
            <span className="text-xs font-bold text-gray-400">Position:</span>
            <span className="text-base font-black text-pmb-gold">#{data.myRank}</span>
            <span className="text-xs font-bold text-gray-400">({data.myPoints} pts)</span>
          </div>
        )}
      </div>

      {loading ? (
        <div className="rounded-2xl border border-white/10 bg-black/60 p-8 text-center backdrop-blur-md">
          <p className="text-xs font-bold text-pmb-gold animate-pulse">
            Analyzing mathematical title combinations...
          </p>
        </div>
      ) : data ? (
        <div className="space-y-5 relative z-10">
          {/* Capo Title Assessment Quote */}
          <div className="rounded-2xl border border-pmb-gold/30 bg-gradient-to-r from-amber-950/30 via-zinc-950/80 to-zinc-950 p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-pmb-gold">
              Capo Title Race Assessment
            </p>
            <p className="mt-1 text-sm font-bold leading-relaxed text-gray-100 italic">
              "{data.capoTitleAssessment}"
            </p>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-xl border border-white/10 bg-black/60 p-3 text-center">
              <span className="text-[10px] font-bold text-gray-400 uppercase">Matches Played</span>
              <p className="text-lg font-black text-white">{data.played}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/60 p-3 text-center">
              <span className="text-[10px] font-bold text-gray-400 uppercase">Remaining Finals</span>
              <p className="text-lg font-black text-amber-300">{data.remainingMatches}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/60 p-3 text-center">
              <span className="text-[10px] font-bold text-gray-400 uppercase">Gap to Leader</span>
              <p className={`text-lg font-black ${data.gapToLeader === 0 ? "text-emerald-400" : "text-rose-400"}`}>
                {data.gapToLeader === 0 ? "0 (Leading 👑)" : `-${data.gapToLeader} pts`}
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/60 p-3 text-center">
              <span className="text-[10px] font-bold text-gray-400 uppercase">Top 3 Cushion</span>
              <p className="text-lg font-black text-emerald-400">
                {data.gapToTop3 <= 0 ? "Safe (Top 3)" : `+${data.gapToTop3} pts to catch`}
              </p>
            </div>
          </div>

          {/* Mini Standings Table */}
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/60 backdrop-blur-md">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-white/10 bg-zinc-900/80 text-[10px] font-black uppercase text-gray-400">
                <tr>
                  <th className="px-4 py-2.5">#</th>
                  <th className="px-4 py-2.5">Club</th>
                  <th className="px-3 py-2.5 text-center">P</th>
                  <th className="px-3 py-2.5 text-center">GD</th>
                  <th className="px-3 py-2.5 text-center">Pts</th>
                  <th className="px-4 py-2.5 text-center">Form</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-semibold">
                {data.topStandings.map((row) => (
                  <tr
                    key={row.position}
                    className={`${row.isMyClub ? "bg-pmb-gold/15 text-pmb-gold font-black" : "text-gray-200"}`}
                  >
                    <td className="px-4 py-2.5 font-black">{row.position}</td>
                    <td className="px-4 py-2.5 flex items-center gap-2">
                      <span>{row.clubName}</span>
                      {row.isMyClub && <span className="rounded bg-pmb-gold px-1 py-0.2 text-[9px] text-black font-black">YOU</span>}
                    </td>
                    <td className="px-3 py-2.5 text-center text-gray-400">{row.played}</td>
                    <td className="px-3 py-2.5 text-center">{row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}</td>
                    <td className="px-3 py-2.5 text-center text-white font-black">{row.points}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center justify-center gap-1">
                        {row.form.map((f, idx) => (
                          <span
                            key={idx}
                            className={`flex h-4 w-4 items-center justify-center rounded border text-[8px] font-black ${getFormColor(f)}`}
                          >
                            {f}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
