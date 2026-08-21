"use client";

import { useEffect, useState } from "react";
import { DerbyBanterItem } from "@/lib/services/ultras-interaction-service";

export function DerbyBanterCard({ clubName }: { clubName: string }) {
  const [items, setItems] = useState<DerbyBanterItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/manager/ultras/banter")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (Array.isArray(json)) setItems(json);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [clubName]);

  const handleCopy = (punchline: string, idx: number) => {
    navigator.clipboard.writeText(punchline);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 3000);
  };

  return (
    <div className="relative overflow-hidden rounded-3xl border border-pmb-gold/30 bg-gradient-to-br from-black via-zinc-950 to-zinc-900 p-6 shadow-[0_15px_45px_rgba(0,0,0,0.85)] backdrop-blur-xl space-y-6">
      {/* Glow */}
      <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-rose-500/10 blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-4 relative z-10">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-rose-500 animate-ping" />
            <span className="text-[10px] font-black uppercase tracking-[.25em] text-pmb-gold">
              Psychological Warfare
            </span>
          </div>
          <h3 className="mt-1 text-2xl font-black uppercase tracking-tight text-white">
            ⚔️ Derby Banter & Rivalry Intelligence
          </h3>
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-white/10 bg-black/60 p-8 text-center backdrop-blur-md">
          <p className="text-xs font-bold text-pmb-gold animate-pulse">
            Loading rivalry intelligence & terrace counter-arguments...
          </p>
        </div>
      ) : items.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
          {items.map((item, idx) => (
            <div
              key={idx}
              className="rounded-2xl border border-white/10 bg-black/60 p-5 backdrop-blur-md space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-rose-400">
                  Target: {item.rivalClubName}
                </span>
                <span className="text-[10px] font-bold text-gray-400">
                  {item.rivalUltrasGroup}
                </span>
              </div>
              <h4 className="text-sm font-black text-white">{item.banterTitle}</h4>
              <p className="text-xs font-bold text-gray-200 leading-relaxed italic bg-zinc-900/80 p-3 rounded-xl border border-white/5">
                "{item.punchline}"
              </p>
              <div className="flex items-center justify-between pt-1">
                <span className="text-[10px] text-gray-400 font-semibold">{item.historicalContext}</span>
                <button
                  onClick={() => handleCopy(item.punchline, idx)}
                  className="rounded-lg border border-pmb-gold/40 bg-pmb-gold/10 px-2.5 py-1 text-[11px] font-black text-pmb-gold hover:bg-pmb-gold hover:text-black transition"
                >
                  {copiedIdx === idx ? "✓ Copied" : "📢 Fire Banter"}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-gray-400 font-semibold">No direct rivals recorded for this league tier.</p>
      )}
    </div>
  );
}
