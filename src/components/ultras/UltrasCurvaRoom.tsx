"use client";

import { useState, useEffect, useRef } from "react";
import { UltrasBadge } from "@/components/UltrasBadge";
import { CurvaMatchdayBriefing } from "./CurvaMatchdayBriefing";
import { MatchdayBriefing } from "@/lib/services/ultras-matchday-service";
import { CurvaPostMatchExperience } from "./CurvaPostMatchExperience";
import { PostMatchExperience } from "@/lib/services/ultras-postmatch-service";
import { UltrasAtmosphereStudio } from "./UltrasAtmosphereStudio";
import { StandingsPulseCard } from "./StandingsPulseCard";
import { CurvaAnalyticsPredictor } from "./CurvaAnalyticsPredictor";
import { DerbyBanterCard } from "./DerbyBanterCard";
import { CurvaReputationCard } from "./CurvaReputationCard";
import { CurvaPredictionLeague } from "./CurvaPredictionLeague";
import { ProactiveAlertsWidget } from "./ProactiveAlertsWidget";
import { CurvaTifoLab } from "./CurvaTifoLab";
import { CrossClubBanterArena } from "./CrossClubBanterArena";
import { PyroPressureMeter } from "./PyroPressureMeter";
import { MatchdayCountdownHub } from "./MatchdayCountdownHub";
import { CurvaUltimatumBoardroom } from "./CurvaUltimatumBoardroom";

interface ChatMessage {
  id: string;
  sender: "USER" | "CAPO";
  text: string;
  timestamp: string;
  emotionalState?: string;
  emotionalEmoji?: string;
}

interface UltrasGroupData {
  clubName: string;
  groupName: string;
  officialGroupTitle: string;
  bannerEmoji: string;
  leaderDisplayName: string;
  colors: string[];
  chants: string[];
}

interface CapoPersonaData {
  id: string;
  name: string;
  region: string;
  icon: string;
  culturalDescription: string;
}

interface EmotionalProfile {
  state: string;
  emoji: string;
  nameArabic: string;
  nameFrench: string;
  nameEnglish: string;
  description: string;
}

