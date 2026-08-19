"use client";

import { useState, useEffect, useCallback } from "react";
import { ClubBadge } from "@/components/ClubBadge";

type Player = {
  id: string;
  fullName: string;
  photo: string | null;
  position: string;
  realClub: string;
  nationality: string;
  overallRating: number | null;
  marketValue: string | number | null;
};

type Auction = {
  id: string;
  playerId: string;
  startingPrice: string | number;
  minIncrement: string | number;
  currentBid: string | number;
  currentWinnerClubId: string | null;
  status: "ACTIVE" | "COMPLETED" | "CANCELLED" | "EXPIRED";
  startsAt: string;
  expiresAt: string;
  player: Player;
  currentWinnerClub: { id: string; name: string; logo: string | null } | null;
  _count?: { bids: number };
};

export function AdminAuctionManager() {
  const [activeAuctions, setActiveAuctions] = useState<Auction[]>([]);
  const [recentAuctions, setRecentAuctions] = useState<Auction[]>([]);
  const [availablePlayers, setAvailablePlayers] = useState<Player[]>([]);
  const [search, setSearch] = useState("");
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [startingPrice, setStartingPrice] = useState("10000000");
  const [minIncrement, setMinIncrement] = useState("500000");
  const [durationMinutes, setDurationMinutes] = useState("15");
  const [isCreating, setIsCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchAuctions = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/auctions");
      if (res.ok) {
        const data = await res.json();
        setActiveAuctions(data.activeAuctions || []);
        setRecentAuctions(data.recentAuctions || []);
      }
    } catch (err) {
      console.error("Error fetching auctions:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAvailablePlayers = useCallback(async (query = "") => {
    try {
      const res = await fetch(`/api/admin/auctions/available-players?search=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        setAvailablePlayers(data.players || []);
      }
    } catch (err) {
      console.error("Error loading players:", err);
    }
  }, []);

  useEffect(() => {
    fetchAuctions();
    fetchAvailablePlayers();
    const interval = setInterval(fetchAuctions, 4000);
    return () => clearInterval(interval);
  }, [fetchAuctions, fetchAvailablePlayers]);

  const handleSearchChange = (val: string) => {
    setSearch(val);
    fetchAvailablePlayers(val);
  };

  const handleCreateAuction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlayer) {
      setError("Please select a player to auction.");
      return;
    }

    setIsCreating(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/admin/auctions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerId: selectedPlayer.id,
          startingPrice: Number(startingPrice),
          minIncrement: Number(minIncrement),
          durationMinutes: Number(durationMinutes),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create auction");

      setSuccess(`Live auction for ${selectedPlayer.fullName} launched successfully!`);
      setSelectedPlayer(null);
      fetchAuctions();
      fetchAvailablePlayers(search);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error creating auction");
    } finally {
      setIsCreating(false);
    }
  };

  const handleFinalize = async (auctionId: string, action: "FINALIZE" | "CANCEL") => {
    setActionLoading(auctionId);
    setError(null);
    try {
      const res = await fetch(`/api/admin/auctions/${auctionId}/finalize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      if (!res.ok) throw new Error("Action failed");
      fetchAuctions();
      fetchAvailablePlayers(search);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* ─── TITLE & ACTIONS ────────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2">
          <span className="flex h-3 w-3 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
          </span>
          <p className="text-xs font-bold uppercase tracking-[.25em] text-pmb-gold">
            Administration Operations
          </p>
        </div>
        <h1 className="mt-1 text-3xl font-black uppercase tracking-tight text-white sm:text-4xl">
          Live Free Agent Auction Hub
        </h1>
        <p className="mt-1 text-sm text-gray-400">
          Launch and manage real-time bidding wars for unattached star players.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm font-semibold text-red-400">
          ⚠️ {error}
        </div>
      )}
      {success && (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm font-semibold text-emerald-400">
          ✅ {success}
        </div>
      )}

      {/* ─── CREATE AUCTION SECTION ─────────────────────────────────── */}
      <section className="pmb-card p-6">
        <h2 className="text-xl font-bold uppercase tracking-wide text-white mb-4">
          🚀 Launch New Player Auction
        </h2>

        <form onSubmit={handleCreateAuction} className="space-y-6">
          {/* Step 1: Select Player */}
          <div>
            <label className="pmb-label">1. Choose Free Agent Player</label>
            <input
              type="text"
              placeholder="Search available players by name, club, or position..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pmb-input mb-3"
            />

            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 max-h-60 overflow-y-auto p-1">
              {availablePlayers.map((p) => {
                const isSelected = selectedPlayer?.id === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedPlayer(p)}
                    className={`flex flex-col items-center rounded-xl border p-2.5 text-center transition ${
                      isSelected
                        ? "border-pmb-gold bg-pmb-gold/20 shadow-gold"
                        : "border-pmb-border bg-black/40 hover:border-white/30"
                    }`}
                  >
                    {p.photo ? (
                      <img src={p.photo} alt="" className="h-12 w-12 object-contain" />
                    ) : (
                      <div className="h-12 w-12 rounded-full bg-pmb-charcoal flex items-center justify-center text-lg">
                        ⚽
                      </div>
                    )}
                    <span className="mt-1 font-bold text-xs text-white line-clamp-1">
                      {p.fullName}
                    </span>
                    <span className="text-[10px] text-pmb-gold font-semibold">
                      OVR: {p.overallRating ?? 85} · {p.position}
                    </span>
                  </button>
                );
              })}
            </div>
            {selectedPlayer && (
              <p className="mt-2 text-xs text-emerald-400 font-bold">
                Selected: {selectedPlayer.fullName} ({selectedPlayer.position} - {selectedPlayer.realClub})
              </p>
            )}
          </div>

          {/* Step 2: Auction Parameters */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="pmb-label">Starting Price (€)</label>
              <input
                type="number"
                value={startingPrice}
                onChange={(e) => setStartingPrice(e.target.value)}
                className="pmb-input"
                min="500000"
                step="500000"
                required
              />
            </div>
            <div>
              <label className="pmb-label">Min Increment (€)</label>
              <input
                type="number"
                value={minIncrement}
                onChange={(e) => setMinIncrement(e.target.value)}
                className="pmb-input"
                min="100000"
                step="100000"
                required
              />
            </div>
            <div>
              <label className="pmb-label">Duration</label>
              <select
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
                className="pmb-input"
              >
                <option value="5">5 Minutes (Flash Auction)</option>
                <option value="15">15 Minutes</option>
                <option value="60">1 Hour</option>
                <option value="1440">24 Hours</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={isCreating || !selectedPlayer}
            className="pmb-btn-primary w-full py-3 font-bold text-base disabled:opacity-40"
          >
            {isCreating ? "Launching Auction..." : "Start Live Auction Now 🔥"}
          </button>
        </form>
      </section>

      {/* ─── ACTIVE AUCTIONS MONITOR ────────────────────────────────── */}
      <section>
        <h2 className="text-xl font-bold uppercase tracking-wide text-white mb-4">
          ⚡ Currently Active Bidding Wars ({activeAuctions.length})
        </h2>

        {activeAuctions.length === 0 ? (
          <div className="pmb-card p-10 text-center text-sm text-gray-400">
            No live auctions currently running. Use the form above to start one.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {activeAuctions.map((a) => (
              <div key={a.id} className="pmb-card p-6 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {a.player.photo ? (
                        <img src={a.player.photo} alt="" className="h-16 w-16 object-contain" />
                      ) : (
                        <div className="h-16 w-16 rounded-full bg-black/60 flex items-center justify-center text-3xl">
                          ⚽
                        </div>
                      )}
                      <div>
                        <h3 className="text-xl font-black text-white">{a.player.fullName}</h3>
                        <p className="text-xs text-pmb-gold font-bold">
                          {a.player.position} · OVR {a.player.overallRating ?? 85} · {a.player.realClub}
                        </p>
                      </div>
                    </div>

                    <span className="rounded bg-red-500/20 px-2.5 py-1 text-xs font-bold uppercase text-red-400">
                      Active
                    </span>
                  </div>

                  {/* Bid status */}
                  <div className="mt-6 grid grid-cols-2 gap-3 rounded-xl bg-black/40 p-4">
                    <div>
                      <span className="text-[10px] uppercase tracking-widest text-gray-400 block">
                        Highest Bid
                      </span>
                      <span className="text-2xl font-black text-white">
                        €{Number(a.currentBid).toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase tracking-widest text-gray-400 block">
                        Leader
                      </span>
                      <div className="flex items-center gap-1.5 mt-1">
                        {a.currentWinnerClub && (
                          <ClubBadge
                            name={a.currentWinnerClub.name}
                            logo={a.currentWinnerClub.logo}
                            size="xs"
                          />
                        )}
                        <span className="font-bold text-sm text-pmb-gold">
                          {a.currentWinnerClub?.name || "No bids"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Controls */}
                <div className="mt-6 flex gap-2 border-t border-pmb-border pt-4">
                  <button
                    type="button"
                    disabled={actionLoading === a.id}
                    onClick={() => handleFinalize(a.id, "FINALIZE")}
                    className="pmb-btn-primary flex-1 py-2 text-xs font-bold"
                  >
                    End & Award Winner 🏆
                  </button>
                  <button
                    type="button"
                    disabled={actionLoading === a.id}
                    onClick={() => handleFinalize(a.id, "CANCEL")}
                    className="pmb-btn-secondary py-2 text-xs font-bold text-red-400 hover:text-red-300"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
