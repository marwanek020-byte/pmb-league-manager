"use client";

import { useState } from "react";
import { UltrasBadge } from "@/components/UltrasBadge";
import { MatchdayBriefing } from "@/lib/services/ultras-matchday-service";

export function CurvaMatchdayBriefing({
  briefing,
  clubName,
}: {
  briefing: MatchdayBriefing;
  clubName: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(briefing.formattedMarkdownBriefing);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const getFormColor = (res: "W" | "D" | "L") => {
    if (res === "W") return "bg-emerald-500/20 text-emerald-400 border-emerald-500/40";
    if (res === "D") return "bg-amber-500/20 text-amber-400 border-amber-500/40";
    return "bg-rose-500/20 text-rose-400 border-rose-500/40";
  };

  return (
    <div className="relative overflow-hidden rounded-3xl border border-pmb-gold/40 bg-gradient-to-br from-black via-zinc-950 to-zinc-900 p-6 shadow-[0_15px_45px_rgba(0,0,0,0.9)] backdrop-blur-2xl">
      {/* Dynamic ambient background glow */}
      <div className="absolute -left-20 -top-20 h-72 w-72 rounded-full bg-pmb-gold/15 blur-3xl pointer-events-none" />
      <div className="absolute -right-20 -bottom-20 h-72 w-72 rounded-full bg-rose-500/10 blur-3xl pointer-events-none" />

      {/* ═══ 1. BRIEFING HEADER ═══ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5 relative z-10">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-red-500 animate-ping" />
            <span className="text-[10px] font-black uppercase tracking-[.25em] text-pmb-gold">
              Live Matchday Experience
            </span>
          </div>
          <h3 className="mt-1 text-xl font-black uppercase tracking-tight text-white sm:text-2xl flex items-center gap-2">
            {briefing.editionTitle}
          </h3>
        </div>

        <button
          onClick={handleCopy}
          className="self-start sm:self-auto flex items-center gap-1.5 rounded-xl border border-pmb-gold/40 bg-pmb-gold/10 px-3.5 py-1.5 text-xs font-black text-pmb-gold hover:bg-pmb-gold hover:text-black transition shadow-md"
        >
          <span>{copied ? "✓ Copied to Clipboard" : "📋 Copy Briefing"}</span>
        </button>
      </div>

      {/* ═══ 2. FIXTURE CLASH ARENA ═══ */}
      <div className="my-6 rounded-2xl border border-white/10 bg-black/60 p-5 backdrop-blur-md relative z-10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Home Club */}
          <div className="flex items-center gap-3 w-full md:w-auto justify-start">
            <UltrasBadge clubName={briefing.fixture.homeClubName} size="md" />
            <div>
              <p className="text-xs font-semibold text-gray-400">HOME</p>
              <p className="text-lg font-black text-white">{briefing.fixture.homeClubName}</p>
              {/* Form */}
              <div className="flex items-center gap-1 mt-1">
                {briefing.form.myClubForm.map((f, i) => (
                  <span
                    key={i}
                    className={`flex h-5 w-5 items-center justify-center rounded border text-[9px] font-black ${getFormColor(f)}`}
                  >
                    {f}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* VS & Stadium Details */}
          <div className="text-center px-4 py-2 rounded-xl bg-zinc-900/80 border border-white/5">
            <span className="text-xs font-black uppercase tracking-widest text-pmb-gold">VS</span>
            <p className="text-[11px] font-bold text-gray-300 mt-0.5">
              🏟️ {briefing.fixture.stadiumName}
            </p>
            <div className="flex items-center justify-center gap-2 text-[10px] text-gray-400 mt-1">
              <span>⏰ {briefing.fixture.kickoffTime}</span>
              <span>•</span>
              <span className="text-amber-300 font-bold">{briefing.fixture.capacity}</span>
            </div>
          </div>

          {/* Away Club */}
          <div className="flex items-center gap-3 w-full md:w-auto justify-end text-right">
            <div>
              <p className="text-xs font-semibold text-gray-400">AWAY</p>
              <p className="text-lg font-black text-white">{briefing.fixture.awayClubName}</p>
              {/* Form */}
              <div className="flex items-center justify-end gap-1 mt-1">
                {briefing.form.oppClubForm.map((f, i) => (
                  <span
                    key={i}
                    className={`flex h-5 w-5 items-center justify-center rounded border text-[9px] font-black ${getFormColor(f)}`}
                  >
                    {f}
                  </span>
                ))}
              </div>
            </div>
            <UltrasBadge clubName={briefing.fixture.awayClubName} size="md" />
          </div>
        </div>

        {/* Table Stakes Indicator */}
        <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-center gap-2 text-center text-xs font-bold text-pmb-gold">
          <span>📊 Table Stakes:</span>
          <span className="text-white font-black">{briefing.tableStakes.stakesLabel}</span>
        </div>
      </div>

      {/* ═══ 3. CAPO CALL TO ARMS QUOTE BOX ═══ */}
      <div className="my-5 rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-950/40 via-zinc-950/80 to-zinc-950 p-5 relative z-10">
        <div className="flex items-start gap-3">
          <span className="text-2xl shrink-0 animate-bounce">📢</span>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-amber-400">
              Capo Call to Arms
            </p>
            <p className="mt-1 text-sm font-bold leading-relaxed text-gray-200 italic whitespace-pre-line">
              "{briefing.capoCallToArms}"
            </p>
          </div>
        </div>
      </div>

      {/* ═══ 4. KEY MATCHUPS & CAPO PREDICTION ═══ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-5 relative z-10">
        {/* ⭐ Man to Watch */}
        <div className="rounded-2xl border border-white/10 bg-black/60 p-4 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">
              ⭐ Man to Watch
            </span>
            <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-black text-emerald-300">
              {briefing.manToWatch.overallRating} OVR
            </span>
          </div>
          <p className="mt-1 text-sm font-black text-white">{briefing.manToWatch.name}</p>
          <p className="text-xs text-gray-400 font-semibold">{briefing.manToWatch.position} • {briefing.manToWatch.detail}</p>
        </div>

        {/* ⚠️ Key Threat */}
        <div className="rounded-2xl border border-white/10 bg-black/60 p-4 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-rose-400">
              ⚠️ Key Threat
            </span>
            <span className="rounded-full bg-rose-500/20 px-2 py-0.5 text-[10px] font-black text-rose-300">
              {briefing.keyThreat.overallRating} OVR
            </span>
          </div>
          <p className="mt-1 text-sm font-black text-white">{briefing.keyThreat.name}</p>
          <p className="text-xs text-gray-400 font-semibold">{briefing.keyThreat.position} • {briefing.keyThreat.detail}</p>
        </div>

        {/* 🔮 Capo Prediction */}
        <div className="rounded-2xl border border-pmb-gold/30 bg-gradient-to-br from-amber-950/20 to-black/80 p-4 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-pmb-gold">
              🔮 Capo Prediction
            </span>
            <span className="text-xs font-black text-amber-300">
              {briefing.capoPrediction.confidence}% Conf.
            </span>
          </div>
          <p className="mt-1 text-lg font-black text-white">
            Score: <span className="text-pmb-gold">{briefing.capoPrediction.predictedScore}</span>
          </p>
          <p className="text-[11px] text-gray-400 font-semibold leading-tight">
            {briefing.capoPrediction.verdict}
          </p>
        </div>
      </div>
    </div>
  );
}
