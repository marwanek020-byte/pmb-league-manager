"use client";

import { useState, useEffect, useCallback, useRef } from "react";

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

interface AppAuctionsData {
  activeAuctions: Auction[];
  recentAuctions: Auction[];
  myClub: {
    id: string;
    name: string;
    logo: string | null;
    budget: number;
  };
}

interface AppAuctionsHubProps {
  onBack: () => void;
}

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

// ── Web Audio API Sound Synthesizer (Zero External Dependencies) ─────────
class AuctionSoundEngine {
  private ctx: AudioContext | null = null;
  public enabled: boolean = true;

  private initCtx() {
    if (!this.ctx && typeof window !== "undefined") {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
  }

  // 1. Crisp Wooden Gavel Strike SFX
  public playGavelStrike() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;

      // Primary wood knock body
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = "sine";
      osc.frequency.setValueAtTime(340, now);
      osc.frequency.exponentialRampToValueAtTime(70, now + 0.09);

      filter.type = "lowpass";
      filter.frequency.setValueAtTime(900, now);

      gain.gain.setValueAtTime(0.85, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.15);

      // Wood impact snap
      const snap = this.ctx.createOscillator();
      const snapGain = this.ctx.createGain();
      snap.type = "triangle";
      snap.frequency.setValueAtTime(1600, now);
      snap.frequency.exponentialRampToValueAtTime(140, now + 0.04);

      snapGain.gain.setValueAtTime(0.6, now);
      snapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

      snap.connect(snapGain);
      snapGain.connect(this.ctx.destination);
      snap.start(now);
      snap.stop(now + 0.06);
    } catch {
      // ignore
    }
  }

  // 2. Tension Countdown Heartbeat / Ticking (Final 15s)
  public playTensionTick() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(1100, now);
      osc.frequency.exponentialRampToValueAtTime(450, now + 0.035);

      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.05);
    } catch {
      // ignore
    }
  }

  // 3. Triumphant Stadium Fanfare SFX (Victory)
  public playVictoryFanfare() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const notes = [261.63, 329.63, 392.0, 523.25, 659.25, 783.99]; // C4, E4, G4, C5, E5, G5
      const start = this.ctx.currentTime;

      notes.forEach((freq, i) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();

        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(freq, start + i * 0.1);

        gain.gain.setValueAtTime(0, start + i * 0.1);
        gain.gain.linearRampToValueAtTime(0.35, start + i * 0.1 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, start + i * 0.1 + 0.45);

        osc.connect(gain);
        gain.connect(this.ctx!.destination);

        osc.start(start + i * 0.1);
        osc.stop(start + i * 0.1 + 0.5);
      });
    } catch {
      // ignore
    }
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

    for (let i = 0; i < 150; i++) {
      pieces.push({
        x: Math.random() * canvas.width,
        y: Math.random() * -canvas.height,
        size: Math.random() * 9 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        vx: (Math.random() - 0.5) * 3.5,
        vy: Math.random() * 4 + 2,
        rotation: Math.random() * 360,
        vRot: (Math.random() - 0.5) * 8,
      });
    }

    let animId: number;
    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      pieces.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.25;
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
    }, 6000);

    return () => {
      cancelAnimationFrame(animId);
      clearTimeout(timeout);
    };
  }, [active]);

  if (!active) return null;

  return <canvas ref={canvasRef} className="pointer-events-none fixed inset-0 z-50 h-full w-full" />;
}

