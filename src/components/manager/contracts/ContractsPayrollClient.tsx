"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import type { ContractDemands } from "@/lib/services/botola-contract-service";

const BotolaContractRoom3D = dynamic(
  () => import("./BotolaContractRoom3D").then((m) => m.BotolaContractRoom3D),
  { ssr: false }
);

interface Player {
  id: string;
  fullName: string;
  overallRating: number | null;
  position: string;
  photo: string | null;
  nationality: string;
  realClub: string;
  marketValue: number | null;
  seasonSalary: number;
  primeSignature: number;
  contractSeasonsLeft: number;
  squadRole: string;
  releaseClause: number | null;
  contractSatisfaction: number;
  lastNegotiatedAt: string | null;
  awaitsAdmin?: boolean;
}

interface Props {
  squad: Player[];
  pendingSignings?: Player[];
  clubId: string;
  clubName: string;
  clubBudget: number;
}

const ROLE_LABELS: Record<string, string> = {
  CRUCIAL:   "🌟 نجم أول",
  IMPORTANT: "⚽ أساسي",
  ROTATION:  "🔄 مداورة",
  BACKUP:    "🛡️ احتياطي",
  PROSPECT:  "🐣 موهبة",
};

const SATISFACTION_COLOR = (n: number) =>
  n >= 80 ? "#34d399" : n >= 55 ? "#fbbf24" : "#f87171";

