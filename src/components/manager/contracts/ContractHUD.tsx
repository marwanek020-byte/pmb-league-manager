"use client";

import { useState } from "react";
import type { ContractDemands, NegotiationOffer, SquadRole } from "@/lib/services/botola-contract-service";

const SQUAD_ROLES: { value: SquadRole; label: string; icon: string; desc: string }[] = [
  { value: "CRUCIAL",   label: "نجم الفريق الأول",  icon: "🌟", desc: "أساسي في 90% من مباريات الموسم" },
  { value: "IMPORTANT", label: "ركيزة أساسية",       icon: "⚽", desc: "لاعب أساسي لا غنى عنه" },
  { value: "ROTATION",  label: "لاعب مداورة",         icon: "🔄", desc: "يشارك بانتظام وفق نظام المداورة" },
  { value: "BACKUP",    label: "بديل / احتياطي",      icon: "🛡️", desc: "لاعب دعم على دكة البدلاء" },
];

interface Props {
  offer: NegotiationOffer;
  demands: ContractDemands;
  clubBudget: number;
  budgetAfterPrime: number;
  isNegotiating: boolean;
  agentPatience: number;
  onOfferChange: (offer: NegotiationOffer) => void;
  onSubmitOffer: () => void;
  onClose: () => void;
  fmt: (n: number) => string;
  compact?: boolean;
}

