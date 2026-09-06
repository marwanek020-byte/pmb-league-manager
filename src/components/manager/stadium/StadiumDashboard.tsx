"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import {
  Lock,
  Unlock,
  Trophy,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  Hammer,
  MapPin,
  Clock,
  Wallet,
  Star,
  ChevronDown,
  ChevronUp,
  Zap,
  Users,
  Send,
  ShieldAlert,
  CheckCircle2,
  Building2,
  Swords,
  Flame,
  Shield,
  CalendarDays,
  TrendingDown as LossIcon,
  BarChart3,
  CircleDollarSign,
  X,
  RefreshCw,
  Home,
  ExternalLink,
  BellRing,
  Loader2,
} from "lucide-react";
import {
  StadiumEconomyEngine,
  type MatchImportance,
  type MatchdayEconomyResult,
} from "@/lib/services/stadium-economy-engine";

// ─────────────────────────────────────────────────────────────────────────────
// TYPE DEFINITIONS
// ─────────────────────────────────────────────────────────────────────────────
type MatchResult = "W" | "D" | "L";

interface Club {
  name: string;
  capacity: number;
  vipCapacity: number;
  stadiumName: string;
}

interface UpgradeOption {
  id: string;
  label: string;
  seatsAdded: number;
  vipSeatsAdded: number;
  cost: number;
  rounds: number;
  type: "standard" | "vip";
}

