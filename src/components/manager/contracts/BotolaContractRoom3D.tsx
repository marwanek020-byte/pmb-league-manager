"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Environment, PerspectiveCamera, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { NegotiationRoom } from "./three/NegotiationRoom";
import { CharacterMesh } from "./three/CharacterMesh";
import { MixamoAgent } from "./three/MixamoAgent";
import { MixamoPlayer } from "./three/MixamoPlayer";
import { ContractHUD } from "./ContractHUD";
import { SigningSequenceFX } from "./SigningSequenceFX";
import type {
  ContractDemands,
  NegotiationOffer,
  NegotiationResult,
  SquadRole,
} from "@/lib/services/botola-contract-service";

interface Player {
  id: string;
  fullName: string;
  overallRating: number | null;
  position: string;
  photo: string | null;
  nationality: string;
  realClub?: string;
  primeSignature: number;
  seasonSalary: number;
  contractSeasonsLeft: number;
  squadRole: string;
  releaseClause: number | null;
  isFreeAgentMarket?: boolean;
}

interface Props {
  player: Player;
  demands: ContractDemands;
  clubBudget: number;
  onClose: () => void;
  onSigned: (contract: { primeSignature: number; seasonSalary: number; clubBudgetAfter: number; awaitsAdmin?: boolean }) => void;
  onCollapsed?: (playerId: string, clubBudgetAfter: number) => void;
  onFailed?: () => void;
}

type Mood = "HAPPY" | "NEUTRAL" | "FRUSTRATED" | "ANGRY";

