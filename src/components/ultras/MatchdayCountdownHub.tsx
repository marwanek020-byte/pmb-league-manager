"use client";

import { useEffect, useState } from "react";
import { MatchdayBriefing } from "@/lib/services/ultras-matchday-service";

export function MatchdayCountdownHub({
  clubName,
  matchdayBriefing,
}: {
  clubName: string;
  matchdayBriefing: MatchdayBriefing | null;
}) {
  const [secondsRemaining, setSecondsRemaining] = useState(9912); // ~2h 45m
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeChantIdx, setActiveChantIdx] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsRemaining((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatCountdown = (totalSec: number) => {
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const playlist = [
    { title: "من صغري وأنا معاك (Moroccan Terrace Hymn)", tempo: "128 BPM", instruments: "Darbouka & Megaphone" },
    { title: "Irons Forever (East London Terrace Roar)", tempo: "135 BPM", instruments: "Heavy Bass Drum" },
    { title: "Ici c'est la Capitale (Virage Enflammé)", tempo: "122 BPM", instruments: "Snare Drum & Claps" },
  ];

  return (
    <div className="relative overflow-hidden rounded-3xl border border-pmb-gold/40 bg-gradient-to-br from-black via-zinc-950 to-zinc-900 p-6 shadow-[0_15px_45px_rgba(0,0,0,0.85)] backdrop-blur-xl space-y-6">
      {/* Background Glow */}
      <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-pmb-gold/10 blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4 relative z-10">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-[10px] font-black uppercase tracking-[.25em] text-pmb-gold">
              Innovation #4: Live Stadium Jukebox
            </span>
          </div>
          <h3 className="mt-1 text-2xl font-black uppercase tracking-tight text-white">
            ⏱️ Capo Matchday Countdown & Chant Soundboard
          </h3>
        </div>

        <div className="flex items-center gap-2 rounded-2xl bg-zinc-900/90 border border-white/10 px-4 py-2">
          <span className="text-xs font-bold text-gray-400">Kickoff in:</span>
          <span className="text-base font-black text-pmb-gold font-mono">{formatCountdown(secondsRemaining)}</span>
        </div>
      </div>

      {/* ═══ LIVE AUDIO SOUNDWAVE & CHANT PLAYER ═══ */}
      <div className="rounded-2xl border border-white/10 bg-black/60 p-5 backdrop-blur-md space-y-4 relative z-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-pmb-gold">Now Playing on Curva Soundboard:</span>
            <h4 className="text-base font-black text-white mt-0.5">{playlist[activeChantIdx].title}</h4>
            <p className="text-xs text-gray-400 font-semibold">{playlist[activeChantIdx].tempo} • {playlist[activeChantIdx].instruments}</p>
          </div>

          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="flex items-center gap-2 rounded-xl bg-pmb-gold px-4 py-2 text-xs font-black text-black hover:bg-amber-400 transition shadow-lg"
          >
            <span>{isPlaying ? "⏸️ Pause Soundboard" : "▶️ Play Stadium Hymn"}</span>
          </button>
        </div>

        {/* Animated Soundwave Visualizer Bars */}
        <div className="flex items-end justify-center gap-1.5 h-12 py-2">
          {Array.from({ length: 24 }).map((_, i) => (
            <div
              key={i}
              style={{
                height: isPlaying ? `${Math.floor(20 + Math.random() * 80)}%` : "20%",
                transition: "height 0.2s ease-in-out",
              }}
              className="w-1.5 rounded-full bg-gradient-to-t from-pmb-gold to-amber-300 shadow-[0_0_8px_rgba(212,175,55,0.6)]"
            />
          ))}
        </div>

        {/* Playlist Selector Pills */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pt-2 border-t border-white/5">
          {playlist.map((chant, idx) => (
            <button
              key={idx}
              onClick={() => {
                setActiveChantIdx(idx);
                setIsPlaying(true);
              }}
              className={`rounded-xl border p-2.5 text-left text-xs transition ${
                activeChantIdx === idx
                  ? "border-pmb-gold bg-pmb-gold/15 text-white font-black"
                  : "border-white/10 bg-zinc-900/60 text-gray-400 hover:text-white"
              }`}
            >
              <p className="truncate font-bold">{chant.title}</p>
              <span className="text-[10px] text-pmb-gold font-semibold">{chant.tempo}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
