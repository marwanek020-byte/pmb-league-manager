"use client";

import React from "react";
import { ClubBadge } from "@/components/ClubBadge";

export type MissionData = {
  id: string;
  category: "MATCHDAY" | "TRANSFER" | "LONG_TERM";
  title: string;
  description: string;
  conditionType: string;
  targetValue: number | null;
  currentProgress: number;
  rewardAmount: string | number;
  penaltyAmount: string | number;
  status: "ACTIVE" | "COMPLETED" | "FAILED" | "CANCELLED";
  startMatchday: number | null;
  endMatchday: number | null;
  completedAt?: string | null;
  failedAt?: string | null;
  match?: {
    id: string;
    matchday: number;
    status: string;
    homeGoals: number | null;
    awayGoals: number | null;
    homeClub: { id: string; name: string; logo: string | null };
    awayClub: { id: string; name: string; logo: string | null };
  } | null;
  opponentMission?: {
    clubName: string;
    clubLogo: string | null;
    title: string;
    description: string;
    status: string;
  } | null;
};

export function MissionCard({ mission }: { mission: MissionData }) {
  const isCompleted = mission.status === "COMPLETED";
  const isFailed = mission.status === "FAILED";
  const isActive = mission.status === "ACTIVE";

  const rewardFormatted = new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(Number(mission.rewardAmount || 0));

  const penaltyFormatted = new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(Number(mission.penaltyAmount || 0));

  // Category display
  const categoryConfig = {
    MATCHDAY: { label: "Matchday Quest", icon: "⚔️", color: "text-amber-400 border-amber-500/30 bg-amber-950/20" },
    TRANSFER: { label: "Mercato Quest", icon: "🔄", color: "text-blue-400 border-blue-500/30 bg-blue-950/20" },
    LONG_TERM: { label: "Campaign Quest", icon: "📈", color: "text-purple-400 border-purple-500/30 bg-purple-950/20" },
  }[mission.category] || { label: "Quest", icon: "🎯", color: "text-gray-400 border-gray-500/30 bg-gray-950/20" };

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border transition-all duration-300 ${
        isCompleted
          ? "border-emerald-500/50 bg-gradient-to-br from-emerald-950/20 via-black to-black shadow-[0_0_20px_rgba(16,185,129,0.15)]"
          : isFailed
          ? "border-red-500/40 bg-gradient-to-br from-red-950/20 via-black to-black shadow-[0_0_20px_rgba(239,68,68,0.15)] opacity-85"
          : "border-pmb-gold/40 bg-gradient-to-br from-[#1a1708] via-black to-black shadow-[0_0_25px_rgba(212,175,55,0.15)] hover:border-pmb-gold"
      }`}
    >
      {/* Top Banner: Category & Status */}
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${categoryConfig.color}`}>
            <span>{categoryConfig.icon}</span>
            <span>{categoryConfig.label}</span>
          </span>
          {mission.startMatchday && (
            <span className="text-[10px] font-bold text-gray-400">
              MD {mission.startMatchday}
              {mission.endMatchday && mission.endMatchday !== mission.startMatchday ? ` – ${mission.endMatchday}` : ""}
            </span>
          )}
        </div>

        <div>
          {isCompleted && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 border border-emerald-500/50 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-emerald-400">
              ✓ WON REWARD
            </span>
          )}
          {isFailed && (
            <span className="inline-flex items-center gap-1 rounded-full bg-red-500/20 border border-red-500/50 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-red-400">
              ✕ FAILED / FINED
            </span>
          )}
          {isActive && (
            <span className="inline-flex items-center gap-1 rounded-full bg-pmb-gold/20 border border-pmb-gold/50 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-pmb-gold animate-pulse">
              ● IN PROGRESS
            </span>
          )}
        </div>
      </div>

      {/* Main Body */}
      <div className="p-5 space-y-4">
        <div>
          <h3 className="text-base font-black uppercase tracking-tight text-white sm:text-lg">
            {mission.title}
          </h3>
          <p className="mt-1 text-xs text-gray-300 leading-relaxed">
            {mission.description}
          </p>
        </div>

        {/* Progress Bar (if targetValue > 1) */}
        {mission.targetValue && mission.targetValue > 1 && (
          <div className="space-y-1.5 pt-1">
            <div className="flex justify-between text-[11px] font-bold">
              <span className="text-gray-400">Campaign Progress</span>
              <span className="text-white">
                {mission.currentProgress} / {mission.targetValue}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-black/60 border border-white/10">
              <div
                className={`h-full transition-all duration-500 ${
                  isCompleted ? "bg-emerald-500" : isFailed ? "bg-red-500" : "bg-pmb-gold"
                }`}
                style={{
                  width: `${Math.min(100, Math.round((mission.currentProgress / (mission.targetValue || 1)) * 100))}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* Stakes Box: Reward vs Penalty */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          {/* Reward Box */}
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-3">
            <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
              <span>💰</span>
              <span>Reward (Win)</span>
            </div>
            <p className="mt-1 text-base font-black text-emerald-400 sm:text-lg">
              +{rewardFormatted}
            </p>
          </div>

          {/* Penalty Box */}
          <div className="rounded-xl border border-red-500/30 bg-red-950/20 p-3">
            <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-red-400">
              <span>⚠️</span>
              <span>Penalty (Loss)</span>
            </div>
            <p className="mt-1 text-base font-black text-red-400 sm:text-lg">
              -{penaltyFormatted}
            </p>
          </div>
        </div>

        {/* Opponent Relative Counter-Mission Banner (The Tension!) */}
        {mission.opponentMission && (
          <div className="rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-950/30 to-black p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">
                Opponent Counter-Quest
              </span>
              <div className="flex items-center gap-1.5">
                <ClubBadge
                  name={mission.opponentMission.clubName}
                  logo={mission.opponentMission.clubLogo}
                  size="sm"
                />
                <span className="text-[11px] font-bold text-white">
                  {mission.opponentMission.clubName}
                </span>
              </div>
            </div>
            <p className="text-xs font-semibold text-gray-300 italic">
              &quot;{mission.opponentMission.title}&quot;
            </p>
            <p className="text-[10px] text-gray-400">
              {mission.opponentMission.description}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

