"use client";

import { useEffect, useRef, useState } from "react";
import { PlayerDTO } from "@/lib/serialize-player";
import { ClubBadge } from "@/components/ClubBadge";

export function AddPlayerModal({
  clubId,
  clubName,
  onClose,
  onRegistered,
  onError,
}: {
  clubId: string;
  clubName: string;
  onClose: () => void;
  onRegistered: (player: PlayerDTO) => void;
  onError: (message: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlayerDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [pendingConfirm, setPendingConfirm] = useState<PlayerDTO | null>(null);
  const [registering, setRegistering] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!query.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/players/search?q=${encodeURIComponent(query)}&pageSize=15`);
        if (res.ok) {
          const data = await res.json();
          setResults(data.players as PlayerDTO[]);
        }
      } finally {
        setLoading(false);
      }
    }, 250); // fast, but debounced so every keystroke doesn't hit the DB

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  async function confirmRegistration(player: PlayerDTO) {
    setRegistering(true);
    try {
      const res = await fetch("/api/manager/players/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId: player.id }),
      });
      const data = await res.json();

      if (!res.ok) {
        onError(data.error ?? "Could not register this player.");
        // Re-run the search so the list reflects reality (e.g. the player
        // another manager just grabbed now shows as Registered).
        setQuery((q) => q + "");
        setResults((prev) =>
          prev.map((p) => (p.id === player.id ? { ...p, status: "REGISTERED" } : p))
        );
        setPendingConfirm(null);
        return;
      }

      onRegistered({ ...player, status: "REGISTERED", pmbClubId: clubId, pmbClubName: clubName });
      onClose();
    } catch {
      onError("Network error. Please try again.");
    } finally {
      setRegistering(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-start justify-center bg-black/70 px-4 py-10 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="pmb-card w-full max-w-2xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Add Player</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-2xl leading-none text-gray-500 hover:text-white"
          >
            &times;
          </button>
        </div>

        <input
          autoFocus
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, position, real club, nationality, or player ID..."
          className="pmb-input"
        />

        <div className="mt-4 max-h-96 space-y-2 overflow-y-auto">
          {loading && <p className="py-6 text-center text-sm text-gray-500">Searching...</p>}

          {!loading && query.trim() && results.length === 0 && (
            <p className="py-6 text-center text-sm text-gray-500">No players found.</p>
          )}

          {!loading &&
            results.map((player) => {
              const isRegistered = player.status === "REGISTERED";
              return (
                <div
                  key={player.id}
                  className="flex items-center justify-between gap-4 rounded-lg border border-pmb-border bg-pmb-charcoal/60 p-3"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <ClubBadge name={player.fullName} size="sm" />
                    <div className="min-w-0">
                      <p className="truncate font-medium text-white">{player.fullName}</p>
                      <p className="truncate text-xs text-gray-500">
                        {player.position} &middot; {player.realClub} &middot; {player.nationality} &middot; #
                        {player.playerId}
                      </p>
                      {isRegistered && (
                        <p className="mt-0.5 text-xs font-medium text-red-400">
                          Already registered to {player.pmbClubName ?? "another club"}
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={isRegistered}
                    onClick={() => setPendingConfirm(player)}
                    className="pmb-btn-primary shrink-0 px-3 py-1.5 text-xs"
                  >
                    {isRegistered ? "Unavailable" : "Add"}
                  </button>
                </div>
              );
            })}
        </div>
      </div>

      {pendingConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
          onClick={() => !registering && setPendingConfirm(null)}
        >
          <div className="pmb-card w-full max-w-sm p-6 text-center" onClick={(e) => e.stopPropagation()}>
            <p className="text-white">
              Register <span className="font-semibold text-pmb-gold">{pendingConfirm.fullName}</span> to{" "}
              <span className="font-semibold">{clubName}</span>?
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <button
                type="button"
                disabled={registering}
                onClick={() => setPendingConfirm(null)}
                className="pmb-btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={registering}
                onClick={() => confirmRegistration(pendingConfirm)}
                className="pmb-btn-primary"
              >
                {registering ? "Registering..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
