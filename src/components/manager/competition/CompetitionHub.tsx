"use client";

import { useState } from "react";
import { ClubBadge } from "@/components/ClubBadge";
import { TotwPitch } from "@/components/competition/TotwPitch";
import { SeasonStatsLeaderboards } from "@/components/competition/SeasonStatsLeaderboards";

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

type Props = {
  seasonId?: string;
  myClubId: string;
  myClubName: string;
  myClubLogo: string | null;
  leagueName: string;
  seasonName: string;
  totalMatchdays: number;
  standings: StandingRow[];
  allMatches: Match[];
  isAdmin?: boolean;
};

const TABS = ["MATCHDAY", "FIXTURES", "TABLE", "STATS & AWARDS", "TOTW", "MY CLUB"] as const;
type Tab = (typeof TABS)[number];

const ordinal = (n: number) => {
  const s = ["TH", "ST", "ND", "RD"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

const formColor = (r: "W" | "D" | "L") =>
  ({ W: "bg-emerald-500 text-white", D: "bg-gray-500 text-white", L: "bg-red-600 text-white" }[r]);

export function CompetitionHub({
  seasonId,
  myClubId,
  myClubName,
  myClubLogo,
  leagueName,
  seasonName,
  totalMatchdays,
  standings,
  allMatches,
  isAdmin = false,
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("MATCHDAY");
  const [selectedMatchday, setSelectedMatchday] = useState<number>(() => {
    // Default to the first matchday with an upcoming match, else last completed
    const upcoming = allMatches.filter((m) => m.status === "UPCOMING");
    if (upcoming.length > 0) return upcoming[0].matchday;
    if (allMatches.length > 0) return Math.max(...allMatches.map((m) => m.matchday));
    return 1;
  });

  const myStanding = standings.find((r) => r.clubId === myClubId);
  const myPosition = myStanding?.position ?? null;

  // Next upcoming match for my club
  const myNextMatch = allMatches.find(
    (m) =>
      m.status === "UPCOMING" &&
      (m.homeClub.id === myClubId || m.awayClub.id === myClubId)
  );

  // Most recent completed match for my club
  const myLastMatch = [...allMatches]
    .filter(
      (m) =>
        m.status === "COMPLETED" &&
        (m.homeClub.id === myClubId || m.awayClub.id === myClubId)
    )
    .sort((a, b) => b.matchday - a.matchday)[0];

  // Headline match: next if available, else last
  const headlineMatch = myNextMatch ?? myLastMatch;

  // Matchday matches
  const matchdayMatches = allMatches.filter((m) => m.matchday === selectedMatchday);
  const completedMatchdays = [
    ...new Set(
      allMatches.filter((m) => m.status === "COMPLETED").map((m) => m.matchday)
    ),
  ].sort((a, b) => a - b);
  const lastCompletedMatchday =
    completedMatchdays[completedMatchdays.length - 1] ?? 0;

  // My club's matches for season journey
  const myMatches = allMatches
    .filter(
      (m) =>
        (m.homeClub.id === myClubId || m.awayClub.id === myClubId) &&
        m.status === "COMPLETED"
    )
    .sort((a, b) => a.matchday - b.matchday);

  function getMyResult(match: Match): "W" | "D" | "L" {
    const isHome = match.homeClub.id === myClubId;
    const myGoals = isHome ? match.homeGoals! : match.awayGoals!;
    const oppGoals = isHome ? match.awayGoals! : match.homeGoals!;
    if (myGoals > oppGoals) return "W";
    if (myGoals === oppGoals) return "D";
    return "L";
  }

  return (
    <div className="space-y-0">
      {/* ─── CINEMATIC MATCH HEADER ─────────────────────────────────────── */}
      {headlineMatch && (
        <div className="competition-header relative overflow-hidden rounded-3xl border border-white/20 p-8 sm:p-12 shadow-2xl">
          {/* Shimmer overlay */}
          <div className="competition-shimmer" aria-hidden />

          {/* Dual Volumetric Spotlight Beams behind clubs */}
          <div className="pointer-events-none absolute -left-10 top-1/2 -translate-y-1/2 h-64 w-64 rounded-full bg-yellow-500/20 blur-[80px]" />
          <div className="pointer-events-none absolute -right-10 top-1/2 -translate-y-1/2 h-64 w-64 rounded-full bg-emerald-500/20 blur-[80px]" />

          {/* Season + Matchday label */}
          <div className="relative z-10 mb-8 text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-pmb-gold/30 bg-black/60 px-4 py-1 backdrop-blur-md">
              <span className="h-2 w-2 rounded-full bg-pmb-gold animate-ping" />
              <span className="text-[10px] font-black uppercase tracking-[.3em] text-pmb-gold">
                {leagueName}
              </span>
            </span>
            <p className="mt-2 text-xs font-black uppercase tracking-[.25em] text-gray-300">
              {headlineMatch.status === "UPCOMING" ? "⚡ UPCOMING MATCHDAY CLASH" : "🏆 OFFICIAL MATCH RESULT"}{" "}
              · MATCHDAY {headlineMatch.matchday}
            </p>
          </div>

          {/* Match presentation */}
          <div className="relative z-10 flex items-center justify-between gap-2 sm:gap-12 w-full">
            {/* Home club */}
            <div className="flex flex-1 flex-col items-center gap-1.5 sm:gap-3 text-center min-w-0">
              <div className="relative flex h-16 w-16 sm:h-32 sm:w-32 items-center justify-center rounded-2xl sm:rounded-3xl border-2 border-white/20 bg-black/60 p-2 sm:p-4 shadow-[0_15px_35px_rgba(0,0,0,0.8)] backdrop-blur-md transition-transform duration-300 hover:scale-105">
                <div className="absolute inset-0 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
                <ClubBadge
                  name={headlineMatch.homeClub.name}
                  logo={headlineMatch.homeClub.logo}
                  size="md"
                />
              </div>
              <div className="w-full">
                <p className="text-xs font-black uppercase tracking-wide text-white sm:text-xl drop-shadow-md truncate sm:whitespace-normal">
                  {headlineMatch.homeClub.name}
                </p>
                <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-gray-400 block">
                  Home Side
                </span>
              </div>
              {headlineMatch.homeClub.id === myClubId && (
                <span className="pmb-badge text-[8px] sm:text-[9px] shadow-gold">YOUR CLUB</span>
              )}
            </div>

            {/* VS / Score Broadcast Center */}
            <div className="flex flex-col items-center gap-1 text-center shrink-0">
              <div className="rounded-xl sm:rounded-2xl border border-white/20 bg-black/75 px-3 py-2 sm:px-6 sm:py-4 shadow-[0_0_40px_rgba(0,0,0,0.9)] backdrop-blur-md">
                {headlineMatch.status === "COMPLETED" ? (
                  <>
                    <div className="flex items-center gap-2 sm:gap-3">
                      <span className="text-2xl font-black text-white sm:text-6xl tracking-tight">
                        {headlineMatch.homeGoals}
                      </span>
                      <span className="text-lg sm:text-2xl font-bold text-gray-500">—</span>
                      <span className="text-2xl font-black text-white sm:text-6xl tracking-tight">
                        {headlineMatch.awayGoals}
                      </span>
                    </div>
                    <span className="mt-0.5 block text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-emerald-400">
                      Full Time
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-2xl font-black tracking-tighter text-pmb-gold sm:text-6xl drop-shadow-[0_0_20px_rgba(212,175,55,0.4)]">
                      VS
                    </span>
                    <span className="mt-0.5 block text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-amber-400 animate-pulse">
                      Upcoming
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Away club */}
            <div className="flex flex-1 flex-col items-center gap-1.5 sm:gap-3 text-center min-w-0">
              <div className="relative flex h-16 w-16 sm:h-32 sm:w-32 items-center justify-center rounded-2xl sm:rounded-3xl border-2 border-white/20 bg-black/60 p-2 sm:p-4 shadow-[0_15px_35px_rgba(0,0,0,0.8)] backdrop-blur-md transition-transform duration-300 hover:scale-105">
                <div className="absolute inset-0 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
                <ClubBadge
                  name={headlineMatch.awayClub.name}
                  logo={headlineMatch.awayClub.logo}
                  size="md"
                />
              </div>
              <div className="w-full">
                <p className="text-xs font-black uppercase tracking-wide text-white sm:text-xl drop-shadow-md truncate sm:whitespace-normal">
                  {headlineMatch.awayClub.name}
                </p>
                <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-gray-400 block">
                  Away Side
                </span>
              </div>
              {headlineMatch.awayClub.id === myClubId && (
                <span className="pmb-badge text-[8px] sm:text-[9px] shadow-gold">YOUR CLUB</span>
              )}
            </div>
          </div>

          {/* Season name */}
          <div className="relative z-10 mt-8 text-center">
            <p className="text-[10px] font-black uppercase tracking-[.35em] text-pmb-gold/80">
              {seasonName}
            </p>
          </div>
        </div>
      )}

      {/* ─── MATCHDAY TIMELINE ──────────────────────────────────────────── */}
      <div className="mt-6 overflow-x-auto pb-2">
        <div className="flex items-center gap-1 min-w-max px-1">
          {Array.from({ length: totalMatchdays }, (_, i) => i + 1).map((day, idx) => {
            const isCompleted = day <= lastCompletedMatchday;
            const isCurrent = day === selectedMatchday;
            const isNext =
              !isCompleted && day === lastCompletedMatchday + 1;

            return (
              <div key={day} className="flex items-center">
                {idx > 0 && (
                  <div
                    className={[
                      "h-px w-4 sm:w-6 shrink-0",
                      isCompleted ? "bg-pmb-gold/50" : "bg-pmb-border",
                    ].join(" ")}
                  />
                )}
                <button
                  onClick={() => {
                    setSelectedMatchday(day);
                    setActiveTab("MATCHDAY");
                  }}
                  title={`Matchday ${day}`}
                  className={[
                    "relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold transition-all duration-200",
                    isCurrent
                      ? "bg-pmb-gold text-pmb-black scale-110 shadow-gold"
                      : isCompleted
                      ? "bg-pmb-gold/20 text-pmb-gold border border-pmb-gold/40 hover:bg-pmb-gold/30"
                      : isNext
                      ? "matchday-next border border-pmb-gold/40 text-pmb-gold"
                      : "border border-pmb-border text-gray-600 hover:border-pmb-gold/30 hover:text-gray-400",
                  ].join(" ")}
                >
                  {day}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── COMPETITION NAVIGATION ─────────────────────────────────────── */}
      <div className="mt-5 border-b border-pmb-border">
        <nav className="flex overflow-x-auto" aria-label="Competition sections">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={[
                "shrink-0 border-b-2 px-5 py-3 text-xs font-bold uppercase tracking-[.15em] transition-all",
                activeTab === tab
                  ? "border-pmb-gold text-pmb-gold"
                  : "border-transparent text-gray-500 hover:text-gray-300",
              ].join(" ")}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {/* ─── TAB CONTENT ────────────────────────────────────────────────── */}
      <div className="mt-6">
        {/* MATCHDAY TAB */}
        {activeTab === "MATCHDAY" && (
          <div className="space-y-3">
            <div className="flex items-baseline gap-3">
              <h2 className="text-xl font-bold text-white">
                Matchday {selectedMatchday}
              </h2>
              <span className="text-sm text-gray-500">
                {matchdayMatches.filter((m) => m.status === "COMPLETED").length}/
                {matchdayMatches.length} completed
              </span>
            </div>

            {matchdayMatches.length === 0 ? (
              <div className="rounded-xl border border-pmb-border p-10 text-center text-sm text-gray-500">
                No matches scheduled for matchday {selectedMatchday}.
              </div>
            ) : (
              matchdayMatches.map((match) => {
                const isMyMatch =
                  match.homeClub.id === myClubId ||
                  match.awayClub.id === myClubId;

                return (
                  <div
                    key={match.id}
                    className={[
                      "relative overflow-hidden rounded-xl border transition-all duration-300 p-4",
                      isMyMatch
                        ? "border-pmb-gold bg-gradient-to-r from-pmb-gold/10 via-black/80 to-pmb-gold/10 shadow-[0_0_25px_rgba(212,175,55,0.2)]"
                        : "border-pmb-border bg-gradient-to-r from-[#121214] via-black to-[#121214] hover:border-white/20",
                    ].join(" ")}
                  >
                    {/* Left & Right Team Accent Strips */}
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-pmb-gold/40" />
                    <div className="absolute right-0 top-0 bottom-0 w-1 bg-white/20" />

                    <div className="flex items-center justify-between gap-3">
                      {/* Home Club */}
                      <div className="flex flex-1 items-center gap-3 overflow-hidden">
                        <ClubBadge
                          name={match.homeClub.name}
                          logo={match.homeClub.logo}
                          size="md"
                        />
                        <div className="overflow-hidden">
                          <span
                            className={[
                              "truncate text-sm font-black tracking-tight block",
                              match.homeClub.id === myClubId
                                ? "text-pmb-gold"
                                : "text-white",
                            ].join(" ")}
                          >
                            {match.homeClub.name}
                          </span>
                          <span className="text-[10px] font-bold uppercase text-gray-500">
                            Home
                          </span>
                        </div>
                      </div>

                      {/* Broadcast Score / VS Pill */}
                      <div className="shrink-0 flex flex-col items-center justify-center rounded-xl border border-white/10 bg-black/60 px-4 py-2 shadow-inner">
                        {match.status === "COMPLETED" ? (
                          <div className="flex items-center gap-2">
                            <span className="text-xl font-black text-white">
                              {match.homeGoals}
                            </span>
                            <span className="text-xs font-bold text-gray-500">—</span>
                            <span className="text-xl font-black text-white">
                              {match.awayGoals}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs font-black uppercase tracking-widest text-pmb-gold">
                            VS
                          </span>
                        )}
                        <span
                          className={[
                            "text-[8px] font-black uppercase tracking-widest mt-0.5",
                            match.status === "COMPLETED"
                              ? "text-emerald-400"
                              : "text-amber-400",
                          ].join(" ")}
                        >
                          {match.status === "COMPLETED" ? "FULL TIME" : "UPCOMING"}
                        </span>
                      </div>

                      {/* Away Club */}
                      <div className="flex flex-1 items-center justify-end gap-3 overflow-hidden text-right">
                        <div className="overflow-hidden">
                          <span
                            className={[
                              "truncate text-sm font-black tracking-tight block",
                              match.awayClub.id === myClubId
                                ? "text-pmb-gold"
                                : "text-white",
                            ].join(" ")}
                          >
                            {match.awayClub.name}
                          </span>
                          <span className="text-[10px] font-bold uppercase text-gray-500">
                            Away
                          </span>
                        </div>
                        <ClubBadge
                          name={match.awayClub.name}
                          logo={match.awayClub.logo}
                          size="md"
                        />
                      </div>
                    </div>

                    {isMyMatch && (
                      <div className="mt-3 border-t border-pmb-gold/20 pt-2 flex items-center justify-between">
                        <span className="text-[9px] font-black uppercase tracking-widest text-pmb-gold flex items-center gap-1">
                          ★ YOUR MATCHDAY FIXTURE
                        </span>
                        <span className="text-[9px] text-gray-400">
                          {match.status === "COMPLETED" ? "Result Confirmed" : "Preparation Complete"}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ALL FIXTURES TAB */}
        {activeTab === "FIXTURES" && (
          <div className="space-y-6">
            <h2 className="text-xl font-black uppercase tracking-tight text-white">
              All Fixtures
            </h2>

            {Array.from({ length: totalMatchdays }, (_, i) => i + 1).map((mday) => {
              const mdayMatches = allMatches.filter((m) => m.matchday === mday);
              if (mdayMatches.length === 0) return null;

              return (
                <div key={mday} className="space-y-3">
                  <div className="flex items-center justify-between border-b border-pmb-border/40 pb-1">
                    <h3 className="text-xs font-black uppercase tracking-widest text-pmb-gold">
                      Matchday {mday}
                    </h3>
                    <span className="text-[10px] text-gray-400">
                      {mdayMatches.filter((m) => m.status === "COMPLETED").length} / {mdayMatches.length} played
                    </span>
                  </div>

                  <div className="space-y-2">
                    {mdayMatches.map((match) => {
                      const isMyMatch = match.homeClub.id === myClubId || match.awayClub.id === myClubId;
                      return (
                      <div
                        key={match.id}
                        className={[
                          "relative overflow-hidden rounded-xl border p-3.5 transition",
                          isMyMatch
                            ? "border-pmb-gold/80 bg-pmb-gold/5 shadow-[0_0_15px_rgba(212,175,55,0.15)]"
                            : "border-pmb-border/60 bg-black/40 hover:border-white/20",
                        ].join(" ")}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex flex-1 items-center gap-2.5 overflow-hidden">
                            <ClubBadge name={match.homeClub.name} logo={match.homeClub.logo} size="sm" />
                            <span className="truncate text-xs sm:text-sm font-bold text-white">
                              {match.homeClub.name}
                            </span>
                          </div>

                          <div className="shrink-0 px-2.5 py-1 rounded-lg border border-white/10 bg-black/60 text-center min-w-[54px]">
                            {match.status === "COMPLETED" ? (
                              <span className="text-xs font-black text-white">
                                {match.homeGoals} - {match.awayGoals}
                              </span>
                            ) : (
                              <span className="text-[10px] font-black text-pmb-gold">VS</span>
                            )}
                          </div>

                          <div className="flex flex-1 items-center justify-end gap-2.5 overflow-hidden text-right">
                            <span className="truncate text-xs sm:text-sm font-bold text-white">
                              {match.awayClub.name}
                            </span>
                            <ClubBadge name={match.awayClub.name} logo={match.awayClub.logo} size="sm" />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

        {/* TABLE TAB */}
        {activeTab === "TABLE" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <h2 className="text-xl font-black uppercase tracking-tight text-white">
                Official Championship Standings
              </h2>
              <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-wider text-gray-400 flex-wrap">
                <span className="flex items-center gap-1 text-yellow-400">
                  <span className="h-2 w-2 rounded-full bg-yellow-400" /> 1st: Champion
                </span>
                <span className="flex items-center gap-1 text-sky-400">
                  <span className="h-2 w-2 rounded-full bg-sky-400" /> 2nd-3rd: Continental
                </span>
                <span className="flex items-center gap-1 text-red-400">
                  <span className="h-2 w-2 rounded-full bg-red-400" /> Relegation
                </span>
              </div>
            </div>

            <div className="pmb-card overflow-hidden">
              {/* Responsive Standings Table with dedicated horizontal scroll */}
              <div className="overflow-x-auto">
                <div className="min-w-[580px]">
                  {/* Table header */}
                  <div className="grid grid-cols-[2.5rem_1fr_2.2rem_2.2rem_2.2rem_2.2rem_2.2rem_2.2rem_2.8rem_3.2rem] gap-x-1 border-b border-pmb-border bg-black/60 px-3 py-3 text-center text-[9px] font-black uppercase tracking-widest text-gray-400 sm:px-5">
                    <span>POS</span>
                    <span className="text-left min-w-[150px]">CLUB</span>
                    <span>P</span>
                    <span>W</span>
                    <span>D</span>
                    <span>L</span>
                    <span>GF</span>
                    <span>GA</span>
                    <span>GD</span>
                    <span className="text-pmb-gold">PTS</span>
                  </div>

                  <div className="divide-y divide-pmb-border/40">
                    {standings.map((row) => {
                      const isMe = row.clubId === myClubId;
                      const isChampion = row.position === 1;
                      const isContinental = row.position >= 2 && row.position <= 3;
                      const isRelegation = row.position > Math.max(3, standings.length - 2);

                      const zoneClass = isChampion
                        ? "border-l-4 border-l-yellow-400 bg-yellow-500/10 shadow-[inset_0_0_20px_rgba(234,179,8,0.06)]"
                        : isContinental
                        ? "border-l-4 border-l-sky-400 bg-sky-500/5"
                        : isRelegation
                        ? "border-l-4 border-l-red-500 bg-red-500/5"
                        : isMe
                        ? "border-l-4 border-l-pmb-gold bg-pmb-gold/10"
                        : "border-l-4 border-l-transparent hover:bg-white/5";

                      return (
                        <div
                          key={row.clubId}
                          className={[
                            "grid grid-cols-[2.5rem_1fr_2.2rem_2.2rem_2.2rem_2.2rem_2.2rem_2.2rem_2.8rem_3.2rem] items-center gap-x-1 px-3 py-3 text-center text-xs sm:px-5 transition",
                            zoneClass,
                          ].join(" ")}
                        >
                          <div className="flex items-center justify-center gap-1 font-black">
                            {isChampion && <span className="text-xs">👑</span>}
                            <span
                              className={
                                isChampion
                                  ? "text-yellow-400 text-sm font-black"
                                  : isContinental
                                  ? "text-sky-400 font-bold"
                                  : isRelegation
                                  ? "text-red-400 font-bold"
                                  : isMe
                                  ? "text-pmb-gold font-bold"
                                  : "text-gray-400"
                              }
                            >
                              {row.position}
                            </span>
                          </div>

                          <div className="flex items-center gap-2.5 text-left min-w-[150px] overflow-hidden">
                            <ClubBadge
                              name={row.clubName}
                              logo={row.clubLogo}
                              size="xs"
                            />
                            <span
                              className={[
                                "truncate font-bold text-xs sm:text-sm",
                                isMe ? "text-pmb-gold" : isChampion ? "text-yellow-300" : "text-white",
                              ].join(" ")}
                            >
                              {row.clubName}
                            </span>
                          </div>

                          <span className="text-gray-400 font-semibold">{row.played}</span>
                          <span className="text-gray-300 font-semibold">{row.wins}</span>
                          <span className="text-gray-400">{row.draws}</span>
                          <span className="text-gray-400">{row.losses}</span>
                          <span className="text-gray-400">{row.goalsFor}</span>
                          <span className="text-gray-400">{row.goalsAgainst}</span>
                          <span
                            className={
                              row.goalDifference > 0
                                ? "text-emerald-400 font-black"
                                : row.goalDifference < 0
                                ? "text-red-400 font-semibold"
                                : "text-gray-400"
                            }
                          >
                            {row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}
                          </span>
                          <span className="text-sm font-black text-pmb-gold">{row.points}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Interactive Zone Legend Card */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/5 p-3 flex items-center gap-3">
                <span className="text-2xl">🏆</span>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-yellow-400 block">
                    Gold Champion Zone
                  </span>
                  <span className="text-xs text-gray-400">Position 1: League Title & PMB Trophy</span>
                </div>
              </div>

              <div className="rounded-xl border border-sky-500/30 bg-sky-500/5 p-3 flex items-center gap-3">
                <span className="text-2xl">🌟</span>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-sky-400 block">
                    Continental Cup Zone
                  </span>
                  <span className="text-xs text-gray-400">Positions 2–3: Elite Cup Qualification</span>
                </div>
              </div>

              <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-3 flex items-center gap-3">
                <span className="text-2xl">🔻</span>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-red-400 block">
                    Relegation Danger
                  </span>
                  <span className="text-xs text-gray-400">Bottom 2: Relegation Playoff Round</span>
                </div>
              </div>
            </div>

            {/* Form guide */}
            {standings.length > 0 && (
              <div className="pmb-card overflow-hidden">
                <div className="border-b border-pmb-border px-4 py-3">
                  <p className="text-xs font-bold uppercase tracking-widest text-gray-500">
                    Recent Form (Last 5)
                  </p>
                </div>
                <div className="divide-y divide-pmb-border/40">
                  {standings.slice(0, 10).map((row) => (
                    <div
                      key={row.clubId}
                      className={[
                        "flex items-center justify-between px-4 py-2",
                        row.clubId === myClubId ? "bg-pmb-gold/8" : "",
                      ].join(" ")}
                    >
                      <span
                        className={[
                          "text-sm font-semibold truncate",
                          row.clubId === myClubId ? "text-pmb-gold" : "text-white",
                        ].join(" ")}
                      >
                        {row.clubName}
                      </span>
                      <div className="flex gap-1 ml-4">
                        {row.form.length === 0 ? (
                          <span className="text-xs text-gray-600">—</span>
                        ) : (
                          row.form.map((r, i) => (
                            <span
                              key={i}
                              className={`flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold ${formColor(r)}`}
                            >
                              {r}
                            </span>
                          ))
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* FIXTURES TAB */}
        {activeTab === "FIXTURES" && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-white">All Fixtures</h2>
            {Array.from({ length: totalMatchdays }, (_, i) => i + 1).map((day) => {
              const dayMatches = allMatches.filter((m) => m.matchday === day);
              if (dayMatches.length === 0) return null;
              const allDone = dayMatches.every((m) => m.status === "COMPLETED");

              return (
                <div key={day} className="space-y-2">
                  <div className="flex items-center gap-3">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400">
                      Matchday {day}
                    </h3>
                    {allDone && (
                      <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-400">
                        Completed
                      </span>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    {dayMatches.map((match) => {
                      const isMyMatch =
                        match.homeClub.id === myClubId ||
                        match.awayClub.id === myClubId;

                      return (
                        <div
                          key={match.id}
                          className={[
                            "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm",
                            isMyMatch
                              ? "border-pmb-gold/30 bg-pmb-gold/5"
                              : "border-pmb-border bg-pmb-panel/40",
                          ].join(" ")}
                        >
                          <span
                            className={[
                              "flex-1 truncate text-right font-medium",
                              match.homeClub.id === myClubId
                                ? "text-pmb-gold"
                                : "text-white",
                            ].join(" ")}
                          >
                            {match.homeClub.name}
                          </span>

                          <span className="shrink-0 w-16 text-center font-bold text-sm">
                            {match.status === "COMPLETED" ? (
                              <span className="text-white">
                                {match.homeGoals} — {match.awayGoals}
                              </span>
                            ) : (
                              <span className="text-gray-600">vs</span>
                            )}
                          </span>

                          <span
                            className={[
                              "flex-1 truncate font-medium",
                              match.awayClub.id === myClubId
                                ? "text-pmb-gold"
                                : "text-white",
                            ].join(" ")}
                          >
                            {match.awayClub.name}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* STATS & AWARDS TAB */}
        {activeTab === "STATS & AWARDS" && (
          <div className="space-y-6">
            {seasonId ? (
              <SeasonStatsLeaderboards seasonId={seasonId} />
            ) : (
              <div className="p-8 text-center text-xs text-gray-500 rounded-xl border border-pmb-border bg-pmb-dark-surface">
                No active season data found for statistics.
              </div>
            )}
          </div>
        )}

        {/* TOTW TAB */}
        {activeTab === "TOTW" && (
          <div className="space-y-6">
            {seasonId ? (
              <TotwPitch
                seasonId={seasonId}
                isAdmin={isAdmin}
                totalMatchdays={totalMatchdays}
              />
            ) : (
              <div className="p-8 text-center text-xs text-gray-500 rounded-xl border border-pmb-border bg-pmb-dark-surface">
                No active season data found for Team of the Week.
              </div>
            )}
          </div>
        )}

        {/* MY CLUB TAB */}
        {activeTab === "MY CLUB" && (
          <div className="space-y-6">
            {/* Position card */}
            <div className="competition-header relative overflow-hidden rounded-2xl border border-pmb-gold/20 p-6 text-center">
              <div className="competition-shimmer" aria-hidden />
              <div className="relative z-10">
                <ClubBadge name={myClubName} logo={myClubLogo} size="lg" />
                <h2 className="mt-4 text-2xl font-bold text-white">{myClubName}</h2>

                {myStanding ? (
                  <div className="mt-4 flex items-center justify-center gap-8">
                    <div className="text-center">
                      <p className="text-4xl font-black text-pmb-gold">
                        {ordinal(myStanding.position)}
                      </p>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
                        Position
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-4xl font-black text-white">
                        {myStanding.points}
                      </p>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
                        Points
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-4xl font-black text-white">
                        {myStanding.played}
                      </p>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
                        Played
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-gray-500">
                    No competition data yet.
                  </p>
                )}

                {myStanding && myStanding.form.length > 0 && (
                  <div className="mt-5 flex justify-center gap-1.5">
                    {myStanding.form.map((r, i) => (
                      <span
                        key={i}
                        className={`flex h-7 w-7 items-center justify-center rounded text-xs font-bold ${formColor(r)}`}
                      >
                        {r}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Season journey */}
            {myMatches.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-bold uppercase tracking-widest text-gray-500">
                  Season Journey
                </h3>

                <div className="space-y-2">
                  {myMatches.map((match, idx) => {
                    const result = getMyResult(match);
                    const isHome = match.homeClub.id === myClubId;
                    const opponent = isHome ? match.awayClub : match.homeClub;
                    const myGoals = isHome ? match.homeGoals! : match.awayGoals!;
                    const oppGoals = isHome ? match.awayGoals! : match.homeGoals!;

                    const resultConfig = {
                      W: {
                        label: "WIN",
                        bg: "border-emerald-500/30 bg-emerald-500/8",
                        badge: "bg-emerald-500 text-white",
                        text: "text-emerald-400",
                      },
                      D: {
                        label: "DRAW",
                        bg: "border-gray-500/30 bg-gray-500/8",
                        badge: "bg-gray-500 text-white",
                        text: "text-gray-400",
                      },
                      L: {
                        label: "LOSS",
                        bg: "border-red-500/30 bg-red-500/8",
                        badge: "bg-red-600 text-white",
                        text: "text-red-400",
                      },
                    }[result];

                    return (
                      <div
                        key={match.id}
                        className={`relative flex items-center gap-4 rounded-xl border p-3.5 ${resultConfig.bg}`}
                      >
                        {/* Timeline connector */}
                        {idx < myMatches.length - 1 && (
                          <div className="absolute -bottom-2 left-7 h-2 w-px bg-pmb-border" />
                        )}

                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-pmb-border bg-pmb-charcoal text-[10px] font-bold text-gray-400">
                          {match.matchday}
                        </div>

                        <div className="flex flex-1 items-center gap-2 overflow-hidden">
                          <span className="text-xs text-gray-500">
                            {isHome ? "vs" : "@"}
                          </span>
                          <span className="flex-1 truncate text-sm font-semibold text-white">
                            {opponent.name}
                          </span>
                          <span className="shrink-0 text-sm font-bold text-white">
                            {myGoals}–{oppGoals}
                          </span>
                        </div>

                        <span
                          className={`shrink-0 rounded px-2 py-0.5 text-[10px] font-bold ${resultConfig.badge}`}
                        >
                          {resultConfig.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {myMatches.length === 0 && (
              <div className="rounded-xl border border-pmb-border p-10 text-center text-sm text-gray-500">
                No matches played yet. Check back after the season begins.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
