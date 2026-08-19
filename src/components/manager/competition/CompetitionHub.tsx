"use client";

import { useState } from "react";
import { ClubBadge } from "@/components/ClubBadge";

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
  myClubId: string;
  myClubName: string;
  myClubLogo: string | null;
  leagueName: string;
  seasonName: string;
  totalMatchdays: number;
  standings: StandingRow[];
  allMatches: Match[];
};

const TABS = ["MATCHDAY", "FIXTURES", "TABLE", "MY CLUB"] as const;
type Tab = (typeof TABS)[number];

const ordinal = (n: number) => {
  const s = ["TH", "ST", "ND", "RD"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

const formColor = (r: "W" | "D" | "L") =>
  ({ W: "bg-emerald-500 text-white", D: "bg-gray-500 text-white", L: "bg-red-600 text-white" }[r]);

export function CompetitionHub({
  myClubId,
  myClubName,
  myClubLogo,
  leagueName,
  seasonName,
  totalMatchdays,
  standings,
  allMatches,
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
        <div className="competition-header relative overflow-hidden rounded-2xl border border-pmb-gold/20 p-6 sm:p-10">
          {/* Shimmer overlay */}
          <div className="competition-shimmer" aria-hidden />

          {/* Season + Matchday label */}
          <div className="relative z-10 mb-6 text-center">
            <p className="text-[10px] font-bold uppercase tracking-[.35em] text-pmb-gold">
              {leagueName}
            </p>
            <p className="mt-1 text-xs font-bold uppercase tracking-[.2em] text-gray-400">
              {headlineMatch.status === "UPCOMING" ? "Upcoming Match" : "Last Result"}{" "}
              · Matchday {headlineMatch.matchday}
            </p>
          </div>

          {/* Match presentation */}
          <div className="relative z-10 flex items-center justify-between gap-4 sm:gap-10">
            {/* Home club */}
            <div className="flex flex-1 flex-col items-center gap-3 text-center">
              <div className="competition-badge-ring">
                <ClubBadge
                  name={headlineMatch.homeClub.name}
                  logo={headlineMatch.homeClub.logo}
                  size="lg"
                />
              </div>
              <p className="text-sm font-bold uppercase tracking-wide text-white sm:text-base">
                {headlineMatch.homeClub.name}
              </p>
              {headlineMatch.homeClub.id === myClubId && (
                <span className="pmb-badge text-[9px]">YOUR CLUB</span>
              )}
            </div>

            {/* VS / Score */}
            <div className="flex flex-col items-center gap-1 text-center shrink-0">
              {headlineMatch.status === "COMPLETED" ? (
                <>
                  <div className="flex items-center gap-2">
                    <span className="text-4xl font-black text-white sm:text-5xl">
                      {headlineMatch.homeGoals}
                    </span>
                    <span className="text-2xl font-bold text-gray-600">—</span>
                    <span className="text-4xl font-black text-white sm:text-5xl">
                      {headlineMatch.awayGoals}
                    </span>
                  </div>
                  <span className="mt-1 text-[10px] font-bold uppercase tracking-widest text-emerald-400">
                    Full Time
                  </span>
                </>
              ) : (
                <>
                  <span className="text-4xl font-black text-pmb-gold sm:text-5xl">
                    VS
                  </span>
                  <span className="mt-1 text-[10px] font-bold uppercase tracking-widest text-yellow-500">
                    Upcoming
                  </span>
                </>
              )}
            </div>

            {/* Away club */}
            <div className="flex flex-1 flex-col items-center gap-3 text-center">
              <div className="competition-badge-ring">
                <ClubBadge
                  name={headlineMatch.awayClub.name}
                  logo={headlineMatch.awayClub.logo}
                  size="lg"
                />
              </div>
              <p className="text-sm font-bold uppercase tracking-wide text-white sm:text-base">
                {headlineMatch.awayClub.name}
              </p>
              {headlineMatch.awayClub.id === myClubId && (
                <span className="pmb-badge text-[9px]">YOUR CLUB</span>
              )}
            </div>
          </div>

          {/* Season name */}
          <div className="relative z-10 mt-8 text-center">
            <p className="text-[10px] font-bold uppercase tracking-[.3em] text-pmb-gold/60">
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
                      "pmb-card p-4 transition",
                      isMyMatch ? "border-pmb-gold/30 shadow-gold" : "",
                    ].join(" ")}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex flex-1 items-center gap-2 overflow-hidden">
                        <ClubBadge
                          name={match.homeClub.name}
                          logo={match.homeClub.logo}
                          size="sm"
                        />
                        <span
                          className={[
                            "truncate text-sm font-semibold",
                            match.homeClub.id === myClubId
                              ? "text-pmb-gold"
                              : "text-white",
                          ].join(" ")}
                        >
                          {match.homeClub.name}
                        </span>
                      </div>

                      <div className="shrink-0 text-center">
                        {match.status === "COMPLETED" ? (
                          <span className="text-base font-black text-white">
                            {match.homeGoals} — {match.awayGoals}
                          </span>
                        ) : (
                          <span className="text-xs font-bold uppercase tracking-widest text-gray-500">
                            vs
                          </span>
                        )}
                      </div>

                      <div className="flex flex-1 items-center justify-end gap-2 overflow-hidden">
                        <span
                          className={[
                            "truncate text-right text-sm font-semibold",
                            match.awayClub.id === myClubId
                              ? "text-pmb-gold"
                              : "text-white",
                          ].join(" ")}
                        >
                          {match.awayClub.name}
                        </span>
                        <ClubBadge
                          name={match.awayClub.name}
                          logo={match.awayClub.logo}
                          size="sm"
                        />
                      </div>
                    </div>

                    <div className="mt-2 flex items-center justify-between">
                      <span
                        className={[
                          "text-[10px] font-bold uppercase tracking-widest",
                          match.status === "COMPLETED"
                            ? "text-emerald-400"
                            : "text-yellow-500",
                        ].join(" ")}
                      >
                        {match.status === "COMPLETED" ? "Completed" : "Upcoming"}
                      </span>
                      {isMyMatch && (
                        <span className="text-[10px] font-bold uppercase tracking-widest text-pmb-gold">
                          YOUR MATCH
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* TABLE TAB */}
        {activeTab === "TABLE" && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-white">League Table</h2>

            <div className="pmb-card overflow-hidden">
              {/* Table header */}
              <div className="grid grid-cols-[2rem_1fr_2rem_2rem_2rem_2rem_2rem_2rem_3rem_3rem] gap-x-1 border-b border-pmb-border px-3 py-2 text-center text-[9px] font-bold uppercase tracking-widest text-gray-600 sm:px-5">
                <span>#</span>
                <span className="text-left">Club</span>
                <span>P</span>
                <span>W</span>
                <span>D</span>
                <span>L</span>
                <span>GF</span>
                <span>GA</span>
                <span>GD</span>
                <span>PTS</span>
              </div>

              <div className="divide-y divide-pmb-border/40">
                {standings.map((row) => {
                  const isMe = row.clubId === myClubId;
                  const isTop = row.position === 1;

                  return (
                    <div
                      key={row.clubId}
                      className={[
                        "grid grid-cols-[2rem_1fr_2rem_2rem_2rem_2rem_2rem_2rem_3rem_3rem] items-center gap-x-1 px-3 py-2.5 text-center text-xs sm:px-5 transition",
                        isMe
                          ? "bg-pmb-gold/8 border-l-2 border-l-pmb-gold"
                          : "hover:bg-white/3",
                      ].join(" ")}
                    >
                      <span
                        className={[
                          "font-bold text-sm",
                          isTop ? "text-pmb-gold" : isMe ? "text-pmb-gold" : "text-gray-500",
                        ].join(" ")}
                      >
                        {row.position}
                      </span>

                      <div className="flex items-center gap-2 text-left overflow-hidden">
                        <ClubBadge
                          name={row.clubName}
                          logo={row.clubLogo}
                          size="xs"
                        />
                        <span
                          className={[
                            "truncate font-semibold",
                            isMe ? "text-pmb-gold" : "text-white",
                          ].join(" ")}
                        >
                          {row.clubName}
                        </span>
                      </div>

                      <span className="text-gray-400">{row.played}</span>
                      <span className="text-gray-400">{row.wins}</span>
                      <span className="text-gray-400">{row.draws}</span>
                      <span className="text-gray-400">{row.losses}</span>
                      <span className="text-gray-400">{row.goalsFor}</span>
                      <span className="text-gray-400">{row.goalsAgainst}</span>
                      <span
                        className={
                          row.goalDifference > 0
                            ? "text-emerald-400 font-semibold"
                            : row.goalDifference < 0
                            ? "text-red-400 font-semibold"
                            : "text-gray-500"
                        }
                      >
                        {row.goalDifference > 0 ? "+" : ""}
                        {row.goalDifference}
                      </span>
                      <span className={["font-bold text-sm", isMe ? "text-pmb-gold" : "text-white"].join(" ")}>
                        {row.points}
                      </span>
                    </div>
                  );
                })}
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
