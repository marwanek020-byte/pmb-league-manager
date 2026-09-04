"use client";

import { useState, useEffect } from "react";

interface AppMusicSettingsHubProps {
  clubName?: string;
  clubLogo?: string | null;
  budget?: number;
  onBack: () => void;
}

const PLAYLIST = [
  { id: "After Hours", title: "After Hours", artist: "The Weeknd (Mercato Mix)", duration: "3:48", tag: "Atmospheric" },
  { id: "OMAR", title: "OMAR", artist: "Moroccan Hip-Hop & Trap", duration: "2:54", tag: "Urban Heat" },
  { id: "STALINE", title: "STALINE", artist: "High Voltage Synth", duration: "3:12", tag: "Stadium Hype" },
  { id: "Storm", title: "Storm", artist: "Cinematic Orchestral Theme", duration: "4:05", tag: "Epic Matchday" },
];

export function AppMusicSettingsHub({
  clubName = "FAR Rabat",
  clubLogo = null,
  budget = 0,
  onBack,
}: AppMusicSettingsHubProps) {
  const [volume, setVolume] = useState<number>(35);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [currentTrack, setCurrentTrack] = useState<string>("After Hours");

  // Sync state on mount
  useEffect(() => {
    const saved = localStorage.getItem("pmb-music-volume");
    if (saved !== null) {
      setVolume(Math.round(parseFloat(saved) * 100));
    }

    function onStateUpdate(e: any) {
      if (e.detail) {
        if (typeof e.detail.volume === "number") {
          setVolume(Math.round(e.detail.volume * 100));
        }
        if (typeof e.detail.isPlaying === "boolean") {
          setIsPlaying(e.detail.isPlaying);
        }
        if (e.detail.currentTrack) {
          setCurrentTrack(e.detail.currentTrack);
        }
      }
    }

    window.addEventListener("pmb-music-state", onStateUpdate);
    window.dispatchEvent(new CustomEvent("pmb-request-music-state"));

    return () => {
      window.removeEventListener("pmb-music-state", onStateUpdate);
    };
  }, []);

  const handleVolumeChange = (newVol: number) => {
    const clamped = Math.max(0, Math.min(100, newVol));
    setVolume(clamped);
    const decimal = clamped / 100;
    localStorage.setItem("pmb-music-volume", String(decimal));
    window.dispatchEvent(
      new CustomEvent("pmb-set-volume", { detail: { volume: decimal } })
    );
  };

  const togglePlayback = () => {
    window.dispatchEvent(new CustomEvent("pmb-toggle-music"));
    setIsPlaying(!isPlaying);
  };

  const nextTrack = () => {
    window.dispatchEvent(new CustomEvent("pmb-next-track"));
  };

  return (
    <div className="fixed inset-0 z-50 w-full h-[100dvh] bg-[#070709] text-white flex flex-col justify-between overflow-y-auto overflow-x-hidden font-montserrat select-none">
      {/* Background Ambient Glows */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-96 h-96 bg-[#e9c349]/15 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -right-20 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-10 left-10 w-96 h-96 bg-amber-600/5 rounded-full blur-3xl" />
      </div>

      {/* ─── APP HEADER ─── */}
      <header className="relative z-20 w-full max-w-7xl mx-auto px-6 sm:px-10 py-5 flex items-center justify-between border-b border-white/10 backdrop-blur-md">
        {/* Back Button & Title */}
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1.5 rounded-full border border-white/20 bg-black/60 px-4 py-2 text-xs font-black uppercase tracking-widest text-white shadow-md transition-all hover:scale-105 hover:border-[#e9c349] hover:text-[#e9c349] active:scale-95 cursor-pointer"
          >
            <span>‹</span>
            <span>EXTRAS</span>
          </button>

          <div>
            <h1 className="font-montserrat text-sm sm:text-base font-black uppercase tracking-wider text-white flex items-center gap-2">
              <span>MUSIC SETTINGS</span>
              <span className="w-2 h-2 rounded-full bg-[#e9c349] shadow-[0_0_8px_#e9c349]" />
            </h1>
            <span className="text-[10px] uppercase font-bold text-gray-400 tracking-widest block">
              SOUNDTRACK VOLUME & AUDIO PLAYBACK
            </span>
          </div>
        </div>

        {/* Live Budget Pill */}
        <div className="flex items-center gap-2.5 rounded-full border border-[#e9c349]/80 bg-black/90 px-4 py-2 shadow-[0_0_20px_rgba(233,195,73,0.35)]">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-b from-[#f5d475] to-[#b8860b] text-black font-black text-xs">
            €
          </div>
          <span className="font-montserrat text-sm sm:text-base font-black tracking-wider text-[#e9c349]">
            {new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(budget)}
          </span>
        </div>
      </header>

      {/* ─── MAIN CONTENT ─── */}
      <main className="relative z-10 w-full max-w-4xl mx-auto px-5 sm:px-8 py-8 space-y-8">
        
        {/* MASTER VOLUME CONTROLLER */}
        <div className="relative overflow-hidden rounded-3xl border border-[#e9c349]/40 bg-gradient-to-b from-[#16161c] via-[#0c0c10] to-[#070709] p-8 sm:p-10 shadow-[0_15px_50px_rgba(0,0,0,0.8),0_0_40px_rgba(233,195,73,0.12)]">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pb-6 border-b border-white/10">
            <div className="flex items-center gap-4 text-center sm:text-left">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#f5d475] to-[#b8860b] text-black shadow-[0_0_25px_rgba(233,195,73,0.4)] text-2xl">
                {volume === 0 ? "🔇" : volume < 35 ? "🔈" : volume < 75 ? "🔉" : "🔊"}
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[.25em] text-[#e9c349]">
                  STADIUM ACOUSTICS ENGINE
                </p>
                <h2 className="text-xl sm:text-2xl font-black uppercase tracking-wider text-white">
                  Master Soundtrack Volume
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-3xl sm:text-4xl font-black text-[#e9c349] font-mono tracking-tight drop-shadow-[0_0_15px_rgba(233,195,73,0.5)]">
                {volume}%
              </span>
            </div>
          </div>

          {/* Interactive Range Slider */}
          <div className="py-8 space-y-4">
            <div className="relative flex items-center">
              <input
                type="range"
                min="0"
                max="100"
                value={volume}
                onChange={(e) => handleVolumeChange(parseInt(e.target.value))}
                className="w-full h-3 bg-zinc-800 rounded-full appearance-none cursor-pointer accent-[#f5d475] focus:outline-none"
                style={{
                  background: `linear-gradient(to right, #f5d475 0%, #d4af37 ${volume}%, #27272a ${volume}%, #27272a 100%)`,
                }}
              />
            </div>

            {/* Range indicator labels */}
            <div className="flex justify-between text-[10px] font-black tracking-widest text-gray-500 uppercase">
              <span>0% Silent</span>
              <span>25% Calm</span>
              <span>50% Balanced</span>
              <span>75% Energetic</span>
              <span>100% Maximum</span>
            </div>
          </div>

          {/* 5 Quick Presets */}
          <div className="grid grid-cols-5 gap-2 sm:gap-3 pt-2">
            {[
              { label: "MUTE", val: 0, icon: "🔇" },
              { label: "25%", val: 25, icon: "🔈" },
              { label: "50%", val: 50, icon: "🔉" },
              { label: "80%", val: 80, icon: "🔥" },
              { label: "100%", val: 100, icon: "⚡" },
            ].map((preset) => (
              <button
                key={preset.val}
                type="button"
                onClick={() => handleVolumeChange(preset.val)}
                className={`flex flex-col items-center justify-center py-2.5 px-2 rounded-xl border font-black text-xs transition-all ${
                  volume === preset.val
                    ? "border-[#e9c349] bg-gradient-to-r from-[#f5d475] to-[#d4af37] text-black shadow-[0_0_15px_rgba(233,195,73,0.4)] scale-105"
                    : "border-white/10 bg-white/5 text-gray-400 hover:border-white/25 hover:text-white"
                }`}
              >
                <span className="text-sm">{preset.icon}</span>
                <span className="mt-1 tracking-wider text-[10px]">{preset.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* NOW PLAYING & PLAYBACK CONTROLS */}
        <div className="rounded-3xl border border-white/15 bg-gradient-to-b from-[#101014] to-[#070709] p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[.25em] text-[#e9c349]">
                NOW PLAYING IN LOUNGE
              </p>
              <div className="flex items-center gap-3 mt-1">
                {isPlaying && (
                  <div className="flex items-center gap-1">
                    <span className="w-1 h-4 bg-[#e9c349] animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1 h-6 bg-[#f5d475] animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-1 h-3 bg-[#b8860b] animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                )}
                <h3 className="text-lg font-black uppercase tracking-wider text-white">
                  {currentTrack || "PMB Mercato Lounge Theme"}
                </h3>
              </div>
            </div>

            {/* Play/Pause & Next Buttons */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={togglePlayback}
                className={`flex items-center gap-2 rounded-2xl px-5 py-3 text-xs font-black uppercase tracking-wider transition-all shadow-lg ${
                  isPlaying
                    ? "border border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20"
                    : "border border-emerald-500/40 bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30"
                }`}
              >
                <span>{isPlaying ? "⏸ PAUSE" : "▶ PLAY"}</span>
              </button>

              <button
                type="button"
                onClick={nextTrack}
                className="flex items-center gap-2 rounded-2xl border border-[#e9c349]/40 bg-gradient-to-r from-[#f5d475] to-[#d4af37] px-5 py-3 text-xs font-black uppercase tracking-wider text-black shadow-[0_0_20px_rgba(233,195,73,0.35)] hover:scale-105 active:scale-95 transition-all"
              >
                <span>NEXT TRACK</span>
                <span>⏭</span>
              </button>
            </div>
          </div>

          {/* OFFICIAL TRACKLIST */}
          <div className="border-t border-white/10 pt-4 space-y-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-3">
              OFFICIAL SOUNDTRACK PLAYLIST (4 TRACKS)
            </p>
            <div className="space-y-2">
              {PLAYLIST.map((song, idx) => {
                const isCurrent = currentTrack.toLowerCase().includes(song.id.toLowerCase());
                return (
                  <div
                    key={song.id}
                    className={`flex items-center justify-between rounded-xl p-3 border transition-all ${
                      isCurrent
                        ? "border-[#e9c349]/60 bg-[#e9c349]/10 shadow-[0_0_15px_rgba(233,195,73,0.15)]"
                        : "border-white/5 bg-white/[0.02] hover:bg-white/5"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-mono font-bold ${isCurrent ? "text-[#e9c349]" : "text-gray-500"}`}>
                        0{idx + 1}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-bold ${isCurrent ? "text-[#e9c349]" : "text-white"}`}>
                            {song.title}
                          </span>
                          {isCurrent && (
                            <span className="rounded-full bg-[#e9c349] px-2 py-0.2 text-[9px] font-black text-black">
                              PLAYING
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-gray-400">{song.artist}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-right">
                      <span className="rounded-lg border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-semibold text-gray-300">
                        {song.tag}
                      </span>
                      <span className="text-xs font-mono text-gray-500">{song.duration}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </main>

      {/* ─── FOOTER ─── */}
      <footer className="relative z-10 w-full text-center py-4 border-t border-white/10 text-[10px] font-mono tracking-widest text-gray-500">
        PMB LEAGUE MANAGER · WEBAUDIO & SOUNDTRACK CONTROLLER
      </footer>
    </div>
  );
}
