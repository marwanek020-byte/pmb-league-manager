"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { ClubBadge } from "@/components/ClubBadge";
import Link from "next/link";

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

type Club = {
  id: string;
  name: string;
  logo: string | null;
};

type Bid = {
  id: string;
  amount: string | number;
  createdAt: string;
  club: Club;
  user?: { username: string };
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
  completedAt: string | null;
  player: Player;
  currentWinnerClub: Club | null;
  bids?: Bid[];
  _count?: { bids: number };
};

// ── Realistic Stat Calculator for eFootball Style Card ───────────────
function calculateStats(position: string, ovr: number) {
  const base = Math.max(60, Math.min(99, ovr || 85));
  const pos = (position || "").toUpperCase();

  if (["ST", "CF", "LW", "RW", "FWD"].some((p) => pos.includes(p))) {
    return {
      pac: Math.min(99, base + 4),
      sho: Math.min(99, base + 5),
      pas: Math.max(50, base - 6),
      dri: Math.min(99, base + 3),
      def: Math.max(35, base - 42),
      phy: Math.max(60, base - 8),
    };
  } else if (["CAM", "CM", "CDM", "LM", "RM", "MID"].some((p) => pos.includes(p))) {
    return {
      pac: Math.max(65, base - 3),
      sho: Math.max(65, base - 4),
      pas: Math.min(99, base + 6),
      dri: Math.min(99, base + 4),
      def: Math.max(55, base - 12),
      phy: Math.max(65, base - 5),
    };
  } else if (["CB", "RB", "LB", "RWB", "LWB", "DEF"].some((p) => pos.includes(p))) {
    return {
      pac: Math.max(68, base - 2),
      sho: Math.max(40, base - 35),
      pas: Math.max(60, base - 10),
      dri: Math.max(62, base - 12),
      def: Math.min(99, base + 6),
      phy: Math.min(99, base + 5),
    };
  } else {
    // GK stats
    return {
      pac: Math.min(99, base + 3), // DIV
      sho: Math.min(99, base + 4), // HAN
      pas: Math.max(60, base - 4), // KIC
      dri: Math.min(99, base + 6), // REF
      def: Math.max(45, base - 25), // SPD
      phy: Math.min(99, base + 2), // POS
    };
  }
}

// ── High-Performance Canvas Confetti Generator ─────────────────────────
function ConfettiCanvas({ active }: { active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = ["#ffd700", "#facc15", "#e63946", "#38bdf8", "#ffffff", "#c084fc"];
    const pieces: {
      x: number;
      y: number;
      size: number;
      color: string;
      vx: number;
      vy: number;
      rotation: number;
      vRot: number;
    }[] = [];

    for (let i = 0; i < 180; i++) {
      pieces.push({
        x: canvas.width / 2 + (Math.random() - 0.5) * 200,
        y: canvas.height / 2 - 100 + (Math.random() - 0.5) * 100,
        size: Math.random() * 9 + 5,
        color: colors[Math.floor(Math.random() * colors.length)],
        vx: (Math.random() - 0.5) * 18,
        vy: Math.random() * -14 - 4,
        rotation: Math.random() * 360,
        vRot: (Math.random() - 0.5) * 12,
      });
    }

    let animId: number;
    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      pieces.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.35; // Gravity
        p.rotation += p.vRot;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        ctx.restore();
      });

      animId = requestAnimationFrame(render);
    };

    render();

    const timeout = setTimeout(() => {
      cancelAnimationFrame(animId);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }, 7000);

    return () => {
      cancelAnimationFrame(animId);
      clearTimeout(timeout);
    };
  }, [active]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-50 h-full w-full"
    />
  );
}