export function AppAuctionsHub({ onBack }: AppAuctionsHubProps) {
  const [data, setData] = useState<AppAuctionsData | null>(null);
  const [selectedAuctionId, setSelectedAuctionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [bidding, setBidding] = useState(false);
  const [customBid, setCustomBid] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [viewTab, setViewTab] = useState<"LIVE" | "COMPLETED">("LIVE");
  const [timeLeft, setTimeLeft] = useState<{ [id: string]: string }>({});
  const [secondsRemaining, setSecondsRemaining] = useState<number>(999);
  const [bidPulse, setBidPulse] = useState(false);
  const [showVictoryModal, setShowVictoryModal] = useState(false);
  const [celebratedAuctionId, setCelebratedAuctionId] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [dramaticAlert, setDramaticAlert] = useState<string | null>(null);

  const prevBidRef = useRef<number>(0);
  const prevWinnerIdRef = useRef<string | null>(null);
  const soundEngineRef = useRef<AuctionSoundEngine>(new AuctionSoundEngine());

  // Update sound engine enabled flag
  useEffect(() => {
    soundEngineRef.current.enabled = soundEnabled;
  }, [soundEnabled]);

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
      const res = await fetch("/api/app/auctions");
      if (!res.ok) return;
      const json: AppAuctionsData = await res.json();
      setData(json);

      if (json.activeAuctions?.length > 0 && !selectedAuctionId) {
        setSelectedAuctionId(json.activeAuctions[0].id);
      }
    } catch (err) {
      console.error("Error loading auctions:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedAuctionId]);

  useEffect(() => {
    fetchAuctions();
    const interval = setInterval(fetchAuctions, 3000);
    return () => clearInterval(interval);
  }, [fetchAuctions]);

  const activeAuctions = data?.activeAuctions || [];
  const recentAuctions = data?.recentAuctions || [];
  const myClub = data?.myClub || { id: "c1", name: "Your Club", budget: 0, logo: null };

  const currentAuction =
    activeAuctions.find((a) => a.id === selectedAuctionId) || activeAuctions[0] || null;

  // Track price change shockwave, gavel strike SFX, and dramatic alerts
  useEffect(() => {
    if (currentAuction) {
      const curBid = Number(currentAuction.currentBid);
      const winnerClub = currentAuction.currentWinnerClub?.name || "Rival Club";

      if (prevBidRef.current > 0 && curBid > prevBidRef.current) {
        // Trigger gavel strike SFX
        soundEngineRef.current.playGavelStrike();
        setBidPulse(true);
        setTimeout(() => setBidPulse(false), 900);

        // Dramatic alerts
        if (currentAuction.currentWinnerClubId === myClub.id) {
          const delta = curBid - prevBidRef.current;
          setDramaticAlert(`⚡ You outbid the competition by €${delta.toLocaleString()}!`);
        } else {
          setDramaticAlert(`🔥 ${winnerClub} just raised the bid to €${curBid.toLocaleString()}!`);
        }
      }

      prevBidRef.current = curBid;
      prevWinnerIdRef.current = currentAuction.currentWinnerClubId;

      // Victory celebration check
      if (
        currentAuction.status === "COMPLETED" &&
        currentAuction.currentWinnerClubId === myClub.id &&
        celebratedAuctionId !== currentAuction.id
      ) {
        soundEngineRef.current.playVictoryFanfare();
        setShowVictoryModal(true);
        setCelebratedAuctionId(currentAuction.id);
      }
    }
  }, [currentAuction, myClub.id, celebratedAuctionId]);

  // Timers countdown
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

  // Tension heartbeat / ticking audio in the final 15 seconds
  useEffect(() => {
    if (secondsRemaining > 0 && secondsRemaining <= 15 && soundEnabled) {
      soundEngineRef.current.playTensionTick();
    }
  }, [secondsRemaining, soundEnabled]);

  async function handlePlaceBid(amountToBid: number) {
    if (!currentAuction) return;
    setBidding(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await fetch(`/api/app/auctions/${currentAuction.id}/bid`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: amountToBid }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to place bid");
      }

      soundEngineRef.current.playGavelStrike();
      setSuccessMessage(`🎉 Bid of €${amountToBid.toLocaleString()} placed successfully!`);
      setDramaticAlert(`⚡ You seized the highest bid at €${amountToBid.toLocaleString()}!`);
      setCustomBid("");
      setBidPulse(true);
      setTimeout(() => setBidPulse(false), 900);
      fetchAuctions();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to place bid");
    } finally {
      setBidding(false);
    }
  }

  function fmt(n?: number | string | null) {
    return "€ " + new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(Number(n || 0));
  }

  const currentBidNum = currentAuction ? Number(currentAuction.currentBid) : 0;
  const minIncNum = currentAuction ? Number(currentAuction.minIncrement) : 500000;
  const hasBids = currentAuction?.bids && currentAuction.bids.length > 0;
  const minNextBid = hasBids ? currentBidNum + minIncNum : currentBidNum;
  const isLeading = currentAuction?.currentWinnerClubId === myClub.id && hasBids;
  const isUrgent = secondsRemaining > 0 && secondsRemaining < 60;

  // eFootball Tier calculation
  const playerOvr = currentAuction?.player.overallRating ?? 85;
  const isEpic = playerOvr >= 88;
  const isBigTime = playerOvr >= 84 && playerOvr < 88;
  const tierLabel = isEpic ? "👑 EPIC LEGEND" : isBigTime ? "⚡ BIG TIME" : "★ GOLD RARE";
  const tierGradient = isEpic
    ? "from-[#f5d475] via-[#d4af37] to-[#b8860b]"
    : isBigTime
    ? "from-purple-400 via-indigo-500 to-sky-500"
    : "from-amber-400 via-amber-500 to-amber-700";

  const stats = currentAuction ? calculateStats(currentAuction.player.position, playerOvr) : null;

  // Active Rival Clubs in War Room
  const rivalClubs = ["WAC Casablanca", "Raja CA", "RS Berkane", "FUS Rabat"];

  return (
    <div className="fixed inset-0 z-50 w-full h-[100dvh] bg-[#070709] text-white flex flex-col justify-between overflow-y-auto overflow-x-hidden font-montserrat select-none">
      <ConfettiCanvas active={showVictoryModal} />

      {/* Background Ambient Glows */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-96 h-96 bg-[#e9c349]/12 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -left-20 w-80 h-80 bg-purple-500/5 rounded-full blur-3xl" />
      </div>

      {/* ─── APP HEADER ─── */}
      <header className="relative z-20 w-full max-w-7xl mx-auto px-6 sm:px-10 py-5 flex items-center justify-between border-b border-white/10 backdrop-blur-md">
        {/* Back Button & Title */}
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1.5 rounded-full border border-white/20 bg-black/60 px-4 py-2 text-xs font-black uppercase tracking-widest text-white shadow-md transition-all hover:scale-105 hover:border-[#e9c349] hover:text-[#e9c349] active:scale-95 cursor-pointer"
          >
            <span>‹</span>
            <span>TRANSFERS</span>
          </button>

          <div>
            <h1 className="font-montserrat text-sm sm:text-base font-black uppercase tracking-wider text-white flex items-center gap-2">
              <span>LIVE AUCTIONS ARENA</span>
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
            </h1>
            <span className="text-[10px] uppercase font-bold text-gray-400 tracking-widest block">
              REAL-TIME MARQUEE BIDDING
            </span>
          </div>
        </div>

        {/* Right Controls: Sound FX Toggle + Live Budget Pill */}
        <div className="flex items-center gap-3">
          {/* Sound FX Button */}
          <button
            type="button"
            onClick={() => {
              const nextState = !soundEnabled;
              setSoundEnabled(nextState);
              if (nextState) soundEngineRef.current.playGavelStrike();
            }}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-black uppercase tracking-wider border transition-all cursor-pointer ${
              soundEnabled
                ? "bg-[#e9c349]/15 border-[#e9c349] text-[#e9c349] shadow-[0_0_12px_rgba(233,195,73,0.3)]"
                : "bg-black/60 border-white/20 text-gray-500 hover:text-white"
            }`}
            title={soundEnabled ? "Sound FX Enabled (Click to Mute)" : "Sound FX Muted (Click to Unmute)"}
          >
            <span>{soundEnabled ? "🔊 SFX ON" : "🔇 MUTED"}</span>
          </button>

          {/* Live Budget Pill */}
          <div className="flex items-center gap-2.5 rounded-full border border-[#e9c349]/80 bg-black/90 px-4 py-2 shadow-[0_0_20px_rgba(233,195,73,0.35)]">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-b from-[#f5d475] to-[#b8860b] text-black font-black text-xs">
              €
            </div>
            <span className="font-montserrat text-sm sm:text-base font-black tracking-wider text-[#e9c349]">
              {new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(myClub.budget)}
            </span>
          </div>
        </div>
      </header>

      {/* ─── SEGMENTED ARENA TABS ─── */}
      <div className="relative z-20 w-full max-w-7xl mx-auto px-6 sm:px-10 pt-4 pb-2 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setViewTab("LIVE")}
          className={`rounded-full px-5 py-2 text-xs font-black uppercase tracking-widest transition-all cursor-pointer ${
            viewTab === "LIVE"
              ? "bg-gradient-to-r from-[#f5d475] to-[#d4af37] text-black shadow-[0_0_15px_rgba(233,195,73,0.4)]"
              : "bg-black/60 border border-white/15 text-gray-400 hover:text-white"
          }`}
        >
          LIVE ARENA ({activeAuctions.length})
        </button>

        <button
          type="button"
          onClick={() => setViewTab("COMPLETED")}
          className={`rounded-full px-5 py-2 text-xs font-black uppercase tracking-widest transition-all cursor-pointer ${
            viewTab === "COMPLETED"
              ? "bg-gradient-to-r from-[#f5d475] to-[#d4af37] text-black shadow-[0_0_15px_rgba(233,195,73,0.4)]"
              : "bg-black/60 border border-white/15 text-gray-400 hover:text-white"
          }`}
        >
          RECENTLY WON / ARCHIVE ({recentAuctions.length})
        </button>
      </div>

      {/* ─── MAIN CONTENT ─── */}
      <main className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-8 py-4 space-y-6">

        {viewTab === "LIVE" && (
          <>
            {/* Multi-Auction Selector (If multiple active) */}
            {activeAuctions.length > 1 && (
              <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none">
                {activeAuctions.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => {
                      setSelectedAuctionId(a.id);
                      setErrorMessage(null);
                      setSuccessMessage(null);
                    }}
                    className={`flex items-center gap-3 rounded-2xl border p-3 min-w-[220px] transition-all text-left cursor-pointer shrink-0 ${
                      a.id === currentAuction?.id
                        ? "border-[#e9c349] bg-gradient-to-r from-[#e9c349]/20 to-black/80 shadow-[0_0_15px_rgba(233,195,73,0.3)]"
                        : "border-white/10 bg-black/60 hover:border-white/30"
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full border border-white/20 bg-black overflow-hidden shrink-0">
                      {a.player.photo ? (
                        <img src={a.player.photo} alt={a.player.fullName} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center font-black text-xs text-[#e9c349]">
                          {a.player.overallRating || "★"}
                        </div>
                      )}
                    </div>
                    <div>
                      <h4 className="text-xs font-black uppercase text-white truncate max-w-[120px]">
                        {a.player.fullName}
                      </h4>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] font-bold text-[#e9c349]">{fmt(a.currentBid)}</span>
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 font-bold">
                          {timeLeft[a.id] || "..."}
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* If NO active auctions */}
            {!loading && activeAuctions.length === 0 ? (
              <div className="rounded-3xl border border-[#e9c349]/30 bg-gradient-to-b from-[#141419]/90 to-[#070709]/95 p-12 text-center backdrop-blur-xl shadow-2xl">
                <div className="w-20 h-20 rounded-full border border-[#e9c349]/40 bg-[#e9c349]/10 mx-auto flex items-center justify-center mb-4">
                  <svg viewBox="0 0 120 90" className="w-14 h-12">
                    <g transform="rotate(-32 60 40)">
                      <rect x="48" y="10" width="24" height="38" rx="4" fill="#f5d475" stroke="#fff" strokeWidth="0.8" />
                      <rect x="57" y="44" width="6" height="42" rx="3" fill="#d4af37" />
                    </g>
                    <rect x="34" y="70" width="52" height="7" rx="3" fill="#d4af37" />
                    <rect x="26" y="77" width="68" height="7" rx="3" fill="#b8860b" />
                  </svg>
                </div>
                <h3 className="font-montserrat text-xl sm:text-2xl font-black uppercase text-[#e9c349] tracking-wider">
                  NO LIVE AUCTIONS ACTIVE RIGHT NOW
                </h3>
                <p className="mt-2 text-xs sm:text-sm text-gray-400 max-w-md mx-auto">
                  Marquee auctions are initiated by league administrators when superstar contracts expire or players enter Admin Custody. Check back during transfer window peaks!
                </p>
                <div className="mt-6">
                  <button
                    type="button"
                    onClick={() => setViewTab("COMPLETED")}
                    className="rounded-full border border-[#e9c349]/60 px-6 py-2.5 text-xs font-black uppercase tracking-widest text-[#e9c349] hover:bg-[#e9c349]/10 cursor-pointer"
                  >
                    VIEW RECENT AUCTIONS ARCHIVE →
                  </button>
                </div>
              </div>
            ) : currentAuction ? (
              /* ─── LIVE BIDDING ARENA ─── */
              <div className="space-y-6">

                {/* ════ SPECIAL APP FEATURE: "WAR ROOM" RIVAL THREAT RADAR ════ */}
                <div className="rounded-3xl border border-[#e9c349]/35 bg-gradient-to-r from-black/90 via-[#101015]/90 to-black/90 p-4 sm:p-5 shadow-2xl backdrop-blur-xl flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    {/* Rotating Animated Radar Widget */}
                    <div className="relative w-16 h-16 rounded-full border border-[#e9c349]/50 bg-black/80 overflow-hidden flex items-center justify-center shrink-0 shadow-[0_0_20px_rgba(233,195,73,0.3)]">
                      {/* Concentric rings */}
                      <div className="absolute inset-2 rounded-full border border-[#e9c349]/20" />
                      <div className="absolute inset-5 rounded-full border border-[#e9c349]/20" />
                      <div className="absolute w-full h-[1px] bg-[#e9c349]/20" />
                      <div className="absolute h-full w-[1px] bg-[#e9c349]/20" />

                      {/* Sweeping radar beam */}
                      <div
                        className="absolute inset-0 rounded-full animate-spin"
                        style={{
                          background: "conic-gradient(from 0deg, rgba(233,195,73,0.4) 0deg, transparent 90deg, transparent 360deg)",
                          animationDuration: "2.8s",
                        }}
                      />

                      {/* Center blip */}
                      <div className="relative z-10 w-2 h-2 rounded-full bg-[#e9c349] shadow-[0_0_8px_#e9c349]" />

                      {/* Orbiting rival dots */}
                      <div className="absolute top-2.5 right-3 w-1.5 h-1.5 rounded-full bg-red-400 animate-ping" />
                      <div className="absolute bottom-3 left-3 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-montserrat text-xs sm:text-sm font-black uppercase tracking-wider text-white">
                          WAR ROOM · RIVAL THREAT RADAR
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/40 text-[9px] font-black uppercase tracking-widest">
                          ● 4 RIVALS HOVERING
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        {rivalClubs.map((club) => (
                          <span
                            key={club}
                            className="text-[9px] font-bold text-gray-400 bg-white/5 border border-white/10 px-2 py-0.5 rounded-md"
                          >
                            {club}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Real-time Dramatic Intelligence Alert */}
                  {dramaticAlert ? (
                    <div className="w-full md:w-auto px-4 py-2 rounded-2xl bg-gradient-to-r from-[#e9c349]/15 to-transparent border border-[#e9c349]/40 text-xs font-black text-[#e9c349] flex items-center gap-2 shadow-[0_0_15px_rgba(233,195,73,0.2)] animate-pulse">
                      <span>{dramaticAlert}</span>
                    </div>
                  ) : (
                    <div className="w-full md:w-auto px-4 py-2 rounded-2xl bg-white/5 border border-white/10 text-xs font-bold text-gray-400 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      <span>{isLeading ? "🛡️ You hold the lead · Defense active" : "⚡ Waiting for your move"}</span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                  {/* LEFT COL: eFootball 3D Luxury Player Card (5 cols) */}
                  <div className="lg:col-span-5 flex flex-col items-center">
                    <div className="relative w-full max-w-[340px] rounded-3xl p-1 bg-gradient-to-b from-[#e9c349]/80 via-white/20 to-black shadow-[0_0_40px_rgba(233,195,73,0.3)]">
                      <div className="relative rounded-[22px] bg-[#0c0d12] p-5 overflow-hidden flex flex-col items-center">
                        {/* Holographic background sheen */}
                        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-[#e9c349]/10 to-transparent pointer-events-none" />

                        {/* Card Header: Tier Badge & OVR */}
                        <div className="w-full flex items-center justify-between z-10">
                          <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-gradient-to-r ${tierGradient} text-black font-mono shadow-md`}>
                            {tierLabel}
                          </span>
                          <div className="flex items-baseline gap-1 text-[#e9c349]">
                            <span className="text-3xl font-black">{playerOvr}</span>
                            <span className="text-xs font-black uppercase text-white/80">{currentAuction.player.position}</span>
                          </div>
                        </div>

                        {/* Player Image with Glowing Ring */}
                        <div className="relative w-36 h-36 sm:w-40 sm:h-40 my-3 rounded-full p-1 bg-gradient-to-b from-[#e9c349] to-transparent shadow-[0_0_25px_rgba(233,195,73,0.4)]">
                          {currentAuction.player.photo ? (
                            <img
                              src={currentAuction.player.photo}
                              alt={currentAuction.player.fullName}
                              className="w-full h-full object-cover rounded-full bg-black"
                            />
                          ) : (
                            <div className="w-full h-full rounded-full bg-gradient-to-b from-gray-800 to-black flex items-center justify-center font-black text-4xl text-[#e9c349]">
                              {playerOvr}
                            </div>
                          )}
                        </div>

                        {/* Player Name & Info */}
                        <h3 className="font-montserrat text-lg sm:text-xl font-black uppercase tracking-wider text-white text-center mt-1 truncate max-w-full">
                          {currentAuction.player.fullName}
                        </h3>
                        <div className="flex items-center gap-2 mt-1 text-xs text-gray-400 font-bold">
                          <span>{currentAuction.player.realClub}</span>
                          <span>·</span>
                          <span>{currentAuction.player.nationality}</span>
                        </div>

                        {/* 6 Realistic Radar Stat Tiles */}
                        {stats && (
                          <div className="w-full grid grid-cols-6 gap-1 mt-4 pt-3 border-t border-white/10 text-center">
                            {[
                              { label: "PAC", val: stats.pac },
                              { label: "SHO", val: stats.sho },
                              { label: "PAS", val: stats.pas },
                              { label: "DRI", val: stats.dri },
                              { label: "DEF", val: stats.def },
                              { label: "PHY", val: stats.phy },
                            ].map((s) => (
                              <div key={s.label} className="bg-black/60 rounded-lg py-1 border border-white/5">
                                <span className="text-[9px] uppercase font-bold text-gray-400 block">{s.label}</span>
                                <span className="text-xs font-black text-[#e9c349]">{s.val}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* RIGHT COL: Live Bidding Arena HUD (7 cols) */}
                  <div className="lg:col-span-7 space-y-4">

                    {/* HUD Card */}
                    <div className={`rounded-3xl border bg-black/80 backdrop-blur-xl p-6 shadow-2xl transition-all ${
                      bidPulse ? "border-[#e9c349] shadow-[0_0_35px_rgba(233,195,73,0.5)] scale-[1.01]" : "border-white/15"
                    }`}>
                      {/* Top Status & Timer Bar */}
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
                        <div className="flex items-center gap-2">
                          <span className="flex items-center gap-2 rounded-full px-3 py-1 text-xs font-black uppercase tracking-widest bg-red-500/20 text-red-400 border border-red-500/50">
                            <span className="w-2 h-2 rounded-full bg-red-400 animate-ping" />
                            <span>LIVE AUCTION</span>
                          </span>
                          <span className="text-[10px] font-mono text-gray-400 uppercase">
                            ⏱ +60s Anti-Snipe
                          </span>
                        </div>

                        {/* Glowing Countdown Timer */}
                        <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full border font-mono font-black text-sm sm:text-base ${
                          isUrgent
                            ? "bg-red-500/25 border-red-500 text-red-400 animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.5)]"
                            : "bg-[#e9c349]/15 border-[#e9c349]/50 text-[#e9c349]"
                        }`}>
                          <span className="text-xs">TIME LEFT:</span>
                          <span>{timeLeft[currentAuction.id] || "00:00"}</span>
                        </div>
                      </div>

                      {/* Current Highest Bid Highlight */}
                      <div className="py-5 text-center sm:text-left flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                          <span className="text-[10px] uppercase font-black tracking-widest text-gray-400 block">
                            CURRENT HIGHEST BID
                          </span>
                          <p className="font-montserrat text-3xl sm:text-4xl font-black text-[#e9c349] drop-shadow-[0_0_15px_rgba(233,195,73,0.5)] mt-1">
                            {fmt(currentBidNum)}
                          </p>
                          <span className="text-xs text-gray-500 mt-1 block">
                            Starting Price: {fmt(currentAuction.startingPrice)} · Min Increment: {fmt(currentAuction.minIncrement)}
                          </span>
                        </div>

                        {/* Leading Club Banner */}
                        <div className={`p-4 rounded-2xl border flex items-center gap-3 ${
                          isLeading
                            ? "border-emerald-500/50 bg-emerald-500/10 shadow-[0_0_20px_rgba(16,185,129,0.25)]"
                            : currentAuction.currentWinnerClub
                            ? "border-white/10 bg-white/5"
                            : "border-gray-800 bg-black/40"
                        }`}>
                          <div className="w-10 h-10 rounded-xl border border-white/20 bg-black/80 flex items-center justify-center overflow-hidden">
                            {currentAuction.currentWinnerClub?.logo ? (
                              <img src={currentAuction.currentWinnerClub.logo} alt="Leader" className="w-full h-full object-contain" />
                            ) : (
                              <span className="text-xs font-black text-[#e9c349]">
                                {currentAuction.currentWinnerClub?.name?.slice(0, 2).toUpperCase() || "—"}
                              </span>
                            )}
                          </div>
                          <div>
                            <span className="text-[9px] font-black uppercase tracking-widest block text-gray-400">
                              {isLeading ? "👑 YOU ARE LEADING" : "CURRENT LEADER"}
                            </span>
                            <span className="text-xs sm:text-sm font-black text-white">
                              {isLeading ? myClub.name : currentAuction.currentWinnerClub?.name || "No Bids Yet"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Messages */}
                      {errorMessage && (
                        <div className="mb-3 p-3 rounded-xl bg-red-500/20 border border-red-500/50 text-xs font-bold text-red-300">
                          {errorMessage}
                        </div>
                      )}
                      {successMessage && (
                        <div className="mb-3 p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/50 text-xs font-bold text-emerald-300">
                          {successMessage}
                        </div>
                      )}

                      {/* Quick Bid Buttons Row */}
                      <div className="space-y-3 pt-2 border-t border-white/10">
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 block">
                          ONE-TAP QUICK BID
                        </span>
                        <div className="grid grid-cols-3 gap-2">
                          {[500000, 1000000, 2500000].map((inc) => {
                            const target = minNextBid + inc;
                            const canAfford = myClub.budget >= target;
                            return (
                              <button
                                key={inc}
                                type="button"
                                disabled={bidding || isLeading || !canAfford}
                                onClick={() => handlePlaceBid(target)}
                                className="rounded-2xl border border-[#e9c349]/40 bg-gradient-to-b from-[#1c1c24] to-[#0d0d12] p-2.5 sm:p-3 text-center transition-all hover:scale-105 hover:border-[#e9c349] active:scale-95 disabled:opacity-40 cursor-pointer shadow-md"
                              >
                                <span className="text-[10px] font-bold text-gray-400 block">+€{(inc / 1000000).toFixed(1)}M</span>
                                <span className="text-xs sm:text-sm font-black text-[#e9c349]">{fmt(target)}</span>
                              </button>
                            );
                          })}
                        </div>

                        {/* Custom Bid Row */}
                        <div className="flex items-center gap-2 pt-1">
                          <div className="relative flex-1">
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">€</span>
                            <input
                              type="number"
                              placeholder={`Min €${minNextBid.toLocaleString()}`}
                              value={customBid}
                              onChange={(e) => setCustomBid(e.target.value)}
                              className="w-full rounded-full border border-white/20 bg-black/80 pl-7 pr-3 py-2.5 text-xs text-white font-mono focus:border-[#e9c349] focus:outline-none"
                            />
                          </div>

                          <button
                            type="button"
                            disabled={bidding || isLeading || !customBid || Number(customBid) < minNextBid}
                            onClick={() => handlePlaceBid(Number(customBid))}
                            className="rounded-full px-6 py-2.5 text-xs font-black uppercase tracking-widest text-black shadow-lg transition-all hover:scale-105 active:scale-95 disabled:opacity-40 cursor-pointer shrink-0"
                            style={{
                              background: "linear-gradient(135deg, #f5d475 0%, #d4af37 50%, #b8860b 100%)",
                            }}
                          >
                            {bidding ? "BIDDING..." : isLeading ? "HOLDING LEAD" : "PLACE BID"}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Real-time Live Bids Ledger */}
                    <div className="rounded-3xl border border-white/15 bg-black/70 backdrop-blur-xl p-5 shadow-2xl">
                      <h3 className="text-xs font-black uppercase tracking-wider text-white mb-3 flex items-center justify-between">
                        <span>LIVE BIDS STREAM</span>
                        <span className="text-[10px] text-[#e9c349] font-mono">
                          {currentAuction.bids?.length || 0} TOTAL BIDS
                        </span>
                      </h3>

                      <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                        {(!currentAuction.bids || currentAuction.bids.length === 0) ? (
                          <p className="text-xs text-gray-500 text-center py-6">No bids recorded yet. Be the first to bid!</p>
                        ) : (
                          currentAuction.bids.map((b, idx) => (
                            <div
                              key={b.id || idx}
                              className={`flex items-center justify-between p-2.5 rounded-xl border text-xs ${
                                b.club.id === myClub.id
                                  ? "border-[#e9c349]/50 bg-[#e9c349]/10 text-white"
                                  : "border-white/5 bg-white/5 text-gray-300"
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span className="w-5 h-5 rounded-full border border-white/20 bg-black flex items-center justify-center text-[9px] font-black text-[#e9c349]">
                                  {b.club.name.slice(0, 2).toUpperCase()}
                                </span>
                                <span className="font-bold">{b.club.name}</span>
                                {b.club.id === myClub.id && (
                                  <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-[#e9c349] text-black">YOU</span>
                                )}
                              </div>
                              <span className="font-mono font-black text-[#e9c349]">{fmt(b.amount)}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                  </div>

                </div>
              </div>
            ) : null}
          </>
        )}

        {/* ─── TAB 2: COMPLETED / RECENT AUCTIONS ─── */}
        {viewTab === "COMPLETED" && (
          <div className="space-y-4">
            {recentAuctions.length === 0 ? (
              <div className="rounded-3xl border border-white/10 bg-black/60 p-12 text-center">
                <span className="text-4xl">📜</span>
                <h3 className="text-base font-black text-white mt-3">No Past Auctions Recorded</h3>
                <p className="text-xs text-gray-400 mt-1">Completed auctions and winner records will appear here.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {recentAuctions.map((a) => (
                  <div
                    key={a.id}
                    className="rounded-3xl border border-white/15 bg-black/80 p-5 shadow-xl flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl border border-white/15 bg-black overflow-hidden flex items-center justify-center shrink-0">
                        {a.player.photo ? (
                          <img src={a.player.photo} alt={a.player.fullName} className="w-full h-full object-cover" />
                        ) : (
                          <span className="font-black text-[#e9c349]">{a.player.overallRating}</span>
                        )}
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-white uppercase">{a.player.fullName}</h4>
                        <p className="text-xs text-gray-400 mt-0.5">
                          Winner: <span className="font-bold text-[#e9c349]">{a.currentWinnerClub?.name || "Unsold"}</span>
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-sm sm:text-base font-black text-[#e9c349] block">{fmt(a.currentBid)}</span>
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 mt-1 inline-block">
                        WON & SIGNED
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </main>

      {/* ─── VICTORY MODAL ─── */}
      {showVictoryModal && currentAuction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="relative w-full max-w-md rounded-3xl border-2 border-[#e9c349] bg-gradient-to-b from-[#181820] to-[#0a0a0d] p-8 text-center shadow-[0_0_60px_rgba(233,195,73,0.6)]">
            <span className="text-5xl">🏆</span>
            <h2 className="mt-3 font-montserrat text-2xl font-black uppercase tracking-wider text-[#e9c349]">
              AUCTION WON!
            </h2>
            <p className="mt-2 text-sm text-gray-300">
              Congratulations! Your club won the bidding war for <span className="font-bold text-white">{currentAuction.player.fullName}</span>!
            </p>
            <div className="my-4 p-4 rounded-2xl bg-black/60 border border-white/10">
              <span className="text-xs text-gray-400 uppercase font-bold block">Final Winning Bid</span>
              <span className="text-2xl font-black text-[#e9c349] mt-1 block">{fmt(currentAuction.currentBid)}</span>
            </div>
            <button
              type="button"
              onClick={() => setShowVictoryModal(false)}
              className="w-full rounded-full py-3 text-xs font-black uppercase tracking-widest text-black shadow-lg cursor-pointer"
              style={{
                background: "linear-gradient(135deg, #f5d475 0%, #d4af37 50%, #b8860b 100%)",
              }}
            >
              CLAIM PLAYER & CONTINUE
            </button>
          </div>
        </div>
      )}

      {/* ─── FOOTER ─── */}
      <footer className="relative z-10 w-full text-center py-4 border-t border-white/10 text-[10px] font-mono tracking-widest text-gray-500">
        PMB LEAGUE MANAGER · REAL-TIME LIVE AUCTIONS
      </footer>
    </div>
  );
}
