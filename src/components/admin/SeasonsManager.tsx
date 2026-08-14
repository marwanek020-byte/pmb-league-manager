"use client";

import { useMemo, useState } from "react";

type League = {
  id: string;
  name: string;
  country: string;
  _count: {
    clubs: number;
  };
};

type Season = {
  id: string;
  name: string;
  status: "DRAFT" | "ACTIVE" | "FINISHED";
  startDate: string | null;
  endDate: string | null;
  league: {
    id: string;
    name: string;
    country: string;
  };
  classificationCount: number;
};

type ClassificationRow = {
  clubId: string;
  clubName: string;
  position: number;
  played: number | "";
  wins: number | "";
  draws: number | "";
  losses: number | "";
  goalsFor: number | "";
  goalsAgainst: number | "";
  goalDifference: number | "";
  points: number | "";
};

type Props = {
  initialLeagues: League[];
  initialSeasons: Season[];
};

export function SeasonsManager({
  initialLeagues,
  initialSeasons,
}: Props) {
  const [seasons, setSeasons] = useState<Season[]>(initialSeasons);

  const [showCreate, setShowCreate] = useState(false);

  const [leagueId, setLeagueId] = useState("");
  const [seasonName, setSeasonName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const [selectedSeason, setSelectedSeason] =
    useState<Season | null>(null);

  const [classification, setClassification] =
    useState<ClassificationRow[]>([]);

  const [loadingSeason, setLoadingSeason] = useState(false);
  const [savingClassification, setSavingClassification] =
    useState(false);
  const [changingStatus, setChangingStatus] = useState(false);

  const [success, setSuccess] = useState("");

  const selectedLeague = useMemo(
    () =>
      initialLeagues.find(
        (league) => league.id === leagueId
      ),
    [initialLeagues, leagueId]
  );

  async function createSeason() {
    setError("");
    setSuccess("");

    if (!leagueId) {
      setError("Please select a league.");
      return;
    }

    if (!seasonName.trim()) {
      setError("Please enter a season name.");
      return;
    }

    setCreating(true);

    try {
      const res = await fetch("/api/admin/seasons", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          leagueId,
          name: seasonName.trim(),
          startDate: startDate || null,
          endDate: endDate || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(
          data.error ?? "Could not create season."
        );
        return;
      }

      const newSeason: Season = {
        id: data.season.id,
        name: data.season.name,
        status: data.season.status,
        startDate: data.season.startDate
          ? new Date(
              data.season.startDate
            ).toISOString()
          : null,
        endDate: data.season.endDate
          ? new Date(data.season.endDate).toISOString()
          : null,
        league: data.season.league,
        classificationCount: 0,
      };

      setSeasons((prev) => [
        newSeason,
        ...prev,
      ]);

      setLeagueId("");
      setSeasonName("");
      setStartDate("");
      setEndDate("");
      setShowCreate(false);

      setSuccess(
        `${newSeason.league.name} ${newSeason.name} created.`
      );
    } catch {
      setError(
        "Network error. Please try again."
      );
    } finally {
      setCreating(false);
    }
  }

  async function openSeason(season: Season) {
    setError("");
    setSuccess("");
    setLoadingSeason(true);
    setSelectedSeason(season);

    try {
      const res = await fetch(
        `/api/admin/seasons/${season.id}`
      );

      const data = await res.json();

      if (!res.ok) {
        setError(
          data.error ?? "Could not load season."
        );
        setSelectedSeason(null);
        return;
      }

      const clubs = data.season.league.clubs as {
        id: string;
        name: string;
      }[];

      const existing = new Map<
        string,
        {
          position: number;
          played: number | null;
          wins: number | null;
          draws: number | null;
          losses: number | null;
          goalsFor: number | null;
          goalsAgainst: number | null;
          goalDifference: number | null;
          points: number | null;
        }
      >();

      for (
        const row of data.season.classifications
      ) {
        existing.set(row.clubId, row);
      }

      const rows: ClassificationRow[] =
        clubs.map((club, index) => {
          const row = existing.get(club.id);

          return {
            clubId: club.id,
            clubName: club.name,
            position:
              row?.position ?? index + 1,
            played: row?.played ?? "",
            wins: row?.wins ?? "",
            draws: row?.draws ?? "",
            losses: row?.losses ?? "",
            goalsFor: row?.goalsFor ?? "",
            goalsAgainst:
              row?.goalsAgainst ?? "",
            goalDifference:
              row?.goalDifference ?? "",
            points: row?.points ?? "",
          };
        });

      rows.sort(
        (a, b) => a.position - b.position
      );

      setClassification(rows);

      setSelectedSeason({
        id: data.season.id,
        name: data.season.name,
        status: data.season.status,
        startDate: data.season.startDate
          ? new Date(
              data.season.startDate
            ).toISOString()
          : null,
        endDate: data.season.endDate
          ? new Date(
              data.season.endDate
            ).toISOString()
          : null,
        league: data.season.league,
        classificationCount:
          data.season.classifications.length,
      });
    } catch {
      setError(
        "Network error. Please try again."
      );
      setSelectedSeason(null);
    } finally {
      setLoadingSeason(false);
    }
  }

  function updateRow(
    clubId: string,
    field: keyof ClassificationRow,
    value: string
  ) {
    setClassification((prev) =>
      prev.map((row) => {
        if (row.clubId !== clubId) {
          return row;
        }

        if (field === "clubName") {
          return row;
        }

        if (field === "position") {
          const position = Number(value);

          return {
            ...row,
            position: Number.isFinite(
              position
            )
              ? position
              : row.position,
          };
        }

        const numericValue =
          value === "" ? "" : Number(value);

        return {
          ...row,
          [field]: numericValue,
        };
      })
    );
  }

  async function saveClassification() {
    if (!selectedSeason) return;

    if (selectedSeason.status !== "ACTIVE") {
      setError(
        "Only an ACTIVE season can be edited."
      );
      return;
    }

    setError("");
    setSuccess("");

    const positions = classification.map(
      (row) => row.position
    );

    if (
      new Set(positions).size !==
      positions.length
    ) {
      setError(
        "Every club must have a unique position."
      );
      return;
    }

    if (
      classification.some(
        (row) =>
          !Number.isInteger(row.position) ||
          row.position < 1 ||
          row.position >
            classification.length
      )
    ) {
      setError(
        "Positions must be valid and unique."
      );
      return;
    }

    setSavingClassification(true);

    try {
      const res = await fetch(
        `/api/admin/seasons/${selectedSeason.id}/classification`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            classifications:
              classification.map((row) => ({
                clubId: row.clubId,
                position: row.position,
                played:
                  row.played === ""
                    ? null
                    : Number(row.played),
                wins:
                  row.wins === ""
                    ? null
                    : Number(row.wins),
                draws:
                  row.draws === ""
                    ? null
                    : Number(row.draws),
                losses:
                  row.losses === ""
                    ? null
                    : Number(row.losses),
                goalsFor:
                  row.goalsFor === ""
                    ? null
                    : Number(row.goalsFor),
                goalsAgainst:
                  row.goalsAgainst === ""
                    ? null
                    : Number(
                        row.goalsAgainst
                      ),
                goalDifference:
                  row.goalDifference === ""
                    ? null
                    : Number(
                        row.goalDifference
                      ),
                points:
                  row.points === ""
                    ? null
                    : Number(row.points),
              })),
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        setError(
          data.error ??
            "Could not save classification."
        );
        return;
      }

      setSuccess(
        `Final classification saved for ${selectedSeason.league.name} ${selectedSeason.name}.`
      );

      setSeasons((prev) =>
        prev.map((season) =>
          season.id === selectedSeason.id
            ? {
                ...season,
                classificationCount:
                  data.count,
              }
            : season
        )
      );

      setSelectedSeason((prev) =>
        prev
          ? {
              ...prev,
              classificationCount:
                data.count,
            }
          : prev
      );
    } catch {
      setError(
        "Network error. Please try again."
      );
    } finally {
      setSavingClassification(false);
    }
  }

  async function changeStatus(
    status: "DRAFT" | "ACTIVE" | "FINISHED"
  ) {
    if (!selectedSeason) return;

    setError("");
    setSuccess("");

    if (
      status === "FINISHED" &&
      classification.length === 0
    ) {
      setError(
        "You must enter the final classification first."
      );
      return;
    }

    if (
      status === "FINISHED" &&
      classification.length !==
        selectedLeagueClubCount()
    ) {
      setError(
        "Every club in the league must have a final classification before finishing the season."
      );
      return;
    }

    if (
      status === "FINISHED" &&
      !window.confirm(
        `Finish ${selectedSeason.league.name} ${selectedSeason.name}?\n\nOnce finished, the classification cannot be changed.`
      )
    ) {
      return;
    }

    if (
      status === "ACTIVE" &&
      selectedSeason.status === "FINISHED" &&
      !window.confirm(
        `Reopen ${selectedSeason.league.name} ${selectedSeason.name}?\n\nThe season will become ACTIVE again and its classification can be edited.`
      )
    ) {
      return;
    }

    setChangingStatus(true);

    try {
      const res = await fetch(
        `/api/admin/seasons/${selectedSeason.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        setError(
          data.error ??
            "Could not update season."
        );
        return;
      }

      setSelectedSeason((prev) =>
        prev
          ? {
              ...prev,
              status: data.season.status,
            }
          : prev
      );

      setSeasons((prev) =>
        prev.map((season) =>
          season.id === selectedSeason.id
            ? {
                ...season,
                status: data.season.status,
              }
            : season
        )
      );

      setSuccess(
        status === "FINISHED"
          ? "Season finished successfully."
          : status === "ACTIVE" &&
              selectedSeason.status ===
                "FINISHED"
            ? "Season reopened successfully."
            : `Season changed to ${status}.`
      );
    } catch {
      setError(
        "Network error. Please try again."
      );
    } finally {
      setChangingStatus(false);
    }
  }

  function selectedLeagueClubCount() {
    if (!selectedSeason) return 0;

    const league = initialLeagues.find(
      (item) =>
        item.id === selectedSeason.league.id
    );

    return (
      league?._count.clubs ??
      classification.length
    );
  }

  function closeSeason() {
    setSelectedSeason(null);
    setClassification([]);
    setError("");
    setSuccess("");
  }

  return (
    <div className="space-y-6">
      {/* Messages */}
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-300">
          {success}
        </div>
      )}

      {/* Create season */}
      <section className="pmb-card p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">
              Seasons
            </h2>

            <p className="mt-1 text-sm text-gray-400">
              Create and manage historical league
              seasons.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setShowCreate(
                (value) => !value
              );
              setError("");
              setSuccess("");
            }}
            className="pmb-btn-primary whitespace-nowrap"
          >
            {showCreate
              ? "Cancel"
              : "Create Season"}
          </button>
        </div>

        {showCreate && (
          <div className="mt-6 grid grid-cols-1 gap-4 border-t border-pmb-border pt-6 md:grid-cols-2">
            <div>
              <label className="pmb-label">
                League
              </label>

              <select
                value={leagueId}
                onChange={(e) =>
                  setLeagueId(e.target.value)
                }
                className="pmb-input w-full"
              >
                <option value="">
                  Select league...
                </option>

                {initialLeagues.map(
                  (league) => (
                    <option
                      key={league.id}
                      value={league.id}
                    >
                      {league.name} (
                      {league._count.clubs} clubs)
                    </option>
                  )
                )}
              </select>
            </div>

            <div>
              <label className="pmb-label">
                Season Name
              </label>

              <input
                type="text"
                value={seasonName}
                onChange={(e) =>
                  setSeasonName(e.target.value)
                }
                placeholder="2026/27"
                className="pmb-input w-full"
              />
            </div>

            <div>
              <label className="pmb-label">
                Start Date
              </label>

              <input
                type="date"
                value={startDate}
                onChange={(e) =>
                  setStartDate(e.target.value)
                }
                className="pmb-input w-full"
              />
            </div>

            <div>
              <label className="pmb-label">
                End Date
              </label>

              <input
                type="date"
                value={endDate}
                onChange={(e) =>
                  setEndDate(e.target.value)
                }
                className="pmb-input w-full"
              />
            </div>

            {selectedLeague && (
              <div className="md:col-span-2 rounded-lg border border-pmb-border bg-black/20 p-4 text-sm text-gray-300">
                <span className="font-semibold text-white">
                  {selectedLeague.name}
                </span>{" "}
                contains{" "}
                <span className="font-semibold text-pmb-gold">
                  {selectedLeague._count.clubs}
                </span>{" "}
                clubs.
              </div>
            )}

            <div className="md:col-span-2">
              <button
                type="button"
                disabled={creating}
                onClick={createSeason}
                className="pmb-btn-primary disabled:opacity-50"
              >
                {creating
                  ? "Creating..."
                  : "Create Season"}
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Season list */}
      <section className="pmb-card overflow-hidden">
        <div className="border-b border-pmb-border px-6 py-4">
          <h2 className="text-lg font-semibold text-white">
            All Seasons
          </h2>
        </div>

        {seasons.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-gray-400">
            No seasons have been created yet.
          </div>
        ) : (
          <div className="divide-y divide-pmb-border">
            {seasons.map((season) => (
              <div
                key={season.id}
                className="flex flex-col gap-4 px-6 py-5 lg:flex-row lg:items-center lg:justify-between"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="font-semibold text-white">
                      {season.league.name} —{" "}
                      {season.name}
                    </h3>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        season.status ===
                        "FINISHED"
                          ? "bg-green-500/10 text-green-400"
                          : season.status ===
                              "ACTIVE"
                            ? "bg-blue-500/10 text-blue-400"
                            : "bg-yellow-500/10 text-yellow-400"
                      }`}
                    >
                      {season.status}
                    </span>
                  </div>

                  <p className="mt-1 text-sm text-gray-500">
                    {season.league.country} ·{" "}
                    {season.classificationCount}{" "}
                    classified clubs
                  </p>

                  {(season.startDate ||
                    season.endDate) && (
                    <p className="mt-1 text-xs text-gray-600">
                      {season.startDate
                        ? new Date(
                            season.startDate
                          ).toLocaleDateString()
                        : "No start date"}{" "}
                      →{" "}
                      {season.endDate
                        ? new Date(
                            season.endDate
                          ).toLocaleDateString()
                        : "No end date"}
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  disabled={loadingSeason}
                  onClick={() =>
                    openSeason(season)
                  }
                  className="pmb-btn-secondary whitespace-nowrap"
                >
                  {loadingSeason &&
                  selectedSeason?.id ===
                    season.id
                    ? "Loading..."
                    : "Manage Season"}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Season management */}
      {selectedSeason && (
        <section className="pmb-card overflow-hidden">
          <div className="flex flex-col gap-4 border-b border-pmb-border p-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500">
                Season Management
              </p>

              <h2 className="mt-1 text-2xl font-bold text-white">
                {selectedSeason.league.name} —{" "}
                {selectedSeason.name}
              </h2>

              <p className="mt-1 text-sm text-gray-400">
                Enter the official final
                classification.
              </p>
            </div>

            <button
              type="button"
              onClick={closeSeason}
              className="pmb-btn-secondary"
            >
              Close
            </button>
          </div>

          {/* Status controls */}
          <div className="flex flex-wrap items-center gap-3 border-b border-pmb-border bg-black/20 px-6 py-4">
            <span className="text-sm text-gray-400">
              Status:
            </span>

            <span className="rounded-full bg-pmb-gold/10 px-3 py-1 text-xs font-semibold text-pmb-gold">
              {selectedSeason.status}
            </span>

            {selectedSeason.status ===
              "DRAFT" && (
              <button
                type="button"
                disabled={changingStatus}
                onClick={() =>
                  changeStatus("ACTIVE")
                }
                className="pmb-btn-secondary px-3 py-1.5 text-xs disabled:opacity-50"
              >
                {changingStatus
                  ? "Opening..."
                  : "Open Season"}
              </button>
            )}

            {selectedSeason.status ===
              "ACTIVE" && (
              <button
                type="button"
                disabled={changingStatus}
                onClick={() =>
                  changeStatus("FINISHED")
                }
                className="rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-1.5 text-xs font-semibold text-green-400 hover:bg-green-500/20 disabled:opacity-50"
              >
                {changingStatus
                  ? "Finishing..."
                  : "Finish Season"}
              </button>
            )}

            {selectedSeason.status ===
              "FINISHED" && (
              <button
                type="button"
                disabled={changingStatus}
                onClick={() =>
                  changeStatus("ACTIVE")
                }
                className="rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-1.5 text-xs font-semibold text-blue-400 hover:bg-blue-500/20 disabled:opacity-50"
              >
                {changingStatus
                  ? "Reopening..."
                  : "Reopen Season"}
              </button>
            )}
          </div>

          {/* Classification table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-pmb-border bg-pmb-charcoal/60 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-3 py-3">
                    Pos
                  </th>
                  <th className="min-w-[220px] px-4 py-3">
                    Club
                  </th>
                  <th className="px-3 py-3">
                    P
                  </th>
                  <th className="px-3 py-3">
                    W
                  </th>
                  <th className="px-3 py-3">
                    D
                  </th>
                  <th className="px-3 py-3">
                    L
                  </th>
                  <th className="px-3 py-3">
                    GF
                  </th>
                  <th className="px-3 py-3">
                    GA
                  </th>
                  <th className="px-3 py-3">
                    GD
                  </th>
                  <th className="px-3 py-3">
                    PTS
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-pmb-border">
                {[...classification]
                  .sort(
                    (a, b) =>
                      a.position -
                      b.position
                  )
                  .map((row) => (
                    <tr
                      key={row.clubId}
                      className="hover:bg-pmb-charcoal/40"
                    >
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min={1}
                          max={
                            classification.length
                          }
                          value={row.position}
                          disabled={
                            selectedSeason.status !==
                            "ACTIVE"
                          }
                          onChange={(e) =>
                            updateRow(
                              row.clubId,
                              "position",
                              e.target.value
                            )
                          }
                          className="w-16 rounded-lg border border-pmb-border bg-black/30 px-2 py-2 text-center text-white outline-none focus:border-pmb-gold disabled:cursor-not-allowed disabled:opacity-50"
                        />
                      </td>

                      <td className="px-4 py-2 font-semibold text-white">
                        {row.clubName}
                      </td>

                      {(
                        [
                          "played",
                          "wins",
                          "draws",
                          "losses",
                          "goalsFor",
                          "goalsAgainst",
                          "goalDifference",
                          "points",
                        ] as const
                      ).map((field) => (
                        <td
                          key={field}
                          className="px-2 py-2"
                        >
                          <input
                            type="number"
                            value={row[field]}
                            disabled={
                              selectedSeason.status !==
                              "ACTIVE"
                            }
                            onChange={(e) =>
                              updateRow(
                                row.clubId,
                                field,
                                e.target.value
                              )
                            }
                            className="w-20 rounded-lg border border-pmb-border bg-black/30 px-2 py-2 text-center text-white outline-none focus:border-pmb-gold disabled:cursor-not-allowed disabled:opacity-50"
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3 border-t border-pmb-border px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-gray-500">
              {classification.length} clubs in
              this classification.
            </p>

            {selectedSeason.status ===
              "ACTIVE" && (
              <button
                type="button"
                disabled={savingClassification}
                onClick={saveClassification}
                className="pmb-btn-primary disabled:opacity-50"
              >
                {savingClassification
                  ? "Saving..."
                  : "Save Final Classification"}
              </button>
            )}
          </div>
        </section>
      )}
    </div>
  );
}