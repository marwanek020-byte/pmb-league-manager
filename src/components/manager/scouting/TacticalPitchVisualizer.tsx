"use client";

import React, { useState } from "react";

type PitchPlayer = {
  id: string;
  fullName: string;
  position: string;
  overallRating: number;
  archetype?: string;
};

interface TacticalPitchVisualizerProps {
  players: Array<{
    id: string;
    fullName: string;
    position: string;
    overallRating: number | null;
  }>;
  onSelectPlayer?: (playerId: string) => void;
}

type FormationSlot = {
  pos: string;
  label: string;
  top: string; // percentage from top
  left: string; // percentage from left
};

const FORMATIONS: Record<string, { name: string; slots: FormationSlot[] }> = {
  "4-3-3": {
    name: "4-3-3 Attack",
    slots: [
      { pos: "GK", label: "GK", top: "85%", left: "50%" },
      { pos: "LB", label: "LB", top: "68%", left: "15%" },
      { pos: "CB", label: "LCB", top: "70%", left: "38%" },
      { pos: "CB", label: "RCB", top: "70%", left: "62%" },
      { pos: "RB", label: "RB", top: "68%", left: "85%" },
      { pos: "DMF", label: "DMF", top: "50%", left: "50%" },
      { pos: "CMF", label: "LCM", top: "42%", left: "30%" },
      { pos: "CMF", label: "RCM", top: "42%", left: "70%" },
      { pos: "LWF", label: "LWF", top: "20%", left: "18%" },
      { pos: "CF", label: "CF", top: "15%", left: "50%" },
      { pos: "RWF", label: "RWF", top: "20%", left: "82%" },
    ],
  },
  "4-2-3-1": {
    name: "4-2-3-1 Midfield Shield",
    slots: [
      { pos: "GK", label: "GK", top: "85%", left: "50%" },
      { pos: "LB", label: "LB", top: "68%", left: "15%" },
      { pos: "CB", label: "LCB", top: "70%", left: "38%" },
      { pos: "CB", label: "RCB", top: "70%", left: "62%" },
      { pos: "RB", label: "RB", top: "68%", left: "85%" },
      { pos: "DMF", label: "LDM", top: "54%", left: "36%" },
      { pos: "DMF", label: "RDM", top: "54%", left: "64%" },
      { pos: "AMF", label: "CAM", top: "35%", left: "50%" },
      { pos: "LWF", label: "LM", top: "35%", left: "18%" },
      { pos: "RWF", label: "RM", top: "35%", left: "82%" },
      { pos: "CF", label: "ST", top: "14%", left: "50%" },
    ],
  },
  "3-5-2": {
    name: "3-5-2 Wingback Overload",
    slots: [
      { pos: "GK", label: "GK", top: "85%", left: "50%" },
      { pos: "CB", label: "LCB", top: "70%", left: "28%" },
      { pos: "CB", label: "CCB", top: "72%", left: "50%" },
      { pos: "CB", label: "RCB", top: "70%", left: "72%" },
      { pos: "LB", label: "LWB", top: "45%", left: "12%" },
      { pos: "DMF", label: "DMF", top: "54%", left: "50%" },
      { pos: "CMF", label: "CMF", top: "42%", left: "38%" },
      { pos: "AMF", label: "AMF", top: "38%", left: "62%" },
      { pos: "RB", label: "RWB", top: "45%", left: "88%" },
      { pos: "CF", label: "LCF", top: "16%", left: "36%" },
      { pos: "CF", label: "RCF", top: "16%", left: "64%" },
    ],
  },
  "4-4-2": {
    name: "4-4-2 Classic Flat",
    slots: [
      { pos: "GK", label: "GK", top: "85%", left: "50%" },
      { pos: "LB", label: "LB", top: "68%", left: "15%" },
      { pos: "CB", label: "LCB", top: "70%", left: "38%" },
      { pos: "CB", label: "RCB", top: "70%", left: "62%" },
      { pos: "RB", label: "RB", top: "68%", left: "85%" },
      { pos: "LWF", label: "LM", top: "44%", left: "16%" },
      { pos: "CMF", label: "LCM", top: "46%", left: "38%" },
      { pos: "CMF", label: "RCM", top: "46%", left: "62%" },
      { pos: "RWF", label: "RM", top: "44%", left: "84%" },
      { pos: "CF", label: "LCF", top: "16%", left: "36%" },
      { pos: "CF", label: "RCF", top: "16%", left: "64%" },
    ],
  },
};

