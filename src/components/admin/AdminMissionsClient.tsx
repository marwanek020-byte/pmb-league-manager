"use client";

import React, { useState } from "react";
import { ClubBadge } from "@/components/ClubBadge";
import { useRouter } from "next/navigation";

type LeagueData = {
  id: string;
  name: string;
  clubs: { id: string; name: string; logo: string | null }[];
  seasons: { id: string; name: string; status: string }[];
};

type MissionItem = {
  id: string;
  clubId: string;
  clubName: string;
  clubLogo: string | null;
  leagueId: string | null;
  leagueName: string | null;
  category: "MATCHDAY" | "TRANSFER" | "LONG_TERM";
  title: string;
  description: string;
  conditionType: string;
  targetValue: number | null;
  currentProgress: number;
  rewardAmount: number;
  penaltyAmount: number;
  status: "ACTIVE" | "COMPLETED" | "FAILED" | "CANCELLED";
  startMatchday: number | null;
  endMatchday: number | null;
  createdAt: string;
  completedAt: string | null;
  failedAt: string | null;
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
  } | null;
};

export function AdminMissionsClient({
  leagues,
  initialMissions,
}: {
  leagues: LeagueData[];
  initialMissions: MissionItem[];
}) {
  const router = useRouter();
  const [missions, setMissions] = useState<MissionItem[]>(initialMissions);
  const [selectedLeague, setSelectedLeague] = useState<string>("ALL");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");

  // Generator form state
  const [genLeagueId, setGenLeagueId] = useState<string>(leagues[0]?.id || "");
  const [genSeasonId, setGenSeasonId] = useState<string>(
    leagues[0]?.seasons[0]?.id || ""
  );
  const [genMatchday, setGenMatchday] = useState<number>(1);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ message: string; isError?: boolean } | null>(null);

  // Update season list when generator league changes
  const activeGenLeague = leagues.find((l) => l.id === genLeagueId);

  const filteredMissions = missions.filter((m) => {
    if (selectedLeague !== "ALL" && m.leagueId !== selectedLeague) return false;
    if (selectedCategory !== "ALL" && m.category !== selectedCategory) return false;
    if (selectedStatus !== "ALL" && m.status !== selectedStatus) return false;
    return true;
  });

  // Calculate totals
  const totalAwarded = missions
    .filter((m) => m.status === "COMPLETED")
    .reduce((sum, m) => sum + m.rewardAmount, 0);

  const totalFined = missions
    .filter((m) => m.status === "FAILED")
    .reduce((sum, m) => sum + m.penaltyAmount, 0);

  const formatEUR = (val: number) =>
    new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(val);

  // Handlers
  async function handleGenerateMatchday() {
    if (!genSeasonId || !genMatchday) {
      setFeedback({ message: "Please select a season and matchday.", isError: true });
      return;
    }

    setIsGenerating(true);
    setFeedback(null);

    try {
      const res = await fetch("/api/admin/missions/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          seasonId: genSeasonId,
          matchday: genMatchday,
          leagueId: genLeagueId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to generate matchday missions");
      }

      setFeedback({ message: data.message || "Matchday missions generated successfully!" });
      router.refresh();
    } catch (err: any) {
      setFeedback({ message: err.message, isError: true });
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleGenerateLongTerm() {
    if (!genSeasonId || !genLeagueId) {
      setFeedback({ message: "Please select a league and season.", isError: true });
      return;
    }

    setIsGenerating(true);
    setFeedback(null);

    try {
      const res = await fetch("/api/admin/missions/long-term/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          seasonId: genSeasonId,
          leagueId: genLeagueId,
          startMatchday: genMatchday,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to generate long-term missions");
      }

      setFeedback({ message: data.message || "Long-term missions generated successfully!" });
      router.refresh();
    } catch (err: any) {
      setFeedback({ message: err.message, isError: true });
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleGenerateTransfer() {
    setIsGenerating(true);
    setFeedback(null);

    try {
      const res = await fetch("/api/admin/missions/transfer/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leagueId: genLeagueId !== "ALL" ? genLeagueId : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to generate transfer missions");
      }

      setFeedback({ message: data.message || "Transfer window missions generated successfully!" });
      router.refresh();
    } catch (err: any) {
      setFeedback({ message: err.message, isError: true });
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Financial Overview Metrics */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="pmb-card rounded-2xl border border-white/10 p-4">
          <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">
            Active Quests
          </span>
          <p className="mt-1 text-2xl font-black text-pmb-gold">
            {missions.filter((m) => m.status === "ACTIVE").length}
          </p>
        </div>

        <div className="pmb-card rounded-2xl border border-emerald-500/30 p-4">
          <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">
            Rewards Paid Out
          </span>
          <p className="mt-1 text-2xl font-black text-emerald-400">
            +{formatEUR(totalAwarded)}
          </p>
        </div>

        <div className="pmb-card rounded-2xl border border-red-500/30 p-4">
          <span className="text-[10px] font-black uppercase tracking-wider text-red-400">
            Penalties Fined
          </span>
          <p className="mt-1 text-2xl font-black text-red-400">
            -{formatEUR(totalFined)}
          </p>
        </div>

        <div className="pmb-card rounded-2xl border border-white/10 p-4">
          <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">
            Total Missions
          </span>
          <p className="mt-1 text-2xl font-black text-white">
            {missions.length}
          </p>
        </div>
      </div>

      {/* Auto-Generation Panel */}
      <div className="pmb-card rounded-2xl border border-pmb-gold/40 bg-gradient-to-br from-[#1a1708] via-black to-black p-6 space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-xl">⚡</span>
          <h2 className="text-base font-black uppercase tracking-tight text-white sm:text-lg">
            Mission Dispatch Engine
          </h2>
        </div>

        <p className="text-xs text-gray-300">
          Auto-generate complementary, opposing missions for every fixture in a matchday, or launch campaign and transfer quests.
        </p>

        {/* Feedback alert */}
        {feedback && (
          <div
            className={`rounded-xl border p-3 text-xs font-bold ${
              feedback.isError
                ? "border-red-500/50 bg-red-950/40 text-red-400"
                : "border-emerald-500/50 bg-emerald-950/40 text-emerald-400"
            }`}
          >
            {feedback.message}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {/* League Selector */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400">
              League
            </label>
            <select
              value={genLeagueId}
              onChange={(e) => {
                setGenLeagueId(e.target.value);
                const l = leagues.find((leg) => leg.id === e.target.value);
                if (l?.seasons[0]) {
                  setGenSeasonId(l.seasons[0].id);
                }
              }}
              className="mt-1 w-full rounded-xl border border-white/15 bg-black px-3 py-2 text-xs font-bold text-white focus:border-pmb-gold focus:outline-none"
            >
              {leagues.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>

          {/* Season Selector */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400">
              Season
            </label>
            <select
              value={genSeasonId}
              onChange={(e) => setGenSeasonId(e.target.value)}
              className="mt-1 w-full rounded-xl border border-white/15 bg-black px-3 py-2 text-xs font-bold text-white focus:border-pmb-gold focus:outline-none"
            >
              {activeGenLeague?.seasons.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.status})
                </option>
              ))}
            </select>
          </div>

          {/* Matchday Input */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400">
              Matchday #
            </label>
            <input
              type="number"
              min={1}
              max={38}
              value={genMatchday}
              onChange={(e) => setGenMatchday(parseInt(e.target.value, 10) || 1)}
              className="mt-1 w-full rounded-xl border border-white/15 bg-black px-3 py-2 text-xs font-bold text-white focus:border-pmb-gold focus:outline-none"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            onClick={handleGenerateMatchday}
            disabled={isGenerating}
            className="flex items-center gap-2 rounded-xl bg-pmb-gold px-4 py-2.5 text-xs font-black uppercase tracking-wider text-black transition hover:bg-yellow-400 disabled:opacity-50"
          >
            <span>⚔️</span>
            <span>{isGenerating ? "Generating..." : "Generate Relative Matchday Missions"}</span>
          </button>

          <button
            onClick={handleGenerateLongTerm}
            disabled={isGenerating}
            className="flex items-center gap-2 rounded-xl border border-purple-500/40 bg-purple-950/30 px-4 py-2.5 text-xs font-black uppercase tracking-wider text-purple-300 transition hover:border-purple-400 disabled:opacity-50"
          >
            <span>📈</span>
            <span>Generate Campaign Missions</span>
          </button>

          <button
            onClick={handleGenerateTransfer}
            disabled={isGenerating}
            className="flex items-center gap-2 rounded-xl border border-blue-500/40 bg-blue-950/30 px-4 py-2.5 text-xs font-black uppercase tracking-wider text-blue-300 transition hover:border-blue-400 disabled:opacity-50"
          >
            <span>🔄</span>
            <span>Generate Mercato Missions</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div className="flex flex-wrap items-center gap-2">
          {/* League Filter */}
          <select
            value={selectedLeague}
            onChange={(e) => setSelectedLeague(e.target.value)}
            className="rounded-lg border border-white/15 bg-black px-3 py-1.5 text-xs font-bold text-white"
          >
            <option value="ALL">All Leagues</option>
            {leagues.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="rounded-lg border border-white/15 bg-black px-3 py-1.5 text-xs font-bold text-white"
          >
            <option value="ALL">All Categories</option>
            <option value="MATCHDAY">Matchday Quests</option>
            <option value="LONG_TERM">Campaign Quests</option>
            <option value="TRANSFER">Mercato Quests</option>
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="rounded-lg border border-white/15 bg-black px-3 py-1.5 text-xs font-bold text-white"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="COMPLETED">Completed</option>
            <option value="FAILED">Failed</option>
          </select>
        </div>

        <span className="text-xs font-bold text-gray-400">
          Showing {filteredMissions.length} of {missions.length} missions
        </span>
      </div>

      {/* Missions Grid */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {filteredMissions.map((m) => (
          <div
            key={m.id}
            className={`rounded-2xl border p-5 transition-all ${
              m.status === "COMPLETED"
                ? "border-emerald-500/40 bg-emerald-950/20"
                : m.status === "FAILED"
                ? "border-red-500/40 bg-red-950/20"
                : "border-white/15 bg-pmb-card"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ClubBadge name={m.clubName} logo={m.clubLogo} size="sm" />
                <span className="text-sm font-black text-white">{m.clubName}</span>
                {m.leagueName && (
                  <span className="text-[10px] font-semibold text-gray-400">
                    ({m.leagueName})
                  </span>
                )}
              </div>

              <div>
                {m.status === "COMPLETED" && (
                  <span className="rounded-full bg-emerald-500/20 border border-emerald-500/50 px-2 py-0.5 text-[9px] font-black uppercase text-emerald-400">
                    Won +{formatEUR(m.rewardAmount)}
                  </span>
                )}
                {m.status === "FAILED" && (
                  <span className="rounded-full bg-red-500/20 border border-red-500/50 px-2 py-0.5 text-[9px] font-black uppercase text-red-400">
                    Fined -{formatEUR(m.penaltyAmount)}
                  </span>
                )}
                {m.status === "ACTIVE" && (
                  <span className="rounded-full bg-pmb-gold/20 border border-pmb-gold/50 px-2 py-0.5 text-[9px] font-black uppercase text-pmb-gold">
                    Active
                  </span>
                )}
              </div>
            </div>

            <div className="mt-3 space-y-1">
              <p className="text-sm font-bold text-white">{m.title}</p>
              <p className="text-xs text-gray-300">{m.description}</p>
            </div>

            <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-3 text-[11px] font-bold">
              <span className="text-emerald-400">Reward: +{formatEUR(m.rewardAmount)}</span>
              <span className="text-red-400">Fine: -{formatEUR(m.penaltyAmount)}</span>
              {m.startMatchday && (
                <span className="text-gray-400">MD {m.startMatchday}</span>
              )}
            </div>

            {/* Paired opponent preview if available */}
            {m.opponentMission && (
              <div className="mt-3 rounded-lg border border-amber-500/20 bg-amber-950/20 px-3 py-2 text-[10px]">
                <span className="font-bold text-amber-400">Opponent Counter: </span>
                <span className="text-gray-300">
                  {m.opponentMission.clubName} — &quot;{m.opponentMission.title}&quot;
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

