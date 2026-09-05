"use client";

import { useState, useMemo } from "react";
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
} from "lucide-react";
import { StadiumEconomyEngine } from "@/lib/services/stadium-economy-engine";

// ─────────────────────────────────────────────────────────────────────────────
// TYPE DEFINITIONS
// ─────────────────────────────────────────────────────────────────────────────
type MatchResult = "W" | "D" | "L";

interface Club {
  name: string;
  /** Standard seating — sourced from BOTOLA_STADIUM_REGISTRY on mount, then
   *  grows as upgrades complete. */
  capacity: number;
  /** VIP seats — initialised from registry (5% of total) + upgrade additions */
  vipCapacity: number;
  /** Stadium name pulled from the engine registry */
  stadiumName: string;
}

interface UpgradeOption {
  id: string;
  label: string;
  seatsAdded: number;
  cost: number;
  rounds: number;
  type: "standard" | "vip";
}

interface UpgradeStatus {
  isUpgrading: boolean;
  roundsLeft: number;
  pendingStandardCapacity: number;
  pendingVipCapacity: number;
  projectLabel: string;
}

interface RentalStadium {
  id: string;
  name: string;
  city: string;
  rentalCapacity: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT PROPS  (new in this refactor)
// ─────────────────────────────────────────────────────────────────────────────
export interface StadiumDashboardProps {
  /** Club identifier — must match a key in BOTOLA_STADIUM_REGISTRY */
  currentClub: string;
  /** The manager's real global budget passed in from the app layout */
  globalBudget: number;
  /** Callback fired when an upgrade is purchased; parent updates global budget */
  onBudgetChange?: (newBudget: number) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────
const VIP_CAPACITY_THRESHOLD = 25000;

const RESULT_SCORE: Record<MatchResult, number> = { W: 1, D: 0.5, L: 0 };

const UPGRADE_OPTIONS: UpgradeOption[] = [
  { id: "std-sm", label: "+2,000 Standard Seats",  seatsAdded: 2_000,  cost: 300_000,   rounds: 2, type: "standard" },
  { id: "std-md", label: "+10,000 Standard Seats", seatsAdded: 10_000, cost: 1_600_000, rounds: 3, type: "standard" },
  { id: "std-lg", label: "+20,000 Standard Seats", seatsAdded: 20_000, cost: 3_000_000, rounds: 5, type: "standard" },
  { id: "vip-sm", label: "+500 VIP Suite Seats",   seatsAdded: 500,    cost: 800_000,   rounds: 2, type: "vip" },
  { id: "vip-lg", label: "+1,500 VIP Suite Seats", seatsAdded: 1_500,  cost: 2_000_000, rounds: 4, type: "vip" },
];

const RENTAL_STADIUMS: RentalStadium[] = [
  { id: "rent-fes",      name: "Grand Stade de Fès",    city: "Fès",        rentalCapacity: 45_000 },
  { id: "rent-massira",  name: "Stade El Massira",       city: "Agadir",     rentalCapacity: 15_000 },
  { id: "rent-complexe", name: "Complexe Mohammed V",    city: "Casablanca", rentalCapacity: 45_891 },
  { id: "rent-honour",   name: "Stade d'Honneur Meknès", city: "Meknès",    rentalCapacity: 20_000 },
];

const BOYCOTT_FORM_THRESHOLD  = 4;
const BOYCOTT_PRICE_THRESHOLD = 30;

// ─────────────────────────────────────────────────────────────────────────────
// ENGINE HELPERS  — read initial club data from the registry
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resolves a club's initial state from the StadiumEconomyEngine registry.
 * Falls back gracefully if the club key is not found (e.g. during first render
 * before the prop is available).
 */
function resolveClubFromRegistry(clubName: string): Club {
  const entry = StadiumEconomyEngine.BOTOLA_STADIUM_REGISTRY[clubName];
  if (!entry) {
    // Unknown club — safe defaults so the UI never crashes
    return {
      name: clubName,
      capacity: 20_000,
      vipCapacity: 1_000,
      stadiumName: "Unknown Stadium",
    };
  }
  const totalCapacity = entry.capacity;
  const vipCapacity = Math.floor(
    totalCapacity * StadiumEconomyEngine.VIP_CAPACITY_PERCENTAGE
  );
  const standardCapacity = totalCapacity - vipCapacity;
  return {
    name: clubName,
    capacity: standardCapacity,
    vipCapacity,
    stadiumName: entry.stadium,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// PURE LOGIC HELPERS  (unchanged from Steps 1–3)
// ─────────────────────────────────────────────────────────────────────────────
function calculateTeamForm(past10Matches: MatchResult[]): number {
  if (past10Matches.length === 0) return 0;
  const totalPoints = past10Matches.reduce((acc, r) => acc + RESULT_SCORE[r], 0);
  return Math.round(((totalPoints / past10Matches.length) * 10) * 10) / 10;
}

function getMatchBreakdown(matches: MatchResult[]) {
  return matches.reduce(
    (acc, r) => {
      if (r === "W") acc.wins++;
      else if (r === "D") acc.draws++;
      else acc.losses++;
      return acc;
    },
    { wins: 0, draws: 0, losses: 0 }
  );
}

function isVipLocked(capacity: number): boolean {
  return capacity < VIP_CAPACITY_THRESHOLD;
}

function addMatchResult(current: MatchResult[], newResult: MatchResult): MatchResult[] {
  return [...current, newResult].slice(-10);
}

function formatEuro(amount: number): string {
  return `${amount.toLocaleString()} €`;
}

function getPurchaseBlockReason(
  option: UpgradeOption,
  budget: number,
  isUpgrading: boolean,
  currentCapacity: number
): string | null {
  if (isUpgrading) return "Construction in progress";
  if (budget < option.cost) return "Insufficient budget";
  if (option.type === "vip" && isVipLocked(currentCapacity))
    return `Requires ${VIP_CAPACITY_THRESHOLD.toLocaleString()}+ seats`;
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// STYLE HELPERS  (unchanged from Step 3)
// ─────────────────────────────────────────────────────────────────────────────
function getFormBadgeClasses(form: number): string {
  if (form >= 7) return "bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/50";
  if (form >= 4) return "bg-yellow-500/20 text-yellow-400 ring-1 ring-yellow-500/50";
  return "bg-red-500/20 text-red-400 ring-1 ring-red-500/50";
}

function FormTrendIcon({ form }: { form: number }) {
  if (form >= 7) return <TrendingUp className="w-4 h-4 text-emerald-400" />;
  if (form >= 4) return <Minus className="w-4 h-4 text-yellow-400" />;
  return <TrendingDown className="w-4 h-4 text-red-400" />;
}

function MatchPill({ result }: { result: MatchResult }) {
  const colorMap: Record<MatchResult, string> = {
    W: "bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/40",
    D: "bg-yellow-500/20 text-yellow-300 ring-1 ring-yellow-500/40",
    L: "bg-red-500/20 text-red-300 ring-1 ring-red-500/40",
  };
  return (
    <span className={`inline-flex items-center justify-center w-7 h-7 rounded text-xs font-bold ${colorMap[result]}`}>
      {result}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function StadiumDashboard({
  currentClub,
  globalBudget,
  onBudgetChange,
}: StadiumDashboardProps) {

  // ── CLUB STATE — initialised from the engine registry on first render ──────
  const [club, setClub] = useState<Club>(() => resolveClubFromRegistry(currentClub));

  // ── MATCH HISTORY ──────────────────────────────────────────────────────────
  const [past10Matches, setPast10Matches] = useState<MatchResult[]>([
    "W", "W", "D", "L", "W", "W", "D", "L", "W", "W",
  ]);

  // ── TICKET PRICING ─────────────────────────────────────────────────────────
  const [standardPrice, setStandardPrice] = useState<number>(15);
  const [vipPrice, setVipPrice] = useState<number>(120);

  // ── CONSTRUCTION QUEUE ─────────────────────────────────────────────────────
  const [upgradeStatus, setUpgradeStatus] = useState<UpgradeStatus>({
    isUpgrading: false,
    roundsLeft: 0,
    pendingStandardCapacity: 0,
    pendingVipCapacity: 0,
    projectLabel: "",
  });

  // ── RENTAL MARKET ──────────────────────────────────────────────────────────
  const [rentalOffers, setRentalOffers] = useState<Record<string, number>>(
    Object.fromEntries(RENTAL_STADIUMS.map((s) => [s.id, 0]))
  );
  const [lastOfferMessage, setLastOfferMessage] = useState<string>("");

  // ── DEV TOOLBAR ────────────────────────────────────────────────────────────
  const [devToolbarOpen, setDevToolbarOpen] = useState(false);

  // ─────────────────────────────────────────────────────────────────────────
  // DERIVED VALUES
  // ─────────────────────────────────────────────────────────────────────────
  const teamForm  = useMemo(() => calculateTeamForm(past10Matches), [past10Matches]);
  const vipLocked = useMemo(() => isVipLocked(club.capacity), [club.capacity]);
  const breakdown = useMemo(() => getMatchBreakdown(past10Matches), [past10Matches]);
  const isBoycottActive = teamForm < BOYCOTT_FORM_THRESHOLD && standardPrice >= BOYCOTT_PRICE_THRESHOLD;

  // ─────────────────────────────────────────────────────────────────────────
  // HANDLERS
  // ─────────────────────────────────────────────────────────────────────────
  function handleStandardPriceChange(e: React.ChangeEvent<HTMLInputElement>) {
    setStandardPrice(Math.max(1, Math.min(200, Number(e.target.value))));
  }

  function handleVipPriceChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (vipLocked) return;
    setVipPrice(Math.max(50, Math.min(500, Number(e.target.value))));
  }

  /**
   * Purchase handler — now uses globalBudget (prop) instead of local state.
   * Calls onBudgetChange so the parent can update the real global budget.
   */
  function handlePurchaseUpgrade(option: UpgradeOption) {
    const blockReason = getPurchaseBlockReason(
      option, globalBudget, upgradeStatus.isUpgrading, club.capacity
    );
    if (blockReason) { alert(`Cannot purchase: ${blockReason}`); return; }

    // Notify parent to deduct cost from the real global budget
    onBudgetChange?.(globalBudget - option.cost);

    // Start construction project
    setUpgradeStatus({
      isUpgrading: true,
      roundsLeft: option.rounds,
      pendingStandardCapacity: option.type === "standard" ? option.seatsAdded : 0,
      pendingVipCapacity:      option.type === "vip"      ? option.seatsAdded : 0,
      projectLabel: option.label,
    });
  }

  function handleRentalOfferChange(stadiumId: string, value: number) {
    setRentalOffers((prev) => ({ ...prev, [stadiumId]: Math.max(0, value) }));
  }

  function handleSendOffer(stadium: RentalStadium) {
    const offerAmount = rentalOffers[stadium.id] ?? 0;
    if (offerAmount <= 0) { alert("Please enter an offer amount greater than 0 €."); return; }
    const message = `✅ Offer of ${formatEuro(offerAmount)} sent to the owner of ${stadium.name} (${stadium.city})!`;
    setLastOfferMessage(message);
    setTimeout(() => setLastOfferMessage(""), 5000);
  }

  function simulateMatchweek() {
    const pool: MatchResult[] = ["W", "W", "D", "L", "W"];
    setPast10Matches((prev) => addMatchResult(prev, pool[Math.floor(Math.random() * pool.length)]));
    if (!upgradeStatus.isUpgrading) return;
    const newRoundsLeft = upgradeStatus.roundsLeft - 1;
    if (newRoundsLeft <= 0) {
      setClub((prev) => ({
        ...prev,
        capacity:    prev.capacity    + upgradeStatus.pendingStandardCapacity,
        vipCapacity: prev.vipCapacity + upgradeStatus.pendingVipCapacity,
      }));
      setUpgradeStatus({ isUpgrading: false, roundsLeft: 0, pendingStandardCapacity: 0, pendingVipCapacity: 0, projectLabel: "" });
    } else {
      setUpgradeStatus((prev) => ({ ...prev, roundsLeft: newRoundsLeft }));
    }
  }

  /** DEV: Instantly complete the active construction project */
  function devCompleteConstruction() {
    if (!upgradeStatus.isUpgrading) return;
    setClub((prev) => ({
      ...prev,
      capacity:    prev.capacity    + upgradeStatus.pendingStandardCapacity,
      vipCapacity: prev.vipCapacity + upgradeStatus.pendingVipCapacity,
    }));
    setUpgradeStatus({ isUpgrading: false, roundsLeft: 0, pendingStandardCapacity: 0, pendingVipCapacity: 0, projectLabel: "" });
  }

  // Match result dev shortcuts (kept for form testing)
  function devAddWin()  { setPast10Matches((prev) => addMatchResult(prev, "W")); }
  function devAddDraw() { setPast10Matches((prev) => addMatchResult(prev, "D")); }
  function devAddLoss() { setPast10Matches((prev) => addMatchResult(prev, "L")); }

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 font-sans pb-20">

      {/* ── BOYCOTT BANNER ────────────────────────────────────────────────── */}
      {isBoycottActive && (
        <div className="sticky top-0 z-50 w-full bg-red-950 border-b border-red-700 shadow-[0_0_40px_rgba(239,68,68,0.4)]">
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

        {/* ── HEADER ──────────────────────────────────────────────────────── */}
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-yellow-500 text-xs font-semibold uppercase tracking-widest mb-1">
              <Building2 className="w-4 h-4" />
              <span>Stadium Command Centre</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              {club.name}
            </h1>
            <p className="text-gray-400 text-sm mt-1">{club.stadiumName} · Botola Pro</p>
          </div>

          {/* KPI chips */}
          <div className="flex flex-wrap gap-3">
            <div className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-2 flex items-center gap-2">
              <Users className="w-4 h-4 text-yellow-500" />
              <span className="text-xs text-gray-400">Total Capacity</span>
              <span className="text-sm font-bold text-white">
                {(club.capacity + club.vipCapacity).toLocaleString()}
              </span>
            </div>
            {/* Budget now reflects the real globalBudget prop */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-2 flex items-center gap-2">
              <Wallet className="w-4 h-4 text-emerald-400" />
              <span className="text-xs text-gray-400">Budget</span>
              <span className="text-sm font-bold text-emerald-400">{formatEuro(globalBudget)}</span>
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

        {/* ══════════════════════════════════════════════════════════════════
            MAIN GRID
        ══════════════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* ── LEFT COLUMN ─────────────────────────────────────────────── */}
          <div className="space-y-6">

            {/* TEAM FORM */}
            <section className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Trophy className="w-5 h-5 text-yellow-500" />
                <h2 className="text-base font-bold text-white uppercase tracking-wide">Team Form</h2>
              </div>
              <div className="flex items-center gap-3 mb-4">
                <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-2xl font-extrabold ${getFormBadgeClasses(teamForm)}`}>
                  <FormTrendIcon form={teamForm} />
                  {teamForm} <span className="text-sm font-normal opacity-70">/ 10</span>
                </span>
                <div className="text-sm text-gray-400">
                  <span className="text-emerald-400 font-semibold">{breakdown.wins}W</span>
                  {" · "}
                  <span className="text-yellow-400 font-semibold">{breakdown.draws}D</span>
                  {" · "}
                  <span className="text-red-400 font-semibold">{breakdown.losses}L</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {past10Matches.map((result, index) => (
                  <MatchPill key={index} result={result} />
                ))}
              </div>
            </section>

            {/* TICKET PRICING */}
            <section
              className={`border rounded-2xl p-5 transition-all duration-500 ${
                isBoycottActive
                  ? "bg-red-950/30 border-red-700 shadow-[0_0_30px_rgba(239,68,68,0.2)]"
                  : "bg-gray-900 border-gray-800"
              }`}
            >
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

              {/* Standard */}
              <div className="space-y-2 mb-5">
                <div className="flex justify-between items-center">
                  <label htmlFor="standard-price-range" className="text-sm text-gray-300 font-medium">
                    Standard Ticket
                  </label>
                  <span className={`text-lg font-extrabold ${isBoycottActive ? "text-red-400" : "text-yellow-500"}`}>
                    €{standardPrice}
                  </span>
                </div>
                <input
                  id="standard-price-range"
                  type="range" min={1} max={200} step={1}
                  value={standardPrice}
                  onChange={handleStandardPriceChange}
                  className="w-full h-2 appearance-none rounded-full bg-gray-700 accent-yellow-500 cursor-pointer"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>€1</span><span>€200</span>
                </div>
              </div>

              {/* VIP */}
              <div className={`space-y-2 transition-opacity duration-300 ${vipLocked ? "opacity-40 pointer-events-none" : ""}`}>
                <div className="flex justify-between items-center">
                  <label htmlFor="vip-price-range" className="text-sm font-medium flex items-center gap-1.5">
                    <Star className="w-3.5 h-3.5 text-yellow-500" />
                    <span className="text-yellow-400">VIP Suite Ticket</span>
                  </label>
                  <span className="text-lg font-extrabold text-yellow-500">
                    {vipLocked ? "N/A" : `€${vipPrice}`}
                  </span>
                </div>
                <input
                  id="vip-price-range"
                  type="range" min={50} max={500} step={10}
                  value={vipPrice}
                  disabled={vipLocked}
                  onChange={handleVipPriceChange}
                  className="w-full h-2 appearance-none rounded-full bg-gray-700 accent-yellow-500 cursor-pointer"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>€50</span><span>€500</span>
                </div>
              </div>

              {vipLocked && (
                <div className="mt-3 flex items-center gap-2 text-xs text-yellow-600 bg-yellow-900/20 border border-yellow-700/30 rounded-lg px-3 py-2">
                  <Lock className="w-3.5 h-3.5 shrink-0" />
                  <span>⚠️ Locked: Stadium capacity must be 25,000+ to unlock VIP Suites.</span>
                </div>
              )}
            </section>

            {/* STADIUM OVERVIEW */}
            <section className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Building2 className="w-5 h-5 text-yellow-500" />
                <h2 className="text-base font-bold text-white uppercase tracking-wide">Stadium Overview</h2>
              </div>
              <div className="space-y-2">
                {[
                  { label: "Stadium",         value: club.stadiumName,                               color: "text-gray-300" },
                  { label: "Standard Seats",  value: club.capacity.toLocaleString(),                 color: "text-white" },
                  { label: "VIP Suite Seats", value: club.vipCapacity.toLocaleString(),              color: "text-yellow-400" },
                  { label: "Total Capacity",  value: (club.capacity + club.vipCapacity).toLocaleString(), color: "text-emerald-400" },
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

          {/* ── RIGHT COLUMN ────────────────────────────────────────────── */}
          <div className="space-y-6">

            {/* CONSTRUCTION STATUS */}
            <section className={`border rounded-2xl p-5 transition-all duration-300 ${
              upgradeStatus.isUpgrading
                ? "bg-amber-950/30 border-amber-700/60"
                : "bg-gray-900 border-gray-800"
            }`}>
              <div className="flex items-center gap-2 mb-3">
                <Hammer className={`w-5 h-5 ${upgradeStatus.isUpgrading ? "text-amber-400 animate-bounce" : "text-gray-500"}`} />
                <h2 className="text-base font-bold text-white uppercase tracking-wide">Construction</h2>
              </div>
              {upgradeStatus.isUpgrading ? (
                <div className="space-y-3">
                  <p className="text-amber-300 font-semibold text-sm">🏗️ {upgradeStatus.projectLabel}</p>
                  <div className="flex items-center gap-2 text-sm text-gray-300">
                    <Clock className="w-4 h-4 text-amber-400" />
                    <span><strong className="text-amber-400">{upgradeStatus.roundsLeft}</strong> matchweek(s) remaining</span>
                  </div>
                  {upgradeStatus.pendingStandardCapacity > 0 && (
                    <p className="text-xs text-gray-400">Pending: <span className="text-white font-bold">+{upgradeStatus.pendingStandardCapacity.toLocaleString()} standard seats</span></p>
                  )}
                  {upgradeStatus.pendingVipCapacity > 0 && (
                    <p className="text-xs text-gray-400">Pending: <span className="text-yellow-400 font-bold">+{upgradeStatus.pendingVipCapacity.toLocaleString()} VIP seats</span></p>
                  )}
                  <div className="text-xs text-amber-500/70 bg-amber-900/20 border border-amber-800/30 rounded-lg px-3 py-2">
                    ⚠️ Stadium partially closed. No new upgrades until completion.
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-sm text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Stadium fully operational. No active projects.</span>
                </div>
              )}
            </section>

            {/* UPGRADE STORE — Standard */}
            <section className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Zap className="w-5 h-5 text-yellow-500" />
                <h2 className="text-base font-bold text-white uppercase tracking-wide">Upgrade Store</h2>
                <span className="ml-auto text-xs text-gray-500 bg-gray-800 px-2 py-1 rounded-full">Standard Seating</span>
              </div>
              <div className="space-y-3">
                {UPGRADE_OPTIONS.filter((o) => o.type === "standard").map((option) => {
                  const blockReason = getPurchaseBlockReason(option, globalBudget, upgradeStatus.isUpgrading, club.capacity);
                  const isDisabled = blockReason !== null;
                  return (
                    <div key={option.id}
                      className={`flex items-center justify-between gap-3 rounded-xl px-4 py-3 border transition-all ${
                        isDisabled
                          ? "bg-gray-800/40 border-gray-700/50 opacity-60"
                          : "bg-gray-800 border-gray-700 hover:border-yellow-600/50"
                      }`}>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{option.label}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          <span className="text-yellow-500 font-bold">{formatEuro(option.cost)}</span>
                          {" · "}{option.rounds} matchweek(s)
                        </p>
                        {isDisabled && (
                          <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> {blockReason}
                          </p>
                        )}
                      </div>
                      <button type="button" disabled={isDisabled}
                        onClick={() => handlePurchaseUpgrade(option)}
                        className={`shrink-0 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-all ${
                          isDisabled
                            ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                            : "bg-yellow-500 hover:bg-yellow-400 text-gray-950 cursor-pointer shadow-[0_0_12px_rgba(234,179,8,0.3)] hover:shadow-[0_0_20px_rgba(234,179,8,0.5)]"
                        }`}>
                        Purchase
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* UPGRADE STORE — VIP */}
            <section className={`border rounded-2xl p-5 transition-all duration-300 ${
              vipLocked
                ? "bg-gray-900/50 border-gray-800 opacity-50"
                : "bg-gradient-to-br from-yellow-950/40 to-gray-900 border-yellow-700/40"
            }`}>
              <div className="flex items-center gap-2 mb-4">
                <Star className={`w-5 h-5 ${vipLocked ? "text-gray-500" : "text-yellow-500"}`} />
                <h2 className={`text-base font-bold uppercase tracking-wide ${vipLocked ? "text-gray-500" : "text-yellow-400"}`}>
                  VIP Suite Expansions
                </h2>
                {vipLocked
                  ? <span className="ml-auto flex items-center gap-1 text-xs text-red-400"><Lock className="w-3 h-3" /> Locked</span>
                  : <span className="ml-auto text-xs text-yellow-600 bg-yellow-900/40 px-2 py-1 rounded-full">Premium</span>
                }
              </div>
              {vipLocked ? (
                <div className="flex items-start gap-2 text-sm text-yellow-600 bg-yellow-900/20 border border-yellow-800/30 rounded-xl px-3 py-3">
                  <Lock className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>
                    VIP upgrades unlock at{" "}
                    <strong className="text-yellow-500">{VIP_CAPACITY_THRESHOLD.toLocaleString()}</strong> standard seats.
                    You have <strong className="text-white">{club.capacity.toLocaleString()}</strong>.
                  </span>
                </div>
              ) : (
                <div className="space-y-3">
                  {UPGRADE_OPTIONS.filter((o) => o.type === "vip").map((option) => {
                    const blockReason = getPurchaseBlockReason(option, globalBudget, upgradeStatus.isUpgrading, club.capacity);
                    const isDisabled = blockReason !== null;
                    return (
                      <div key={option.id}
                        className={`flex items-center justify-between gap-3 rounded-xl px-4 py-3 border transition-all ${
                          isDisabled
                            ? "bg-gray-800/40 border-gray-700/50 opacity-60"
                            : "bg-yellow-900/20 border-yellow-700/30 hover:border-yellow-500/60"
                        }`}>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-yellow-300 truncate">{option.label}</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            <span className="text-yellow-500 font-bold">{formatEuro(option.cost)}</span>
                            {" · "}{option.rounds} matchweek(s)
                          </p>
                          {isDisabled && (
                            <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" /> {blockReason}
                            </p>
                          )}
                        </div>
                        <button type="button" disabled={isDisabled}
                          onClick={() => handlePurchaseUpgrade(option)}
                          className={`shrink-0 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-all ${
                            isDisabled
                              ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                              : "bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 text-gray-950 cursor-pointer shadow-[0_0_16px_rgba(234,179,8,0.4)]"
                          }`}>
                          Purchase
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            RENTAL MARKET (only during construction)
        ══════════════════════════════════════════════════════════════════ */}
        {upgradeStatus.isUpgrading && (
          <section className="bg-gray-900 border border-gray-700 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="w-5 h-5 text-blue-400" />
              <h2 className="text-base font-bold text-white uppercase tracking-wide">Relocation &amp; Rental Market</h2>
              <span className="ml-auto text-xs text-blue-400 bg-blue-900/40 border border-blue-700/30 px-2 py-1 rounded-full">
                Temporary Venue Required
              </span>
            </div>
            <p className="text-sm text-gray-400 mb-4">
              Your stadium is under construction. Send rental offers to host home matches at another venue.
            </p>
            {lastOfferMessage && (
              <div className="mb-4 flex items-center gap-2 bg-emerald-900/30 border border-emerald-700/50 rounded-xl px-4 py-3 text-sm text-emerald-300">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{lastOfferMessage}</span>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {RENTAL_STADIUMS.map((stadium) => (
                <div key={stadium.id}
                  className="bg-gray-800 border border-gray-700 hover:border-blue-600/40 rounded-xl px-4 py-4 transition-all">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="text-sm font-bold text-white">{stadium.name}</p>
                      <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3" /> {stadium.city}
                      </p>
                    </div>
                    <span className="text-xs text-blue-300 bg-blue-900/30 border border-blue-700/30 px-2 py-1 rounded-full">
                      {stadium.rentalCapacity.toLocaleString()} seats
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <input
                      id={`offer-${stadium.id}`}
                      type="number" min={0} step={1000}
                      value={rentalOffers[stadium.id]}
                      onChange={(e) => handleRentalOfferChange(stadium.id, Number(e.target.value))}
                      placeholder="Offer (€)"
                      className="flex-1 min-w-0 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                    <button type="button" onClick={() => handleSendOffer(stadium)}
                      className="shrink-0 flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-3 py-2 rounded-lg transition-all cursor-pointer">
                      <Send className="w-3.5 h-3.5" /> Send
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          DEV TOOLBAR — fixed bottom, collapsed accordion
          NOTE: Budget/Capacity manual overrides REMOVED (now using real data).
          Only match simulation + instant construction remain.
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-800 bg-gray-950/95 backdrop-blur-sm shadow-[0_-4px_30px_rgba(0,0,0,0.5)]">
        <button type="button"
          onClick={() => setDevToolbarOpen((v) => !v)}
          className="w-full flex items-center justify-between px-6 py-2 text-xs text-gray-500 hover:text-gray-300 transition-colors">
          <span className="flex items-center gap-2 font-mono">
            <Zap className="w-3.5 h-3.5 text-yellow-600" />
            DEV TOOLBAR — Logic Testing Controls
          </span>
          {devToolbarOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </button>

        {devToolbarOpen && (
          <div className="px-6 pb-4 pt-2 border-t border-gray-800/50">
            <div className="flex flex-wrap gap-2">

              {/* Time simulation */}
              <button type="button" onClick={simulateMatchweek}
                className="flex items-center gap-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-xs text-white px-3 py-1.5 rounded-lg transition-all cursor-pointer">
                <Clock className="w-3.5 h-3.5 text-blue-400" />
                Simulate Matchweek
                {upgradeStatus.isUpgrading && (
                  <span className="text-amber-400">({upgradeStatus.roundsLeft} left)</span>
                )}
              </button>

              {upgradeStatus.isUpgrading && (
                <button type="button" onClick={devCompleteConstruction}
                  className="flex items-center gap-1.5 bg-amber-900/40 hover:bg-amber-800/60 border border-amber-700 text-xs text-amber-300 px-3 py-1.5 rounded-lg transition-all cursor-pointer">
                  <Zap className="w-3.5 h-3.5" /> Complete Construction
                </button>
              )}

              <span className="w-px bg-gray-700 self-stretch mx-1" />

              {/* Match results */}
              <button type="button" onClick={devAddWin}
                className="bg-emerald-900/40 hover:bg-emerald-800/60 border border-emerald-700/50 text-xs text-emerald-300 px-3 py-1.5 rounded-lg transition-all cursor-pointer">+W</button>
              <button type="button" onClick={devAddDraw}
                className="bg-yellow-900/40 hover:bg-yellow-800/60 border border-yellow-700/50 text-xs text-yellow-300 px-3 py-1.5 rounded-lg transition-all cursor-pointer">+D</button>
              <button type="button" onClick={devAddLoss}
                className="bg-red-900/40 hover:bg-red-800/60 border border-red-700/50 text-xs text-red-300 px-3 py-1.5 rounded-lg transition-all cursor-pointer">+L</button>

              <span className="w-px bg-gray-700 self-stretch mx-1" />

              {/* Live state readout — now shows real globalBudget */}
              <span className="text-xs text-gray-500 self-center font-mono">
                club={club.name} | cap={club.capacity.toLocaleString()} | budget={formatEuro(globalBudget)} | form={teamForm} | boycott={String(isBoycottActive)}
              </span>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