interface UpgradeStatus {
  isUpgrading: boolean;
  roundsLeft: number;
  totalRounds: number;
  pendingStandardCapacity: number;
  pendingVipCapacity: number;
  projectLabel: string;
  dbId?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// MATCH TIER TYPES
// ─────────────────────────────────────────────────────────────────────────────
type MatchTier = "regular" | "decider" | "derby" | "throne";

interface NextFixture {
  opponent: string;
  tier: MatchTier;
  matchday: number;
  isHome: boolean;
  overrideStadiumName?: string | null;
  isRelocated?: boolean;
  rentedFromClubName?: string | null;
  venueCapacity?: number | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// RENTAL TYPES
// ─────────────────────────────────────────────────────────────────────────────
interface AvailableStadium {
  clubId: string;
  clubName: string;
  stadiumName: string;
  capacity: number;
}

interface RentalOffer {
  id: string;
  toClubId?: string;
  toClubName?: string;
  fromClubId?: string;
  fromClubName?: string;
  matchday: number;
  offerAmount: number;
  status: string;
  messageNote?: string;
}

interface RentalData {
  clubId: string;
  nextMatchday: number | null;
  seasonId: string | null;
  availableStadiums: AvailableStadium[];
  pendingOffers: RentalOffer[];
  incomingOffers: RentalOffer[];
  activeRental: { id: string; toClubId: string; toClubName: string; matchday: number; offerAmount: number } | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT PROPS
// ─────────────────────────────────────────────────────────────────────────────
export interface StadiumDashboardProps {
  currentClub: string;
  globalBudget: number;
  onBudgetChange?: (newBudget: number) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────
const VIP_CAPACITY_THRESHOLD = 25_000;
const RESULT_SCORE: Record<MatchResult, number> = { W: 1, D: 0.5, L: 0 };

const UPGRADE_OPTIONS: UpgradeOption[] = [
  { id: "std-sm", label: "+2,000 Standard Seats",  seatsAdded:  2_000, vipSeatsAdded: 0,     cost:   300_000, rounds: 2, type: "standard" },
  { id: "std-md", label: "+10,000 Standard Seats", seatsAdded: 10_000, vipSeatsAdded: 0,     cost: 1_600_000, rounds: 3, type: "standard" },
  { id: "std-lg", label: "+20,000 Standard Seats", seatsAdded: 20_000, vipSeatsAdded: 0,     cost: 3_000_000, rounds: 5, type: "standard" },
  { id: "vip-sm", label: "+500 VIP Suite Seats",   seatsAdded: 0,      vipSeatsAdded:   500, cost:   800_000, rounds: 2, type: "vip" },
  { id: "vip-lg", label: "+1,500 VIP Suite Seats", seatsAdded: 0,      vipSeatsAdded: 1_500, cost: 2_000_000, rounds: 4, type: "vip" },
];

const DEFAULT_FIXTURE: NextFixture = {
  opponent: "Loading…",
  tier: "regular",
  matchday: 1,
  isHome: true,
};

const CLUB_PRESTIGE: Record<string, number> = {
  "Raja Casablanca": 90, "Wydad AC": 88, "FAR Rabat": 82, "IR Tanger": 72,
  "Hassania Agadir": 65, "Maghreb Fez": 68, "Kawkab Marrakech": 60, "COD Meknes": 55,
  "FUS Rabat": 70, "Olympique Safi": 50, "Difaa El Jadidi": 52, "Berkane": 58,
  "Renaissance Zemamra": 40, "Union Touarga": 42, "Dcheira": 38, "Yacoub El Mansour": 44,
};

const BOYCOTT_FORM_THRESHOLD  = 3;
const BOYCOTT_PRICE_THRESHOLD = 90;

// ─────────────────────────────────────────────────────────────────────────────
// TIER META
// ─────────────────────────────────────────────────────────────────────────────
function tierToEngineFlags(tier: MatchTier): { matchImportance: MatchImportance; isThroneCupMatch: boolean } {
  switch (tier) {
    case "derby":   return { matchImportance: "derby",   isThroneCupMatch: false };
    case "decider": return { matchImportance: "decider", isThroneCupMatch: false };
    case "throne":  return { matchImportance: "decider", isThroneCupMatch: true  };
    default:        return { matchImportance: "regular", isThroneCupMatch: false };
  }
}

const TIER_META: Record<MatchTier, {
  label: string; shortLabel: string; color: string;
  borderColor: string; bgColor: string; icon: React.ReactNode; description: string;
}> = {
  regular: {
    label: "Normal Match", shortLabel: "Normal",
    color: "text-gray-300", borderColor: "border-gray-700", bgColor: "bg-gray-800/60",
    icon: <CalendarDays className="w-4 h-4 text-gray-400" />,
    description: "Standard attendance multipliers. Price elasticity at baseline.",
  },
  decider: {
    label: "Top Match", shortLabel: "Top Match",
    color: "text-blue-300", borderColor: "border-blue-700/60", bgColor: "bg-blue-950/40",
    icon: <BarChart3 className="w-4 h-4 text-blue-400" />,
    description: "+50% standard demand · +65% VIP demand. Title race intensity.",
  },
  derby: {
    label: "Derby", shortLabel: "Derby",
    color: "text-orange-300", borderColor: "border-orange-600/60", bgColor: "bg-orange-950/40",
    icon: <Swords className="w-4 h-4 text-orange-400" />,
    description: "+75% standard demand · +90% VIP demand. Maximum fan passion.",
  },
  throne: {
    label: "Throne Cup Final", shortLabel: "Throne Cup",
    color: "text-yellow-300", borderColor: "border-yellow-500/60", bgColor: "bg-yellow-950/40",
    icon: <Shield className="w-4 h-4 text-yellow-400" />,
    description: "+€4M TV bonus · +50% demand. كأس العرش prestige modifier.",
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// PURE HELPERS
// ─────────────────────────────────────────────────────────────────────────────
function resolveClubFromRegistry(clubName: string): Club {
  const entry = StadiumEconomyEngine.BOTOLA_STADIUM_REGISTRY[clubName];
  if (!entry) return { name: clubName, capacity: 20_000, vipCapacity: 1_000, stadiumName: "Unknown Stadium" };
  const totalCapacity = entry.capacity;
  const vipCapacity   = Math.floor(totalCapacity * StadiumEconomyEngine.VIP_CAPACITY_PERCENTAGE);
  return { name: clubName, capacity: totalCapacity - vipCapacity, vipCapacity, stadiumName: entry.stadium };
}

function calculateTeamForm(past10: MatchResult[]): number {
  if (past10.length === 0) return 5;
  const total = past10.reduce((acc, r) => acc + RESULT_SCORE[r], 0);
  return Math.round(((total / past10.length) * 10) * 10) / 10;
}

function getMatchBreakdown(matches: MatchResult[]) {
  return matches.reduce(
    (acc, r) => { if (r === "W") acc.wins++; else if (r === "D") acc.draws++; else acc.losses++; return acc; },
    { wins: 0, draws: 0, losses: 0 }
  );
}

function isVipLocked(capacity: number): boolean { return capacity < VIP_CAPACITY_THRESHOLD; }

function formatEuro(n: number): string { return `${n.toLocaleString()} €`; }

function getPurchaseBlockReason(
  option: UpgradeOption, budget: number, isUpgrading: boolean, currentCapacity: number
): string | null {
  if (isUpgrading) return "Construction in progress";
  if (budget < option.cost) return "Insufficient budget";
  if (option.type === "vip" && isVipLocked(currentCapacity)) return `Requires ${VIP_CAPACITY_THRESHOLD.toLocaleString()}+ seats`;
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// STYLE HELPERS
// ─────────────────────────────────────────────────────────────────────────────
function getFormBadgeClasses(form: number): string {
  if (form >= 7) return "bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/50";
  if (form >= 4) return "bg-yellow-500/20 text-yellow-400 ring-1 ring-yellow-500/50";
  return "bg-red-500/20 text-red-400 ring-1 ring-red-500/50";
}

function FormTrendIcon({ form }: { form: number }) {
  if (form >= 7) return <TrendingUp  className="w-4 h-4 text-emerald-400" />;
  if (form >= 4) return <Minus       className="w-4 h-4 text-yellow-400" />;
  return               <TrendingDown className="w-4 h-4 text-red-400" />;
}

function MatchPill({ result }: { result: MatchResult }) {
  const cls: Record<MatchResult, string> = {
    W: "bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/40",
    D: "bg-yellow-500/20 text-yellow-300 ring-1 ring-yellow-500/40",
    L: "bg-red-500/20 text-red-300 ring-1 ring-red-500/40",
  };
  return (
    <span className={`inline-flex items-center justify-center w-7 h-7 rounded text-xs font-bold ${cls[result]}`}>
      {result}
    </span>
  );
}

function FormAILabel({ form }: { form: number }) {
  const levels = [
    { min: 9, label: "World Class Form", sub: "Elite run — fans will pack the stadium" },
    { min: 7, label: "Excellent Form",   sub: "Strong results driving high attendance" },
    { min: 5, label: "Average Form",     sub: "Mixed results — moderate fan confidence" },
    { min: 3, label: "Poor Form",        sub: "Bad run — fan interest dropping" },
    { min: 0, label: "Crisis Form",      sub: "Catastrophic — boycott risk very high" },
  ];
  const level = levels.find((l) => form >= l.min) ?? levels[levels.length - 1];
  return (
    <div className="mt-1">
      <p className="text-xs font-semibold text-gray-200">{level.label}</p>
      <p className="text-xs text-gray-500 mt-0.5">{level.sub}</p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// UPGRADE MODAL
// ─────────────────────────────────────────────────────────────────────────────
function UpgradeModal({
  club,
  budget,
  upgradeStatus,
  onPurchase,
  onClose,
}: {
  club: Club;
  budget: number;
  upgradeStatus: UpgradeStatus;
  onPurchase: (option: UpgradeOption) => Promise<void>;
  onClose: () => void;
}) {
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const totalCapacity = club.capacity + club.vipCapacity;
  const vipLocked = isVipLocked(club.capacity);

  async function handleBuy(option: UpgradeOption) {
    setError(null);
    setPurchasing(option.id);
    try {
      await onPurchase(option);
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Purchase failed");
    } finally {
      setPurchasing(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-800 bg-gradient-to-r from-yellow-950/40 to-gray-900">
          <Hammer className="w-6 h-6 text-yellow-500" />
          <div>
            <h2 className="text-lg font-extrabold text-white">Stadium Upgrade Store</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {club.stadiumName} · Current capacity: <strong className="text-white">{totalCapacity.toLocaleString()}</strong>
            </p>
          </div>
          <button
            onClick={onClose}
            className="ml-auto p-2 rounded-lg hover:bg-gray-800 text-gray-500 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {error && (
            <div className="flex items-center gap-2 bg-red-900/40 border border-red-700 text-red-300 rounded-xl px-4 py-3 text-sm">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          {upgradeStatus.isUpgrading && (
            <div className="flex items-start gap-3 bg-amber-950/40 border border-amber-700/50 rounded-xl px-4 py-3">
              <Hammer className="w-5 h-5 text-amber-400 shrink-0 animate-bounce mt-0.5" />
              <div>
                <p className="text-sm font-bold text-amber-300">🏗️ Construction in progress</p>
                <p className="text-xs text-amber-400/80 mt-0.5">
                  {upgradeStatus.projectLabel} — {upgradeStatus.roundsLeft} matchweek(s) remaining
                </p>
                <p className="text-xs text-gray-500 mt-1">No new upgrades can be started until this one completes.</p>
              </div>
            </div>
          )}

          {/* Standard Seating */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Building2 className="w-4 h-4 text-gray-400" />
              <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider">Standard Seating</h3>
            </div>
            <div className="space-y-2">
              {UPGRADE_OPTIONS.filter((o) => o.type === "standard").map((option) => {
                const blockReason = getPurchaseBlockReason(option, budget, upgradeStatus.isUpgrading, club.capacity);
                const isDisabled  = blockReason !== null;
                const isBuying    = purchasing === option.id;
                return (
                  <div key={option.id}
                    className={`flex items-center justify-between gap-4 rounded-xl px-4 py-4 border transition-all ${
                      isDisabled
                        ? "bg-gray-800/40 border-gray-700/50 opacity-60"
                        : "bg-gray-800 border-gray-700 hover:border-yellow-600/50"
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-white">{option.label}</p>
                        <span className="text-xs bg-gray-700 text-gray-400 px-2 py-0.5 rounded-full">
                          {option.rounds} matchweek{option.rounds > 1 ? "s" : ""}
                        </span>
                      </div>
                      <p className="text-sm font-extrabold text-yellow-500 mt-1">{formatEuro(option.cost)}</p>
                      {isDisabled && (
                        <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> {blockReason}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      disabled={isDisabled || isBuying}
                      onClick={() => handleBuy(option)}
                      className={`shrink-0 flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-all ${
                        isDisabled
                          ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                          : "bg-yellow-500 hover:bg-yellow-400 text-gray-950 cursor-pointer shadow-[0_0_12px_rgba(234,179,8,0.3)]"
                      }`}
                    >
                      {isBuying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                      Purchase
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* VIP Suites */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Star className="w-4 h-4 text-yellow-500" />
              <h3 className="text-sm font-bold text-yellow-400 uppercase tracking-wider">VIP Suite Expansion</h3>
              {vipLocked && (
                <span className="flex items-center gap-1 text-xs text-red-400 bg-red-900/30 border border-red-800 px-2 py-0.5 rounded-full ml-auto">
                  <Lock className="w-3 h-3" /> Locked
                </span>
              )}
            </div>

            {vipLocked ? (
              <div className="flex items-start gap-3 bg-yellow-950/20 border border-yellow-800/30 rounded-xl px-4 py-4 text-sm text-yellow-600">
                <Lock className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-yellow-500">VIP Upgrades Locked</p>
                  <p className="text-xs text-yellow-700 mt-1">
                    Your stadium must have at least <strong className="text-yellow-500">25,000 standard seats</strong> to unlock VIP Suite expansions.
                    You currently have <strong className="text-white">{club.capacity.toLocaleString()}</strong> standard seats.
                    Expand your standard seating first.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {UPGRADE_OPTIONS.filter((o) => o.type === "vip").map((option) => {
                  const blockReason = getPurchaseBlockReason(option, budget, upgradeStatus.isUpgrading, club.capacity);
                  const isDisabled  = blockReason !== null;
                  const isBuying    = purchasing === option.id;
                  return (
                    <div key={option.id}
                      className={`flex items-center justify-between gap-4 rounded-xl px-4 py-4 border transition-all ${
                        isDisabled
                          ? "bg-gray-800/40 border-gray-700/50 opacity-60"
                          : "bg-gradient-to-r from-yellow-950/30 to-gray-800 border-yellow-700/40 hover:border-yellow-500/60"
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-yellow-300">{option.label}</p>
                          <span className="text-xs bg-yellow-900/40 text-yellow-600 px-2 py-0.5 rounded-full border border-yellow-800/40">
                            {option.rounds} matchweek{option.rounds > 1 ? "s" : ""}
                          </span>
                        </div>
                        <p className="text-sm font-extrabold text-yellow-500 mt-1">{formatEuro(option.cost)}</p>
                        {isDisabled && (
                          <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> {blockReason}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        disabled={isDisabled || isBuying}
                        onClick={() => handleBuy(option)}
                        className={`shrink-0 flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-all ${
                          isDisabled
                            ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                            : "bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 text-gray-950 cursor-pointer shadow-[0_0_16px_rgba(234,179,8,0.4)]"
                        }`}
                      >
                        {isBuying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                        Purchase
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// RENTAL MODAL
// ─────────────────────────────────────────────────────────────────────────────
function RentalModal({
  rentalData,
  onSendOffer,
  onRespond,
  onClose,
}: {
  rentalData: RentalData;
  onSendOffer: (stadiumClubId: string, amount: number, note?: string) => Promise<void>;
  onRespond: (offerId: string, action: "ACCEPT" | "REJECT") => Promise<void>;
  onClose: () => void;
}) {
  const [offerAmounts, setOfferAmounts] = useState<Record<string, string>>({});
  const [sending, setSending] = useState<string | null>(null);
  const [responding, setResponding] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  }

  async function handleSend(clubId: string) {
    const amount = parseFloat(offerAmounts[clubId] ?? "0");
    if (!amount || amount <= 0) { showToast("Enter an offer amount greater than 0 €"); return; }
    setSending(clubId);
    try {
      await onSendOffer(clubId, amount);
      showToast("✅ Offer sent! The stadium owner has been notified.");
      setOfferAmounts((prev) => ({ ...prev, [clubId]: "" }));
    } catch {
      showToast("Failed to send offer. Please try again.");
    } finally {
      setSending(null);
    }
  }

  async function handleRespond(offerId: string, action: "ACCEPT" | "REJECT") {
    setResponding(offerId + action);
    try {
      await onRespond(offerId, action);
      showToast(action === "ACCEPT" ? "✅ Offer accepted! Rental fee transferred." : "❌ Offer rejected.");
    } catch {
      showToast("Failed to respond. Please try again.");
    } finally {
      setResponding(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-800">
          <Home className="w-6 h-6 text-blue-400" />
          <div>
            <h2 className="text-lg font-extrabold text-white">Rent Out Stadium</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Your stadium is under construction. Find a temporary venue.
            </p>
          </div>
          <button onClick={onClose} className="ml-auto p-2 rounded-lg hover:bg-gray-800 text-gray-500 hover:text-white transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {toast && (
          <div className="mx-6 mt-4 flex items-center gap-2 bg-blue-900/40 border border-blue-700/50 text-blue-300 rounded-xl px-4 py-3 text-sm">
            <BellRing className="w-4 h-4 shrink-0" /> {toast}
          </div>
        )}

        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">

          {/* Incoming Offers (if any) */}
          {rentalData.incomingOffers.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <BellRing className="w-4 h-4 text-yellow-400" />
                <h3 className="text-sm font-bold text-yellow-400 uppercase tracking-wider">Incoming Rental Requests</h3>
                <span className="ml-auto text-xs bg-yellow-900/40 text-yellow-400 border border-yellow-700/40 px-2 py-0.5 rounded-full">
                  {rentalData.incomingOffers.length} pending
                </span>
              </div>
              <div className="space-y-2">
                {rentalData.incomingOffers.map((offer) => (
                  <div key={offer.id} className="bg-yellow-950/20 border border-yellow-700/30 rounded-xl px-4 py-3">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="text-sm font-bold text-white">{offer.fromClubName}</p>
                        <p className="text-xs text-gray-400">Matchday {offer.matchday} · Offer: <strong className="text-yellow-400">{formatEuro(offer.offerAmount)}</strong></p>
                        {offer.messageNote && <p className="text-xs text-gray-500 italic mt-0.5">&ldquo;{offer.messageNote}&rdquo;</p>}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleRespond(offer.id, "ACCEPT")}
                          disabled={responding !== null}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer disabled:opacity-50 transition-all"
                        >
                          {responding === offer.id + "ACCEPT" ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                          Accept
                        </button>
                        <button
                          onClick={() => handleRespond(offer.id, "REJECT")}
                          disabled={responding !== null}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-red-800 hover:bg-red-700 text-white cursor-pointer disabled:opacity-50 transition-all"
                        >
                          {responding === offer.id + "REJECT" ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
                          Reject
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Active rental */}
          {rentalData.activeRental && (
            <div className="flex items-start gap-3 bg-emerald-950/30 border border-emerald-700/40 rounded-xl px-4 py-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-emerald-300">Active Rental Confirmed!</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  You will host Matchday {rentalData.activeRental.matchday} at{" "}
                  <strong className="text-white">{rentalData.activeRental.toClubName}</strong>&apos;s stadium
                  for <strong className="text-yellow-400">{formatEuro(rentalData.activeRental.offerAmount)}</strong>.
                  All ticket revenue for that match goes to you.
                </p>
              </div>
            </div>
          )}

          {/* Pending outgoing offers */}
          {rentalData.pendingOffers.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Your Pending Offers</h3>
              <div className="space-y-1.5">
                {rentalData.pendingOffers.map((offer) => (
                  <div key={offer.id} className="flex items-center justify-between bg-gray-800/60 border border-gray-700 rounded-lg px-3 py-2">
                    <div>
                      <p className="text-xs font-semibold text-white">{offer.toClubName}</p>
                      <p className="text-xs text-gray-500">MD {offer.matchday} · <span className="text-yellow-400">{formatEuro(offer.offerAmount)}</span></p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      offer.status === "PENDING_ADMIN_APPROVAL"
                        ? "text-blue-400 bg-blue-900/30 border border-blue-700/30 font-semibold"
                        : "text-amber-400 bg-amber-900/30 border border-amber-700/30"
                    }`}>
                      {offer.status === "PENDING_ADMIN_APPROVAL" ? "Awaiting League Approval" : "Awaiting Club Response"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Available stadiums */}
          {rentalData.nextMatchday !== null && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <MapPin className="w-4 h-4 text-blue-400" />
                <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider">
                  Available Stadiums — Matchday {rentalData.nextMatchday}
                </h3>
              </div>

              {rentalData.availableStadiums.length === 0 ? (
                <p className="text-sm text-gray-500 italic">No available stadiums found for this matchday.</p>
              ) : (
                <div className="space-y-3">
                  {rentalData.availableStadiums.map((stadium) => {
                    const alreadySent = rentalData.pendingOffers.some((o) => o.toClubId === stadium.clubId);
                    return (
                      <div key={stadium.clubId}
                        className="bg-gray-800 border border-gray-700 hover:border-blue-600/40 rounded-xl px-4 py-4 transition-all"
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <p className="text-sm font-bold text-white">{stadium.stadiumName}</p>
                            <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                              <ExternalLink className="w-3 h-3" /> Owned by {stadium.clubName}
                            </p>
                          </div>
                          <span className="text-xs text-blue-300 bg-blue-900/30 border border-blue-700/30 px-2 py-1 rounded-full">
                            {stadium.capacity.toLocaleString()} seats
                          </span>
                        </div>
                        {alreadySent ? (
                          <div className="flex items-center gap-2 text-xs text-amber-400 bg-amber-900/20 border border-amber-700/20 rounded-lg px-3 py-2">
                            <Clock className="w-3.5 h-3.5" /> Offer already sent — awaiting response
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <input
                              type="number"
                              min={0}
                              step={10000}
                              value={offerAmounts[stadium.clubId] ?? ""}
                              onChange={(e) => setOfferAmounts((prev) => ({ ...prev, [stadium.clubId]: e.target.value }))}
                              placeholder="Offer amount (€)"
                              className="flex-1 min-w-0 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                            />
                            <button
                              type="button"
                              onClick={() => handleSend(stadium.clubId)}
                              disabled={sending === stadium.clubId}
                              className="shrink-0 flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-4 py-2 rounded-lg transition-all cursor-pointer disabled:opacity-50"
                            >
                              {sending === stadium.clubId ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                              Send Offer
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function StadiumDashboard({ currentClub, globalBudget, onBudgetChange }: StadiumDashboardProps) {

  // ── CLUB STATE ────────────────────────────────────────────────────────────
  const [club, setClub] = useState<Club>(() => resolveClubFromRegistry(currentClub));

  // ── MATCH HISTORY (real DB) ────────────────────────────────────────────────
  const [past10Matches, setPast10Matches] = useState<MatchResult[]>([]);
  const [matchHistory, setMatchHistory] = useState<{
    matchday: number; result: MatchResult; isHome: boolean; opponent: string; score: string;
  }[]>([]);
  const [formLoading, setFormLoading] = useState(true);

  // ── TICKET PRICING ────────────────────────────────────────────────────────
  const [standardPrice, setStandardPrice] = useState<number>(65);
  const [vipPrice,      setVipPrice]      = useState<number>(250);
  const [confirmingPrices, setConfirmingPrices] = useState(false);

  // ── LAST MATCH REPORT & AI CONSEILS ────────────────────────────────────────
  const [lastReport, setLastReport] = useState<{
    matchId: string;
    matchday: number;
    playedAt: string | null;
    score: string;
    opponent: string;
    opponentLogo: string | null;
    stadiumName: string;
    snapshot: any;
    advice: {
      type: "success" | "warning" | "danger" | "info";
      headline: string;
      advice: string;
    };
  } | null>(null);
  const [reportLoading, setReportLoading] = useState(true);

  // ── CONSTRUCTION (DB-backed) ───────────────────────────────────────────────
  const [upgradeStatus, setUpgradeStatus] = useState<UpgradeStatus>({
    isUpgrading: false, roundsLeft: 0, totalRounds: 0,
    pendingStandardCapacity: 0, pendingVipCapacity: 0, projectLabel: "",
  });
  const [budget, setBudget] = useState(globalBudget);

  // ── MODAL STATE ───────────────────────────────────────────────────────────
  const [showUpgradeModal,  setShowUpgradeModal]  = useState(false);
  const [showRentalModal,   setShowRentalModal]   = useState(false);

  // ── RENTAL DATA ────────────────────────────────────────────────────────────
  const [rentalData,  setRentalData]  = useState<RentalData | null>(null);
  const [rentalLoading, setRentalLoading] = useState(false);

  // ── NEXT FIXTURE ──────────────────────────────────────────────────────────
  const [nextFixture, setNextFixture] = useState<NextFixture>(DEFAULT_FIXTURE);
  const [fixtureLoading, setFixtureLoading] = useState(true);

  // ── PRICE CONFIRMATION ────────────────────────────────────────────────────
  const [priceConfirmStatus, setPriceConfirmStatus] = useState<null | "confirmed" | "boycott">(null);
  const [confirmedPrices, setConfirmedPrices] = useState<{ standard: number; vip: number } | null>(null);

  // ── DEV TOOLBAR ───────────────────────────────────────────────────────────
  const [devToolbarOpen, setDevToolbarOpen] = useState(false);

  // ─────────────────────────────────────────────────────────────────────────
  // FETCH: Next Home Match
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    setFixtureLoading(true);
    fetch("/api/manager/next-home-match")
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data.fixture) {
          setNextFixture({
            opponent:            data.fixture.awayClub.name,
            tier:                data.fixture.tier as MatchTier,
            matchday:            data.fixture.matchday,
            isHome:              true,
            overrideStadiumName: data.fixture.overrideStadiumName ?? null,
            isRelocated:         Boolean(data.fixture.isRelocated),
            rentedFromClubName:  data.fixture.rentedFromClubName ?? null,
            venueCapacity:       data.fixture.venueCapacity ?? null,
          });
        } else {
          setNextFixture({ opponent: "No upcoming home match", tier: "regular", matchday: 0, isHome: true });
        }
      })
      .catch(() => {
        if (!cancelled) setNextFixture({ opponent: "Schedule unavailable", tier: "regular", matchday: 0, isHome: true });
      })
      .finally(() => { if (!cancelled) setFixtureLoading(false); });
    return () => { cancelled = true; };
  }, [currentClub]);

  // ─────────────────────────────────────────────────────────────────────────
  // FETCH: Real match history (last 10)
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    setFormLoading(true);
    fetch("/api/manager/club-match-history")
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data.results) {
          setPast10Matches(data.results.map((r: { result: MatchResult }) => r.result));
          setMatchHistory(data.results);
        }
      })
      .catch(() => {
        if (!cancelled) setPast10Matches(["W", "D", "L", "W", "W", "D", "L", "W", "W", "D"]);
      })
      .finally(() => { if (!cancelled) setFormLoading(false); });
    return () => { cancelled = true; };
  }, [currentClub]);

  // ─────────────────────────────────────────────────────────────────────────
  // FETCH: Active stadium upgrade from DB
  // ─────────────────────────────────────────────────────────────────────────
  const fetchUpgrade = useCallback(async () => {
    try {
      const resp = await fetch("/api/manager/stadium-upgrade");
      const data = await resp.json();
      if (data.upgrade && data.upgrade.status === "IN_PROGRESS") {
        setUpgradeStatus({
          isUpgrading: true,
          roundsLeft: data.upgrade.roundsLeft,
          totalRounds: data.upgrade.totalRounds,
          pendingStandardCapacity: data.upgrade.seatsAdded,
          pendingVipCapacity: data.upgrade.vipSeatsAdded,
          projectLabel: data.upgrade.label,
          dbId: data.upgrade.id,
        });
      } else if (data.upgrade && data.upgrade.status === "COMPLETED") {
        // Apply the capacity boost if it hasn't been applied yet
        setClub((prev) => {
          const needsApply = prev.capacity === resolveClubFromRegistry(currentClub).capacity;
          if (needsApply) {
            return {
              ...prev,
              capacity:    prev.capacity    + data.upgrade.seatsAdded,
              vipCapacity: prev.vipCapacity + data.upgrade.vipSeatsAdded,
            };
          }
          return prev;
        });
        setUpgradeStatus({ isUpgrading: false, roundsLeft: 0, totalRounds: 0, pendingStandardCapacity: 0, pendingVipCapacity: 0, projectLabel: "" });
      } else {
        setUpgradeStatus({ isUpgrading: false, roundsLeft: 0, totalRounds: 0, pendingStandardCapacity: 0, pendingVipCapacity: 0, projectLabel: "" });
      }
    } catch { /* silent */ }
  }, [currentClub]);

  useEffect(() => { fetchUpgrade(); }, [fetchUpgrade]);

  // ─────────────────────────────────────────────────────────────────────────
  // DERIVED VALUES
  // ─────────────────────────────────────────────────────────────────────────
  const teamForm  = useMemo(() => calculateTeamForm(past10Matches), [past10Matches]);
  const effectiveCapacityForVip = nextFixture.overrideStadiumName && nextFixture.venueCapacity
    ? nextFixture.venueCapacity
    : club.capacity;
  const vipLocked = useMemo(() => isVipLocked(effectiveCapacityForVip), [effectiveCapacityForVip]);
  const breakdown = useMemo(() => getMatchBreakdown(past10Matches),  [past10Matches]);

  const isBoycottActive = teamForm < BOYCOTT_FORM_THRESHOLD && standardPrice >= BOYCOTT_PRICE_THRESHOLD;

  // ─────────────────────────────────────────────────────────────────────────
  // FETCH: Confirmed ticket prices for next match (or smart defaults from form)
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    fetch("/api/manager/stadium/confirm-prices")
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data?.confirmed && data.standardPrice) {
          setPriceConfirmStatus("confirmed");
          setConfirmedPrices({ standard: data.standardPrice, vip: data.vipPrice ?? 0 });
          setStandardPrice(data.standardPrice);
          if (data.vipPrice) setVipPrice(data.vipPrice);
        } else {
          // Defaults: standard €50–€120 scaled by form, VIP €200–€500 scaled by form
          const t = Math.max(0, Math.min(10, teamForm || 5)) / 10;
          const defStd = Math.round(50 + t * 70);
          const defVip = Math.round(200 + t * 300);
          setStandardPrice(defStd);
          setVipPrice(defVip);
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [currentClub, teamForm]);

  // ─────────────────────────────────────────────────────────────────────────
  // FETCH: Last completed match report & AI advice
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    setReportLoading(true);
    fetch("/api/manager/stadium/last-report")
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data?.report) {
          setLastReport(data.report);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setReportLoading(false);
      });
    return () => { cancelled = true; };
  }, [currentClub]);

  // Sync budget from prop
  useEffect(() => { setBudget(globalBudget); }, [globalBudget]);

  const matchdayForecast = useMemo<MatchdayEconomyResult | null>(() => {
    try {
      const { matchImportance, isThroneCupMatch } = tierToEngineFlags(nextFixture.tier);
      const engineForm = Math.max(1, Math.min(10, teamForm || 5));
      const prestige   = CLUB_PRESTIGE[currentClub] ?? 55;
      const isRelocated = Boolean(nextFixture.isRelocated || nextFixture.overrideStadiumName);
      return StadiumEconomyEngine.calculateMatchday({
        clubIdentifier:        currentClub,
        standardPrice,
        vipPrice:              vipLocked ? 0 : vipPrice,
        teamForm:              engineForm,
        matchImportance,
        clubPrestige:          prestige,
        isBoycotting:          isBoycottActive,
        isThroneCupMatch,
        isRelocated,
        isSameCity:            false,
        venueCapacityOverride: nextFixture.venueCapacity ?? undefined,
        overrideStadiumName:   nextFixture.overrideStadiumName ?? undefined,
      });
    } catch { return null; }
  }, [currentClub, standardPrice, vipPrice, teamForm, nextFixture, isBoycottActive, vipLocked]);

  const tierMeta = TIER_META[nextFixture.tier];

  // ─────────────────────────────────────────────────────────────────────────
  // HANDLERS
  // ─────────────────────────────────────────────────────────────────────────
  async function handlePurchaseUpgrade(option: UpgradeOption) {
    const resp = await fetch("/api/manager/stadium-upgrade", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ upgradeOptionId: option.id }),
    });
    const data = await resp.json();
    if (!resp.ok) throw new Error(data.error ?? "Purchase failed");

    // Update local state optimistically
    const newBudget = budget - option.cost;
    setBudget(newBudget);
    onBudgetChange?.(newBudget);

    setUpgradeStatus({
      isUpgrading: true,
      roundsLeft: option.rounds,
      totalRounds: option.rounds,
      pendingStandardCapacity: option.seatsAdded,
      pendingVipCapacity: option.vipSeatsAdded,
      projectLabel: option.label,
    });
  }

  function handleStandardPriceChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (priceConfirmStatus !== null) return;
    setStandardPrice(Math.max(20, Math.min(150, Number(e.target.value))));
  }
  function handleVipPriceChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (priceConfirmStatus !== null || vipLocked) return;
    setVipPrice(Math.max(100, Math.min(600, Number(e.target.value))));
  }
  async function handleConfirmPrices() {
    if (priceConfirmStatus !== null) return;
    setConfirmingPrices(true);
    try {
      const res = await fetch("/api/manager/stadium/confirm-prices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          standardPrice,
          vipPrice: vipLocked ? 0 : vipPrice,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setPriceConfirmStatus(isBoycottActive ? "boycott" : "confirmed");
        setConfirmedPrices({ standard: standardPrice, vip: vipLocked ? 0 : vipPrice });
      } else {
        alert(data.error ?? "Failed to save ticket prices.");
      }
    } catch {
      alert("Network error while confirming ticket prices.");
    } finally {
      setConfirmingPrices(false);
    }
  }

  async function loadRentalData() {
    setRentalLoading(true);
    try {
      const resp = await fetch("/api/manager/stadium-rental");
      const data = await resp.json();
      setRentalData(data);
    } catch { /* silent */ }
    finally { setRentalLoading(false); }
  }

  async function handleOpenRentalModal() {
    await loadRentalData();
    setShowRentalModal(true);
  }

  async function handleSendOffer(toClubId: string, amount: number, note?: string) {
    if (!rentalData) return;
    const resp = await fetch("/api/manager/stadium-rental", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        toClubId,
        matchday: rentalData.nextMatchday,
        seasonId: rentalData.seasonId,
        offerAmount: amount,
        messageNote: note,
      }),
    });
    const data = await resp.json();
    if (!resp.ok) throw new Error(data.error ?? "Offer failed");
    await loadRentalData(); // refresh
  }

  async function handleRespondToOffer(offerId: string, action: "ACCEPT" | "REJECT") {
    const resp = await fetch("/api/manager/stadium-rental", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ offerId, action }),
    });
    const data = await resp.json();
    if (!resp.ok) throw new Error(data.error ?? "Response failed");
    await loadRentalData(); // refresh
  }

  // Dev helpers
  function devSetTier(tier: MatchTier) { setNextFixture((prev) => ({ ...prev, tier })); }
  function devAddWin()  { setPast10Matches((prev) => [...prev.slice(-9), "W"]); }
  function devAddDraw() { setPast10Matches((prev) => [...prev.slice(-9), "D"]); }
  function devAddLoss() { setPast10Matches((prev) => [...prev.slice(-9), "L"]); }
  async function devAdvanceRound() {
    await fetch("/api/manager/stadium-upgrade", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "ADVANCE_ROUND" }),
    });
    await fetchUpgrade();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 font-sans pb-20">

      {/* MODALS */}
      {showUpgradeModal && (
        <UpgradeModal
          club={club}
          budget={budget}
          upgradeStatus={upgradeStatus}
          onPurchase={handlePurchaseUpgrade}
          onClose={() => setShowUpgradeModal(false)}
        />
      )}
      {showRentalModal && rentalData && (
        <RentalModal
          rentalData={rentalData}
          onSendOffer={handleSendOffer}
          onRespond={handleRespondToOffer}
          onClose={() => setShowRentalModal(false)}
        />
      )}

      {/* BOYCOTT BANNER */}
      {isBoycottActive && (
        <div className="sticky top-0 z-40 w-full bg-red-950 border-b border-red-700 shadow-[0_0_40px_rgba(239,68,68,0.4)]">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
            <ShieldAlert className="w-6 h-6 text-red-400 shrink-0 animate-pulse" />
            <p className="text-red-300 font-bold text-sm md:text-base text-center w-full" dir="rtl">
              🚨 بيان الكورفا: نتائج كارثية، وإدارة جشعة.. نعلن مقاطعة المباراة!
            </p>
            <ShieldAlert className="w-6 h-6 text-red-400 shrink-0 animate-pulse" />
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">

        {/* ══ HEADER ══════════════════════════════════════════════════════════ */}
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-yellow-500 text-xs font-semibold uppercase tracking-widest mb-1">
              <Building2 className="w-4 h-4" />
              <span>Stadium Command Centre</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">{club.name}</h1>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <span className="text-gray-400 text-sm">{club.stadiumName} · Botola Pro</span>
              {nextFixture.overrideStadiumName && (
                <span className="text-xs text-blue-400 bg-blue-950/60 border border-blue-700/50 px-2 py-0.5 rounded-md inline-flex items-center gap-1 font-semibold">
                  <MapPin className="w-3 h-3 text-blue-400" />
                  MD{nextFixture.matchday} playing at {nextFixture.overrideStadiumName}
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-2 flex items-center gap-2">
              <Users className="w-4 h-4 text-yellow-500" />
              <span className="text-xs text-gray-400">
                {nextFixture.overrideStadiumName ? "Next Match Cap." : "Total Capacity"}
              </span>
              <span className="text-sm font-bold text-white">
                {(nextFixture.venueCapacity ?? (club.capacity + club.vipCapacity)).toLocaleString()}
              </span>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-2 flex items-center gap-2">
              <Wallet className="w-4 h-4 text-emerald-400" />
              <span className="text-xs text-gray-400">Budget</span>
              <span className="text-sm font-bold text-emerald-400">{formatEuro(budget)}</span>
            </div>
            {upgradeStatus.isUpgrading && (
              <div className="bg-amber-900/40 border border-amber-600/50 rounded-xl px-4 py-2 flex items-center gap-2 animate-pulse">
                <Hammer className="w-4 h-4 text-amber-400" />
                <span className="text-xs text-amber-300">
                  {upgradeStatus.projectLabel} — {upgradeStatus.roundsLeft} round(s) left
                </span>
              </div>
            )}
          </div>
        </header>

        {/* ══ NEXT HOSTING MATCH BANNER ════════════════════════════════════════ */}
        <section
          className={`relative overflow-hidden rounded-2xl border p-5 ${tierMeta.borderColor} ${tierMeta.bgColor}`}
          data-section="next-fixture"
        >
          <div className={`pointer-events-none absolute inset-0 opacity-10 ${
            nextFixture.tier === "derby"   ? "bg-orange-500" :
            nextFixture.tier === "throne"  ? "bg-yellow-400" :
            nextFixture.tier === "decider" ? "bg-blue-500"   : "bg-gray-500"
          } blur-3xl`} />

          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl border ${tierMeta.borderColor} bg-black/30`}>
                {fixtureLoading ? <Clock className="w-4 h-4 text-gray-500 animate-spin" /> : tierMeta.icon}
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold mb-0.5">
                  Next Hosting Match{nextFixture.matchday > 0 ? ` · Matchday ${nextFixture.matchday}` : ""}
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-extrabold text-white">{club.name}</span>
                  <span className="text-gray-500 font-bold">vs</span>
                  <span className="text-xl font-extrabold text-white">{nextFixture.opponent}</span>
                </div>
                {nextFixture.overrideStadiumName ? (
                  <div className="flex flex-wrap items-center gap-2 mt-1.5">
                    <span className="text-sm font-bold text-blue-400 flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-blue-400 shrink-0" />
                      {nextFixture.overrideStadiumName}
                      {nextFixture.rentedFromClubName && (
                        <span className="text-gray-300 font-normal">({nextFixture.rentedFromClubName})</span>
                      )}
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-950/80 border border-blue-600/70 text-blue-300 px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-[0_0_10px_rgba(59,130,246,0.2)]">
                      📍 Relocated Venue · Approved Rental
                    </span>
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 mt-0.5">{club.stadiumName} · Home</p>
                )}
              </div>
            </div>

            <div className="flex flex-col items-start sm:items-end gap-2">
              <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border ${tierMeta.borderColor} ${tierMeta.color} bg-black/30`}>
                {tierMeta.icon} {tierMeta.label}
              </span>
              {/* Fan count from forecast */}
              {matchdayForecast && (
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-black/30 border border-gray-700 text-gray-300">
                    <Users className="w-3.5 h-3.5 text-blue-400" />
                    {matchdayForecast.attendance.total.toLocaleString()} expected fans
                    {matchdayForecast.attendance.isSoldOut && <span className="text-yellow-400 ml-1">· SOLD OUT</span>}
                  </span>
                </div>
              )}
              <p className={`text-xs max-w-xs text-right hidden sm:block ${tierMeta.color} opacity-75`}>
                {tierMeta.description}
              </p>
              {nextFixture.tier === "throne" && (
                <span className="flex items-center gap-1 text-xs text-yellow-400 font-bold bg-yellow-900/30 border border-yellow-600/40 px-3 py-1 rounded-full">
                  <Shield className="w-3.5 h-3.5" /> +€4,000,000 كأس العرش TV Bonus
                </span>
              )}
            </div>
          </div>

          {nextFixture.tier !== "regular" && (
            <div className="relative z-10 mt-4 flex flex-wrap gap-2">
              {(() => {
                const { matchImportance } = tierToEngineFlags(nextFixture.tier);
                const factors = StadiumEconomyEngine.MATCH_IMPORTANCE_FACTORS[matchImportance];
                return (
                  <>
                    <span className="text-xs text-gray-300 bg-black/30 border border-gray-700 rounded-full px-3 py-1">
                      Standard Demand <strong className="text-emerald-400">×{factors.standardDemand.toFixed(2)}</strong>
                    </span>
                    <span className="text-xs text-gray-300 bg-black/30 border border-gray-700 rounded-full px-3 py-1">
                      VIP Demand <strong className="text-yellow-400">×{factors.vipDemand.toFixed(2)}</strong>
                    </span>
                    {nextFixture.tier === "throne" && (
                      <span className="text-xs text-yellow-300 bg-yellow-900/30 border border-yellow-700/40 rounded-full px-3 py-1">
                        + €4,000,000 Cup Participation Bonus
                      </span>
                    )}
                  </>
                );
              })()}
            </div>
          )}
        </section>

        {/* ══ MATCHDAY FORECAST ════════════════════════════════════════════════ */}
        {matchdayForecast && (
          <section className="bg-gray-900 border border-gray-800 rounded-2xl p-5" data-section="matchday-forecast">
            <div className="flex items-center gap-2 mb-4">
              <CircleDollarSign className="w-5 h-5 text-yellow-500" />
              <h2 className="text-base font-bold text-white uppercase tracking-wide">Matchday Forecast</h2>
              <span className="ml-auto text-xs text-gray-500 bg-gray-800 px-2 py-1 rounded-full">Live Engine Output</span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-gray-800 rounded-xl p-3 text-center">
                <p className="text-xs text-gray-400 mb-1">Expected Fans</p>
                <p className="text-lg font-extrabold text-white">{matchdayForecast.attendance.total.toLocaleString()}</p>
                <p className="text-xs text-gray-500">{matchdayForecast.attendance.occupancyRatePercent}% occupancy</p>
              </div>
              <div className="bg-gray-800 rounded-xl p-3 text-center">
                <p className="text-xs text-gray-400 mb-1">Gross Revenue</p>
                <p className="text-lg font-extrabold text-emerald-400">{formatEuro(matchdayForecast.finances.revenue.grossTotal)}</p>
                {matchdayForecast.finances.revenue.cupBonus > 0 && (
                  <p className="text-xs text-yellow-400">+{formatEuro(matchdayForecast.finances.revenue.cupBonus)} Cup</p>
                )}
              </div>
              <div className="bg-gray-800 rounded-xl p-3 text-center">
                <p className="text-xs text-gray-400 mb-1">Operating Cost</p>
                <p className="text-lg font-extrabold text-red-400">{formatEuro(matchdayForecast.finances.operatingCost)}</p>
                {matchdayForecast.diagnostics.bigStadiumTrapRisk && (
                  <p className="text-xs text-orange-400 flex items-center justify-center gap-1 mt-0.5">
                    <Flame className="w-3 h-3" /> Big Stadium Trap
                  </p>
                )}
              </div>
              <div className={`rounded-xl p-3 text-center ${
                matchdayForecast.finances.isProfitable
                  ? "bg-emerald-900/30 border border-emerald-700/40"
                  : "bg-red-900/30 border border-red-700/40"
              }`}>
                <p className="text-xs text-gray-400 mb-1">Net Profit</p>
                <p className={`text-lg font-extrabold ${matchdayForecast.finances.isProfitable ? "text-emerald-400" : "text-red-400"}`}>
                  {matchdayForecast.finances.isProfitable ? "+" : ""}{formatEuro(matchdayForecast.finances.netProfit)}
                </p>
                {matchdayForecast.attendance.isBoycotted && (
                  <p className="text-xs text-red-400 flex items-center justify-center gap-1 mt-0.5">
                    <ShieldAlert className="w-3 h-3" /> Boycotted
                  </p>
                )}
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2 text-xs text-gray-500 bg-gray-800/50 rounded-lg px-3 py-2">
              <LossIcon className="w-3.5 h-3.5 text-gray-500 shrink-0" />
              <span>Break-even attendance: <strong className="text-gray-300">
                {matchdayForecast.diagnostics.breakEvenStandardAttendance.toLocaleString()} standard seats
              </strong> at current prices</span>
            </div>
          </section>
        )}

        {/* ══ LAST COMPLETED HOME MATCH REPORT & AI CONSEILS ══════════════════ */}
        {lastReport && (
          <section className="bg-gray-900 border border-gray-800 rounded-2xl p-5 md:p-6 shadow-xl relative overflow-hidden" data-section="last-match-report">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-800 pb-4 mb-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-yellow-500">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-extrabold text-white uppercase tracking-wider">
                      Last Home Match Stadium Report
                    </h2>
                    <span className="text-xs bg-gray-800 border border-gray-700 text-gray-300 px-2 py-0.5 rounded-full font-semibold">
                      Matchday {lastReport.matchday}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    vs <strong className="text-white">{lastReport.opponent}</strong> · Final Score: <strong className="text-yellow-400">{lastReport.score}</strong> · Venue: {lastReport.stadiumName}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                  lastReport.snapshot.attendance.occupancyPct >= 85
                    ? "bg-emerald-950/50 border-emerald-700/60 text-emerald-300"
                    : lastReport.snapshot.attendance.occupancyPct >= 60
                    ? "bg-yellow-950/50 border-yellow-700/60 text-yellow-300"
                    : "bg-red-950/50 border-red-700/60 text-red-300"
                }`}>
                  {lastReport.snapshot.attendance.occupancyPct}% Occupancy Rate
                </span>
                {lastReport.snapshot.attendance.isSoldOut && (
                  <span className="px-2.5 py-1 rounded-full text-xs font-extrabold bg-yellow-500 text-gray-950 animate-pulse">
                    SOLD OUT
                  </span>
                )}
              </div>
            </div>

            {/* Attendance & Finance Metric Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
              <div className="bg-gray-950/60 border border-gray-800 rounded-xl p-3">
                <p className="text-xs text-gray-400">Total Attendance</p>
                <p className="text-lg font-black text-white mt-1">
                  {lastReport.snapshot.attendance.total.toLocaleString()}
                </p>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  {lastReport.snapshot.attendance.standard.toLocaleString()} std · {lastReport.snapshot.attendance.vip.toLocaleString()} VIP
                </p>
              </div>

              <div className="bg-gray-950/60 border border-gray-800 rounded-xl p-3">
                <p className="text-xs text-gray-400">Ticket Prices Used</p>
                <p className="text-lg font-black text-yellow-400 mt-1">
                  €{lastReport.snapshot.standardPrice}
                  {lastReport.snapshot.vipPrice > 0 && <span className="text-xs font-normal text-gray-400"> / €{lastReport.snapshot.vipPrice}</span>}
                </p>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  {lastReport.snapshot.priceSource === "CONFIRMED" ? "Manager confirmed" : "Auto-applied"}
                </p>
              </div>

              <div className="bg-gray-950/60 border border-gray-800 rounded-xl p-3">
                <p className="text-xs text-gray-400">Gross Ticket Sales</p>
                <p className="text-lg font-black text-emerald-400 mt-1">
                  +{formatEuro(lastReport.snapshot.finances.grossTotal)}
                </p>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Operating: -{formatEuro(lastReport.snapshot.finances.operatingCost)}
                </p>
              </div>

              <div className="bg-gray-950/60 border border-gray-800 rounded-xl p-3">
                <p className="text-xs text-gray-400">Net Stadium Profit</p>
                <p className={`text-lg font-black mt-1 ${
                  lastReport.snapshot.finances.netProfit >= 0 ? "text-emerald-400" : "text-red-400"
                }`}>
                  {lastReport.snapshot.finances.netProfit >= 0 ? "+" : ""}{formatEuro(lastReport.snapshot.finances.netProfit)}
                </p>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Directly credited to club treasury
                </p>
              </div>
            </div>

            {/* AI Pricing Advice / Conseils */}
            <div className={`flex items-start gap-3 rounded-xl p-4 border ${
              lastReport.advice.type === "success"
                ? "bg-emerald-950/30 border-emerald-700/50 text-emerald-300"
                : lastReport.advice.type === "danger"
                ? "bg-red-950/30 border-red-700/50 text-red-300"
                : lastReport.advice.type === "warning"
                ? "bg-yellow-950/30 border-yellow-700/50 text-yellow-300"
                : "bg-blue-950/30 border-blue-700/50 text-blue-300"
            }`}>
              <Zap className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-extrabold">{lastReport.advice.headline}</p>
                <p className="text-xs mt-1 leading-relaxed opacity-90">{lastReport.advice.advice}</p>
              </div>
            </div>
          </section>
        )}

        {/* ══ MAIN GRID ════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* ── LEFT COLUMN ──────────────────────────────────────────────── */}
          <div className="space-y-6">

            {/* TEAM FORM — AI-generated from last 10 real matches */}
            <section className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Trophy className="w-5 h-5 text-yellow-500" />
                <h2 className="text-base font-bold text-white uppercase tracking-wide">Team Form</h2>
                <span className="ml-auto text-xs text-gray-500 bg-gray-800 px-2 py-1 rounded-full flex items-center gap-1">
                  <Zap className="w-3 h-3 text-yellow-500" /> AI Analysis
                </span>
              </div>

              {formLoading ? (
                <div className="flex items-center gap-2 text-gray-500 text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading match history…
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3 mb-3">
                    <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-2xl font-extrabold ${getFormBadgeClasses(teamForm)}`}>
                      <FormTrendIcon form={teamForm} />
                      {teamForm} <span className="text-sm font-normal opacity-70">/ 10</span>
                    </span>
                    <div>
                      <div className="text-sm text-gray-400">
                        <span className="text-emerald-400 font-semibold">{breakdown.wins}W</span>{" · "}
                        <span className="text-yellow-400 font-semibold">{breakdown.draws}D</span>{" · "}
                        <span className="text-red-400 font-semibold">{breakdown.losses}L</span>
                      </div>
                      <FormAILabel form={teamForm} />
                    </div>
                  </div>

                  {/* AI explanation */}
                  <div className="bg-gray-800/50 rounded-xl px-3 py-2 text-xs text-gray-400 mb-3 border border-gray-700/50">
                    <span className="text-yellow-500 font-semibold">AI Form Rating: </span>
                    {teamForm}/10 based on last {past10Matches.length} matches
                    (Win = 1pt · Draw = 0.5pt · Loss = 0pt).
                    {" "}<span className="text-blue-400">Fan attendance impact: {
                      teamForm >= 7 ? "High demand" : teamForm >= 4 ? "Moderate demand" : "Low demand (boycott risk)"
                    }.</span>
                  </div>

                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {past10Matches.map((result, i) => <MatchPill key={i} result={result} />)}
                  </div>

                  {/* Recent match details */}
                  {matchHistory.length > 0 && (
                    <div className="space-y-1">
                      {matchHistory.slice(-5).reverse().map((m, i) => (
                        <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-gray-800 last:border-0">
                          <span className="text-gray-500">MD {m.matchday}</span>
                          <span className="text-gray-300">{m.isHome ? "vs" : "@"} {m.opponent}</span>
                          <span className={`font-bold ${m.result === "W" ? "text-emerald-400" : m.result === "D" ? "text-yellow-400" : "text-red-400"}`}>
                            {m.result} ({m.score})
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </section>

            {/* TICKET PRICING */}
            <section className={`border rounded-2xl p-5 transition-all duration-500 ${
              isBoycottActive
                ? "bg-red-950/30 border-red-700 shadow-[0_0_30px_rgba(239,68,68,0.2)]"
                : "bg-gray-900 border-gray-800"
            }`}>
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className={`w-5 h-5 ${isBoycottActive ? "text-red-400" : "text-yellow-500"}`} />
                <h2 className={`text-base font-bold uppercase tracking-wide ${isBoycottActive ? "text-red-300" : "text-white"}`}>
                  Ticket Pricing
                </h2>
                {isBoycottActive && (
                  <span className="ml-auto flex items-center gap-1 text-xs font-bold text-red-400 bg-red-900/60 border border-red-700 px-2 py-0.5 rounded-full animate-pulse">
                    <AlertTriangle className="w-3 h-3" /> BOYCOTT ACTIVE
                  </span>
                )}
              </div>

              {priceConfirmStatus === "confirmed" && (
                <div className="mb-4 flex items-start justify-between gap-3 bg-emerald-900/30 border border-emerald-700/50 rounded-xl px-4 py-3 text-sm text-emerald-300">
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-emerald-400" />
                    <div>
                      <p className="font-bold">✅ Ticket prices confirmed & locked for Matchday {nextFixture.matchday}!</p>
                      <p className="text-xs text-emerald-400/80 mt-0.5">
                        Standard: €{confirmedPrices?.standard} · VIP: {confirmedPrices?.vip ? `€${confirmedPrices.vip}` : "N/A"}
                      </p>
                    </div>
                  </div>
                  <span className="flex items-center gap-1 text-[11px] font-bold bg-emerald-950/70 border border-emerald-700/60 text-emerald-300 px-2 py-0.5 rounded-md uppercase tracking-wider shrink-0">
                    <Lock className="w-3 h-3 text-emerald-400" /> Locked
                  </span>
                </div>
              )}
              {priceConfirmStatus === "boycott" && (
                <div className="mb-4 flex items-start justify-between gap-3 bg-red-900/40 border border-red-600 rounded-xl px-4 py-3 text-sm text-red-300">
                  <div className="flex items-start gap-2.5">
                    <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0 text-red-400 animate-pulse" />
                    <div>
                      <p className="font-bold text-red-200">⚠️ Warning: Prices confirmed under active Ultras boycott.</p>
                      <p className="text-xs text-red-400 mt-0.5">Expect empty stands! Standard attendance will be forced to 0.</p>
                    </div>
                  </div>
                  <span className="flex items-center gap-1 text-[11px] font-bold bg-red-950/70 border border-red-700/60 text-red-300 px-2 py-0.5 rounded-md uppercase tracking-wider shrink-0">
                    <Lock className="w-3 h-3 text-red-400" /> Locked
                  </span>
                </div>
              )}

              {/* Standard */}
              <div className={`space-y-2 mb-5 transition-opacity duration-300 ${priceConfirmStatus !== null ? "opacity-60" : ""}`}>
                <div className="flex justify-between items-center">
                  <div>
                    <label htmlFor="standard-price-range" className="text-sm text-gray-300 font-medium flex items-center gap-1.5">
                      {priceConfirmStatus !== null && <Lock className="w-3 h-3 text-gray-400" />}
                      Standard Ticket
                    </label>
                    <p className="text-[11px] text-gray-500">
                      {priceConfirmStatus !== null ? "Confirmed & locked for this match" : "Suggested by form: €50–€120"}
                    </p>
                  </div>
                  <span className={`text-lg font-extrabold ${isBoycottActive ? "text-red-400" : "text-yellow-500"}`}>€{standardPrice}</span>
                </div>
                <input id="standard-price-range" type="range" min={20} max={150} step={1} value={standardPrice}
                  disabled={priceConfirmStatus !== null}
                  onChange={handleStandardPriceChange}
                  className={`w-full h-2 appearance-none rounded-full bg-gray-700 accent-yellow-500 ${priceConfirmStatus !== null ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`} />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>€20</span>
                  <span className="text-yellow-500/80 font-medium">Target €50–€120</span>
                  <span>€150</span>
                </div>
              </div>

              {/* VIP */}
              <div className={`space-y-2 transition-opacity duration-300 ${vipLocked || priceConfirmStatus !== null ? "opacity-50" : ""}`}>
                <div className="flex justify-between items-center">
                  <div>
                    <label htmlFor="vip-price-range" className="text-sm font-medium flex items-center gap-1.5">
                      {priceConfirmStatus !== null ? <Lock className="w-3 h-3 text-gray-400" /> : <Star className="w-3.5 h-3.5 text-yellow-500" />}
                      <span className="text-yellow-400">VIP Suite Ticket</span>
                    </label>
                    <p className="text-[11px] text-gray-500">
                      {priceConfirmStatus !== null ? "Confirmed & locked for this match" : "Suggested by form: €200–€500"}
                    </p>
                  </div>
                  <span className="text-lg font-extrabold text-yellow-500">{vipLocked ? "N/A" : `€${vipPrice}`}</span>
                </div>
                <input id="vip-price-range" type="range" min={100} max={600} step={10} value={vipPrice}
                  disabled={vipLocked || priceConfirmStatus !== null}
                  onChange={handleVipPriceChange}
                  className={`w-full h-2 appearance-none rounded-full bg-gray-700 accent-yellow-500 ${(vipLocked || priceConfirmStatus !== null) ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`} />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>€100</span>
                  <span className="text-yellow-500/80 font-medium">Target €200–€500</span>
                  <span>€600</span>
                </div>
              </div>

              {vipLocked && (
                <div className="mt-3 flex items-center gap-2 text-xs text-yellow-600 bg-yellow-900/20 border border-yellow-700/30 rounded-lg px-3 py-2">
                  <Lock className="w-3.5 h-3.5 shrink-0" />
                  <span>⚠️ Locked: Stadium capacity must be 25,000+ to unlock VIP Suites.</span>
                </div>
              )}

              <div className="mt-5 pt-4 border-t border-gray-800">
                <button
                  type="button"
                  onClick={handleConfirmPrices}
                  disabled={confirmingPrices || priceConfirmStatus !== null}
                  className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-sm uppercase tracking-wider transition-all ${
                    confirmingPrices
                      ? "opacity-60 cursor-wait bg-gray-800 text-gray-400"
                      : priceConfirmStatus === "confirmed"
                      ? "bg-emerald-950/50 border border-emerald-700/60 text-emerald-400 cursor-not-allowed opacity-80"
                      : priceConfirmStatus === "boycott"
                      ? "bg-red-950/50 border border-red-700/60 text-red-400 cursor-not-allowed opacity-80"
                      : isBoycottActive
                      ? "bg-red-700 hover:bg-red-600 text-white border border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.35)] cursor-pointer"
                      : "bg-yellow-500 hover:bg-yellow-400 text-gray-950 shadow-[0_0_16px_rgba(234,179,8,0.35)] cursor-pointer"
                  }`}
                >
                  {confirmingPrices ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Saving Prices to Match…</>
                  ) : priceConfirmStatus === "confirmed" ? (
                    <><Lock className="w-4 h-4 text-emerald-400" /> Ticket Prices Confirmed & Locked</>
                  ) : priceConfirmStatus === "boycott" ? (
                    <><Lock className="w-4 h-4 text-red-400" /> Ticket Prices Locked (Boycott Active)</>
                  ) : isBoycottActive ? (
                    <><ShieldAlert className="w-4 h-4" /> Confirm Prices (Boycott Active)</>
                  ) : (
                    <><CheckCircle2 className="w-4 h-4" /> Confirm Ticket Prices</>
                  )}
                </button>
                {priceConfirmStatus !== null ? (
                  <p className="text-xs text-gray-500 text-center mt-2 flex items-center justify-center gap-1">
                    <Lock className="w-3 h-3 text-gray-500" /> Prices locked for Matchday {nextFixture.matchday > 0 ? nextFixture.matchday : "—"}. You can set new prices for the next home match.
                  </p>
                ) : (
                  <p className="text-xs text-gray-500 text-center mt-2">
                    Lock in your pricing strategy for Matchday {nextFixture.matchday > 0 ? nextFixture.matchday : "—"} (defaults apply automatically if skipped)
                  </p>
                )}
              </div>
            </section>

            {/* STADIUM OVERVIEW */}
            <section className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Building2 className="w-5 h-5 text-yellow-500" />
                <h2 className="text-base font-bold text-white uppercase tracking-wide">Stadium Overview</h2>
              </div>
              <div className="space-y-2">
                {[
                  { label: "Permanent Stadium", value: club.stadiumName, color: "text-gray-300" },
                  ...(nextFixture.overrideStadiumName
                    ? [
                        {
                          label: `Matchday ${nextFixture.matchday} Venue (Rental)`,
                          value: `${nextFixture.overrideStadiumName}${nextFixture.rentedFromClubName ? ` (${nextFixture.rentedFromClubName})` : ""}`,
                          color: "text-blue-400 font-bold",
                        },
                        {
                          label: "Rental Venue Capacity",
                          value: (nextFixture.venueCapacity ?? 53000).toLocaleString(),
                          color: "text-emerald-400 font-bold",
                        },
                      ]
                    : [
                        { label: "Standard Seats",   value: club.capacity.toLocaleString(),                      color: "text-white" },
                        { label: "VIP Suite Seats",  value: club.vipCapacity.toLocaleString(),                   color: "text-yellow-400" },
                        { label: "Total Capacity",   value: (club.capacity + club.vipCapacity).toLocaleString(), color: "text-emerald-400" },
                      ]
                  ),
                ].map(({ label, value, color }) => (
                  <div key={label} className="flex justify-between items-center py-2 border-b border-gray-800 last:border-0">
                    <span className="text-sm text-gray-400">{label}</span>
                    <span className={`text-sm font-bold ${color}`}>{value}</span>
                  </div>
                ))}
              </div>
              <div className={`mt-4 flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold ${
                vipLocked
                  ? "bg-red-900/30 border border-red-800 text-red-400"
                  : "bg-yellow-900/30 border border-yellow-700/50 text-yellow-400"
              }`}>
                {vipLocked
                  ? <><Lock className="w-3.5 h-3.5" /> VIP Locked — reach {VIP_CAPACITY_THRESHOLD.toLocaleString()} standard seats</>
                  : <><Unlock className="w-3.5 h-3.5" /> VIP Suites Unlocked — stadium qualifies</>
                }
              </div>
            </section>
          </div>

          {/* ── RIGHT COLUMN ─────────────────────────────────────────────── */}
          <div className="space-y-6">

            {/* CONSTRUCTION STATUS */}
            <section className={`border rounded-2xl p-5 transition-all duration-300 ${
              upgradeStatus.isUpgrading ? "bg-amber-950/30 border-amber-700/60" : "bg-gray-900 border-gray-800"
            }`}>
              <div className="flex items-center gap-2 mb-3">
                <Hammer className={`w-5 h-5 ${upgradeStatus.isUpgrading ? "text-amber-400 animate-bounce" : "text-gray-500"}`} />
                <h2 className="text-base font-bold text-white uppercase tracking-wide">Construction</h2>
              </div>
              {upgradeStatus.isUpgrading ? (
                <div className="space-y-3">
                  <p className="text-amber-300 font-semibold text-sm">🏗️ {upgradeStatus.projectLabel}</p>
                  {/* Progress bar */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-gray-400">
                      <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-amber-400" /> Progress</span>
                      <span className="text-amber-400 font-bold">
                        {upgradeStatus.totalRounds - upgradeStatus.roundsLeft} / {upgradeStatus.totalRounds} rounds
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-amber-600 to-amber-400 transition-all duration-500"
                        style={{
                          width: upgradeStatus.totalRounds > 0
                            ? `${((upgradeStatus.totalRounds - upgradeStatus.roundsLeft) / upgradeStatus.totalRounds) * 100}%`
                            : "0%"
                        }}
                      />
                    </div>
                    <p className="text-xs text-amber-400/70"><strong className="text-amber-400">{upgradeStatus.roundsLeft}</strong> matchweek(s) remaining</p>
                  </div>
                  {upgradeStatus.pendingStandardCapacity > 0 && (
                    <p className="text-xs text-gray-400">Pending: <span className="text-white font-bold">+{upgradeStatus.pendingStandardCapacity.toLocaleString()} standard seats</span></p>
                  )}
                  {upgradeStatus.pendingVipCapacity > 0 && (
                    <p className="text-xs text-gray-400">Pending: <span className="text-yellow-400 font-bold">+{upgradeStatus.pendingVipCapacity.toLocaleString()} VIP seats</span></p>
                  )}
                  <div className="text-xs text-amber-500/70 bg-amber-900/20 border border-amber-800/30 rounded-lg px-3 py-2">
                    ⚠️ Stadium partially closed during construction. No new upgrades until completion.
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-sm text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Stadium fully operational. No active projects.</span>
                </div>
              )}
            </section>

            {/* STADIUM UPGRADE BUTTON */}
            <section className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Zap className="w-5 h-5 text-yellow-500" />
                <h2 className="text-base font-bold text-white uppercase tracking-wide">Upgrade Stadium</h2>
              </div>
              <p className="text-sm text-gray-400 mb-4">
                Expand your stadium to increase match day revenue and unlock VIP suites.
                {vipLocked && (
                  <span className="text-yellow-600"> Reach <strong className="text-yellow-500">25,000</strong> standard seats to unlock VIP expansions.</span>
                )}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-500 mb-4">
                <div className="bg-gray-800/60 border border-gray-700 rounded-xl px-3 py-2">
                  <p className="font-bold text-white text-sm mb-1">Standard Seating</p>
                  <p>+2,000 seats · €300,000 · 2 rounds</p>
                  <p>+10,000 seats · €1.6M · 3 rounds</p>
                  <p>+20,000 seats · €3M · 5 rounds</p>
                </div>
                <div className={`border rounded-xl px-3 py-2 ${vipLocked ? "bg-gray-800/30 border-gray-700 opacity-50" : "bg-yellow-950/20 border-yellow-700/30"}`}>
                  <p className={`font-bold text-sm mb-1 flex items-center gap-1 ${vipLocked ? "text-gray-500" : "text-yellow-300"}`}>
                    {vipLocked ? <Lock className="w-3 h-3" /> : <Star className="w-3 h-3 text-yellow-500" />} VIP Suites
                  </p>
                  {vipLocked ? (
                    <p className="text-yellow-700">Unlock at 25k seats</p>
                  ) : (
                    <>
                      <p>+500 VIP · €800,000 · 2 rounds</p>
                      <p>+1,500 VIP · €2M · 4 rounds</p>
                    </>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowUpgradeModal(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-sm uppercase tracking-wider bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 text-gray-950 shadow-[0_0_20px_rgba(234,179,8,0.35)] hover:shadow-[0_0_30px_rgba(234,179,8,0.55)] transition-all cursor-pointer"
              >
                <Hammer className="w-4 h-4" />
                {upgradeStatus.isUpgrading ? "View Upgrade Options (Construction Active)" : "Upgrade Stadium"}
              </button>
            </section>

            {/* RENT OUT STADIUM */}
            <section className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <Home className="w-5 h-5 text-blue-400" />
                <h2 className="text-base font-bold text-white uppercase tracking-wide">Rent Out Stadium</h2>
                {rentalData?.incomingOffers && rentalData.incomingOffers.length > 0 && (
                  <span className="ml-auto flex items-center gap-1 text-xs font-bold text-yellow-400 bg-yellow-900/30 border border-yellow-700/40 px-2 py-0.5 rounded-full animate-pulse">
                    <BellRing className="w-3 h-3" /> {rentalData.incomingOffers.length} offer{rentalData.incomingOffers.length > 1 ? "s" : ""}
                  </span>
                )}
              </div>

              {upgradeStatus.isUpgrading ? (
                <div className="space-y-3">
                  <div className="flex items-start gap-2 text-sm text-blue-300 bg-blue-900/20 border border-blue-700/30 rounded-xl px-3 py-3">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-blue-400" />
                    <span>Your stadium is under construction. You may need to rent another team&apos;s stadium for your home matches.</span>
                  </div>
                  {rentalData?.activeRental && (
                    <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-900/20 border border-emerald-700/30 rounded-lg px-3 py-2">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Matchday {rentalData.activeRental.matchday} at {rentalData.activeRental.toClubName} confirmed
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={handleOpenRentalModal}
                    disabled={rentalLoading}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-sm uppercase tracking-wider bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_16px_rgba(59,130,246,0.3)] hover:shadow-[0_0_24px_rgba(59,130,246,0.5)] transition-all cursor-pointer disabled:opacity-50"
                  >
                    {rentalLoading
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> Loading…</>
                      : <><MapPin className="w-4 h-4" /> Find Rental Venue</>
                    }
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-gray-400">
                    Other clubs can rent your stadium for matches when you&apos;re not hosting. Receive rental income and negotiate the best price.
                  </p>
                  {rentalData?.incomingOffers && rentalData.incomingOffers.length > 0 && (
                    <div className="flex items-center gap-2 text-xs text-yellow-400 bg-yellow-900/20 border border-yellow-700/30 rounded-lg px-3 py-2">
                      <BellRing className="w-3.5 h-3.5 animate-pulse" />
                      You have {rentalData.incomingOffers.length} pending rental request{rentalData.incomingOffers.length > 1 ? "s" : ""}!
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={handleOpenRentalModal}
                    disabled={rentalLoading}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-sm uppercase tracking-wider bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 hover:border-blue-600/50 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {rentalLoading
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> Loading…</>
                      : <><RefreshCw className="w-4 h-4" /> Manage Stadium Rentals</>
                    }
                  </button>
                </div>
              )}
            </section>
          </div>
        </div>
      </div>

      {/* DEV TOOLBAR */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-800 bg-gray-950/95 backdrop-blur-sm shadow-[0_-4px_30px_rgba(0,0,0,0.5)]">
        <button type="button" onClick={() => setDevToolbarOpen((v) => !v)}
          className="w-full flex items-center justify-between px-6 py-2 text-xs text-gray-500 hover:text-gray-300 transition-colors">
          <span className="flex items-center gap-2 font-mono">
            <Zap className="w-3.5 h-3.5 text-yellow-600" />
            DEV TOOLBAR — Logic Testing Controls
          </span>
          {devToolbarOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </button>

        {devToolbarOpen && (
          <div className="px-6 pb-4 pt-2 border-t border-gray-800/50 space-y-3">
            <div className="flex flex-wrap gap-2">
              {upgradeStatus.isUpgrading && (
                <button type="button" onClick={devAdvanceRound}
                  className="flex items-center gap-1.5 bg-amber-900/40 hover:bg-amber-800/60 border border-amber-700 text-xs text-amber-300 px-3 py-1.5 rounded-lg transition-all cursor-pointer">
                  <Zap className="w-3.5 h-3.5" /> Advance 1 Round ({upgradeStatus.roundsLeft} left)
                </button>
              )}
              <span className="w-px bg-gray-700 self-stretch mx-1" />
              <button type="button" onClick={devAddWin}  className="bg-emerald-900/40 hover:bg-emerald-800/60 border border-emerald-700/50 text-xs text-emerald-300 px-3 py-1.5 rounded-lg cursor-pointer">+W</button>
              <button type="button" onClick={devAddDraw} className="bg-yellow-900/40 hover:bg-yellow-800/60 border border-yellow-700/50 text-xs text-yellow-300 px-3 py-1.5 rounded-lg cursor-pointer">+D</button>
              <button type="button" onClick={devAddLoss} className="bg-red-900/40 hover:bg-red-800/60 border border-red-700/50 text-xs text-red-300 px-3 py-1.5 rounded-lg cursor-pointer">+L</button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-gray-500 font-mono mr-1">Next Match Tier:</span>
              {(["regular", "decider", "derby", "throne"] as MatchTier[]).map((tier) => {
                const meta = TIER_META[tier];
                const isActive = nextFixture.tier === tier;
                return (
                  <button key={tier} type="button" onClick={() => devSetTier(tier)}
                    className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
                      isActive
                        ? `${meta.bgColor} ${meta.borderColor} ${meta.color}`
                        : "bg-gray-800 border-gray-700 text-gray-500 hover:text-gray-300"
                    }`}>
                    {meta.icon} {meta.shortLabel}
                    {isActive && <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />}
                  </button>
                );
              })}
            </div>
            <div className="text-xs text-gray-600 font-mono">
              club={club.name} | cap={club.capacity.toLocaleString()} | budget={formatEuro(budget)} | form={teamForm} | tier={nextFixture.tier} | boycott={String(isBoycottActive)}
              {matchdayForecast && ` | forecast: ${formatEuro(matchdayForecast.finances.netProfit)} net | fans: ${matchdayForecast.attendance.total.toLocaleString()}`}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