export function UltrasCurvaRoom({
  clubName,
  clubLogo,
  managerUsername,
  initialMorale = 80,
}: {
  clubName: string;
  clubLogo: string | null;
  managerUsername: string;
  initialMorale?: number;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeMode, setActiveMode] = useState<string>("TALK");
  const [ultrasGroup, setUltrasGroup] = useState<UltrasGroupData | null>(null);
  const [persona, setPersona] = useState<CapoPersonaData | null>(null);
  const [matchdayBriefing, setMatchdayBriefing] = useState<MatchdayBriefing | null>(null);
  const [postMatchExperience, setPostMatchExperience] = useState<PostMatchExperience | null>(null);
  const [emotionalProfile, setEmotionalProfile] = useState<EmotionalProfile | null>({
    state: "MATCHDAY_FEVER",
    emoji: "🔥",
    nameArabic: "حماس يوم المباراة",
    nameFrench: "Ferveur de Match",
    nameEnglish: "Matchday Fever",
    description: "الحناجر مشتعلة، والتركيز 100% على الميدان والشرف!",
  });
  const [moraleScore, setMoraleScore] = useState(initialMorale);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initial welcome message from the Capo & fetch matchday briefing and post-match debrief
  useEffect(() => {
    const isMoroccan = /far|raja|wydad|fes|tanger|berkane|agadir|safi|tetouan/i.test(clubName);
    const welcomeText = isMoroccan
      ? `سلام يا كوتش @${managerUsername} 👑! الكورفا كاملة حاضرة والمدرج فقمة الحماس! دخل تواصل مع الكابو فهاد الروم.. شنو هو المخطط ديالنا للماتش الجاي؟ 💚🖤🔥`
      : `Welcome to the Curva, Boss @${managerUsername}! The terrace is rocking and the flares are lit! What's the battle plan for our next clash? ⚒️🔥`;

    setMessages([
      {
        id: "msg-welcome",
        sender: "CAPO",
        text: welcomeText,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        emotionalState: "MATCHDAY_FEVER",
        emotionalEmoji: "🔥",
      },
    ]);

    // Fetch Matchday Briefing
    fetch("/api/manager/ultras/matchday")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setMatchdayBriefing(data);
      })
      .catch((err) => console.error("Failed to load matchday briefing:", err));

    // Fetch Post-Match Experience
    fetch("/api/manager/ultras/postmatch")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setPostMatchExperience(data);
      })
      .catch((err) => console.error("Failed to load post-match experience:", err));
  }, [clubName, managerUsername]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputMessage).trim();
    if (!query || loading) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: "USER",
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage("");
    setLoading(true);

    try {
      const historyPayload = messages.map((m) => ({
        role: m.sender === "USER" ? "user" : "model",
        content: m.text,
      }));

      const res = await fetch("/api/manager/ultras/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: query,
          history: historyPayload,
          mode: activeMode,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.ultrasGroup) setUltrasGroup(data.ultrasGroup);
        if (data.persona) setPersona(data.persona);
        if (data.emotionalProfile) setEmotionalProfile(data.emotionalProfile);
        if (data.liveContext?.moraleScore) setMoraleScore(data.liveContext.moraleScore);

        const capoMsg: ChatMessage = {
          id: `msg-capo-${Date.now()}`,
          sender: "CAPO",
          text: data.reply,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          emotionalState: data.emotionalState,
          emotionalEmoji: data.emotionalProfile?.emoji || "🔥",
        };

        setMessages((prev) => [...prev, capoMsg]);
      } else {
        throw new Error("Failed to get Capo reply");
      }
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          id: `msg-err-${Date.now()}`,
          sender: "CAPO",
          text: `🔥 ديما ${clubName}! الحناجر مشتعلة ووراكم فكل خطوة! واصل القتالية فالميدان!`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          emotionalEmoji: "🔥",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const quickPrompts = [
    { label: "🔥 Matchday Call to Arms", prompt: "أعطينا نداء الكورفا وحماس يوم المباراة قبل الماتش الجاي!" },
    { label: "⚔️ Derby Banter", prompt: "كيفاش غانسيطرو على الديربي ونردع الخصوم؟" },
    { label: "🎤 Original Chant", prompt: "أعطينا أنشودة أو شانت جديد نشجعو بيه الفرقة فالمدرجات!" },
    { label: "🏆 Title Race Spirit", prompt: "شنو هي رسالة الكابو للاعبين باش ننافسو على اللقب لآخر ثانية؟" },
  ];

  return (
    <div className="space-y-6">
      {/* ═══ 1. TOP CURVA COMMAND BANNER ═══ */}
      <div className="relative overflow-hidden rounded-3xl border border-pmb-gold/30 bg-gradient-to-br from-black via-zinc-950 to-zinc-900 p-6 shadow-[0_10px_35px_rgba(0,0,0,0.8)] backdrop-blur-xl">
        {/* Glow backdrop */}
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-pmb-gold/10 blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          {/* Left: Club & Ultras Crest */}
          <div className="flex items-center gap-4">
            <UltrasBadge clubName={clubName} size="lg" />
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-[10px] font-black uppercase tracking-[.25em] text-pmb-gold">
                  Curva Capo Command Hub
                </span>
                {persona && (
                  <span className="rounded-full border border-pmb-gold/30 bg-pmb-gold/10 px-2 py-0.5 text-[9px] font-black text-pmb-gold">
                    {persona.icon} {persona.name}
                  </span>
                )}
              </div>
              <h2 className="mt-0.5 text-2xl font-black uppercase tracking-tight text-white sm:text-3xl">
                {ultrasGroup?.groupName || `${clubName} Ultras`}
              </h2>
              <p className="text-xs font-semibold text-gray-400">
                {ultrasGroup?.officialGroupTitle || `Virage & Loyal Supporter Companion`}
              </p>
            </div>
          </div>

          {/* Right: Emotional State & Morale Index */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Emotional State Badge */}
            {emotionalProfile && (
              <div className="flex items-center gap-2 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 backdrop-blur-md">
                <span className="text-xl animate-bounce">{emotionalProfile.emoji}</span>
                <div>
                  <p className="text-[9px] font-extrabold uppercase tracking-wider text-amber-300">
                    Curva State
                  </p>
                  <p className="text-xs font-black text-white">{emotionalProfile.nameEnglish}</p>
                </div>
              </div>
            )}

            {/* Morale Index */}
            <div className="rounded-2xl border border-white/10 bg-black/60 px-4 py-2.5 text-right backdrop-blur-md">
              <p className="text-[9px] font-extrabold uppercase tracking-wider text-gray-400">
                Ultras Morale
              </p>
              <p className={`text-base font-black ${moraleScore >= 70 ? "text-emerald-400" : moraleScore >= 40 ? "text-amber-400" : "text-rose-400"}`}>
                {moraleScore}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ 2. SUPPORTER INTERACTION & INNOVATION MODES ═══ */}
      <div className="flex flex-wrap items-center gap-2">
        {[
          { id: "TALK", icon: "🗣️", label: "Talk to Capo" },
          { id: "HYPE", icon: "🔥", label: "Matchday Hype" },
          { id: "TIFO_LAB", icon: "🎨", label: "TIFO Lab" },
          { id: "BANTER_ARENA", icon: "⚔️", label: "Banter Arena" },
          { id: "PYRO_PRESSURE", icon: "🔥", label: "Pyro Pressure" },
          { id: "COUNTDOWN", icon: "⏱️", label: "Chant Jukebox" },
          { id: "ULTIMATUM", icon: "🚨", label: "Boardroom Crisis" },
          { id: "STANDINGS", icon: "📊", label: "Standings Pulse" },
          { id: "PREDICT", icon: "🔮", label: "AI Analytics" },
          { id: "PREDICTIONS", icon: "🎲", label: "Prediction League" },
          { id: "ALERTS", icon: "🚨", label: "Proactive Alerts" },
          { id: "REPUTATION", icon: "👑", label: "Curva XP & Tiers" },
          { id: "DEBRIEF", icon: "🏁", label: "Post-Match Debrief" },
        ].map((mode) => (
          <button
            key={mode.id}
            onClick={() => setActiveMode(mode.id)}
            className={`flex items-center gap-1.5 rounded-xl border px-3.5 py-1.5 text-xs font-black transition-all ${
              activeMode === mode.id
                ? "border-pmb-gold bg-pmb-gold text-black shadow-[0_0_15px_rgba(212,175,55,0.4)] scale-105"
                : "border-white/10 bg-zinc-900/80 text-gray-300 hover:border-white/30 hover:text-white"
            }`}
          >
            <span>{mode.icon}</span>
            <span>{mode.label}</span>
          </button>
        ))}
      </div>

      {/* ═══ 2.5 MATCHDAY BRIEFING CARD (When activeMode === HYPE or live upcoming match) ═══ */}
      {matchdayBriefing && (activeMode === "HYPE" || (matchdayBriefing.hasUpcomingMatch && activeMode === "TALK")) && (
        <CurvaMatchdayBriefing briefing={matchdayBriefing} clubName={clubName} />
      )}

      {/* ═══ 2.6 POST-MATCH EXPERIENCE CARD (Craquage vs Crisis Meeting) ═══ */}
      {postMatchExperience && postMatchExperience.hasCompletedMatch && activeMode === "DEBRIEF" && (
        <CurvaPostMatchExperience postmatch={postMatchExperience} clubName={clubName} />
      )}

      {/* ═══ 2.7 CHANTS & TIFO ATMOSPHERE STUDIO ═══ */}
      {(activeMode === "CHANT" || activeMode === "TIFO") && (
        <UltrasAtmosphereStudio clubName={clubName} />
      )}

      {/* ═══ INNOVATION 1: CURVA TIFO CHOREOGRAPHY LAB ═══ */}
      {activeMode === "TIFO_LAB" && (
        <CurvaTifoLab clubName={clubName} />
      )}

      {/* ═══ INNOVATION 2: CROSS-CLUB BANTER ARENA (AI vs AI Debate) ═══ */}
      {activeMode === "BANTER_ARENA" && (
        <CrossClubBanterArena clubName={clubName} />
      )}

      {/* ═══ INNOVATION 3: PYRO & PRESSURE DYNAMIC METER ═══ */}
      {activeMode === "PYRO_PRESSURE" && (
        <PyroPressureMeter clubName={clubName} />
      )}

      {/* ═══ INNOVATION 4: MATCHDAY COUNTDOWN & CHANT JUKEBOX ═══ */}
      {activeMode === "COUNTDOWN" && (
        <MatchdayCountdownHub clubName={clubName} matchdayBriefing={matchdayBriefing} />
      )}

      {/* ═══ INNOVATION 5: CURVA ULTIMATUM BOARDROOM CRISIS ═══ */}
      {activeMode === "ULTIMATUM" && (
        <CurvaUltimatumBoardroom clubName={clubName} />
      )}

      {/* ═══ STANDINGS PULSE CARD ═══ */}
      {activeMode === "STANDINGS" && (
        <StandingsPulseCard clubName={clubName} />
      )}

      {/* ═══ AI SUPPORTER ANALYTICS & PREDICTIONS (Grounded in PMB Data) ═══ */}
      {activeMode === "PREDICT" && (
        <CurvaAnalyticsPredictor clubName={clubName} />
      )}

      {/* ═══ DERBY BANTER CARD ═══ */}
      {activeMode === "BANTER" && (
        <DerbyBanterCard clubName={clubName} />
      )}

      {/* ═══ PROACTIVE ULTRAS ALERTS (Live Radar & Direct Feeds) ═══ */}
      {activeMode === "ALERTS" && (
        <ProactiveAlertsWidget clubName={clubName} />
      )}

      {/* ═══ CURVA REPUTATION & SUPPORTER PROFILE CARD ═══ */}
      {activeMode === "REPUTATION" && (
        <CurvaReputationCard clubName={clubName} />
      )}

      {/* ═══ MATCHDAY PREDICTION LEAGUE CARD ═══ */}
      {activeMode === "PREDICTIONS" && (
        <CurvaPredictionLeague clubName={clubName} matchdayBriefing={matchdayBriefing} />
      )}

      {/* ═══ 3. INTERACTIVE CHAT STREAM ═══ */}
      <div className="flex flex-col h-[520px] rounded-3xl border border-white/10 bg-black/75 backdrop-blur-xl shadow-2xl overflow-hidden">
        {/* Messages list */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {messages.map((msg) => {
            const isUser = msg.sender === "USER";
            return (
              <div
                key={msg.id}
                className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}
              >
                {!isUser && <UltrasBadge clubName={clubName} size="sm" />}
                <div
                  className={`max-w-[85%] rounded-2xl p-4 text-sm leading-relaxed ${
                    isUser
                      ? "bg-pmb-gold text-black font-semibold shadow-md ml-4"
                      : "bg-zinc-900/90 text-white border border-white/10 shadow-lg mr-4"
                  }`}
                >
                  <div className="flex items-center justify-between gap-4 mb-1">
                    <span className="text-[10px] font-black uppercase tracking-wider opacity-75">
                      {isUser ? `@${managerUsername}` : ultrasGroup?.leaderDisplayName || `${clubName} Capo`}
                    </span>
                    <div className="flex items-center gap-1.5 text-[10px] opacity-60">
                      {msg.emotionalEmoji && <span>{msg.emotionalEmoji}</span>}
                      <span>{msg.timestamp}</span>
                    </div>
                  </div>
                  <div className="whitespace-pre-wrap font-sans">{msg.text}</div>
                </div>
              </div>
            );
          })}

          {loading && (
            <div className="flex items-center gap-3">
              <UltrasBadge clubName={clubName} size="sm" />
              <div className="rounded-2xl bg-zinc-900/90 border border-white/10 p-3.5 text-xs text-pmb-gold flex items-center gap-2 animate-pulse">
                <span className="h-2 w-2 rounded-full bg-pmb-gold animate-ping" />
                <span>The Capo is responding from the Curva...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick prompt suggestions */}
        <div className="border-t border-white/10 bg-zinc-950/90 p-2.5 px-4 flex items-center gap-2 overflow-x-auto scrollbar-none">
          <span className="text-[10px] font-black uppercase tracking-wider text-pmb-gold shrink-0">
            ⚡ Quick Calls:
          </span>
          {quickPrompts.map((qp, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(qp.prompt)}
              className="shrink-0 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-gray-300 hover:border-pmb-gold/50 hover:text-white transition"
            >
              {qp.label}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="p-3 sm:p-4 bg-black/95 border-t border-white/10 flex items-center gap-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
            placeholder="Talk to your Capo (tactics, match hype, chants, rivalry banter)..."
            className="flex-1 rounded-xl border border-white/15 bg-zinc-900/90 px-4 py-3 text-sm text-white placeholder-gray-500 focus:border-pmb-gold focus:outline-none"
          />
          <button
            onClick={() => handleSendMessage()}
            disabled={loading || !inputMessage.trim()}
            className="flex items-center gap-1.5 rounded-xl bg-pmb-gold px-5 py-3 text-sm font-black text-black hover:bg-amber-400 disabled:opacity-50 transition shadow-lg shrink-0"
          >
            <span>Roar</span>
            <span>📢</span>
          </button>
        </div>
      </div>
    </div>
  );
}
