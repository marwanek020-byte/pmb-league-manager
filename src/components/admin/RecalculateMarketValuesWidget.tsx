"use client";

import { useState } from "react";

interface PlayerRow {
  rank: number;
  id: string;
  name: string;
  club: string;
  position: string;
  goals: number;
  assists: number;
  motm: number;
  totw: number;
  score: number;
  marketValue: number;
}

interface RecalcResult {
  leagueId: string;
  maxAttackerScore: number;
  maxWingerScore: number;
  maxMidfielderScore: number;
  totalPlayers: number;
  totalAttackers: number;
  totalWingers: number;
  totalMidfielders: number;
  attackers: PlayerRow[];
  wingers: PlayerRow[];
  midfielders: PlayerRow[];
}

export function RecalculateMarketValuesWidget() {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"strikers" | "wingers" | "midfielders">("strikers");
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [recalcResult, setRecalcResult] = useState<RecalcResult | null>(null);

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
        if (data.result) {
          setRecalcResult(data.result);
        }
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

  const currentList =
    activeTab === "strikers"
      ? recalcResult?.attackers
      : activeTab === "wingers"
      ? recalcResult?.wingers
      : recalcResult?.midfielders;

  const currentMaxScore =
    activeTab === "strikers"
      ? recalcResult?.maxAttackerScore
      : activeTab === "wingers"
      ? recalcResult?.maxWingerScore
      : recalcResult?.maxMidfielderScore;

  const currentCeiling =
    activeTab === "strikers" ? "100.0" : activeTab === "wingers" ? "80.0" : "70.0";

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
            • <strong>Strikers (CF/SS):</strong> Goals×12 + Assists×8 + MOTM×10 + TOTW×8 (Ceiling €100M)<br />
            • <strong>Wingers (RWF/LWF):</strong> Goals×10 + Assists×10 + MOTM×10 + TOTW×8 (Ceiling €80M)<br />
            • <strong>Midfielders (AMF/CMF):</strong> Assists×15 + Goals×7 + MOTM×10 + TOTW×8 (Ceiling €70M)
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

      {/* Breakdown Table with Tabs */}
      {recalcResult && (
        <div className="mt-5 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-t border-white/10 pt-4 gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setActiveTab("strikers")}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  activeTab === "strikers"
                    ? "bg-pmb-gold text-black shadow-md"
                    : "bg-white/5 text-gray-400 hover:text-white"
                }`}
              >
                🎯 Strikers (CF & SS) ({recalcResult.totalAttackers})
              </button>
              <button
                onClick={() => setActiveTab("wingers")}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  activeTab === "wingers"
                    ? "bg-pmb-gold text-black shadow-md"
                    : "bg-white/5 text-gray-400 hover:text-white"
                }`}
              >
                ⚡ Wingers (RWF & LWF) ({recalcResult.totalWingers})
              </button>
              <button
                onClick={() => setActiveTab("midfielders")}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  activeTab === "midfielders"
                    ? "bg-pmb-gold text-black shadow-md"
                    : "bg-white/5 text-gray-400 hover:text-white"
                }`}
              >
                🎨 Midfielders (AMF & CMF) ({recalcResult.totalMidfielders})
              </button>
            </div>

            <span className="text-[10px] text-pmb-gold font-bold">
              Top {activeTab === "strikers" ? "Striker" : activeTab === "wingers" ? "Winger" : "Midfielder"} Score: {currentMaxScore} pts = €{currentCeiling}M
            </span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-white/10 bg-black/40">
            <table className="w-full text-left text-xs text-gray-300">
              <thead className="border-b border-white/10 bg-white/5 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                <tr>
                  <th className="px-3 py-2">Rank</th>
                  <th className="px-3 py-2">Player</th>
                  <th className="px-3 py-2">Club</th>
                  <th className="px-3 py-2">Pos</th>
                  <th className="px-3 py-2 text-center">
                    G {activeTab === "strikers" ? "(×12)" : activeTab === "wingers" ? "(×10)" : "(×7)"}
                  </th>
                  <th className="px-3 py-2 text-center">
                    A {activeTab === "strikers" ? "(×8)" : activeTab === "wingers" ? "(×10)" : "(×15)"}
                  </th>
                  <th className="px-3 py-2 text-center">MOTM (×10)</th>
                  <th className="px-3 py-2 text-center">TOTW (×8)</th>
                  <th className="px-3 py-2 text-center font-bold text-pmb-gold">Score</th>
                  <th className="px-3 py-2 text-right font-bold text-white">Market Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {currentList && currentList.length > 0 ? (
                  currentList.slice(0, 20).map((a) => (
                    <tr
                      key={a.id}
                      className={`hover:bg-white/5 transition ${
                        a.name.toLowerCase().includes("fahli") ||
                        a.name.toLowerCase().includes("benjdida") ||
                        a.name.toLowerCase().includes("ziyech") ||
                        a.name.toLowerCase().includes("chouiar")
                          ? "bg-amber-500/10 font-bold text-white"
                          : ""
                      }`}
                    >
                      <td className="px-3 py-2 font-mono text-pmb-gold font-bold">#{a.rank}</td>
                      <td className="px-3 py-2 font-semibold text-white">{a.name}</td>
                      <td className="px-3 py-2 text-gray-400">{a.club}</td>
                      <td className="px-3 py-2 uppercase">{a.position}</td>
                      <td className="px-3 py-2 text-center">{a.goals}</td>
                      <td className="px-3 py-2 text-center">{a.assists}</td>
                      <td className="px-3 py-2 text-center">{a.motm}</td>
                      <td className="px-3 py-2 text-center">{a.totw}</td>
                      <td className="px-3 py-2 text-center font-bold text-pmb-gold">{a.score}</td>
                      <td className="px-3 py-2 text-right font-bold text-emerald-400">
                        €{(a.marketValue / 1_000_000).toFixed(1)}M
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={10} className="px-4 py-6 text-center text-gray-500">
                      No players evaluated in this category.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
