"use client";

import { useEffect, useMemo, useState } from "react";
import { ClubBadge } from "@/components/ClubBadge";
import { Toast } from "@/components/Toast";
import { useToast } from "@/lib/use-toast";

type ClubScoutInfo = {
  id: string;
  name: string;
  logo: string | null;
  managerId: string | null;
  managerUsername: string | null;
  registeredPlayerCount: number;
  budget: number;
  aiScoutEnabled: boolean;
  aiScoutTier: string;
};

type LeagueScoutInfo = {
  id: string;
  name: string;
  country: string;
  clubs: ClubScoutInfo[];
};

type Stats = {
  totalLeagues: number;
  totalClubs: number;
  enabledClubs: number;
  disabledClubs: number;
};

export function AdminAiScoutManager({
  initialLeagues,
  initialStats,
}: {
  initialLeagues: LeagueScoutInfo[];
  initialStats: Stats;
}) {
  const [leagues, setLeagues] = useState<LeagueScoutInfo[]>(initialLeagues);
  const [stats, setStats] = useState<Stats>(initialStats);
  const [search, setSearch] = useState("");
  const [selectedLeagueId, setSelectedLeagueId] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ENABLED" | "DISABLED">("ALL");
  const [loadingClubId, setLoadingClubId] = useState<string | null>(null);
  const [bulkLoadingLeagueId, setBulkLoadingLeagueId] = useState<string | null>(null);

  const { toast, showSuccess, showError, dismiss } = useToast();

  const handleToggleClub = async (club: ClubScoutInfo) => {
    setLoadingClubId(club.id);
    const newStatus = !club.aiScoutEnabled;

    try {
      const res = await fetch("/api/admin/ai-scout/clubs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clubId: club.id,
          aiScoutEnabled: newStatus,
          aiScoutTier: newStatus ? "PRO" : "FREE",
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to update AI Scout status");
      }

      // Update state locally
      setLeagues((prevLeagues) =>
        prevLeagues.map((lg: LeagueScoutInfo) => ({
          ...lg,
          clubs: lg.clubs.map((c: ClubScoutInfo) =>
            c.id === club.id
              ? { ...c, aiScoutEnabled: newStatus, aiScoutTier: newStatus ? "PRO" : "FREE" }
              : c
          ),
        }))
      );

      setStats((prev) => ({
        ...prev,
        enabledClubs: newStatus ? prev.enabledClubs + 1 : prev.enabledClubs - 1,
        disabledClubs: newStatus ? prev.disabledClubs - 1 : prev.disabledClubs + 1,
      }));

      showSuccess(
        newStatus
          ? `🌟 AI Scout PRO enabled for ${club.name}`
          : `AI Scout disabled for ${club.name}`
      );
    } catch (err: any) {
      showError(err.message || "Failed to update club");
    } finally {
      setLoadingClubId(null);
    }
  };

  const handleBulkToggle = async (leagueId: string, enable: boolean) => {
    setBulkLoadingLeagueId(leagueId);

    try {
      const res = await fetch("/api/admin/ai-scout/clubs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leagueId,
          aiScoutEnabled: enable,
          aiScoutTier: enable ? "PRO" : "FREE",
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to bulk update AI Scout status");
      }

      // Refresh leagues from server
      const refreshRes = await fetch("/api/admin/ai-scout/clubs");
      if (refreshRes.ok) {
        const data = await refreshRes.json();
        setLeagues(data.leagues);
        setStats(data.stats);
      }

      showSuccess(
        enable
          ? `🌟 Enabled AI Scout PRO for all clubs in league`
          : `Disabled AI Scout for all clubs in league`
      );
    } catch (err: any) {
      showError(err.message || "Failed to bulk update");
    } finally {
      setBulkLoadingLeagueId(null);
    }
  };

  const filteredLeagues = useMemo(() => {
    const q = search.trim().toLowerCase();

    return (leagues || []).map((league: LeagueScoutInfo) => {
      if (selectedLeagueId !== "ALL" && league.id !== selectedLeagueId) {
        return { ...league, clubs: [] };
      }

      const matchingClubs = league.clubs.filter((club: ClubScoutInfo) => {
        const matchesSearch =
          !q ||
          club.name.toLowerCase().includes(q) ||
          club.managerUsername?.toLowerCase().includes(q) ||
          league.name.toLowerCase().includes(q);

        const matchesStatus =
          statusFilter === "ALL" ||
          (statusFilter === "ENABLED" && club.aiScoutEnabled) ||
          (statusFilter === "DISABLED" && !club.aiScoutEnabled);

        return matchesSearch && matchesStatus;
      });

      return {
        ...league,
        clubs: matchingClubs,
      };
    }).filter((lg) => lg.clubs.length > 0);
  }, [leagues, search, selectedLeagueId, statusFilter]);

  return (
    <div className="space-y-8">
      <Toast toast={toast} onDismiss={dismiss} />

      {/* Hero Header */}
      <section className="relative overflow-hidden rounded-2xl border border-pmb-gold/30 bg-gradient-to-r from-pmb-black via-pmb-charcoal to-pmb-black p-6 sm:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-pmb-gold/40 bg-pmb-gold/10 px-3 py-1 text-xs font-bold text-pmb-gold uppercase tracking-wider mb-3">
              <span>🤖 PMB AI Engine</span>
              <span>•</span>
              <span>Paid VIP Access Controller</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-bold font-serif text-white tracking-tight">
              AI Chief Scout <span className="text-pmb-gold">Subscription Hub</span>
            </h1>
            <p className="mt-2 text-sm text-gray-300 leading-relaxed">
              Control which clubs have access to the Chief Scout AI, positional gap analysis,
              live auction bidding advisors, and tactical match preparation tools.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-xl border border-pmb-gold/20 bg-black/60 px-4 py-3 text-center min-w-[110px]">
              <p className="text-2xl font-bold text-pmb-gold">{stats.enabledClubs}</p>
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">VIP Active</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/60 px-4 py-3 text-center min-w-[110px]">
              <p className="text-2xl font-bold text-gray-300">{stats.disabledClubs}</p>
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Standard (Locked)</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/60 px-4 py-3 text-center min-w-[110px]">
              <p className="text-2xl font-bold text-white">{stats.totalClubs}</p>
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Total Clubs</p>
            </div>
          </div>
        </div>
      </section>

      {/* Filter Controls */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="flex-1 flex flex-col sm:flex-row gap-3">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search club, manager, or league..."
            className="pmb-input flex-1"
          />

          <select
            value={selectedLeagueId}
            onChange={(e) => setSelectedLeagueId(e.target.value)}
            className="pmb-input sm:w-56"
          >
            <option value="ALL">All Leagues ({Array.isArray(leagues) ? leagues.length : 0})</option>
            {Array.isArray(leagues) &&
              leagues.map((lg) => (
                <option key={lg.id} value={lg.id}>
                  {lg.name}
                </option>
              ))}
          </select>
        </div>

        <div className="flex items-center gap-1 rounded-xl border border-pmb-gold/20 bg-pmb-charcoal/80 p-1 self-start md:self-auto">
          <button
            onClick={() => setStatusFilter("ALL")}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
              statusFilter === "ALL"
                ? "bg-pmb-gold text-black shadow"
                : "text-gray-400 hover:text-white"
            }`}
          >
            All Clubs
          </button>
          <button
            onClick={() => setStatusFilter("ENABLED")}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
              statusFilter === "ENABLED"
                ? "bg-emerald-500 text-black shadow"
                : "text-gray-400 hover:text-white"
            }`}
          >
            🌟 VIP Active ({stats.enabledClubs})
          </button>
          <button
            onClick={() => setStatusFilter("DISABLED")}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
              statusFilter === "DISABLED"
                ? "bg-gray-700 text-white shadow"
                : "text-gray-400 hover:text-white"
            }`}
          >
            🔒 Locked ({stats.disabledClubs})
          </button>
        </div>
      </div>

      {/* Clubs List grouped by League */}
      {filteredLeagues.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-pmb-charcoal/40 p-12 text-center">
          <p className="text-lg text-gray-300">No clubs match the current filter criteria.</p>
          <p className="mt-1 text-xs text-gray-500">Try adjusting your search terms or status filter.</p>
        </div>
      ) : (
        <div className="space-y-10">
          {filteredLeagues.map((league) => (
            <div key={league.id} className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-pmb-gold/20 pb-3">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-bold text-white font-serif">{league.name}</h2>
                  <span className="rounded-full bg-pmb-gold/15 px-2.5 py-0.5 text-xs font-bold text-pmb-gold border border-pmb-gold/30">
                    {league.clubs.length} clubs
                  </span>
                  <span className="text-xs text-gray-500">{league.country}</span>
                </div>

                {/* Bulk Action Buttons */}
                <div className="flex items-center gap-2">
                  <button
                    disabled={bulkLoadingLeagueId === league.id}
                    onClick={() => handleBulkToggle(league.id, true)}
                    className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 text-xs font-bold text-emerald-400 hover:bg-emerald-500/20 transition disabled:opacity-50"
                  >
                    {bulkLoadingLeagueId === league.id ? "Updating..." : "🌟 Enable All League"}
                  </button>
                  <button
                    disabled={bulkLoadingLeagueId === league.id}
                    onClick={() => handleBulkToggle(league.id, false)}
                    className="rounded-lg border border-red-500/30 bg-red-500/10 px-2.5 py-1 text-xs font-bold text-red-400 hover:bg-red-500/20 transition disabled:opacity-50"
                  >
                    {bulkLoadingLeagueId === league.id ? "Updating..." : "🔒 Disable All"}
                  </button>
                </div>
              </div>

              {/* Clubs Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {league.clubs.map((club) => (
                  <div
                    key={club.id}
                    className={`rounded-xl border p-4 transition duration-200 flex flex-col justify-between ${
                      club.aiScoutEnabled
                        ? "border-pmb-gold/50 bg-gradient-to-b from-pmb-charcoal/90 to-pmb-gold/5 shadow-[0_0_15px_rgba(212,175,55,0.08)]"
                        : "border-white/10 bg-pmb-charcoal/40 opacity-80 hover:opacity-100"
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <ClubBadge name={club.name} logo={club.logo} size="md" />
                          <div className="min-w-0">
                            <p className="font-bold text-white truncate text-base">{club.name}</p>
                            <p className="text-xs text-gray-400 truncate">
                              👤 {club.managerUsername ?? "No Manager"}
                            </p>
                          </div>
                        </div>

                        {club.aiScoutEnabled ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-pmb-gold/60 bg-pmb-gold/20 px-2.5 py-0.5 text-[11px] font-extrabold text-pmb-gold shadow-sm animate-pulse">
                            <span>🌟 VIP PRO</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full border border-gray-700 bg-gray-800/80 px-2 py-0.5 text-[10px] font-semibold text-gray-400">
                            <span>🔒 LOCKED</span>
                          </span>
                        )}
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-2 text-xs border-t border-white/5 pt-3">
                        <div>
                          <span className="text-gray-500">Squad:</span>{" "}
                          <span className="font-semibold text-gray-200">{club.registeredPlayerCount} players</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Budget:</span>{" "}
                          <span className="font-semibold text-pmb-gold">
                            €{(club.budget / 1_000_000).toFixed(1)}M
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Toggle Button */}
                    <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between gap-2">
                      <span className="text-[11px] text-gray-400">
                        {club.aiScoutEnabled ? "AI Scout is Active" : "AI Scout is Inactive"}
                      </span>

                      <button
                        type="button"
                        disabled={loadingClubId === club.id}
                        onClick={() => handleToggleClub(club)}
                        className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition flex items-center gap-1.5 ${
                          club.aiScoutEnabled
                            ? "bg-red-500/20 text-red-300 border border-red-500/40 hover:bg-red-500/30"
                            : "bg-pmb-gold text-black border border-pmb-gold hover:bg-white hover:border-white shadow"
                        } disabled:opacity-50`}
                      >
                        {loadingClubId === club.id ? (
                          <span className="animate-spin text-xs">⏳</span>
                        ) : club.aiScoutEnabled ? (
                          "Revoke Access"
                        ) : (
                          "🌟 Grant VIP Access"
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
