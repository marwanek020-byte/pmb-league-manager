"use client";

import Link from "next/link";
import { useCallback, useState, useEffect } from "react";
import { Toast } from "@/components/Toast";
import { useToast } from "@/lib/use-toast";
import { fetchTransferHistory } from "@/lib/transfer-client";
import { TransferListClient } from "@/components/manager/transfers/TransferListClient";

type PendingAuction = {
  id: string;
  playerId: string;
  playerName: string;
  position: string;
  overallRating: number | null;
  photo: string | null;
  nationality: string;
  clubName: string;
  clubId: string;
  bidFee: number;
  salary: number;
  prime: number;
  seasons: number;
  role: string;
  releaseClause: number | null;
  updatedAt: string;
};

export function AdminTransferManagementClient() {
  const { toast, showSuccess, showError, dismiss } = useToast();
  const fetcher = useCallback(() => fetchTransferHistory({ pageSize: 50 }), []);

  const [activeTab, setActiveTab] = useState<"transfers" | "auctions">("transfers");
  const [pendingAuctions, setPendingAuctions] = useState<PendingAuction[]>([]);
  const [loadingAuctions, setLoadingAuctions] = useState(false);
  const [ratifyingId, setRatifyingId] = useState<string | null>(null);

  const loadPendingAuctions = useCallback(async () => {
    setLoadingAuctions(true);
    try {
      const res = await fetch("/api/admin/auctions/pending-ratification");
      const data = await res.json();
      if (res.ok && data.auctions) {
        setPendingAuctions(data.auctions);
      }
    } catch (err) {
      console.error("Failed to load pending auctions:", err);
    } finally {
      setLoadingAuctions(false);
    }
  }, []);

  useEffect(() => {
    loadPendingAuctions();
  }, [loadPendingAuctions]);

  async function handleRatifyAuction(auction: PendingAuction) {
    if (!confirm(`هل أنت متأكد من مصادقة واعتماد صفقة انتقال اللاعب ${auction.playerName} إلى نادي ${auction.clubName}؟`)) {
      return;
    }
    setRatifyingId(auction.id);
    try {
      const res = await fetch(`/api/admin/auctions/${auction.id}/ratify`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showSuccess(`تمت مصادقة الصفقة رسمياً! تم تسجيل اللاعب ${auction.playerName} في نادي ${auction.clubName}.`);
        setPendingAuctions((prev) => prev.filter((a) => a.id !== auction.id));
      } else {
        showError(data.error || "فشل تصديق الصفقة.");
      }
    } catch {
      showError("حدث خطأ أثناء الاتصال بالخادم.");
    } finally {
      setRatifyingId(null);
    }
  }

  function fmt(n: number) {
    return new Intl.NumberFormat("fr-MA").format(n) + " €";
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Transfer & Registration Management</h2>
          <p className="mt-1 text-sm text-gray-400">
            مصادقة واعتماد صفقات اللاعبين عبر الدوري بعد اتفاق الأندية واللاعب والوكيل.
          </p>
        </div>
        <Link href="/admin/dashboard" className="pmb-btn-secondary">
          Back to dashboard
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-3 border-b border-white/10 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab("transfers")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition ${
            activeTab === "transfers"
              ? "bg-pmb-gold text-black shadow-lg"
              : "text-gray-400 hover:text-white bg-white/5"
          }`}
        >
          <span>🤝 انتقالات الأندية (Club Transfers)</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("auctions")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition ${
            activeTab === "auctions"
              ? "bg-pmb-gold text-black shadow-lg"
              : "text-gray-400 hover:text-white bg-white/5"
          }`}
        >
          <span>🏛️ صفقات المزادات المعلقة (Auction Signings)</span>
          {pendingAuctions.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs font-black bg-red-600 text-white animate-pulse">
              {pendingAuctions.length}
            </span>
          )}
        </button>
      </div>

      {activeTab === "transfers" ? (
        <TransferListClient
          fetcher={fetcher}
          perspective="admin"
          showStatusFilter
          emptyMessage="No transfer requests have been submitted yet."
          onNotify={(type, message) => (type === "success" ? showSuccess(message) : showError(message))}
        />
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white">
              عقود المزادات الموقعة بانتظار مصادقة الإدارة ({pendingAuctions.length})
            </h3>
            <button
              onClick={loadPendingAuctions}
              className="text-xs text-pmb-gold hover:underline"
            >
              تحديث القائمة 🔄
            </button>
          </div>

          {loadingAuctions ? (
            <div className="p-8 text-center text-sm text-gray-400">جاري التحميل...</div>
          ) : pendingAuctions.length === 0 ? (
            <div className="pmb-card p-12 text-center text-sm text-gray-400">
              لا توجد صفقات مزادات بانتظار المصادقة حالياً. جميع الصفقات المكتملة تم اعتمادها.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingAuctions.map((auction) => (
                <div
                  key={auction.id}
                  className="pmb-card p-5 border border-pmb-gold/30 hover:border-pmb-gold/60 transition shadow-xl space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-white/5 border border-white/10 flex-shrink-0">
                        {auction.photo ? (
                          <img src={auction.photo} alt={auction.playerName} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs font-black text-pmb-gold">
                            {auction.position}
                          </div>
                        )}
                        <div className="absolute bottom-0 right-0 bg-pmb-gold text-black text-[9px] font-black px-1 rounded-tl">
                          {auction.overallRating || 75}
                        </div>
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-white">{auction.playerName}</h4>
                        <p className="text-xs text-pmb-gold font-bold">
                          {auction.position} · {auction.nationality}
                        </p>
                        <p className="text-xs text-gray-400">
                          الفريق المشتري: <span className="text-emerald-400 font-bold">{auction.clubName}</span>
                        </p>
                      </div>
                    </div>

                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                      ⏳ بانتظار المصادقة
                    </span>
                  </div>

                  {/* Agreed terms box */}
                  <div className="p-3 rounded-xl bg-black/40 border border-white/5 text-xs grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-gray-500">قيمة المزاد:</span>
                      <p className="font-bold text-white">{fmt(auction.bidFee)}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">منحة التوقيع:</span>
                      <p className="font-bold text-amber-400">{fmt(auction.prime)}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">الراتب السنوي:</span>
                      <p className="font-bold text-emerald-400">{fmt(auction.salary)}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">مدة العقد والدور:</span>
                      <p className="font-bold text-gray-300">{auction.seasons} مواسم · {auction.role}</p>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleRatifyAuction(auction)}
                      disabled={ratifyingId === auction.id}
                      className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 via-pmb-gold to-emerald-400 text-black font-black text-xs transition hover:brightness-110 shadow flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <span>{ratifyingId === auction.id ? "⏳" : "⚖️"}</span>
                      <span>
                        {ratifyingId === auction.id
                          ? "جاري المصادقة والتسجيل..."
                          : "مصادقة واعتماد الصفقة رسمياً (Ratify & Register)"}
                      </span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <Toast toast={toast} onDismiss={dismiss} />
    </div>
  );
}
