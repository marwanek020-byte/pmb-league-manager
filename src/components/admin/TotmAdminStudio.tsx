"use client";

import { useState, useEffect } from "react";
import { ClubBadge } from "@/components/ClubBadge";

export function TotmAdminStudio() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function loadData() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/totm");
      const json = await res.json();
      if (res.ok) {
        setData(json);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleNominate() {
    setProcessing(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/totm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "nominate" }),
      });
      const json = await res.json();
      if (res.ok) {
        setMessage({ type: "success", text: "✅ " + json.message });
        loadData();
      } else {
        setMessage({ type: "error", text: json.error || "Failed to nominate teams" });
      }
    } catch (err) {
      setMessage({ type: "error", text: "Network error during nomination" });
    } finally {
      setProcessing(false);
    }
  }

  async function handleFinalize() {
    if (!confirm("Are you sure you want to finalize the Team of the Month and distribute €53,000,000 in prizes?")) {
      return;
    }

    setProcessing(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/totm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "finalize", pollId: data?.activePoll?.id }),
      });
      const json = await res.json();
      if (res.ok) {
        setMessage({
          type: "success",
          text: `🎉 Team of the Month Finalized! €53,000,000 distributed to: 1st (${json.result?.awardedClubs?.[0]?.clubName} - €20M), 2nd (€12M), 3rd (€11M), 4th (€10M)!`,
        });
        loadData();
      } else {
        setMessage({ type: "error", text: json.error || "Failed to finalize award" });
      }
    } catch (err) {
      setMessage({ type: "error", text: "Network error during finalization" });
    } finally {
      setProcessing(false);
    }
  }

  const topNominees = data?.topNominees || [];
  const activePoll = data?.activePoll;
  const totalVotes = activePoll?.options?.reduce((s: number, o: any) => s + o.voteCount, 0) || 0;

  return (
    <div className="pmb-card p-6 border-pmb-gold space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-pmb-border/60 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">🏆</span>
            <h3 className="text-lg font-extrabold text-white">
              Official PMB Team of the Month Studio (TOTM)
            </h3>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Evaluates the last 4 rounds across all leagues (60% AI Performance + 40% Community Vote). Total Monthly Prize Pool: <span className="text-emerald-400 font-bold">€53,000,000</span>
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleNominate}
            disabled={processing}
            className="text-xs font-bold px-3.5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:brightness-110 transition shadow-md disabled:opacity-50 flex items-center gap-1.5"
          >
            <span>⚡</span>
            <span>{activePoll ? "Re-Analyze & Nominate Top 4" : "Analyze Last 4 Rounds & Nominate"}</span>
          </button>

          {activePoll && (
            <button
              onClick={handleFinalize}
              disabled={processing}
              className="text-xs font-bold px-4 py-2 bg-gradient-to-r from-pmb-gold to-yellow-500 text-pmb-black rounded-xl hover:brightness-110 transition shadow-md shadow-pmb-gold/20 disabled:opacity-50 flex items-center gap-1.5 animate-pulse"
            >
              <span>👑</span>
              <span>Finalize & Distribute €53M Prizes</span>
            </button>
          )}
        </div>
      </div>

      {/* Prize Matrix Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-2xl bg-black/60 border border-pmb-gold/30 text-xs">
        <div className="p-2.5 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-center">
          <span className="text-gray-400 block text-[10px] uppercase font-bold">🥇 1st Place Champion</span>
          <span className="text-yellow-400 font-black text-sm sm:text-base">+€20,000,000</span>
        </div>
        <div className="p-2.5 rounded-xl bg-slate-300/10 border border-slate-300/30 text-center">
          <span className="text-gray-400 block text-[10px] uppercase font-bold">🥈 2nd Place</span>
          <span className="text-slate-200 font-black text-sm sm:text-base">+€12,000,000</span>
        </div>
        <div className="p-2.5 rounded-xl bg-amber-600/10 border border-amber-600/30 text-center">
          <span className="text-gray-400 block text-[10px] uppercase font-bold">🥉 3rd Place</span>
          <span className="text-amber-400 font-black text-sm sm:text-base">+€11,000,000</span>
        </div>
        <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-center">
          <span className="text-gray-400 block text-[10px] uppercase font-bold">🏅 4th Place</span>
          <span className="text-emerald-400 font-black text-sm sm:text-base">+€10,000,000</span>
        </div>
      </div>

      {message && (
        <div
          className={[
            "p-3 rounded-xl text-xs font-semibold text-center border",
            message.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
              : "bg-red-500/10 border-red-500/30 text-red-300",
          ].join(" ")}
        >
          {message.text}
        </div>
      )}

      {/* Top 4 Nominees Cards */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-pmb-gold">
            Top 4 Standout Teams (Last 4 Rounds AI Calculus & Voting)
          </h4>
          {activePoll && (
            <span className="text-[11px] font-bold text-gray-400 bg-black/50 px-2 py-0.5 rounded-md border border-white/10">
              🗳️ Community Votes: {totalVotes}
            </span>
          )}
        </div>

        {loading ? (
          <div className="py-8 text-center text-xs text-pmb-gold animate-pulse">
            Analyzing performance across all leagues...
          </div>
        ) : topNominees.length === 0 ? (
          <div className="p-8 text-center text-xs text-gray-500 rounded-xl bg-pmb-dark border border-pmb-border">
            No completed match data found. Click "Analyze Last 4 Rounds & Nominate" once matchdays are played.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {topNominees.map((club: any, index: number) => {
              const matchingPollOption = activePoll?.options?.find(
                (o: any) => o.clubName.toLowerCase() === club.clubName.toLowerCase()
              );
              const voteCount = matchingPollOption?.voteCount || 0;
              const votePercent = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 25;
              const finalProjected = Number((club.aiScore * 0.6 + votePercent * 0.4).toFixed(1));

              const prizeBadges = [
                { rank: "1st", amount: "€20M", color: "text-yellow-400 border-yellow-400/40 bg-yellow-400/10" },
                { rank: "2nd", amount: "€12M", color: "text-slate-200 border-slate-300/40 bg-slate-300/10" },
                { rank: "3rd", amount: "€11M", color: "text-amber-400 border-amber-600/40 bg-amber-600/10" },
                { rank: "4th", amount: "€10M", color: "text-emerald-400 border-emerald-500/40 bg-emerald-500/10" },
              ];

              const badge = prizeBadges[index] || prizeBadges[3];

              return (
                <div
                  key={club.clubId}
                  className="relative p-4 rounded-2xl bg-pmb-dark border border-pmb-border/60 hover:border-pmb-gold/50 transition space-y-3 flex flex-col justify-between"
                >
                  <div>
                    {/* Header: Rank + Projected Prize */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-pmb-gold bg-black/60 px-2 py-0.5 rounded-md border border-pmb-gold/30">
                        Rank #{index + 1}
                      </span>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${badge.color}`}>
                        {badge.amount} Prize
                      </span>
                    </div>

                    {/* Club Info */}
                    <div className="flex items-center gap-3 mt-3">
                      <ClubBadge name={club.clubName} logo={club.clubLogo} size="md" />
                      <div className="truncate">
                        <h5 className="text-sm font-bold text-white truncate">{club.clubName}</h5>
                        <p className="text-[10px] text-gray-400">{club.leagueName}</p>
                      </div>
                    </div>

                    {/* Stats Pill */}
                    <div className="grid grid-cols-3 gap-1 mt-3 p-2 rounded-xl bg-black/40 text-center text-[10px]">
                      <div>
                        <span className="text-gray-500 block text-[8px] uppercase font-bold">Record</span>
                        <span className="text-white font-bold">{club.wins}W-{club.draws}D-{club.losses}L</span>
                      </div>
                      <div>
                        <span className="text-gray-500 block text-[8px] uppercase font-bold">Goals</span>
                        <span className="text-emerald-400 font-bold">{club.goalsFor}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 block text-[8px] uppercase font-bold">Clean Sheets</span>
                        <span className="text-sky-400 font-bold">{club.cleanSheets}</span>
                      </div>
                    </div>
                  </div>

                  {/* Combined Score Calculation */}
                  <div className="pt-2 border-t border-pmb-border/40 space-y-1 text-[11px]">
                    <div className="flex items-center justify-between text-gray-400">
                      <span>🤖 AI Score (60%):</span>
                      <span className="font-bold text-white">{club.aiScore} pts</span>
                    </div>
                    <div className="flex items-center justify-between text-gray-400">
                      <span>🗳️ Votes (40%):</span>
                      <span className="font-bold text-cyan-300">{votePercent}% ({voteCount} votes)</span>
                    </div>
                    <div className="flex items-center justify-between text-pmb-gold font-bold pt-1 border-t border-white/5">
                      <span>Final Projected:</span>
                      <span className="text-xs font-black">{finalProjected} pts</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
