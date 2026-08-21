"use client";

import React, { useState } from "react";
import { WhatIfSimulationResult } from "@/lib/services/what-if-simulator-service";

interface WhatIfSimulatorModalProps {
  squadPlayers: Array<{ id: string; fullName: string; position: string; overallRating: number; marketValue: number }>;
  availableCandidates: Array<{ id: string; fullName: string; position: string; overallRating: number; marketValue: number }>;
  isOpen: boolean;
  onClose: () => void;
}

export function WhatIfSimulatorModal({
  squadPlayers,
  availableCandidates,
  isOpen,
  onClose,
}: WhatIfSimulatorModalProps) {
  const [targetId, setTargetId] = useState("");
  const [sellId, setSellId] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<WhatIfSimulationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleRunSimulation = async () => {
    if (!targetId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/manager/scouting/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetPlayerId: targetId,
          sellPlayerId: sellId || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Simulation failed");
      }
      const data = await res.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message || "Failed to simulate");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="relative w-full max-w-3xl rounded-3xl border border-pmb-gold/50 bg-pmb-charcoal p-6 sm:p-8 space-y-6 shadow-2xl overflow-y-auto max-h-[90vh]">
        {/* Header */}
        <div className="flex justify-between items-start border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-pmb-gold/20 text-xl border border-pmb-gold/40">
              🔮
            </div>
            <div>
              <span className="text-[10px] font-black uppercase text-pmb-gold tracking-wider">
                TACTICAL WHAT-IF ENGINE
              </span>
              <h3 className="text-xl font-black text-white">
                Squad Consequence & Ripple Simulator
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full bg-white/10 p-2 text-gray-400 hover:text-white hover:bg-white/20 transition"
          >
            ✕
          </button>
        </div>

        {/* Input Selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-pmb-gold uppercase flex items-center gap-1">
              <span>➕</span>
              <span>Select Target Player to Sign:</span>
            </label>
            <select
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              className="pmb-input mt-1 w-full text-xs font-semibold"
            >
              <option value="">Choose Target to Acquire...</option>
              {availableCandidates.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.fullName} ({p.position}, {p.overallRating} OVR, €{(p.marketValue / 1_000_000).toFixed(1)}M)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-rose-400 uppercase flex items-center gap-1">
              <span>➖</span>
              <span>Select Player to Offload (Optional):</span>
            </label>
            <select
              value={sellId}
              onChange={(e) => setSellId(e.target.value)}
              className="pmb-input mt-1 w-full text-xs font-semibold"
            >
              <option value="">No departures (Keep entire squad)</option>
              {squadPlayers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.fullName} ({p.position}, {p.overallRating} OVR, €{(p.marketValue / 1_000_000).toFixed(1)}M)
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={handleRunSimulation}
          disabled={!targetId || loading}
          className="w-full rounded-xl bg-pmb-gold py-3 text-xs font-black text-black hover:bg-white transition disabled:opacity-50 shadow-lg"
        >
          {loading ? "⏳ Calculating 1,000 algorithmic ripple effects..." : "🚀 Run Transfer Simulation"}
        </button>

        {error && (
          <div className="rounded-xl bg-rose-950/50 border border-rose-500/40 p-3 text-xs text-rose-300">
            {error}
          </div>
        )}

        {/* Simulation Output Dashboard */}
        {result && (
          <div className="space-y-4 pt-4 border-t border-white/10">
            {/* Executive Verdict Banner */}
            <div className="rounded-2xl border border-pmb-gold/50 bg-gradient-to-r from-pmb-gold/15 via-black to-pmb-gold/10 p-5 space-y-2">
              <div className="flex justify-between items-center">
                <span className="rounded-full bg-pmb-gold px-3 py-0.5 text-xs font-black text-black">
                  {result.executiveVerdict.recommendation}
                </span>
                <span className="text-xs font-bold text-gray-400">Chief Scout AI Analysis</span>
              </div>
              <h4 className="text-base font-black text-white">{result.executiveVerdict.verdictTitle}</h4>
              <p className="text-xs text-gray-300 leading-relaxed">
                {result.executiveVerdict.verdictDescription}
              </p>
            </div>

            {/* Before vs After Metric Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* OVR */}
              <div className="rounded-xl bg-black/60 border border-white/10 p-3 text-center space-y-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase">Starting XI Avg</span>
                <div className="flex items-center justify-center gap-1.5 font-black text-base">
                  <span className="text-gray-400">{result.before.startingXiAvg}</span>
                  <span className="text-gray-500">➔</span>
                  <span className="text-white">{result.after.startingXiAvg}</span>
                </div>
                <span className={`text-[10px] font-extrabold ${result.deltas.startingXiDelta >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  {result.deltas.startingXiDelta >= 0 ? `+${result.deltas.startingXiDelta}` : result.deltas.startingXiDelta} OVR
                </span>
              </div>

              {/* Rank */}
              <div className="rounded-xl bg-black/60 border border-white/10 p-3 text-center space-y-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase">Projected Rank</span>
                <div className="flex items-center justify-center gap-1.5 font-black text-base">
                  <span className="text-gray-400">#{result.before.projectedRank}</span>
                  <span className="text-gray-500">➔</span>
                  <span className="text-pmb-gold">#{result.after.projectedRank}</span>
                </div>
                <span className="text-[10px] font-bold text-gray-300 truncate">
                  {result.after.tier}
                </span>
              </div>

              {/* Cash Treasury */}
              <div className="rounded-xl bg-black/60 border border-white/10 p-3 text-center space-y-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase">Treasury Cash</span>
                <div className="flex items-center justify-center gap-1.5 font-black text-xs sm:text-sm">
                  <span className="text-white">€{(result.after.budgetEur / 1_000_000).toFixed(1)}M</span>
                </div>
                <span className={`text-[10px] font-bold ${result.deltas.budgetDeltaEur <= 0 ? "text-rose-400" : "text-emerald-400"}`}>
                  {result.deltas.budgetDeltaEur <= 0 ? `-€${(Math.abs(result.deltas.budgetDeltaEur) / 1_000_000).toFixed(1)}M` : `+€${(result.deltas.budgetDeltaEur / 1_000_000).toFixed(1)}M`}
                </span>
              </div>

              {/* Attack / Defense Balance */}
              <div className="rounded-xl bg-black/60 border border-white/10 p-3 text-center space-y-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase">Sector Balance</span>
                <div className="text-[11px] font-bold text-white">
                  ⚡ ATT: {result.after.attRating} | 🛡️ DEF: {result.after.defRating}
                </div>
                <span className="text-[10px] text-gray-400">
                  ⚙️ MID: {result.after.midRating}
                </span>
              </div>
            </div>

            {/* Pros and Cons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="rounded-xl bg-emerald-950/20 border border-emerald-500/30 p-3.5 space-y-1.5">
                <span className="text-xs font-black text-emerald-300 uppercase">Tactical Pros:</span>
                <ul className="text-xs text-gray-300 space-y-1">
                  {result.executiveVerdict.tacticalPros.map((pro, idx) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <span className="text-emerald-400">✓</span>
                      <span>{pro}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-xl bg-rose-950/20 border border-rose-500/30 p-3.5 space-y-1.5">
                <span className="text-xs font-black text-rose-300 uppercase">Risk Considerations:</span>
                <ul className="text-xs text-gray-300 space-y-1">
                  {result.executiveVerdict.tacticalCons.map((con, idx) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <span className="text-rose-400">⚠️</span>
                      <span>{con}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
