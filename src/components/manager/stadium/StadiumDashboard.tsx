"use client";

import React, { useState, useMemo } from "react";
import {
  ShieldAlert,
  Flame,
  Crown,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  Building2,
  Users,
  Coins,
  Ticket,
  Sparkles,
  RefreshCw,
  Zap,
} from "lucide-react";

export interface StadiumDashboardProps {
  initialStandardPrice?: number;
  initialVipPrice?: number;
  initialTeamForm?: number;
}

export default function StadiumDashboard({
  initialStandardPrice = 15,
  initialVipPrice = 150,
  initialTeamForm = 5,
}: StadiumDashboardProps) {
  // ── 1. STATE MANAGEMENT ───────────────────────────────────────────────────
  const [standardPrice, setStandardPrice] = useState<number>(initialStandardPrice);
  const [vipPrice, setVipPrice] = useState<number>(initialVipPrice);
  const [teamForm, setTeamForm] = useState<number>(initialTeamForm); // 1 to 10

  // Venue Constants (Stade Mohammed V - Casablanca)
  const totalCapacity = 45891;
  const vipCapacity = Math.floor(totalCapacity * 0.05); // 2,294 VIP seats (5%)
  const standardCapacity = totalCapacity - vipCapacity; // 43,597 Standard seats (95%)
  const OPERATING_COST = 70000; // Fixed high cost for a 45k arena (€70,000)

  // ── 2. DERIVED MOCK ECONOMY ENGINE ────────────────────────────────────────
  const economy = useMemo(() => {
    // BOYCOTT RULE: Terrible form (< 4) AND aggressive standard ticket price (> 30€)
    const isBoycotting = teamForm < 4 && standardPrice > 30;

    // Standard Attendance (Price Elasticity: High sensitivity to price surges)
    let standardAttendance = 0;
    if (!isBoycotting) {
      const formFactor = teamForm <= 5 ? 0.3 + (teamForm / 5) * 0.6 : 0.9 + ((teamForm - 5) / 5) * 0.45;
      const priceRatio = 15 / Math.max(1, standardPrice);
      const elasticity = Math.pow(priceRatio, 1.45); // Elasticity ~1.45
      const projected = Math.round(standardCapacity * 0.78 * formFactor * elasticity);
      standardAttendance = Math.min(standardCapacity, Math.max(0, projected));
    }

    // VIP Attendance ("Glory Hunters" Dynamic: Inelastic, driven heavily by team form/hype)
    const vipFormFactor = Math.pow(teamForm / 10, 1.85); // Needs good form to fill VIP boxes
    const vipPriceRatio = 150 / Math.max(1, vipPrice);
    const vipElasticity = Math.pow(vipPriceRatio, 0.55); // Inelastic: VIPs tolerate high prices
    const rawVipDemand = Math.round(vipCapacity * (0.45 + vipFormFactor * 0.75) * vipElasticity);
    const vipAttendance = Math.min(vipCapacity, Math.max(0, rawVipDemand));

    // Financial Ledger
    const standardRevenue = standardAttendance * standardPrice;
    const vipRevenue = vipAttendance * vipPrice;
    const grossRevenue = standardRevenue + vipRevenue;
    const netProfit = grossRevenue - OPERATING_COST;
    const isProfitable = netProfit >= 0;

    // Stadium Occupancy
    const totalAttendance = standardAttendance + vipAttendance;
    const occupancyPercent = Number(((totalAttendance / totalCapacity) * 100).toFixed(1));

    // The Big Stadium Trap Detection: High overhead exceeds revenue due to low turnout
    const isBigStadiumTrap = totalCapacity >= 40000 && (!isProfitable || occupancyPercent < 35);

    // Break-even attendance needed
    const breakEvenStandardAttendance = Math.max(
      0,
      Math.ceil((OPERATING_COST - vipRevenue) / Math.max(1, standardPrice))
    );

    return {
      isBoycotting,
      standardCapacity,
      vipCapacity,
      standardAttendance,
      vipAttendance,
      totalAttendance,
      occupancyPercent,
      standardRevenue,
      vipRevenue,
      grossRevenue,
      operatingCost: OPERATING_COST,
      netProfit,
      isProfitable,
      isBigStadiumTrap,
      breakEvenStandardAttendance,
    };
  }, [standardPrice, vipPrice, teamForm, standardCapacity, vipCapacity, totalCapacity]);

  // Quick Preset Handlers for Instant Testing
  const handleTriggerBoycott = () => {
    setTeamForm(2);
    setStandardPrice(35);
  };

  const handleOptimalDerby = () => {
    setTeamForm(9);
    setStandardPrice(22);
    setVipPrice(220);
  };

  const handleReset = () => {
    setStandardPrice(15);
    setVipPrice(150);
    setTeamForm(5);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-4 md:p-6 lg:p-8 font-sans selection:bg-yellow-500 selection:text-black">
      {/* Subtle Moroccan Geometric Watermark Header Glow */}
      <div className="max-w-7xl mx-auto space-y-6">
        {/* ── TOP HEADER ───────────────────────────────────────────────────── */}
        <header className="relative bg-gray-900 border border-gray-800 rounded-2xl p-5 md:p-6 shadow-2xl overflow-hidden">
          {/* Moroccan Arabesque / Gold Accent Top Border */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-yellow-500 to-transparent" />

          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            {/* Stadium Info & Title */}
            <div>
              <div className="flex items-center gap-3">
                <span className="p-2 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-yellow-500">
                  <Building2 className="w-6 h-6" />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl md:text-2xl font-black tracking-wide text-white">
                      Stade Mohammed V
                    </h1>
                    <span className="text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">
                      دونور Casablancais
                    </span>
                  </div>
                  <p className="text-sm text-gray-400 mt-0.5">
                    Total Capacity:{" "}
                    <span className="font-semibold text-gray-200">
                      {totalCapacity.toLocaleString()}
                    </span>{" "}
                    Seats (Standard 95% / VIP 5%)
                  </p>
                </div>
              </div>
            </div>

            {/* Interactive Team Form Controller & Preset Quick-Actions */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 bg-gray-950/70 p-3.5 rounded-xl border border-gray-800">
              {/* Form Slider & Rating */}
              <div className="flex items-center gap-3 min-w-[220px]">
                <div className="text-left">
                  <div className="text-xs text-gray-400 font-medium flex items-center gap-1">
                    <Flame
                      className={`w-3.5 h-3.5 ${
                        teamForm >= 7
                          ? "text-green-400"
                          : teamForm <= 3
                          ? "text-red-400 animate-pulse"
                          : "text-yellow-500"
                      }`}
                    />
                    Team Form:
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span
                      className={`text-xl font-black ${
                        teamForm >= 7
                          ? "text-green-400"
                          : teamForm <= 3
                          ? "text-red-500"
                          : "text-yellow-500"
                      }`}
                    >
                      {teamForm}
                    </span>
                    <span className="text-xs text-gray-500">/ 10</span>
                  </div>
                </div>

                <div className="flex-1">
                  <input
                    type="range"
                    min={1}
                    max={10}
                    value={teamForm}
                    onChange={(e) => setTeamForm(Number(e.target.value))}
                    className="w-full accent-yellow-500 cursor-pointer h-2 bg-gray-800 rounded-lg"
                  />
                  <div className="flex justify-between text-[10px] text-gray-500 mt-1 font-mono">
                    <span>1 (Slump)</span>
                    <span>5</span>
                    <span>10 (Streak)</span>
                  </div>
                </div>
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex items-center gap-2 border-t sm:border-t-0 sm:border-l border-gray-800 pt-2 sm:pt-0 sm:pl-4">
                <button
                  onClick={handleTriggerBoycott}
                  title="Form 2 + Standard Ticket €35 to trigger the Ultras boycott"
                  className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-red-950/60 text-red-400 hover:bg-red-900/60 border border-red-800/60 transition flex items-center gap-1.5"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Test Boycott
                </button>
                <button
                  onClick={handleOptimalDerby}
                  title="High Form + Derby Pricing"
                  className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20 border border-yellow-500/30 transition flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Derby Mode
                </button>
                <button
                  onClick={handleReset}
                  title="Reset to default settings"
                  className="p-1.5 rounded-lg text-xs text-gray-400 hover:text-gray-200 bg-gray-800/80 hover:bg-gray-700 transition"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* ── MIDDLE SECTION: THE SPLIT (CURVA VS PRESTIGE) ────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ═════════════════════════════════════════════════════════════════ */}
          {/* LEFT SIDE: THE CURVA / VIRAGE POPULAIRE (95% SEATS)               */}
          {/* ═════════════════════════════════════════════════════════════════ */}
          <div
            className={`relative rounded-2xl border transition-all duration-500 overflow-hidden flex flex-col justify-between ${
              economy.isBoycotting
                ? "bg-black border-red-600 shadow-[0_0_35px_rgba(239,68,68,0.35)]"
                : "bg-gray-900 border-gray-800 hover:border-gray-700 shadow-xl"
            }`}
          >
            {/* Header Ribbon */}
            <div
              className={`p-5 border-b flex items-center justify-between transition-colors ${
                economy.isBoycotting
                  ? "bg-red-950/60 border-red-800/70"
                  : "bg-gray-900/90 border-gray-800"
              }`}
            >
              <div className="flex items-center gap-3">
                <span
                  className={`p-2 rounded-xl transition-colors ${
                    economy.isBoycotting
                      ? "bg-red-600 text-white animate-bounce"
                      : "bg-gray-800 text-yellow-500"
                  }`}
                >
                  <Users className="w-5 h-5" />
                </span>
                <div>
                  <h2 className="text-lg font-black tracking-wide text-white flex items-center gap-2">
                    المدرجات الشعبية • The Curva
                    {economy.isBoycotting && (
                      <span className="text-xs bg-red-600 text-white font-black px-2 py-0.5 rounded uppercase tracking-wider animate-pulse">
                        Boycott Active
                      </span>
                    )}
                  </h2>
                  <p className="text-xs text-gray-400">
                    Standard Seats: {standardCapacity.toLocaleString()} (95% Allotment)
                  </p>
                </div>
              </div>

              {/* Fan Mood Tag */}
              <div className="text-right">
                <span
                  className={`text-xs px-2.5 py-1 rounded-full font-bold inline-flex items-center gap-1.5 ${
                    economy.isBoycotting
                      ? "bg-red-600/20 text-red-400 border border-red-500/40"
                      : teamForm >= 7
                      ? "bg-green-500/10 text-green-400 border border-green-500/20"
                      : teamForm <= 3
                      ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
                      : "bg-gray-800 text-gray-300"
                  }`}
                >
                  <Flame className="w-3 h-3" />
                  {economy.isBoycotting
                    ? "مقاطعة شاملة"
                    : teamForm >= 7
                    ? "الفيراج شاعل (Euphoric)"
                    : teamForm <= 3
                    ? "غليان وتوتر (Tense)"
                    : "حضور معتدل"}
                </span>
              </div>
            </div>

            {/* Card Body */}
            <div className="p-6 space-y-6 flex-1 relative">
              {/* ⚠️ THE BOYCOTT DRAMA OVERLAY */}
              {economy.isBoycotting && (
                <div className="absolute inset-0 z-20 bg-gradient-to-b from-black/95 via-black/90 to-red-950/95 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in-95 duration-300">
                  <div className="w-16 h-16 rounded-full bg-red-600/20 border-2 border-red-500 flex items-center justify-center text-red-500 mb-4 shadow-[0_0_20px_rgba(239,68,68,0.5)]">
                    <ShieldAlert className="w-9 h-9 animate-pulse" />
                  </div>

                  <span className="text-xs font-mono font-bold uppercase tracking-widest text-red-400 bg-red-950/80 px-3 py-1 rounded-full border border-red-800 mb-2">
                    ⚠️ بيان الألتراس الرسمي • COMMUNIQUÉ
                  </span>

                  <h3 className="text-xl md:text-2xl font-black text-white max-w-md leading-snug dir-rtl font-serif">
                    &ldquo;بيان الكورفا: نتائج كارثية، وإدارة جشعة.. نعلن مقاطعة
                    المباراة!&rdquo;
                  </h3>

                  <p className="text-xs text-red-300/80 mt-3 max-w-sm">
                    The Curva has boycotted matchday. Standard seat attendance has collapsed to{" "}
                    <span className="font-bold text-white underline">0</span>. Lower ticket
                    prices or restore winning form to reconcile.
                  </p>

                  <div className="mt-5 flex gap-2">
                    <button
                      onClick={() => setStandardPrice(20)}
                      className="px-3 py-1.5 bg-gray-900 text-yellow-400 hover:bg-gray-800 border border-yellow-500/40 rounded-lg text-xs font-bold transition flex items-center gap-1.5"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      Lower Price to €20
                    </button>
                    <button
                      onClick={() => setTeamForm(5)}
                      className="px-3 py-1.5 bg-red-950 text-red-200 hover:bg-red-900 border border-red-700 rounded-lg text-xs font-bold transition"
                    >
                      Restore Form (5)
                    </button>
                  </div>
                </div>
              )}

              {/* Slider for Standard Ticket Pricing */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-gray-300 flex items-center gap-1.5">
                    <Ticket className="w-4 h-4 text-yellow-500" />
                    Standard Ticket Price
                  </label>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-black text-yellow-500">
                      €{standardPrice}
                    </span>
                    <span className="text-xs text-gray-400 font-mono">
                      (~{standardPrice * 10} MAD)
                    </span>
                  </div>
                </div>

                <input
                  type="range"
                  min={5}
                  max={50}
                  step={1}
                  value={standardPrice}
                  onChange={(e) => setStandardPrice(Number(e.target.value))}
                  className="w-full accent-yellow-500 cursor-pointer h-2.5 bg-gray-800 rounded-lg"
                />

                <div className="flex justify-between text-xs text-gray-500 font-mono">
                  <span>€5 (Cheap)</span>
                  <span className="text-gray-400">Benchmark: €12-€15</span>
                  <span className="text-red-400">€30+ (Boycott Risk)</span>
                </div>
              </div>

              {/* Attendance & Occupancy Readouts */}
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="p-4 bg-gray-950/80 rounded-xl border border-gray-800">
                  <div className="text-xs text-gray-400 font-medium">Expected Fans</div>
                  <div
                    className={`text-2xl font-black mt-1 ${
                      economy.isBoycotting
                        ? "text-red-500 line-through"
                        : "text-white"
                    }`}
                  >
                    {economy.standardAttendance.toLocaleString()}
                  </div>
                  <div className="text-[11px] text-gray-500 mt-0.5">
                    of {standardCapacity.toLocaleString()} seats
                  </div>
                </div>

                <div className="p-4 bg-gray-950/80 rounded-xl border border-gray-800">
                  <div className="text-xs text-gray-400 font-medium">Standard Revenue</div>
                  <div
                    className={`text-2xl font-black mt-1 ${
                      economy.isBoycotting ? "text-red-500" : "text-yellow-500"
                    }`}
                  >
                    €{economy.standardRevenue.toLocaleString()}
                  </div>
                  <div className="text-[11px] text-gray-500 mt-0.5">
                    Elasticity: Sensitive (1.45)
                  </div>
                </div>
              </div>

              {/* Attendance Progress Bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">Curva Fill Level</span>
                  <span className="font-bold text-gray-200">
                    {economy.isBoycotting
                      ? "0%"
                      : `${(
                          (economy.standardAttendance / standardCapacity) *
                          100
                        ).toFixed(1)}%`}
                  </span>
                </div>
                <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      economy.isBoycotting
                        ? "w-0"
                        : "bg-gradient-to-r from-yellow-600 to-yellow-400"
                    }`}
                    style={{
                      width: economy.isBoycotting
                        ? "0%"
                        : `${Math.min(
                            100,
                            (economy.standardAttendance / standardCapacity) * 100
                          )}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Bottom Footer Note */}
            <div className="p-4 bg-gray-950/50 border-t border-gray-800 text-xs text-gray-400 flex items-center justify-between">
              <span>Ultras Reaction System</span>
              <span className="text-gray-500 font-mono text-[11px]">
                Trigger: Form &lt; 4 &amp; Price &gt; €30
              </span>
            </div>
          </div>

          {/* ═════════════════════════════════════════════════════════════════ */}
          {/* RIGHT SIDE: THE VIP / PRESTIGE & GLORY SUITES (5% SEATS)          */}
          {/* ═════════════════════════════════════════════════════════════════ */}
          <div className="rounded-2xl border border-gray-800 bg-gray-900 shadow-xl overflow-hidden flex flex-col justify-between hover:border-gray-700 transition">
            {/* Header Ribbon */}
            <div className="p-5 border-b border-gray-800 bg-gray-900/90 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="p-2 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-yellow-500">
                  <Crown className="w-5 h-5" />
                </span>
                <div>
                  <h2 className="text-lg font-black tracking-wide text-white flex items-center gap-2">
                    المنصة ومقصورات الـ VIP
                    <span className="text-xs bg-yellow-500/10 text-yellow-400 font-bold px-2 py-0.5 rounded border border-yellow-500/20">
                      Corporate
                    </span>
                  </h2>
                  <p className="text-xs text-gray-400">
                    VIP Suites: {vipCapacity.toLocaleString()} (5% Allotment)
                  </p>
                </div>
              </div>

              {/* Glory Hype Meter */}
              <div className="text-right">
                <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 inline-flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3" />
                  {teamForm >= 8
                    ? "Glory Hunters Hype: MAX"
                    : teamForm >= 5
                    ? "Prestige: Stable"
                    : "Low Prestige Slump"}
                </span>
              </div>
            </div>

            {/* Card Body */}
            <div className="p-6 space-y-6 flex-1">
              {/* Slider for VIP Ticket Pricing */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-gray-300 flex items-center gap-1.5">
                    <Crown className="w-4 h-4 text-yellow-500" />
                    VIP Suite Ticket Price
                  </label>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-black text-yellow-500">
                      €{vipPrice}
                    </span>
                    <span className="text-xs text-gray-400 font-mono">
                      (~{vipPrice * 10} MAD)
                    </span>
                  </div>
                </div>

                <input
                  type="range"
                  min={50}
                  max={400}
                  step={10}
                  value={vipPrice}
                  onChange={(e) => setVipPrice(Number(e.target.value))}
                  className="w-full accent-yellow-500 cursor-pointer h-2.5 bg-gray-800 rounded-lg"
                />

                <div className="flex justify-between text-xs text-gray-500 font-mono">
                  <span>€50</span>
                  <span className="text-gray-400">Benchmark: €120 - €160</span>
                  <span className="text-yellow-500">€400 (Ultra Luxury)</span>
                </div>
              </div>

              {/* Attendance & Occupancy Readouts */}
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="p-4 bg-gray-950/80 rounded-xl border border-gray-800">
                  <div className="text-xs text-gray-400 font-medium">VIP Guests</div>
                  <div className="text-2xl font-black text-white mt-1">
                    {economy.vipAttendance.toLocaleString()}
                  </div>
                  <div className="text-[11px] text-gray-500 mt-0.5">
                    of {vipCapacity.toLocaleString()} suites
                  </div>
                </div>

                <div className="p-4 bg-gray-950/80 rounded-xl border border-gray-800">
                  <div className="text-xs text-gray-400 font-medium">VIP Revenue</div>
                  <div className="text-2xl font-black text-yellow-500 mt-1">
                    €{economy.vipRevenue.toLocaleString()}
                  </div>
                  <div className="text-[11px] text-gray-500 mt-0.5">
                    Inelastic: Driven by Hype
                  </div>
                </div>
              </div>

              {/* VIP Attendance Progress Bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">VIP Suites Occupancy</span>
                  <span className="font-bold text-yellow-500">
                    {((economy.vipAttendance / vipCapacity) * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-yellow-500 to-amber-300 transition-all duration-300"
                    style={{
                      width: `${Math.min(
                        100,
                        (economy.vipAttendance / vipCapacity) * 100
                      )}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Bottom Footer Note */}
            <div className="p-4 bg-gray-950/50 border-t border-gray-800 text-xs text-gray-400 flex items-center justify-between">
              <span>Immune to Ultras Boycotts</span>
              <span className="text-yellow-500/80 font-mono text-[11px]">
                High Margin / High Status
              </span>
            </div>
          </div>
        </div>

        {/* ── BOTTOM SECTION: THE LEDGER & BIG STADIUM TRAP ────────────────── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs uppercase tracking-widest font-mono text-gray-400 font-bold flex items-center gap-2">
              <Coins className="w-4 h-4 text-yellow-500" />
              Municipal Matchday Ledger &amp; Cashflow
            </h3>
            {economy.isBigStadiumTrap && (
              <span className="text-xs font-bold text-red-400 bg-red-950/80 px-2.5 py-0.5 rounded-full border border-red-800/80 flex items-center gap-1.5 animate-pulse">
                <AlertTriangle className="w-3 h-3 text-red-500" />
                Warning: The Big Stadium Trap Active
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* 1. GROSS REVENUE */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 shadow-xl relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400 font-bold tracking-wider uppercase">
                  Gross Revenue
                </span>
                <span className="p-2 rounded-xl bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">
                  <Coins className="w-5 h-5" />
                </span>
              </div>

              <div className="text-3xl font-black text-white mt-3">
                €{economy.grossRevenue.toLocaleString()}
              </div>

              <div className="flex items-center justify-between mt-3 text-xs border-t border-gray-800/80 pt-2.5 text-gray-400 font-mono">
                <span>Std: €{economy.standardRevenue.toLocaleString()}</span>
                <span>VIP: €{economy.vipRevenue.toLocaleString()}</span>
              </div>
            </div>

            {/* 2. OPERATING COSTS (Fixed High Overhead) */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 shadow-xl relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs text-red-400 font-bold tracking-wider uppercase flex items-center gap-1.5">
                  Operating Overhead
                </span>
                <span className="p-2 rounded-xl bg-red-950/60 text-red-400 border border-red-800/40">
                  <TrendingDown className="w-5 h-5" />
                </span>
              </div>

              <div className="text-3xl font-black text-red-400 mt-3">
                -€{economy.operatingCost.toLocaleString()}
              </div>

              <div className="mt-3 text-xs border-t border-gray-800/80 pt-2.5 text-gray-500">
                Security, floodlights, municipal lease &amp; turf maintenance
              </div>
            </div>

            {/* 3. NET PROFIT (THE BIG STADIUM TRAP GAUNTLET) */}
            <div
              className={`rounded-2xl p-5 shadow-2xl relative overflow-hidden transition-all duration-300 border ${
                economy.isProfitable
                  ? "bg-gradient-to-b from-gray-900 to-gray-900/90 border-green-500/40 shadow-[0_0_20px_rgba(34,197,94,0.15)]"
                  : "bg-gradient-to-b from-red-950/40 via-gray-900 to-black border-red-500/80 shadow-[0_0_30px_rgba(239,68,68,0.3)]"
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-xs font-bold tracking-wider uppercase flex items-center gap-1 ${
                    economy.isProfitable ? "text-green-400" : "text-red-400"
                  }`}
                >
                  Net Matchday Profit
                </span>
                <span
                  className={`p-2 rounded-xl border ${
                    economy.isProfitable
                      ? "bg-green-500/10 text-green-400 border-green-500/30"
                      : "bg-red-600/20 text-red-500 border-red-500/50 animate-pulse"
                  }`}
                >
                  {economy.isProfitable ? (
                    <TrendingUp className="w-5 h-5" />
                  ) : (
                    <ShieldAlert className="w-5 h-5" />
                  )}
                </span>
              </div>

              <div
                className={`text-3xl font-black mt-3 ${
                  economy.isProfitable ? "text-green-400" : "text-red-500"
                }`}
              >
                {economy.netProfit >= 0 ? "+" : ""}€
                {economy.netProfit.toLocaleString()}
              </div>

              <div className="mt-3 text-xs border-t border-gray-800/80 pt-2.5 flex items-center justify-between">
                {economy.isProfitable ? (
                  <span className="text-green-400 font-semibold flex items-center gap-1">
                    ✓ Profitable Matchday (+{economy.occupancyPercent}% Occupancy)
                  </span>
                ) : (
                  <span className="text-red-400 font-bold flex items-center gap-1">
                    ⚠️ Deficit! Break-Even requires {economy.breakEvenStandardAttendance.toLocaleString()} Fans
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
