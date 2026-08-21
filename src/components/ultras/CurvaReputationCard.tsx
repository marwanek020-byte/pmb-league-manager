"use client";

import { useEffect, useState } from "react";
import { SupporterProfile } from "@/lib/services/ultras-gamification-service";

export function CurvaReputationCard({ clubName }: { clubName: string }) {
  const [profile, setProfile] = useState<SupporterProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedLang, setSelectedLang] = useState<"AR" | "FR" | "EN" | "ES">("AR");

  useEffect(() => {
    fetch("/api/manager/ultras/profile")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setProfile(data);
          setSelectedLang(data.preferredLanguage);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [clubName]);

  const handleUpdateLanguage = async (lang: "AR" | "FR" | "EN" | "ES") => {
    setSelectedLang(lang);
    setSaving(true);
    try {
      await fetch("/api/manager/ultras/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferredLanguage: lang }),
      });
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-3xl border border-pmb-gold/30 bg-gradient-to-br from-black via-zinc-950 to-zinc-900 p-6 shadow-[0_15px_45px_rgba(0,0,0,0.85)] backdrop-blur-xl space-y-6">
      {/* Glow */}
      <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-pmb-gold/10 blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4 relative z-10">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-pmb-gold animate-ping" />
            <span className="text-[10px] font-black uppercase tracking-[.25em] text-pmb-gold">
              Curva Gamification & Identity
            </span>
          </div>
          <h3 className="mt-1 text-2xl font-black uppercase tracking-tight text-white">
            👑 Curva Reputation & Supporter Profile
          </h3>
        </div>

        {profile && (
          <div className="flex items-center gap-2 rounded-2xl bg-pmb-gold/10 border border-pmb-gold/30 px-4 py-2">
            <span className="text-xl">{profile.currentTier.badge}</span>
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-pmb-gold">Tier {profile.currentTier.tierLevel}</p>
              <p className="text-xs font-black text-white">{profile.currentTier.title}</p>
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="rounded-2xl border border-white/10 bg-black/60 p-8 text-center backdrop-blur-md">
          <p className="text-xs font-bold text-pmb-gold animate-pulse">
            Loading supporter reputation and trophy history...
          </p>
        </div>
      ) : profile ? (
        <div className="space-y-6 relative z-10">
          {/* XP Progress Bar */}
          <div className="rounded-2xl border border-white/10 bg-black/60 p-5 backdrop-blur-md space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-gray-400">Total Curva XP:</span>
                <span className="ml-2 text-xl font-black text-pmb-gold">{profile.currentXp} XP</span>
              </div>
              {profile.nextTier && (
                <span className="text-xs font-bold text-gray-400">
                  Next: {profile.nextTier.badge} {profile.nextTier.title} ({profile.nextTier.minXp} XP)
                </span>
              )}
            </div>

            <div className="flex h-3 w-full overflow-hidden rounded-full border border-white/10 bg-zinc-900">
              <div
                style={{ width: `${profile.progressPercentage}%` }}
                className="bg-gradient-to-r from-amber-500 to-pmb-gold transition-all duration-700 shadow-[0_0_10px_rgba(212,175,55,0.6)]"
              />
            </div>
            <p className="text-[11px] text-gray-400 font-semibold">{profile.currentTier.description}</p>
          </div>

          {/* Personalization Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Preferred Language */}
            <div className="rounded-2xl border border-white/10 bg-black/60 p-4 backdrop-blur-md space-y-3">
              <span className="text-[10px] font-black uppercase tracking-wider text-pmb-gold">
                🗣️ Preferred Curva Language
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { id: "AR", label: "🇲🇦 Darija" },
                  { id: "EN", label: "🇬🇧 English" },
                  { id: "FR", label: "🇫🇷 Français" },
                  { id: "ES", label: "🇪🇸 Español" },
                ].map((lang) => (
                  <button
                    key={lang.id}
                    onClick={() => handleUpdateLanguage(lang.id as any)}
                    className={`rounded-xl border px-2.5 py-1.5 text-xs font-bold transition ${
                      selectedLang === lang.id
                        ? "border-pmb-gold bg-pmb-gold text-black font-black"
                        : "border-white/10 bg-zinc-900/60 text-gray-400 hover:text-white"
                    }`}
                  >
                    {lang.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Favorite Player */}
            <div className="rounded-2xl border border-white/10 bg-black/60 p-4 backdrop-blur-md">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">
                ⭐ Supporter's Chosen Icon
              </span>
              {profile.favoritePlayer ? (
                <div className="mt-2 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-black text-white">{profile.favoritePlayer.fullName}</p>
                    <p className="text-xs text-gray-400 font-semibold">{profile.favoritePlayer.position}</p>
                  </div>
                  <span className="rounded-full bg-emerald-500/20 px-2.5 py-1 text-xs font-black text-emerald-300">
                    {profile.favoritePlayer.overallRating} OVR
                  </span>
                </div>
              ) : (
                <p className="text-xs text-gray-400 mt-2">No icon assigned.</p>
              )}
            </div>

            {/* Manager Reputation & Trophies */}
            <div className="rounded-2xl border border-white/10 bg-black/60 p-4 backdrop-blur-md">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-400">
                🏆 Manager Reputation
              </span>
              <div className="mt-2">
                <p className="text-sm font-black text-white">
                  {profile.managerReputation.titlesDelivered[0]}
                </p>
                <p className="text-xs text-gray-400 font-semibold mt-0.5">
                  {profile.managerReputation.totalWins} Career Matches Won
                </p>
              </div>
            </div>
          </div>

          {/* Unlocked Perks List */}
          <div className="rounded-2xl border border-white/10 bg-black/60 p-4 backdrop-blur-md">
            <span className="text-[10px] font-black uppercase tracking-wider text-pmb-gold">
              ⚡ Unlocked Curva Perks (Tier {profile.currentTier.tierLevel})
            </span>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {profile.unlockedPerks.map((perk, idx) => (
                <span
                  key={idx}
                  className="flex items-center gap-1 rounded-xl border border-pmb-gold/30 bg-pmb-gold/10 px-3 py-1 text-xs font-bold text-pmb-gold"
                >
                  <span>✓</span>
                  <span>{perk}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
