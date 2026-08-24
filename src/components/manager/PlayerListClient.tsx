"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PlayerDTO } from "@/lib/serialize-player";
import { ClubBadge } from "@/components/ClubBadge";
import { Toast } from "@/components/Toast";
import { useToast } from "@/lib/use-toast";
import { AddPlayerModal } from "./AddPlayerModal";
import { RemovePlayerDialog } from "./RemovePlayerDialog";
import { AddPlayerChoiceModal } from "./AddPlayerChoiceModal";
import { CreatePlayerModal } from "./CreatePlayerModal";

type SortKey =
  | "fullName"
  | "position"
  | "realClub"
  | "nationality"
  | "playerId";

const PAGE_SIZE = 10;

export function PlayerListClient({
  initialSquad,
  clubName,
  clubId,
  readOnly = false,
  adminCanRemove = false,
}: {
  initialSquad: PlayerDTO[];
  clubName: string;
  clubId: string;
  readOnly?: boolean;
  adminCanRemove?: boolean;
}) {
  const router = useRouter();

  const [squad, setSquad] = useState<PlayerDTO[]>(initialSquad);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("fullName");
  const [page, setPage] = useState(1);

  const [showAddChoice, setShowAddChoice] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  const [pendingRemoval, setPendingRemoval] =
    useState<PlayerDTO | null>(null);

  const [adminRemoving, setAdminRemoving] = useState(false);
  const [registrationLocked, setRegistrationLocked] = useState(false);

  const { toast, showSuccess, showError, dismiss } = useToast();

  useEffect(() => {
    fetch("/api/system/registration-lock")
      .then((res) => res.json())
      .then((data) => {
        if (data.locked !== undefined) {
          setRegistrationLocked(Boolean(data.locked));
        }
      })
      .catch(() => {});
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    const rows = q
      ? squad.filter(
          (p) =>
            p.fullName.toLowerCase().includes(q) ||
            p.position.toLowerCase().includes(q) ||
            p.realClub.toLowerCase().includes(q) ||
            p.nationality.toLowerCase().includes(q) ||
            String(p.playerId).includes(q)
        )
      : squad;

    return [...rows].sort((a, b) => {
      if (sortKey === "playerId") {
        return a.playerId - b.playerId;
      }

      return String(a[sortKey]).localeCompare(String(b[sortKey]));
    });
  }, [squad, search, sortKey]);

  const totalPages = Math.max(
    1,
    Math.ceil(filtered.length / PAGE_SIZE)
  );

  const pageRows = filtered.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE
  );

  function handleCreated(player: PlayerDTO) {
    setSquad((prev) => [...prev, player]);

    showSuccess(
      `${player.fullName} has been added to ${clubName}.`
    );

    router.refresh();
  }

  function handleRemoved(playerId: string) {
    const player = squad.find((p) => p.id === playerId);

    setSquad((prev) =>
      prev.filter((p) => p.id !== playerId)
    );

    if (player) {
      showSuccess(
        `${player.fullName} has been removed from the squad.`
      );
    }

    setPendingRemoval(null);
    router.refresh();
  }

  async function handleAdminRemove(player: PlayerDTO) {
    setAdminRemoving(true);

    try {
      const res = await fetch(
        `/api/admin/clubs/${encodeURIComponent(
          clubId
        )}/players/${encodeURIComponent(player.id)}`,
        {
          method: "DELETE",
        }
      );

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        showError(
          data?.error ??
            "Could not remove this player from the club."
        );
        return;
      }

      setSquad((prev) =>
        prev.filter((p) => p.id !== player.id)
      );

      setPendingRemoval(null);

      showSuccess(
        `${player.fullName} has been removed from ${clubName}.`
      );

      router.refresh();
    } catch (error) {
      console.error("Admin remove player failed:", error);

      showError(
        "Network error. Please try again."
      );
    } finally {
      setAdminRemoving(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Registration Locked Warning Banner */}
      {registrationLocked && !readOnly && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-950/30 border border-red-500/40 text-red-300 text-xs shadow-md">
          <span className="text-xl">🔒</span>
          <div>
            <p className="font-bold text-red-200">
              Player Registrations & Additions are FROZEN
            </p>
            <p className="text-gray-400 mt-0.5">
              The player registration window is currently closed by PMB League Administration. You cannot add or register new players at this time.
            </p>
          </div>
        </div>
      )}

      {/* Search / controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <input
          type="search"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder={
            readOnly
              ? "Search players..."
              : "Search your squad..."
          }
          className="pmb-input sm:max-w-xs"
        />

        <div className="flex items-center gap-3">
          <select
            value={sortKey}
            onChange={(e) =>
              setSortKey(e.target.value as SortKey)
            }
            className="pmb-input w-auto"
          >
            <option value="fullName">
              Sort: Name
            </option>

            <option value="position">
              Sort: Position
            </option>

            <option value="realClub">
              Sort: Real Club
            </option>

            <option value="nationality">
              Sort: Nationality
            </option>

            <option value="playerId">
              Sort: Player ID
            </option>
          </select>

          <Link
            href="/manager/scouting"
            className="flex items-center gap-1.5 rounded-lg border border-pmb-gold/40 bg-pmb-gold/15 px-3 py-2 text-xs font-bold text-pmb-gold hover:bg-pmb-gold hover:text-black transition whitespace-nowrap"
          >
            <span>🤖</span>
            <span>AI Squad Audit</span>
          </Link>

          {!readOnly && (
            registrationLocked ? (
              <button
                type="button"
                disabled
                className="whitespace-nowrap rounded-lg border border-red-500/40 bg-red-500/15 px-3.5 py-2 text-xs font-bold text-red-300 opacity-75 cursor-not-allowed flex items-center gap-1.5 shadow-sm"
                title="Player registrations are currently locked by administration"
              >
                <span>🔒</span>
                <span>Registrations Locked</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowAddChoice(true)}
                className="pmb-btn-primary whitespace-nowrap"
              >
                Add Player
              </button>
            )
          )}
        </div>
      </div>

      {/* Empty state */}
      {squad.length === 0 ? (
        <div className="pmb-card flex flex-col items-center justify-center gap-4 px-6 py-16 text-center">
          <p className="text-gray-400">
            {readOnly
              ? "No players registered to this club."
              : "No registered players."}
          </p>

          {!readOnly && (
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="pmb-btn-primary"
            >
              Add Player
            </button>
          )}
        </div>
      ) : (
        /* Player table */
        <div className="pmb-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-pmb-border bg-pmb-charcoal/60 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3">
                    Player
                  </th>

                  <th className="px-4 py-3">
                    Position
                  </th>

                  <th className="px-4 py-3">
                    Real Club
                  </th>

                  <th className="px-4 py-3">
                    Nationality
                  </th>

                  {readOnly && (
                    <th className="px-4 py-3">
                      Status
                    </th>
                  )}

                  <th className="px-4 py-3">
                    Player ID
                  </th>

                  {/* Manager OR admin can see actions */}
                  {(!readOnly || adminCanRemove) && (
                    <th className="px-4 py-3 text-right">
                      Action
                    </th>
                  )}
                </tr>
              </thead>

              <tbody className="divide-y divide-pmb-border">
                {pageRows.map((player) => (
                  <tr
                    key={player.id}
                    className="hover:bg-pmb-charcoal/40"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <ClubBadge
                          name={player.fullName}
                          size="sm"
                        />

                        <span className="font-medium text-white">
                          {player.fullName}
                        </span>
                      </div>
                    </td>

                    <td className="px-4 py-3 text-gray-300">
                      {player.position}
                    </td>

                    <td className="px-4 py-3 text-gray-300">
                      {player.realClub}
                    </td>

                    <td className="px-4 py-3 text-gray-300">
                      {player.nationality}
                    </td>

                    {readOnly && (
                      <td className="px-4 py-3">
                        <span className="pmb-badge">
                          {player.status === "REGISTERED"
                            ? "Registered"
                            : "Available"}
                        </span>
                      </td>
                    )}

                    <td className="px-4 py-3 font-mono text-gray-400">
                      #{player.playerId}
                    </td>

                    {/* ACTION */}
                    {(!readOnly || adminCanRemove) && (
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() =>
                            setPendingRemoval(player)
                          }
                          className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-400 transition hover:bg-red-500/20"
                        >
                          Remove
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-pmb-border px-4 py-3 text-sm text-gray-400">
              <span>
                Page {page} of {totalPages}
              </span>

              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() =>
                    setPage((p) => p - 1)
                  }
                  className="pmb-btn-secondary px-3 py-1.5 text-xs disabled:opacity-30"
                >
                  Previous
                </button>

                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() =>
                    setPage((p) => p + 1)
                  }
                  className="pmb-btn-secondary px-3 py-1.5 text-xs disabled:opacity-30"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Manager: Add Player Choice */}
      {!readOnly && showAddChoice && (
        <AddPlayerChoiceModal
          onClose={() =>
            setShowAddChoice(false)
          }
          onExisting={() => {
            setShowAddChoice(false);
            setShowAddModal(true);
          }}
          onNew={() => {
            setShowAddChoice(false);
            setShowCreateModal(true);
          }}
        />
      )}

      {/* Manager: Existing Player */}
      {!readOnly && showAddModal && (
        <AddPlayerModal
          clubId={clubId}
          clubName={clubName}
          onClose={() =>
            setShowAddModal(false)
          }
          onRegistered={handleCreated}
          onError={showError}
        />
      )}

      {/* Manager: Create Player */}
      {!readOnly && showCreateModal && (
        <CreatePlayerModal
          clubName={clubName}
          onClose={() =>
            setShowCreateModal(false)
          }
          onCreated={handleCreated}
          onError={showError}
        />
      )}

      {/* Manager removal dialog */}
      {!readOnly && pendingRemoval && (
        <RemovePlayerDialog
          player={pendingRemoval}
          onClose={() =>
            setPendingRemoval(null)
          }
          onRemoved={handleRemoved}
          onError={showError}
        />
      )}

      {/* ADMIN removal dialog */}
      {readOnly &&
        adminCanRemove &&
        pendingRemoval && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm"
            onClick={() =>
              !adminRemoving &&
              setPendingRemoval(null)
            }
          >
            <div
              className="pmb-card w-full max-w-md p-6"
              onClick={(e) =>
                e.stopPropagation()
              }
            >
              <div className="text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-red-500/30 bg-red-500/10">
                  <span className="text-xl text-red-400">
                    !
                  </span>
                </div>

                <h3 className="mt-4 text-lg font-semibold text-white">
                  Remove player from club?
                </h3>

                <p className="mt-2 text-sm text-gray-400">
                  You are about to remove{" "}
                  <span className="font-semibold text-white">
                    {pendingRemoval.fullName}
                  </span>{" "}
                  from{" "}
                  <span className="font-semibold text-pmb-gold">
                    {clubName}
                  </span>
                  .
                </p>

                <p className="mt-3 text-xs text-gray-500">
                  The player will become available
                  again and will no longer belong to
                  this club.
                </p>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  disabled={adminRemoving}
                  onClick={() =>
                    setPendingRemoval(null)
                  }
                  className="pmb-btn-secondary"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={adminRemoving}
                  onClick={() =>
                    handleAdminRemove(
                      pendingRemoval
                    )
                  }
                  className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-400 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {adminRemoving
                    ? "Removing..."
                    : "Remove Player"}
                </button>
              </div>
            </div>
          </div>
        )}

      <Toast
        toast={toast}
        onDismiss={dismiss}
      />
    </div>
  );
}