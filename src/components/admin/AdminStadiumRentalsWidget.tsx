"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, CheckCircle2, XCircle, MapPin, Building2, BellRing } from "lucide-react";

type RentalOffer = {
  id: string;
  matchday: number;
  fromClub: { id: string; name: string; logo: string | null };
  toClub: { id: string; name: string; logo: string | null };
  offerAmount: number;
  messageNote?: string | null;
  createdAt?: string;
};

export function AdminStadiumRentalsWidget() {
  const [pendingRentals, setPendingRentals] = useState<RentalOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchRentals = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/stadium-rentals");
      if (res.ok) {
        const data = await res.json();
        setPendingRentals(data.pending || []);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRentals();
  }, [fetchRentals]);

  async function handleAction(offerId: string, action: "APPROVE" | "REJECT") {
    setActionLoading(offerId + action);
    setSuccessMsg(null);
    try {
      const res = await fetch(`/api/admin/stadium-rentals/${offerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccessMsg(
          action === "APPROVE"
            ? `✓ Rental approved! Funds transferred, match venue relocated to ${data.venueName ?? "stadium"}, and PMB Dugout announcement posted.`
            : `✓ Rental offer rejected.`
        );
        await fetchRentals();
      } else {
        alert(data.error ?? "Failed to perform action");
      }
    } catch {
      alert("Network error processing rental action");
    } finally {
      setActionLoading(null);
    }
  }

  if (loading) {
    return null;
  }

  if (pendingRentals.length === 0) {
    return null;
  }

  return (
    <section className="relative overflow-hidden rounded-2xl border border-blue-500/50 bg-gradient-to-br from-blue-950/40 via-gray-900 to-gray-950 p-6 shadow-2xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-800 pb-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-500/20 border border-blue-500/40 text-blue-400">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-extrabold text-white uppercase tracking-wider">
                Stadium Rental Approvals Required
              </h2>
              <span className="rounded-full bg-blue-500/20 border border-blue-500/40 px-2.5 py-0.5 text-xs font-bold text-blue-300 animate-pulse">
                {pendingRentals.length} Action Needed
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              Review stadium venue relocation agreements and release rental funds to stadium owners.
            </p>
          </div>
        </div>
      </div>

      {successMsg && (
        <div className="mb-4 flex items-center gap-2 rounded-xl bg-emerald-950/50 border border-emerald-600/60 p-3 text-xs font-semibold text-emerald-300">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{successMsg}</span>
        </div>
      )}

      <div className="space-y-3">
        {pendingRentals.map((r) => (
          <div
            key={r.id}
            className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-xl border border-gray-800 bg-gray-950/70 p-4 transition-all hover:border-blue-500/40"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm font-bold text-white flex-wrap">
                <span className="text-blue-300 font-extrabold">{r.fromClub.name}</span>
                <span className="text-gray-500 text-xs">wants to host Matchday {r.matchday} at</span>
                <span className="text-yellow-400 font-extrabold flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {r.toClub.name}&apos;s Stadium
                </span>
              </div>
              <p className="text-xs text-gray-400">
                Agreed Rental Fee: <strong className="text-emerald-400 font-bold text-sm">€{r.offerAmount.toLocaleString()}</strong>
                {" · "}Status: <span className="text-amber-400 font-semibold">Accepted by both clubs — Awaiting Admin confirmation</span>
              </p>
              {r.messageNote && (
                <p className="text-xs text-gray-500 italic mt-0.5">
                  &ldquo;{r.messageNote}&rdquo;
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => handleAction(r.id, "APPROVE")}
                disabled={actionLoading !== null}
                className="flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider py-2.5 px-4 transition cursor-pointer disabled:opacity-50 shadow-lg shadow-emerald-950/40"
              >
                {actionLoading === r.id + "APPROVE" ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                )}
                Approve & Release Funds
              </button>

              <button
                type="button"
                onClick={() => handleAction(r.id, "REJECT")}
                disabled={actionLoading !== null}
                className="flex items-center gap-1.5 rounded-lg bg-red-800/80 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wider py-2.5 px-3 transition cursor-pointer disabled:opacity-50"
              >
                {actionLoading === r.id + "REJECT" ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <XCircle className="w-3.5 h-3.5" />
                )}
                Reject
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