export function TacticalPitchVisualizer({
  players,
  onSelectPlayer,
}: TacticalPitchVisualizerProps) {
  const [selectedFormationKey, setSelectedFormationKey] = useState("4-3-3");
  const formation = FORMATIONS[selectedFormationKey] || FORMATIONS["4-3-3"];

  // Match available squad players to formation slots
  const assignedSlots: Array<{
    slot: FormationSlot;
    player: PitchPlayer | null;
  }> = [];

  const usedPlayerIds = new Set<string>();

  for (const slot of formation.slots) {
    const candidates = players.filter((p) => {
      if (usedPlayerIds.has(p.id)) return false;
      const pPos = p.position.toUpperCase();
      if (slot.pos === "GK") return pPos.includes("GK");
      if (slot.pos === "CB") return pPos.includes("CB");
      if (slot.pos === "LB") return pPos.includes("LB") || pPos.includes("LWB");
      if (slot.pos === "RB") return pPos.includes("RB") || pPos.includes("RWB");
      if (slot.pos === "DMF") return pPos.includes("DM") || pPos.includes("CM");
      if (slot.pos === "CMF") return pPos.includes("CM") || pPos.includes("AM") || pPos.includes("DM");
      if (slot.pos === "AMF") return pPos.includes("AM") || pPos.includes("CM") || pPos.includes("LW") || pPos.includes("RW");
      if (slot.pos === "LWF") return pPos.includes("LW") || pPos.includes("CF") || pPos.includes("AM");
      if (slot.pos === "RWF") return pPos.includes("RW") || pPos.includes("CF") || pPos.includes("AM");
      if (slot.pos === "CF") return pPos.includes("CF") || pPos.includes("ST") || pPos.includes("FW") || pPos.includes("LW") || pPos.includes("RW");
      return false;
    });

    candidates.sort((a, b) => (b.overallRating ?? 75) - (a.overallRating ?? 75));

    const chosen = candidates[0] || null;
    if (chosen) {
      usedPlayerIds.add(chosen.id);
      assignedSlots.push({
        slot,
        player: {
          id: chosen.id,
          fullName: chosen.fullName,
          position: chosen.position.toUpperCase(),
          overallRating: chosen.overallRating ?? 75,
        },
      });
    } else {
      assignedSlots.push({
        slot,
        player: null,
      });
    }
  }

  // Calculate Starting XI Average
  const starters = assignedSlots.map((s) => s.player).filter(Boolean) as PitchPlayer[];
  const xiAvg = starters.length > 0
    ? Math.round(starters.reduce((sum, p) => sum + p.overallRating, 0) / starters.length)
    : 70;

  const getOvrColor = (ovr: number) => {
    if (ovr >= 80) return "bg-emerald-500 text-black border-emerald-300";
    if (ovr >= 75) return "bg-pmb-gold text-black border-yellow-200";
    return "bg-rose-600 text-white border-rose-400";
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-black/80 p-5 space-y-4 shadow-2xl backdrop-blur-md">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-lg shadow-inner">
            ⚽
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
              <span>Tactical Pitch Visualizer</span>
              <span className="rounded-full bg-emerald-500/20 border border-emerald-500/40 px-2 py-0.5 text-[10px] font-black text-emerald-400">
                {xiAvg} XI OVR
              </span>
            </h3>
            <p className="text-xs text-gray-400">Live 11-Man Tactical Formation Matrix</p>
          </div>
        </div>

        {/* Formation Switcher Pills */}
        <div className="flex flex-wrap items-center gap-1.5 bg-pmb-charcoal p-1 rounded-xl border border-white/10">
          {Object.entries(FORMATIONS).map(([key, f]) => (
            <button
              key={key}
              onClick={() => setSelectedFormationKey(key)}
              className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                selectedFormationKey === key
                  ? "bg-pmb-gold text-black shadow-md font-black"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              {key}
            </button>
          ))}
        </div>
      </div>

      {/* 2D Vector Pitch Canvas */}
      <div className="relative w-full h-[460px] sm:h-[500px] rounded-2xl overflow-hidden border border-emerald-500/30 bg-gradient-to-b from-emerald-950/60 via-emerald-900/40 to-emerald-950/80 shadow-2xl">
        {/* Grass Stripes Pattern */}
        <div className="absolute inset-0 opacity-15 pointer-events-none bg-[repeating-linear-gradient(0deg,#000_0px,#000_30px,transparent_30px,transparent_60px)]" />

        {/* Pitch Lines */}
        <div className="absolute inset-3 border-2 border-white/20 rounded-xl pointer-events-none">
          {/* Center Line & Circle */}
          <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-white/20 -translate-y-1/2" />
          <div className="absolute top-1/2 left-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/20" />
          <div className="absolute top-1/2 left-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/40" />

          {/* Top Penalty Box (Attacking Zone) */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 h-20 w-44 border-b-2 border-l-2 border-r-2 border-white/20 rounded-b-lg" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 h-9 w-24 border-b-2 border-l-2 border-r-2 border-white/20" />

          {/* Bottom Penalty Box (Defensive Zone) */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 h-20 w-44 border-t-2 border-l-2 border-r-2 border-white/20 rounded-t-lg" />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 h-9 w-24 border-t-2 border-l-2 border-r-2 border-white/20" />
        </div>

        {/* Player Nodes on Pitch */}
        {assignedSlots.map((item, idx) => {
          const { slot, player } = item;

          return (
            <div
              key={idx}
              style={{
                top: slot.top,
                left: slot.left,
                transform: "translate(-50%, -50%)",
              }}
              onClick={() => player && onSelectPlayer && onSelectPlayer(player.id)}
              className="absolute z-10 flex flex-col items-center group cursor-pointer transition transform hover:scale-110"
            >
              {player ? (
                <>
                  {/* Rating Pill Badge */}
                  <div
                    className={`flex items-center justify-center h-8 w-8 sm:h-9 sm:w-9 rounded-full border-2 shadow-lg font-black text-xs sm:text-sm ${getOvrColor(
                      player.overallRating
                    )} ring-2 ring-black/40 group-hover:ring-pmb-gold transition`}
                  >
                    {player.overallRating}
                  </div>

                  {/* Player Label Card */}
                  <div className="mt-1 flex flex-col items-center bg-black/80 border border-white/20 rounded-lg px-2 py-0.5 max-w-[90px] sm:max-w-[110px] text-center shadow-md backdrop-blur-sm">
                    <span className="text-[10px] sm:text-xs font-bold text-white truncate w-full">
                      {player.fullName.split(" ").pop()}
                    </span>
                    <span className="text-[9px] font-black text-pmb-gold uppercase tracking-tighter">
                      {slot.label}
                    </span>
                  </div>
                </>
              ) : (
                /* Unfilled / Deficit Slot */
                <div className="flex flex-col items-center">
                  <div className="flex items-center justify-center h-8 w-8 sm:h-9 sm:w-9 rounded-full border-2 border-dashed border-rose-500 bg-rose-950/60 text-rose-300 font-black text-xs animate-pulse">
                    ⚠️
                  </div>
                  <span className="mt-1 rounded bg-rose-950/90 border border-rose-500/40 px-1.5 py-0.5 text-[9px] font-bold text-rose-300">
                    NO {slot.pos}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend & Summary */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/10 text-xs text-gray-400">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            <span>80+ Elite</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-full bg-pmb-gold" />
            <span>75-79 Good</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
            <span>&lt;75 Deficit</span>
          </span>
        </div>
        <span className="text-gray-400 text-[11px]">
          Click any player node to view complete Chief Scout Dossier.
        </span>
      </div>
    </div>
  );
}
