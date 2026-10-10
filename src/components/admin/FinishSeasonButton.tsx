"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  seasonId: string;
  seasonName: string;
  leagueName: string;
  seasonStatus: "DRAFT" | "ACTIVE" | "FINISHED";
};

type PreviewData = {
  champion: {
    clubName: string;
    clubLogo: string | null;
    totalPrize: number;
    standingPrize: number;
  };
  grandTotal: number;
  clubSummaries: Array<{
    clubId: string;
    clubName: string;
    position: number;
    standingPrize: number;
    totalPrize: number;
    individualAwards: Array<{
      categoryLabel: string;
      rank: number;
      playerName: string;
      prizeAmount: number;
    }>;
  }>;
};

export function FinishSeasonButton({
  seasonId,
  seasonName,
  leagueName,
  seasonStatus,
}: Props) {
  const router = useRouter();
  const [status, setStatus] = useState(seasonStatus);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  async function openModal() {
    setModalOpen(true);
    setErrorMsg("");
    setSuccessMsg("");
    setLoadingPreview(true);

    try {
      const res = await fetch(`/api/admin/seasons/${seasonId}/finish`);
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "Failed to load prize preview");
      } else {
        setPreview(data.preview);
      }
    } catch {
      setErrorMsg("Network error loading preview");
    } finally {
      setLoadingPreview(false);
    }
  }

  async function handleConfirmFinish() {
    setLoading(true);
    setErrorMsg("");

    try {
      const res = await fetch(`/api/admin/seasons/${seasonId}/finish`, {
        method: "POST",
      });
      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || "Failed to finish season and distribute prizes");
      } else {
        setStatus("FINISHED");
        setSuccessMsg(
          `✓ ${data.receipt.championClub.name} crowned Champions! €${(
            data.receipt.totalDistributed / 1_000_000
          ).toLocaleString()}M prizes successfully distributed across all clubs.`
        );
        router.refresh();
      }
    } catch {
      setErrorMsg("Network error during distribution");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {status === "ACTIVE" ? (
        <button
          onClick={openModal}
          className="inline-flex items-center gap-2.5 rounded-xl border border-pmb-gold/50 bg-gradient-to-r from-pmb-gold/20 via-yellow-500/20 to-pmb-gold/10 px-5 py-2.5 text-sm font-bold text-pmb-gold shadow-lg shadow-pmb-gold/10 transition-all hover:scale-105 hover:border-pmb-gold hover:bg-pmb-gold hover:text-black active:scale-95"
          title="Conclude season, crown champion, and distribute all official budget prizes"
        >
          <span className="text-base">🏆</span>
          <span>Finish Season & Distribute Prizes</span>
        </button>
      ) : status === "FINISHED" ? (
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-emerald-400">
            <span>✓</span> Season Finished · Prizes Distributed
          </span>
          <button
            onClick={openModal}
            className="text-xs text-pmb-gold/80 hover:text-pmb-gold underline transition"
          >
            View Prize Ledger
          </button>
        </div>
      ) : null}

      {/* Confirmation & Summary Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-2xl border border-pmb-gold/40 bg-[#121418] shadow-2xl shadow-pmb-gold/15 flex flex-col">
            {/* Modal Header */}
            <div className="border-b border-pmb-border/80 bg-gradient-to-r from-black/80 via-[#1a1c22] to-black/80 px-6 py-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-3xl">🏆</span>
                <div>
                  <h3 className="text-lg font-bold text-white">
                    Official Season Prize Distribution
                  </h3>
                  <p className="text-xs text-gray-400">
                    {leagueName} · {seasonName}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-white/10 hover:text-white transition"
              >
                ✕
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {loadingPreview ? (
                <div className="py-12 text-center text-sm text-gray-400">
                  <span className="inline-block animate-spin text-2xl mb-3">⚽</span>
                  <p>Calculating official standings & honor allocations...</p>
                </div>
              ) : errorMsg ? (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
                  {errorMsg}
                </div>
              ) : preview ? (
                <>
                  {successMsg && (
                    <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/15 p-4 text-sm font-semibold text-emerald-300 flex items-center gap-2">
                      <span className="text-xl">🎉</span>
                      <span>{successMsg}</span>
                    </div>
                  )}

                  {/* Champion Banner */}
                  <div className="relative overflow-hidden rounded-2xl border border-pmb-gold/50 bg-gradient-to-br from-pmb-gold/20 via-[#1e1b12] to-black p-5 text-center shadow-lg">
                    <p className="text-[10px] font-bold uppercase tracking-[.25em] text-pmb-gold">
                      Season Champion & League Winner
                    </p>
                    <h2 className="mt-2 text-2xl sm:text-3xl font-black text-white tracking-wide">
                      {preview.champion.clubName}
                    </h2>
                    <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-pmb-gold/60 bg-pmb-gold/20 px-4 py-1 text-base font-extrabold text-pmb-gold">
                      <span>🥇</span>
                      <span>€150,000,000 Winner Prize</span>
                    </div>
                    {preview.champion.totalPrize > 150_000_000 && (
                      <p className="mt-2 text-xs text-gray-300">
                        Total Payout with Individual Honors:{" "}
                        <strong className="text-emerald-400 font-bold">
                          €{(preview.champion.totalPrize / 1_000_000).toLocaleString()}M
                        </strong>
                      </p>
                    )}
                  </div>

                  {/* Prize Structure Summary */}
                  <div className="rounded-xl border border-pmb-border/60 bg-white/[0.02] p-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">
                      Standardized Payout Structure
                    </h4>
                    <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                      <div className="rounded-lg bg-black/40 p-2.5 text-center">
                        <p className="text-gray-500">1st (Champion)</p>
                        <p className="font-bold text-pmb-gold">€150M</p>
                      </div>
                      <div className="rounded-lg bg-black/40 p-2.5 text-center">
                        <p className="text-gray-500">2nd Place</p>
                        <p className="font-bold text-slate-200">€100M</p>
                      </div>
                      <div className="rounded-lg bg-black/40 p-2.5 text-center">
                        <p className="text-gray-500">3rd Place</p>
                        <p className="font-bold text-amber-500">€70M</p>
                      </div>
                      <div className="rounded-lg bg-black/40 p-2.5 text-center">
                        <p className="text-gray-500">4th Place</p>
                        <p className="font-bold text-emerald-400">€50M</p>
                      </div>
                    </div>
                    <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                      <div className="rounded-lg bg-black/40 p-2 text-center text-gray-400">
                        5th–8th: <strong className="text-white">€30M each</strong>
                      </div>
                      <div className="rounded-lg bg-black/40 p-2 text-center text-gray-400">
                        9th–12th: <strong className="text-white">€20M each</strong>
                      </div>
                      <div className="rounded-lg bg-black/40 p-2 text-center text-gray-400">
                        13th–16th: <strong className="text-white">€10M each</strong>
                      </div>
                    </div>
                  </div>

                  {/* Individual Honors Top 3 */}
                  <div className="rounded-xl border border-pmb-border/60 bg-white/[0.02] p-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                      Individual Honors (Ballon d'Or €40M · Golden Boot €40M · Glove €25M · Assists €20M · MOTM €15M)
                    </h4>
                    <p className="text-xs text-gray-500">
                      Top 3 performers in each category receive direct budget bonuses credited to their club.
                    </p>
                  </div>

                  {/* Club Payout Ledger */}
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                      Club Payout Distribution Ledger
                    </h4>
                    <div className="max-h-56 overflow-y-auto divide-y divide-pmb-border/40 rounded-xl border border-pmb-border/60 bg-black/30">
                      {preview.clubSummaries.map((c) => (
                        <div
                          key={c.clubId}
                          className="flex items-center justify-between px-3.5 py-2 text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className={`w-4 font-bold text-center ${
                                c.position === 1
                                  ? "text-pmb-gold"
                                  : c.position <= 3
                                  ? "text-yellow-500"
                                  : "text-gray-500"
                              }`}
                            >
                              {c.position}
                            </span>
                            <span className="font-semibold text-white">
                              {c.clubName}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-emerald-400">
                              +€{(c.totalPrize / 1_000_000).toLocaleString()}M
                            </span>
                            {c.individualAwards.length > 0 && (
                              <span className="ml-1 text-[10px] text-gray-500">
                                ({c.individualAwards.length} award{c.individualAwards.length > 1 ? "s" : ""})
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Total Pool */}
                  <div className="flex items-center justify-between rounded-xl bg-pmb-gold/10 border border-pmb-gold/30 px-4 py-3">
                    <span className="text-xs font-bold uppercase text-gray-300">
                      Total Prize Pool to Distribute
                    </span>
                    <span className="text-lg font-black text-pmb-gold">
                      €{(preview.grandTotal / 1_000_000).toLocaleString()},000,000
                    </span>
                  </div>
                </>
              ) : null}
            </div>

            {/* Modal Actions */}
            <div className="border-t border-pmb-border/80 bg-black/60 px-6 py-4 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-gray-400 hover:text-white transition"
              >
                Close
              </button>

              {status === "ACTIVE" && preview && !successMsg && (
                <button
                  type="button"
                  onClick={handleConfirmFinish}
                  disabled={loading}
                  className="inline-flex items-center gap-2 rounded-xl border border-pmb-gold/60 bg-pmb-gold px-5 py-2 text-xs font-bold text-black shadow-lg shadow-pmb-gold/20 transition hover:bg-yellow-400 hover:scale-105 active:scale-95 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <span className="inline-block animate-spin">⚽</span>
                      <span>Distributing Prizes...</span>
                    </>
                  ) : (
                    <>
                      <span>👑</span>
                      <span>Confirm & Distribute €{(preview.grandTotal / 1_000_000).toLocaleString()}M</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
