"use client";

import { useState } from "react";
import Link from "next/link";

type League = {
  id: string;
  name: string;
  country: string;
  clubs: { id: string; name: string }[];
};

type LeagueSeason = {
  leagueId: string;
  seasonId: string | null;
  matchesCount: number;
  completedCount: number;
  upcomingCount: number;
  generated: boolean;
};

type Props = {
  competitionSeasonId: string;
  competitionSeasonName: string;
  competitionSeasonStatus: "DRAFT" | "ACTIVE" | "FINISHED";
  format: "SINGLE_ROUND_ROBIN" | "DOUBLE_ROUND_ROBIN";
  leagues: League[];
  leagueSeasons: LeagueSeason[];
};

export function CompetitionControlCenter({
  competitionSeasonId,
  competitionSeasonName,
  competitionSeasonStatus,
  format,
  leagues,
  leagueSeasons,
}: Props) {
  const [leagueSeasonState, setLeagueSeasonState] = useState<Record<string, LeagueSeason>>(
    Object.fromEntries(leagueSeasons.map((ls) => [ls.leagueId, ls]))
  );
  const [generating, setGenerating] = useState<Record<string, boolean>>({});
  const [deleting, setDeleting] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successes, setSuccesses] = useState<Record<string, string>>({});
  const [csStatus, setCsStatus] = useState(competitionSeasonStatus);
  const [changingStatus, setChangingStatus] = useState(false);
  const [globalError, setGlobalError] = useState("");
  const [globalSuccess, setGlobalSuccess] = useState("");

  function setLeagueError(leagueId: string, msg: string) {
    setErrors((prev) => ({ ...prev, [leagueId]: msg }));
  }

  function setLeagueSuccess(leagueId: string, msg: string) {
    setSuccesses((prev) => ({ ...prev, [leagueId]: msg }));
  }

  async function generateFixtures(league: League) {
    setErrors((prev) => ({ ...prev, [league.id]: "" }));
    setSuccesses((prev) => ({ ...prev, [league.id]: "" }));
    setGenerating((prev) => ({ ...prev, [league.id]: true }));

    try {
      const res = await fetch(
        `/api/admin/competition-seasons/${competitionSeasonId}/leagues/${league.id}/generate-fixtures`,
        { method: "POST" }
      );
      const data = await res.json();
      if (!res.ok) {
        setLeagueError(league.id, data.error ?? "Failed to generate fixtures.");
        return;
      }
      setLeagueSuccess(
        league.id,
        `✓ Generated ${data.matchesCreated} matches across ${data.matchdays} matchdays.`
      );
      setLeagueSeasonState((prev) => ({
        ...prev,
        [league.id]: {
          leagueId: league.id,
          seasonId: data.seasonId,
          matchesCount: data.matchesCreated,
          completedCount: 0,
          upcomingCount: data.matchesCreated,
          generated: true,
        },
      }));
    } catch {
      setLeagueError(league.id, "Network error.");
    } finally {
      setGenerating((prev) => ({ ...prev, [league.id]: false }));
    }
  }

  async function deleteFixtures(league: League) {
    if (
      !confirm(
        `Reset fixtures for ${league.name}?\n\nThis will delete all UPCOMING matches. Completed matches cannot be deleted.`
      )
    ) return;

    setErrors((prev) => ({ ...prev, [league.id]: "" }));
    setSuccesses((prev) => ({ ...prev, [league.id]: "" }));
    setDeleting((prev) => ({ ...prev, [league.id]: true }));

    try {
      const res = await fetch(
        `/api/admin/competition-seasons/${competitionSeasonId}/leagues/${league.id}/generate-fixtures`,
        { method: "DELETE" }
      );
      const data = await res.json();
      if (!res.ok) {
        setLeagueError(league.id, data.error ?? "Failed to delete fixtures.");
        return;
      }
      setLeagueSuccess(league.id, `Deleted ${data.deleted} matches.`);
      setLeagueSeasonState((prev) => ({
        ...prev,
        [league.id]: {
          ...prev[league.id],
          matchesCount: 0,
          completedCount: 0,
          upcomingCount: 0,
          generated: false,
        },
      }));
    } catch {
      setLeagueError(league.id, "Network error.");
    } finally {
      setDeleting((prev) => ({ ...prev, [league.id]: false }));
    }
  }

  async function changeStatus(newStatus: "DRAFT" | "ACTIVE" | "FINISHED") {
    setGlobalError("");
    setGlobalSuccess("");

    if (
      newStatus === "FINISHED" &&
      !confirm(`Finish competition season "${competitionSeasonName}"?\n\nThis will lock all results and generate the final classification.`)
    ) return;

    setChangingStatus(true);
    try {
      const res = await fetch(`/api/admin/competition-seasons/${competitionSeasonId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) {
        setGlobalError(data.error ?? "Failed to update status.");
        return;
      }
      setCsStatus(data.competitionSeason.status);
      setGlobalSuccess(`Competition season status updated to ${data.competitionSeason.status}.`);
    } catch {
      setGlobalError("Network error.");
    } finally {
      setChangingStatus(false);
    }
  }

  const allGenerated = leagues.every((l) => leagueSeasonState[l.id]?.generated);
  const totalMatches = Object.values(leagueSeasonState).reduce((s, l) => s + l.matchesCount, 0);
  const totalCompleted = Object.values(leagueSeasonState).reduce((s, l) => s + l.completedCount, 0);
  const totalUpcoming = Object.values(leagueSeasonState).reduce((s, l) => s + l.upcomingCount, 0);

  const statusColor = {
    DRAFT: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
    ACTIVE: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    FINISHED: "bg-gray-500/15 text-gray-400 border-gray-500/30",
  }[csStatus];

  return (
    <div className="space-y-6">
      {/* Global messages */}
      {globalError && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {globalError}
        </div>
      )}
      {globalSuccess && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
          {globalSuccess}
        </div>
      )}

      {/* Aggregate stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Leagues", value: leagues.length },
          { label: "Total Matches", value: totalMatches },
          { label: "Completed", value: totalCompleted },
          { label: "Remaining", value: totalUpcoming },
        ].map(({ label, value }) => (
          <div key={label} className="pmb-card p-4 text-center">
            <p className="text-2xl font-bold text-pmb-gold">{value}</p>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-gray-500">
              {label}
            </p>
          </div>
        ))}
      </div>

      {/* Status control */}
      <div className="pmb-card p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider ${statusColor}`}>
              {csStatus}
            </span>
            <span className="text-sm text-gray-400">
              Format: <span className="text-white font-medium">
                {format === "DOUBLE_ROUND_ROBIN" ? "Double Round-Robin" : "Single Round-Robin"}
              </span>
            </span>
          </div>

          <div className="flex gap-2 flex-wrap">
            {csStatus === "DRAFT" && (
              <button
                onClick={() => changeStatus("ACTIVE")}
                disabled={changingStatus || !allGenerated}
                title={!allGenerated ? "Generate fixtures for all leagues first" : ""}
                className="pmb-btn-primary text-sm disabled:opacity-50"
              >
                {changingStatus ? "Updating..." : "Activate Season"}
              </button>
            )}
            {csStatus === "ACTIVE" && (
              <button
                onClick={() => changeStatus("FINISHED")}
                disabled={changingStatus}
                className="inline-flex items-center justify-center rounded-lg border border-pmb-gold/30 bg-pmb-gold/10 px-4 py-2 text-sm font-semibold text-pmb-gold transition hover:bg-pmb-gold/20 disabled:opacity-50"
              >
                {changingStatus ? "Finishing..." : "Finish Season"}
              </button>
            )}
          </div>
        </div>
        {csStatus === "DRAFT" && !allGenerated && (
          <p className="mt-3 text-xs text-yellow-400/80">
            ⚠ Generate fixtures for all {leagues.length} leagues before activating the season.
          </p>
        )}
      </div>

      {/* League cards */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold uppercase tracking-widest text-gray-500">Leagues</h3>

        {leagues.map((league) => {
          const ls = leagueSeasonState[league.id] ?? {
            generated: false,
            matchesCount: 0,
            completedCount: 0,
            upcomingCount: 0,
            seasonId: null,
          };

          return (
            <div key={league.id} className="pmb-card p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                {/* League info */}
                <div className="flex items-center gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-white">{league.name}</h4>
                      {ls.generated ? (
                        <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-400">
                          FIXTURES GENERATED
                        </span>
                      ) : (
                        <span className="rounded-full bg-yellow-500/15 border border-yellow-500/30 px-2 py-0.5 text-[10px] font-bold uppercase text-yellow-400">
                          NO FIXTURES
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-gray-500">
                      {league.country} · {league.clubs.length} clubs
                      {ls.generated && (
                        <>
                          {" "}· <span className="text-pmb-gold">{ls.completedCount}</span> completed
                          {" "}· <span className="text-gray-400">{ls.upcomingCount}</span> upcoming
                        </>
                      )}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap items-center gap-2">
                  {ls.generated && ls.seasonId && (
                    <Link
                      href={`/admin/competition/${league.id}?csId=${competitionSeasonId}&seasonId=${ls.seasonId}`}
                      className="pmb-btn-secondary text-sm py-2 px-4"
                    >
                      Manage Matchdays →
                    </Link>
                  )}

                  {!ls.generated && csStatus !== "FINISHED" && (
                    <button
                      onClick={() => generateFixtures(league)}
                      disabled={generating[league.id]}
                      className="pmb-btn-primary text-sm disabled:opacity-50"
                    >
                      {generating[league.id] ? "Generating..." : "Generate Fixtures"}
                    </button>
                  )}

                  {ls.generated && ls.completedCount === 0 && csStatus !== "FINISHED" && (
                    <button
                      onClick={() => deleteFixtures(league)}
                      disabled={deleting[league.id]}
                      className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-400 transition hover:bg-red-500/20 disabled:opacity-50"
                    >
                      {deleting[league.id] ? "Deleting..." : "Reset"}
                    </button>
                  )}
                </div>
              </div>

              {/* Per-league messages */}
              {errors[league.id] && (
                <p className="mt-3 rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2 text-xs text-red-300">
                  {errors[league.id]}
                </p>
              )}
              {successes[league.id] && (
                <p className="mt-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 text-xs text-emerald-300">
                  {successes[league.id]}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
