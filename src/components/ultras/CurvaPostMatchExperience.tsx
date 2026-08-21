"use client";

import { useState } from "react";
import { UltrasBadge } from "@/components/UltrasBadge";
import { PostMatchExperience } from "@/lib/services/ultras-postmatch-service";

export function CurvaPostMatchExperience({
  postmatch,
  clubName,
}: {
  postmatch: PostMatchExperience;
  clubName: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(postmatch.formattedMarkdownCommuniqué);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const isVictory = postmatch.outcome === "VICTORY";
  const isDefeat = postmatch.outcome === "DEFEAT";

  const borderColor = isVictory
    ? "border-emerald-500/50"
    : isDefeat
    ? "border-rose-500/50"
    : "border-amber-500/50";

  const shadowGlow = isVictory
    ? "shadow-[0_15px_45px_rgba(16,185,129,0.15)]"
    : isDefeat
    ? "shadow-[0_15px_45px_rgba(244,63,94,0.15)]"
    : "shadow-[0_15px_45px_rgba(245,158,11,0.15)]";

  return (
    <div
      className={`relative overflow-hidden rounded-3xl border ${borderColor} bg-gradient-to-br from-black via-zinc-950 to-zinc-900 p-6 ${shadowGlow} backdrop-blur-2xl`}
    >
      {/* Background ambient lighting */}
      <div
        className={`absolute -left-20 -top-20 h-72 w-72 rounded-full blur-3xl pointer-events-none ${
          isVictory ? "bg-emerald-500/20" : isDefeat ? "bg-rose-500/20" : "bg-amber-500/20"
        }`}
      />

      {/* ═══ 1. HEADER & OUTCOME BADGE ═══ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5 relative z-10">
        <div>
          <div className="flex items-center gap-2">
            <span
              className={`flex h-2.5 w-2.5 rounded-full ${
                isVictory ? "bg-emerald-400 animate-ping" : isDefeat ? "bg-rose-500 animate-ping" : "bg-amber-400"
              }`}
            />
            <span
              className={`rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${postmatch.theme.badgeColor}`}
            >
              {postmatch.theme.badge}
            </span>
          </div>
          <h3 className="mt-2 text-xl font-black uppercase tracking-tight text-white sm:text-2xl">
            {postmatch.theme.title}
          </h3>
          <p className="text-xs font-semibold text-gray-400 mt-0.5">
            {postmatch.theme.subtitle}
          </p>
        </div>

        <button
          onClick={handleCopy}
          className="self-start sm:self-auto flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3.5 py-2 text-xs font-black text-gray-200 hover:border-pmb-gold hover:text-white transition shadow-md"
        >
          <span>{copied ? "✓ Communiqué Copied" : "📋 Copy Communiqué"}</span>
        </button>
      </div>

      {/* ═══ 2. MATCH RESULT & SCOREBOARD ═══ */}
      <div className="my-6 rounded-2xl border border-white/10 bg-black/60 p-5 backdrop-blur-md relative z-10">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          {/* Home Club */}
          <div className="flex items-center gap-3 w-full sm:w-auto justify-start">
            <UltrasBadge clubName={postmatch.matchSummary.homeClubName} size="md" />
            <div>
              <p className="text-xs font-bold text-gray-400">HOME</p>
              <p className="text-base font-black text-white">{postmatch.matchSummary.homeClubName}</p>
            </div>
          </div>

          {/* Glowing Scoreline */}
          <div className="flex items-center gap-4 px-6 py-2 rounded-2xl bg-zinc-900/90 border border-white/10 shadow-inner">
            <span className="text-3xl sm:text-4xl font-black text-white">
              {postmatch.matchSummary.homeGoals}
            </span>
            <span className="text-sm font-black text-gray-500">-</span>
            <span className="text-3xl sm:text-4xl font-black text-white">
              {postmatch.matchSummary.awayGoals}
            </span>
          </div>

          {/* Away Club */}
          <div className="flex items-center gap-3 w-full sm:w-auto justify-end text-right">
            <div>
              <p className="text-xs font-bold text-gray-400">AWAY</p>
              <p className="text-base font-black text-white">{postmatch.matchSummary.awayClubName}</p>
            </div>
            <UltrasBadge clubName={postmatch.matchSummary.awayClubName} size="md" />
          </div>
        </div>

        {/* Goal Scorers list */}
        {postmatch.matchSummary.scorers.length > 0 && (
          <div className="mt-4 pt-3 border-t border-white/10 flex flex-wrap items-center justify-center gap-3 text-xs font-semibold text-gray-300">
            <span className="text-[10px] font-black uppercase tracking-wider text-pmb-gold">⚽ Scorers:</span>
            {postmatch.matchSummary.scorers.map((s, idx) => (
              <span key={idx} className="rounded-lg bg-zinc-800/80 px-2 py-0.5 border border-white/5">
                {s.player} {s.minute ? `(${s.minute}')` : ""}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ═══ 3. CAPO STATEMENT & COMMUNIQUÉ ═══ */}
      <div
        className={`my-5 rounded-2xl border p-5 relative z-10 ${
          isVictory
            ? "border-emerald-500/30 bg-emerald-950/20"
            : isDefeat
            ? "border-rose-500/30 bg-rose-950/20"
            : "border-amber-500/30 bg-amber-950/20"
        }`}
      >
        <div className="flex items-start gap-3">
          <span className="text-2xl shrink-0">
            {isVictory ? "🎆" : isDefeat ? "🚨" : "⚖️"}
          </span>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-pmb-gold">
              Curva Capo Official Debrief
            </p>
            <p className="mt-1 text-sm font-bold leading-relaxed text-gray-100 whitespace-pre-line">
              "{postmatch.capoStatement}"
            </p>
          </div>
        </div>
      </div>

      {/* ═══ 4. MAN OF THE MATCH & TABLE IMPACT ═══ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-5 relative z-10">
        {/* Man of the match */}
        {postmatch.manOfTheMatch && (
          <div className="rounded-2xl border border-white/10 bg-black/60 p-4 backdrop-blur-md">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-pmb-gold">
                ⭐ Man of the Match
              </span>
              <span className="rounded-full bg-pmb-gold/20 px-2 py-0.5 text-[10px] font-black text-pmb-gold">
                {postmatch.manOfTheMatch.rating} OVR
              </span>
            </div>
            <p className="mt-1 text-sm font-black text-white">{postmatch.manOfTheMatch.name}</p>
            <p className="text-xs text-gray-400 font-semibold mt-0.5">
              "{postmatch.manOfTheMatch.tribute}"
            </p>
          </div>
        )}

        {/* Table Impact */}
        <div className="rounded-2xl border border-white/10 bg-black/60 p-4 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">
              📊 Table Impact
            </span>
            <span className="text-xs font-black text-white">
              {postmatch.tableImpact.tableMovement}
            </span>
          </div>
          <p className="mt-1 text-xs text-gray-300 font-semibold leading-snug">
            {postmatch.tableImpact.verdict}
          </p>
          <div className="mt-2 pt-2 border-t border-white/10 text-[11px] font-bold text-amber-300">
            🎯 Directive: {postmatch.curvaActionCall}
          </div>
        </div>
      </div>
    </div>
  );
}
