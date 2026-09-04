"use client";

import { useState, useEffect } from "react";
import { ClubBadge } from "@/components/ClubBadge";
import { TotwPitch } from "@/components/competition/TotwPitch";
import { SeasonStatsLeaderboards } from "@/components/competition/SeasonStatsLeaderboards";
import { ThroneCupBracket } from "@/components/competition/ThroneCupBracket";

type Club = {
  id: string;
  name: string;
  logo: string | null;
};

type Match = {
  id: string;
  matchday: number;
  homeClub: Club;
  awayClub: Club;
  homeGoals: number | null;
  awayGoals: number | null;
  status: "UPCOMING" | "COMPLETED";
};

type StandingRow = {
  position: number;
  clubId: string;
  clubName: string;
  clubLogo: string | null;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  form: ("W" | "D" | "L")[];
};

interface AppCompetitionData {
  hasActiveSeason: boolean;
  seasonId?: string;
  myClub: Club;
  leagueName: string;
  seasonName: string;
  totalMatchdays: number;
  standings: StandingRow[];
  allMatches: Match[];
}

interface AppCompetitionHubProps {
  onBack: () => void;
}

const TABS = [
  "MATCHDAY",
  "TABLE",
  "FIXTURES",
  "STATS & AWARDS",
  "TOTW",
  "THRONE CUP 👑",
  "MY CLUB",
] as const;

type Tab = (typeof TABS)[number];

const formColor = (r: "W" | "D" | "L") =>
  ({ W: "bg-emerald-500 text-black", D: "bg-gray-600 text-white", L: "bg-red-500 text-white" }[r]);

