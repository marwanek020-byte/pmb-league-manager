"use client";

import { useState, useEffect } from "react";
import { GeneratedChant, TifoChoreography } from "@/lib/services/ultras-studio-service";

export function UltrasAtmosphereStudio({
  clubName,
}: {
  clubName: string;
}) {
  const [activeTab, setActiveTab] = useState<"CHANTS" | "TIFO">("CHANTS");
  const [chant, setChant] = useState<GeneratedChant | null>(null);
  const [tifo, setTifo] = useState<TifoChoreography | null>(null);
  const [loadingChant, setLoadingChant] = useState(false);
  const [loadingTifo, setLoadingTifo] = useState(false);
  const [copied, setCopied] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<"MATCHDAY_BATTLE" | "DERBY_RIVALRY" | "HERO_TRIBUTE" | "ETERNAL_LOYALTY">("MATCHDAY_BATTLE");

  const fetchChant = async (category = selectedCategory) => {
    setLoadingChant(true);
    try {
      const res = await fetch("/api/manager/ultras/studio/chants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category }),
      });
      if (res.ok) {
        const data = await res.json();
        setChant(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingChant(false);
    }
  };

  const fetchTifo = async () => {
    setLoadingTifo(true);
    try {
      const res = await fetch("/api/manager/ultras/studio/tifo");
      if (res.ok) {
        const data = await res.json();
        setTifo(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingTifo(false);
    }
  };

  useEffect(() => {
    fetchChant();
    fetchTifo();
  }, [clubName]);

  const handleCopyChant = () => {
    if (!chant) return;
    const text = `🎤 [${chant.title}] (${chant.tempo})\n\n[VERSE]\n${chant.lyrics.verse.join("\n")}\n\n[CHORUS]\n${chant.lyrics.chorus.join("\n")}${chant.lyrics.outro ? `\n\n[OUTRO]\n${chant.lyrics.outro.join("\n")}` : ""}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleCopyTifo = () => {
    if (!tifo) return;
    const text = `🎨 [TIFO BLUEPRINT: ${tifo.title}]\nFixture: ${tifo.fixtureMatchup}\nLatin Slogan: "${tifo.latinTypographySlogan}"\n${tifo.arabicSlogan ? `Arabic Slogan: "${tifo.arabicSlogan}"\n` : ""}\nLayout:\n- ${tifo.colorDistribution.sectorA}\n- ${tifo.colorDistribution.sectorB}\n- ${tifo.colorDistribution.sectorC}\n\nPyro Timing:\n${tifo.pyroTiming.map((p) => `${p.minute}: ${p.action} (${p.pyroType})`).join("\n")}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="relative overflow-hidden rounded-3xl border border-pmb-gold/30 bg-gradient-to-br from-black via-zinc-950 to-zinc-900 p-6 shadow-[0_15px_45px_rgba(0,0,0,0.85)] backdrop-blur-xl">
      {/* Background glow */}
      <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-pmb-gold/10 blur-3xl pointer-events-none" />

      {/* ═══ 1. STUDIO HEADER & SUB-TABS ═══ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5 relative z-10">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-pmb-gold animate-ping" />
            <span className="text-[10px] font-black uppercase tracking-[.25em] text-pmb-gold">
              Curva Culture & Creativity
            </span>
          </div>
          <h3 className="mt-1 text-2xl font-black uppercase tracking-tight text-white">
            Chants & TIFO Atmosphere Studio
          </h3>
        </div>

        {/* Sub tabs */}
        <div className="flex items-center gap-2 rounded-2xl bg-zinc-900/90 border border-white/10 p-1">
          <button
            onClick={() => setActiveTab("CHANTS")}
            className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-black transition ${
              activeTab === "CHANTS"
                ? "bg-pmb-gold text-black shadow-md"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <span>🎤</span>
            <span>Chant Studio</span>
          </button>
          <button
            onClick={() => setActiveTab("TIFO")}
            className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-black transition ${
              activeTab === "TIFO"
                ? "bg-pmb-gold text-black shadow-md"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <span>🎨</span>
            <span>TIFO Blueprint</span>
          </button>
        </div>
      </div>

      {/* ═══ 2. TAB 1: CHANT STUDIO ═══ */}
      {activeTab === "CHANTS" && (
        <div className="mt-6 space-y-6 relative z-10">
          {/* Category generator buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: "MATCHDAY_BATTLE", label: "🔥 Matchday Battle", prompt: "MATCHDAY_BATTLE" },
              { id: "DERBY_RIVALRY", label: "⚔️ Derby Rivalry", prompt: "DERBY_RIVALRY" },
              { id: "HERO_TRIBUTE", label: "⭐ Squad Warrior", prompt: "HERO_TRIBUTE" },
              { id: "ETERNAL_LOYALTY", label: "❤️ Eternal Loyalty", prompt: "ETERNAL_LOYALTY" },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => {
                  setSelectedCategory(cat.id as any);
                  fetchChant(cat.id as any);
                }}
                disabled={loadingChant}
                className={`rounded-xl border px-3.5 py-1.5 text-xs font-bold transition ${
                  selectedCategory === cat.id
                    ? "border-pmb-gold bg-pmb-gold/15 text-pmb-gold shadow-sm"
                    : "border-white/10 bg-white/5 text-gray-400 hover:border-white/30 hover:text-white"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {loadingChant ? (
            <div className="rounded-2xl border border-white/10 bg-black/60 p-8 text-center backdrop-blur-md">
              <div className="flex items-center justify-center gap-2 text-sm font-bold text-pmb-gold animate-pulse">
                <span className="h-3 w-3 rounded-full bg-pmb-gold animate-ping" />
                <span>Composing rhythm and rhyming stanzas in the Curva...</span>
              </div>
            </div>
          ) : chant ? (
            <div className="rounded-2xl border border-white/10 bg-black/60 p-6 backdrop-blur-md space-y-6">
              {/* Chant metadata */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
                <div>
                  <h4 className="text-xl font-black text-white">{chant.title}</h4>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <span className="rounded-full bg-pmb-gold/15 border border-pmb-gold/30 px-2.5 py-0.5 text-[10px] font-black text-pmb-gold">
                      🥁 {chant.tempo}
                    </span>
                    <span className="text-[11px] text-gray-400 font-semibold">
                      Instruments: {chant.instruments.join(" • ")}
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleCopyChant}
                  className="self-start sm:self-auto flex items-center gap-1.5 rounded-xl border border-pmb-gold/40 bg-pmb-gold/10 px-3.5 py-1.5 text-xs font-black text-pmb-gold hover:bg-pmb-gold hover:text-black transition"
                >
                  <span>{copied ? "✓ Copied" : "📋 Copy Chant"}</span>
                </button>
              </div>

              {/* Lyrics Layout */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Verse */}
                <div className="rounded-xl border border-white/5 bg-zinc-900/60 p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-amber-400 mb-2">
                    [VERSE · المقطع الأول]
                  </p>
                  <div className="space-y-1.5 text-sm font-bold leading-relaxed text-gray-200">
                    {chant.lyrics.verse.map((line, idx) => (
                      <p key={idx}>{line}</p>
                    ))}
                  </div>
                </div>

                {/* Chorus (Glow) */}
                <div className="rounded-xl border border-pmb-gold/30 bg-pmb-gold/5 p-4 shadow-[0_0_20px_rgba(212,175,55,0.08)]">
                  <p className="text-[10px] font-black uppercase tracking-widest text-pmb-gold mb-2">
                    [CHORUS · اللازمة الجماعية]
                  </p>
                  <div className="space-y-1.5 text-sm font-black leading-relaxed text-white">
                    {chant.lyrics.chorus.map((line, idx) => (
                      <p key={idx}>{line}</p>
                    ))}
                  </div>
                </div>
              </div>

              {/* Outro */}
              {chant.lyrics.outro && chant.lyrics.outro.length > 0 && (
                <div className="rounded-xl border border-white/5 bg-black/40 p-3.5 text-center text-xs font-bold text-gray-400">
                  <span className="text-[10px] font-black uppercase tracking-wider text-pmb-gold mr-2">
                    OUTRO:
                  </span>
                  {chant.lyrics.outro.join(" · ")}
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}

      {/* ═══ 3. TAB 2: TIFO CHOREOGRAPHY BLUEPRINT ═══ */}
      {activeTab === "TIFO" && (
        <div className="mt-6 space-y-6 relative z-10">
          {loadingTifo ? (
            <div className="rounded-2xl border border-white/10 bg-black/60 p-8 text-center backdrop-blur-md">
              <div className="flex items-center justify-center gap-2 text-sm font-bold text-pmb-gold animate-pulse">
                <span className="h-3 w-3 rounded-full bg-pmb-gold animate-ping" />
                <span>Engineering Curva TIFO Choreography and Pyro Protocols...</span>
              </div>
            </div>
          ) : tifo ? (
            <div className="rounded-2xl border border-white/10 bg-black/60 p-6 backdrop-blur-md space-y-6">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
                <div>
                  <h4 className="text-xl font-black text-white">{tifo.title}</h4>
                  <p className="text-xs text-gray-400 font-semibold mt-0.5">
                    Matchup: <span className="text-white font-bold">{tifo.fixtureMatchup}</span> • Theme: <span className="text-pmb-gold font-bold">{tifo.theme}</span>
                  </p>
                </div>

                <button
                  onClick={handleCopyTifo}
                  className="self-start sm:self-auto flex items-center gap-1.5 rounded-xl border border-pmb-gold/40 bg-pmb-gold/10 px-3.5 py-1.5 text-xs font-black text-pmb-gold hover:bg-pmb-gold hover:text-black transition"
                >
                  <span>{copied ? "✓ Copied" : "📋 Copy TIFO Blueprint"}</span>
                </button>
              </div>

              {/* Slogans Banner */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-xl border border-pmb-gold/30 bg-pmb-gold/10 p-4 text-center">
                  <p className="text-[10px] font-black uppercase tracking-widest text-pmb-gold">
                    Latin Slogan Banner
                  </p>
                  <p className="mt-1 text-base font-black tracking-wider text-white">
                    "{tifo.latinTypographySlogan}"
                  </p>
                </div>

                {tifo.arabicSlogan && (
                  <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-center">
                    <p className="text-[10px] font-black uppercase tracking-widest text-amber-300">
                      Arabic Virage Slogan
                    </p>
                    <p className="mt-1 text-base font-black text-white">
                      "{tifo.arabicSlogan}"
                    </p>
                  </div>
                )}
              </div>

              {/* Sector Layout */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded-xl border border-white/10 bg-zinc-900/80 p-4">
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-400">
                    Sector A (West)
                  </span>
                  <p className="mt-1 text-xs font-bold text-gray-200">{tifo.colorDistribution.sectorA}</p>
                </div>
                <div className="rounded-xl border border-pmb-gold/40 bg-zinc-900/90 p-4 shadow-md">
                  <span className="text-[10px] font-black uppercase tracking-wider text-pmb-gold">
                    Sector B (Center 3D Canvas)
                  </span>
                  <p className="mt-1 text-xs font-bold text-white">{tifo.colorDistribution.sectorB}</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-zinc-900/80 p-4">
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-400">
                    Sector C (East)
                  </span>
                  <p className="mt-1 text-xs font-bold text-gray-200">{tifo.colorDistribution.sectorC}</p>
                </div>
              </div>

              {/* Pyro Timing Protocol */}
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-rose-400 mb-3 flex items-center gap-1.5">
                  <span>🔥</span>
                  <span>Coordinated Pyro Execution Timing</span>
                </p>
                <div className="space-y-2">
                  {tifo.pyroTiming.map((pt, idx) => (
                    <div
                      key={idx}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border border-white/5 bg-zinc-950/80 p-3 text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <span className="rounded-lg bg-rose-500/20 px-2 py-0.5 font-black text-rose-300">
                          {pt.minute}
                        </span>
                        <span className="font-bold text-white">{pt.action}</span>
                      </div>
                      <span className="text-gray-400 text-[11px] font-semibold">
                        Type: <span className="text-amber-300 font-bold">{pt.pyroType}</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
