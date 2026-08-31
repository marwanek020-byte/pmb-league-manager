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
  completedAt?: string | null;
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
const POSITION_FILTERS = ["ALL", "FWD", "MID", "DEF", "GK"] as const;

function formatMoney(amount: string | number): string {
  const num = Number(amount) || 0;
  if (num >= 1_000_000) {
    return `€${(num / 1_000_000).toFixed(2)}M`;
  }
  if (num >= 1_000) {
    return `€${(num / 1_000).toFixed(0)}K`;
  }
  return `€${num.toLocaleString()}`;
}

// Live Countdown Component
function AuctionCountdown({ expiresAt }: { expiresAt: string }) {
  const [timeLeft, setTimeLeft] = useState<{ minutes: number; seconds: number; isExpired: boolean }>({
    minutes: 0,
    seconds: 0,
    isExpired: false,
  });

  useEffect(() => {
    const updateTime = () => {
      const diff = new Date(expiresAt).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft({ minutes: 0, seconds: 0, isExpired: true });
      } else {
        const totalSecs = Math.floor(diff / 1000);
        const minutes = Math.floor(totalSecs / 60);
        const seconds = totalSecs % 60;
        setTimeLeft({ minutes, seconds, isExpired: false });
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  if (timeLeft.isExpired) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/20 px-2.5 py-0.5 text-xs font-black text-red-400 border border-red-500/30">
        <span className="h-2 w-2 rounded-full bg-red-500 animate-ping" />
        EXPIRED (Finalizing...)
      </span>
    );
  }

  const isUrgent = timeLeft.minutes < 2;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-black border tracking-wider font-mono ${
        isUrgent
          ? "bg-red-500/20 text-red-400 border-red-500/40 animate-pulse"
          : "bg-pmb-gold/15 text-pmb-gold border-pmb-gold/30"
      }`}
    >
      <span>⏱️</span>
      <span>
        {String(timeLeft.minutes).padStart(2, "0")}:{String(timeLeft.seconds).padStart(2, "0")}
      </span>
    </span>
  );
}

export function AdminAuctionManager() {
  // Navigation Tabs: "CATALOG" | "SEARCH" | "CREATE"
  const [activeTab, setActiveTab] = useState<"CATALOG" | "SEARCH" | "CREATE">("CATALOG");

  // Data states
  const [activeAuctions, setActiveAuctions] = useState<Auction[]>([]);
  const [recentAuctions, setRecentAuctions] = useState<Auction[]>([]);
  const [availablePlayers, setAvailablePlayers] = useState<PlayerMatch[]>([]);
  const [loadingAvailable, setLoadingAvailable] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Filter for Free Agent Catalog
  const [catalogFilter, setCatalogFilter] = useState<(typeof POSITION_FILTERS)[number]>("ALL");
  const [catalogSearch, setCatalogSearch] = useState("");

  // Live Database Search & Verification
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<PlayerMatch[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  // Selected Player for Auction
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerMatch | null>(null);
  const [newlyCreatedAuctionId, setNewlyCreatedAuctionId] = useState<string | null>(null);

  // New Player Form Fields
  const [newPlayerName, setNewPlayerName] = useState("");
  const [newPlayerPos, setNewPlayerPos] = useState("CF");
  const [newPlayerOvr, setNewPlayerOvr] = useState("80");
  const [newPlayerNat, setNewPlayerNat] = useState("Morocco");
  const [newPlayerRealClub, setNewPlayerRealClub] = useState("Free Agent");
  const [newPlayerPhoto, setNewPlayerPhoto] = useState("");

  // Auction Terms
  const [startingPrice, setStartingPrice] = useState("10000000");
  const [minIncrement, setMinIncrement] = useState("500000");
  const [durationMinutes, setDurationMinutes] = useState("15");
  const [isCreating, setIsCreating] = useState(false);

  const searchTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch Live & Recent Auctions
  const fetchAuctions = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/auctions", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setActiveAuctions(data.activeAuctions || []);
        setRecentAuctions(data.recentAuctions || []);
      }
    } catch (err) {
      console.error("Error fetching auctions:", err);
    }
  }, []);

  // Fetch Available Free Agents Catalog
  const fetchAvailablePlayers = useCallback(async (query = "") => {
    setLoadingAvailable(true);
    try {
      const url = query.trim()
        ? `/api/admin/auctions/available-players?search=${encodeURIComponent(query.trim())}`
        : "/api/admin/auctions/available-players";
      const res = await fetch(url, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        const players = (data.players || []).map((p: any) => ({
          id: p.id,
          fullName: p.fullName || "Player",
          position: (p.position || "CF").toUpperCase(),
          overallRating: Number(p.overallRating) || 75,
          nationality: p.nationality || "Morocco",
          realClub: p.realClub || "Free Agent",
          marketValue: Number(p.marketValue) || 10000000,
          photo: p.photo || null,
          status: p.status || "AVAILABLE",
          hasClub: false,
          pmbClub: null,
          canAuction: true,
          statusReason: "Available Free Agent",
        }));
        setAvailablePlayers(players);
      }
    } catch (err) {
      console.error("Error fetching available players:", err);
    } finally {
      setLoadingAvailable(false);
    }
  }, []);

  useEffect(() => {
    fetchAuctions();
    fetchAvailablePlayers();
    const interval = setInterval(fetchAuctions, 4000);
    return () => clearInterval(interval);
  }, [fetchAuctions, fetchAvailablePlayers]);

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
      } else {
        const errData = await res.json().catch(() => ({}));
        setError(errData.error || "Failed to search players in database.");
      }
    } catch (err: any) {
      console.error("Error verifying player:", err);
      setError(err.message || "Error verifying player.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchInputChange = (val: string) => {
    setSearchQuery(val);
    setSelectedPlayer(null);

    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
    }

    searchTimerRef.current = setTimeout(() => {
      performSearch(val);
    }, 300);
  };

  const handleSelectPlayer = (p: PlayerMatch) => {
    if (!p.canAuction) {
      setError(`Cannot auction ${p.fullName}: ${p.statusReason}`);
      return;
    }
    setError(null);
    setSelectedPlayer(p);
    if (p.marketValue > 0) {
      setStartingPrice(p.marketValue.toString());
    }
    // Scroll smoothly to the terms section
    window.scrollTo({ top: 400, behavior: "smooth" });
  };

  const handleCreateAuction = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (activeTab !== "CREATE" && !selectedPlayer) {
      setError("Please select a player to place on auction.");
      return;
    }

    if (activeTab === "CREATE" && !newPlayerName.trim()) {
      setError("Player full name is required.");
      return;
    }

    const priceNum = Number(startingPrice);
    if (isNaN(priceNum) || priceNum <= 0) {
      setError("Starting price must be a valid positive number.");
      return;
    }

    setIsCreating(true);

    try {
      const payload: any = {
        startingPrice: priceNum,
        minIncrement: Number(minIncrement) || 500000,
        durationMinutes: Number(durationMinutes) || 15,
      };

      if (activeTab === "CREATE") {
        payload.newPlayer = {
          fullName: newPlayerName.trim(),
          position: newPlayerPos,
          overallRating: Math.min(99, Math.max(50, Number(newPlayerOvr) || 75)),
          nationality: newPlayerNat.trim() || "Morocco",
          realClub: newPlayerRealClub.trim() || "Free Agent",
          photo: newPlayerPhoto.trim() || null,
        };
      } else if (selectedPlayer) {
        payload.playerId = selectedPlayer.id;
      }

      const res = await fetch("/api/admin/auctions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create auction");
      }

      const launchedPlayerName =
        selectedPlayer?.fullName || newPlayerName.trim() || "Player";
      setSuccess(`🎉 Live Auction for "${launchedPlayerName}" launched successfully!`);

      if (data.auction) {
        setNewlyCreatedAuctionId(data.auction.id);
        setActiveAuctions((prev) => [data.auction, ...prev.filter((a) => a.id !== data.auction.id)]);
      }

      // Reset form
      setSelectedPlayer(null);
      setNewPlayerName("");
      setSearchQuery("");
      setSearchResults([]);
      setHasSearched(false);
      setActiveTab("CATALOG");

      // Refresh listings
      await Promise.all([fetchAuctions(), fetchAvailablePlayers()]);

      // Scroll to active auctions section so admin sees the launched auction immediately
      setTimeout(() => {
        const el = document.getElementById("active-auctions-section");
        if (el) {
          el.scrollIntoView({ behavior: "smooth" });
        }
      }, 250);
    } catch (err: any) {
      setError(err.message || "Error launching auction. Please try again.");
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

      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Action failed");
      }

      setSuccess(
        action === "FINALIZE"
          ? "✅ Auction finalized successfully!"
          : "⚠️ Auction cancelled successfully."
      );
      await Promise.all([fetchAuctions(), fetchAvailablePlayers()]);
    } catch (err: any) {
      setError(err.message || "Action failed");
    } finally {
      setActionLoading(null);
    }
  };

  // Filtered Catalog
  const filteredCatalog = availablePlayers.filter((p) => {
    const matchesSearch =
      !catalogSearch.trim() ||
      p.fullName.toLowerCase().includes(catalogSearch.toLowerCase()) ||
      p.nationality.toLowerCase().includes(catalogSearch.toLowerCase()) ||
      p.realClub.toLowerCase().includes(catalogSearch.toLowerCase());

    if (!matchesSearch) return false;

    if (catalogFilter === "ALL") return true;
    if (catalogFilter === "FWD") return ["CF", "ST", "LWF", "RWF"].includes(p.position);
    if (catalogFilter === "MID") return ["AMF", "CMF", "DMF"].includes(p.position);
    if (catalogFilter === "DEF") return ["CB", "LB", "RB"].includes(p.position);
    if (catalogFilter === "GK") return p.position === "GK";
    return true;
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-2 sm:px-4 py-4">
      {/* ─── HEADER ────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pmb-gold opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-pmb-gold"></span>
            </span>
            <p className="text-xs font-black uppercase tracking-[.25em] text-pmb-gold">
              PMB League Official Administration
            </p>
          </div>
          <h1 className="mt-1.5 text-3xl font-black uppercase tracking-tight text-white sm:text-4xl">
            Live Free Agent Auction Hub
          </h1>
          <p className="mt-1 text-sm text-gray-400">
            Launch competitive real-time bidding wars for free agents or create custom star players with instant live auctions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="rounded-2xl border border-pmb-gold/30 bg-black/60 px-4 py-2 text-right">
            <span className="text-[10px] font-black uppercase tracking-widest text-pmb-gold">
              Active Live Auctions
            </span>
            <p className="text-2xl font-black text-white">{activeAuctions.length}</p>
          </div>
        </div>
      </div>

      {/* ─── ALERTS ────────────────────────────────────────── */}
      {error && (
        <div className="rounded-2xl border border-red-500/50 bg-red-950/40 p-4 text-sm font-semibold text-red-200 flex items-center justify-between shadow-xl animate-fade-in">
          <div className="flex items-center gap-3">
            <span className="text-xl">⚠️</span>
            <span>{error}</span>
          </div>
          <button
            onClick={() => setError(null)}
            className="rounded-lg bg-white/10 px-2 py-1 text-xs hover:bg-white/20 transition text-white"
          >
            ✕ Dismiss
          </button>
        </div>
      )}

      {success && (
        <div className="rounded-2xl border border-emerald-500/50 bg-emerald-950/40 p-4 text-sm font-semibold text-emerald-200 flex items-center justify-between shadow-xl animate-fade-in">
          <div className="flex items-center gap-3">
            <span className="text-xl">🎉</span>
            <span>{success}</span>
          </div>
          <button
            onClick={() => setSuccess(null)}
            className="rounded-lg bg-white/10 px-2 py-1 text-xs hover:bg-white/20 transition text-white"
          >
            ✕ Dismiss
          </button>
        </div>
      )}

      {/* ─── MAIN LAUNCHER CONTROL CARD ─────────────────────────────── */}
      <section className="rounded-3xl border border-pmb-gold/40 bg-gradient-to-b from-[#14141c] via-[#0d0d12] to-black p-6 sm:p-8 shadow-2xl space-y-6">
        {/* TAB SELECTOR */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-black uppercase tracking-wide text-white flex items-center gap-2.5">
              <span>🚀 Launch New Live Auction</span>
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Select an available free agent from the database, verify contracts, or craft a new player profile.
            </p>
          </div>

          {/* Navigation Pill Buttons */}
          <div className="flex items-center rounded-2xl bg-black/60 p-1.5 border border-white/10 gap-1 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => {
                setActiveTab("CATALOG");
                setError(null);
              }}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-extrabold transition uppercase tracking-wider ${
                activeTab === "CATALOG"
                  ? "bg-pmb-gold text-black shadow-md"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              ⭐ Free Agent Catalog
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("SEARCH");
                setError(null);
              }}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-extrabold transition uppercase tracking-wider ${
                activeTab === "SEARCH"
                  ? "bg-pmb-gold text-black shadow-md"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              🔍 Search & Verify
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("CREATE");
                setSelectedPlayer(null);
                setError(null);
              }}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-extrabold transition uppercase tracking-wider ${
                activeTab === "CREATE"
                  ? "bg-pmb-gold text-black shadow-md"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              ✨ Create New Player
            </button>
          </div>
        </div>

        {/* ─── TAB 1: FREE AGENT CATALOG ─── */}
        {activeTab === "CATALOG" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {/* Search within catalog */}
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Filter available players by name, nationality, club..."
                  value={catalogSearch}
                  onChange={(e) => setCatalogSearch(e.target.value)}
                  className="pmb-input w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-black/60 border-white/20 focus:border-pmb-gold"
                />
                <span className="absolute left-3 top-2.5 text-gray-400 text-xs">🔍</span>
              </div>

              {/* Position filters */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                {POSITION_FILTERS.map((pos) => (
                  <button
                    key={pos}
                    type="button"
                    onClick={() => setCatalogFilter(pos)}
                    className={`rounded-lg px-2.5 py-1 text-[11px] font-black uppercase transition ${
                      catalogFilter === pos
                        ? "bg-pmb-gold text-black shadow"
                        : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    {pos}
                  </button>
                ))}
              </div>
            </div>

            {loadingAvailable ? (
              <div className="py-12 text-center text-gray-400 text-sm animate-pulse flex items-center justify-center gap-2">
                <span>⚽</span>
                <span>Loading available database free agents...</span>
              </div>
            ) : filteredCatalog.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-black/40 p-8 text-center space-y-3">
                <p className="text-sm font-semibold text-gray-300">
                  No free agent players found in the database.
                </p>
                <p className="text-xs text-gray-400">
                  You can use the search verification tab or create a brand new player directly!
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab("CREATE")}
                  className="rounded-xl bg-pmb-gold px-4 py-2 text-xs font-black text-black hover:bg-white transition"
                >
                  ✨ Create New Star Player
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[360px] overflow-y-auto pr-1">
                {filteredCatalog.map((p) => {
                  const isSelected = selectedPlayer?.id === p.id;
                  return (
                    <div
                      key={p.id}
                      onClick={() => handleSelectPlayer(p)}
                      className={`cursor-pointer rounded-2xl border p-4 transition shadow-md flex items-center justify-between gap-3 ${
                        isSelected
                          ? "border-pmb-gold bg-pmb-gold/20 shadow-[0_0_15px_rgba(212,175,55,0.3)]"
                          : "border-white/10 bg-black/60 hover:border-pmb-gold/60 hover:bg-white/[0.03]"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-pmb-gold/20 border border-pmb-gold/40 text-pmb-gold font-black text-sm">
                          {p.overallRating}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h4 className="font-extrabold text-white text-sm leading-tight">
                              {p.fullName}
                            </h4>
                            <span className="rounded bg-white/10 px-1.5 py-0.2 text-[9px] font-black text-pmb-gold uppercase">
                              {p.position}
                            </span>
                          </div>
                          <p className="text-[11px] text-gray-400 mt-0.5">
                            {p.nationality} • {p.realClub}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectPlayer(p);
                        }}
                        className={`rounded-xl px-3 py-1.5 text-xs font-black transition shrink-0 ${
                          isSelected
                            ? "bg-pmb-gold text-black shadow"
                            : "bg-white/10 text-white hover:bg-pmb-gold hover:text-black"
                        }`}
                      >
                        {isSelected ? "✓ Selected" : "Select"}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ─── TAB 2: LIVE SEARCH & DATABASE VERIFICATION ─── */}
        {activeTab === "SEARCH" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-extrabold uppercase tracking-wider text-pmb-gold flex items-center justify-between">
                <span>Live Database & Contract Verification</span>
                {isSearching && (
                  <span className="text-gray-400 font-normal animate-pulse text-xs">
                    Checking PostgreSQL records...
                  </span>
                )}
              </label>

              <div className="relative">
                <input
                  type="text"
                  placeholder="Type full player name (e.g. 'Achraf Hakimi', 'Erling Haaland', 'Lamine Yamal')..."
                  value={searchQuery}
                  onChange={(e) => handleSearchInputChange(e.target.value)}
                  className="pmb-input w-full pl-10 pr-4 py-3 text-sm rounded-2xl bg-black/60 border-white/20 focus:border-pmb-gold focus:ring-1 focus:ring-pmb-gold"
                />
                <span className="absolute left-3.5 top-3.5 text-gray-400 text-base">🔍</span>
              </div>
            </div>

            {hasSearched && searchResults.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-bold text-gray-400">
                  Database Matches Found ({searchResults.length}):
                </p>
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
                            <div className="space-y-1 w-full">
                              <div className="flex items-center gap-1 text-[11px] font-black text-red-400 uppercase tracking-wider">
                                <span>🛑</span>
                                <span>ACTIVE CONTRACT</span>
                              </div>
                              <p className="text-[10px] text-red-300 leading-tight">
                                Registered to <strong className="text-white">{p.pmbClub?.name}</strong> (@{p.pmbClub?.managerUsername || "Manager"}). Players under active contract cannot be auctioned.
                              </p>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between w-full">
                              <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                                <span>✓</span>
                                <span>Free Agent</span>
                              </span>
                              <button
                                type="button"
                                onClick={() => handleSelectPlayer(p)}
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

            {hasSearched && searchResults.length === 0 && (
              <div className="rounded-2xl border border-white/15 bg-black/60 p-6 text-center space-y-2">
                <p className="text-sm font-semibold text-gray-300">
                  🔍 No player named <strong className="text-pmb-gold">"{searchQuery}"</strong> found in the database.
                </p>
                <p className="text-xs text-gray-400">
                  You can craft this star player on the fly and launch their live auction immediately!
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setNewPlayerName(searchQuery.trim());
                    setActiveTab("CREATE");
                  }}
                  className="mt-2 rounded-xl bg-pmb-gold px-4 py-2 text-xs font-black text-black hover:bg-white transition shadow-md"
                >
                  ✨ Create "{searchQuery}" & Launch Auction
                </button>
              </div>
            )}
          </div>
        )}

        {/* ─── TAB 3: CREATE NEW PLAYER FORM ─── */}
        {activeTab === "CREATE" && (
          <div className="rounded-2xl border border-pmb-gold/50 bg-pmb-gold/10 p-5 space-y-4 shadow-inner">
            <div className="flex items-center justify-between border-b border-pmb-gold/30 pb-2">
              <span className="text-xs font-black uppercase tracking-wider text-pmb-gold flex items-center gap-1.5">
                <span>✨</span>
                <span>Craft New Star Player & Start Auction</span>
              </span>
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

        {/* ─── SELECTED PLAYER PREVIEW CARD (FOR CATALOG/SEARCH MODES) ─── */}
        {activeTab !== "CREATE" && selectedPlayer && (
          <div className="rounded-2xl border border-emerald-500/50 bg-emerald-950/20 p-4 flex items-center justify-between gap-4 shadow-inner">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-300 text-xl font-bold border border-emerald-500/40">
                ⚽
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">
                  ✓ Selected for Live Auction
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
              className="rounded-lg bg-white/10 px-3 py-1 text-xs text-gray-300 hover:text-white hover:bg-white/20 transition"
            >
              ✕ Change
            </button>
          </div>
        )}

        {/* ─── FORM & AUCTION TERMS ────────────────────────── */}
        <form onSubmit={handleCreateAuction} className="border-t border-white/10 pt-5 space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-pmb-gold">
                Auction Financial Rules & Duration
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* STARTING PRICE */}
              <div>
                <label className="text-xs font-bold text-gray-300">Starting Base Bid (€)</label>
                <input
                  type="number"
                  value={startingPrice}
                  onChange={(e) => setStartingPrice(e.target.value)}
                  className="pmb-input w-full mt-1 font-mono text-sm"
                  min="100000"
                  step="100000"
                  required
                />
                <div className="flex items-center gap-1.5 mt-2 overflow-x-auto">
                  {["5000000", "10000000", "25000000", "50000000", "100000000"].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setStartingPrice(amt)}
                      className={`rounded px-1.5 py-0.5 text-[10px] font-mono font-bold transition ${
                        startingPrice === amt
                          ? "bg-pmb-gold text-black"
                          : "bg-white/10 text-gray-300 hover:bg-white/20"
                      }`}
                    >
                      {formatMoney(amt)}
                    </button>
                  ))}
                </div>
              </div>

              {/* MIN INCREMENT */}
              <div>
                <label className="text-xs font-bold text-gray-300">Min Bid Step (€)</label>
                <input
                  type="number"
                  value={minIncrement}
                  onChange={(e) => setMinIncrement(e.target.value)}
                  className="pmb-input w-full mt-1 font-mono text-sm"
                  min="50000"
                  step="50000"
                  required
                />
                <div className="flex items-center gap-1.5 mt-2 overflow-x-auto">
                  {["250000", "500000", "1000000", "2000000"].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setMinIncrement(amt)}
                      className={`rounded px-1.5 py-0.5 text-[10px] font-mono font-bold transition ${
                        minIncrement === amt
                          ? "bg-pmb-gold text-black"
                          : "bg-white/10 text-gray-300 hover:bg-white/20"
                      }`}
                    >
                      +{formatMoney(amt)}
                    </button>
                  ))}
                </div>
              </div>

              {/* DURATION */}
              <div>
                <label className="text-xs font-bold text-gray-300">Auction Duration</label>
                <select
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(e.target.value)}
                  className="pmb-input w-full mt-1 font-medium text-sm"
                >
                  <option value="5" className="bg-pmb-charcoal text-white">5 Minutes (Flash War)</option>
                  <option value="10" className="bg-pmb-charcoal text-white">10 Minutes</option>
                  <option value="15" className="bg-pmb-charcoal text-white">15 Minutes (Standard)</option>
                  <option value="30" className="bg-pmb-charcoal text-white">30 Minutes</option>
                  <option value="60" className="bg-pmb-charcoal text-white">1 Hour</option>
                  <option value="120" className="bg-pmb-charcoal text-white">2 Hours</option>
                  <option value="1440" className="bg-pmb-charcoal text-white">24 Hours (Full Day)</option>
                </select>
                <p className="text-[10px] text-gray-400 mt-2">Anti-sniping 60s extension included</p>
              </div>
            </div>
          </div>

          {/* INLINE ERROR & SUCCESS FEEDBACK */}
          {error && (
            <div className="rounded-2xl border border-red-500/50 bg-red-950/60 p-4 text-xs font-bold text-red-200 flex items-center justify-between shadow-lg animate-shake">
              <div className="flex items-center gap-2">
                <span className="text-base">⚠️</span>
                <span>{error}</span>
              </div>
              <button
                type="button"
                onClick={() => setError(null)}
                className="rounded px-2 py-0.5 text-[11px] bg-white/10 hover:bg-white/20 text-white"
              >
                ✕
              </button>
            </div>
          )}

          {success && (
            <div className="rounded-2xl border border-emerald-500/50 bg-emerald-950/60 p-4 text-xs font-bold text-emerald-200 flex items-center justify-between shadow-lg animate-fade-in">
              <div className="flex items-center gap-2">
                <span className="text-base">🎉</span>
                <span>{success}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  const el = document.getElementById("active-auctions-section");
                  if (el) el.scrollIntoView({ behavior: "smooth" });
                }}
                className="rounded-lg bg-emerald-500 px-3 py-1 text-[11px] font-black text-black hover:bg-white transition"
              >
                👀 View in Live War Room ⬇
              </button>
            </div>
          )}

          {/* LAUNCH BUTTON */}
          <div className="pt-1">
            <button
              type="submit"
              disabled={isCreating || (activeTab !== "CREATE" && !selectedPlayer)}
              className="w-full rounded-2xl bg-pmb-gold py-4 text-sm font-black uppercase tracking-wider text-black hover:bg-white transition disabled:opacity-40 disabled:cursor-not-allowed shadow-xl flex items-center justify-center gap-2"
            >
              {isCreating ? (
                <>
                  <span className="animate-spin text-lg">⏳</span>
                  <span>Launching Live Auction...</span>
                </>
              ) : selectedPlayer ? (
                <>
                  <span>🚀 Launch Live Auction for {selectedPlayer.fullName} ({formatMoney(startingPrice)})</span>
                </>
              ) : activeTab === "CREATE" ? (
                <>
                  <span>✨ Create "{newPlayerName || "Player"}" & Launch Auction</span>
                </>
              ) : (
                <>
                  <span>🔍 Pick a Free Agent Above to Enable Launch</span>
                </>
              )}
            </button>
          </div>
        </form>
      </section>

      {/* ─── ACTIVE LIVE AUCTIONS TABLE ─────────────────────────────── */}
      <section id="active-auctions-section" className="rounded-3xl border border-white/10 bg-black/60 p-6 sm:p-8 space-y-5 shadow-2xl">
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
          <div className="text-center py-12 text-gray-400 text-sm rounded-2xl border border-white/5 bg-black/40">
            No live auctions currently active. Pick a player above to launch one.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeAuctions.map((auc) => {
              const isNewlyCreated = auc.id === newlyCreatedAuctionId;
              return (
                <div
                  key={auc.id}
                  className={`rounded-2xl border p-5 space-y-4 shadow-lg flex flex-col justify-between relative overflow-hidden transition-all duration-500 ${
                    isNewlyCreated
                      ? "border-pmb-gold bg-[#181822] shadow-[0_0_25px_rgba(212,175,55,0.4)] ring-2 ring-pmb-gold/50"
                      : "border-pmb-gold/30 bg-[#121217]"
                  }`}
                >
                  {isNewlyCreated && (
                    <div className="absolute top-0 right-0 bg-pmb-gold text-black text-[9px] font-black uppercase px-2 py-0.5 rounded-bl-lg tracking-widest shadow">
                      ✨ Just Launched
                    </div>
                  )}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-pmb-gold/20 border border-pmb-gold/40 px-2 py-0.5 text-[10px] font-black text-pmb-gold uppercase">
                          {auc.player.position}
                        </span>
                        <AuctionCountdown expiresAt={auc.expiresAt} />
                      </div>
                      <h3 className="text-base font-extrabold text-white mt-1.5">
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

                <div className="space-y-2 rounded-xl bg-black/60 p-3.5 text-xs border border-white/10">
                  <div className="flex justify-between items-center text-gray-300">
                    <span className="text-gray-400">Current Highest Bid:</span>
                    <strong className="text-pmb-gold text-base font-black font-mono">
                      {formatMoney(auc.currentBid)}
                    </strong>
                  </div>
                  <div className="flex justify-between items-center text-gray-400 text-[11px]">
                    <span>Leading Club:</span>
                    <span className="text-white font-semibold flex items-center gap-1.5">
                      {auc.currentWinnerClub ? (
                        <>
                          <ClubBadge logo={auc.currentWinnerClub.logo} name={auc.currentWinnerClub.name} size="sm" />
                          <span>{auc.currentWinnerClub.name}</span>
                        </>
                      ) : (
                        <span className="text-gray-400">No bids yet (Starting at base)</span>
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between text-gray-400 text-[11px]">
                    <span>Total Bids Placed:</span>
                    <span className="text-white font-bold">{auc._count?.bids ?? 0} bids</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-white/10">
                  <button
                    onClick={() => handleFinalize(auc.id, "FINALIZE")}
                    disabled={actionLoading === auc.id}
                    className="flex-1 rounded-xl bg-emerald-500 py-2.5 text-xs font-black text-black hover:bg-white transition disabled:opacity-50 shadow"
                  >
                    {actionLoading === auc.id ? "Processing..." : "✓ Finalize Win"}
                  </button>
                  <button
                    onClick={() => handleFinalize(auc.id, "CANCEL")}
                    disabled={actionLoading === auc.id}
                    className="rounded-xl border border-red-500/40 bg-red-500/10 px-3.5 py-2.5 text-xs font-bold text-red-300 hover:bg-red-500 hover:text-white transition disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            );
          })}
          </div>
        )}
      </section>

      {/* ─── RECENT COMPLETED AUCTIONS ───────────────────────────────── */}
      {recentAuctions.length > 0 && (
        <section className="rounded-3xl border border-white/10 bg-black/40 p-6 space-y-4 shadow-xl">
          <h2 className="text-sm font-black uppercase tracking-wider text-gray-400 flex items-center gap-2">
            <span>📜 Recent Completed Auctions ({recentAuctions.length})</span>
          </h2>
          <div className="divide-y divide-white/10">
            {recentAuctions.map((auc) => (
              <div key={auc.id} className="py-3.5 flex items-center justify-between text-xs text-gray-300 gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white text-sm">{auc.player.fullName}</span>
                  <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-pmb-gold uppercase font-mono">
                    {auc.player.position}
                  </span>
                  <span className="text-gray-400 text-[11px] hidden sm:inline">
                    ({auc.player.nationality})
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span>
                    Price:{" "}
                    <strong className="text-emerald-400 font-mono font-bold">
                      {formatMoney(auc.currentBid)}
                    </strong>
                  </span>
                  <span className="hidden sm:inline">
                    Winner:{" "}
                    <strong className="text-white font-semibold">
                      {auc.currentWinnerClub?.name || "No Winner (Expired)"}
                    </strong>
                  </span>
                  <span
                    className={`rounded px-2 py-0.5 text-[10px] font-black uppercase ${
                      auc.status === "COMPLETED"
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                        : "bg-white/10 text-gray-400"
                    }`}
                  >
                    {auc.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