export function ContractsPayrollClient({
  squad,
  pendingSignings = [],
  clubId,
  clubName,
  clubBudget,
}: Props) {
  const [players, setPlayers] = useState(squad);
  const [pendingList, setPendingList] = useState(pendingSignings);
  const [budget, setBudget] = useState(clubBudget);
  const [activePlayer, setActivePlayer] = useState<Player | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [negotiationData, setNegotiationData] = useState<{
    demands: ContractDemands;
    clubBudget: number;
  } | null>(null);

  useEffect(() => {
    setPlayers(squad);
  }, [squad]);

  useEffect(() => {
    setPendingList(pendingSignings);
  }, [pendingSignings]);

  useEffect(() => {
    setBudget(clubBudget);
  }, [clubBudget]);

  const displayedPendingList = pendingList.filter(
    (p) => !players.some((sq) => sq.id === p.id)
  );

  // Foreign Player Quota: max 5 non-Moroccan players
  function isMoroccan(nat: string | null | undefined): boolean {
    if (!nat) return false;
    const n = nat.trim().toLowerCase();
    return n.includes("moroc") || n.includes("maroc") || n === "ma" || n.includes("مغرب");
  }

  const foreignPlayersCount = players.filter((p) => !isMoroccan(p.nationality)).length;

  // Termination modal state
  const [terminatingPlayer, setTerminatingPlayer] = useState<Player | null>(null);
  const [terminationDetails, setTerminationDetails] = useState<{
    playerId: string;
    playerName: string;
    position: string;
    nationality: string;
    isForeign: boolean;
    annualSalary: number;
    seasonsLeft: number;
    totalRemainingContractValue: number;
    goals: number;
    severancePercentage: number;
    requestedSeverance: number;
    reasonText: string;
    minAcceptableSeverance: number;
  } | null>(null);
  const [severanceOffer, setSeveranceOffer] = useState<number>(0);
  const [submittingTermination, setSubmittingTermination] = useState(false);

  async function openTerminationModal(player: Player) {
    setLoadingId(player.id);
    try {
      const res = await fetch(`/api/manager/players/${player.id}/contract/release`);
      const data = await res.json();
      if (!res.ok || !data.details) {
        alert(data.error || "تعذر تحميل بيانات فسخ العقد.");
        return;
      }
      setTerminatingPlayer(player);
      setTerminationDetails(data.details);
      setSeveranceOffer(data.details.requestedSeverance);
    } catch {
      alert("حدث خطأ أثناء تحميل تفاصيل فسخ العقد.");
    } finally {
      setLoadingId(null);
    }
  }

  async function handleConfirmTermination() {
    if (!terminatingPlayer || !terminationDetails) return;
    if (severanceOffer < terminationDetails.minAcceptableSeverance) {
      alert("الوكيل يرفض هذا العرض ويعتبره مجحفاً. يرجى تقديم عرض أعلى للتوصل لاتفاق ودي.");
      return;
    }
    if (severanceOffer > budget) {
      alert("ميزانية النادي لا تكفي لدفع مبلغ التعويض المقترح.");
      return;
    }

    setSubmittingTermination(true);
    try {
      const res = await fetch(`/api/manager/players/${terminatingPlayer.id}/contract/release`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ severanceAmount: severanceOffer }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert(data.message || "تم فسخ العقد بنجاح.");
        setPlayers((prev) => prev.filter((p) => p.id !== terminatingPlayer.id));
        setBudget(data.clubBudgetAfter);
        setTerminatingPlayer(null);
        setTerminationDetails(null);
      } else {
        alert(data.error || "فشل تنفيذ فسخ العقد.");
      }
    } catch {
      alert("حدث خطأ أثناء تنفيذ فسخ العقد.");
    } finally {
      setSubmittingTermination(false);
    }
  }

  // Pre-warm 3D models in browser cache in the background
  useEffect(() => {
    const models = [
      "/models/agent_sitting_talking.glb",
      "/models/player_1.glb",
      "/models/player_2.glb",
    ];
    models.forEach((url) => {
      fetch(url).catch(() => {});
    });
  }, []);

  // Format currency
  function fmt(n: number) {
    return new Intl.NumberFormat("fr-MA", { maximumFractionDigits: 0 }).format(n) + " €";
  }

  // Total payroll this season
  const totalSalary = players.reduce((sum, p) => sum + p.seasonSalary, 0);
  const totalPrime  = players.reduce((sum, p) => sum + p.primeSignature, 0);
  const urgent      = players.filter(p => p.contractSatisfaction < 60 || p.contractSeasonsLeft <= 0).length;

  // Open the 3D negotiation room
  async function openNegotiations(player: Player) {
    setLoadingId(player.id);
    try {
      const res = await fetch(`/api/manager/players/${player.id}/contract`);
      const data = await res.json();
      if (!res.ok || !data.demands) {
        console.error("Failed to load contract demands:", data);
        alert(data.error || "تعذر تحميل بيانات عقد اللاعب. يرجى المحاولة مرة أخرى.");
        return;
      }
      setNegotiationData({ demands: data.demands, clubBudget: data.clubBudget });
      setActivePlayer(data.player ?? player);
    } catch (err) {
      console.error("Contract negotiation error:", err);
      alert("حدث خطأ أثناء الاتصال بغرفة المفاوضات.");
    } finally {
      setLoadingId(null);
    }
  }

  // After signing, update local state
  function handleSigned(contract: { primeSignature: number; seasonSalary: number; clubBudgetAfter: number; awaitsAdmin?: boolean }) {
    if (!activePlayer) return;

    // Check if this was a pending new signing
    const isPending = pendingList.some(p => p.id === activePlayer.id);

    if (isPending) {
      if (contract.awaitsAdmin) {
        // Contract agreed in 3D -> now awaiting Admin final ratification!
        setPendingList(prev =>
          prev.map(p =>
            p.id === activePlayer.id
              ? { ...p, awaitsAdmin: true, primeSignature: contract.primeSignature, seasonSalary: contract.seasonSalary }
              : p
          )
        );
      } else {
        // Remove from pending signings and ADD to registered squad
        setPendingList(prev => prev.filter(p => p.id !== activePlayer.id));
        const newlySignedPlayer: Player = {
          ...activePlayer,
          primeSignature: contract.primeSignature,
          seasonSalary: contract.seasonSalary,
          contractSatisfaction: 100,
          contractSeasonsLeft: Math.max(1, activePlayer.contractSeasonsLeft),
        };
        setPlayers(prev => [newlySignedPlayer, ...prev]);
      }
    } else {
      // Update existing squad player renewal
      setPlayers(prev =>
        prev.map(p =>
          p.id === activePlayer.id
            ? { ...p, primeSignature: contract.primeSignature, seasonSalary: contract.seasonSalary, contractSatisfaction: 100 }
            : p
        )
      );
    }

    setBudget(contract.clubBudgetAfter);
    setActivePlayer(null);
    setNegotiationData(null);
  }

  // Handle deal collapse and refund
  function handleCollapsed(playerId: string, clubBudgetAfter: number) {
    setPendingList(prev => prev.filter(p => p.id !== playerId));
    setBudget(clubBudgetAfter);
    setActivePlayer(null);
    setNegotiationData(null);
  }

  return (
    <div className="min-h-screen text-white" dir="rtl">

      {/* ── Header ── */}
      <div className="relative overflow-hidden rounded-2xl mb-8 p-6 md:p-8" style={{
        background: "linear-gradient(135deg, rgba(20,16,8,0.98) 0%, rgba(12,10,4,0.98) 100%)",
        border: "1px solid rgba(212,175,55,0.2)",
        boxShadow: "0 20px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(212,175,55,0.1)",
      }}>
        {/* BG pattern */}
        <div className="absolute inset-0 opacity-5" style={{
          backgroundImage: "repeating-linear-gradient(45deg, rgba(212,175,55,0.4) 0, rgba(212,175,55,0.4) 1px, transparent 0, transparent 50%)",
          backgroundSize: "20px 20px",
        }} />

        <div className="relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-widest text-pmb-gold/50 mb-1">🏆 البطولة الاحترافية المغربية</p>
              <h1 className="text-2xl md:text-3xl font-black text-white">العقود والرواتب</h1>
              <p className="text-gray-400 text-sm mt-1">{clubName} · إدارة عقود اللاعبين وتفاوض شروطها</p>
            </div>
            <div className="flex flex-col sm:flex-row items-end gap-3">
              <Link
                href="/manager/free-agents"
                className="px-3.5 py-2 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30 text-xs font-black transition flex items-center gap-1.5 shadow"
              >
                <span>🆓</span>
                <span>سوق اللاعبين الأحرار (0 €)</span>
              </Link>
              <div className="flex flex-col items-end gap-1">
                <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">ميزانية النادي المتاحة</p>
                <p className="text-2xl font-black text-pmb-gold">{fmt(budget)}</p>
              </div>
            </div>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
            <KPICard label="إجمالي الرواتب السنوية" value={fmt(totalSalary)} icon="📅" />
            <KPICard label="إجمالي منح التوقيع" value={fmt(totalPrime)} icon="💰" />
            <KPICard label="لاعبو التشكيلة الرسمية" value={`${players.length} لاعب`} icon="👥" />
            <KPICard label="عقود تحتاج تجديد" value={`${urgent} حالة`} icon="⚠️" warn={urgent > 0} />
          </div>

          {/* Urgent Expired Contracts Alert Banner */}
          {urgent > 0 && (
            <div className="mt-4 p-3.5 rounded-xl border border-amber-500/40 bg-amber-500/10 backdrop-blur flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">⚠️</span>
                <div>
                  <h5 className="text-xs font-black text-amber-300">
                    تنبيه: يوجد {urgent} لاعبين أوشكت أو انتهت عقودهم!
                  </h5>
                  <p className="text-[11px] text-gray-300 mt-0.5">
                    اللاعب الذي ينتهي عقده (0 مواسم) دون تجديد يتم سحبه تلقائياً ونقله إلى عهدة الإدارة (Admin Custody) لطرحه في المزاد أو سوق الأحرار.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Botola Pro FRMF Foreign Player Quota Bar */}
          <div
            className="mt-4 p-4 rounded-xl border bg-black/40 backdrop-blur flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
            style={{ borderColor: foreignPlayersCount >= 5 ? "rgba(239, 68, 68, 0.4)" : "rgba(212, 175, 55, 0.3)" }}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">🌍</span>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-black text-white">كوتة اللاعبين الأجانب في البطولة (FRMF Quota)</h4>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                    foreignPlayersCount >= 5 ? "bg-red-600 text-white" : "bg-emerald-600/30 text-emerald-300 border border-emerald-500/30"
                  }`}>
                    {foreignPlayersCount >= 5 ? "⚠️ الحد الأقصى (مكتمل)" : "✅ قانوني"}
                  </span>
                </div>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  تسمح لوائح الجامعة بـ 5 لاعبين أجانب (غير مغاربة) كحد أقصى لكل فريق.
                  {foreignPlayersCount >= 5
                    ? " تم استيفاء الكوتة بالكامل (5/5). لا يمكن تسجيل أي أجنبي جديد إلا بعد فسخ عقد أو بيع لاعب أجنبي."
                    : ` متاح لك تسجيل ${5 - foreignPlayersCount} لاعبين أجانب إضافيين في التشكيلة.`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 self-end sm:self-center">
              <div className="w-28 h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${(foreignPlayersCount / 5) * 100}%`,
                    background: foreignPlayersCount >= 5 ? "#ef4444" : "#10b981",
                  }}
                />
              </div>
              <span className="text-sm font-black">
                <span className={foreignPlayersCount >= 5 ? "text-red-400" : "text-emerald-400"}>{foreignPlayersCount}</span>
                <span className="text-gray-500"> / 5</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          🚨 PENDING SIGNINGS SECTION (NEW SIGNINGS AWAITING CONTRACT)
      ══════════════════════════════════════════════════════════════ */}
      {displayedPendingList.length > 0 && (
        <div className="mb-8 rounded-2xl bg-gradient-to-r from-amber-500/20 via-pmb-gold/15 to-amber-500/10 border border-pmb-gold/40 p-5 backdrop-blur-md shadow-[0_0_30px_rgba(212,175,55,0.2)] animate-pulse-slow">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-pmb-gold text-black flex items-center justify-center text-xl font-black shadow-lg">
                ✍️
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md bg-pmb-gold text-black text-[10px] font-black tracking-wider uppercase">
                    صفقات معلقة ({displayedPendingList.length})
                  </span>
                  <h3 className="text-base font-black text-white">صفقات بانتظار التفاوض وتوقيع العقد الشخصي</h3>
                </div>
                <p className="text-xs text-gray-300 mt-0.5">
                  لقد حسمت انتقال هؤلاء اللاعبين! لم ينضموا بعد إلى قائمتك الرسمية، ويجب الجلوس معهم في مكتب المفاوضات للاتفاق وتوقيع العقد.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-4 pt-4 border-t border-pmb-gold/20">
            {displayedPendingList.map(player => (
              <div key={player.id} className="flex items-center justify-between p-3 rounded-xl bg-black/50 border border-pmb-gold/30 hover:border-pmb-gold transition shadow-md">
                <div className="flex items-center gap-3">
                  <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-white/5 border border-white/10 flex-shrink-0">
                    {player.photo ? (
                      <img src={player.photo} alt={player.fullName} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs font-black text-pmb-gold">
                        {player.position}
                      </div>
                    )}
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-white leading-tight">{player.fullName}</h4>
                    <span className="text-[10px] text-pmb-gold font-bold">OVR {player.overallRating || 75} · {player.position}</span>
                  </div>
                </div>
                {player.awaitsAdmin ? (
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1.5 rounded-lg bg-sky-500/20 border border-sky-500/40 text-sky-400 font-bold text-xs flex items-center gap-1.5 shadow">
                      <span>⏳</span>
                      <span>بانتظار مصادقة الإدارة</span>
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openNegotiations(player)}
                      disabled={loadingId === player.id}
                      className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-pmb-gold to-amber-400 hover:brightness-110 text-black font-black text-xs transition shadow flex items-center gap-1.5"
                    >
                      <span>{loadingId === player.id ? "⏳" : "✍️"}</span>
                      <span>جلسة العقد 3D</span>
                    </button>
                    <button
                      onClick={async () => {
                        if (!confirm(`هل أنت متأكد من إلغاء صفقة ${player.fullName} واسترداد كامل المبلغ إلى ميزانية النادي؟`)) return;
                        try {
                          const res = await fetch(`/api/manager/players/${player.id}/contract/collapse`, { method: "POST" });
                          const data = await res.json();
                          if (data.success) {
                            alert(data.message || "تم إلغاء الصفقة واسترداد المبلغ بالكامل.");
                            handleCollapsed(player.id, data.clubBudgetAfter);
                          } else {
                            alert(data.error || "فشل إلغاء الصفقة.");
                          }
                        } catch {
                          alert("حدث خطأ أثناء إلغاء الصفقة.");
                        }
                      }}
                      className="px-2 py-1.5 rounded-lg border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs transition font-semibold"
                      title="إلغاء واسترداد 100% من المبلغ"
                    >
                      ❌ إلغاء
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Squad Contract Table ── */}
      <div className="rounded-2xl overflow-hidden border border-white/8" style={{
        background: "rgba(10,10,18,0.9)",
        backdropFilter: "blur(20px)",
      }}>
        {/* Table title */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-2">
            <span className="text-base">📋</span>
            <h3 className="text-sm font-black text-white">قائمة لاعبي الفريق الرسمية ({players.length} لاعب مسجل)</h3>
          </div>
          <span className="text-xs text-gray-400">تجديد العقود والمكافآت السنوية</span>
        </div>

        {/* Table header */}
        <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-white/3 border-b border-white/8 text-[11px] text-gray-500 uppercase tracking-widest font-semibold">
          <div className="col-span-4">اللاعب</div>
          <div className="col-span-1 text-center">المركز</div>
          <div className="col-span-1 text-center">OVR</div>
          <div className="col-span-2 text-center">الراتب السنوي</div>
          <div className="col-span-1 text-center">منحة التوقيع</div>
          <div className="col-span-1 text-center">العقد</div>
          <div className="col-span-1 text-center">الرضا</div>
          <div className="col-span-1 text-center">إجراء</div>
        </div>

        {/* Players rows */}
        <div className="divide-y divide-white/5">
          {players.map((player) => {
            const isExpiring = player.contractSeasonsLeft <= 1;
            const satColor   = SATISFACTION_COLOR(player.contractSatisfaction);
            const isLoading  = loadingId === player.id;

            return (
              <div
                key={player.id}
                className="grid grid-cols-12 gap-2 px-4 py-3.5 items-center hover:bg-white/3 transition-colors text-sm"
              >
                {/* Player info */}
                <div className="col-span-4 flex items-center gap-3">
                  <div className="relative w-9 h-9 rounded-full overflow-hidden bg-white/10 border border-white/10 flex-shrink-0">
                    {player.photo ? (
                      <img src={player.photo} alt={player.fullName} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs font-black text-pmb-gold">
                        {player.position}
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="font-bold text-white text-xs leading-tight">{player.fullName}</p>
                      {!isMoroccan(player.nationality) && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          🌍 {player.nationality}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-gray-400 leading-tight">
                      {ROLE_LABELS[player.squadRole] ?? player.squadRole}
                      {player.releaseClause && (
                        <span className="mr-1 text-amber-400">· شرط: {fmt(player.releaseClause)}</span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Position */}
                <div className="col-span-1 text-center">
                  <span className="text-xs font-black px-1.5 py-0.5 rounded bg-white/5 text-gray-300">
                    {player.position}
                  </span>
                </div>

                {/* Rating */}
                <div className="col-span-1 text-center">
                  <span className="text-xs font-black text-pmb-gold">
                    {player.overallRating ?? "—"}
                  </span>
                </div>

                {/* Salary */}
                <div className="col-span-2 text-center text-xs font-bold text-gray-200">
                  {fmt(player.seasonSalary)}
                  <span className="text-[10px] text-gray-500 font-normal block">سنوياً</span>
                </div>

                {/* Prime de Signature */}
                <div className="col-span-1 text-center text-xs font-bold text-emerald-400">
                  {fmt(player.primeSignature)}
                </div>

                {/* Contract seasons left */}
                <div className="col-span-1 text-center">
                  <span className={`text-xs font-black px-2 py-0.5 rounded-full ${
                    isExpiring
                      ? "bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse"
                      : "bg-white/5 text-gray-300"
                  }`}>
                    {player.contractSeasonsLeft <= 0 ? "منتهي" : `${player.contractSeasonsLeft} م`}
                  </span>
                </div>

                {/* Satisfaction */}
                <div className="col-span-1 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <span className="text-xs font-black" style={{ color: satColor }}>
                      {player.contractSatisfaction}%
                    </span>
                  </div>
                  <div className="w-12 h-1 bg-white/10 rounded-full mx-auto mt-1 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${player.contractSatisfaction}%`, background: satColor }}
                    />
                  </div>
                </div>

                {/* Action buttons */}
                <div className="col-span-1 text-center flex items-center justify-center gap-1.5">
                  <button
                    onClick={() => openNegotiations(player)}
                    disabled={isLoading}
                    className="px-2.5 py-1 text-xs font-bold rounded-lg border transition-all disabled:opacity-50"
                    style={{
                      borderColor: "rgba(212,175,55,0.4)",
                      background: isExpiring ? "rgba(212,175,55,0.2)" : "rgba(212,175,55,0.08)",
                      color: "#d4af37",
                    }}
                    title="تجديد أو تعديل شروط العقد في غرفة 3D"
                  >
                    {isLoading ? "..." : isExpiring ? "⚡ تجديد" : "📝 تعديل"}
                  </button>
                  <button
                    onClick={() => openTerminationModal(player)}
                    disabled={isLoading}
                    className="px-2 py-1 text-xs font-semibold rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-all disabled:opacity-50"
                    title="التفاوض على فسخ العقد بالتراضي ودفع تعويض مالي"
                  >
                    📑 فسخ
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 3D Negotiation Modal ── */}
      {activePlayer && negotiationData && (
        <BotolaContractRoom3D
          player={activePlayer}
          demands={negotiationData.demands}
          clubBudget={negotiationData.clubBudget}
          onSigned={handleSigned}
          onCollapsed={handleCollapsed}
          onClose={() => {
            setActivePlayer(null);
            setNegotiationData(null);
          }}
        />
      )}

      {/* ── Mutual Contract Termination Modal ── */}
      {terminatingPlayer && terminationDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fadeIn">
          <div
            className="w-full max-w-lg rounded-2xl border p-6 text-right space-y-5 shadow-2xl relative"
            style={{
              background: "linear-gradient(135deg, rgba(20,12,12,0.98) 0%, rgba(14,8,8,0.98) 100%)",
              borderColor: "rgba(244,63,94,0.3)",
              boxShadow: "0 25px 60px rgba(0,0,0,0.8), inset 0 1px 0 rgba(244,63,94,0.2)",
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">📑</span>
                <div>
                  <h3 className="text-base font-black text-white">اتفاقية فسخ العقد بالتراضي (Résiliation)</h3>
                  <p className="text-[11px] text-gray-400">التفاوض مع اللاعب ووكيله على تسوية مالية عادلة لإنهاء العقد ودياً</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setTerminatingPlayer(null);
                  setTerminationDetails(null);
                }}
                className="text-gray-400 hover:text-white text-lg w-7 h-7 flex items-center justify-center rounded-full hover:bg-white/10 transition"
              >
                ✕
              </button>
            </div>

            {/* Player details */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
              <div className="flex items-center gap-3">
                <div className="relative w-11 h-11 rounded-lg overflow-hidden bg-white/10 border border-white/10 flex-shrink-0">
                  {terminatingPlayer.photo ? (
                    <img src={terminatingPlayer.photo} alt={terminatingPlayer.fullName} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs font-bold text-pmb-gold">
                      {terminatingPlayer.position}
                    </div>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h4 className="text-sm font-black text-white">{terminatingPlayer.fullName}</h4>
                    {terminationDetails.isForeign && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        🌍 {terminationDetails.nationality}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400">
                    الراتب السنوي: <span className="text-white font-bold">{fmt(terminationDetails.annualSalary)}</span> · المتبقي: {terminationDetails.seasonsLeft} مواسم
                  </p>
                </div>
              </div>
              <div className="text-left">
                <span className="text-[10px] text-gray-400 block">إجمالي القيمة المتبقية</span>
                <span className="text-sm font-black text-rose-400">{fmt(terminationDetails.totalRemainingContractValue)}</span>
              </div>
            </div>

            {/* Agent speech bubble */}
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs space-y-1">
              <div className="flex items-center gap-1 text-amber-400 font-black text-[11px]">
                <span>💬</span>
                <span>بيان وكيل اللاعب:</span>
              </div>
              <p className="text-gray-300 leading-relaxed text-[11px]">
                {terminationDetails.reasonText}
              </p>
              <div className="pt-1 text-[11px] font-bold text-amber-300">
                المبلغ المطلوب للتسوية: <span className="font-black underline">{fmt(terminationDetails.requestedSeverance)}</span> ({terminationDetails.severancePercentage}% من إجمالي العقد)
              </div>
            </div>

            {/* Severance Slider */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-gray-300 flex items-center gap-1">
                  <span>💰</span> تعويض فسخ العقد المقترح:
                </span>
                <span className="text-base font-black text-pmb-gold">{fmt(severanceOffer)}</span>
              </div>

              <div className="relative h-2.5 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-pmb-gold to-rose-500 transition-all"
                  style={{
                    width: `${Math.min(100, Math.max(0, (severanceOffer / Math.max(1, terminationDetails.requestedSeverance)) * 100))}%`,
                  }}
                />
                <input
                  type="range"
                  min={0}
                  max={terminationDetails.requestedSeverance}
                  step={5_000}
                  value={severanceOffer}
                  onChange={(e) => setSeveranceOffer(Number(e.target.value))}
                  className="absolute inset-0 w-full opacity-0 cursor-pointer h-full"
                />
              </div>

              <div className="flex justify-between text-[10px] text-gray-500">
                <span>0 € (دون تعويض)</span>
                <span className={severanceOffer >= terminationDetails.minAcceptableSeverance ? "text-emerald-400 font-bold" : "text-amber-400 font-bold"}>
                  {severanceOffer >= terminationDetails.minAcceptableSeverance
                    ? "✅ العرض مقبول من اللاعب والوكيل"
                    : "⚠️ العرض منخفض جداً والوكيل يتردد"}
                </span>
                <span>{fmt(terminationDetails.requestedSeverance)} (طلب الوكيل)</span>
              </div>
            </div>

            {/* Impact details */}
            <div className="p-3 rounded-xl bg-black/40 border border-white/5 text-[11px] space-y-1.5">
              <div className="flex justify-between">
                <span className="text-gray-400">ميزانية النادي المتاحة:</span>
                <span className="font-bold text-white">{fmt(budget)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">الميزانية بعد دفع التعويض:</span>
                <span className={`font-bold ${budget >= severanceOffer ? "text-emerald-400" : "text-red-400"}`}>
                  {fmt(budget - severanceOffer)}
                </span>
              </div>
              {terminationDetails.isForeign && (
                <div className="pt-1 text-emerald-400 font-bold border-t border-white/5">
                  🎉 بمجرد الفسخ، سيتم تحرير مقعد للاعب أجنبي في كوتة الـ 5 لاعبين أجانب!
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setTerminatingPlayer(null);
                  setTerminationDetails(null);
                }}
                disabled={submittingTermination}
                className="px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 font-bold text-xs border border-white/10 transition"
              >
                تراجع
              </button>
              <button
                type="button"
                onClick={handleConfirmTermination}
                disabled={submittingTermination || severanceOffer < terminationDetails.minAcceptableSeverance || severanceOffer > budget}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 hover:brightness-110 text-white font-black text-xs transition shadow-[0_0_25px_rgba(225,29,72,0.4)] disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submittingTermination ? (
                  <span>⏳ جاري إنهاء العقد وصرف التعويض...</span>
                ) : (
                  <>
                    <span>🤝</span>
                    <span>اعتماد الفسخ وتحرير اللاعب</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function KPICard({
  label,
  value,
  icon,
  warn = false,
}: {
  label: string;
  value: string;
  icon: string;
  warn?: boolean;
}) {
  return (
    <div className={`p-4 rounded-xl border transition-all ${
      warn ? "bg-red-500/10 border-red-500/30" : "bg-white/3 border-white/8"
    }`}>
      <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
        <span>{label}</span>
        <span>{icon}</span>
      </div>
      <p className={`text-base font-black ${warn ? "text-red-400" : "text-white"}`}>
        {value}
      </p>
    </div>
  );
}
