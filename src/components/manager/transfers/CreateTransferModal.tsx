"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { PlayerDTO } from "@/lib/serialize-player";
import { TransferDTO } from "@/lib/serialize-transfer";
import { searchPlayers, fetchMyClubPlayers, createTransferRequest, TransferApiError } from "@/lib/transfer-client";
import { ClubBadge } from "@/components/ClubBadge";
import { Skeleton } from "@/components/Skeleton";

function defaultSeason() {
  const year = new Date().getFullYear();
  return `${year}/${year + 1}`;
}

export function CreateTransferModal({
  clubId,
  clubName,
  windowOpen,
  onClose,
  onCreated,
  onError,
}: {
  clubId: string;
  clubName: string;
  windowOpen: boolean;
  onClose: () => void;
  onCreated: (transfer: TransferDTO) => void;
  onError: (message: string) => void;
}) {
  const [step, setStep] = useState<"search" | "form">("search");
  const [query, setQuery] = useState("");
  const [clubFilter, setClubFilter] = useState("");
  const [positionFilter, setPositionFilter] = useState("");
  const [nationalityFilter, setNationalityFilter] = useState("");
  const [minRatingFilter, setMinRatingFilter] = useState("");
  const [results, setResults] = useState<PlayerDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerDTO | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [season, setSeason] = useState(defaultSeason());
  const [type, setType] = useState<"PERMANENT" | "LOAN" | "SWAP" | "FREE_TRANSFER">("PERMANENT");
  const [fee, setFee] = useState("");
  const [currency, setCurrency] = useState("EUR");
  const [notes, setNotes] = useState("");
  const [swapSearch, setSwapSearch] = useState("");
  const [swapPlayers, setSwapPlayers] = useState<PlayerDTO[]>([]);
  const [selectedSwapPlayer, setSelectedSwapPlayer] = useState<PlayerDTO | null>(null);
  const [swapLoading, setSwapLoading] = useState(false);
  const [swapError, setSwapError] = useState<string | null>(null);
  const [loanDuration, setLoanDuration] = useState<"HALF_SEASON" | "SEASON" | "">("");
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [myBudget, setMyBudget] = useState<string | null>(null);

  useEffect(() => {
    // Display only - the server is the sole source of truth for whether a
    // transfer can actually be afforded, and that check only happens when
    // an Administrator completes the transfer, not here at request time.
    fetch("/api/manager/budget")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setMyBudget(data?.budget ?? null))
      .catch(() => setMyBudget(null));
  }, []);

  useEffect(() => {
    async function loadSwapPlayers() {
      setSwapLoading(true);
      setSwapError(null);
      try {
        const data = await fetchMyClubPlayers();
        setSwapPlayers(data.players);
      } catch (err) {
        setSwapError("Could not load your club players.");
      } finally {
        setSwapLoading(false);
      }
    }

    loadSwapPlayers();
  }, []);

  useEffect(() => {
    if (type !== "SWAP") {
      setSelectedSwapPlayer(null);
      setSwapSearch("");
    }

    if (type !== "LOAN") {
      setLoanDuration("");
    }
  }, [type]);

  const filteredSwapPlayers = swapPlayers.filter((player) => {
    const search = swapSearch.trim().toLowerCase();
    if (!search) return true;
    return (
      player.fullName.toLowerCase().includes(search) ||
      player.position.toLowerCase().includes(search) ||
      player.realClub.toLowerCase().includes(search)
    );
  });

  const hasAnyFilter = Boolean(
    query.trim() || clubFilter.trim() || positionFilter.trim() || nationalityFilter.trim() || minRatingFilter.trim()
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!hasAnyFilter) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        // A transfer only ever moves a player who is already Registered
        // to some other club - that's what makes it a transfer rather
        // than a fresh registration from the Available pool. `query` is
        // sent as `q` to reuse the existing full-text search on the API
        // (it already matches name/position/realClub/nationality/id);
        // club, position, nationality, and rating are then combined as
        // an AND filter on the client, since the API only supports a
        // single OR-style `q` term, not independent per-field filters.
        const data = await searchPlayers(query, { status: "REGISTERED", pageSize: "50" });

        const club = clubFilter.trim().toLowerCase();
        const position = positionFilter.trim().toLowerCase();
        const nationality = nationalityFilter.trim().toLowerCase();
        const minRating = minRatingFilter.trim() ? Number(minRatingFilter) : null;

        const filtered = data.players.filter((p) => {
          if (p.pmbClubId === clubId) return false; // never offer to "transfer" your own player to yourself
          if (club && !p.realClub.toLowerCase().includes(club) && !(p.pmbClubName ?? "").toLowerCase().includes(club)) {
            return false;
          }
          if (position && !p.position.toLowerCase().includes(position)) return false;
          if (nationality && !p.nationality.toLowerCase().includes(nationality)) return false;
          if (minRating != null && (p.overallRating == null || p.overallRating < minRating)) return false;
          return true;
        });

        setResults(filtered);
      } catch (err) {
        onError(err instanceof TransferApiError ? err.message : "Player search failed. Please try again.");
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, clubFilter, positionFilter, nationalityFilter, minRatingFilter, clubId]);

  function clearFilters() {
    setQuery("");
    setClubFilter("");
    setPositionFilter("");
    setNationalityFilter("");
    setMinRatingFilter("");
  }

  function pickPlayer(player: PlayerDTO) {
    setSelectedPlayer(player);
    setStep("form");
    setFormError(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!selectedPlayer) return;
    setFormError(null);

    if (!season.trim()) {
      setFormError("Season is required.");
      return;
    }
    if (fee && (Number.isNaN(Number(fee)) || Number(fee) < 0)) {
      setFormError("Fee must be a non-negative number.");
      return;
    }
    if (type === "SWAP" && !selectedSwapPlayer) {
      setFormError("Select a swap player from your own squad for a swap transfer.");
      return;
    }
    if (type === "LOAN" && !loanDuration) {
      setFormError("Choose either half season or full season for a loan transfer.");
      return;
    }

    setSubmitting(true);
    try {
      const { transfer } = await createTransferRequest({
      playerId: selectedPlayer.id,
      toClubId: clubId,
      season: season.trim(),
      type,
      fee: fee ? Number(fee) : undefined,
      currency,
      notes: notes.trim() || undefined,
      swapPlayerName: type === "SWAP" ? selectedSwapPlayer?.fullName?.trim() || undefined : undefined,
      durationDays:
        type === "LOAN"
          ? loanDuration === "HALF_SEASON"
            ? 20
            : 40
          : undefined,
    });
      onCreated(transfer);
      onClose();
    } catch (err) {
      const message = err instanceof TransferApiError ? err.message : "Network error. Please try again.";
      setFormError(message);
      onError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-black/70 px-4 py-10 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="pmb-card w-full max-w-2xl p-6 overflow-auto max-h-[calc(100vh-4rem)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">
            {step === "search" ? "Request a Transfer" : "Transfer Details"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-2xl leading-none text-gray-500 hover:text-white"
          >
            &times;
          </button>
        </div>

        {!windowOpen && (
          <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2.5 text-sm text-red-400">
            The transfer window is closed. You can browse players, but requests can&apos;t be submitted
            until an Administrator opens the window.
          </div>
        )}

        {step === "search" && (
          <>
            <input
              autoFocus
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search a player by name, position, real club, nationality, or ID..."
              className="pmb-input"
            />

            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <input
                type="text"
                value={clubFilter}
                onChange={(e) => setClubFilter(e.target.value)}
                placeholder="Club"
                className="pmb-input text-sm"
              />
              <input
                type="text"
                value={positionFilter}
                onChange={(e) => setPositionFilter(e.target.value)}
                placeholder="Position"
                className="pmb-input text-sm"
              />
              <input
                type="text"
                value={nationalityFilter}
                onChange={(e) => setNationalityFilter(e.target.value)}
                placeholder="Nationality"
                className="pmb-input text-sm"
              />
              <input
                type="number"
                min={0}
                max={99}
                value={minRatingFilter}
                onChange={(e) => setMinRatingFilter(e.target.value)}
                placeholder="Min rating"
                className="pmb-input text-sm"
              />
            </div>

            {hasAnyFilter && (
              <div className="mt-2 flex justify-end">
                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-xs text-gray-400 underline hover:text-white"
                >
                  Clear filters
                </button>
              </div>
            )}

            <div className="mt-4 max-h-96 space-y-2 overflow-y-auto">
              {loading && (
                <div className="space-y-2" aria-busy="true" aria-label="Searching players">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 rounded-lg border border-pmb-border bg-pmb-charcoal/60 p-3"
                    >
                      <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-3 w-1/3" />
                        <Skeleton className="h-2.5 w-1/2" />
                      </div>
                      <Skeleton className="h-6 w-14 shrink-0 rounded-md" />
                    </div>
                  ))}
                </div>
              )}

              {!loading && !hasAnyFilter && (
                <p className="py-6 text-center text-sm text-gray-500">
                  Search by name or use the filters above to browse players from other clubs.
                </p>
              )}

              {!loading && hasAnyFilter && results.length === 0 && (
                <p className="py-6 text-center text-sm text-gray-500">
                  No transferable players match those filters. Players must be registered to another PMB
                  club.
                </p>
              )}

              {!loading &&
                results.map((player) => (
                  <button
                    key={player.id}
                    type="button"
                    onClick={() => pickPlayer(player)}
                    className="flex w-full items-center justify-between gap-4 rounded-lg border border-pmb-border bg-pmb-charcoal/60 p-3 text-left transition hover:border-pmb-gold/50"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <ClubBadge name={player.fullName} size="sm" />
                      <div className="min-w-0">
                        <p className="truncate font-medium text-white">{player.fullName}</p>
                        <p className="truncate text-xs text-gray-500">
                          {player.position} &middot; {player.realClub} &middot; {player.nationality}
                          {player.overallRating != null && ` · ${player.overallRating} OVR`} &middot; #
                          {player.playerId}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-pmb-gold">
                          Currently at {player.pmbClubName ?? "another club"}
                        </p>
                      </div>
                    </div>
                    <span className="pmb-btn-secondary shrink-0 px-3 py-1.5 text-xs">Select</span>
                  </button>
                ))}
            </div>
          </>
        )}

        {step === "form" && selectedPlayer && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center gap-3 rounded-lg border border-pmb-border bg-pmb-charcoal/60 p-3">
              <ClubBadge name={selectedPlayer.fullName} size="sm" />
              <div className="min-w-0">
                <p className="truncate font-medium text-white">{selectedPlayer.fullName}</p>
                <p className="truncate text-xs text-gray-500">
                  From {selectedPlayer.pmbClubName} to {clubName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setStep("search");
                  setSelectedPlayer(null);
                }}
                className="ml-auto shrink-0 text-xs text-gray-400 underline hover:text-white"
              >
                Change
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="pmb-label">Season</label>
                <input
                  required
                  value={season}
                  onChange={(e) => setSeason(e.target.value)}
                  className="pmb-input"
                  placeholder="2025/2026"
                />
              </div>
              <div>
                <label className="pmb-label">Type</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as typeof type)}
                  className="pmb-input"
                >
                  <option value="PERMANENT">Permanent</option>
                  <option value="LOAN">Loan</option>
                  <option value="SWAP">Swap</option>
                  <option value="FREE_TRANSFER">Free Transfer</option>
                </select>
              </div>
              <div>
                <label className="pmb-label">Fee {type === "FREE_TRANSFER" && "(n/a)"}</label>
                {myBudget != null && (
                  <p className="mb-1 text-xs text-gray-500">
                    Your budget:{" "}
                    {new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(
                      Number(myBudget)
                    )}
                  </p>
                )}
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  disabled={type === "FREE_TRANSFER"}
                  value={fee}
                  onChange={(e) => setFee(e.target.value)}
                  className="pmb-input disabled:opacity-40"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="pmb-label">Currency</label>
                <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="pmb-input">
                  <option value="EUR">EUR</option>
                  <option value="USD">USD</option>
                  <option value="GBP">GBP</option>
                </select>
              </div>
            </div>

            {type === "SWAP" && (
              <div className="space-y-3">
                <label className="pmb-label">Swap from your squad</label>
                <p className="text-sm text-gray-400">
                  Select one of your current club players to offer in exchange.
                </p>

                <input
                  type="search"
                  value={swapSearch}
                  onChange={(e) => setSwapSearch(e.target.value)}
                  className="pmb-input"
                  placeholder="Search your squad by name, position, or club..."
                />

                <div className="rounded-lg border border-pmb-border bg-pmb-charcoal/60 p-3">
                  {swapLoading ? (
                    <p className="text-sm text-gray-400">Loading your club players…</p>
                  ) : swapError ? (
                    <p className="text-sm text-red-400">{swapError}</p>
                  ) : selectedSwapPlayer ? (
                    <div className="flex items-center justify-between gap-3 rounded-lg border border-pmb-border bg-pmb-charcoal/70 p-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-white">{selectedSwapPlayer.fullName}</p>
                        <p className="truncate text-xs text-gray-500">
                          {selectedSwapPlayer.position} · {selectedSwapPlayer.realClub} · {selectedSwapPlayer.nationality}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedSwapPlayer(null)}
                        className="pmb-btn-secondary px-3 py-1.5 text-xs"
                      >
                        Change
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filteredSwapPlayers.length === 0 ? (
                        <p className="text-sm text-gray-400">
                          No players from your club match that search. Try a different name or position.
                        </p>
                      ) : (
                        <div className="max-h-56 space-y-2 overflow-y-auto">
                          {filteredSwapPlayers.map((player) => (
                            <button
                              key={player.id}
                              type="button"
                              onClick={() => setSelectedSwapPlayer(player)}
                              className="flex w-full items-center justify-between gap-3 rounded-lg border border-pmb-border bg-pmb-charcoal/60 p-3 text-left transition hover:border-pmb-gold/50"
                            >
                              <div className="min-w-0">
                                <p className="truncate font-medium text-white">{player.fullName}</p>
                                <p className="truncate text-xs text-gray-500">
                                  {player.position} · {player.realClub}
                                </p>
                              </div>
                              <span className="pmb-btn-secondary shrink-0 px-3 py-1.5 text-xs">Select</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {type === "LOAN" && (
              <div>
                <label className="pmb-label">Loan Duration</label>
                <select
                  required
                  value={loanDuration}
                  onChange={(e) => setLoanDuration(e.target.value as "HALF_SEASON" | "SEASON" | "")}
                  className="pmb-input"
                >
                  <option value="">Select duration</option>
                  <option value="HALF_SEASON">Half season</option>
                  <option value="SEASON">Season</option>
                </select>
              </div>
            )}

            <div>
              <label className="pmb-label">Notes (optional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="pmb-input"
                placeholder="Add any context for the selling club..."
              />
            </div>

            {formError && (
              <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2.5 text-sm text-red-400">
                {formError}
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button type="button" onClick={onClose} className="pmb-btn-secondary">
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !windowOpen}
                className="pmb-btn-primary"
                title={!windowOpen ? "The transfer window is closed" : undefined}
              >
                {submitting ? "Submitting..." : "Submit Request"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
