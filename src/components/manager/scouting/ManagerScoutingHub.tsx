"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import Link from "next/link";
import { ClubBadge } from "@/components/ClubBadge";
import { Toast } from "@/components/Toast";
import { useToast } from "@/lib/use-toast";

type DepthPosition = {
  pos: string;
  name: string;
  count: number;
  minIdeal: number;
  rating: number;
  status: string;
  best: { fullName: string; overallRating: number } | null;
  weakest: { fullName: string; overallRating: number } | null;
};

type GapAlert = {
  id: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "INFO";
  title: string;
  positionGroup: "GK" | "DEF" | "MID" | "ATT" | "GENERAL";
  description: string;
  targetPositions: string[];
};

type RecommendedPlayer = {
  id: string;
  playerId: number;
  fullName: string;
  position: string;
  overallRating: number;
  marketValue: number;
  realClub: string;
  nationality: string;
  photo?: string | null;
  fitsGap: boolean;
  affordable: boolean;
  reason: string;
};

type RivalTarget = {
  id: string;
  playerId: number;
  fullName: string;
  position: string;
  overallRating: number;
  marketValue: number;
  currentClubName: string;
  currentClubLogo?: string | null;
  realClub: string;
  nationality: string;
  photo?: string | null;
  fitsGap: boolean;
  affordable: boolean;
  reason: string;
};

type AuctionOpportunity = {
  auctionId: string;
  playerId: string;
  fullName: string;
  position: string;
  overallRating: number;
  photo?: string | null;
  realClub: string;
  currentBid: number;
  minIncrement: number;
  nextBid: number;
  expiresAt: string;
  isWinning: boolean;
  currentWinnerName: string;
  affordable: boolean;
  reason: string;
};

type BestForBudgetCandidate = {
  id: string;
  playerId: number;
  fullName: string;
  position: string;
  overallRating: number;
  marketValue: number;
  nationality: string;
  realClub: string;
  currentClubName: string;
  ratingImprovement: number;
  isNeeded: boolean;
  impactSummary: string;
};

type ScoutingData = {
  enabled: boolean;
  clubName?: string;
  clubLogo?: string | null;
  aiScoutTier?: string;
  message?: string;
  club?: {
    id: string;
    name: string;
    logo: string | null;
    budget: number;
    leagueName: string;
    aiScoutTier: string;
  };
  audit?: {
    squadSize: number;
    overallRating: number;
    gkRating: number;
    defRating: number;
    midRating: number;
    attRating: number;
    startingXiAvg: number;
    benchAvg: number;
    benchQualityDeficit: number;
    counts: {
      gk: number;
      def: number;
      mid: number;
      att: number;
    };
    healthScores: {
      overall: number;
      gk: number;
      def: number;
      mid: number;
      att: number;
    };
    sellOrLoanCandidates: Array<{
      id: string;
      fullName: string;
      position: string;
      overallRating: number;
      marketValue: number;
      action: "SELL" | "LOAN";
      reason: string;
    }>;
  };
  depthMatrix?: DepthPosition[];
  leagueBenchmarks?: {
    myRanks: {
      overall: number;
      gk: number;
      def: number;
      mid: number;
      att: number;
      totalClubs: number;
    };
    leagueAverage: { ovr: number; gk: number; def: number; mid: number; att: number };
    leagueLeader: { name: string; ovr: number; gk: number; def: number; mid: number; att: number } | null;
    top3Average: { ovr: number; gk: number; def: number; mid: number; att: number };
    closestCompetitor: { name: string; ovr: number; gk: number; def: number; mid: number; att: number } | null;
    lowestClub: { name: string; ovr: number; gk: number; def: number; mid: number; att: number } | null;
  };
  gapAlerts?: GapAlert[];
  nextOpponentReport?: {
    hasUpcomingMatch: boolean;
    message?: string;
    matchId?: string;
    matchday?: number;
    competitionName?: string;
    isHome?: boolean;
    opponent?: {
      id: string;
      name: string;
      logo: string | null;
      managerUsername: string;
      squadSize: number;
      overallRating: number;
      ratings: {
        gk: number;
        def: number;
        mid: number;
        att: number;
      };
    };
    bestPlayers?: Array<{
      id: string;
      fullName: string;
      position: string;
      overallRating: number;
      photo?: string | null;
      marketValue: number;
    }>;
    topScorers?: Array<{
      id: string;
      fullName: string;
      position: string;
      overallRating: number;
      goals: number;
    }>;
    topAssists?: Array<{
      id: string;
      fullName: string;
      position: string;
      overallRating: number;
      assists: number;
    }>;
    matchPlan?: {
      formation: string;
      tacticalApproach: string;
      mainThreat: string;
      areaToExploit: string;
      playerToMark: string;
      defensiveStrategy: string;
      attackingStrategy: string;
      scoutVerdict: string;
    };
  };
  budgetPlanner?: {
    totalBudget: number;
    primaryAllocation: { targetPosition: string; suggestedAmount: number; reason: string };
    secondaryAllocation: { targetPosition: string; suggestedAmount: number; reason: string };
    emergencyReserve: { amount: number; reason: string };
    financialAdvice: string;
  };
  recommendations?: {
    immediateStarters: RecommendedPlayer[];
    budgetGems: RecommendedPlayer[];
    auctionOpportunities: AuctionOpportunity[];
    rivalClubTargets: RivalTarget[];
    bestAvailableForBudget: BestForBudgetCandidate[];
  };
  transferWindowOverview?: {
    recentCompletedTransfers: Array<{
      id: string;
      playerName: string;
      position: string;
      overallRating: number;
      fromClubName: string;
      toClubName: string;
      fee: number;
      type: string;
      completedAt: string;
    }>;
  };
  squadPlayers?: Array<{
    id: string;
    fullName: string;
    position: string;
    nationality: string;
    overallRating: number;
    marketValue: number;
  }>;
  allAvailablePlayers?: Array<{
    id: string;
    fullName: string;
    position: string;
    nationality: string;
    overallRating: number;
    marketValue: number;
    realClub: string;
  }>;
};

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type PlayerDossierData = {
  player: {
    id: string;
    playerId: number;
    fullName: string;
    position: string;
    nationality: string;
    realClub: string;
    photo?: string | null;
    overallRating: number;
    marketValue: number;
    status: string;
    currentClub?: { id: string; name: string; logo?: string | null } | null;
  };
  evaluation: {
    squadRole: string;
    recommendation: "HIGHLY_RECOMMENDED" | "CONSIDER" | "ONLY_IF_NEEDED" | "NOT_RECOMMENDED";
    recommendationReason: string;
    tacticalFitScore: number;
    strengths: string[];
    weaknesses: string[];
    squadComparison: {
      squadAvgOvr: number;
      clubPosAvg: number | null;
      bestClubPlayer: { fullName: string; overallRating: number } | null;
      ovrDeltaVsPos: number;
      ovrDeltaVsSquad: number;
    };
    financialImpact: {
      playerPrice: number;
      clubBudget: number;
      isAffordable: boolean;
      remainingBudgetAfterSigning: number;
      budgetPercentUsed: number;
    };
  };
};

