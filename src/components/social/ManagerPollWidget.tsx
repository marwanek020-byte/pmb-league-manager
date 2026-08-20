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

export function ManagerPollWidget() {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);
  const [votingId, setVotingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadPolls() {
      try {
        const res = await fetch("/api/polls");
        const data = await res.json();
        if (!cancelled && res.ok && data.polls) {
          setPolls(data.polls);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadPolls();
    return () => {
      cancelled = true;
    };
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

  if (loading || polls.length === 0) return null;

  return (
    <div className="space-y-4 mb-6">
      {polls.map((poll) => (
        <div
          key={poll.id}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-pmb-dark-surface via-pmb-black to-pmb-dark-surface border-2 border-pmb-gold/50 shadow-xl shadow-pmb-gold/10 p-5 space-y-4"
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">🗳️</span>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-pmb-gold/20 text-pmb-gold border border-pmb-gold/30">
                    Official PMB Vote
                  </span>
                  <span className="text-xs text-gray-500 font-medium">
                    {poll.totalVotes} {poll.totalVotes === 1 ? "vote" : "votes"}
                  </span>
                </div>
                <h3 className="text-base font-bold text-white tracking-tight mt-0.5">
                  {poll.title}
                </h3>
              </div>
            </div>

            {poll.hasVoted && (
              <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full flex items-center gap-1">
                <span>✓</span> Voted
              </span>
            )}
          </div>

          {poll.description && (
            <p className="text-xs text-gray-400">{poll.description}</p>
          )}

          {/* Candidates List */}
          <div className="space-y-2">
            {poll.options.map((opt) => {
              const isSelected = poll.userVotedOptionId === opt.id;
              const isVotingThis = votingId === opt.id;

              return (
                <div
                  key={opt.id}
                  onClick={() => {
                    if (!poll.hasVoted && !votingId) {
                      handleVote(poll.id, opt.id);
                    }
                  }}
                  className={[
                    "relative overflow-hidden rounded-xl border p-3 transition-all",
                    poll.hasVoted
                      ? isSelected
                        ? "border-pmb-gold bg-pmb-gold/10"
                        : "border-pmb-border/40 bg-pmb-dark/40"
                      : "border-pmb-border/70 bg-pmb-dark/60 hover:border-pmb-gold hover:bg-pmb-gold/5 cursor-pointer",
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

                  <div className="relative z-10 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <ClubBadge name={opt.clubName} logo={opt.clubLogo} size="sm" />
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-white">
                            {opt.managerName}
                          </p>
                          <span className="text-[10px] text-gray-400 font-medium">
                            ({opt.clubName})
                          </span>
                        </div>
                        {opt.statement && (
                          <p className="text-[11px] text-pmb-gold/80 mt-0.5">
                            {opt.statement}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Right side: Percent or Vote button */}
                    {poll.hasVoted ? (
                      <div className="text-right">
                        <span className="text-sm font-black text-white">
                          {opt.percentage}%
                        </span>
                        <span className="text-[10px] text-gray-500 block">
                          {opt.voteCount} votes
                        </span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        disabled={votingId !== null}
                        className="pmb-btn-primary text-xs px-3 py-1 text-[11px] font-bold"
                      >
                        {isVotingThis ? "Voting..." : "Vote"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
