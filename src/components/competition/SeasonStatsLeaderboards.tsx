"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { ClubBadge } from "@/components/ClubBadge";

type PlayerStat = {
  id: string;
  fullName: string;
  photo: string | null;
  position: string;
  overallRating: number | null;
  clubId: string | null;
  clubName: string;
  clubLogo: string | null;
  goals: number;
  assists: number;
  cleanSheets: number;
  motmCount: number;
  ballonDorPoints: number;
};

type StatsResponse = {
  totalMatchesPlayed: number;
  topScorers: PlayerStat[];
  topAssists: PlayerStat[];
  goldenGlove: PlayerStat[];
  topMotm: PlayerStat[];
  ballonDorRankings: PlayerStat[];
};

type Props = {
  seasonId: string;
};

export function SeasonStatsLeaderboards({ seasonId }: Props) {
  const [data, setData] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<
    "BALLON_DOR" | "SCORERS" | "ASSISTS" | "GLOVE" | "MOTM"
  >("BALLON_DOR");

  useEffect(() => {
    let cancelled = false;
    async function loadStats() {
      setLoading(true);
      try {
        const res = await fetch(`/api/seasons/${seasonId}/stats`);
        const json = await res.json();
        if (!cancelled && res.ok) {
          setData(json);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadStats();
    return () => {
      cancelled = true;
    };
  }, [seasonId]);

  if (loading) {
    return (
      <div className="p-12 text-center text-sm font-bold text-pmb-gold animate-pulse">
        👑 Computing Season Statistics & Ballon d'Or Rankings...
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-8 text-center text-sm text-gray-500 rounded-2xl bg-pmb-dark-surface border border-pmb-border">
        No stats available for this season yet.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Category Pills Header */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {[
          { key: "BALLON_DOR", label: "👑 PMB Ballon d'Or", badge: "AWARDS" },
          { key: "SCORERS", label: "🥇 Golden Boot", badge: `${data.topScorers.length}` },
          { key: "ASSISTS", label: "👟 Top Assists", badge: `${data.topAssists.length}` },
          { key: "GLOVE", label: "🧤 Golden Glove", badge: `${data.goldenGlove.length}` },
          { key: "MOTM", label: "⭐ MVP Leaders", badge: `${data.topMotm.length}` },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveCategory(tab.key as any)}
            className={[
              "flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all",
              activeCategory === tab.key
                ? "bg-pmb-gold text-pmb-black shadow-lg shadow-pmb-gold/20 scale-105"
                : "bg-pmb-dark-surface border border-pmb-border text-gray-400 hover:text-white hover:border-pmb-gold/30",
            ].join(" ")}
          >
            <span>{tab.label}</span>
            <span
              className={[
                "text-[10px] px-1.5 py-0.2 rounded-full",
                activeCategory === tab.key
                  ? "bg-pmb-black/30 text-pmb-black"
                  : "bg-white/5 text-gray-500",
              ].join(" ")}
            >
              {tab.badge}
            </span>
          </button>
        ))}
      </div>

      {/* 👑 TAB 1: BALLON D'OR SHOWCASE */}
      {activeCategory === "BALLON_DOR" && (
        <div className="space-y-6">
          {/* #1 Player Podium Hero */}
          {data.ballonDorRankings.length > 0 && (
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-pmb-dark-surface via-pmb-black to-pmb-dark-surface border-2 border-pmb-gold shadow-2xl shadow-pmb-gold/15 p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="absolute top-0 right-0 w-96 h-96 bg-pmb-gold/10 rounded-full blur-3xl pointer-events-none" />

              {/* Left Details */}
              <div className="flex items-center gap-5 z-10">
                <div className="relative w-24 h-24 sm:w-28 sm:h-28 flex-shrink-0">
                  {data.ballonDorRankings[0].photo ? (
                    <Image
                      src={data.ballonDorRankings[0].photo}
                      alt={data.ballonDorRankings[0].fullName}
                      fill
                      className="object-cover rounded-2xl border-2 border-pmb-gold shadow-xl"
                    />
                  ) : (
                    <div className="w-full h-full rounded-2xl bg-pmb-gold/20 flex items-center justify-center text-3xl font-black text-pmb-gold border-2 border-pmb-gold">
                      {data.ballonDorRankings[0].fullName.charAt(0)}
                    </div>
                  )}
                  <span className="absolute -top-3 -left-3 text-2xl filter drop-shadow-md">
                    👑
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-pmb-gold text-pmb-black tracking-wider">
                      #1 Ballon d'Or Leader
                    </span>
                    <span className="text-xs text-pmb-gold font-bold">
                      OVR {data.ballonDorRankings[0].overallRating || 75}
                    </span>
                  </div>

                  <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                    {data.ballonDorRankings[0].fullName}
                  </h3>

                  <div className="flex items-center gap-2 text-xs text-gray-300">
                    <ClubBadge
                      name={data.ballonDorRankings[0].clubName}
                      logo={data.ballonDorRankings[0].clubLogo}
                      size="xs"
                    />
                    <span className="font-semibold">
                      {data.ballonDorRankings[0].clubName}
                    </span>
                    <span className="text-gray-500">•</span>
                    <span className="text-gray-400">
                      {data.ballonDorRankings[0].position}
                    </span>
                  </div>
                </div>
              </div>

              {/* Right: Key Performance Pillars */}
              <div className="grid grid-cols-4 gap-3 text-center z-10 w-full sm:w-auto bg-pmb-dark/80 p-4 rounded-2xl border border-pmb-gold/30">
                <div>
                  <p className="text-lg sm:text-2xl font-black text-white">
                    {data.ballonDorRankings[0].goals}
                  </p>
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Goals</p>
                </div>
                <div>
                  <p className="text-lg sm:text-2xl font-black text-white">
                    {data.ballonDorRankings[0].assists}
                  </p>
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Assists</p>
                </div>
                <div>
                  <p className="text-lg sm:text-2xl font-black text-pmb-gold">
                    {data.ballonDorRankings[0].motmCount}
                  </p>
                  <p className="text-[10px] font-bold text-gray-400 uppercase">MOTM</p>
                </div>
                <div className="border-l border-pmb-gold/30 pl-2">
                  <p className="text-lg sm:text-2xl font-black text-pmb-gold">
                    {data.ballonDorRankings[0].ballonDorPoints}
                  </p>
                  <p className="text-[10px] font-bold text-pmb-gold uppercase">Points</p>
                </div>
              </div>
            </div>
          )}

          {/* Top 10 Table */}
          <div className="pmb-card overflow-hidden">
            <div className="px-5 py-4 border-b border-pmb-border flex items-center justify-between">
              <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                PMB Ballon d'Or Power Ranking (Top 10)
              </h4>
              <span className="text-xs text-gray-500">
                Formula: Goals × 4 + Assists × 3 + CS × 4 + MOTM × 6
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-pmb-border/60 text-gray-500 font-bold uppercase text-[10px] bg-pmb-dark/40">
                    <th className="py-3 px-4 w-12 text-center">Rank</th>
                    <th className="py-3 px-4">Player</th>
                    <th className="py-3 px-4">Club</th>
                    <th className="py-3 px-3 text-center">Pos</th>
                    <th className="py-3 px-3 text-center">Goals</th>
                    <th className="py-3 px-3 text-center">Assists</th>
                    <th className="py-3 px-3 text-center">MOTM</th>
                    <th className="py-3 px-4 text-right">Points</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-pmb-border/30">
                  {data.ballonDorRankings.map((p, index) => (
                    <tr
                      key={p.id}
                      className={[
                        "hover:bg-white/5 transition",
                        index === 0
                          ? "bg-pmb-gold/10 font-bold"
                          : index < 3
                          ? "bg-pmb-dark-surface/40"
                          : "",
                      ].join(" ")}
                    >
                      <td className="py-3 px-4 text-center font-black">
                        {index === 0 ? (
                          <span className="text-pmb-gold text-base">🥇</span>
                        ) : index === 1 ? (
                          <span className="text-gray-300 text-base">🥈</span>
                        ) : index === 2 ? (
                          <span className="text-amber-600 text-base">🥉</span>
                        ) : (
                          <span className="text-gray-500">#{index + 1}</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="relative w-8 h-8 rounded-full overflow-hidden border border-pmb-border bg-pmb-dark flex-shrink-0">
                            {p.photo ? (
                              <Image
                                src={p.photo}
                                alt={p.fullName}
                                fill
                                className="object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-[10px] text-pmb-gold font-bold">
                                {p.fullName.charAt(0)}
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-white">{p.fullName}</p>
                            <p className="text-[10px] text-gray-500">
                              OVR {p.overallRating || 75}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <ClubBadge name={p.clubName} logo={p.clubLogo} size="xs" />
                          <span className="text-gray-300 truncate max-w-[120px]">
                            {p.clubName}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-gray-400">
                        {p.position}
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-emerald-400">
                        {p.goals}
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-sky-400">
                        {p.assists}
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-pmb-gold">
                        {p.motmCount}
                      </td>
                      <td className="py-3 px-4 text-right font-black text-pmb-gold text-sm">
                        {p.ballonDorPoints}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 🥇 TAB 2: GOLDEN BOOT (TOP SCORERS) */}
      {activeCategory === "SCORERS" && (
        <div className="pmb-card overflow-hidden">
          <div className="px-5 py-4 border-b border-pmb-border flex items-center justify-between">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <span>🥇</span> Golden Boot — Top Goalscorers
            </h4>
            <span className="text-xs text-gray-500">
              {data.topScorers.length} players with goals
            </span>
          </div>

          {data.topScorers.length === 0 ? (
            <div className="p-8 text-center text-xs text-gray-500">
              No goals recorded in this season yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-pmb-border/60 text-gray-500 font-bold uppercase text-[10px] bg-pmb-dark/40">
                    <th className="py-3 px-4 w-12 text-center">Rank</th>
                    <th className="py-3 px-4">Player</th>
                    <th className="py-3 px-4">Club</th>
                    <th className="py-3 px-3 text-center">Position</th>
                    <th className="py-3 px-4 text-right">Goals</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-pmb-border/30">
                  {data.topScorers.map((p, index) => (
                    <tr
                      key={p.id}
                      className="hover:bg-white/5 transition"
                    >
                      <td className="py-3 px-4 text-center font-black">
                        {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `#${index + 1}`}
                      </td>
                      <td className="py-3 px-4 font-bold text-white flex items-center gap-2">
                        {p.fullName}
                      </td>
                      <td className="py-3 px-4 text-gray-300">
                        <div className="flex items-center gap-1.5">
                          <ClubBadge name={p.clubName} logo={p.clubLogo} size="xs" />
                          <span>{p.clubName}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center text-gray-400 font-bold">
                        {p.position}
                      </td>
                      <td className="py-3 px-4 text-right font-black text-emerald-400 text-base">
                        ⚽ {p.goals}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 👟 TAB 3: TOP ASSISTS */}
      {activeCategory === "ASSISTS" && (
        <div className="pmb-card overflow-hidden">
          <div className="px-5 py-4 border-b border-pmb-border flex items-center justify-between">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <span>👟</span> Playmaker Ranking — Top Assists
            </h4>
            <span className="text-xs text-gray-500">
              {data.topAssists.length} players with assists
            </span>
          </div>

          {data.topAssists.length === 0 ? (
            <div className="p-8 text-center text-xs text-gray-500">
              No assists recorded in this season yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-pmb-border/60 text-gray-500 font-bold uppercase text-[10px] bg-pmb-dark/40">
                    <th className="py-3 px-4 w-12 text-center">Rank</th>
                    <th className="py-3 px-4">Player</th>
                    <th className="py-3 px-4">Club</th>
                    <th className="py-3 px-3 text-center">Position</th>
                    <th className="py-3 px-4 text-right">Assists</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-pmb-border/30">
                  {data.topAssists.map((p, index) => (
                    <tr key={p.id} className="hover:bg-white/5 transition">
                      <td className="py-3 px-4 text-center font-black">
                        {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `#${index + 1}`}
                      </td>
                      <td className="py-3 px-4 font-bold text-white">
                        {p.fullName}
                      </td>
                      <td className="py-3 px-4 text-gray-300">
                        <div className="flex items-center gap-1.5">
                          <ClubBadge name={p.clubName} logo={p.clubLogo} size="xs" />
                          <span>{p.clubName}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center text-gray-400 font-bold">
                        {p.position}
                      </td>
                      <td className="py-3 px-4 text-right font-black text-sky-400 text-base">
                        👟 {p.assists}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 🧤 TAB 4: GOLDEN GLOVE (CLEAN SHEETS) */}
      {activeCategory === "GLOVE" && (
        <div className="pmb-card overflow-hidden">
          <div className="px-5 py-4 border-b border-pmb-border flex items-center justify-between">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <span>🧤</span> Golden Glove — Clean Sheet Leaders
            </h4>
          </div>

          {data.goldenGlove.length === 0 ? (
            <div className="p-8 text-center text-xs text-gray-500">
              No clean sheets recorded yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-pmb-border/60 text-gray-500 font-bold uppercase text-[10px] bg-pmb-dark/40">
                    <th className="py-3 px-4 w-12 text-center">Rank</th>
                    <th className="py-3 px-4">Goalkeeper</th>
                    <th className="py-3 px-4">Club</th>
                    <th className="py-3 px-4 text-right">Clean Sheets</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-pmb-border/30">
                  {data.goldenGlove.map((p, index) => (
                    <tr key={p.id} className="hover:bg-white/5 transition">
                      <td className="py-3 px-4 text-center font-black">
                        {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `#${index + 1}`}
                      </td>
                      <td className="py-3 px-4 font-bold text-white">
                        {p.fullName}
                      </td>
                      <td className="py-3 px-4 text-gray-300">
                        <div className="flex items-center gap-1.5">
                          <ClubBadge name={p.clubName} logo={p.clubLogo} size="xs" />
                          <span>{p.clubName}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-black text-yellow-400 text-base">
                        🧤 {p.cleanSheets}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ⭐ TAB 5: MVP (MOTM) LEADERS */}
      {activeCategory === "MOTM" && (
        <div className="pmb-card overflow-hidden">
          <div className="px-5 py-4 border-b border-pmb-border flex items-center justify-between">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <span>⭐</span> Match MVP Leaders — Most Man of the Match Awards
            </h4>
          </div>

          {data.topMotm.length === 0 ? (
            <div className="p-8 text-center text-xs text-gray-500">
              No MOTM awards recorded yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-pmb-border/60 text-gray-500 font-bold uppercase text-[10px] bg-pmb-dark/40">
                    <th className="py-3 px-4 w-12 text-center">Rank</th>
                    <th className="py-3 px-4">Player</th>
                    <th className="py-3 px-4">Club</th>
                    <th className="py-3 px-3 text-center">Position</th>
                    <th className="py-3 px-4 text-right">MOTM Awards</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-pmb-border/30">
                  {data.topMotm.map((p, index) => (
                    <tr key={p.id} className="hover:bg-white/5 transition">
                      <td className="py-3 px-4 text-center font-black">
                        {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `#${index + 1}`}
                      </td>
                      <td className="py-3 px-4 font-bold text-white">
                        {p.fullName}
                      </td>
                      <td className="py-3 px-4 text-gray-300">
                        <div className="flex items-center gap-1.5">
                          <ClubBadge name={p.clubName} logo={p.clubLogo} size="xs" />
                          <span>{p.clubName}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center text-gray-400 font-bold">
                        {p.position}
                      </td>
                      <td className="py-3 px-4 text-right font-black text-pmb-gold text-base">
                        ⭐ {p.motmCount}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
