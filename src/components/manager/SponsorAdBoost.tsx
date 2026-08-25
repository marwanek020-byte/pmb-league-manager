"use client";

import { useState, useEffect, useCallback } from "react";

interface AdStatus {
  viewsInLast24h: number;
  maxDailyViews: number;
  remainingViews: number;
  rewardPerView: number;
  canWatch: boolean;
}

export function SponsorAdBoost({ onRewardClaimed }: { onRewardClaimed?: (newBalance?: number) => void }) {
  const [status, setStatus] = useState<AdStatus | null>(null);
  const [loading, setLoading] = useState(true);

  // Watching state
  const [isWatching, setIsWatching] = useState(false);
  const [countdown, setCountdown] = useState(15);
  const [canClaim, setCanClaim] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [claimSuccess, setClaimSuccess] = useState<string | null>(null);
  const [claimError, setClaimError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/manager/rewards/ad");
      const data = await res.json();
      if (res.ok) {
        setStatus(data);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Countdown timer for 15s ad view
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isWatching && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    } else if (isWatching && countdown === 0) {
      setCanClaim(true);
    }
    return () => clearInterval(timer);
  }, [isWatching, countdown]);

  function startWatchingAd() {
    setClaimError(null);
    setClaimSuccess(null);
    setCountdown(15);
    setCanClaim(false);
    setIsWatching(true);

    // If Monetag tag or custom ad trigger exists on window, invoke it
    try {
      if (typeof window !== "undefined" && (window as any).show_88) {
        (window as any).show_88();
      }
    } catch {
      // ignore
    }
  }

  async function handleClaimReward() {
    if (!canClaim || claiming) return;

    setClaiming(true);
    setClaimError(null);

    try {
      const res = await fetch("/api/manager/rewards/ad", {
        method: "POST",
      });
      const data = await res.json();

      if (res.ok) {
        setClaimSuccess(`🎉 Congratulations! +€200,000 was added to your club budget! (${data.remainingViews} ads left today)`);
        await fetchStatus();
        if (onRewardClaimed) {
          onRewardClaimed(data.newBalance);
        }
        // Auto-close modal after 2.5 seconds
        setTimeout(() => {
          setIsWatching(false);
          setClaimSuccess(null);
          setCanClaim(false);
        }, 2500);
      } else {
        setClaimError(data.error || "Failed to claim reward.");
      }
    } catch {
      setClaimError("Network error while claiming reward.");
    } finally {
      setClaiming(false);
    }
  }

  if (loading) {
    return (
      <div className="pmb-card p-5 border border-pmb-gold/30 animate-pulse flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-pmb-gold/20" />
          <div className="space-y-1">
            <div className="w-32 h-4 bg-pmb-gold/20 rounded" />
            <div className="w-48 h-3 bg-gray-700 rounded" />
          </div>
        </div>
        <div className="w-24 h-8 bg-pmb-gold/20 rounded-lg" />
      </div>
    );
  }

  if (!status) return null;

  const progressPercent = Math.min(100, Math.round((status.viewsInLast24h / status.maxDailyViews) * 100));

  return (
    <>
      {/* Sponsor Boost Card */}
      <div className="relative overflow-hidden rounded-2xl border-2 border-pmb-gold/40 bg-gradient-to-r from-amber-950/40 via-black to-yellow-950/40 p-5 sm:p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 relative z-10">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-yellow-400 via-pmb-gold to-amber-600 flex items-center justify-center text-2xl shadow-lg shadow-pmb-gold/20 border border-yellow-300 shrink-0">
              📺
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-widest text-pmb-gold">
                  PMB Sponsor Video Boost
                </span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                  +€200,000 per ad
                </span>
                <span className="text-[10px] bg-yellow-500/20 text-yellow-300 border border-yellow-500/40 px-2 py-0.5 rounded-full font-bold">
                  {status.viewsInLast24h} / {status.maxDailyViews} Today
                </span>
              </div>
              <h3 className="text-lg sm:text-xl font-black text-white mt-1">
                Watch Sponsor Video to Earn Club Budget
              </h3>
              <p className="text-xs text-gray-300 mt-0.5">
                Watch a 15-second sponsor video to add <strong>+€200,000</strong> to your club's balance. Up to 10 views every 24 hours (Earn up to <strong>€2,000,000</strong> daily)!
              </p>

              {/* Progress Bar */}
              <div className="mt-3 flex items-center gap-3">
                <div className="flex-1 h-2 rounded-full bg-black/60 border border-pmb-border/60 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-yellow-400 to-emerald-400 transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <span className="text-[11px] font-bold text-gray-400 shrink-0">
                  {status.remainingViews} claims left
                </span>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <div className="shrink-0 flex items-center justify-end">
            {status.canWatch ? (
              <button
                type="button"
                onClick={startWatchingAd}
                className="w-full sm:w-auto px-5 py-3 rounded-xl bg-gradient-to-r from-yellow-400 via-pmb-gold to-amber-500 text-black font-extrabold text-xs shadow-lg shadow-pmb-gold/25 hover:scale-105 active:scale-95 transition flex items-center justify-center gap-2 border border-yellow-200"
              >
                <span className="text-base">▶</span>
                <span>Watch Ad (+€200,000)</span>
              </button>
            ) : (
              <div className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-gray-800/80 border border-gray-700 text-gray-400 font-bold text-xs text-center">
                ✓ 10/10 Limit Reached
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── 15-Second Interactive Watch Ad Modal ── */}
      {isWatching && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md"
          onClick={() => {
            if (canClaim) setIsWatching(false);
          }}
        >
          <div
            className="pmb-card w-full max-w-md p-6 sm:p-8 border-2 border-pmb-gold/50 shadow-2xl space-y-6 bg-pmb-dark-surface text-center relative overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-pmb-border/60 pb-3">
              <div className="flex items-center gap-2 text-left">
                <span className="text-xl">📺</span>
                <div>
                  <h4 className="text-sm font-black text-white">Sponsor Video Stream</h4>
                  <p className="text-[10px] text-pmb-gold font-bold">PMB Official Commercial Partner</p>
                </div>
              </div>
              {canClaim && (
                <button
                  type="button"
                  onClick={() => setIsWatching(false)}
                  className="text-gray-400 hover:text-white text-lg font-bold"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Visual Sponsor Video Box */}
            <div className="relative aspect-video rounded-2xl bg-gradient-to-br from-yellow-950/40 via-black to-emerald-950/40 border border-pmb-gold/30 flex flex-col items-center justify-center p-6 overflow-hidden shadow-inner">
              <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#d4af37_1px,transparent_1px)] [background-size:16px_16px]" />

              {!canClaim ? (
                <div className="relative z-10 space-y-3">
                  {/* Countdown Ring */}
                  <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                      <path
                        className="text-gray-800"
                        strokeWidth="3.5"
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                      <path
                        className="text-pmb-gold transition-all duration-1000"
                        strokeDasharray={`${((15 - countdown) / 15) * 100}, 100`}
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                    </svg>
                    <span className="absolute text-2xl font-black text-white">{countdown}s</span>
                  </div>

                  <div>
                    <p className="text-xs font-bold text-white">Sponsor Ad Playing...</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">Please wait {countdown} seconds to unlock your reward</p>
                  </div>
                </div>
              ) : (
                <div className="relative z-10 space-y-2 animate-bounce">
                  <span className="text-5xl">🎁</span>
                  <p className="text-sm font-black text-emerald-400">Ad Complete!</p>
                  <p className="text-xs text-pmb-gold font-bold">Your +€200,000 Reward is Ready!</p>
                </div>
              )}
            </div>

            {/* Error or Success feedback */}
            {claimError && (
              <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-xs text-red-300 font-bold">
                {claimError}
              </div>
            )}
            {claimSuccess && (
              <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-xs text-emerald-300 font-black">
                {claimSuccess}
              </div>
            )}

            {/* Claim Reward Button */}
            <div>
              <button
                type="button"
                onClick={handleClaimReward}
                disabled={!canClaim || claiming || Boolean(claimSuccess)}
                className={[
                  "w-full py-3.5 rounded-xl font-black text-sm tracking-wide transition-all shadow-xl flex items-center justify-center gap-2",
                  canClaim && !claimSuccess
                    ? "bg-gradient-to-r from-emerald-400 to-teal-500 text-black shadow-emerald-500/30 hover:scale-105 active:scale-95 animate-pulse"
                    : "bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700",
                ].join(" ")}
              >
                {claiming ? (
                  <span>Depositing €200,000 into Club Balance...</span>
                ) : claimSuccess ? (
                  <span>✓ Reward Claimed!</span>
                ) : canClaim ? (
                  <>
                    <span>🎁</span>
                    <span>Claim +€200,000 Reward Now!</span>
                  </>
                ) : (
                  <span>Please wait {countdown}s to claim...</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