export function ContractHUD({
  offer,
  demands,
  clubBudget,
  budgetAfterPrime,
  isNegotiating,
  agentPatience,
  onOfferChange,
  onSubmitOffer,
  onClose,
  fmt,
}: Props) {
  // ─────────────────────────────────────────────────────────────────────────────
  // EXACT EA SPORTS FC 25 4-STAGE NEGOTIATION SEQUENCE:
  // Stage 1: Squad Role (الدور في التشكيلة)
  // Stage 2: Contract Length (مدة العقد)
  // Stage 3: Release Clause (الشرط الجزائي)
  // Stage 4: Financial Terms (الراتب السنوي ومنحة التوقيع)
  // ─────────────────────────────────────────────────────────────────────────────
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  function updateField<K extends keyof NegotiationOffer>(key: K, value: NegotiationOffer[K]) {
    onOfferChange({ ...offer, [key]: value });
  }

  const primePct = Math.round((offer.primeSignature / demands.primeSignature) * 100);
  const salaryPct = Math.round((offer.seasonSalary / demands.seasonSalary) * 100);
  const isBudgetOk = budgetAfterPrime >= 0;

  const STEPS_CONFIG = [
    { num: 1, title: "الدور في التشكيلة", icon: "🎯", subtitle: "Rôle" },
    { num: 2, title: "مدة العقد", icon: "📅", subtitle: "Durée" },
    { num: 3, title: "الشرط الجزائي", icon: "🔒", subtitle: "Clause" },
    { num: 4, title: "الراتب والمنحة", icon: "💰", subtitle: "Salaire" },
  ];

  return (
    <div className="space-y-4" dir="rtl">
      {/* ── STEPPER TABS (EA SPORTS FC STYLE) ─────────────────────────────── */}
      <div className="p-2 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md">
        <div className="grid grid-cols-4 gap-1">
          {STEPS_CONFIG.map(s => {
            const isActive = step === s.num;
            const isDone = step > s.num;
            return (
              <button
                key={s.num}
                onClick={() => setStep(s.num as 1 | 2 | 3 | 4)}
                className={`flex flex-col items-center py-2 px-1 rounded-lg transition-all text-center ${
                  isActive
                    ? "bg-pmb-gold text-black shadow-lg font-black scale-[1.02]"
                    : isDone
                    ? "bg-white/10 text-pmb-gold font-bold hover:bg-white/15"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                <span className="text-sm">{isDone ? "✓" : s.icon}</span>
                <span className="text-[10px] truncate max-w-full font-bold">{s.title}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          STAGE 1: الدور في التشكيلة (SQUAD ROLE)
      ══════════════════════════════════════════════════════════════════ */}
      {step === 1 && (
        <div className="space-y-4 animate-fadeIn">
          <div className="bg-pmb-gold/10 border border-pmb-gold/30 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-base">🎯</span>
              <h4 className="text-xs font-black text-pmb-gold">المرحلة الأولى: مكانة اللاعب في خططك</h4>
            </div>
            <p className="text-[11px] text-gray-300 leading-relaxed">
              طلب الوكيل المبدئي: <strong className="text-pmb-gold">{demands.squadRole === "CRUCIAL" ? "نجم الفريق الأول" : demands.squadRole === "IMPORTANT" ? "ركيزة أساسية" : "لاعب مداورة"}</strong>. حدد الدور الموعود للاعب:
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {SQUAD_ROLES.map(role => {
              const isSelected = offer.squadRole === role.value;
              return (
                <button
                  key={role.value}
                  onClick={() => updateField("squadRole", role.value)}
                  className={`flex flex-col items-start p-3 rounded-xl text-xs border transition-all ${
                    isSelected
                      ? "bg-pmb-gold/20 border-pmb-gold text-pmb-gold shadow-[0_0_15px_rgba(212,175,55,0.3)] scale-[1.02]"
                      : "bg-white/5 border-white/10 text-gray-400 hover:border-pmb-gold/30 hover:text-gray-200"
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-black mb-1">
                    <span>{role.icon}</span>
                    <span>{role.label}</span>
                  </div>
                  <span className="text-[9px] text-gray-400 text-right leading-tight">{role.desc}</span>
                </button>
              );
            })}
          </div>

          <div className="pt-2">
            <button
              onClick={() => setStep(2)}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-pmb-gold to-amber-400 text-black font-black text-xs transition hover:brightness-110 shadow-[0_0_20px_rgba(212,175,55,0.3)] flex items-center justify-center gap-2"
            >
              <span>تأكيد الدور الموعود والانتقال لمدة العقد</span>
              <span>➡️</span>
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          STAGE 2: مدة العقد (CONTRACT LENGTH)
      ══════════════════════════════════════════════════════════════════ */}
      {step === 2 && (
        <div className="space-y-4 animate-fadeIn">
          <div className="bg-sky-500/10 border border-sky-500/30 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-base">📅</span>
              <h4 className="text-xs font-black text-sky-400">المرحلة الثانية: مدة العقد (عدد المواسم)</h4>
            </div>
            <p className="text-[11px] text-gray-300 leading-relaxed">
              طلب الوكيل: <strong className="text-sky-400">{demands.contractSeasonsLeft} {demands.contractSeasonsLeft === 1 ? "موسم" : "مواسم"}</strong>. كم موسماً رياضياً تقترح لربط اللاعب بالنادي؟
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3].map(n => {
              const isSelected = offer.contractSeasonsLeft === n;
              return (
                <button
                  key={n}
                  onClick={() => updateField("contractSeasonsLeft", n)}
                  className={`py-4 rounded-xl text-xs font-black border transition-all flex flex-col items-center gap-1.5 ${
                    isSelected
                      ? "bg-pmb-gold text-black border-pmb-gold shadow-[0_0_20px_rgba(212,175,55,0.4)] scale-[1.03]"
                      : "bg-white/5 border-white/10 text-gray-400 hover:border-pmb-gold/40 hover:text-white"
                  }`}
                >
                  <span className="text-xl">{n === 1 ? "⚡" : n === 2 ? "🌟" : "👑"}</span>
                  <span className="text-sm font-black">{n} {n === 1 ? "موسم واحد" : "مواسم"}</span>
                  {demands.contractSeasonsLeft === n && (
                    <span className={`text-[8px] px-1.5 py-0.5 rounded-full ${isSelected ? "bg-black/20 text-black font-black" : "bg-pmb-gold/20 text-pmb-gold"}`}>
                      طلب الوكيل
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={() => setStep(1)}
              className="px-3.5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 font-bold text-xs border border-white/10 transition"
            >
              ⬅️ الدور
            </button>
            <button
              onClick={() => setStep(3)}
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-pmb-gold to-amber-400 text-black font-black text-xs transition hover:brightness-110 shadow flex items-center justify-center gap-2"
            >
              <span>تأكيد المدة والانتقال للشرط الجزائي</span>
              <span>➡️</span>
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          STAGE 3: الشرط الجزائي (RELEASE CLAUSE)
      ══════════════════════════════════════════════════════════════════ */}
      {step === 3 && (
        <div className="space-y-4 animate-fadeIn">
          <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-base">🔒</span>
              <h4 className="text-xs font-black text-purple-400">المرحلة الثالثة: شرط الاحتراف الخارجي</h4>
            </div>
            <p className="text-[11px] text-gray-300 leading-relaxed">
              إلغاء الشرط الجزائي يحمي النادي من رحيل اللاعب فجأة، بينما وجوده يمنح اللاعب حرية الانتقال مستقبلاً.
            </p>
          </div>

          <div className="space-y-3">
            {/* Option A: No Release Clause */}
            <button
              onClick={() => updateField("releaseClause", null)}
              className={`w-full p-3 rounded-xl text-xs font-bold border transition-all text-right flex items-center justify-between ${
                offer.releaseClause === null
                  ? "bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.3)]"
                  : "bg-white/5 border-white/10 text-gray-400 hover:text-white"
              }`}
            >
              <div>
                <p className="font-black text-sm">🚫 إلغاء الشرط الجزائي (أقصى حماية)</p>
                <p className="text-[9px] text-gray-400 mt-0.5">لا يمكن لأي نادٍ كسر العقد دون موافقة إدارتك</p>
              </div>
              {offer.releaseClause === null && <span className="text-emerald-400 font-bold">✓ مُفعل</span>}
            </button>

            {/* Option B: Enable & Customize Release Clause */}
            <button
              onClick={() => {
                if (offer.releaseClause === null) {
                  updateField("releaseClause", demands.releaseClause || 2_500_000);
                }
              }}
              className={`w-full p-3 rounded-xl text-xs font-bold border transition-all text-right flex items-center justify-between ${
                offer.releaseClause !== null
                  ? "bg-amber-500/20 border-amber-500 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.3)]"
                  : "bg-white/5 border-white/10 text-gray-400 hover:text-white"
              }`}
            >
              <div>
                <p className="font-black text-sm">⚡ تفعيل شرط جزائي مخصص</p>
                <p className="text-[9px] text-gray-400 mt-0.5">تحديد مبلغ يتيح للاعب الانتقال فوراً إذا دفعه نادٍ خارجي</p>
              </div>
              {offer.releaseClause !== null && <span className="text-amber-400 font-bold">✓ مُفعل</span>}
            </button>

            {/* Slider & Presets when Release Clause is active */}
            {offer.releaseClause !== null && (
              <div className="bg-white/5 border border-amber-500/30 rounded-xl p-3.5 space-y-2.5 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-amber-400 font-black flex items-center gap-1.5">
                    <span>💎</span> قيمة الشرط الجزائي:
                  </span>
                  <span className="text-base font-black text-white">{fmt(offer.releaseClause)}</span>
                </div>

                <div className="relative h-2.5 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="absolute top-0 left-0 h-full rounded-full bg-gradient-to-r from-amber-400 to-pmb-gold transition-all duration-150"
                    style={{
                      width: `${Math.min(100, Math.max(0, ((offer.releaseClause - 500_000) / (20_000_000 - 500_000)) * 100))}%`
                    }}
                  />
                  <input
                    type="range"
                    min={500_000}
                    max={20_000_000}
                    step={100_000}
                    value={offer.releaseClause}
                    onChange={e => updateField("releaseClause", Number(e.target.value))}
                    className="absolute inset-0 w-full opacity-0 cursor-pointer h-full"
                  />
                </div>

                {/* Quick Preset Buttons */}
                <div className="grid grid-cols-4 gap-1.5 pt-1">
                  {[1_000_000, 2_500_000, 5_000_000, 10_000_000].map(val => (
                    <button
                      key={val}
                      onClick={() => updateField("releaseClause", val)}
                      className={`py-1 px-1.5 rounded-lg text-[10px] font-bold border transition ${
                        offer.releaseClause === val
                          ? "bg-amber-400 text-black border-amber-400 font-black"
                          : "bg-white/5 border-white/10 text-gray-300 hover:border-amber-400/40"
                      }`}
                    >
                      {val >= 1_000_000 ? `${(val / 1_000_000).toFixed(1)}M €` : `${val / 1000}K €`}
                    </button>
                  ))}
                </div>

                <p className="text-[9px] text-gray-400 leading-tight">
                  {offer.releaseClause < 2_000_000
                    ? "⚠️ شرط جزائي منخفض يسهل على الأندية الأخرى كسر العقد."
                    : offer.releaseClause <= 6_000_000
                    ? "✨ شرط جزائي متوازن ومغري للاحتراف الأوروبي."
                    : "🛡️ شرط جزائي مرتفع يوفر حماية مالية قوية لخزينة النادي."}
                </p>
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={() => setStep(2)}
              className="px-3.5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 font-bold text-xs border border-white/10 transition"
            >
              ⬅️ المدة
            </button>
            <button
              onClick={() => setStep(4)}
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-pmb-gold to-amber-400 text-black font-black text-xs transition hover:brightness-110 shadow flex items-center justify-center gap-2"
            >
              <span>تأكيد البند والانتقال للشروط المالية</span>
              <span>➡️</span>
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          STAGE 4: الشروط المالية: الراتب والمنحة (FINANCIAL TERMS)
      ══════════════════════════════════════════════════════════════════ */}
      {step === 4 && (
        <div className="space-y-4 animate-fadeIn">
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-base">💰</span>
              <h4 className="text-xs font-black text-emerald-400">المرحلة الرابعة والأخيرة: منحة التوقيع والراتب السنوي</h4>
            </div>
            <p className="text-[11px] text-gray-300 leading-relaxed">
              حدد العرض المالي النهائي للاعب ووكيله. عند تقديم العرض سيجيب الوكيل فوراً إما بالقبول أو التفاوض المضاد.
            </p>
          </div>

          {/* Performance Audit Card */}
          {demands.performance && (
            <div className="p-3 rounded-xl bg-gradient-to-r from-amber-500/10 via-black/40 to-amber-500/5 border border-amber-500/30 backdrop-blur-md space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-base">📊</span>
                  <div>
                    <h5 className="text-xs font-black text-white flex items-center gap-1.5">
                      <span>تحليل أداء اللاعب الفني</span>
                      <span className="text-[10px] text-gray-400 font-normal">({demands.performance.categoryLabelAr})</span>
                    </h5>
                  </div>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                    demands.performance.adjustmentPercentage < 0
                      ? "bg-red-500/20 text-red-300 border border-red-500/30"
                      : demands.performance.adjustmentPercentage > 0
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      : "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                  }`}
                >
                  {demands.performance.performanceTierLabel}
                </span>
              </div>

              {/* Stat Chips */}
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 pt-1 text-center">
                <div className="bg-white/5 rounded-lg p-1.5 border border-white/5">
                  <span className="text-[9px] text-gray-400 block">⚽ أهداف</span>
                  <span className="text-xs font-bold text-white">{demands.performance.goals}</span>
                </div>
                <div className="bg-white/5 rounded-lg p-1.5 border border-white/5">
                  <span className="text-[9px] text-gray-400 block">👟 أسيست</span>
                  <span className="text-xs font-bold text-white">{demands.performance.assists}</span>
                </div>
                <div className="bg-white/5 rounded-lg p-1.5 border border-white/5">
                  <span className="text-[9px] text-gray-400 block">🧤 كلين شيت</span>
                  <span className="text-xs font-bold text-white">{demands.performance.cleanSheets}</span>
                </div>
                <div className="bg-white/5 rounded-lg p-1.5 border border-white/5">
                  <span className="text-[9px] text-gray-400 block">🏅 رجل المباراة</span>
                  <span className="text-xs font-bold text-white">{demands.performance.motmCount}</span>
                </div>
                <div className="bg-white/5 rounded-lg p-1.5 border border-white/5">
                  <span className="text-[9px] text-gray-400 block">🌟 تشكيلة الأسبوع</span>
                  <span className="text-xs font-bold text-white">{demands.performance.totwCount}</span>
                </div>
                <div className="bg-white/5 rounded-lg p-1.5 border border-white/5">
                  <span className="text-[9px] text-gray-400 block">🟨/🟥 بطاقات</span>
                  <span className="text-xs font-bold text-white">{demands.performance.yellowCards}/{demands.performance.redCards}</span>
                </div>
              </div>

              <p className="text-[10px] text-gray-300 leading-tight pt-1">
                💡 <span className="font-semibold">{demands.performance.summaryAr}</span>
              </p>
            </div>
          )}

          {/* منحة التوقيع */}
          <SliderRow
            label="منحة التوقيع السنوية (Prime de Signature)"
            value={Math.min(300_000, offer.primeSignature)}
            min={Math.max(5_000, Math.round(demands.primeSignature * 0.3))}
            max={Math.min(300_000, Math.max(20_000, Math.round(demands.primeSignature * 1.3)))}
            step={5_000}
            pct={primePct}
            displayValue={fmt(offer.primeSignature)}
            pctLabel={`${primePct}% من طلب الوكيل (${fmt(demands.primeSignature)})`}
            pctColor={primePct >= 90 ? "#34d399" : primePct >= 70 ? "#fbbf24" : "#f87171"}
            onChange={v => updateField("primeSignature", Math.min(300_000, v))}
            icon="💰"
          />

          {/* الراتب السنوي (سقف صارم 400 ألف يورو) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-amber-400 font-bold">
                ⚠️ سقف الرواتب القانوني: 0 إلى 400,000 € كحد أقصى للموسم
              </span>
            </div>
            <SliderRow
              label="الراتب السنوي الثابت (Salaire Annuel)"
              value={Math.min(400_000, offer.seasonSalary)}
              min={Math.max(10_000, Math.round(demands.seasonSalary * 0.3))}
              max={Math.min(400_000, Math.max(30_000, Math.round(demands.seasonSalary * 1.3)))}
              step={5_000}
              pct={salaryPct}
              displayValue={fmt(offer.seasonSalary)}
              pctLabel={`${salaryPct}% من طلب الوكيل (${fmt(demands.seasonSalary)})`}
              pctColor={salaryPct >= 90 ? "#34d399" : salaryPct >= 70 ? "#fbbf24" : "#f87171"}
              onChange={v => updateField("seasonSalary", Math.min(400_000, Math.max(0, v)))}
              icon="💵"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={() => setStep(3)}
              className="px-3.5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 font-bold text-xs border border-white/10 transition"
            >
              ⬅️ الشرط
            </button>
            <button
              onClick={onSubmitOffer}
              disabled={isNegotiating || !isBudgetOk}
              className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 via-pmb-gold to-emerald-400 text-black font-black text-xs transition hover:brightness-110 shadow-[0_0_25px_rgba(52,211,153,0.4)] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isNegotiating ? (
                <span>⏳ جارٍ تحاور الوكيل مع اللاعب...</span>
              ) : (
                <>
                  <span>🤝 تقديم العرض النهائي وإبرام العقد</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ── LIVE BUDGET MONITOR (ALWAYS VISIBLE AT BOTTOM) ──────────────── */}
      <div className={`rounded-xl p-3 border text-xs transition-colors ${
        isBudgetOk ? "bg-emerald-500/8 border-emerald-500/25" : "bg-red-500/10 border-red-500/30"
      }`}>
        <div className="flex justify-between items-center">
          <span className="text-gray-400">💼 ميزانية النادي المتاحة:</span>
          <span className="text-white font-bold">{fmt(clubBudget)}</span>
        </div>
        <div className="flex justify-between items-center mt-1">
          <span className="text-gray-400">الميزانية بعد خصم منحة التوقيع:</span>
          <span className={`font-black ${isBudgetOk ? "text-emerald-400" : "text-red-400"}`}>
            {isBudgetOk ? fmt(budgetAfterPrime) : "⚠️ عجز مالي – خفّض منحة التوقيع"}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── REUSABLE SLIDER ROW COMPONENT ─────────────────────────────────────────────
function SliderRow({
  label,
  value,
  min,
  max,
  step,
  pct,
  displayValue,
  pctLabel,
  pctColor,
  onChange,
  icon,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  pct: number;
  displayValue: string;
  pctLabel: string;
  pctColor: string;
  onChange: (v: number) => void;
  icon: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs text-gray-300 font-semibold flex items-center gap-1.5">
          <span>{icon}</span> {label}
        </span>
        <span className="text-sm font-black text-white">{displayValue}</span>
      </div>

      <div className="relative h-2.5 rounded-full bg-white/10 mb-1.5 overflow-hidden">
        <div
          className="absolute top-0 left-0 h-full rounded-full transition-all duration-150"
          style={{ width: `${Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100))}%`, background: pctColor }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={e => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full opacity-0 cursor-pointer h-full"
        />
      </div>

      <div className="flex justify-between items-center text-[10px]">
        <span className="text-gray-500">{new Intl.NumberFormat("fr-MA").format(min)} €</span>
        <span className="font-bold" style={{ color: pctColor }}>{pctLabel}</span>
        <span className="text-gray-500">{new Intl.NumberFormat("fr-MA").format(max)} €</span>
      </div>
    </div>
  );
}
