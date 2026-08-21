"use client";

import { useEffect, useState } from "react";
import { CrossClubBanterArenaData } from "@/lib/services/ultras-innovations-service";

export function CrossClubBanterArena({ clubName }: { clubName: string }) {
  const [data, setData] = useState<CrossClubBanterArenaData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/manager/ultras/innovations/banter-arena")
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
      <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-rose-500/10 blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4 relative z-10">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-rose-500 animate-ping" />
            <span className="text-[10px] font-black uppercase tracking-[.25em] text-pmb-gold">
              Innovation #2: AI vs AI Supporter Debate
            </span>
          </div>
          <h3 className="mt-1 text-2xl font-black uppercase tracking-tight text-white">
            ⚔️ Cross-Club Ultras Banter Arena
          </h3>
        </div>

        {data && (
          <span className="rounded-full border border-rose-500/40 bg-rose-500/10 px-3.5 py-1 text-xs font-black text-rose-300">
            {data.homeClubName} vs {data.awayClubName}
          </span>
        )}
      </div>

      {loading ? (
        <div className="rounded-2xl border border-white/10 bg-black/60 p-8 text-center backdrop-blur-md">
          <p className="text-xs font-bold text-pmb-gold animate-pulse">
            Connecting Home & Away Capos in the Banter Arena...
          </p>
        </div>
      ) : data ? (
        <div className="space-y-4 relative z-10">
          <div className="rounded-xl border border-white/10 bg-black/40 p-3 text-center text-xs font-semibold text-gray-400">
            {data.h2hSummary}
          </div>

          {/* Dialogue Feed */}
          <div className="space-y-3">
            {data.dialogueRounds.map((round, idx) => {
              const isHome = round.speaker === "HOME_CAPO";
              return (
                <div
                  key={idx}
                  className={`flex gap-3 ${isHome ? "flex-row" : "flex-row-reverse"}`}
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-zinc-900 shadow-md text-lg">
                    {round.badge}
                  </div>
                  <div
                    className={`max-w-[80%] rounded-2xl p-4 text-xs leading-relaxed space-y-1 ${
                      isHome
                        ? "border border-pmb-gold/30 bg-zinc-900/90 text-white"
                        : "border border-rose-500/30 bg-rose-950/40 text-rose-100"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-1">
                      <span className="text-[10px] font-black uppercase tracking-wider text-pmb-gold">
                        {round.speakerName} ({round.clubName})
                      </span>
                      <span className="text-[9px] text-gray-400 font-semibold">{round.groupTitle}</span>
                    </div>
                    <p className="pt-1 font-bold text-sm leading-relaxed">{round.statement}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