export function AppCompetitionHub({ onBack }: AppCompetitionHubProps) {
  const [data, setData] = useState<AppCompetitionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("MATCHDAY");
  const [selectedMatchday, setSelectedMatchday] = useState<number>(1);

  useEffect(() => {
    fetch("/api/app/competition")
      .then((res) => res.json())
      .then((json) => {
        setData(json);
        if (json.allMatches && json.allMatches.length > 0) {
          const upcoming = json.allMatches.filter((m: Match) => m.status === "UPCOMING");
          if (upcoming.length > 0) {
            setSelectedMatchday(upcoming[0].matchday);
          } else {
            const maxMD = Math.max(...json.allMatches.map((m: Match) => m.matchday));
            setSelectedMatchday(maxMD);
          }
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load app competition data:", err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#070709] text-white">
        <div className="h-12 w-12 rounded-full border-2 border-[#e9c349]/30 border-t-[#e9c349] animate-spin" />
        <p className="mt-4 font-montserrat text-xs font-black uppercase tracking-widest text-[#e9c349]">
          LOADING COMPETITION...
        </p>
      </div>
    );
  }

  if (!data || !data.hasActiveSeason) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col justify-between bg-[#070709] text-white p-6 font-montserrat">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-2 rounded-full border border-[#e9c349]/50 bg-black/80 px-4 py-2 text-xs font-black tracking-wider text-[#e9c349] hover:scale-105 transition-all"
          >
            ‹ BACK TO DASHBOARD
          </button>
        </div>
        <div className="my-auto text-center">
          <span className="text-5xl">⚽</span>
          <h2 className="mt-4 text-xl font-black uppercase tracking-wider text-white">
            No Active Competition
          </h2>
          <p className="mt-2 text-xs text-gray-400 max-w-sm mx-auto">
            The competition season has not started yet. Fixtures will appear here as soon as the season begins.
          </p>
        </div>
        <div />
      </div>
    );
  }

  const {
    myClub,
    leagueName,
    seasonName,
    totalMatchdays,
    standings,
    allMatches,
    seasonId,
  } = data;

  const myStanding = standings.find((r) => r.clubId === myClub.id);
  const myNextMatch = allMatches.find(
    (m) =>
      m.status === "UPCOMING" &&
      (m.homeClub.id === myClub.id || m.awayClub.id === myClub.id)
  );
  const myLastMatch = [...allMatches]
    .filter(
      (m) =>
        m.status === "COMPLETED" &&
        (m.homeClub.id === myClub.id || m.awayClub.id === myClub.id)
    )
    .sort((a, b) => b.matchday - a.matchday)[0];

  const headlineMatch = myNextMatch ?? myLastMatch ?? allMatches[0];

  const matchdayMatches = allMatches.filter((m) => m.matchday === selectedMatchday);
  const completedMatchdays = [
    ...new Set(
      allMatches.filter((m) => m.status === "COMPLETED").map((m) => m.matchday)
    ),
  ].sort((a, b) => a - b);
  const lastCompletedMatchday = completedMatchdays[completedMatchdays.length - 1] ?? 0;

  const myMatches = allMatches
    .filter((m) => m.homeClub.id === myClub.id || m.awayClub.id === myClub.id)
    .sort((a, b) => a.matchday - b.matchday);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-between overflow-y-auto overflow-x-hidden bg-[#070709] text-white font-montserrat select-none"
      style={{
        backgroundImage: `
          radial-gradient(circle at 15% 15%, rgba(233,195,73,0.12) 0%, transparent 45%),
          radial-gradient(circle at 85% 85%, rgba(233,195,73,0.12) 0%, transparent 45%),
          radial-gradient(circle at 50% 50%, rgba(14,14,18,0.95) 0%, #060608 100%)
        `,
      }}
    >
      {/* Ambient background light beams */}
      <div className="absolute top-0 left-0 w-72 h-72 bg-gradient-to-br from-[#e9c349]/20 via-transparent to-transparent pointer-events-none blur-3xl" />
      <div className="absolute bottom-0 right-0 w-72 h-72 bg-gradient-to-tl from-[#e9c349]/20 via-transparent to-transparent pointer-events-none blur-3xl" />

      {/* ─── TOP APP HEADER (Back + League info) ─── */}
      <header className="relative z-20 w-full flex flex-wrap items-center justify-between gap-4 px-6 sm:px-10 pt-5 pb-3 border-b border-white/10 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="group flex items-center gap-2 rounded-full border border-[#e9c349]/70 bg-black/80 px-4 py-2 text-xs font-black uppercase tracking-wider text-[#e9c349] shadow-[0_0_15px_rgba(233,195,73,0.3)] transition-all hover:scale-105 active:scale-95 cursor-pointer"
          >
            <span>‹</span>
            <span>DASHBOARD</span>
          </button>

          <div className="flex items-center gap-2">
            {myClub.logo && (
              <div className="w-8 h-8 rounded-full border border-[#e9c349]/50 bg-black/80 p-0.5 overflow-hidden flex items-center justify-center">
                <img src={myClub.logo} alt={myClub.name} className="w-full h-full object-contain" />
              </div>
            )}
            <div>
              <h1 className="text-sm sm:text-base font-black uppercase tracking-wider text-white">
                {leagueName}
              </h1>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#e9c349]">
                {seasonName}
              </p>
            </div>
          </div>
        </div>

        {/* Club Standing Pill */}
        {myStanding && (
          <div className="flex items-center gap-2 rounded-full border border-[#e9c349]/50 bg-black/70 px-4 py-1.5 shadow-sm">
            <span className="text-xs">🏆</span>
            <span className="text-xs font-black uppercase tracking-wider text-white">
              {myStanding.position === 1
                ? "1ST PLACE"
                : `${myStanding.position}TH PLACE`}
            </span>
            <span className="text-gray-500">•</span>
            <span className="text-xs font-black text-[#e9c349]">
              {myStanding.points} PTS
            </span>
          </div>
        )}
      </header>

      {/* ─── APP SEGMENTED HORIZONTAL NAVIGATION TABS ─── */}
      <div className="relative z-20 w-full max-w-7xl mx-auto px-6 sm:px-10 pt-4 pb-2">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`rounded-full px-5 py-2 text-xs font-black uppercase tracking-widest transition-all shrink-0 cursor-pointer ${
                activeTab === tab
                  ? "bg-gradient-to-r from-[#f5d475] to-[#d4af37] text-black shadow-[0_0_15px_rgba(233,195,73,0.4)]"
                  : "bg-black/60 border border-white/15 text-gray-400 hover:text-white hover:border-[#e9c349]/50"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* ─── MAIN TAB CONTENT ─── */}
      <main className="relative z-10 w-full max-w-7xl mx-auto px-6 sm:px-10 py-4 flex-1">
        
        {/* ════ TAB 1: MATCHDAY ════ */}
        {activeTab === "MATCHDAY" && (
          <div className="space-y-6">
            {/* Headline Clash Card */}
            {headlineMatch && (
              <div
                className="relative rounded-3xl border border-[#e9c349]/40 bg-gradient-to-b from-[#141419]/95 to-[#0a0a0d]/95 p-6 sm:p-8 shadow-[0_15px_45px_rgba(0,0,0,0.8),0_0_30px_rgba(233,195,73,0.12)] backdrop-blur-xl overflow-hidden"
                style={{
                  backgroundImage: `radial-gradient(circle at 50% 15%, rgba(233,195,73,0.2) 0%, transparent 60%)`,
                }}
              >
                <div className="text-center mb-6">
                  <span className="inline-flex items-center gap-2 rounded-full border border-[#e9c349]/30 bg-black/60 px-4 py-1">
                    <span className="h-2 w-2 rounded-full bg-[#e9c349] animate-ping" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#e9c349]">
                      MATCHDAY {headlineMatch.matchday}
                    </span>
                  </span>
                  <h2 className="mt-2 text-lg sm:text-2xl font-black uppercase tracking-wider text-white">
                    {headlineMatch.status === "COMPLETED" ? "OFFICIAL MATCH RESULT" : "UPCOMING FIXTURE"}
                  </h2>
                </div>

                {/* Matchup presentation */}
                <div className="flex items-center justify-between gap-4 py-4 max-w-2xl mx-auto">
                  {/* Home Club */}
                  <div className="flex flex-1 flex-col items-center text-center">
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border-2 border-[#e9c349] bg-black/90 p-2 shadow-[0_0_25px_rgba(233,195,73,0.3)] flex items-center justify-center overflow-hidden">
                      {headlineMatch.homeClub.logo ? (
                        <img src={headlineMatch.homeClub.logo} alt={headlineMatch.homeClub.name} className="w-full h-full object-contain" />
                      ) : (
                        <span className="font-black text-xl text-[#e9c349]">{headlineMatch.homeClub.name.slice(0, 3).toUpperCase()}</span>
                      )}
                    </div>
                    <span className="font-black text-xs sm:text-sm uppercase tracking-wider text-white mt-2 truncate max-w-[130px]">
                      {headlineMatch.homeClub.name}
                    </span>
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Home</span>
                  </div>

                  {/* VS / Score */}
                  <div className="flex flex-col items-center">
                    {headlineMatch.status === "COMPLETED" ? (
                      <div className="rounded-2xl border border-[#e9c349]/60 bg-black/80 px-6 py-2 shadow-[0_0_25px_rgba(233,195,73,0.3)]">
                        <span className="font-montserrat text-3xl sm:text-4xl font-black text-white tracking-wider">
                          {headlineMatch.homeGoals} - {headlineMatch.awayGoals}
                        </span>
                        <span className="block text-center text-[9px] font-black uppercase tracking-widest text-emerald-400 mt-1">
                          Full Time
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center">
                        <span className="font-montserrat text-3xl sm:text-4xl font-black italic text-[#e9c349] drop-shadow-[0_0_15px_rgba(233,195,73,0.8)]">
                          VS
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mt-1">Upcoming</span>
                      </div>
                    )}
                  </div>

                  {/* Away Club */}
                  <div className="flex flex-1 flex-col items-center text-center">
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border-2 border-white/30 bg-black/90 p-2 shadow-xl flex items-center justify-center overflow-hidden">
                      {headlineMatch.awayClub.logo ? (
                        <img src={headlineMatch.awayClub.logo} alt={headlineMatch.awayClub.name} className="w-full h-full object-contain" />
                      ) : (
                        <span className="font-black text-xl text-white">{headlineMatch.awayClub.name.slice(0, 3).toUpperCase()}</span>
                      )}
                    </div>
                    <span className="font-black text-xs sm:text-sm uppercase tracking-wider text-white mt-2 truncate max-w-[130px]">
                      {headlineMatch.awayClub.name}
                    </span>
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Away</span>
                  </div>
                </div>
              </div>
            )}

            {/* Matchday Timeline Selector */}
            <div className="rounded-2xl border border-white/10 bg-black/60 p-4 backdrop-blur-md">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-black uppercase tracking-wider text-[#e9c349]">
                  Matchday Selector
                </span>
                <span className="text-[10px] font-bold text-gray-400">
                  Total Matchdays: {totalMatchdays}
                </span>
              </div>
              <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
                {Array.from({ length: totalMatchdays }, (_, i) => i + 1).map((day) => {
                  const isCompleted = day <= lastCompletedMatchday;
                  const isSelected = day === selectedMatchday;

                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => setSelectedMatchday(day)}
                      className={`h-9 min-w-[36px] px-3 rounded-full text-xs font-black transition-all flex items-center justify-center shrink-0 cursor-pointer ${
                        isSelected
                          ? "bg-[#e9c349] text-black shadow-[0_0_12px_#e9c349] scale-105"
                          : isCompleted
                          ? "bg-[#e9c349]/20 border border-[#e9c349]/40 text-[#e9c349]"
                          : "border border-white/20 text-gray-400 hover:text-white"
                      }`}
                    >
                      MD {day}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Matches for Selected Matchday */}
            <div className="space-y-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-gray-400">
                Matches in Matchday {selectedMatchday}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {matchdayMatches.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/70 p-4 backdrop-blur-md hover:border-[#e9c349]/50 transition-all"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-8 h-8 rounded-full border border-white/20 bg-black/80 p-1 flex items-center justify-center shrink-0 overflow-hidden">
                        {m.homeClub.logo ? (
                          <img src={m.homeClub.logo} alt={m.homeClub.name} className="w-full h-full object-contain" />
                        ) : (
                          <span className="text-[10px] font-black">{m.homeClub.name.slice(0, 2)}</span>
                        )}
                      </div>
                      <span className="text-xs font-black uppercase truncate text-white">
                        {m.homeClub.name}
                      </span>
                    </div>

                    <div className="px-4 text-center shrink-0">
                      {m.status === "COMPLETED" ? (
                        <span className="text-sm font-black text-[#e9c349] px-2 py-0.5 rounded bg-black/60 border border-[#e9c349]/40">
                          {m.homeGoals} - {m.awayGoals}
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                          VS
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 flex-1 justify-end min-w-0">
                      <span className="text-xs font-black uppercase truncate text-white text-right">
                        {m.awayClub.name}
                      </span>
                      <div className="w-8 h-8 rounded-full border border-white/20 bg-black/80 p-1 flex items-center justify-center shrink-0 overflow-hidden">
                        {m.awayClub.logo ? (
                          <img src={m.awayClub.logo} alt={m.awayClub.name} className="w-full h-full object-contain" />
                        ) : (
                          <span className="text-[10px] font-black">{m.awayClub.name.slice(0, 2)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ════ TAB 2: TABLE (Standings) ════ */}
        {activeTab === "TABLE" && (
          <div className="rounded-3xl border border-white/15 bg-gradient-to-b from-[#141419]/90 to-[#0a0a0d]/95 shadow-2xl backdrop-blur-xl overflow-hidden">
            <div className="p-5 border-b border-white/10 flex items-center justify-between">
              <div>
                <h2 className="text-base sm:text-lg font-black uppercase tracking-wider text-white">
                  League Standings
                </h2>
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                  {leagueName} · Live Table
                </p>
              </div>
              <span className="text-xs font-black text-[#e9c349] bg-black/60 px-3 py-1 rounded-full border border-[#e9c349]/40">
                {standings.length} CLUBS
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-white/10 bg-black/50 text-[10px] font-black uppercase tracking-wider text-gray-400">
                    <th className="py-3 px-4 text-center w-12">POS</th>
                    <th className="py-3 px-4">CLUB</th>
                    <th className="py-3 px-3 text-center">MP</th>
                    <th className="py-3 px-3 text-center">W</th>
                    <th className="py-3 px-3 text-center">D</th>
                    <th className="py-3 px-3 text-center">L</th>
                    <th className="py-3 px-3 text-center hidden sm:table-cell">GD</th>
                    <th className="py-3 px-4 text-center font-black text-[#e9c349]">PTS</th>
                    <th className="py-3 px-4 text-center hidden md:table-cell">FORM</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {standings.map((row) => {
                    const isMyClub = row.clubId === myClub.id;

                    return (
                      <tr
                        key={row.clubId}
                        className={`transition-colors ${
                          isMyClub
                            ? "bg-[#e9c349]/15 font-black text-white border-l-4 border-l-[#e9c349]"
                            : "hover:bg-white/5 text-gray-300"
                        }`}
                      >
                        {/* Position */}
                        <td className="py-3.5 px-4 text-center font-black">
                          <span
                            className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs ${
                              row.position === 1
                                ? "bg-[#e9c349] text-black font-black shadow-md"
                                : row.position <= 3
                                ? "bg-white/20 text-white font-bold"
                                : "text-gray-400"
                            }`}
                          >
                            {row.position}
                          </span>
                        </td>

                        {/* Club */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-7 h-7 rounded-full border border-white/20 bg-black/80 p-0.5 overflow-hidden flex items-center justify-center shrink-0">
                              {row.clubLogo ? (
                                <img src={row.clubLogo} alt={row.clubName} className="w-full h-full object-contain" />
                              ) : (
                                <span className="text-[9px] font-black text-[#e9c349]">{row.clubName.slice(0, 2)}</span>
                              )}
                            </div>
                            <span className="font-black uppercase tracking-wider truncate max-w-[140px] sm:max-w-none text-white">
                              {row.clubName}
                            </span>
                            {isMyClub && (
                              <span className="rounded bg-[#e9c349] text-black px-1.5 py-0.2 text-[8px] font-black">
                                YOU
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Stats */}
                        <td className="py-3.5 px-3 text-center">{row.played}</td>
                        <td className="py-3.5 px-3 text-center text-emerald-400 font-bold">{row.wins}</td>
                        <td className="py-3.5 px-3 text-center text-gray-400">{row.draws}</td>
                        <td className="py-3.5 px-3 text-center text-red-400">{row.losses}</td>
                        <td className="py-3.5 px-3 text-center font-mono hidden sm:table-cell">
                          {row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}
                        </td>
                        <td className="py-3.5 px-4 text-center font-black text-sm text-[#e9c349]">
                          {row.points}
                        </td>

                        {/* Form */}
                        <td className="py-3.5 px-4 text-center hidden md:table-cell">
                          <div className="flex items-center justify-center gap-1">
                            {row.form && row.form.length > 0 ? (
                              row.form.map((res, i) => (
                                <span
                                  key={i}
                                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black ${formColor(
                                    res
                                  )}`}
                                >
                                  {res}
                                </span>
                              ))
                            ) : (
                              <span className="text-gray-500">—</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ════ TAB 3: FIXTURES ════ */}
        {activeTab === "FIXTURES" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm sm:text-base font-black uppercase tracking-wider text-white">
                All Season Fixtures
              </h2>
              <span className="text-xs text-gray-400 font-bold">
                {allMatches.length} Total Matches
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {allMatches.map((m) => (
                <div
                  key={m.id}
                  className="rounded-2xl border border-white/10 bg-black/70 p-4 backdrop-blur-md flex items-center justify-between hover:border-[#e9c349]/50 transition-all"
                >
                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    <div className="w-8 h-8 rounded-full border border-white/20 bg-black/80 p-1 flex items-center justify-center shrink-0 overflow-hidden">
                      {m.homeClub.logo ? (
                        <img src={m.homeClub.logo} alt={m.homeClub.name} className="w-full h-full object-contain" />
                      ) : (
                        <span className="text-[10px] font-black">{m.homeClub.name.slice(0, 2)}</span>
                      )}
                    </div>
                    <span className="text-xs font-black uppercase truncate text-white">
                      {m.homeClub.name}
                    </span>
                  </div>

                  <div className="px-3 text-center shrink-0">
                    <span className="block text-[8px] font-black uppercase text-gray-500 mb-0.5">
                      MD {m.matchday}
                    </span>
                    {m.status === "COMPLETED" ? (
                      <span className="text-sm font-black text-[#e9c349] px-2 py-0.5 rounded bg-black/80 border border-[#e9c349]/40">
                        {m.homeGoals} - {m.awayGoals}
                      </span>
                    ) : (
                      <span className="text-xs font-bold text-gray-400">VS</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2.5 flex-1 justify-end min-w-0">
                    <span className="text-xs font-black uppercase truncate text-white text-right">
                      {m.awayClub.name}
                    </span>
                    <div className="w-8 h-8 rounded-full border border-white/20 bg-black/80 p-1 flex items-center justify-center shrink-0 overflow-hidden">
                      {m.awayClub.logo ? (
                        <img src={m.awayClub.logo} alt={m.awayClub.name} className="w-full h-full object-contain" />
                      ) : (
                        <span className="text-[10px] font-black">{m.awayClub.name.slice(0, 2)}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ════ TAB 4: STATS & AWARDS ════ */}
        {activeTab === "STATS & AWARDS" && seasonId && (
          <div className="rounded-3xl border border-white/10 bg-black/60 p-4 sm:p-6 backdrop-blur-xl">
            <SeasonStatsLeaderboards seasonId={seasonId} />
          </div>
        )}

        {/* ════ TAB 5: TOTW ════ */}
        {activeTab === "TOTW" && seasonId && (
          <div className="rounded-3xl border border-white/10 bg-black/60 p-4 sm:p-6 backdrop-blur-xl">
            <TotwPitch seasonId={seasonId} totalMatchdays={totalMatchdays} />
          </div>
        )}

        {/* ════ TAB 6: THRONE CUP 👑 ════ */}
        {activeTab === "THRONE CUP 👑" && (
          <div className="rounded-3xl border border-white/10 bg-black/60 p-4 sm:p-6 backdrop-blur-xl">
            <ThroneCupBracket isAdmin={false} />
          </div>
        )}

        {/* ════ TAB 7: MY CLUB ════ */}
        {activeTab === "MY CLUB" && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 rounded-2xl border border-[#e9c349]/40 bg-black/70">
              {myClub.logo && (
                <div className="w-12 h-12 rounded-full border border-[#e9c349] bg-black p-1 overflow-hidden">
                  <img src={myClub.logo} alt={myClub.name} className="w-full h-full object-contain" />
                </div>
              )}
              <div>
                <h2 className="text-base font-black uppercase tracking-wider text-white">
                  {myClub.name}
                </h2>
                <p className="text-xs font-bold text-[#e9c349]">
                  {myMatches.length} Matches in this competition
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {myMatches.map((m) => {
                const isHome = m.homeClub.id === myClub.id;
                const opp = isHome ? m.awayClub : m.homeClub;
                const myG = isHome ? m.homeGoals : m.awayGoals;
                const oppG = isHome ? m.awayGoals : m.homeGoals;
                const result =
                  m.status === "COMPLETED"
                    ? (myG ?? 0) > (oppG ?? 0)
                      ? "W"
                      : (myG ?? 0) === (oppG ?? 0)
                      ? "D"
                      : "L"
                    : null;

                return (
                  <div
                    key={m.id}
                    className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/80 p-4"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-gray-400">
                        MD {m.matchday}
                      </span>
                      {result && (
                        <span
                          className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black ${formColor(
                            result
                          )}`}
                        >
                          {result}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-xs font-black text-white">
                        {isHome ? "vs" : "@"} {opp.name}
                      </span>
                      {opp.logo && (
                        <div className="w-6 h-6 rounded-full overflow-hidden">
                          <img src={opp.logo} alt={opp.name} className="w-full h-full object-contain" />
                        </div>
                      )}
                    </div>

                    <div>
                      {m.status === "COMPLETED" ? (
                        <span className="text-xs font-black text-[#e9c349]">
                          {myG} - {oppG}
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-gray-400">UPCOMING</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </main>

      {/* ─── FOOTER ─── */}
      <footer className="relative z-10 w-full text-center py-4 border-t border-white/10 text-[10px] font-mono tracking-widest text-gray-500">
        PMB LEAGUE MANAGER · MOBILE COMPETITION HUB
      </footer>
    </div>
  );
}
