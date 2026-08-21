"use client";

import React, { useState, useRef, useEffect } from "react";
import { FormattedRichText } from "@/components/FormattedRichText";

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  recommendedPlayers?: Array<{
    id: string;
    name: string;
    position: string;
    overallRating: number;
    fitScore?: number;
    archetype?: string;
  }>;
};

interface ChiefScoutCommandWorkspaceProps {
  chatMessages: ChatMessage[];
  isSendingMessage: boolean;
  clubName: string;
  budgetEur: number;
  onSendMessage: (message: string) => void;
  onResetConversation: () => void;
  onOpenDossier: (playerId: string) => void;
}

const SUGGESTED_PROMPTS = [
  { label: "⚔️ Scout Next Opponent", query: "Scout my next opponent and give me a full tactical match plan." },
  { label: "🛡️ Analyze My Squad", query: "Analyze my squad depth, health scores, and identify our biggest gaps." },
  { label: "🇲🇦 Moroccan CBs 80+", query: "Show me Moroccan central defenders (CB) rated 80+ OVR." },
  { label: "💰 Best Player Under €15M", query: "Find the highest rated player I can afford under €15M." },
  { label: "📋 Build Starting XI", query: "Build the strongest tactical starting XI from my current squad." },
  { label: "⚡ Alternatives to CF", query: "Find high-impact striker (CF/ST) alternatives for my starting lineup." },
  { label: "🔮 What If I Spend €20M?", query: "What if I spend €20M on marquee signings? How does it affect our league rank?" },
  { label: "🇲🇦 خطة الماتش الجاي", query: "عطيني خطة الماتش الجاي ونقاط القوة والضعف ديال الخصم والتشكيلة المناسبة" },
  { label: "🇲🇦 أحسن مهاجم متاح", query: "شكون أحسن مهاجم صريح متاح فالمارشي نقدروا نشريوه بالميزانية ديالنا؟" },
  { label: "🇫🇷 Plan de Match", query: "Donne-moi l'analyse tactique et le plan de match contre le prochain adversaire." },
];

