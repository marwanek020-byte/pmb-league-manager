"use client";

import { useState, useEffect } from "react";
import { ClubBadge } from "@/components/ClubBadge";

type PollOption = {
  id: string;
  managerId: string;
  managerName: string;
  clubName: string;
  clubLogo: string | null;
  statement: string | null;
  voteCount: number;
  percentage: number;
};

type Poll = {
  id: string;
  title: string;
  description: string | null;
  month: string;
  totalVotes: number;
  userVotedOptionId: string | null;
  hasVoted: boolean;
  options: PollOption[];
};

type Props = {
  isAdmin?: boolean;
};

export function ManagerPollWidget({ isAdmin = false }: Props) {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);
  const [votingId, setVotingId] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [adminMsg, setAdminMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function loadPolls() {
    try {
      const res = await fetch("/api/polls");
      const data = await res.json();
      if (res.ok && data.polls) {
        setPolls(data.polls);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPolls();
  }, []);

  async function handleVote(pollId: string, optionId: string) {
    setVotingId(optionId);
    try {
      const res = await fetch(`/api/polls/${pollId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ optionId }),
      });
      const data = await res.json();
      if (res.ok && data.poll) {
        setPolls((prev) =>
          prev.map((p) => (p.id === pollId ? data.poll : p))
        );
      }
    } catch (err) {
      console.error(err);
    } finally {
      setVotingId(null);
    }
  }

  // Admin action: recalculate last 4 rounds and nominate top 4 clubs
  async function handleNominate() {
    setProcessing(true);
    setAdminMsg(null);
    try {
      const res = await fetch("/api/admin/totm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "nominate" }),
      });
      const json = await res.json();
      if (res.ok) {
        setAdminMsg({ type: "success", text: "✅ Top 4 Teams of the Month nominated from the last 4 rounds!" });
        loadPolls();
      } else {
        setAdminMsg({ type: "error", text: json.error || "Failed to nominate" });
      }
    } catch (err) {
      setAdminMsg({ type: "error", text: "Network error" });
    } finally {
      setProcessing(false);
    }
  }

  // Admin action: finalize month and distribute 53M EUR prizes
  async function handleFinalize(pollId: string) {
    if (!confirm("Are you sure you want to finalize the Team of the Month and distribute €53,000,000 in prizes?")) {
      return;
    }

    setProcessing(true);
    setAdminMsg(null);
    try {
      const res = await fetch("/api/admin/totm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "finalize", pollId }),
      });
      const json = await res.json();
      if (res.ok) {
        setAdminMsg({
          type: "success",
          text: `🎉 Team of the Month Awarded! €53M distributed to: 1st (${json.result?.awardedClubs?.[0]?.clubName} - €20M), 2nd (€12M), 3rd (€11M), 4th (€10M)!`,
        });
        loadPolls();
      } else {
        setAdminMsg({ type: "error", text: json.error || "Failed to finalize" });
      }
    } catch (err) {
      setAdminMsg({ type: "error", text: "Network error" });
    } finally {
      setProcessing(false);
    }
  }

  const prizeTiers = [
    { rank: "1st", badge: "🥇 €20,000,000 Prize", style: "text-yellow-400 bg-yellow-500/15 border-yellow-500/40" },
    { rank: "2nd", badge: "🥈 €12,000,000 Prize", style: "text-slate-200 bg-slate-300/15 border-slate-300/40" },
    { rank: "3rd", badge: "🥉 €11,000,000 Prize", style: "text-amber-400 bg-amber-600/15 border-amber-600/40" },
    { rank: "4th", badge: "🏅 €10,000,000 Prize", style: "text-emerald-400 bg-emerald-500/15 border-emerald-500/40" },
  ];

  if (loading) return null;

  return (
    <div className="space-y-4 mb-6">
      {polls.length === 0 && isAdmin ? (
        <div className="p-6 rounded-2xl bg-gradient-to-br from-pmb-dark-surface via-pmb-black to-pmb-dark-surface border-2 border-pmb-gold/50 shadow-xl shadow-pmb-gold/10 text-center space-y-3">
          <span className="text-3xl">🏆</span>
          <h3 className="text-base font-bold text-white">Official PMB Team of the Month (TOTM)</h3>
          <p className="text-xs text-gray-400 max-w-md mx-auto">
            Click below to analyze the last 4 rounds across all leagues, calculate AI performance scores, and nominate the Top 4 Clubs for the €53,000,000 monthly prizes!
          </p>
          <button
            onClick={handleNominate}
            disabled={processing}
            className="pmb-btn-primary text-xs px-4 py-2"
          >
            {processing ? "Analyzing Last 4 Rounds..." : "⚡ Analyze Last 4 Rounds & Nominate Top 4 Teams"}
          </button>
          {adminMsg && (
            <p className="text-xs text-emerald-400 font-bold mt-2">{adminMsg.text}</p>
          )}
        </div>
      ) : (
        polls.map((poll) => (
          <div
            key={poll.id}
            className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-pmb-dark-surface via-pmb-black to-pmb-dark-surface border-2 border-pmb-gold/60 shadow-xl shadow-pmb-gold/15 p-5 space-y-4"
          >
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
              <div className="flex items-center gap-3">
                <span className="text-3xl">🏆</span>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-pmb-gold/20 text-pmb-gold border border-pmb-gold/30">
                      Official PMB Vote
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      60% AI Score (Last 4 Rounds) + 40% Community Vote
                    </span>
                    <span className="text-xs text-gray-400 font-medium">
                      {poll.totalVotes} {poll.totalVotes === 1 ? "vote" : "votes"}
                    </span>
                  </div>
                  <h3 className="text-base sm:text-lg font-extrabold text-white tracking-tight mt-1">
                    {poll.title}
                  </h3>
                </div>
              </div>

              {/* Admin Actions / Prize Tag */}
              <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
                <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  💰 Prizes: 🥇 €20M • 🥈 €12M • 🥉 €11M • 🏅 €10M
                </span>

                {isAdmin && (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={handleNominate}
                      disabled={processing}
                      className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-blue-600/30 text-blue-300 border border-blue-500/40 hover:bg-blue-600/50 transition disabled:opacity-50"
                      title="Recalculate last 4 rounds and refresh nominees"
                    >
                      🔄 Recalculate Top 4
                    </button>
                    <button
                      onClick={() => handleFinalize(poll.id)}
                      disabled={processing}
                      className="text-[10px] font-black px-3 py-1 rounded-lg bg-gradient-to-r from-pmb-gold to-yellow-400 text-black hover:brightness-110 shadow-md transition disabled:opacity-50 flex items-center gap-1"
                    >
                      <span>👑</span>
                      <span>Finalize & Distribute €53M</span>
                    </button>
                  </div>
                )}

                {poll.hasVoted && (
                  <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full flex items-center gap-1">
                    <span>✓</span> Voted
                  </span>
                )}
              </div>
            </div>

            {adminMsg && (
              <div
                className={[
                  "p-3 rounded-xl text-xs font-semibold text-center border",
                  adminMsg.type === "success"
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                    : "bg-red-500/10 border-red-500/30 text-red-300",
                ].join(" ")}
              >
                {adminMsg.text}
              </div>
            )}

            {poll.description && (
              <p className="text-xs text-gray-300 leading-relaxed">{poll.description}</p>
            )}

            {/* Candidates List (Top 4) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {poll.options.map((opt, index) => {
                const isSelected = poll.userVotedOptionId === opt.id;
                const isVotingThis = votingId === opt.id;
                const tier = prizeTiers[index] || prizeTiers[3];

                return (
                  <div
                    key={opt.id}
                    onClick={() => {
                      if (!poll.hasVoted && !votingId) {
                        handleVote(poll.id, opt.id);
                      }
                    }}
                    className={[
                      "relative overflow-hidden rounded-2xl border p-3.5 transition-all flex flex-col justify-between",
                      poll.hasVoted
                        ? isSelected
                          ? "border-pmb-gold bg-pmb-gold/15 shadow-md shadow-pmb-gold/10"
                          : "border-pmb-border/50 bg-pmb-dark/60"
                        : "border-pmb-border/80 bg-pmb-dark/80 hover:border-pmb-gold hover:bg-pmb-gold/5 cursor-pointer",
                    ].join(" ")}
                  >
                    {/* Background Animated Percentage Bar if voted */}
                    {poll.hasVoted && (
                      <div
                        className={[
                          "absolute top-0 bottom-0 left-0 transition-all duration-700 opacity-20",
                          isSelected ? "bg-pmb-gold" : "bg-white",
                        ].join(" ")}
                        style={{ width: `${opt.percentage}%` }}
                      />
                    )}

                    <div className="relative z-10 space-y-2">
                      {/* Top Rank Badge & Projected Prize */}
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-pmb-gold bg-black/60 px-2 py-0.5 rounded border border-pmb-gold/30 uppercase">
                          Nominee #{index + 1}
                        </span>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${tier.style}`}>
                          {tier.badge}
                        </span>
                      </div>

                      {/* Club Info */}
                      <div className="flex items-center gap-3">
                        <ClubBadge name={opt.clubName} logo={opt.clubLogo} size="md" />
                        <div className="truncate">
                          <p className="text-sm font-bold text-white truncate">
                            {opt.clubName}
                          </p>
                          <span className="text-[10px] text-gray-400 font-medium">
                            {opt.managerName}
                          </span>
                        </div>
                      </div>

                      {/* AI Stats Pill */}
                      {opt.statement && (
                        <p className="text-[11px] text-cyan-300 font-medium bg-black/40 p-2 rounded-xl border border-cyan-500/20">
                          {opt.statement}
                        </p>
                      )}
                    </div>

                    {/* Bottom Action / Vote Result */}
                    <div className="relative z-10 flex items-center justify-between pt-2 mt-2 border-t border-white/5">
                      {poll.hasVoted ? (
                        <div className="flex items-center justify-between w-full">
                          <span className="text-xs text-gray-400 font-bold">
                            {opt.voteCount} {opt.voteCount === 1 ? "vote" : "votes"}
                          </span>
                          <span className="text-sm font-black text-pmb-gold">
                            {opt.percentage}%
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between w-full">
                          <span className="text-[10px] text-gray-500">
                            Click to cast official vote
                          </span>
                          <button
                            type="button"
                            disabled={votingId !== null}
                            className="pmb-btn-primary text-xs px-4 py-1 text-[11px] font-bold"
                          >
                            {isVotingThis ? "Voting..." : "Vote"}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
