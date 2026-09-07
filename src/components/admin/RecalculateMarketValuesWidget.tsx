"use client";

import { useState } from "react";

export function RecalculateMarketValuesWidget() {
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  async function handleRecalculate(target: "BOTOLA" | "ALL") {
    const isAll = target === "ALL";
    const confirmPrompt = isAll
      ? "Recalculate player market values across ALL leagues now?"
      : "Recalculate player market values for BOTOLA PRO now?";

    if (!confirm(confirmPrompt)) return;

    setLoading(true);
    setStatusMessage(null);

    try {
      const res = await fetch("/api/admin/recalculate-market-values", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leagueId: isAll ? "ALL" : undefined }),
      });

      const data = await res.json();
      if (res.ok) {
        setStatusMessage({
          type: "success",
          text: data.message || "Player market values recalculated successfully!",
        });
      } else {
        setStatusMessage({
          type: "error",
          text: data.error || "Failed to recalculate market values.",
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: "error",
        text: err?.message || "Network error while recalculating market values.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-pmb-gold/30 bg-gradient-to-br from-amber-950/25 via-pmb-charcoal/90 to-pmb-black p-6 shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-pmb-gold/20 text-pmb-gold text-sm font-black">
              ⚡
            </span>
            <span className="text-[10px] font-bold uppercase tracking-[.25em] text-pmb-gold">
              Valuation Engine
            </span>
          </div>
          <h2 className="mt-1 text-xl font-bold text-white">
            Live Player Market Values
          </h2>
          <p className="mt-1 max-w-2xl text-xs text-gray-400 leading-relaxed">
            Recalculate real-time market values from match performances (Goals, Assists, MOTM, TOTW)
            using official position formulas, ceilings, and unique rank hierarchy.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
          <button
            onClick={() => handleRecalculate("BOTOLA")}
            disabled={loading}
            className="inline-flex items-center justify-center rounded-xl bg-pmb-gold px-4 py-2.5 text-xs font-black uppercase tracking-wider text-black transition-all hover:bg-yellow-400 active:scale-95 disabled:opacity-50 disabled:pointer-events-none shadow-lg shadow-pmb-gold/20"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Calculating...
              </span>
            ) : (
              "⚡ Recalculate Botola Pro"
            )}
          </button>

          <button
            onClick={() => handleRecalculate("ALL")}
            disabled={loading}
            className="inline-flex items-center justify-center rounded-xl border border-white/20 bg-white/5 px-3.5 py-2.5 text-xs font-bold uppercase tracking-wider text-gray-200 transition hover:bg-white/10 active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
          >
            All Leagues
          </button>
        </div>
      </div>

      {statusMessage && (
        <div
          className={`mt-4 rounded-xl border p-3 text-xs font-medium ${
            statusMessage.type === "success"
              ? "border-emerald-500/40 bg-emerald-950/40 text-emerald-300"
              : "border-red-500/40 bg-red-950/40 text-red-300"
          }`}
        >
          {statusMessage.type === "success" ? "✓ " : "⚠ "}
          {statusMessage.text}
        </div>
      )}
    </div>
  );
}