export function ChiefScoutCommandWorkspace({
  chatMessages,
  isSendingMessage,
  clubName,
  budgetEur,
  onSendMessage,
  onResetConversation,
  onOpenDossier,
}: ChiefScoutCommandWorkspaceProps) {
  const [inputValue, setInputValue] = useState("");
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom on new messages or typing state changes
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTo({
        top: chatScrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [chatMessages, isSendingMessage]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = inputValue.trim();
    if (!trimmed || isSendingMessage) return;
    onSendMessage(trimmed);
    setInputValue("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    // Auto-resize textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  };

  const copyMessage = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  return (
    <section className="relative rounded-3xl border border-pmb-gold/40 bg-gradient-to-b from-[#0c0c10] via-[#08080a] to-[#040406] shadow-2xl overflow-hidden backdrop-blur-xl flex flex-col">
      {/* ── 1. VIP EXECUTIVE TOP HEADER DECK ──────────────────────────────── */}
      <div className="border-b border-white/10 bg-black/60 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-pmb-gold/25 via-pmb-gold/10 to-transparent border border-pmb-gold/50 text-2xl shadow-lg">
            🧠
            <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-black" />
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-extrabold font-serif text-white tracking-wide flex items-center gap-2">
                <span>AI Sporting Intelligence Deck</span>
              </h2>
              <span className="rounded-full bg-pmb-gold/20 border border-pmb-gold/50 px-2 py-0.5 text-[10px] font-black text-pmb-gold uppercase tracking-wider">
                VIP PRO
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400 mt-0.5">
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 inline-block" />
                PostgreSQL Synced (422 Players)
              </span>
              <span>•</span>
              <span className="text-gray-300">
                Club: <strong className="text-white">{clubName}</strong>
              </span>
              <span>•</span>
              <span className="text-pmb-gold font-bold">
                Treasury: €{(budgetEur / 1_000_000).toFixed(1)}M
              </span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            onClick={onResetConversation}
            className="flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3.5 py-2 text-xs font-bold text-gray-300 hover:border-pmb-gold hover:text-pmb-gold hover:bg-pmb-gold/10 transition shadow-sm"
            title="Start fresh tactical session"
          >
            <span>🧹</span>
            <span>New Session</span>
          </button>
        </div>
      </div>

      {/* ── 2. EXPANSIVE CONVERSATION STREAM WORKSPACE ─────────────────────── */}
      <div
        ref={chatScrollRef}
        className="flex-1 min-h-[520px] max-h-[780px] overflow-y-auto px-4 sm:px-8 py-6 space-y-6 scroll-smooth"
        style={{
          scrollbarWidth: "thin",
          scrollbarColor: "#D4AF37 #000000",
        }}
      >
        {chatMessages.map((msg, idx) => {
          const isUser = msg.role === "user";

          return (
            <div
              key={idx}
              className={`flex ${isUser ? "justify-end" : "justify-start"} w-full animate-fadeIn`}
            >
              {isUser ? (
                /* USER MESSAGE BUBBLE */
                <div className="max-w-[85%] sm:max-w-[70%] rounded-3xl rounded-br-none border border-pmb-gold/40 bg-gradient-to-r from-pmb-gold/20 via-black to-pmb-gold/10 p-4 sm:p-5 text-white shadow-xl">
                  <div className="flex items-center justify-between gap-3 mb-2 border-b border-white/10 pb-2 text-[11px] text-gray-400">
                    <span className="font-bold text-pmb-gold flex items-center gap-1.5">
                      <span>👔</span>
                      <span>Club Manager</span>
                    </span>
                    <span>Direct Order</span>
                  </div>
                  <div dir="auto" className="text-sm sm:text-base font-semibold leading-relaxed text-gray-100">
                    {msg.content}
                  </div>
                </div>
              ) : (
                /* CHIEF SCOUT AI INTELLIGENCE REPORT BUBBLE */
                <div className="w-full max-w-[100%] rounded-3xl rounded-bl-none border border-white/15 bg-gradient-to-b from-[#131318] via-[#0d0d12] to-[#08080b] p-5 sm:p-7 text-gray-100 shadow-2xl space-y-4">
                  {/* Executive AI Header */}
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-pmb-gold/20 border border-pmb-gold/40 text-pmb-gold font-black text-sm">
                        PMB
                      </div>
                      <div>
                        <span className="text-xs font-black uppercase tracking-wider text-pmb-gold">
                          Sporting Director & Tactical Intelligence Report
                        </span>
                        <div className="flex items-center gap-2 text-[10px] text-gray-400">
                          <span className="text-emerald-400 font-bold">✓ 100% In-Game Database Verified</span>
                          <span>•</span>
                          <span>VIP Strategic Briefing</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => copyMessage(msg.content, idx)}
                      className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-bold text-gray-400 hover:text-white hover:bg-white/10 transition flex items-center gap-1"
                      title="Copy full analysis"
                    >
                      <span>{copiedIdx === idx ? "✓ Copied!" : "📋 Copy"}</span>
                    </button>
                  </div>

                  {/* Message Body with Structured Sections & RTL Safety */}
                  <div className="text-sm sm:text-base leading-relaxed text-gray-200">
                    <FormattedRichText text={msg.content} />
                  </div>

                  {/* 1-Click Interactive Player Action Cards */}
                  {msg.recommendedPlayers && msg.recommendedPlayers.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-white/10 space-y-2.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-extrabold uppercase text-pmb-gold tracking-wider flex items-center gap-1.5">
                          <span>⚡</span>
                          <span>Identified Target Dossiers ({msg.recommendedPlayers.length}):</span>
                        </span>
                        <span className="text-gray-400">Click to inspect complete evaluation card</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                        {msg.recommendedPlayers.map((p) => (
                          <button
                            key={p.id}
                            onClick={() => onOpenDossier(p.id)}
                            className="group flex items-center justify-between rounded-xl border border-white/10 bg-black/60 hover:border-pmb-gold hover:bg-pmb-gold/15 p-3 text-left transition shadow-md"
                          >
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-white text-xs sm:text-sm group-hover:text-pmb-gold transition">
                                  {p.name}
                                </span>
                                <span className="rounded bg-pmb-gold/20 border border-pmb-gold/40 px-1 py-0.2 text-[10px] font-extrabold text-pmb-gold">
                                  {p.position}
                                </span>
                              </div>
                              {p.archetype && (
                                <p className="text-[10px] text-gray-400 font-medium truncate">
                                  {p.archetype}
                                </p>
                              )}
                            </div>

                            <div className="flex flex-col items-end gap-1">
                              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-pmb-gold font-black text-black text-xs shadow">
                                {p.overallRating}
                              </div>
                              {p.fitScore !== undefined && (
                                <span className="rounded bg-emerald-500/20 text-emerald-300 px-1 text-[9px] font-black">
                                  {p.fitScore}/100 Fit
                                </span>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Tactical Thinking Spinner */}
        {isSendingMessage && (
          <div className="flex justify-start w-full animate-pulse">
            <div className="rounded-3xl rounded-bl-none border border-pmb-gold/40 bg-gradient-to-r from-[#121217] via-black to-[#121217] p-5 text-xs sm:text-sm text-gray-300 shadow-2xl flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-pmb-gold/20 text-pmb-gold text-base animate-spin">
                ⏳
              </div>
              <div>
                <p className="font-extrabold text-white">Chief Scout AI is executing tactical calculations...</p>
                <p className="text-[11px] text-pmb-gold">Cross-referencing 422 players, fit scores, and opposition blueprints in real time.</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── 3. DOCKED VIP COMMAND CENTER & PROMPT SUGGESTIONS ──────────────── */}
      <div className="border-t border-white/10 bg-black/90 p-4 sm:p-6 space-y-3.5 backdrop-blur-xl">
        {/* Suggested Quick Prompt Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-[10px] font-black uppercase text-gray-400 whitespace-nowrap">
            💡 Quick Briefs:
          </span>
          {SUGGESTED_PROMPTS.map((prompt, i) => (
            <button
              key={i}
              onClick={() => onSendMessage(prompt.query)}
              disabled={isSendingMessage}
              className="rounded-full border border-white/15 bg-white/5 hover:border-pmb-gold hover:bg-pmb-gold/15 hover:text-white px-3 py-1 text-xs font-semibold text-gray-300 transition whitespace-nowrap shadow-sm disabled:opacity-50"
            >
              {prompt.label}
            </button>
          ))}
        </div>

        {/* Command Bar Input Box */}
        <form
          onSubmit={handleSubmit}
          className="relative rounded-2xl border border-white/20 bg-pmb-charcoal/90 p-2 sm:p-2.5 flex items-end gap-2 shadow-2xl focus-within:border-pmb-gold focus-within:ring-2 focus-within:ring-pmb-gold/40 focus-within:shadow-[0_0_30px_rgba(212,175,55,0.25)] transition"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-pmb-gold/10 text-pmb-gold text-lg select-none">
            ✨
          </div>

          <textarea
            ref={textareaRef}
            rows={1}
            value={inputValue}
            onChange={handleTextareaInput}
            onKeyDown={handleKeyDown}
            placeholder="Direct your Chief Scout (e.g. 'Scout next opponent', 'Show Moroccan CBs rated 80+', 'Find best player under €15M', 'Build my starting XI')..."
            className="flex-1 bg-transparent text-sm text-white placeholder-gray-500 focus:outline-none resize-none py-2 px-1 max-h-[140px] leading-relaxed"
          />

          <button
            type="submit"
            disabled={isSendingMessage || !inputValue.trim()}
            className="shrink-0 rounded-xl bg-pmb-gold px-5 py-2.5 text-xs font-black text-black hover:bg-white transition disabled:opacity-40 disabled:cursor-not-allowed shadow-lg flex items-center gap-1.5"
          >
            <span>{isSendingMessage ? "Processing..." : "Transmit"}</span>
            <span>➔</span>
          </button>
        </form>

        <div className="flex justify-between items-center text-[11px] text-gray-400 px-1">
          <span>Press <kbd className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-gray-300">Enter ↵</kbd> to transmit command • <kbd className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-gray-300">Shift + Enter</kbd> for multi-line</span>
          <span className="text-emerald-400 font-bold">100/100 Sporting Director Engine</span>
        </div>
      </div>
    </section>
  );
}
