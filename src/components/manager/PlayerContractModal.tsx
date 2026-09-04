"use client";

import { PlayerDTO } from "@/lib/serialize-player";
import { ClubBadge } from "@/components/ClubBadge";

const ROLE_LABELS: Record<string, string> = {
  CRUCIAL: "🌟 Crucial First-Team (نجم أول)",
  IMPORTANT: "⚽ Regular Starter (أساسي)",
  ROTATION: "🔄 Rotation Player (مداورة)",
  BACKUP: "🛡️ Squad Backup (احتياطي)",
  PROSPECT: "🐣 Youth Prospect (موهبة واعدة)",
};

function formatEur(val?: number | null): string {
  if (val == null || val === 0) return "0 €";
  return new Intl.NumberFormat("fr-MA", { maximumFractionDigits: 0 }).format(val) + " €";
}

export function PlayerContractModal({
  player,
  clubName,
  onClose,
}: {
  player: PlayerDTO | null;
  clubName: string;
  onClose: () => void;
}) {
  if (!player) return null;

  const roleLabel = player.squadRole ? ROLE_LABELS[player.squadRole] ?? player.squadRole : "Regular Starter (أساسي)";
  const salary = player.seasonSalary ?? 0;
  const prime = player.primeSignature ?? 0;
  const seasons = player.contractSeasonsLeft ?? 1;
  const releaseClause = player.releaseClause ? formatEur(player.releaseClause) : "None (لا يوجد)";
  const satisfaction = player.contractSatisfaction ?? 85;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="pmb-card relative w-full max-w-lg border border-pmb-gold/40 p-6 sm:p-7 shadow-[0_10px_50px_rgba(0,0,0,0.9)] overflow-hidden space-y-6"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "linear-gradient(135deg, rgba(22,18,10,0.98) 0%, rgba(10,8,4,0.98) 100%)",
        }}
      >
        {/* Background glow accent */}
        <div className="absolute -top-20 -right-20 w-44 h-44 bg-pmb-gold/15 rounded-full blur-3xl pointer-events-none" />

        {/* Header with Player Overview */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3.5">
            {player.photo ? (
              <img
                src={player.photo}
                alt={player.fullName}
                className="h-14 w-14 rounded-2xl border border-pmb-gold/40 object-cover shadow-gold"
              />
            ) : (
              <ClubBadge name={player.fullName} size="lg" />
            )}
            <div>
              <div className="flex items-center gap-2">
                <span className="pmb-badge text-[10px] bg-pmb-gold/20 text-pmb-gold border-pmb-gold/40 font-bold">
                  {player.position}
                </span>
                <span className="text-xs text-gray-400">#{player.playerId}</span>
              </div>
              <h3 className="text-xl font-black text-white mt-1">{player.fullName}</h3>
              <p className="text-xs text-gray-400">
                {clubName} · <span className="text-pmb-gold font-semibold">{player.nationality}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-gray-400 hover:bg-white/10 hover:text-white transition"
          >
            ✕
          </button>
        </div>

        {/* Section Badge */}
        <div className="flex items-center justify-between border-y border-white/10 py-2.5">
          <span className="text-xs font-bold uppercase tracking-widest text-pmb-gold flex items-center gap-1.5">
            <span>📋</span>
            <span>Official Contract Record (سجل العقد الرسمي)</span>
          </span>
          <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
            Registered & Active
          </span>
        </div>

        {/* Contract Metrics Grid */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {/* Annual Salary */}
          <div className="rounded-xl border border-white/10 bg-black/50 p-3.5">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Annual Salary (الراتب السنوي)
            </span>
            <p className="mt-1 text-lg font-black text-pmb-gold">
              {salary > 0 ? `${formatEur(salary)} / yr` : "0 € (Unspecified)"}
            </p>
            <span className="block text-[10px] text-gray-500 mt-0.5">Operating wage expenditure</span>
          </div>

          {/* Prime de Signature */}
          <div className="rounded-xl border border-white/10 bg-black/50 p-3.5">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Signing Bonus (منحة التوقيع)
            </span>
            <p className="mt-1 text-lg font-black text-amber-300">
              {formatEur(prime)}
            </p>
            <span className="block text-[10px] text-gray-500 mt-0.5">Initial bonus payment</span>
          </div>

          {/* Contract Seasons Remaining */}
          <div className="rounded-xl border border-white/10 bg-black/50 p-3.5">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Contract Duration (مدة العقد)
            </span>
            <p className="mt-1 text-base font-bold text-white">
              {seasons} {seasons === 1 ? "Season left" : "Seasons left"}
            </p>
            <span className="block text-[10px] text-gray-500 mt-0.5">
              {seasons > 0 ? "Active legal binding" : "Expired"}
            </span>
          </div>

          {/* Squad Role */}
          <div className="rounded-xl border border-white/10 bg-black/50 p-3.5">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Squad Role (الدور في الفريق)
            </span>
            <p className="mt-1 text-xs font-bold text-white truncate" title={roleLabel}>
              {roleLabel}
            </p>
            <span className="block text-[10px] text-gray-500 mt-0.5">Agreed tactical hierarchy</span>
          </div>

          {/* Release Clause */}
          <div className="rounded-xl border border-white/10 bg-black/50 p-3.5">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Release Clause (الشرط الجزائي)
            </span>
            <p className="mt-1 text-base font-bold text-white">
              {releaseClause}
            </p>
          </div>

          {/* Contract Satisfaction */}
          <div className="rounded-xl border border-white/10 bg-black/50 p-3.5">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Satisfaction (الرضا عن العقد)
            </span>
            <div className="mt-1 flex items-center gap-2">
              <div className="w-16 h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(100, satisfaction)}%`,
                    background: satisfaction >= 80 ? "#10b981" : satisfaction >= 50 ? "#f59e0b" : "#ef4444",
                  }}
                />
              </div>
              <span className="text-xs font-black text-emerald-400">{satisfaction}%</span>
            </div>
          </div>
        </div>

        {/* Read-Only Legal Notice */}
        <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-[11px] text-gray-400 flex items-start gap-2.5">
          <span className="text-base mt-0.5">🔒</span>
          <div>
            <span className="font-bold text-white">Admin Policy Notice: </span>
            Contract terms, annual salaries, and bonuses are legally binding terms agreed between the club manager and player agent. Administrators cannot edit or tamper with negotiated salaries.
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={onClose}
            className="pmb-btn-secondary px-6 py-2 text-xs font-bold rounded-xl"
          >
            Close Record
          </button>
        </div>
      </div>
    </div>
  );
}
