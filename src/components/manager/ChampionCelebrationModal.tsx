"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type CelebrationData = {
  hasCelebration: boolean;
  seasonId?: string;
  seasonName?: string;
  leagueName?: string;
  isChampion?: boolean;
  clubName?: string;
  clubLogo?: string | null;
  position?: number;
  points?: number;
  standingsPrize?: number;
  individualAwards?: Array<{
    description: string;
    amount: number;
  }>;
  totalPrize?: number;
  currentBudget?: number;
};

export function ChampionCelebrationModal() {
  const [data, setData] = useState<CelebrationData | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    async function checkCelebration() {
      try {
        const res = await fetch("/api/manager/season-celebration");
        if (!res.ok) return;
        const json: CelebrationData = await res.json();

        if (json.hasCelebration && json.seasonId) {
          const ackKey = `pmb_season_celebration_seen_${json.seasonId}`;
          const alreadySeen = localStorage.getItem(ackKey);

          // If not seen yet, display automatically on login!
          if (!alreadySeen) {
            setData(json);
            setOpen(true);
          }
        }
      } catch (err) {
        console.error("Failed to check season celebration:", err);
      }
    }

    checkCelebration();
  }, []);

  function handleDismiss() {
    if (data?.seasonId) {
      localStorage.setItem(
        `pmb_season_celebration_seen_${data.seasonId}`,
        "true"
      );
    }
    setOpen(false);
  }

  if (!open || !data) return null;

  const isChamp = data.isChampion;
  const totalPrizeMillions = Math.round((data.totalPrize ?? 0) / 1_000_000);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl animate-in fade-in duration-300">
      {/* Background Animated Glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-pmb-gold/15 rounded-full blur-[140px] animate-pulse pointer-events-none" />
      </div>

      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-pmb-gold/60 bg-gradient-to-b from-[#1c1a14] via-[#121316] to-black p-7 sm:p-9 text-center shadow-2xl shadow-pmb-gold/25 animate-in zoom-in-95 duration-300">
        {/* Floating Confetti Elements */}
        <div className="absolute top-4 left-6 text-xl animate-bounce">✨</div>
        <div className="absolute top-8 right-8 text-2xl animate-bounce delay-150">🎉</div>
        <div className="absolute bottom-6 left-8 text-xl animate-bounce delay-300">⭐</div>
        <div className="absolute bottom-10 right-6 text-xl animate-bounce delay-75">🎊</div>

        {/* Trophy / Crest Emblem */}
        <div className="relative mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full border-2 border-pmb-gold/60 bg-gradient-to-tr from-pmb-gold/30 via-yellow-400/20 to-transparent shadow-xl shadow-pmb-gold/20">
          <span className="text-5xl animate-pulse">
            {isChamp ? "🏆" : "🎖️"}
          </span>
        </div>

        {/* Crown Title */}
        <p className="text-[11px] font-extrabold uppercase tracking-[.3em] text-pmb-gold">
          {data.leagueName} · {data.seasonName}
        </p>

        <h2 className="mt-2 text-3xl sm:text-4xl font-black text-white tracking-tight">
          {isChamp ? "CONGRATULATIONS CHAMPIONS!" : `Season Finished · #${data.position}`}
        </h2>

        <p className="mt-2 text-sm text-gray-300">
          {isChamp ? (
            <>
              <strong className="text-white text-base">{data.clubName}</strong> has
              officially won the league title! The federation has credited your champion
              budget rewards.
            </>
          ) : (
            <>
              <strong className="text-white">{data.clubName}</strong> concluded the
              season in position <strong>#{data.position}</strong>. Your official prize
              money has been deposited!
            </>
          )}
        </p>

        {/* Prize Callout Box */}
        <div className="my-6 rounded-2xl border border-pmb-gold/40 bg-black/60 p-4 shadow-inner">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
            Total Season Prize Credited to Club
          </p>
          <p className="mt-1 text-3xl sm:text-4xl font-black text-pmb-gold tracking-tight">
            +€{totalPrizeMillions.toLocaleString()},000,000
          </p>

          {data.standingsPrize && data.standingsPrize > 0 && (
            <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between text-xs text-gray-400">
              <span>Standing Prize (#{data.position}):</span>
              <span className="font-bold text-white">
                €{(data.standingsPrize / 1_000_000).toLocaleString()}M
              </span>
            </div>
          )}

          {data.individualAwards && data.individualAwards.length > 0 && (
            <div className="mt-2 space-y-1 text-left">
              <p className="text-[10px] font-bold uppercase text-pmb-gold/80">
                Individual Honors Bonuses Won:
              </p>
              {data.individualAwards.map((award, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between text-[11px] text-gray-300"
                >
                  <span className="truncate pr-2">{award.description.replace(/^.*Award:\s*/, "")}</span>
                  <span className="font-bold text-emerald-400">
                    +€{(award.amount / 1_000_000).toLocaleString()}M
                  </span>
                </div>
              ))}
            </div>
          )}

          {data.currentBudget !== undefined && (
            <div className="mt-3 pt-2 border-t border-white/10 flex items-center justify-between text-xs">
              <span className="text-gray-400">New Current Budget:</span>
              <span className="font-black text-emerald-400 text-sm">
                €{Math.round(data.currentBudget).toLocaleString()}
              </span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleDismiss}
            className="flex-1 rounded-xl border border-pmb-gold bg-pmb-gold px-5 py-3 text-sm font-extrabold text-black shadow-lg shadow-pmb-gold/25 transition-all hover:bg-yellow-400 hover:scale-[1.02] active:scale-95"
          >
            {isChamp ? "🏆 Claim Glory & Enter Market" : "Accept Rewards & Continue"}
          </button>
          <Link
            href="/manager/social"
            onClick={handleDismiss}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-xs font-bold text-gray-300 transition hover:bg-white/10 hover:text-white"
          >
            Celebrate in Dugout
          </Link>
        </div>
      </div>
    </div>
  );
}
