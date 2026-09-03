"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ClubBadge } from "@/components/ClubBadge";
import { BotolaContractRoom3D } from "@/components/manager/contracts/BotolaContractRoom3D";
import type { ContractDemands } from "@/lib/services/botola-contract-service";

interface FreeAgentPlayer {
  id: string;
  fullName: string;
  position: string;
  overallRating: number | null;
  photo: string | null;
  nationality: string;
  realClub: string;
  marketValue: number | string | null;
  expiredFromClubName?: string | null;
  isFreeAgentMarket: boolean;
  hasFailedAttempt?: boolean;
}

interface ClubInfo {
  id: string;
  name: string;
  budget: number;
  foreignPlayerCount: number;
  maxForeignPlayers: number;
}

const POSITION_FILTERS = ["ALL", "FWD", "MID", "DEF", "GK"] as const;

export function FreeAgentMarketClient() {
  const [players, setPlayers] = useState<FreeAgentPlayer[]>([]);
  const [clubInfo, setClubInfo] = useState<ClubInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [posFilter, setPosFilter] = useState<(typeof POSITION_FILTERS)[number]>("ALL");

  // 3D Negotiation Room States
  const [activePlayer, setActivePlayer] = useState<any | null>(null);
  const [negotiationData, setNegotiationData] = useState<{
    demands: ContractDemands;
    clubBudget: number;
  } | null>(null);
  const [loadingNegotiationId, setLoadingNegotiationId] = useState<string | null>(null);

  const fetchFreeAgents = useCallback(async (q = "") => {
    setLoading(true);
    try {
      const url = q.trim() ? `/api/manager/free-agents?search=${encodeURIComponent(q.trim())}` : "/api/manager/free-agents";
      const res = await fetch(url, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setPlayers(data.players || []);
        if (data.club) setClubInfo(data.club);
      }
    } catch (err) {
      console.error("Error fetching free agents:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFreeAgents();
  }, [fetchFreeAgents]);

  function isMoroccan(nat?: string | null) {
    if (!nat) return false;
    const n = nat.toLowerCase().trim();
    return ["moroc", "maroc", "ma", "مغرب"].some((m) => n.includes(m));
  }

  function fmt(n: number) {
    return new Intl.NumberFormat("fr-MA", { maximumFractionDigits: 0 }).format(n) + " €";
  }

  // Open the 3D negotiation room directly with the Free Agent
  async function startNegotiation(player: FreeAgentPlayer) {
    if (player.hasFailedAttempt) {
      alert("⛔ لقد استنفد ناديك فرصته الوحيدة للتفاوض مع هذا اللاعب. رفض الوكيل واللاعب التفاوض مجدداً.");
      return;
    }

    if (clubInfo && !isMoroccan(player.nationality) && clubInfo.foreignPlayerCount >= clubInfo.maxForeignPlayers) {
      alert(`⛔ لا يمكنك التعاقد مع هذا اللاعب الأجنبي لأن ناديك بلغ الحد الأقصى لكوتة اللاعبين الأجانب في البطولة (${clubInfo.maxForeignPlayers} لاعبين).`);
      return;
    }

    setLoadingNegotiationId(player.id);
    try {
      const res = await fetch(`/api/manager/free-agents/${player.id}/contract`);
      const data = await res.json();
      if (!res.ok || !data.demands) {
        alert(data.error || "تعذر فتح جلسة التفاوض مع اللاعب ووكيله.");
        return;
      }
      setNegotiationData({ demands: data.demands, clubBudget: data.clubBudget });
      setActivePlayer({ ...(data.player || player), isFreeAgentMarket: true });
    } catch (err) {
      console.error("Negotiation error:", err);
      alert("حدث خطأ أثناء فتح غرفة التفاوض.");
    } finally {
      setLoadingNegotiationId(null);
    }
  }

  // Filtered Players
  const filteredPlayers = players.filter((p) => {
    if (posFilter === "FWD" && !["CF", "ST", "LWF", "RWF", "LW", "RW"].includes(p.position)) return false;
    if (posFilter === "MID" && !["CMF", "AMF", "DMF", "CM", "CAM", "CDM"].includes(p.position)) return false;
    if (posFilter === "DEF" && !["CB", "LB", "RB", "LWB", "RWB"].includes(p.position)) return false;
    if (posFilter === "GK" && p.position !== "GK") return false;
    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-2 sm:px-4 py-4" dir="rtl">
      {/* ─── HEADER BANNER ────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl border border-emerald-500/30 bg-gradient-to-r from-emerald-950/40 via-black to-emerald-950/30 p-6 shadow-2xl backdrop-blur-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                🏪 متجر اللاعبين الأحرار الرسمي
              </span>
              <span className="text-xs text-amber-300 font-bold bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                ⚡ قانون الفرصة الواحدة لكل نادٍ
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">
              متجر اللاعبين الأحرار (Free Agent Store)
            </h1>
            <p className="text-xs text-gray-300 max-w-2xl leading-relaxed">
              هؤلاء اللاعبون طُرحوا في المتجر من طرف الإدارة بعد نهاية عقودهم أو الاستغناء عنهم دون بيع. لا يوجد أي مقابل مالي لأي نادٍ (0 € Transfer Fee)!
              <br />
              <strong className="text-amber-300">قاعدة ذهبية:</strong> يملك كل نادٍ <strong>فرصة واحدة فقط</strong> للتفاوض مع كل لاعب حر. إذا رفض الوكيل شروطك أو انهارت المفاوضات، فلن تتمكن من التفاوض معه مرة أخرى وسيكون متاحاً للأندية الأخرى!
            </p>
          </div>

          {/* Quick KPIs */}
          {clubInfo && (
            <div className="flex items-center gap-3 shrink-0">
              <div className="rounded-2xl border border-white/10 bg-black/60 p-3 text-center min-w-[120px]">
                <span className="text-[10px] text-gray-400 block font-bold">ميزانية ناديك</span>
                <span className="text-base font-black text-pmb-gold">{fmt(clubInfo.budget)}</span>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/60 p-3 text-center min-w-[120px]">
                <span className="text-[10px] text-gray-400 block font-bold">كوتة الأجانب</span>
                <span className={`text-base font-black ${clubInfo.foreignPlayerCount >= 5 ? "text-red-400" : "text-emerald-400"}`}>
                  {clubInfo.foreignPlayerCount} / {clubInfo.maxForeignPlayers}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── CONTROLS: SEARCH & FILTERS ─────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="ابحث بالاسم، الجنسية، المركز..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              fetchFreeAgents(e.target.value);
            }}
            className="pmb-input w-full pr-10 pl-4 py-2.5 text-xs rounded-xl bg-black/60 border-white/20 focus:border-emerald-500 text-white"
          />
          <span className="absolute right-3.5 top-3 text-gray-400 text-xs">🔍</span>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {POSITION_FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setPosFilter(f)}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition ${
                posFilter === f
                  ? "bg-emerald-500 text-black shadow-lg shadow-emerald-500/30"
                  : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
              }`}
            >
              {f === "ALL" ? "الكل" : f === "FWD" ? "هجوم" : f === "MID" ? "وسط" : f === "DEF" ? "دفاع" : "حراسة"}
            </button>
          ))}
        </div>
      </div>

      {/* ─── PLAYERS GRID ───────────────────────────────────────────── */}
      {loading ? (
        <div className="py-20 text-center text-gray-400 text-sm animate-pulse flex flex-col items-center justify-center gap-3">
          <span className="text-3xl animate-spin">⚽</span>
          <span>جاري تحميل متجر اللاعبين الأحرار...</span>
        </div>
      ) : filteredPlayers.length === 0 ? (
        <div className="py-16 text-center rounded-3xl border border-white/10 bg-white/5 p-8 space-y-3">
          <span className="text-4xl block">🏪</span>
          <h3 className="text-base font-bold text-white">لا يوجد لاعبون أحرار حالياً في هذا القسم</h3>
          <p className="text-xs text-gray-400 max-w-md mx-auto">
            تتم إضافة اللاعبين تلقائياً إلى هذا المتجر عند انتهاء عقودهم دون تجديد أو الاستغناء عنهم واختيار الإدارة لطرحهم مجاناً.
          </p>
          <Link href="/manager/transfers" className="pmb-btn-secondary inline-block text-xs font-bold mt-2">
            العودة لمركز الانتقالات
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
          {filteredPlayers.map((player) => {
            const isForeign = !isMoroccan(player.nationality);
            const isQuotaFull = Boolean(isForeign && clubInfo && clubInfo.foreignPlayerCount >= clubInfo.maxForeignPlayers);
            const hasFailed = Boolean(player.hasFailedAttempt);

            return (
              <div
                key={player.id}
                className={`group relative overflow-hidden rounded-3xl border p-5 transition-all flex flex-col justify-between ${
                  hasFailed
                    ? "border-red-500/40 bg-gradient-to-b from-red-950/20 via-[#100808] to-black opacity-85"
                    : "border-emerald-500/20 bg-gradient-to-b from-[#111613] via-[#0d0f0e] to-black hover:border-emerald-500/60 hover:shadow-[0_10px_30px_rgba(16,185,129,0.15)]"
                }`}
              >
                <div>
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <span className="px-2.5 py-1 rounded-xl bg-white/10 border border-white/10 text-xs font-black text-pmb-gold">
                      {player.overallRating ?? 75} OVR
                    </span>
                    <div className="flex items-center gap-1.5">
                      {hasFailed ? (
                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-red-600/30 text-red-300 border border-red-500/40 flex items-center gap-1">
                          <span>❌</span>
                          <span>فرصة مستنفدة</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                          <span>⚡</span>
                          <span>فرصة واحدة</span>
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-white/10 text-gray-300">
                        {player.position}
                      </span>
                      {isForeign && (
                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          أجنبي 🌍
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Player Image & Name */}
                  <div className="flex items-center gap-3.5 mb-4">
                    <div className="w-14 h-14 rounded-2xl overflow-hidden bg-black/50 border border-white/10 flex-shrink-0 flex items-center justify-center">
                      {player.photo ? (
                        <img
                          src={player.photo}
                          alt={player.fullName}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <ClubBadge name={player.fullName} size="md" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-black text-white truncate group-hover:text-emerald-400 transition">
                        {player.fullName}
                      </h3>
                      <p className="text-[11px] text-gray-400 truncate">
                        {player.expiredFromClubName ? `سابقاً: ${player.expiredFromClubName}` : "لاعب حر"}
                      </p>
                      <p className="text-[10px] text-gray-500 truncate">
                        الجنسية: {player.nationality}
                      </p>
                    </div>
                  </div>

                  {/* Pricing Badge */}
                  <div className={`p-2.5 rounded-xl border mb-4 space-y-1 ${
                    hasFailed
                      ? "bg-red-950/20 border-red-500/20 text-red-300"
                      : "bg-emerald-500/10 border-emerald-500/20"
                  }`}>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-gray-400">قيمة الانتقال:</span>
                      <span className="font-black text-emerald-400">مجاناً (0 € Transfer Fee)</span>
                    </div>
                    {hasFailed ? (
                      <p className="text-[10px] text-red-300 font-semibold leading-tight">
                        رفض اللاعب ووكيله التفاوض مجدداً بعد فشل الجلسة السابقة.
                      </p>
                    ) : (
                      <p className="text-[10px] text-gray-400">
                        المفاوضة حصراً على الراتب السنوي ومنحة التوقيع
                      </p>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-2 border-t border-white/5">
                  {hasFailed ? (
                    <button
                      type="button"
                      disabled
                      className="w-full py-2.5 px-4 rounded-xl text-xs font-black bg-red-950/40 text-red-400 border border-red-500/30 cursor-not-allowed flex items-center justify-center gap-1.5"
                    >
                      <span>❌</span>
                      <span>استنفدت فرصتك الوحيدة</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={Boolean(loadingNegotiationId) || isQuotaFull}
                      onClick={() => startNegotiation(player)}
                      className={`w-full py-2.5 px-4 rounded-xl text-xs font-black transition flex items-center justify-center gap-2 ${
                        isQuotaFull
                          ? "bg-red-500/20 text-red-300 border border-red-500/30 cursor-not-allowed"
                          : "bg-gradient-to-r from-emerald-500 to-teal-400 hover:brightness-110 text-black shadow-lg shadow-emerald-500/20"
                      }`}
                    >
                      {loadingNegotiationId === player.id ? (
                        <span className="animate-spin">⏳ جاري الدخول...</span>
                      ) : isQuotaFull ? (
                        <span>⛔ اكتملت كوتة الأجانب (5/5)</span>
                      ) : (
                        <>
                          <span>🤝 تفاوض وضم اللاعب</span>
                          <span className="text-[10px] bg-black/20 px-1.5 py-0.5 rounded font-bold">فرصة واحدة</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── 3D NEGOTIATION ROOM POPUP ─────────────────────────────── */}
      {activePlayer && negotiationData && (
        <BotolaContractRoom3D
          player={activePlayer}
          demands={negotiationData.demands}
          clubBudget={negotiationData.clubBudget}
          onClose={() => {
            setActivePlayer(null);
            setNegotiationData(null);
            fetchFreeAgents();
          }}
          onFailed={() => {
            fetchFreeAgents();
          }}
          onSigned={(contract) => {
            alert(`تهانينا 🎉! تم التوقيع رسمياً مع اللاعب الحر ${activePlayer.fullName} وضمه إلى التشكيلة!`);
            setActivePlayer(null);
            setNegotiationData(null);
            fetchFreeAgents();
          }}
        />
      )}
    </div>
  );
}
