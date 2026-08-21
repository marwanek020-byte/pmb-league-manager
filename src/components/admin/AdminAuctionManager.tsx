"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { ClubBadge } from "@/components/ClubBadge";

type PlayerMatch = {
  id: string;
  fullName: string;
  position: string;
  overallRating: number;
  nationality: string;
  realClub: string;
  marketValue: number;
  photo: string | null;
  status: string;
  hasClub: boolean;
  pmbClub: {
    id: string;
    name: string;
    logo: string | null;
    leagueName?: string;
    managerUsername?: string;
  } | null;
  canAuction: boolean;
  statusReason: string;
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
  player: {
    id: string;
    fullName: string;
    position: string;
    overallRating: number | null;
    nationality: string;
    realClub: string;
    photo: string | null;
    marketValue: string | number | null;
  };
  currentWinnerClub: { id: string; name: string; logo: string | null } | null;
  _count?: { bids: number };
};

const POSITIONS = ["CF", "ST", "LWF", "RWF", "AMF", "CMF", "DMF", "CB", "LB", "RB", "GK"];

export function AdminAuctionManager() {
  const [activeAuctions, setActiveAuctions] = useState<Auction[]>([]);
  const [recentAuctions, setRecentAuctions] = useState<Auction[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Search & Verification State
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<PlayerMatch[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  // Selected Player / New Player State
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerMatch | null>(null);
  const [isNewPlayerMode, setIsNewPlayerMode] = useState(false);

  // New Player Form Fields
  const [newPlayerName, setNewPlayerName] = useState("");
  const [newPlayerPos, setNewPlayerPos] = useState("CF");
  const [newPlayerOvr, setNewPlayerOvr] = useState("80");
  const [newPlayerNat, setNewPlayerNat] = useState("Morocco");
  const [newPlayerRealClub, setNewPlayerRealClub] = useState("Free Agent");
  const [newPlayerPhoto, setNewPlayerPhoto] = useState("");

  // Auction Parameters
  const [startingPrice, setStartingPrice] = useState("10000000");
  const [minIncrement, setMinIncrement] = useState("500000");
  const [durationMinutes, setDurationMinutes] = useState("15");
  const [isCreating, setIsCreating] = useState(false);

  const searchTimerRef = useRef<NodeJS.Timeout | null>(null);

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

  useEffect(() => {
    fetchAuctions();
    const interval = setInterval(fetchAuctions, 4000);
    return () => clearInterval(interval);
  }, [fetchAuctions]);

  // Live Database Search & Verification
  const performSearch = async (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) {
      setSearchResults([]);
      setHasSearched(false);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/auctions/check-player?name=${encodeURIComponent(trimmed)}`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.matches || []);
        setHasSearched(true);
      }
    } catch (err) {
      console.error("Error verifying player:", err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchInputChange = (val: string) => {
    setSearchQuery(val);
    setSelectedPlayer(null);
    setIsNewPlayerMode(false);

    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
    }

    searchTimerRef.current = setTimeout(() => {
      performSearch(val);
    }, 300);
  };

  const handleSelectFreeAgent = (p: PlayerMatch) => {
    if (!p.canAuction) return;
    setSelectedPlayer(p);
    setIsNewPlayerMode(false);
    if (p.marketValue > 0) {
      setStartingPrice(p.marketValue.toString());
    }
  };

  const handleEnterNewPlayerMode = () => {
    setSelectedPlayer(null);
    setIsNewPlayerMode(true);
    setNewPlayerName(searchQuery.trim() || "New Star Player");
  };

  const handleCreateAuction = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Validation
    if (!selectedPlayer && !isNewPlayerMode) {
      setError("Please search and select a free agent, or enter new player creation mode.");
      return;
    }

    if (selectedPlayer && !selectedPlayer.canAuction) {
      setError(`Impossible: ${selectedPlayer.statusReason}`);
      return;
    }

    if (isNewPlayerMode && !newPlayerName.trim()) {
      setError("Player full name is required.");
      return;
    }

    setIsCreating(true);

    try {
      const payload: any = {
        startingPrice: Number(startingPrice),
        minIncrement: Number(minIncrement),
        durationMinutes: Number(durationMinutes),
      };

      if (selectedPlayer) {
        payload.playerId = selectedPlayer.id;
      } else if (isNewPlayerMode) {
        payload.newPlayer = {
          fullName: newPlayerName.trim(),
          position: newPlayerPos,
          overallRating: Number(newPlayerOvr) || 75,
          nationality: newPlayerNat.trim() || "Morocco",
          realClub: newPlayerRealClub.trim() || "Free Agent",
          photo: newPlayerPhoto.trim() || null,
        };
      }

      const res = await fetch("/api/admin/auctions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create auction");

      const launchedPlayerName = selectedPlayer?.fullName || newPlayerName.trim();
      setSuccess(`🎉 Live Auction for "${launchedPlayerName}" launched successfully!`);

      // Reset form
      setSelectedPlayer(null);
      setIsNewPlayerMode(false);
      setSearchQuery("");
      setSearchResults([]);
      setHasSearched(false);
      fetchAuctions();
    } catch (err: any) {
      setError(err.message || "Error creating auction");
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
    } catch (err: any) {
      setError(err.message || "Action failed");
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
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pmb-gold opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-pmb-gold"></span>
          </span>
          <p className="text-xs font-bold uppercase tracking-[.25em] text-pmb-gold">
            Administration Operations
          </p>
        </div>
        <h1 className="mt-1 text-3xl font-black uppercase tracking-tight text-white sm:text-4xl">
          Live Free Agent Auction Hub
        </h1>
        <p className="mt-1 text-sm text-gray-400">
          Verify database records, prevent club contract conflicts, or create and auction star players in real time.
        </p>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-500/50 bg-red-950/30 p-4 text-sm font-semibold text-red-300 flex items-center gap-3 shadow-lg">
          <span className="text-xl">⚠️</span>
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="rounded-2xl border border-emerald-500/50 bg-emerald-950/30 p-4 text-sm font-semibold text-emerald-300 flex items-center gap-3 shadow-lg">
          <span className="text-xl">✅</span>
          <span>{success}</span>
        </div>
      )}

      {/* ─── CREATE & VERIFY AUCTION SECTION ─────────────────────────── */}
      <section className="rounded-3xl border border-pmb-gold/40 bg-gradient-to-b from-[#111116] via-[#0b0b0e] to-black p-6 sm:p-8 shadow-2xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-black uppercase tracking-wide text-white flex items-center gap-2.5">
              <span>🚀 Launch New Player Auction</span>
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Step 1: Verify player in database • Step 2: Set auction terms • Step 3: Launch live bidding war
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleEnterNewPlayerMode}
              className={`rounded-xl border px-3.5 py-1.5 text-xs font-bold transition shadow-sm ${
                isNewPlayerMode
                  ? "border-pmb-gold bg-pmb-gold text-black"
                  : "border-pmb-gold/40 bg-pmb-gold/10 text-pmb-gold hover:bg-pmb-gold hover:text-black"
              }`}
            >
              ✨ Create Brand New Player
            </button>
          </div>
        </div>

        <form onSubmit={handleCreateAuction} className="space-y-6">
          {/* STEP 1: DATABASE LOOKUP & CONTRACT VERIFICATION */}
          <div className="space-y-3">
            <label className="text-xs font-extrabold uppercase tracking-wider text-pmb-gold flex items-center justify-between">
              <span>1. Player Search & Database Verification</span>
              {isSearching && <span className="text-gray-400 font-normal animate-pulse">Checking PostgreSQL database...</span>}
            </label>

            <div className="relative">
              <input
                type="text"
                placeholder="Type player name (e.g. 'Achraf Hakimi', 'Erling Haaland', 'Lamine Yamal')..."
                value={searchQuery}
                onChange={(e) => handleSearchInputChange(e.target.value)}
                className="pmb-input w-full pl-10 pr-4 py-3 text-sm rounded-2xl bg-black/60 border-white/20 focus:border-pmb-gold focus:ring-1 focus:ring-pmb-gold"
              />
              <span className="absolute left-3.5 top-3.5 text-gray-400 select-none text-base">🔍</span>
            </div>

            {/* LIVE VERIFICATION RESULTS */}
            {hasSearched && searchResults.length > 0 && !isNewPlayerMode && (
              <div className="space-y-2 mt-3">
                <p className="text-xs font-bold text-gray-400">Database Matches Found ({searchResults.length}):</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {searchResults.map((p) => {
                    const isSelected = selectedPlayer?.id === p.id;

                    return (
                      <div
                        key={p.id}
                        className={`rounded-2xl border p-4 transition shadow-md flex flex-col justify-between ${
                          p.hasClub
                            ? "border-red-500/50 bg-red-950/20 text-gray-300"
                            : isSelected
                            ? "border-pmb-gold bg-pmb-gold/20 shadow-[0_0_15px_rgba(212,175,55,0.3)]"
                            : "border-white/10 bg-black/60 hover:border-pmb-gold/60"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <h4 className="font-extrabold text-white text-sm">{p.fullName}</h4>
                              <span className="rounded bg-pmb-gold/20 border border-pmb-gold/40 px-1.5 py-0.2 text-[10px] font-black text-pmb-gold">
                                {p.position}
                              </span>
                            </div>
                            <p className="text-xs text-gray-400 mt-0.5">
                              {p.nationality} • {p.realClub}
                            </p>
                          </div>

                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-pmb-gold font-black text-black text-xs shadow">
                            {p.overallRating}
                          </div>
                        </div>

                        <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between">
                          {p.hasClub ? (
                            /* CONTRACTED TO CLUB: IMPOSSIBLE */
                            <div className="space-y-1 w-full">
                              <div className="flex items-center gap-1 text-[11px] font-black text-red-400 uppercase tracking-wider">
                                <span>🛑</span>
                                <span>IMPOSSIBLE TO AUCTION</span>
                              </div>
                              <p className="text-[10px] text-red-300 leading-tight">
                                Registered to <strong className="text-white">{p.pmbClub?.name}</strong> (@{p.pmbClub?.managerUsername || "Manager"}). Players under active contract cannot be auctioned.
                              </p>
                            </div>
                          ) : (
                            /* UNATTACHED FREE AGENT: ALLOWED */
                            <div className="flex items-center justify-between w-full">
                              <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                                <span>✓</span>
                                <span>Free Agent</span>
                              </span>
                              <button
                                type="button"
                                onClick={() => handleSelectFreeAgent(p)}
                                className={`rounded-lg px-3 py-1 text-xs font-bold transition ${
                                  isSelected
                                    ? "bg-pmb-gold text-black shadow"
                                    : "bg-white/10 text-white hover:bg-pmb-gold hover:text-black"
                                }`}
                              >
                                {isSelected ? "✓ Selected" : "Select"}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* NO PLAYERS FOUND IN DATABASE */}
            {hasSearched && searchResults.length === 0 && !isNewPlayerMode && (
              <div className="rounded-2xl border border-white/15 bg-black/60 p-5 text-center space-y-2">
                <p className="text-sm font-semibold text-gray-300">
                  🔍 No player named <strong className="text-pmb-gold">"{searchQuery}"</strong> found in the database.
                </p>
                <p className="text-xs text-gray-400">
                  You can create this player on the fly and immediately start the auction!
                </p>
                <button
                  type="button"
                  onClick={handleEnterNewPlayerMode}
                  className="mt-2 rounded-xl bg-pmb-gold px-4 py-2 text-xs font-black text-black hover:bg-white transition shadow-md"
                >
                  ✨ Create "{searchQuery}" & Start Auction
                </button>
              </div>
            )}

            {/* SELECTED FREE AGENT SUMMARY CARD */}
            {selectedPlayer && (
              <div className="rounded-2xl border border-emerald-500/50 bg-emerald-950/20 p-4 flex items-center justify-between gap-4 shadow-inner">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-300 text-xl font-bold">
                    ⚽
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">
                      ✓ Ready for Auction
                    </span>
                    <h3 className="text-base font-extrabold text-white">
                      {selectedPlayer.fullName} ({selectedPlayer.position} • {selectedPlayer.overallRating} OVR)
                    </h3>
                    <p className="text-xs text-gray-300">
                      Nationality: {selectedPlayer.nationality} • Real Club: {selectedPlayer.realClub}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedPlayer(null)}
                  className="text-xs text-gray-400 hover:text-white"
                >
                  ✕ Change
                </button>
              </div>
            )}

            {/* NEW PLAYER CREATION FORM */}
            {isNewPlayerMode && (
              <div className="rounded-2xl border border-pmb-gold/50 bg-pmb-gold/10 p-5 space-y-4 shadow-inner">
                <div className="flex items-center justify-between border-b border-pmb-gold/30 pb-2">
                  <span className="text-xs font-black uppercase tracking-wider text-pmb-gold flex items-center gap-1.5">
                    <span>✨</span>
                    <span>Create New Database Player & Launch Auction</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsNewPlayerMode(false)}
                    className="text-xs text-gray-400 hover:text-white"
                  >
                    ✕ Cancel New Player
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  <div>
                    <label className="text-[11px] font-bold text-gray-300 uppercase">Player Full Name</label>
                    <input
                      type="text"
                      value={newPlayerName}
                      onChange={(e) => setNewPlayerName(e.target.value)}
                      placeholder="e.g. Lamine Yamal"
                      className="pmb-input w-full text-xs mt-1"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-gray-300 uppercase">Position</label>
                    <select
                      value={newPlayerPos}
                      onChange={(e) => setNewPlayerPos(e.target.value)}
                      className="pmb-input w-full text-xs mt-1"
                    >
                      {POSITIONS.map((pos) => (
                        <option key={pos} value={pos} className="bg-pmb-charcoal text-white">
                          {pos}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-gray-300 uppercase">Overall Rating (OVR: 50-99)</label>
                    <input
                      type="number"
                      min="50"
                      max="99"
                      value={newPlayerOvr}
                      onChange={(e) => setNewPlayerOvr(e.target.value)}
                      className="pmb-input w-full text-xs mt-1"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-gray-300 uppercase">Nationality</label>
                    <input
                      type="text"
                      value={newPlayerNat}
                      onChange={(e) => setNewPlayerNat(e.target.value)}
                      placeholder="e.g. Morocco, Spain, France"
                      className="pmb-input w-full text-xs mt-1"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-gray-300 uppercase">Real World Club</label>
                    <input
                      type="text"
                      value={newPlayerRealClub}
                      onChange={(e) => setNewPlayerRealClub(e.target.value)}
                      placeholder="e.g. Barcelona, Free Agent"
                      className="pmb-input w-full text-xs mt-1"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-gray-300 uppercase">Photo URL (Optional)</label>
                    <input
                      type="url"
                      value={newPlayerPhoto}
                      onChange={(e) => setNewPlayerPhoto(e.target.value)}
                      placeholder="https://..."
                      className="pmb-input w-full text-xs mt-1"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* STEP 2: AUCTION PARAMETERS */}
          <div className="border-t border-white/10 pt-5 space-y-4">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-pmb-gold">
              2. Live Auction Rules & Financial Terms
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-bold text-gray-300">Starting Price (€)</label>
                <input
                  type="number"
                  value={startingPrice}
                  onChange={(e) => setStartingPrice(e.target.value)}
                  className="pmb-input w-full mt-1"
                  min="100000"
                  step="100000"
                  required
                />
                <p className="text-[10px] text-gray-400 mt-1">
                  €{(Number(startingPrice) / 1_000_000).toFixed(2)}M Base Bid
                </p>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-300">Min Bid Increment (€)</label>
                <input
                  type="number"
                  value={minIncrement}
                  onChange={(e) => setMinIncrement(e.target.value)}
                  className="pmb-input w-full mt-1"
                  min="50000"
                  step="50000"
                  required
                />
                <p className="text-[10px] text-gray-400 mt-1">
                  €{(Number(minIncrement) / 1_000_000).toFixed(2)}M Step
                </p>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-300">Auction Duration</label>
                <select
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(e.target.value)}
                  className="pmb-input w-full mt-1"
                >
                  <option value="5" className="bg-pmb-charcoal text-white">5 Minutes (Flash War)</option>
                  <option value="10" className="bg-pmb-charcoal text-white">10 Minutes</option>
                  <option value="15" className="bg-pmb-charcoal text-white">15 Minutes (Standard)</option>
                  <option value="30" className="bg-pmb-charcoal text-white">30 Minutes</option>
                  <option value="60" className="bg-pmb-charcoal text-white">1 Hour</option>
                  <option value="120" className="bg-pmb-charcoal text-white">2 Hours</option>
                  <option value="1440" className="bg-pmb-charcoal text-white">24 Hours (Full Day)</option>
                </select>
                <p className="text-[10px] text-gray-400 mt-1">Countdown starts instantly on launch</p>
              </div>
            </div>
          </div>

          {/* STEP 3: LAUNCH BUTTON */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isCreating || (!selectedPlayer && !isNewPlayerMode)}
              className="w-full rounded-2xl bg-pmb-gold py-3.5 text-sm font-black uppercase tracking-wider text-black hover:bg-white transition disabled:opacity-40 disabled:cursor-not-allowed shadow-xl flex items-center justify-center gap-2"
            >
              {isCreating ? (
                <>
                  <span className="animate-spin">⏳</span>
                  <span>Launching Live Auction...</span>
                </>
              ) : selectedPlayer ? (
                <>
                  <span>🚀 Launch Live Auction for {selectedPlayer.fullName}</span>
                </>
              ) : isNewPlayerMode ? (
                <>
                  <span>✨ Create "{newPlayerName || "Player"}" & Launch Auction</span>
                </>
              ) : (
                <>
                  <span>🔍 Select a Free Agent or Create New Player Above</span>
                </>
              )}
            </button>
          </div>
        </form>
      </section>

      {/* ─── ACTIVE LIVE AUCTIONS TABLE ─────────────────────────────── */}
      <section className="rounded-3xl border border-white/10 bg-black/60 p-6 sm:p-8 space-y-5 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <h2 className="text-lg font-black uppercase text-white tracking-wide">
              Active Live Auctions ({activeAuctions.length})
            </h2>
          </div>
        </div>

        {activeAuctions.length === 0 ? (
          <div className="text-center py-10 text-gray-400 text-sm">
            No live auctions currently active. Search a player above to launch one.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeAuctions.map((auc) => (
              <div
                key={auc.id}
                className="rounded-2xl border border-pmb-gold/30 bg-[#121217] p-5 space-y-4 shadow-lg flex flex-col justify-between"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="rounded bg-pmb-gold/20 border border-pmb-gold/40 px-2 py-0.5 text-[10px] font-black text-pmb-gold uppercase">
                      {auc.player.position}
                    </span>
                    <h3 className="text-base font-extrabold text-white mt-1">
                      {auc.player.fullName}
                    </h3>
                    <p className="text-xs text-gray-400">
                      {auc.player.nationality} • {auc.player.realClub}
                    </p>
                  </div>

                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-pmb-gold font-black text-black text-sm shadow">
                    {auc.player.overallRating ?? 75}
                  </div>
                </div>

                <div className="space-y-1.5 rounded-xl bg-black/60 p-3 text-xs border border-white/10">
                  <div className="flex justify-between text-gray-300">
                    <span>Current Highest Bid:</span>
                    <strong className="text-pmb-gold text-sm font-black">
                      €{(Number(auc.currentBid) / 1_000_000).toFixed(2)}M
                    </strong>
                  </div>
                  <div className="flex justify-between text-gray-400 text-[11px]">
                    <span>Winning Club:</span>
                    <span className="text-white font-semibold">
                      {auc.currentWinnerClub?.name || "No bids yet"}
                    </span>
                  </div>
                  <div className="flex justify-between text-gray-400 text-[11px]">
                    <span>Total Bids:</span>
                    <span className="text-white font-bold">{auc._count?.bids ?? 0}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-white/10">
                  <button
                    onClick={() => handleFinalize(auc.id, "FINALIZE")}
                    disabled={actionLoading === auc.id}
                    className="flex-1 rounded-xl bg-emerald-500 py-2 text-xs font-black text-black hover:bg-white transition disabled:opacity-50"
                  >
                    {actionLoading === auc.id ? "Processing..." : "✓ Finalize Win"}
                  </button>
                  <button
                    onClick={() => handleFinalize(auc.id, "CANCEL")}
                    disabled={actionLoading === auc.id}
                    className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-300 hover:bg-red-500 hover:text-white transition disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ─── RECENT COMPLETED AUCTIONS ───────────────────────────────── */}
      {recentAuctions.length > 0 && (
        <section className="rounded-3xl border border-white/10 bg-black/40 p-6 space-y-4">
          <h2 className="text-sm font-black uppercase tracking-wider text-gray-400">
            Recent Completed Auctions ({recentAuctions.length})
          </h2>
          <div className="divide-y divide-white/10">
            {recentAuctions.map((auc) => (
              <div key={auc.id} className="py-3 flex items-center justify-between text-xs text-gray-300">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white">{auc.player.fullName}</span>
                  <span className="text-[10px] text-pmb-gold">({auc.player.position})</span>
                </div>
                <div className="flex items-center gap-3">
                  <span>Sold for: <strong className="text-emerald-400">€{(Number(auc.currentBid)/1e6).toFixed(2)}M</strong></span>
                  <span>Winner: <strong className="text-white">{auc.currentWinnerClub?.name || "None"}</strong></span>
                  <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-gray-400 uppercase">{auc.status}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
