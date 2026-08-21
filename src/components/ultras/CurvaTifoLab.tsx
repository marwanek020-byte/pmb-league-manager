"use client";

import { useState } from "react";

export function CurvaTifoLab({ clubName }: { clubName: string }) {
  const [slogan, setSlogan] = useState("VICTORIA INVICTA · العاصمة برجالها");
  const [sectorAColor, setSectorAColor] = useState("#006233"); // Green
  const [sectorBColor, setSectorBColor] = useState("#000000"); // Black
  const [sectorCColor, setSectorCColor] = useState("#C1272D"); // Red
  const [pyroActive, setPyroActive] = useState(true);
  const [canvas3dMotif, setCanvas3dMotif] = useState("Mascot Warrior Crest");

  return (
    <div className="relative overflow-hidden rounded-3xl border border-pmb-gold/40 bg-gradient-to-br from-black via-zinc-950 to-zinc-900 p-6 shadow-[0_15px_45px_rgba(0,0,0,0.85)] backdrop-blur-xl space-y-6">
      {/* Background Glow */}
      <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4 relative z-10">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-[10px] font-black uppercase tracking-[.25em] text-pmb-gold">
              Innovation #1: 3-Tier Choreography Studio
            </span>
          </div>
          <h3 className="mt-1 text-2xl font-black uppercase tracking-tight text-white">
            🎨 Curva TIFO Choreography Lab & Stadium Builder
          </h3>
        </div>

        <button
          onClick={() => setPyroActive(!pyroActive)}
          className={`rounded-xl border px-3 py-1.5 text-xs font-black transition ${
            pyroActive
              ? "border-amber-500 bg-amber-500/20 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.4)]"
              : "border-white/10 bg-zinc-900 text-gray-400"
          }`}
        >
          🔥 {pyroActive ? "Pyro Barrier IGNITED" : "Ignite Smoke Flares"}
        </button>
      </div>

      {/* ═══ INTERACTIVE 3-TIER STADIUM CANVAS SIMULATOR ═══ */}
      <div className="relative overflow-hidden rounded-3xl border border-pmb-gold/30 bg-zinc-950 p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-gray-400">
          <span>Stade Moulay Abdellah · Curva Tribune (53,000 Capacity)</span>
          <span className="text-pmb-gold">3D Stadium Mesh View</span>
        </div>

        {/* Stadium Tribune Layout Grid */}
        <div className="grid grid-cols-12 gap-2 h-44 rounded-2xl border border-white/10 bg-black/80 p-3 relative overflow-hidden">
          {/* Sector A (Left Tribune) */}
          <div
            style={{ backgroundColor: sectorAColor }}
            className="col-span-3 rounded-xl opacity-80 flex flex-col items-center justify-center p-2 text-center border border-white/20 transition-all duration-500 shadow-lg"
          >
            <span className="text-[9px] font-black uppercase text-white tracking-widest drop-shadow">Sector A</span>
            <span className="text-[11px] font-black text-white drop-shadow">3,000 Cards</span>
          </div>

          {/* Sector B (Center 3D Drop Canvas) */}
          <div
            style={{ backgroundColor: sectorBColor }}
            className="col-span-6 rounded-xl flex flex-col items-center justify-between p-3 text-center border-2 border-pmb-gold relative transition-all duration-500 shadow-[0_0_25px_rgba(212,175,55,0.4)]"
          >
            <span className="text-[10px] font-black uppercase text-pmb-gold tracking-widest">
              🌟 3D Center Drop Canvas (45m x 25m)
            </span>
            <div className="my-auto py-2">
              <p className="text-sm font-black text-white tracking-wider drop-shadow-md">{canvas3dMotif}</p>
              <p className="mt-1 text-xs font-black text-pmb-gold italic drop-shadow">"{slogan}"</p>
            </div>
            <span className="text-[9px] font-bold text-gray-300">12,000 Core Ultras Mosaic</span>
          </div>

          {/* Sector C (Right Tribune) */}
          <div
            style={{ backgroundColor: sectorCColor }}
            className="col-span-3 rounded-xl opacity-80 flex flex-col items-center justify-center p-2 text-center border border-white/20 transition-all duration-500 shadow-lg"
          >
            <span className="text-[9px] font-black uppercase text-white tracking-widest drop-shadow">Sector C</span>
            <span className="text-[11px] font-black text-white drop-shadow">3,000 Cards</span>
          </div>

          {/* Lower Terrace Pyro Barrier */}
          {pyroActive && (
            <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-red-600 via-amber-500 to-transparent opacity-90 animate-pulse flex items-center justify-around">
              {Array.from({ length: 12 }).map((_, i) => (
                <span key={i} className="text-xs">🔥</span>
              ))}
            </div>
          )}
        </div>

        {/* Customization Controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          <div>
            <label className="text-[11px] font-bold text-gray-400">Latin / Arabic Tribune Slogan:</label>
            <input
              type="text"
              value={slogan}
              onChange={(e) => setSlogan(e.target.value)}
              className="mt-1 w-full rounded-xl border border-white/15 bg-zinc-900/90 px-3 py-2 text-xs text-white focus:border-pmb-gold focus:outline-none"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-gray-400">Center 3D Canvas Motif:</label>
            <select
              value={canvas3dMotif}
              onChange={(e) => setCanvas3dMotif(e.target.value)}
              className="mt-1 w-full rounded-xl border border-white/15 bg-zinc-900/90 px-3 py-2 text-xs text-white focus:border-pmb-gold focus:outline-none"
            >
              <option>Mascot Warrior Crest</option>
              <option>Historical Trophy Monument</option>
              <option>City Citadel & Falcon</option>
              <option>Gladiator Helmet & Swords</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] font-bold text-gray-400">Tribune Card Colors (A / B / C):</label>
            <div className="mt-1 flex items-center gap-3">
              <input
                type="color"
                value={sectorAColor}
                onChange={(e) => setSectorAColor(e.target.value)}
                className="h-8 w-12 rounded cursor-pointer border border-white/20 bg-transparent"
              />
              <input
                type="color"
                value={sectorBColor}
                onChange={(e) => setSectorBColor(e.target.value)}
                className="h-8 w-12 rounded cursor-pointer border border-white/20 bg-transparent"
              />
              <input
                type="color"
                value={sectorCColor}
                onChange={(e) => setSectorCColor(e.target.value)}
                className="h-8 w-12 rounded cursor-pointer border border-white/20 bg-transparent"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
