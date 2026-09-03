"use client";

import { useEffect, useState } from "react";
import type { NegotiationOffer } from "@/lib/services/botola-contract-service";

interface Props {
  playerName: string;
  offer: NegotiationOffer;
  clubBudget: number;
  fmt: (n: number) => string;
  onSign: () => void;
  onClose: () => void;
  compact?: boolean;
}

export function SigningSequenceFX({ playerName, offer, clubBudget, fmt, onSign, onClose, compact = false }: Props) {
  const [phase, setPhase] = useState<"HANDSHAKE" | "PEN_MOVING" | "SIGNED" | "CELEBRATION">("HANDSHAKE");
  const [signed, setSigned] = useState(false);

  // Auto-progress animation through phases
  useEffect(() => {
    if (phase === "HANDSHAKE") {
      const t = setTimeout(() => setPhase("PEN_MOVING"), 1500);
      return () => clearTimeout(t);
    }
  }, [phase]);

  async function handleSign() {
    setPhase("PEN_MOVING");
    await new Promise(r => setTimeout(r, 1800));
    setPhase("SIGNED");
    await new Promise(r => setTimeout(r, 800));
    setPhase("CELEBRATION");
    setSigned(true);
    onSign();
  }

  // ── Pen path animation (SVG) ───────────────────────────────────────────────
  const PenAnimation = () => (
    <svg
      viewBox="0 0 200 60"
      className="w-full max-w-xs mx-auto overflow-visible"
      style={{ filter: "drop-shadow(0 0 8px rgba(212,175,55,0.8))" }}
    >
      <path
        d="M 10 50 C 30 20, 60 55, 90 40 C 120 25, 140 50, 170 35 C 185 28, 192 35, 195 38"
        fill="none"
        stroke="rgba(212,175,55,0.9)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray="300"
        strokeDashoffset="300"
        style={{
          animation: phase === "PEN_MOVING" || phase === "SIGNED" || phase === "CELEBRATION"
            ? "drawSignature 1.2s ease-out forwards"
            : "none",
        }}
      />
      <style>{`
        @keyframes drawSignature {
          to { stroke-dashoffset: 0; }
        }
      `}</style>
    </svg>
  );

  // ── Celebration particles ─────────────────────────────────────────────────
  const Confetti = () => (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {[...Array(18)].map((_, i) => (
        <div
          key={i}
          className="absolute w-2 h-2 rounded-sm"
          style={{
            left: `${10 + Math.random() * 80}%`,
            top: "-10px",
            background: i % 3 === 0 ? "#d4af37" : i % 3 === 1 ? "#ffffff" : "#c0392b",
            animation: `confettiFall ${1.2 + Math.random() * 1.5}s ease-in forwards`,
            animationDelay: `${Math.random() * 0.8}s`,
            transform: `rotate(${Math.random() * 360}deg)`,
          }}
        />
      ))}
      <style>{`
        @keyframes confettiFall {
          to { top: 110%; transform: rotate(720deg) translateX(${Math.random() > 0.5 ? "" : "-"}${20 + Math.random() * 60}px); opacity: 0; }
        }
      `}</style>
    </div>
  );

  // ── Camera flash ─────────────────────────────────────────────────────────
  const CameraFlash = () => (
    <div
      className="pointer-events-none absolute inset-0 bg-white rounded-2xl"
      style={{
        animation: "cameraFlash 0.6s ease-out forwards",
        animationDelay: "0.2s",
        opacity: 0,
      }}
    >
      <style>{`
        @keyframes cameraFlash {
          0%   { opacity: 0.7; }
          100% { opacity: 0; }
        }
      `}</style>
    </div>
  );

  return (
    <div className={`relative text-center space-y-5 ${compact ? "py-4" : "p-8"}`} dir="rtl">

      {/* Celebration effects */}
      {phase === "CELEBRATION" && (
        <>
          <Confetti />
          <CameraFlash />
        </>
      )}

      {/* Phase: Initial agreement (handshake) */}
      {phase === "HANDSHAKE" && (
        <>
          <div className="text-6xl animate-bounce">🤝</div>
          <h3 className="text-2xl font-black text-emerald-400">وافق الوكيل على الشروط!</h3>
          <p className="text-gray-400 text-sm">موكلي سعيد بهذا العرض وجاهز لتوقيع العقد رسمياً.</p>
        </>
      )}

      {/* Phase: Pen animation */}
      {(phase === "PEN_MOVING" || phase === "SIGNED" || phase === "CELEBRATION") && (
        <>
          <div className="relative">
            {/* Contract document */}
            <div
              className="mx-auto max-w-sm rounded-xl border border-pmb-gold/40 p-5 text-right"
              style={{
                background: "linear-gradient(145deg, rgba(30,25,10,0.95), rgba(15,12,5,0.98))",
                boxShadow: "0 0 40px rgba(212,175,55,0.15), inset 0 0 30px rgba(0,0,0,0.5)",
              }}
            >
              {/* Official header */}
              <div className="flex items-center justify-between mb-3 pb-3 border-b border-pmb-gold/20">
                <span className="text-pmb-gold font-black text-sm">🇲🇦 البطولة الاحترافية</span>
                <span className="text-[10px] text-gray-600 uppercase tracking-wider">عقد رسمي</span>
              </div>

              <p className="text-pmb-gold font-black text-lg mb-2">{playerName}</p>

              <div className="space-y-1.5 text-xs mb-4">
                <ContractLine label="منحة التوقيع السنوية" value={fmt(offer.primeSignature)} highlight />
                <ContractLine label="الراتب السنوي الثابت" value={fmt(offer.seasonSalary)} />
                <ContractLine
                  label="مدة العقد"
                  value={`${offer.contractSeasonsLeft} ${offer.contractSeasonsLeft === 1 ? "موسم" : "مواسم"}`}
                />
                <ContractLine
                  label="الدور في التشكيلة"
                  value={
                    offer.squadRole === "CRUCIAL" ? "🌟 نجم الفريق الأول" :
                    offer.squadRole === "IMPORTANT" ? "⚽ ركيزة أساسية" :
                    offer.squadRole === "ROTATION" ? "🔄 لاعب مداورة" :
                    offer.squadRole === "BACKUP" ? "🛡️ بديل احتياطي" : "🐣 موهبة صاعدة"
                  }
                />
                {offer.releaseClause && (
                  <ContractLine label="الشرط الجزائي" value={fmt(offer.releaseClause)} />
                )}
              </div>

              {/* Animated pen signature */}
              <div className="pt-3 border-t border-pmb-gold/20">
                <p className="text-[10px] text-gray-600 mb-2">التوقيع الرسمي للاعب:</p>
                <PenAnimation />
              </div>
            </div>

            {/* Gold pen icon moving */}
            {phase === "PEN_MOVING" && (
              <div
                className="absolute text-3xl"
                style={{
                  bottom: "28px",
                  right: "48px",
                  animation: "penMove 1.2s ease-out forwards",
                  filter: "drop-shadow(0 0 6px rgba(212,175,55,0.9))",
                }}
              >
                ✒️
                <style>{`
                  @keyframes penMove {
                    0%   { transform: translate(80px, -20px) rotate(-25deg); }
                    100% { transform: translate(0px, 0px) rotate(-45deg); }
                  }
                `}</style>
              </div>
            )}
          </div>

          {/* Celebration text */}
          {phase === "CELEBRATION" && (
            <div className="space-y-2">
              <div className="text-4xl">🎉</div>
              <h3 className="text-xl font-black text-pmb-gold">تم توقيع العقد بنجاح!</h3>
              <p className="text-gray-400 text-sm">
                {playerName} رسمياً في صفوف فريقك لـ{" "}
                <span className="text-white font-bold">
                  {offer.contractSeasonsLeft} {offer.contractSeasonsLeft === 1 ? "موسم" : "مواسم"}
                </span>
              </p>
              <p className="text-xs text-gray-600">
                الميزانية بعد منحة التوقيع: <span className="text-emerald-400 font-bold">{fmt(clubBudget - offer.primeSignature)}</span>
              </p>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3 justify-center pt-2">
            {!signed && (
              <>
                <button
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl border border-white/15 text-gray-400 hover:text-white text-sm font-semibold transition"
                >
                  مراجعة مجدداً
                </button>
                <button
                  onClick={handleSign}
                  disabled={signed}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-black font-black text-sm shadow-[0_0_20px_rgba(52,211,153,0.4)] hover:brightness-110 transition disabled:opacity-50"
                >
                  ✍️ توقيع العقد الرسمي
                </button>
              </>
            )}
            {signed && (
              <button
                onClick={onClose}
                className="px-8 py-3 rounded-xl bg-pmb-gold text-black font-black text-sm shadow-[0_0_25px_rgba(212,175,55,0.5)] hover:brightness-110 transition"
              >
                🏟️ العودة لتشكيلة الفريق
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function ContractLine({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-gray-500">{label}</span>
      <span className={`font-bold ${highlight ? "text-pmb-gold" : "text-white"}`}>{value}</span>
    </div>
  );
}