export function ManagerScoutingHub({
  initialData,
}: {
  initialData: ScoutingData;
}) {
  const [data, setData] = useState<ScoutingData>(initialData);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [activeTab, setActiveTab] = useState<
    | "bestForBudget"
    | "starters"
    | "gems"
    | "auctions"
    | "rivals"
    | "opponent"
    | "simulator"
    | "financial"
    | "searchHub"
    | "rivalMoves"
  >("bestForBudget");

  // 3-Way Simulator State
  const [simTargetA, setSimTargetA] = useState<string>("");
  const [simTargetB, setSimTargetB] = useState<string>("");
  const [simTargetC, setSimTargetC] = useState<string>("");

  // Visual Search Hub State
  const [searchQ, setSearchQ] = useState("");
  const [searchPos, setSearchPos] = useState("ALL");
  const [searchNat, setSearchNat] = useState("ALL");
  const [searchMinOvr, setSearchMinOvr] = useState("70");
  const [searchMaxPrice, setSearchMaxPrice] = useState("");
  const [searchStatus, setSearchStatus] = useState("ALL");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [distinctNationalities, setDistinctNationalities] = useState<Array<{ name: string; count: number }>>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchTotal, setSearchTotal] = useState(0);

  // Player Dossier Modal State
  const [selectedPlayerDossier, setSelectedPlayerDossier] = useState<PlayerDossierData | null>(null);
  const [loadingDossier, setLoadingDossier] = useState(false);

  // Chat State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: `Greetings Manager! I am your **VIP Sporting Director & Chief Scout**.\n\nI am connected directly to your club **${data.club?.name || "squad"}** and your **422-player PostgreSQL database**.\n\nAsk me to search by nationality, evaluate budget targets, scout rivals, or generate matchday plans!`,
    },
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const { toast, showSuccess, showError, dismiss } = useToast();

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, isSendingMessage]);

  const handleRefreshAudit = async () => {
    setLoadingAudit(true);
    try {
      const res = await fetch("/api/manager/scouting");
      if (!res.ok) throw new Error("Failed to refresh AI audit");
      const updated = await res.json();
      setData(updated);
      showSuccess("✨ Squad health score, league ranks, and match plan refreshed");
    } catch (err: any) {
      showError(err.message || "Failed to refresh audit");
    } finally {
      setLoadingAudit(false);
    }
  };

  const handleOpenDossier = async (playerId: string) => {
    setLoadingDossier(true);
    try {
      const res = await fetch(`/api/manager/scouting/player/${playerId}`);
      if (!res.ok) throw new Error("Failed to load player scout dossier");
      const dossier = await res.json();
      setSelectedPlayerDossier(dossier);
    } catch (err: any) {
      showError(err.message || "Failed to load dossier");
    } finally {
      setLoadingDossier(false);
    }
  };

  const handleExecuteVisualSearch = async () => {
    setSearchLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQ) params.set("q", searchQ);
      if (searchPos !== "ALL") params.set("position", searchPos);
      if (searchNat !== "ALL") params.set("nationality", searchNat);
      if (searchMinOvr) params.set("minRating", searchMinOvr);
      if (searchMaxPrice) params.set("maxPrice", searchMaxPrice);
      if (searchStatus !== "ALL") params.set("status", searchStatus);

      const res = await fetch(`/api/manager/scouting/search?${params.toString()}`);
      if (!res.ok) throw new Error("Search failed");
      const result = await res.json();
      setSearchResults(result.players);
      setSearchTotal(result.total);
      if (result.nationalities && result.nationalities.length > 0) {
        setDistinctNationalities(result.nationalities);
      }
    } catch (err: any) {
      showError(err.message || "Failed to execute search");
    } finally {
      setSearchLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "searchHub" && searchResults.length === 0) {
      handleExecuteVisualSearch();
    }
  }, [activeTab]);

  const handleSendMessage = async (customText?: string) => {
    const textToSend = customText || inputMessage;
    if (!textToSend.trim() || isSendingMessage) return;

    const newMessages: ChatMessage[] = [
      ...chatMessages,
      { role: "user", content: textToSend },
    ];
    setChatMessages(newMessages);
    if (!customText) setInputMessage("");
    setIsSendingMessage(true);

    try {
      const res = await fetch("/api/manager/scouting/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: textToSend,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to get scout response");
      }

      const responseData = await res.json();
      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", content: responseData.reply },
      ]);
    } catch (err: any) {
      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `⚠️ Error: ${err.message || "Failed to query database."}`,
        },
      ]);
    } finally {
      setIsSendingMessage(false);
    }
  };

  // ═════════════════════════════════════════════════════════════════════════
  // LOCKED / PAID SERVICE PAYWALL STATE
  // ═════════════════════════════════════════════════════════════════════════
  if (!data.enabled) {
    return (
      <div className="space-y-8 max-w-5xl mx-auto">
        <Toast toast={toast} onDismiss={dismiss} />

        <section className="relative overflow-hidden rounded-3xl border-2 border-pmb-gold/50 bg-gradient-to-b from-pmb-charcoal via-pmb-black to-pmb-charcoal p-8 sm:p-12 text-center shadow-[0_0_50px_rgba(212,175,55,0.15)]">
          <div className="absolute -top-24 -left-24 w-72 h-72 bg-pmb-gold/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-pmb-gold/10 rounded-full blur-3xl" />

          <div className="relative z-10 max-w-3xl mx-auto space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-pmb-gold/50 bg-pmb-gold/15 px-4 py-1.5 text-xs font-extrabold text-pmb-gold tracking-widest uppercase shadow">
              <span>🔒 VIP PRO FEATURE</span>
              <span>•</span>
              <span>RESTRICTED ACCESS</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-extrabold font-serif text-white tracking-tight leading-tight">
              PMB Chief Scout <span className="text-pmb-gold">VIP Intelligence Center</span>
            </h1>

            <p className="text-base sm:text-lg text-gray-300 leading-relaxed">
              Elevate your club with professional sporting intelligence. Get automated squad health scores /100,
              nationality-based scouting, tactical match plans, 3-way simulators, and player dossiers.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left pt-6">
              <div className="rounded-2xl border border-pmb-gold/25 bg-black/60 p-5 space-y-2">
                <div className="text-2xl">🛡️</div>
                <h3 className="font-bold text-white text-base">Squad Health Score /100</h3>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Deep positional health audits, starting XI vs bench deficits, and surplus sell/loan recommendations.
                </p>
              </div>

              <div className="rounded-2xl border border-pmb-gold/25 bg-black/60 p-5 space-y-2">
                <div className="text-2xl">🇲🇦</div>
                <h3 className="font-bold text-white text-base">Nationality & Multi-Filter Scouting</h3>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Query verified nationalities (Morocco, France, Senegal, Brazil, etc.) and combine complex search filters.
                </p>
              </div>

              <div className="rounded-2xl border border-pmb-gold/25 bg-black/60 p-5 space-y-2">
                <div className="text-2xl">⚔️</div>
                <h3 className="font-bold text-white text-base">Next Opponent Match Plan</h3>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Tactical breakdown, danger men, top scorers ⚽, top assists 👟, and tailored counter-formations.
                </p>
              </div>

              <div className="rounded-2xl border border-pmb-gold/25 bg-black/60 p-5 space-y-2">
                <div className="text-2xl">📋</div>
                <h3 className="font-bold text-white text-base">Player Scout Dossiers</h3>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Detailed evaluation cards with strengths, weaknesses, tactical fit scores, and recommendation badges.
                </p>
              </div>
            </div>

            <div className="pt-6 border-t border-pmb-gold/20 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/manager/social"
                className="w-full sm:w-auto rounded-xl border border-pmb-gold bg-pmb-gold px-8 py-3 text-sm font-extrabold text-black hover:bg-white hover:border-white transition shadow-lg flex items-center justify-center gap-2"
              >
                <span>💬 Message Admin in Dugout to Activate VIP</span>
              </Link>
            </div>

            <p className="text-xs text-gray-500">
              * AI Scout access is managed per club by the PMB League Administrator.
            </p>
          </div>
        </section>
      </div>
    );
  }

  // ═════════════════════════════════════════════════════════════════════════
  // UNLOCKED VIP SPORTING INTELLIGENCE CENTER
  // ═════════════════════════════════════════════════════════════════════════
  const club = data.club!;
  const audit = data.audit!;
  const depthMatrix = data.depthMatrix || [];
  const benchmarks = data.leagueBenchmarks || {
    myRanks: { overall: 1, gk: 1, def: 1, mid: 1, att: 1, totalClubs: 20 },
    leagueAverage: { ovr: 78, gk: 78, def: 79, mid: 80, att: 81 },
    leagueLeader: null,
    top3Average: { ovr: 84, gk: 85, def: 84, mid: 86, att: 85 },
    closestCompetitor: null,
    lowestClub: null,
  };
  const gapAlerts = data.gapAlerts || [];
  const recs = data.recommendations || {
    immediateStarters: [],
    budgetGems: [],
    auctionOpportunities: [],
    rivalClubTargets: [],
    bestAvailableForBudget: [],
  };

  // Simulator Pool
  const allCandidatePool = useMemo(() => {
    const list = [
      ...(data.allAvailablePlayers || []),
      ...(recs.immediateStarters || []),
      ...(recs.budgetGems || []),
      ...(recs.rivalClubTargets || []),
    ];
    const seen = new Set();
    return list.filter((p) => {
      if (seen.has(p.fullName)) return false;
      seen.add(p.fullName);
      return true;
    });
  }, [data.allAvailablePlayers, recs]);

  const candidateA = allCandidatePool.find((p) => p.id === simTargetA || p.fullName === simTargetA);
  const candidateB = allCandidatePool.find((p) => p.id === simTargetB || p.fullName === simTargetB);
  const candidateC = allCandidatePool.find((p) => p.id === simTargetC || p.fullName === simTargetC);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <Toast toast={toast} onDismiss={dismiss} />

      {/* ── 1. HEADER & SQUAD HEALTH SCORE BAR ────────────────────────────── */}
      <section className="relative overflow-hidden rounded-3xl border border-pmb-gold/40 bg-gradient-to-r from-pmb-black via-pmb-charcoal to-pmb-black p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <ClubBadge name={club.name} logo={club.logo} size="lg" />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-extrabold font-serif text-white">
                  {club.name} <span className="text-pmb-gold">Sporting Intelligence Center</span>
                </h1>
                <span className="rounded-full border border-pmb-gold/60 bg-pmb-gold/20 px-2.5 py-0.5 text-[11px] font-extrabold text-pmb-gold uppercase tracking-wider animate-pulse">
                  🌟 VIP PRO ACTIVE
                </span>
              </div>
              <p className="text-xs sm:text-sm text-gray-400 mt-1">
                {club.leagueName} • Real-time Squad Audits, PostgreSQL Scouting & Tactical Match Plans
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Squad Health Score Pill */}
            <div className="rounded-2xl border border-pmb-gold/40 bg-black/70 px-4 py-3 text-center flex items-center gap-3">
              <div className="h-12 w-12 rounded-full border-2 border-pmb-gold flex items-center justify-center font-black text-pmb-gold text-lg bg-pmb-gold/10">
                {audit.healthScores?.overall || 82}
              </div>
              <div className="text-left">
                <p className="text-[10px] text-gray-400 font-bold uppercase">Squad Health</p>
                <p className="text-xs font-black text-white">
                  {audit.healthScores?.overall >= 80 ? "🟢 OPTIMAL DEPTH" : "🟡 GAPS DETECTED"}
                </p>
              </div>
            </div>

            {/* Budget Pill */}
            <div className="rounded-2xl border border-pmb-gold/30 bg-black/70 px-4 py-3 text-right">
              <p className="text-[10px] text-gray-400 font-bold uppercase">Available Budget</p>
              <p className="text-xl font-extrabold text-pmb-gold">
                €{(club.budget / 1_000_000).toFixed(2)}M
              </p>
            </div>

            <button
              onClick={handleRefreshAudit}
              disabled={loadingAudit}
              className="rounded-2xl border border-white/20 bg-pmb-charcoal px-4 py-3.5 text-xs font-bold text-white hover:border-pmb-gold hover:text-pmb-gold transition disabled:opacity-50 flex items-center gap-2"
            >
              <span className={loadingAudit ? "animate-spin" : ""}>🔄</span>
              <span>{loadingAudit ? "Auditing..." : "Re-Audit"}</span>
            </button>
          </div>
        </div>

        {/* Positional Health Scores Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-white/10 text-center">
          <div className="rounded-xl bg-black/50 border border-white/5 p-2.5">
            <p className="text-[10px] text-gray-400 font-bold uppercase">🧤 Goalkeeping</p>
            <p className="text-lg font-black text-pmb-gold mt-0.5">{audit.healthScores?.gk || 85}/100</p>
            <p className="text-[10px] text-gray-400">Avg: {audit.gkRating || "—"} OVR</p>
          </div>
          <div className="rounded-xl bg-black/50 border border-white/5 p-2.5">
            <p className="text-[10px] text-gray-400 font-bold uppercase">🛡️ Defense</p>
            <p className="text-lg font-black text-pmb-gold mt-0.5">{audit.healthScores?.def || 78}/100</p>
            <p className="text-[10px] text-gray-400">Rank #{benchmarks.myRanks.def} in League</p>
          </div>
          <div className="rounded-xl bg-black/50 border border-white/5 p-2.5">
            <p className="text-[10px] text-gray-400 font-bold uppercase">⚙️ Midfield</p>
            <p className="text-lg font-black text-pmb-gold mt-0.5">{audit.healthScores?.mid || 84}/100</p>
            <p className="text-[10px] text-gray-400">Rank #{benchmarks.myRanks.mid} in League</p>
          </div>
          <div className="rounded-xl bg-black/50 border border-white/5 p-2.5">
            <p className="text-[10px] text-gray-400 font-bold uppercase">⚡ Attack</p>
            <p className="text-lg font-black text-pmb-gold mt-0.5">{audit.healthScores?.att || 71}/100</p>
            <p className="text-[10px] text-gray-400">Rank #{benchmarks.myRanks.att} in League</p>
          </div>
        </div>
      </section>

      {/* ── 2. DEEP SQUAD AUDIT & 10-POSITION DEPTH MATRIX ────────────────── */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Positional Depth Matrix with Strongest & Weakest */}
        <div className="lg:col-span-2 rounded-2xl border border-white/10 bg-pmb-charcoal/80 p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>🛡️ 10-Position Depth Matrix & Player Quality</span>
              </h2>
              <p className="text-xs text-gray-400">Coverage, strongest starter, and weakest backup per role</p>
            </div>
            <div className="text-right">
              <span className="text-xs font-bold text-pmb-gold">{audit.squadSize} Players</span>
              <p className="text-[10px] text-gray-400">XI: {audit.startingXiAvg} OVR • Bench: {audit.benchAvg} OVR</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            {depthMatrix.map((item) => (
              <div
                key={item.pos}
                className={`rounded-xl border p-3 flex flex-col justify-between transition ${
                  item.status === "DEFICIT"
                    ? "border-red-500/40 bg-red-950/20 shadow-[0_0_10px_rgba(239,68,68,0.1)]"
                    : "border-white/10 bg-black/40 hover:border-pmb-gold/30"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="rounded bg-black/60 px-1.5 py-0.5 text-xs font-black text-pmb-gold border border-white/10">
                    {item.pos}
                  </span>
                  <span
                    className={`text-[10px] font-extrabold uppercase px-1.5 py-0.2 rounded ${
                      item.status === "DEFICIT" ? "bg-red-500/30 text-red-400" : "bg-emerald-500/20 text-emerald-400"
                    }`}
                  >
                    {item.status === "DEFICIT" ? "⚠️ GAP" : "✓ OK"}
                  </span>
                </div>

                <div className="mt-2 text-center">
                  <p className="text-2xl font-black text-white">{item.count}</p>
                  <p className="text-[10px] text-gray-400 font-semibold">{item.name}</p>
                  <p className="text-[10px] font-bold text-gray-300 mt-1">
                    {item.rating > 0 ? `${item.rating} OVR Avg` : "No Players"}
                  </p>
                </div>

                {/* Best & Weakest Footers */}
                {item.best && (
                  <div className="mt-2 pt-2 border-t border-white/5 text-[9px] text-gray-400 space-y-0.5">
                    <p className="truncate text-emerald-400 font-medium">⭐ {item.best.fullName} ({item.best.overallRating})</p>
                    {item.weakest && item.weakest.fullName !== item.best.fullName && (
                      <p className="truncate text-gray-400">🔻 {item.weakest.fullName} ({item.weakest.overallRating})</p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Surplus & Sell/Loan Recommendations */}
          {audit.sellOrLoanCandidates && audit.sellOrLoanCandidates.length > 0 && (
            <div className="mt-4 pt-4 border-t border-white/5 space-y-2">
              <p className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                <span>🔄 Surplus Depth — Recommended Sell / Loan Out Moves:</span>
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {audit.sellOrLoanCandidates.map((c) => (
                  <div
                    key={c.id}
                    className="rounded-lg bg-black/40 border border-white/5 p-2.5 flex items-center justify-between text-xs"
                  >
                    <div>
                      <p className="font-bold text-white">{c.fullName} ({c.position}, {c.overallRating} OVR)</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{c.reason}</p>
                    </div>
                    <span
                      className={`rounded px-2 py-0.5 text-[10px] font-black uppercase ${
                        c.action === "SELL" ? "bg-red-500/20 text-red-400 border border-red-500/30" : "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                      }`}
                    >
                      {c.action}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right 1 Col: Comprehensive League Benchmarking */}
        <div className="rounded-2xl border border-pmb-gold/25 bg-gradient-to-b from-pmb-charcoal to-black p-5 space-y-4">
          <div className="border-b border-white/5 pb-3">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span>📊 League Benchmark & Rival Gaps</span>
            </h2>
            <p className="text-xs text-gray-400">Ranked vs {benchmarks.myRanks.totalClubs} clubs in {club.leagueName}</p>
          </div>

          {/* Rank Badges */}
          <div className="grid grid-cols-2 gap-2 text-center text-xs">
            <div className="rounded-xl bg-black/60 border border-white/10 p-2">
              <p className="text-[10px] text-gray-400 font-bold uppercase">Attack Firepower</p>
              <p className="text-base font-black text-rose-400">Rank #{benchmarks.myRanks.att}</p>
            </div>
            <div className="rounded-xl bg-black/60 border border-white/10 p-2">
              <p className="text-[10px] text-gray-400 font-bold uppercase">Defense Solidity</p>
              <p className="text-base font-black text-amber-400">Rank #{benchmarks.myRanks.def}</p>
            </div>
          </div>

          {/* Benchmark comparison items */}
          <div className="space-y-3 text-xs">
            {benchmarks.leagueLeader && (
              <div className="rounded-lg bg-black/40 p-2.5 border border-white/5 flex justify-between items-center">
                <span className="text-gray-400 font-medium">👑 League Leader ({benchmarks.leagueLeader.name}):</span>
                <span className="font-bold text-pmb-gold">{benchmarks.leagueLeader.ovr} OVR</span>
              </div>
            )}
            <div className="rounded-lg bg-black/40 p-2.5 border border-white/5 flex justify-between items-center">
              <span className="text-gray-400 font-medium">🥇 Top 3 Average:</span>
              <span className="font-bold text-white">{benchmarks.top3Average.ovr} OVR</span>
            </div>
            <div className="rounded-lg bg-black/40 p-2.5 border border-white/5 flex justify-between items-center">
              <span className="text-gray-400 font-medium">⚖️ League Average:</span>
              <span className="font-bold text-gray-300">{benchmarks.leagueAverage.ovr} OVR</span>
            </div>
            {benchmarks.closestCompetitor && (
              <div className="rounded-lg bg-black/40 p-2.5 border border-white/5 flex justify-between items-center">
                <span className="text-gray-400 font-medium">⚔️ Closest Rival ({benchmarks.closestCompetitor.name}):</span>
                <span className="font-bold text-white">{benchmarks.closestCompetitor.ovr} OVR</span>
              </div>
            )}
          </div>

          <p className="text-xs text-pmb-gold bg-pmb-gold/10 rounded-xl p-3 border border-pmb-gold/20 leading-relaxed">
            💡 <strong>Chief Scout Conclusion:</strong> Your attack ranks #{benchmarks.myRanks.att} in the league, but defensive depth is rank #{benchmarks.myRanks.def}. Prioritize center-back reinforcements.
          </p>
        </div>
      </section>

      {/* ── 3. TACTICAL VULNERABILITY ALERTS ─────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-lg font-bold text-white font-serif flex items-center gap-2">
          <span>📋 Priority Tactical Alerts & Gap Deficits</span>
          <span className="rounded-full bg-pmb-gold/20 px-2 py-0.5 text-xs text-pmb-gold font-bold">
            {gapAlerts.length}
          </span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {gapAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`rounded-xl border p-4 flex items-start gap-3 transition ${
                alert.severity === "CRITICAL"
                  ? "border-red-500/50 bg-red-950/20 text-red-200"
                  : alert.severity === "HIGH"
                  ? "border-amber-500/40 bg-amber-950/20 text-amber-200"
                  : alert.severity === "MEDIUM"
                  ? "border-yellow-500/30 bg-yellow-950/15 text-yellow-200"
                  : "border-emerald-500/30 bg-emerald-950/15 text-emerald-200"
              }`}
            >
              <span className="text-2xl">
                {alert.severity === "CRITICAL"
                  ? "🚨"
                  : alert.severity === "HIGH"
                  ? "⚠️"
                  : alert.severity === "MEDIUM"
                  ? "💡"
                  : "✅"}
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-bold text-white text-sm">{alert.title}</h3>
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-extrabold uppercase ${
                      alert.severity === "CRITICAL"
                        ? "bg-red-500/30 text-red-400"
                        : alert.severity === "HIGH"
                        ? "bg-amber-500/30 text-amber-300"
                        : alert.severity === "MEDIUM"
                        ? "bg-yellow-500/30 text-yellow-300"
                        : "bg-emerald-500/30 text-emerald-400"
                    }`}
                  >
                    {alert.severity}
                  </span>
                </div>
                <p className="mt-1 text-xs text-gray-300 leading-relaxed">{alert.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── 4. MULTI-CHANNEL MARKET & SPORTING INTELLIGENCE TABS ─────────── */}
      <section className="space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-pmb-gold/20 pb-3">
          <h2 className="text-lg font-bold text-white font-serif flex items-center gap-2">
            <span>🎯 Transfer Market & Sporting Intelligence Hub</span>
          </h2>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setActiveTab("bestForBudget")}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                activeTab === "bestForBudget" ? "bg-pmb-gold text-black shadow" : "text-pmb-gold hover:bg-pmb-gold/10"
              }`}
            >
              🎯 Best for Budget ({recs.bestAvailableForBudget?.length || 0})
            </button>
            <button
              onClick={() => setActiveTab("starters")}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                activeTab === "starters" ? "bg-pmb-gold text-black shadow" : "text-gray-400 hover:text-white"
              }`}
            >
              💎 Starters ({recs.immediateStarters.length})
            </button>
            <button
              onClick={() => setActiveTab("gems")}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                activeTab === "gems" ? "bg-pmb-gold text-black shadow" : "text-gray-400 hover:text-white"
              }`}
            >
              💰 Bargains ({recs.budgetGems.length})
            </button>
            <button
              onClick={() => setActiveTab("auctions")}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                activeTab === "auctions" ? "bg-pmb-gold text-black shadow" : "text-gray-400 hover:text-white"
              }`}
            >
              ⚡ Auctions ({recs.auctionOpportunities.length})
            </button>
            <button
              onClick={() => setActiveTab("rivals")}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                activeTab === "rivals" ? "bg-pmb-gold text-black shadow" : "text-gray-400 hover:text-white"
              }`}
            >
              🔁 Rival Targets ({recs.rivalClubTargets?.length || 0})
            </button>
            <button
              onClick={() => setActiveTab("opponent")}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition border border-rose-500/40 ${
                activeTab === "opponent" ? "bg-rose-600 text-white shadow" : "text-rose-400 hover:bg-rose-500/10"
              }`}
            >
              ⚔️ Next Opponent
            </button>
            <button
              onClick={() => setActiveTab("simulator")}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition border border-pmb-gold/40 ${
                activeTab === "simulator" ? "bg-pmb-gold text-black shadow" : "text-pmb-gold hover:bg-pmb-gold/10"
              }`}
            >
              📊 3-Way Simulator
            </button>
            <button
              onClick={() => setActiveTab("financial")}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition border border-emerald-500/40 ${
                activeTab === "financial" ? "bg-emerald-600 text-white shadow" : "text-emerald-400 hover:bg-emerald-500/10"
              }`}
            >
              💼 Budget Planner
            </button>
            <button
              onClick={() => setActiveTab("searchHub")}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition border border-blue-500/40 ${
                activeTab === "searchHub" ? "bg-blue-600 text-white shadow" : "text-blue-400 hover:bg-blue-500/10"
              }`}
            >
              🔍 Advanced Search
            </button>
            <button
              onClick={() => setActiveTab("rivalMoves")}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                activeTab === "rivalMoves" ? "bg-pmb-gold text-black shadow" : "text-gray-400 hover:text-white"
              }`}
            >
              📰 Rival Moves
            </button>
          </div>
        </div>

        {/* Tab 0: Best for Budget */}
        {activeTab === "bestForBudget" && (
          <div className="space-y-4">
            <div className="rounded-xl bg-pmb-gold/10 border border-pmb-gold/25 p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <div>
                <p className="font-bold text-white text-sm">🎯 Ranked Candidates for Your €{(club.budget / 1_000_000).toFixed(1)}M Budget</p>
                <p className="text-gray-300 mt-0.5">Scored on rating improvement (+X OVR), gap priority, and remaining financial buffer.</p>
              </div>
              <span className="rounded bg-pmb-gold px-2.5 py-1 text-black font-extrabold">Top 3 Targets</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {recs.bestAvailableForBudget?.map((p, idx) => (
                <div
                  key={p.id}
                  className="rounded-2xl border border-pmb-gold/40 bg-pmb-charcoal/90 p-5 flex flex-col justify-between space-y-4 hover:border-pmb-gold transition shadow-lg"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="rounded bg-pmb-gold/20 px-2 py-0.5 text-xs font-black text-pmb-gold">
                        #{idx + 1} RECOMMENDED
                      </span>
                      <div className="h-8 w-8 rounded-full bg-pmb-gold font-black text-black flex items-center justify-center text-sm shadow">
                        {p.overallRating}
                      </div>
                    </div>

                    <div className="mt-3">
                      <h3 className="text-lg font-bold text-white truncate">{p.fullName}</h3>
                      <p className="text-xs text-gray-400 font-medium">
                        {p.position} • {p.currentClubName} • 🇲🇦 {p.nationality}
                      </p>
                    </div>

                    <p className="mt-3 text-xs text-pmb-gold bg-black/60 rounded-xl p-3 border border-white/5 leading-relaxed">
                      💡 {p.impactSummary}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-2">
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase font-bold">Transfer Fee</p>
                      <p className="text-sm font-black text-white">€{(p.marketValue / 1_000_000).toFixed(1)}M</p>
                    </div>

                    <button
                      onClick={() => handleOpenDossier(p.id)}
                      className="rounded-xl bg-pmb-gold px-3.5 py-2 text-xs font-black text-black hover:bg-white transition shadow"
                    >
                      View Dossier
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 1: Starters */}
        {activeTab === "starters" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {recs.immediateStarters.map((player) => (
              <div
                key={player.id}
                className="rounded-xl border border-pmb-gold/30 bg-pmb-charcoal/80 p-4 flex flex-col justify-between space-y-3 hover:border-pmb-gold transition"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="rounded-md bg-pmb-gold/20 border border-pmb-gold/40 px-2 py-0.5 text-xs font-extrabold text-pmb-gold">
                      {player.position}
                    </span>
                    <div className="flex items-center justify-center h-8 w-8 rounded-full bg-gradient-to-br from-amber-400 to-yellow-600 font-extrabold text-black text-sm shadow">
                      {player.overallRating}
                    </div>
                  </div>

                  <div className="mt-3">
                    <p className="font-bold text-white text-base truncate">{player.fullName}</p>
                    <p className="text-xs text-gray-400 truncate">
                      {player.realClub} • {player.nationality}
                    </p>
                  </div>

                  <p className="mt-3 text-xs text-pmb-gold/90 bg-pmb-gold/10 rounded-lg p-2 border border-pmb-gold/20 leading-relaxed">
                    💡 {player.reason}
                  </p>
                </div>

                <div className="pt-3 border-t border-white/5 flex items-center justify-between gap-2">
                  <div>
                    <p className="text-[10px] text-gray-400">Market Value</p>
                    <p className="text-sm font-extrabold text-white">
                      €{(player.marketValue / 1_000_000).toFixed(1)}M
                    </p>
                  </div>

                  <button
                    onClick={() => handleOpenDossier(player.id)}
                    className="rounded-lg bg-pmb-gold px-3 py-1.5 text-xs font-extrabold text-black hover:bg-white transition"
                  >
                    Dossier
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab 2: Bargains */}
        {activeTab === "gems" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {recs.budgetGems.map((player) => (
              <div
                key={player.id}
                className="rounded-xl border border-emerald-500/30 bg-pmb-charcoal/80 p-4 flex flex-col justify-between space-y-3 hover:border-emerald-400 transition"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="rounded-md bg-emerald-500/20 border border-emerald-500/40 px-2 py-0.5 text-xs font-extrabold text-emerald-400">
                      {player.position}
                    </span>
                    <div className="flex items-center justify-center h-8 w-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 font-extrabold text-black text-sm shadow">
                      {player.overallRating}
                    </div>
                  </div>

                  <div className="mt-3">
                    <p className="font-bold text-white text-base truncate">{player.fullName}</p>
                    <p className="text-xs text-gray-400 truncate">
                      {player.realClub} • {player.nationality}
                    </p>
                  </div>

                  <p className="mt-3 text-xs text-emerald-300 bg-emerald-950/30 rounded-lg p-2 border border-emerald-500/20 leading-relaxed">
                    💰 {player.reason}
                  </p>
                </div>

                <div className="pt-3 border-t border-white/5 flex items-center justify-between gap-2">
                  <div>
                    <p className="text-[10px] text-gray-400">Fee</p>
                    <p className="text-sm font-extrabold text-emerald-400">
                      €{(player.marketValue / 1_000_000).toFixed(1)}M
                    </p>
                  </div>

                  <button
                    onClick={() => handleOpenDossier(player.id)}
                    className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-extrabold text-black hover:bg-white transition"
                  >
                    Dossier
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab 3: Auctions */}
        {activeTab === "auctions" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {recs.auctionOpportunities.map((auc) => (
              <div
                key={auc.auctionId}
                className="rounded-xl border border-red-500/30 bg-gradient-to-b from-pmb-charcoal to-black p-4 flex flex-col justify-between space-y-3 hover:border-red-400 transition"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-red-500 animate-ping" />
                      <span className="text-[11px] font-bold text-red-400 uppercase tracking-wider">
                        LIVE AUCTION
                      </span>
                    </div>
                    <div className="flex items-center justify-center h-8 w-8 rounded-full bg-gradient-to-br from-red-500 to-rose-700 font-extrabold text-white text-sm shadow">
                      {auc.overallRating}
                    </div>
                  </div>

                  <div className="mt-3">
                    <p className="font-bold text-white text-base truncate">{auc.fullName}</p>
                    <p className="text-xs text-gray-400 truncate">
                      {auc.position} • {auc.realClub}
                    </p>
                  </div>

                  <div className="mt-3 bg-black/50 rounded-lg p-2.5 border border-white/5 space-y-1 text-xs">
                    <div className="flex justify-between text-gray-400">
                      <span>Current Top Bid:</span>
                      <span className="font-bold text-pmb-gold">
                        €{(auc.currentBid / 1_000_000).toFixed(2)}M
                      </span>
                    </div>
                    <div className="flex justify-between text-gray-400">
                      <span>Leader:</span>
                      <span className="font-medium text-white truncate max-w-[120px]">
                        {auc.currentWinnerName}
                      </span>
                    </div>
                  </div>

                  <p className="mt-2 text-xs text-gray-300 leading-relaxed">
                    💡 {auc.reason}
                  </p>
                </div>

                <div className="pt-3 border-t border-white/5 flex items-center justify-between gap-2">
                  <button
                    onClick={() => handleOpenDossier(auc.playerId)}
                    className="rounded-lg border border-white/20 px-3 py-1.5 text-xs font-bold text-gray-300 hover:text-white"
                  >
                    Dossier
                  </button>

                  <Link
                    href="/manager/auctions"
                    className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-extrabold text-white hover:bg-red-500 transition shadow"
                  >
                    Place Bid (€{(auc.nextBid / 1_000_000).toFixed(2)}M)
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab 4: Rival Targets */}
        {activeTab === "rivals" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {recs.rivalClubTargets?.map((player) => (
              <div
                key={player.id}
                className="rounded-xl border border-blue-500/30 bg-pmb-charcoal/80 p-4 flex flex-col justify-between space-y-3 hover:border-blue-400 transition"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="rounded-md bg-blue-500/20 border border-blue-500/40 px-2 py-0.5 text-xs font-extrabold text-blue-400">
                      {player.position}
                    </span>
                    <div className="flex items-center justify-center h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-700 font-extrabold text-white text-sm shadow">
                      {player.overallRating}
                    </div>
                  </div>

                  <div className="mt-3">
                    <p className="font-bold text-white text-base truncate">{player.fullName}</p>
                    <p className="text-xs text-blue-300 font-semibold truncate">
                      🏟️ {player.currentClubName}
                    </p>
                    <p className="text-[10px] text-gray-400 truncate">
                      {player.realClub} • {player.nationality}
                    </p>
                  </div>

                  <p className="mt-3 text-xs text-blue-200 bg-blue-950/30 rounded-lg p-2 border border-blue-500/20 leading-relaxed">
                    🔁 {player.reason}
                  </p>
                </div>

                <div className="pt-3 border-t border-white/5 flex items-center justify-between gap-2">
                  <button
                    onClick={() => handleOpenDossier(player.id)}
                    className="rounded-lg border border-white/20 px-3 py-1.5 text-xs font-bold text-gray-300 hover:text-white"
                  >
                    Dossier
                  </button>

                  <Link
                    href={`/manager/transfers`}
                    className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-extrabold text-white hover:bg-blue-500 transition"
                  >
                    Make Offer
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab 5: Next Opponent Scout & Match Plan */}
        {activeTab === "opponent" && (
          <div className="space-y-6">
            {!data.nextOpponentReport?.hasUpcomingMatch ? (
              <div className="rounded-2xl border border-white/10 bg-pmb-charcoal/80 p-8 text-center space-y-3">
                <div className="text-4xl">🏟️</div>
                <h3 className="text-lg font-bold text-white">No Upcoming Match Scheduled</h3>
                <p className="text-xs text-gray-400 max-w-md mx-auto">
                  There are currently no upcoming fixtures for your club in the active competition season.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Header */}
                <div className="relative overflow-hidden rounded-2xl border border-rose-500/40 bg-gradient-to-r from-rose-950/30 via-black to-rose-950/30 p-6 flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="flex items-center gap-4">
                    <ClubBadge
                      name={data.nextOpponentReport.opponent?.name || "Opponent"}
                      logo={data.nextOpponentReport.opponent?.logo}
                      size="lg"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-rose-500/20 border border-rose-500/40 px-2 py-0.5 text-[11px] font-extrabold text-rose-300 uppercase">
                          MATCHDAY {data.nextOpponentReport.matchday}
                        </span>
                        <span className="text-xs text-gray-400 font-medium">
                          {data.nextOpponentReport.competitionName}
                        </span>
                      </div>
                      <h3 className="text-2xl font-black text-white mt-1">
                        vs {data.nextOpponentReport.opponent?.name}
                      </h3>
                      <p className="text-xs text-gray-400">
                        {data.nextOpponentReport.isHome ? "🏠 HOME FIXTURE" : "✈️ AWAY FIXTURE"} • Manager: @{data.nextOpponentReport.opponent?.managerUsername}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="rounded-xl border border-rose-500/30 bg-black/60 px-4 py-2.5 text-center">
                      <p className="text-[10px] text-gray-400 uppercase font-bold">Opponent Rating</p>
                      <p className="text-xl font-black text-rose-400">
                        {data.nextOpponentReport.opponent?.overallRating} OVR
                      </p>
                    </div>
                  </div>
                </div>

                {/* Match Plan Card */}
                {data.nextOpponentReport.matchPlan && (
                  <div className="rounded-2xl border border-rose-500/40 bg-black/80 p-6 space-y-4">
                    <h4 className="text-base font-bold text-white flex items-center gap-2">
                      <span>📋 Chief Scout Complete Match Plan</span>
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                      <div className="rounded-xl bg-pmb-charcoal/80 border border-white/10 p-3.5 space-y-1">
                        <p className="font-bold text-pmb-gold uppercase">Recommended Formation</p>
                        <p className="text-sm font-black text-white">{data.nextOpponentReport.matchPlan.formation}</p>
                      </div>
                      <div className="rounded-xl bg-pmb-charcoal/80 border border-white/10 p-3.5 space-y-1">
                        <p className="font-bold text-rose-400 uppercase">Area to Exploit</p>
                        <p className="text-sm font-black text-white">{data.nextOpponentReport.matchPlan.areaToExploit}</p>
                      </div>
                      <div className="rounded-xl bg-pmb-charcoal/80 border border-white/10 p-3.5 space-y-1">
                        <p className="font-bold text-amber-400 uppercase">Player to Mark</p>
                        <p className="text-sm font-black text-white">{data.nextOpponentReport.matchPlan.playerToMark}</p>
                      </div>
                    </div>

                    <p className="text-xs text-gray-300 italic pt-2 border-t border-white/10">
                      "{data.nextOpponentReport.matchPlan.scoutVerdict}"
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tab 6: 3-Way Simulator & Squad Improvement Predictor */}
        {activeTab === "simulator" && (
          <div className="rounded-2xl border border-pmb-gold/30 bg-black/60 p-6 space-y-6">
            <div className="border-b border-white/10 pb-3">
              <h3 className="text-base font-bold text-white">
                📊 "What-If" 3-Way Target Comparison & Squad Improvement Predictor
              </h3>
              <p className="text-xs text-gray-400">
                Select up to 3 candidate targets to compare sporting impact, financial ROI, and estimated team rating change.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase">Target A</label>
                <select
                  value={simTargetA}
                  onChange={(e) => setSimTargetA(e.target.value)}
                  className="pmb-input mt-1 w-full text-sm"
                >
                  <option value="">Select Candidate A...</option>
                  {allCandidatePool.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.fullName} ({p.position}, {p.overallRating} OVR, €{(Number(p.marketValue || 0) / 1_000_000).toFixed(1)}M)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-400 uppercase">Target B</label>
                <select
                  value={simTargetB}
                  onChange={(e) => setSimTargetB(e.target.value)}
                  className="pmb-input mt-1 w-full text-sm"
                >
                  <option value="">Select Candidate B...</option>
                  {allCandidatePool.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.fullName} ({p.position}, {p.overallRating} OVR, €{(Number(p.marketValue || 0) / 1_000_000).toFixed(1)}M)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-400 uppercase">Target C (Optional)</label>
                <select
                  value={simTargetC}
                  onChange={(e) => setSimTargetC(e.target.value)}
                  className="pmb-input mt-1 w-full text-sm"
                >
                  <option value="">Select Candidate C...</option>
                  {allCandidatePool.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.fullName} ({p.position}, {p.overallRating} OVR, €{(Number(p.marketValue || 0) / 1_000_000).toFixed(1)}M)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {candidateA && candidateB && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-4 border-t border-white/10">
                {/* A */}
                <div className="rounded-xl border border-pmb-gold/40 bg-pmb-charcoal p-5 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="rounded bg-pmb-gold/20 px-2 py-0.5 text-xs font-bold text-pmb-gold">{candidateA.position}</span>
                    <span className="text-xl font-black text-pmb-gold">{candidateA.overallRating} OVR</span>
                  </div>
                  <h4 className="font-bold text-white">{candidateA.fullName}</h4>
                  <div className="space-y-1.5 text-xs border-t border-white/10 pt-2">
                    <div className="flex justify-between text-gray-300">
                      <span>Fee:</span>
                      <span className="font-bold text-white">€{(Number(candidateA.marketValue || 0) / 1_000_000).toFixed(1)}M</span>
                    </div>
                    <div className="flex justify-between text-gray-300">
                      <span>Team Rating Impact:</span>
                      <span className="font-bold text-emerald-400">+{Math.max(0.2, (candidateA.overallRating - audit.overallRating) * 0.1).toFixed(1)} OVR</span>
                    </div>
                    <div className="flex justify-between text-gray-300">
                      <span>Remaining Cash:</span>
                      <span className="font-bold text-pmb-gold">€{((club.budget - Number(candidateA.marketValue || 0)) / 1_000_000).toFixed(1)}M</span>
                    </div>
                  </div>
                </div>

                {/* B */}
                <div className="rounded-xl border border-pmb-gold/40 bg-pmb-charcoal p-5 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="rounded bg-pmb-gold/20 px-2 py-0.5 text-xs font-bold text-pmb-gold">{candidateB.position}</span>
                    <span className="text-xl font-black text-pmb-gold">{candidateB.overallRating} OVR</span>
                  </div>
                  <h4 className="font-bold text-white">{candidateB.fullName}</h4>
                  <div className="space-y-1.5 text-xs border-t border-white/10 pt-2">
                    <div className="flex justify-between text-gray-300">
                      <span>Fee:</span>
                      <span className="font-bold text-white">€{(Number(candidateB.marketValue || 0) / 1_000_000).toFixed(1)}M</span>
                    </div>
                    <div className="flex justify-between text-gray-300">
                      <span>Team Rating Impact:</span>
                      <span className="font-bold text-emerald-400">+{Math.max(0.2, (candidateB.overallRating - audit.overallRating) * 0.1).toFixed(1)} OVR</span>
                    </div>
                    <div className="flex justify-between text-gray-300">
                      <span>Remaining Cash:</span>
                      <span className="font-bold text-pmb-gold">€{((club.budget - Number(candidateB.marketValue || 0)) / 1_000_000).toFixed(1)}M</span>
                    </div>
                  </div>
                </div>

                {/* C */}
                {candidateC && (
                  <div className="rounded-xl border border-pmb-gold/40 bg-pmb-charcoal p-5 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="rounded bg-pmb-gold/20 px-2 py-0.5 text-xs font-bold text-pmb-gold">{candidateC.position}</span>
                      <span className="text-xl font-black text-pmb-gold">{candidateC.overallRating} OVR</span>
                    </div>
                    <h4 className="font-bold text-white">{candidateC.fullName}</h4>
                    <div className="space-y-1.5 text-xs border-t border-white/10 pt-2">
                      <div className="flex justify-between text-gray-300">
                        <span>Fee:</span>
                        <span className="font-bold text-white">€{(Number(candidateC.marketValue || 0) / 1_000_000).toFixed(1)}M</span>
                      </div>
                      <div className="flex justify-between text-gray-300">
                        <span>Team Rating Impact:</span>
                        <span className="font-bold text-emerald-400">+{Math.max(0.2, (candidateC.overallRating - audit.overallRating) * 0.1).toFixed(1)} OVR</span>
                      </div>
                      <div className="flex justify-between text-gray-300">
                        <span>Remaining Cash:</span>
                        <span className="font-bold text-pmb-gold">€{((club.budget - Number(candidateC.marketValue || 0)) / 1_000_000).toFixed(1)}M</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tab 7: Budget Planner */}
        {activeTab === "financial" && data.budgetPlanner && (
          <div className="rounded-2xl border border-emerald-500/30 bg-black/70 p-6 space-y-6">
            <div className="border-b border-white/10 pb-3">
              <h3 className="text-base font-bold text-white">💼 Transfer Budget Financial Planning Assistant</h3>
              <p className="text-xs text-gray-400">Optimal cash distribution to maximize squad health score.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-xl border border-emerald-500/30 bg-pmb-charcoal p-4 space-y-2">
                <p className="text-xs font-bold text-emerald-400 uppercase">Primary Target Budget</p>
                <p className="text-2xl font-black text-white">€{(data.budgetPlanner.primaryAllocation.suggestedAmount / 1_000_000).toFixed(1)}M</p>
                <p className="text-xs text-gray-400">{data.budgetPlanner.primaryAllocation.reason}</p>
              </div>

              <div className="rounded-xl border border-blue-500/30 bg-pmb-charcoal p-4 space-y-2">
                <p className="text-xs font-bold text-blue-400 uppercase">Secondary Reinforcement</p>
                <p className="text-2xl font-black text-white">€{(data.budgetPlanner.secondaryAllocation.suggestedAmount / 1_000_000).toFixed(1)}M</p>
                <p className="text-xs text-gray-400">{data.budgetPlanner.secondaryAllocation.reason}</p>
              </div>

              <div className="rounded-xl border border-pmb-gold/30 bg-pmb-charcoal p-4 space-y-2">
                <p className="text-xs font-bold text-pmb-gold uppercase">Emergency Reserve</p>
                <p className="text-2xl font-black text-pmb-gold">€{(data.budgetPlanner.emergencyReserve.amount / 1_000_000).toFixed(1)}M</p>
                <p className="text-xs text-gray-400">{data.budgetPlanner.emergencyReserve.reason}</p>
              </div>
            </div>

            <p className="text-xs text-gray-300 bg-emerald-950/30 rounded-xl p-3.5 border border-emerald-500/20 leading-relaxed">
              💡 {data.budgetPlanner.financialAdvice}
            </p>
          </div>
        )}

        {/* Tab 8: Visual Advanced Search Hub */}
        {activeTab === "searchHub" && (
          <div className="rounded-2xl border border-blue-500/30 bg-black/70 p-6 space-y-6">
            <div className="border-b border-white/10 pb-3 flex justify-between items-center">
              <div>
                <h3 className="text-base font-bold text-white">🔍 Visual Multi-Filter Player Database Search</h3>
                <p className="text-xs text-gray-400">Search 422 players by Nationality, Position, Rating range, Price cap & Availability.</p>
              </div>
              <span className="text-xs font-black text-pmb-gold">{searchTotal} Matches</span>
            </div>

            {/* Filter Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase">Position</label>
                <select
                  value={searchPos}
                  onChange={(e) => setSearchPos(e.target.value)}
                  className="pmb-input mt-1 w-full text-xs"
                >
                  <option value="ALL">All Positions</option>
                  <option value="GK">🧤 GK</option>
                  <option value="CB">🛡️ CB</option>
                  <option value="LB">🛡️ LB</option>
                  <option value="RB">🛡️ RB</option>
                  <option value="DMF">⚙️ DMF</option>
                  <option value="CMF">⚙️ CMF</option>
                  <option value="AMF">⚙️ AMF</option>
                  <option value="LWF">⚡ LWF</option>
                  <option value="RWF">⚡ RWF</option>
                  <option value="CF">⚡ CF</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase">Nationality</label>
                <select
                  value={searchNat}
                  onChange={(e) => setSearchNat(e.target.value)}
                  className="pmb-input mt-1 w-full text-xs"
                >
                  <option value="ALL">All Nationalities</option>
                  {distinctNationalities.map((n) => (
                    <option key={n.name} value={n.name}>
                      {n.name} ({n.count})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase">Min Rating</label>
                <select
                  value={searchMinOvr}
                  onChange={(e) => setSearchMinOvr(e.target.value)}
                  className="pmb-input mt-1 w-full text-xs"
                >
                  <option value="70">70+ OVR</option>
                  <option value="75">75+ OVR</option>
                  <option value="80">80+ OVR</option>
                  <option value="85">85+ OVR</option>
                  <option value="90">90+ OVR</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase">Availability</label>
                <select
                  value={searchStatus}
                  onChange={(e) => setSearchStatus(e.target.value)}
                  className="pmb-input mt-1 w-full text-xs"
                >
                  <option value="ALL">All Players</option>
                  <option value="AVAILABLE">Free Agents Only</option>
                  <option value="REGISTERED">Rival Club Players</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase">Max Price (€M)</label>
                <input
                  type="number"
                  placeholder="e.g. 20000000"
                  value={searchMaxPrice}
                  onChange={(e) => setSearchMaxPrice(e.target.value)}
                  className="pmb-input mt-1 w-full text-xs"
                />
              </div>

              <div className="flex items-end">
                <button
                  onClick={handleExecuteVisualSearch}
                  disabled={searchLoading}
                  className="w-full rounded-xl bg-blue-600 px-3 py-2 text-xs font-black text-white hover:bg-blue-500 transition shadow"
                >
                  {searchLoading ? "Searching..." : "Apply Filters"}
                </button>
              </div>
            </div>

            {/* Results Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {searchResults.map((p) => (
                <div
                  key={p.id}
                  className="rounded-xl border border-white/10 bg-pmb-charcoal p-4 flex flex-col justify-between space-y-3 hover:border-pmb-gold transition"
                >
                  <div>
                    <div className="flex justify-between items-center">
                      <span className="rounded bg-pmb-gold/20 px-2 py-0.5 text-xs font-black text-pmb-gold">{p.position}</span>
                      <span className="text-sm font-black text-white">{p.overallRating} OVR</span>
                    </div>
                    <p className="font-bold text-white text-base mt-2 truncate">{p.fullName}</p>
                    <p className="text-xs text-gray-400">🇲🇦 {p.nationality} • {p.realClub}</p>
                  </div>

                  <div className="pt-3 border-t border-white/5 flex justify-between items-center">
                    <span className="text-xs font-bold text-pmb-gold">€{(p.marketValue / 1_000_000).toFixed(1)}M</span>
                    <button
                      onClick={() => handleOpenDossier(p.id)}
                      className="rounded-lg bg-pmb-gold px-3 py-1 text-xs font-black text-black hover:bg-white"
                    >
                      Dossier
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 9: Rival Moves */}
        {activeTab === "rivalMoves" && (
          <div className="space-y-4">
            <div className="rounded-xl bg-black/60 border border-white/10 p-4">
              <h3 className="text-base font-bold text-white">📰 Recent Completed Transfers Across League</h3>
              <p className="text-xs text-gray-400">Track key market moves by competitor clubs.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.transferWindowOverview?.recentCompletedTransfers?.map((t) => (
                <div key={t.id} className="rounded-xl border border-white/10 bg-pmb-charcoal p-4 space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-white text-sm">{t.playerName}</span>
                    <span className="rounded bg-pmb-gold/20 px-1.5 py-0.5 text-[10px] font-bold text-pmb-gold">{t.position}</span>
                  </div>
                  <div className="flex justify-between text-gray-300">
                    <span>{t.fromClubName} ➡️ {t.toClubName}</span>
                  </div>
                  <div className="flex justify-between text-gray-400 pt-2 border-t border-white/5">
                    <span>Fee: {t.fee > 0 ? `€${(t.fee / 1_000_000).toFixed(1)}M` : "Free Transfer / Swap"}</span>
                    <span className="uppercase text-pmb-gold font-bold">{t.type}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ── 5. INTERACTIVE CHIEF SCOUT DATABASE AI CHAT ──────────────────── */}
      <section className="rounded-2xl border border-pmb-gold/30 bg-gradient-to-b from-pmb-charcoal to-black p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🤖</span>
            <div>
              <h2 className="text-lg font-bold text-white font-serif">
                Chat with Chief Scout AI (VIP Sporting Intelligence)
              </h2>
              <p className="text-xs text-gray-400">
                Connected to 422 players in PMB PostgreSQL Database • Live €{(club.budget / 1_000_000).toFixed(1)}M Budget
              </p>
            </div>
          </div>
        </div>

        {/* Quick Suggestion Chips */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleSendMessage("Show me Moroccan goalkeepers.")}
            className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-gray-300 hover:border-pmb-gold hover:text-pmb-gold transition"
          >
            🇲🇦 "Moroccan Goalkeepers"
          </button>
          <button
            onClick={() => handleSendMessage("Find French CBs rated 80+.")}
            className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-gray-300 hover:border-pmb-gold hover:text-pmb-gold transition"
          >
            🇫🇷 "French CBs 80+"
          </button>
          <button
            onClick={() => handleSendMessage("What is the best player I can afford?")}
            className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-gray-300 hover:border-pmb-gold hover:text-pmb-gold transition"
          >
            🎯 "Best for My Budget"
          </button>
          <button
            onClick={() => handleSendMessage("Scout my next opponent.")}
            className="rounded-full border border-rose-500/30 bg-rose-950/30 px-3 py-1 text-xs font-bold text-rose-300 hover:border-rose-400 hover:text-white transition"
          >
            ⚔️ "Scout Next Opponent"
          </button>
          <button
            onClick={() => handleSendMessage("Find alternatives to my CF.")}
            className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-gray-300 hover:border-pmb-gold hover:text-pmb-gold transition"
          >
            ⚡ "Alternatives to CF"
          </button>
          <button
            onClick={() => handleSendMessage("What if I spend 20M?")}
            className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-gray-300 hover:border-pmb-gold hover:text-pmb-gold transition"
          >
            💼 "What if I spend €20M?"
          </button>
        </div>

        {/* Chat History Box */}
        <div className="h-[480px] overflow-y-auto space-y-4 rounded-2xl border border-white/10 bg-black/75 p-5 shadow-inner scroll-smooth">
          {chatMessages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[88%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === "user"
                    ? "bg-pmb-gold text-black font-semibold rounded-br-none shadow-md"
                    : "bg-pmb-charcoal text-gray-100 border border-white/15 rounded-bl-none shadow-lg"
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}
          {isSendingMessage && (
            <div className="flex justify-start">
              <div className="rounded-2xl rounded-bl-none bg-pmb-charcoal p-3.5 text-xs text-gray-300 border border-white/15 flex items-center gap-2.5 shadow-md">
                <span className="animate-spin text-pmb-gold">⏳</span>
                <span>Chief Scout AI is analyzing database & formulating strategic plan...</span>
              </div>
            </div>
          )}
          <div ref={chatBottomRef} />
        </div>

        {/* Input Box */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex gap-2"
        >
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Search database (e.g. 'Show Moroccan CBs 80+', 'Best player I can afford', 'Scout Chelsea')..."
            className="pmb-input flex-1 text-sm"
          />
          <button
            type="submit"
            disabled={isSendingMessage || !inputMessage.trim()}
            className="rounded-xl bg-pmb-gold px-5 py-2.5 text-xs font-extrabold text-black hover:bg-white transition disabled:opacity-50"
          >
            Search DB
          </button>
        </form>
      </section>

      {/* ── 6. INTERACTIVE PLAYER SCOUT DOSSIER MODAL ────────────────────── */}
      {selectedPlayerDossier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl rounded-3xl border border-pmb-gold/50 bg-pmb-charcoal p-6 sm:p-8 space-y-6 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-start">
              <div>
                <span className="rounded-full bg-pmb-gold/20 border border-pmb-gold/40 px-3 py-1 text-xs font-black text-pmb-gold">
                  CHIEF SCOUT DOSSIER
                </span>
                <h3 className="text-2xl font-black text-white mt-2">
                  {selectedPlayerDossier.player.fullName}
                </h3>
                <p className="text-xs text-gray-400">
                  {selectedPlayerDossier.player.position} • 🇲🇦 {selectedPlayerDossier.player.nationality} • {selectedPlayerDossier.player.realClub}
                </p>
              </div>

              <button
                onClick={() => setSelectedPlayerDossier(null)}
                className="h-8 w-8 rounded-full bg-black/60 border border-white/20 text-gray-400 hover:text-white flex items-center justify-center font-bold"
              >
                ✕
              </button>
            </div>

            {/* Recommendation Badge Banner */}
            <div
              className={`rounded-2xl p-4 border flex items-center justify-between gap-3 ${
                selectedPlayerDossier.evaluation.recommendation === "HIGHLY_RECOMMENDED"
                  ? "bg-emerald-950/40 border-emerald-500/50 text-emerald-300"
                  : selectedPlayerDossier.evaluation.recommendation === "CONSIDER"
                  ? "bg-amber-950/40 border-amber-500/50 text-amber-300"
                  : selectedPlayerDossier.evaluation.recommendation === "ONLY_IF_NEEDED"
                  ? "bg-orange-950/40 border-orange-500/50 text-orange-300"
                  : "bg-red-950/40 border-red-500/50 text-red-300"
              }`}
            >
              <div>
                <span className="text-xs font-black uppercase tracking-wider">
                  {selectedPlayerDossier.evaluation.recommendation === "HIGHLY_RECOMMENDED"
                    ? "🟢 HIGHLY RECOMMENDED"
                    : selectedPlayerDossier.evaluation.recommendation === "CONSIDER"
                    ? "🟡 CONSIDER"
                    : selectedPlayerDossier.evaluation.recommendation === "ONLY_IF_NEEDED"
                    ? "🟠 ONLY IF NEEDED"
                    : "🔴 NOT RECOMMENDED"}
                </span>
                <p className="text-xs mt-1 text-white font-medium">
                  {selectedPlayerDossier.evaluation.recommendationReason}
                </p>
              </div>

              <div className="text-right">
                <span className="text-[10px] text-gray-400 font-bold uppercase">Tactical Fit</span>
                <p className="text-xl font-black text-white">{selectedPlayerDossier.evaluation.tacticalFitScore}/99</p>
              </div>
            </div>

            {/* Strengths & Weaknesses */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="rounded-xl bg-black/50 border border-white/5 p-4 space-y-1.5">
                <p className="font-bold text-emerald-400 uppercase tracking-wider">Key Strengths:</p>
                {selectedPlayerDossier.evaluation.strengths.map((s, i) => (
                  <p key={i} className="text-gray-300 flex items-start gap-1.5">
                    <span>✓</span>
                    <span>{s}</span>
                  </p>
                ))}
              </div>

              <div className="rounded-xl bg-black/50 border border-white/5 p-4 space-y-1.5">
                <p className="font-bold text-amber-400 uppercase tracking-wider">Scout Notes & Risks:</p>
                {selectedPlayerDossier.evaluation.weaknesses.map((w, i) => (
                  <p key={i} className="text-gray-300 flex items-start gap-1.5">
                    <span>⚠️</span>
                    <span>{w}</span>
                  </p>
                ))}
              </div>
            </div>

            {/* Financial Breakdown */}
            <div className="rounded-xl bg-black/60 border border-white/10 p-4 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-400">Transfer Cost:</span>
                <span className="font-bold text-white">€{(selectedPlayerDossier.evaluation.financialImpact.playerPrice / 1_000_000).toFixed(1)}M</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Remaining Budget If Signed:</span>
                <span className="font-bold text-pmb-gold">
                  €{(selectedPlayerDossier.evaluation.financialImpact.remainingBudgetAfterSigning / 1_000_000).toFixed(1)}M
                </span>
              </div>
            </div>

            <div className="pt-3 border-t border-white/10 flex justify-end gap-3">
              <button
                onClick={() => setSelectedPlayerDossier(null)}
                className="rounded-xl border border-white/20 px-5 py-2.5 text-xs font-bold text-gray-300 hover:text-white"
              >
                Close
              </button>
              <Link
                href="/manager/transfers"
                className="rounded-xl bg-pmb-gold px-6 py-2.5 text-xs font-black text-black hover:bg-white transition shadow"
              >
                Proceed to Transfer Market
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