export function BotolaContractRoom3D({ player, demands, clubBudget, onClose, onSigned, onCollapsed, onFailed }: Props) {
  if (!demands) return null;

  const containerRef = useRef<HTMLDivElement>(null);
  const [viewMode, setViewMode] = useState<"3D" | "CINEMATIC">("3D");
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [agentPatience, setAgentPatience] = useState(demands?.agentPatience ?? 3);
  const [agentMessage, setAgentMessage] = useState(demands?.agentMessage || "مرحباً كوتش، نحن مستعدون لبدء المفاوضات.");
  const [agentMood, setAgentMood] = useState<Mood>("NEUTRAL");
  const [isNegotiating, setIsNegotiating] = useState(false);
  const [phase, setPhase] = useState<"NEGOTIATING" | "ACCEPTED" | "BREAKDOWN">("NEGOTIATING");
  const [agentTalking, setAgentTalking] = useState(false);
  const [playerReaction, setPlayerReaction] = useState<"idle" | "thinking" | "pleased" | "worried">("idle");
  const [showHUD, setShowHUD] = useState(false);
  const [showSpeechBubble, setShowSpeechBubble] = useState(true);

  // System automatically selects one of the 3 player models based on player ID & rating
  const assignedPlayerModelIndex = useMemo(() => {
    let hash = 0;
    for (let i = 0; i < (player?.id || "").length; i++) {
      hash = (hash << 5) - hash + player.id.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash + (player?.overallRating || 0)) % 3;
  }, [player?.id, player?.overallRating]);

  const [agentGesture, setAgentGesture] = useState<"idle" | "talking" | "nodding" | "rejecting" | "pointing">("idle");
  const [playerGesture, setPlayerGesture] = useState<"idle" | "thinking" | "nodding" | "nervous">("idle");

  const [offer, setOffer] = useState<NegotiationOffer>({
    primeSignature: Math.round((demands?.primeSignature || 100000) * 0.8),
    seasonSalary: Math.round((demands?.seasonSalary || 40000) * 0.8),
    contractSeasonsLeft: demands?.contractSeasonsLeft || 1,
    squadRole: (demands?.squadRole || "IMPORTANT") as SquadRole,
    releaseClause: demands?.releaseClause ?? null,
  });

  // Entrance
  useEffect(() => {
    const t = setTimeout(() => setShowHUD(true), 300);
    return () => clearTimeout(t);
  }, []);

  // Mouse Parallax for cinematic mode
  useEffect(() => {
    function handleMouseMove(e: MouseEvent) {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      setMousePos({ x, y });
    }
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // Agent speech trigger
  useEffect(() => {
    setAgentTalking(true);
    setAgentGesture("talking");
    setShowSpeechBubble(true);
    const t = setTimeout(() => {
      setAgentTalking(false);
      setAgentGesture("idle");
    }, 3800);
    return () => clearTimeout(t);
  }, [agentMessage]);

  async function handleSubmitOffer() {
    setIsNegotiating(true);
    setPlayerReaction("thinking");
    setPlayerGesture("thinking");
    setAgentGesture("idle");

    try {
      const res = await fetch(`/api/manager/players/${player.id}/contract`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ demands, offer, currentPatience: agentPatience }),
      });
      const result: NegotiationResult = await res.json();
      setAgentPatience(result.agentPatience);
      setAgentMessage(result.agentMessage);
      setAgentMood(result.agentMood);

      if (result.status === "ACCEPTED") {
        setPhase("ACCEPTED");
        setPlayerReaction("pleased");
        setPlayerGesture("nodding");
        setAgentGesture("nodding");
      } else if (result.status === "BREAKDOWN") {
        setPhase("BREAKDOWN");
        setPlayerReaction("worried");
        setPlayerGesture("nervous");
        setAgentGesture("rejecting");
        if (player.isFreeAgentMarket) {
          onFailed?.();
        }
      } else if (result.status === "COUNTER" && result.counterDemands?.primeSignature) {
        setOffer(prev => ({
          ...prev,
          primeSignature: Math.round((prev.primeSignature + result.counterDemands!.primeSignature!) / 2),
        }));
        setAgentGesture("pointing");
        setPlayerReaction(result.agentMood === "FRUSTRATED" ? "worried" : "idle");
        setPlayerGesture(result.agentMood === "FRUSTRATED" ? "nervous" : "idle");
      } else {
        setAgentGesture(result.agentMood === "ANGRY" ? "rejecting" : "talking");
        setPlayerReaction(result.agentMood === "FRUSTRATED" ? "worried" : "idle");
      }
    } finally {
      setIsNegotiating(false);
    }
  }

  const [collapsing, setCollapsing] = useState(false);

  async function handleCollapse() {
    if (!confirm("هل أنت متأكد من إلغاء الصفقة؟ سيتم استرداد كامل المبلغ المدفوع بنسبة 100% وإعادة اللاعب.")) {
      return;
    }
    setCollapsing(true);
    try {
      const res = await fetch(`/api/manager/players/${player.id}/contract/collapse`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message || "تم إلغاء الصفقة واسترداد المبلغ بالكامل.");
        if (onCollapsed) onCollapsed(player.id, data.clubBudgetAfter);
        onClose();
      } else {
        alert(data.error || "فشل إلغاء الصفقة.");
      }
    } catch (err) {
      console.error("Collapse error:", err);
      alert("حدث خطأ أثناء إلغاء الصفقة.");
    } finally {
      setCollapsing(false);
    }
  }

  async function handleSign() {
    try {
      const res = await fetch(`/api/manager/players/${player.id}/contract/sign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agreedTerms: offer }),
      });
      const data = await res.json();
      if (data.success) {
        if (data.awaitsAdmin) {
          alert("تم الاتفاق بنجاح 🤝! الصفقة بانتظار مصادقة الإدارة (Admin Approval) لتسجيل اللاعب رسمياً.");
          onSigned({
            primeSignature: offer.primeSignature,
            seasonSalary: offer.seasonSalary,
            clubBudgetAfter: clubBudget,
            awaitsAdmin: true,
          });
        } else {
          onSigned(data.contract);
        }
      } else {
        alert(data.error || "تعذر إتمام توقيع العقد. يرجى التأكد من رصيد ميزانية النادي.");
      }
    } catch (err) {
      console.error("Sign error:", err);
      alert("حدث خطأ أثناء اعتماد وتوقيع العقد.");
    }
  }

  function fmt(n: number) {
    return new Intl.NumberFormat("fr-MA", { maximumFractionDigits: 0 }).format(n) + " €";
  }

  const budgetAfterPrime = clubBudget - offer.primeSignature;
  const patiencePct = (agentPatience / 3) * 100;
  const patienceColor = agentPatience === 3 ? "#22c55e" : agentPatience === 2 ? "#eab308" : "#ef4444";
  const moodEmoji = { HAPPY: "😊", NEUTRAL: "🤝", FRUSTRATED: "😤", ANGRY: "😠" }[agentMood];

  // Parallax for 2.5D view
  const bgX = mousePos.x * -18;
  const bgY = mousePos.y * -12;
  const charX = mousePos.x * 10;
  const charY = mousePos.y * 6;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 overflow-hidden bg-black select-none flex items-center justify-center"
    >
      <style>{`
        @keyframes fullBodyBreathe {
          0%, 100% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-5px) scale(1.008); }
        }
        @keyframes agentTalkingMotion {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          20% { transform: translateY(-4px) rotate(1.2deg); }
          40% { transform: translateY(2px) rotate(-0.8deg); }
          60% { transform: translateY(-3px) rotate(1deg); }
          80% { transform: translateY(1px) rotate(-0.5deg); }
        }
        @keyframes agentNoddingMotion {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          30% { transform: translateY(8px) rotate(2deg); }
          60% { transform: translateY(-2px) rotate(-1deg); }
          85% { transform: translateY(6px) rotate(1.5deg); }
        }
        @keyframes agentRejectingMotion {
          0%, 100% { transform: translateX(0) rotate(0deg); }
          15% { transform: translateX(-8px) rotate(-3deg); }
          35% { transform: translateX(8px) rotate(3deg); }
          55% { transform: translateX(-6px) rotate(-2deg); }
          75% { transform: translateX(6px) rotate(2deg); }
        }
        @keyframes agentPointingMotion {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-8px, 6px) scale(1.02) rotate(1.5deg); }
        }
        @keyframes playerBreathe {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-4px); }
        }
        @keyframes speechBubbleIn {
          from { opacity: 0; transform: translateY(-12px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes voiceDotPulse {
          0%, 100% { transform: scaleY(0.4); opacity: 0.5; }
          50% { transform: scaleY(1.3); opacity: 1; }
        }
      `}</style>

      {/* ══════════════════════════════════════════════════════════════
          MODE A: FULL THREE.JS WEBGL 3D SCENE WITH RIGGED JOE AGENT
      ══════════════════════════════════════════════════════════════ */}
      {viewMode === "3D" && (
        <Canvas
          shadows
          gl={{
            antialias: true,
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 1.15,
            powerPreference: "high-performance",
          }}
          style={{ position: "absolute", inset: 0, zIndex: 1 }}
        >
          {/* Cinematic perspective camera framed on characters with space for right HUD */}
          <PerspectiveCamera
            makeDefault
            position={[-0.65, 0.28, 2.65]}
            fov={50}
            near={0.1}
            far={35}
          />

          {/* Interactive orbit controls with bounds */}
          <OrbitControls
            enablePan={false}
            enableZoom={false}
            target={[-0.65, -0.22, 0]}
            minAzimuthAngle={-0.2}
            maxAzimuthAngle={0.2}
            minPolarAngle={Math.PI / 2.5}
            maxPolarAngle={Math.PI / 1.95}
            autoRotate={false}
          />

          {/* 3-Point Lighting setup */}
          <ambientLight intensity={0.25} color={new THREE.Color(0.95, 0.9, 0.8)} />

          <directionalLight
            position={[-1.5, 3.2, 2.5]}
            intensity={1.1}
            color={new THREE.Color(1, 0.95, 0.88)}
            castShadow
            shadow-mapSize={[1024, 1024]}
          />

          <directionalLight
            position={[0.3, 2.8, 2.2]}
            intensity={0.9}
            color={new THREE.Color(1, 0.92, 0.85)}
            castShadow
          />

          <directionalLight
            position={[-0.65, 1.2, -4]}
            intensity={0.4}
            color={new THREE.Color(0.6, 0.75, 1.0)}
          />

          {/* Night Environment */}
          <Suspense fallback={null}>
            <Environment preset="night" background={false} environmentIntensity={0.35} />
          </Suspense>

          {/* 3D Office Room (PBR conference table, chairs, stadium window) */}
          <Suspense fallback={null}>
            <NegotiationRoom offset={[-0.65, 0, 0]} />
          </Suspense>

          {/* ⚽ REAL RIGGED 3D PLAYER (Seated behind table, facing forward toward camera) */}
          <Suspense
            fallback={
              <CharacterMesh
                name={player.fullName}
                photoUrl={player.photo}
                position={[-1.20, 0.05, -0.62]}
                rotation={[0, 0.12, 0]}
                mood={agentMood}
                talking={false}
                isAgent={false}
              />
            }
          >
            <MixamoPlayer
              playerIndex={assignedPlayerModelIndex}
              position={[-1.20, -1.00, -0.62]}
              rotation={[0, 0.12, 0]}
              scale={0.0098}
              reaction={playerReaction}
              phase={phase}
            />
          </Suspense>

          {/* 🕴️ REAL RIGGED 3D AGENT JOE IN DARK SUIT (Seated behind table, facing forward toward camera) */}
          <Suspense
            fallback={
              <CharacterMesh
                name="Agent Joe"
                photoUrl={null}
                position={[-0.10, 0.05, -0.62]}
                rotation={[0, -0.12, 0]}
                mood={agentMood}
                talking={agentTalking}
                isAgent={true}
              />
            }
          >
            <MixamoAgent
              position={[-0.10, -1.00, -0.62]}
              rotation={[0, -0.12, 0]}
              scale={0.0098}
              mood={agentMood}
              phase={phase}
              talking={agentTalking}
            />
          </Suspense>
        </Canvas>
      )}

      {/* ══════════════════════════════════════════════════════════════
          MODE B: CINEMATIC 2.5D PHOTOREALISTIC PARALLAX SCENE
      ══════════════════════════════════════════════════════════════ */}
      {viewMode === "CINEMATIC" && (
        <>
          {/* Background Plate */}
          <div
            className="absolute inset-[-5%] transition-transform duration-300 ease-out pointer-events-none"
            style={{
              transform: `translate(${bgX}px, ${bgY}px) scale(1.06)`,
            }}
          >
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{
                backgroundImage: "url('/images/fc25_negotiation_room.jpg')",
              }}
            />
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: "radial-gradient(circle at 45% 45%, transparent 40%, rgba(0,0,0,0.45) 80%, rgba(0,0,0,0.85) 100%)",
              }}
            />
          </div>

          {/* Living Character Overlays */}
          <div
            className="absolute inset-0 pointer-events-none transition-transform duration-200 ease-out"
            style={{
              transform: `translate(${charX}px, ${charY}px)`,
            }}
          >
            {/* Agent Live Actor */}
            <div
              className="absolute top-[26%] left-[58%] md:left-[62%] -translate-x-1/2 flex flex-col items-center"
              style={{
                animation:
                  agentGesture === "nodding"
                    ? "agentNoddingMotion 1.5s ease-in-out infinite"
                    : agentGesture === "rejecting"
                    ? "agentRejectingMotion 0.6s ease-in-out infinite"
                    : agentGesture === "pointing"
                    ? "agentPointingMotion 1.8s ease-in-out infinite"
                    : agentTalking
                    ? "agentTalkingMotion 0.5s ease-in-out infinite"
                    : "fullBodyBreathe 4s ease-in-out infinite",
              }}
            >
              <div
                className="flex items-center gap-2.5 px-4 py-2 rounded-full border shadow-2xl backdrop-blur-xl pointer-events-auto cursor-default transition-all duration-300"
                style={{
                  background: "rgba(8, 6, 2, 0.92)",
                  borderColor:
                    agentMood === "ANGRY"
                      ? "#ef4444"
                      : agentMood === "HAPPY"
                      ? "#34d399"
                      : agentMood === "FRUSTRATED"
                      ? "#fb923c"
                      : "rgba(212, 175, 55, 0.5)",
                }}
              >
                <div className="relative w-9 h-9 rounded-full overflow-hidden border border-white/30 flex-shrink-0">
                  <img
                    src="https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&h=500&fit=crop&crop=face"
                    alt={demands.agentName}
                    className="w-full h-full object-cover object-top"
                  />
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1.5 justify-end">
                    <span className="text-sm">{moodEmoji}</span>
                    <p className="text-white text-xs font-black truncate max-w-[130px]">{demands.agentName}</p>
                  </div>
                  <p className="text-[9px] text-pmb-gold font-bold">وكيل أعمال معتمد (FIFA)</p>
                </div>
              </div>
            </div>

            {/* Player Live Actor */}
            <div
              className="absolute top-[30%] left-[28%] md:left-[31%] -translate-x-1/2 flex flex-col items-center"
              style={{
                animation:
                  playerGesture === "nodding"
                    ? "playerBreathe 1.6s ease-in-out infinite"
                    : playerGesture === "thinking"
                    ? "playerBreathe 1.4s ease-in-out infinite"
                    : "playerBreathe 4.2s ease-in-out infinite",
              }}
            >
              <div
                className="flex items-center gap-2.5 px-3.5 py-2 rounded-full border shadow-2xl backdrop-blur-xl pointer-events-auto cursor-default"
                style={{
                  background: "rgba(10, 8, 4, 0.9)",
                  borderColor:
                    playerReaction === "pleased"
                      ? "#34d399"
                      : playerReaction === "worried"
                      ? "#ef4444"
                      : "rgba(212, 175, 55, 0.45)",
                }}
              >
                <div className="relative w-9 h-9 rounded-full overflow-hidden border border-pmb-gold/50 flex-shrink-0">
                  {player.photo ? (
                    <img src={player.photo} alt={player.fullName} className="w-full h-full object-cover object-top" />
                  ) : (
                    <div className="w-full h-full bg-pmb-gold/20 flex items-center justify-center text-xs font-bold text-pmb-gold">
                      {player.fullName.charAt(0)}
                    </div>
                  )}
                  <div className="absolute -bottom-1 -right-1 bg-pmb-gold text-black text-[8px] font-black rounded-full w-4 h-4 flex items-center justify-center shadow">
                    {player.overallRating ?? "—"}
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1 justify-end">
                    <span className="text-xs">
                      {playerReaction === "pleased" ? "😄" : playerReaction === "worried" ? "😰" : "🤔"}
                    </span>
                    <p className="text-white text-xs font-black truncate max-w-[130px]">{player.fullName}</p>
                  </div>
                  <div className="flex items-center gap-1 justify-end flex-wrap">
                    <p className="text-[9px] text-pmb-gold font-bold">{player.position} · {player.nationality}</p>
                    {demands.performance && (
                      <span className={`text-[8px] font-bold px-1 rounded ${
                        demands.performance.adjustmentPercentage < 0
                          ? "bg-red-500/30 text-red-300"
                          : demands.performance.adjustmentPercentage > 0
                          ? "bg-emerald-500/30 text-emerald-300"
                          : "bg-blue-500/30 text-blue-300"
                      }`}>
                        {demands.performance.performanceTierLabel}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════
          TOP CONTROLS (VIEW TOGGLE & CLOSE & REFUND)
      ══════════════════════════════════════════════════════════════ */}
      <div className="absolute top-4 left-4 z-40 flex items-center gap-3">
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-full border border-white/15 text-white/50 hover:text-white hover:border-white/40 transition flex items-center justify-center text-lg backdrop-blur-md"
          style={{ background: "rgba(8,6,2,0.8)" }}
          title="إغلاق الجلسة"
        >
          ×
        </button>

        {/* Cancel & Refund button */}
        <button
          onClick={handleCollapse}
          disabled={collapsing}
          className="px-3 py-1.5 rounded-full border border-red-500/40 bg-red-500/20 hover:bg-red-500/30 text-red-400 hover:text-white transition text-xs font-bold flex items-center gap-1.5 backdrop-blur-md shadow"
          title="إلغاء الصفقة واسترداد كامل المبلغ إلى ميزانية النادي"
        >
          <span>❌</span>
          <span>{collapsing ? "جاري الاسترداد..." : "إلغاء واسترداد المبلغ"}</span>
        </button>

        {/* View mode toggle */}
        <div
          className="flex items-center p-1 rounded-full border shadow-xl backdrop-blur-xl"
          style={{ background: "rgba(8, 6, 2, 0.85)", borderColor: "rgba(212, 175, 55, 0.3)" }}
        >
          <button
            onClick={() => setViewMode("3D")}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
              viewMode === "3D"
                ? "bg-pmb-gold text-black shadow-md"
                : "text-gray-400 hover:text-white"
            }`}
          >
            🎮 3D تفاعلي
          </button>
          <button
            onClick={() => setViewMode("CINEMATIC")}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
              viewMode === "CINEMATIC"
                ? "bg-pmb-gold text-black shadow-md"
                : "text-gray-400 hover:text-white"
            }`}
          >
            🎦 سينمائي HD
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          AGENT ARABIC DIALOGUE SPEECH BUBBLE WITH AUDIO WAVE
      ══════════════════════════════════════════════════════════════ */}
      {showSpeechBubble && (
        <div
          className="absolute z-30 pointer-events-none"
          style={{
            top: "12%",
            left: "4%",
            width: "clamp(270px, 32vw, 420px)",
            animation: "speechBubbleIn 0.4s cubic-bezier(0.16,1,0.3,1)",
          }}
        >
          <div
            className="p-4 rounded-2xl shadow-2xl backdrop-blur-2xl border pointer-events-auto"
            style={{
              background: "rgba(8, 6, 2, 0.94)",
              borderColor:
                agentMood === "HAPPY"
                  ? "rgba(52,211,153,0.5)"
                  : agentMood === "ANGRY"
                  ? "rgba(239,68,68,0.55)"
                  : agentMood === "FRUSTRATED"
                  ? "rgba(251,146,60,0.5)"
                  : "rgba(212,175,55,0.4)",
              boxShadow: "0 25px 50px rgba(0,0,0,0.85)",
            }}
          >
            <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-white/8">
              <div className="flex items-center gap-2">
                <span className="text-lg">{moodEmoji}</span>
                <div>
                  <h4 className="text-xs font-black text-pmb-gold">{demands.agentName}</h4>
                  <p className="text-[9px] text-gray-400 uppercase tracking-widest">وكيل أعمال اللاعب</p>
                </div>
              </div>

              {agentTalking ? (
                <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-pmb-gold/10 border border-pmb-gold/20">
                  <span className="text-[8px] text-pmb-gold font-bold">صوت</span>
                  {[0, 0.12, 0.24, 0.36].map((delay, i) => (
                    <div
                      key={i}
                      className="w-1 h-3.5 bg-pmb-gold rounded-full"
                      style={{
                        animation: "voiceDotPulse 0.5s ease-in-out infinite",
                        animationDelay: `${delay}s`,
                      }}
                    />
                  ))}
                </div>
              ) : (
                <span className="text-[10px] text-gray-500">انتظار الرد</span>
              )}
            </div>

            <p className="text-gray-100 text-xs leading-relaxed" dir="rtl">
              {agentMessage}
            </p>

            <div className="mt-3 pt-2.5 border-t border-white/6">
              <div className="flex justify-between items-center mb-1 text-[9px]">
                <span className="text-gray-400 uppercase tracking-wider">صبر الوكيل</span>
                <span className="font-bold" style={{ color: patienceColor }}>
                  {agentMood === "HAPPY"
                    ? "راضٍ جداً 💚"
                    : agentMood === "ANGRY"
                    ? "غاضب جداً ! 🔴"
                    : agentMood === "FRUSTRATED"
                    ? "متوتر 🟡"
                    : "هادئ 🤝"}
                </span>
              </div>
              <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${patiencePct}%`,
                    background: patienceColor,
                    boxShadow: `0 0 8px ${patienceColor}`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          FC 25 FLOATING RIGHT HUD PANEL (INTERACTIVE SLIDERS)
      ══════════════════════════════════════════════════════════════ */}
      <div
        className="absolute top-4 bottom-4 right-4 md:right-8 w-full max-w-[390px] lg:max-w-[420px] z-30 flex flex-col overflow-hidden rounded-2xl border shadow-2xl transition-all duration-500"
        style={{
          background: "rgba(10, 8, 4, 0.88)",
          borderColor: "rgba(212, 175, 55, 0.3)",
          backdropFilter: "blur(22px)",
          boxShadow: "0 25px 60px rgba(0,0,0,0.88), inset 0 1px 0 rgba(212,175,55,0.15)",
          transform: showHUD ? "translateX(0)" : "translateX(110%)",
          opacity: showHUD ? 1 : 0,
        }}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-pmb-gold/15 bg-white/3 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_#ef4444]" />
            <span className="text-[11px] font-black text-pmb-gold tracking-widest uppercase">
              NÉGOCIATION EN COURS
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-400">
              الميزانية: <span className="text-pmb-gold font-bold">{fmt(clubBudget)}</span>
            </span>
            <button
              onClick={onClose}
              className="w-6 h-6 rounded-full border border-white/15 text-white/40 hover:text-white hover:border-white/40 transition flex items-center justify-center text-sm"
            >
              ×
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Free Agent Market One-Chance Banner */}
          {player.isFreeAgentMarket && (
            <div className="p-3 rounded-xl border border-amber-500/40 bg-amber-500/10 text-right backdrop-blur flex items-center justify-between gap-3 shadow-md" dir="rtl">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">⚠️</span>
                <div>
                  <h5 className="text-xs font-black text-amber-300">
                    متجر اللاعبين الأحرار | فرصة واحدة فقط!
                  </h5>
                  <p className="text-[10px] text-gray-300 mt-0.5">
                    احرص على تقديم عرض منطقي؛ إذا انهارت المفاوضات أو غادرت، فلن يتفاوض معك اللاعب ووكيله مرة أخرى.
                  </p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-black bg-amber-400 text-black shrink-0">
                1 Chance
              </span>
            </div>
          )}

          {phase === "NEGOTIATING" && (
            <ContractHUD
              offer={offer}
              demands={demands}
              clubBudget={clubBudget}
              budgetAfterPrime={budgetAfterPrime}
              isNegotiating={isNegotiating}
              agentPatience={agentPatience}
              onOfferChange={setOffer}
              onSubmitOffer={handleSubmitOffer}
              onClose={onClose}
              fmt={fmt}
              compact
            />
          )}

          {phase === "ACCEPTED" && (
            <SigningSequenceFX
              playerName={player.fullName}
              offer={offer}
              clubBudget={clubBudget}
              fmt={fmt}
              onSign={handleSign}
              onClose={onClose}
              compact
            />
          )}

          {phase === "BREAKDOWN" && (
            <div className="text-center py-6 px-4 bg-red-950/30 border border-red-500/30 rounded-2xl animate-fadeIn" dir="rtl">
              <p className="text-4xl mb-2">❌</p>
              <h3 className="text-red-400 text-base font-black mb-1">انهارت المفاوضات رسمياً!</h3>
              <p className="text-gray-300 text-xs leading-relaxed mb-4">
                {player.isFreeAgentMarket
                  ? "نفد صبر الوكيل ورفض شروط العقد تماماً. وفقاً للوائح متجر اللاعبين الأحرار، استنفد ناديك فرصته الوحيدة للتفاوض مع هذا اللاعب ولن تتمكن من تقديم أي عروض جديدة له!"
                  : "نفد صبر الوكيل ورفض شروط العقد. يمكنك إلغاء الصفقة الآن واسترداد 100% من المبلغ المدفوع إلى خزينة ناديك وعودة اللاعب إلى فريقه أو السوق."}
              </p>
              {player.isFreeAgentMarket ? (
                <button
                  onClick={onClose}
                  className="w-full py-3 rounded-xl bg-red-600/80 hover:bg-red-600 text-white font-black text-xs transition"
                >
                  مغادرة غرفة المفاوضات (فرصة مستنفدة)
                </button>
              ) : (
                <div className="flex flex-col gap-2">
                  <button
                    onClick={handleCollapse}
                    disabled={collapsing}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:brightness-110 text-white font-black text-xs transition shadow-[0_0_20px_rgba(220,38,38,0.4)] flex items-center justify-center gap-2"
                  >
                    <span>💰</span>
                    <span>{collapsing ? "جاري استرداد الأموال..." : "إلغاء الصفقة واسترداد 100% من الأموال"}</span>
                  </button>
                  <button
                    onClick={onClose}
                    className="w-full py-2 text-gray-400 hover:text-white text-xs transition"
                  >
                    إغلاق النافذة
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