export function LiveAuctionRoom({
  myClubId,
  myClubName,
  myClubLogo,
  myClubBudget,
}: {
  myClubId: string;
  myClubName: string;
  myClubLogo?: string | null;
  myClubBudget: number;
}) {
  const [activeAuctions, setActiveAuctions] = useState<Auction[]>([]);
  const [recentAuctions, setRecentAuctions] = useState<Auction[]>([]);
  const [selectedAuctionId, setSelectedAuctionId] = useState<string | null>(null);
  const [selectedAuctionDetails, setSelectedAuctionDetails] = useState<Auction | null>(null);
  const [loading, setLoading] = useState(true);
  const [bidding, setBidding] = useState(false);
  const [customBid, setCustomBid] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<{ [id: string]: string }>({});
  const [secondsRemaining, setSecondsRemaining] = useState<number>(999);
  const [bidPulse, setBidPulse] = useState(false);
  const [showVictoryModal, setShowVictoryModal] = useState(false);
  const [celebratedAuctionId, setCelebratedAuctionId] = useState<string | null>(null);
  const prevBidRef = useRef<number>(0);

  // Stop background music across app/website when entering Live Auctions, resume on exit
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("pmb-pause-music"));
    }

    return () => {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("pmb-resume-music"));
      }
    };
  }, []);

  const fetchAuctions = useCallback(async () => {
    try {
      const res = await fetch("/api/auctions");
      if (!res.ok) return;
      const data = await res.json();
      setActiveAuctions(data.activeAuctions || []);
      setRecentAuctions(data.recentAuctions || []);

      if (data.activeAuctions?.length > 0 && !selectedAuctionId) {
        setSelectedAuctionId(data.activeAuctions[0].id);
      }
    } catch (err) {
      console.error("Error loading auctions:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedAuctionId]);

  const fetchDetails = useCallback(async (auctionId: string) => {
    try {
      const res = await fetch(`/api/auctions/${auctionId}`);
      if (!res.ok) return;
      const data = await res.json();
      const auc: Auction = data.auction;
      setSelectedAuctionDetails(auc);

      // Check if price changed to trigger shockwave
      const curBid = Number(auc.currentBid);
      if (prevBidRef.current > 0 && curBid > prevBidRef.current) {
        setBidPulse(true);
        setTimeout(() => setBidPulse(false), 900);
      }
      prevBidRef.current = curBid;

      // Check for victory celebration
      if (
        auc.status === "COMPLETED" &&
        auc.currentWinnerClubId === myClubId &&
        celebratedAuctionId !== auc.id
      ) {
        setShowVictoryModal(true);
        setCelebratedAuctionId(auc.id);
      }
    } catch (err) {
      console.error("Error loading auction details:", err);
    }
  }, [myClubId, celebratedAuctionId]);

  useEffect(() => {
    fetchAuctions();
    const interval = setInterval(fetchAuctions, 3000);
    return () => clearInterval(interval);
  }, [fetchAuctions]);

  useEffect(() => {
    if (selectedAuctionId) {
      fetchDetails(selectedAuctionId);
      const interval = setInterval(() => fetchDetails(selectedAuctionId), 2000);
      return () => clearInterval(interval);
    }
  }, [selectedAuctionId, fetchDetails]);

  // Countdown timer calculator
  useEffect(() => {
    const updateTimers = () => {
      const newTimeLeft: { [id: string]: string } = {};
      activeAuctions.forEach((a) => {
        const diff = new Date(a.expiresAt).getTime() - Date.now();
        if (diff <= 0) {
          newTimeLeft[a.id] = "EXPIRED";
          if (a.id === selectedAuctionId) setSecondsRemaining(0);
        } else {
          const totalSecs = Math.floor(diff / 1000);
          if (a.id === selectedAuctionId) setSecondsRemaining(totalSecs);
          const mins = Math.floor(totalSecs / 60);
          const secs = totalSecs % 60;
          newTimeLeft[a.id] = `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
        }
      });
      setTimeLeft(newTimeLeft);
    };

    updateTimers();
    const timerInterval = setInterval(updateTimers, 1000);
    return () => clearInterval(timerInterval);
  }, [activeAuctions, selectedAuctionId]);

  const handlePlaceBid = async (amountToBid: number) => {
    if (!selectedAuctionId) return;
    setBidding(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await fetch(`/api/auctions/${selectedAuctionId}/bid`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: amountToBid }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to place bid");
      }

      setSuccessMessage(`Bid of €${amountToBid.toLocaleString()} placed successfully!`);
      setCustomBid("");
      setBidPulse(true);
      setTimeout(() => setBidPulse(false), 900);
      fetchDetails(selectedAuctionId);
      fetchAuctions();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to place bid");
    } finally {
      setBidding(false);
    }
  };

  const activeAuction =
    selectedAuctionDetails ||
    activeAuctions.find((a) => a.id === selectedAuctionId) ||
    activeAuctions[0];

  const currentBidNum = activeAuction ? Number(activeAuction.currentBid) : 0;
  const minIncNum = activeAuction ? Number(activeAuction.minIncrement) : 500000;
  const hasBids = activeAuction?.bids && activeAuction.bids.length > 0;
  const minNextBid = hasBids ? currentBidNum + minIncNum : currentBidNum;
  const isLeading = activeAuction?.currentWinnerClubId === myClubId && hasBids;
  const isUrgent = secondsRemaining > 0 && secondsRemaining < 60;

  // eFootball Tier Determination
  const playerOvr = activeAuction?.player.overallRating ?? 85;
  const isEpic = playerOvr >= 88;
  const isBigTime = playerOvr >= 84 && playerOvr < 88;
  const cardTierClass = isEpic
    ? "card-efootball-epic"
    : isBigTime
    ? "card-efootball-bigtime"
    : "card-efootball-gold";
  const tierLabel = isEpic ? "👑 EPIC LEGEND" : isBigTime ? "⚡ BIG TIME" : "★ GOLD RARE";
  const tierAccent = isEpic ? "text-yellow-400" : isBigTime ? "text-purple-300" : "text-amber-400";

  const stats = activeAuction ? calculateStats(activeAuction.player.position, playerOvr) : null;

  return (
    <div className="space-y-8">
      {/* ─── CONFETTI ON VICTORY ────────────────────────────────────── */}
      <ConfettiCanvas active={showVictoryModal} />

      {/* ─── VICTORY SIGNING MODAL ──────────────────────────────────── */}
      {showVictoryModal && activeAuction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
          <div className="relative w-full max-w-md overflow-hidden rounded-3xl border-2 border-pmb-gold bg-gradient-to-b from-[#1c1605] via-[#100d05] to-black p-8 text-center shadow-[0_0_80px_rgba(212,175,55,0.4)]">
            <div className="holographic-shimmer" />

            <span className="text-6xl animate-bounce inline-block">🏆</span>
            <p className="mt-3 text-xs font-black uppercase tracking-[.3em] text-pmb-gold">
              Official Transfer Confirmed
            </p>
            <h2 className="mt-1 text-3xl font-black uppercase text-white">
              Player Signed!
            </h2>
            <p className="mt-2 text-sm text-gray-300">
              Congratulations! <span className="font-bold text-white">{activeAuction.player.fullName}</span> has officially joined{" "}
              <span className="font-bold text-pmb-gold">{myClubName}</span>.
            </p>

            <div className="my-6 rounded-2xl border border-white/15 bg-black/60 p-4">
              <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block">
                Final Winning Bid
              </span>
              <span className="text-3xl font-black text-pmb-gold">
                €{Number(activeAuction.currentBid).toLocaleString()}
              </span>
            </div>

            <div className="flex gap-3">
              <Link
                href="/manager/players"
                className="pmb-btn-primary flex-1 py-3 font-bold text-sm"
              >
                View in Squad →
              </Link>
              <button
                type="button"
                onClick={() => setShowVictoryModal(false)}
                className="pmb-btn-secondary px-5 font-bold text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── HEADER BAR ────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
            <p className="text-xs font-bold uppercase tracking-[.25em] text-red-500">
              Live Free Agent Bidding Arena
            </p>
          </div>
          <h1 className="mt-1 text-3xl font-black uppercase tracking-tight text-white sm:text-4xl">
            Player Auction War
          </h1>
        </div>

        {/* Manager Budget Badge */}
        <div className="flex items-center gap-3 rounded-2xl border border-pmb-gold/30 bg-black/60 p-3.5 backdrop-blur-md">
          <div className="flex flex-col text-right">
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
              Available Budget
            </span>
            <span className="text-lg font-black text-pmb-gold">
              €{myClubBudget.toLocaleString()}
            </span>
          </div>
          <ClubBadge name={myClubName} logo={myClubLogo} size="md" />
        </div>
      </div>

      {loading && (
        <div className="pmb-card p-12 text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-pmb-gold border-t-transparent"></div>
          <p className="mt-4 text-sm font-semibold text-gray-400">Connecting to live auction feed...</p>
        </div>
      )}

      {!loading && activeAuctions.length === 0 && (
        <div className="pmb-card p-16 text-center">
          <span className="text-5xl">⚡</span>
          <h2 className="mt-4 text-2xl font-black text-white">No Live Auctions Active</h2>
          <p className="mt-2 text-sm text-gray-400 max-w-md mx-auto">
            The administrator has not launched any free agent auctions at the moment. Check back soon for the next star player bidding war!
          </p>
        </div>
      )}

      {/* ─── ACTIVE AUCTION SPOTLIGHT ──────────────────────────────── */}
      {!loading && activeAuction && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[410px_1fr]">
          {/* ── LEFT: eFootball / FUT Holographic Card ───────────────── */}
          <div
            className={`relative overflow-hidden rounded-3xl p-7 transition-all duration-500 select-none ${cardTierClass} ${
              bidPulse ? "animate-bid-pulse" : ""
            }`}
          >
            {/* Prismatic Holographic Sheen Layer */}
            <div className="holographic-shimmer" />

            {/* Top Tier Badge & Special Effect */}
            <div className="relative z-10 flex items-center justify-between">
              <span className={`rounded-full border border-white/20 bg-black/60 px-3 py-1 text-[10px] font-black uppercase tracking-widest ${tierAccent} backdrop-blur-md`}>
                {tierLabel}
              </span>
              <span className="rounded-full border border-white/15 bg-white/10 px-2.5 py-0.5 text-[10px] font-bold text-white">
                {activeAuction.player.nationality}
              </span>
            </div>

            {/* OVR Rating & Position Badge */}
            <div className="relative z-10 mt-3 flex items-start justify-between">
              <div className="flex flex-col">
                <span className={`text-6xl font-black tracking-tighter leading-none ${tierAccent} drop-shadow-[0_4px_12px_rgba(0,0,0,0.9)]`}>
                  {playerOvr}
                </span>
                <span className="text-sm font-black uppercase tracking-wider text-white">
                  {activeAuction.player.position}
                </span>
              </div>

              {/* Real Club Pill */}
              <span className="max-w-[150px] truncate rounded-lg border border-white/10 bg-black/40 px-2.5 py-1 text-[10px] font-bold text-gray-300">
                {activeAuction.player.realClub}
              </span>
            </div>

            {/* Player Photo with Glow Aura */}
            <div className="relative z-10 my-4 flex justify-center">
              {activeAuction.player.photo ? (
                <img
                  src={activeAuction.player.photo}
                  alt={activeAuction.player.fullName}
                  className="h-52 w-52 object-contain drop-shadow-[0_20px_40px_rgba(0,0,0,0.9)] transition-transform duration-300 hover:scale-105"
                />
              ) : (
                <div className="flex h-48 w-48 items-center justify-center rounded-full border-2 border-pmb-gold/40 bg-black/60 text-6xl shadow-2xl">
                  ⚽
                </div>
              )}
            </div>

            {/* Player Name Banner */}
            <div className="relative z-10 rounded-xl border border-white/15 bg-gradient-to-r from-black/80 via-black/90 to-black/80 p-3 text-center shadow-xl backdrop-blur-md">
              <h2 className="text-xl font-black uppercase tracking-tight text-white line-clamp-1">
                {activeAuction.player.fullName}
              </h2>
            </div>

            {/* eFootball 6-Stats Matrix */}
            {stats && (
              <div className="relative z-10 mt-4 grid grid-cols-6 gap-1 rounded-xl border border-white/10 bg-black/60 p-2.5 text-center backdrop-blur-md">
                <div>
                  <span className="text-[9px] font-bold uppercase text-gray-400 block">PAC</span>
                  <span className="text-xs font-black text-white">{stats.pac}</span>
                </div>
                <div>
                  <span className="text-[9px] font-bold uppercase text-gray-400 block">SHO</span>
                  <span className="text-xs font-black text-white">{stats.sho}</span>
                </div>
                <div>
                  <span className="text-[9px] font-bold uppercase text-gray-400 block">PAS</span>
                  <span className="text-xs font-black text-white">{stats.pas}</span>
                </div>
                <div>
                  <span className="text-[9px] font-bold uppercase text-gray-400 block">DRI</span>
                  <span className="text-xs font-black text-white">{stats.dri}</span>
                </div>
                <div>
                  <span className="text-[9px] font-bold uppercase text-gray-400 block">DEF</span>
                  <span className="text-xs font-black text-white">{stats.def}</span>
                </div>
                <div>
                  <span className="text-[9px] font-bold uppercase text-gray-400 block">PHY</span>
                  <span className="text-xs font-black text-white">{stats.phy}</span>
                </div>
              </div>
            )}
          </div>

          {/* ── RIGHT: Live Bidding Console ──────────────────────────── */}
          <div className="flex flex-col gap-6">
            {/* Top Timer & Status Banner */}
            <div
              className={`pmb-card flex flex-col sm:flex-row items-center justify-between gap-4 p-5 transition-colors duration-300 ${
                isUrgent ? "border-red-500 bg-red-950/20 shadow-[0_0_30px_rgba(239,68,68,0.25)]" : ""
              }`}
            >
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                  {isUrgent ? "⚡ FINAL SECONDS REMAINING" : "Auction Ends In"}
                </span>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-3xl font-black tracking-tight ${
                      isUrgent ? "text-red-400 animate-pulse" : "text-white"
                    }`}
                  >
                    ⏱️ {timeLeft[activeAuction.id] || "00:00"}
                  </span>
                  {isUrgent && (
                    <span className="rounded bg-red-500 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-white animate-ping">
                      RUSH
                    </span>
                  )}
                </div>
              </div>

              {/* Leading Bidder Indicator */}
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                    Current Leader
                  </span>
                  <p className="text-sm font-bold text-white">
                    {activeAuction.currentWinnerClub?.name || "No Bids Yet"}
                  </p>
                </div>
                {activeAuction.currentWinnerClub && (
                  <ClubBadge
                    name={activeAuction.currentWinnerClub.name}
                    logo={activeAuction.currentWinnerClub.logo}
                    size="md"
                  />
                )}
              </div>
            </div>

            {/* Main Price & Bidding Box with Shockwave */}
            <div
              className={`pmb-card relative overflow-hidden p-6 sm:p-8 transition-all duration-300 ${
                bidPulse ? "animate-bid-pulse border-pmb-gold" : ""
              }`}
            >
              {isLeading && (
                <div className="mb-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-center">
                  <p className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                    🏆 Your club currently holds the winning bid!
                  </p>
                </div>
              )}

              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                  <span className="text-xs font-bold uppercase tracking-[.2em] text-pmb-gold">
                    Highest Bid
                  </span>
                  <p className="mt-1 text-4xl font-black text-white sm:text-5xl">
                    €{currentBidNum.toLocaleString()}
                  </p>
                  <p className="mt-1 text-xs text-gray-400">
                    Minimum next bid: <span className="font-bold text-white">€{minNextBid.toLocaleString()}</span>
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
                    Min Increment
                  </span>
                  <p className="text-sm font-bold text-gray-300">
                    +€{minIncNum.toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Alert Messages */}
              {errorMessage && (
                <div className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-xs font-semibold text-red-400">
                  ⚠️ {errorMessage}
                </div>
              )}
              {successMessage && (
                <div className="mt-4 rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3 text-xs font-semibold text-emerald-400">
                  ✅ {successMessage}
                </div>
              )}

              {/* Quick Bid Increment Buttons */}
              <div className="mt-6">
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                  Instant Outbid
                </span>
                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {[minIncNum, 1000000, 2000000, 5000000].map((inc) => {
                    const targetBid = currentBidNum + inc;
                    const canAfford = myClubBudget >= targetBid;

                    return (
                      <button
                        key={inc}
                        type="button"
                        disabled={bidding || !canAfford}
                        onClick={() => handlePlaceBid(targetBid)}
                        className="pmb-btn-secondary flex flex-col items-center py-2.5 transition active:scale-95 disabled:opacity-40"
                      >
                        <span className="text-xs font-bold text-pmb-gold">+€{(inc / 1000000).toFixed(1)}M</span>
                        <span className="text-[10px] text-gray-400">Bid €{(targetBid / 1000000).toFixed(1)}M</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Bid Input */}
              <div className="mt-5 flex gap-2">
                <input
                  type="number"
                  placeholder={`Custom bid (min €${minNextBid.toLocaleString()})`}
                  value={customBid}
                  onChange={(e) => setCustomBid(e.target.value)}
                  className="pmb-input flex-1"
                />
                <button
                  type="button"
                  disabled={bidding || !customBid || Number(customBid) < minNextBid}
                  onClick={() => handlePlaceBid(Number(customBid))}
                  className="pmb-btn-primary px-6 font-bold disabled:opacity-40"
                >
                  {bidding ? "Placing..." : "Place Custom Bid"}
                </button>
              </div>
            </div>

            {/* Live Bid History Feed */}
            <div className="pmb-card overflow-hidden">
              <div className="border-b border-pmb-border bg-black/40 px-5 py-3 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
                  Live Bid Activity Feed
                </span>
                <span className="text-[10px] text-gray-500 font-bold">
                  {activeAuction.bids?.length || 0} Total Bids
                </span>
              </div>

              <div className="max-h-56 divide-y divide-pmb-border overflow-y-auto p-2">
                {activeAuction.bids && activeAuction.bids.length > 0 ? (
                  activeAuction.bids.map((b, idx) => (
                    <div
                      key={b.id}
                      className="flex items-center justify-between p-2.5 text-xs transition hover:bg-white/5"
                    >
                      <div className="flex items-center gap-2.5">
                        <ClubBadge name={b.club.name} logo={b.club.logo} size="xs" />
                        <div>
                          <span className="font-bold text-white">{b.club.name}</span>
                          {idx === 0 && (
                            <span className="ml-2 rounded bg-pmb-gold/20 px-1.5 py-0.5 text-[9px] font-bold text-pmb-gold">
                              Highest
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-black text-pmb-gold">
                          €{Number(b.amount).toLocaleString()}
                        </span>
                        <p className="text-[9px] text-gray-500">
                          {new Date(b.createdAt).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="p-4 text-center text-xs text-gray-500">
                    No bids yet. Be the first to place a bid on this player!
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── RECENTLY COMPLETED AUCTIONS ───────────────────────────── */}
      {recentAuctions.length > 0 && (
        <section className="pt-4">
          <h3 className="mb-4 text-lg font-bold uppercase tracking-wide text-white">
            Recently Concluded Auctions
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {recentAuctions.map((ra) => (
              <div key={ra.id} className="pmb-card p-4 flex flex-col justify-between">
                <div className="flex items-center gap-3">
                  {ra.player.photo ? (
                    <img src={ra.player.photo} alt="" className="h-12 w-12 object-contain" />
                  ) : (
                    <div className="h-12 w-12 rounded-full bg-black/50 flex items-center justify-center text-xl">
                      ⚽
                    </div>
                  )}
                  <div>
                    <h4 className="font-bold text-white text-sm">{ra.player.fullName}</h4>
                    <span className="text-[10px] text-gray-400">{ra.player.position} · {ra.player.realClub}</span>
                  </div>
                </div>

                <div className="mt-4 border-t border-pmb-border pt-3 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[9px] uppercase text-gray-500 block">Sold To</span>
                    <span className="font-bold text-pmb-gold">
                      {ra.currentWinnerClub?.name || "Expired"}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] uppercase text-gray-500 block">Winning Fee</span>
                    <span className="font-bold text-white">
                      €{Number(ra.currentBid).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
