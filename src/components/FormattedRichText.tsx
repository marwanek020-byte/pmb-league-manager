"use client";

import React from "react";

/**
 * Premium VIP Football Rich Text Formatter for PMB AI Scout.
 * 
 * Features:
 * - Detects section headers (MATCH PLAN, OPPONENT ANALYSIS, DANGER MEN, TACTICAL RECOMMENDATIONS, XI, TRANSFERS)
 * - Auto-detects Arabic / English direction per block with <bdi> numeral & currency protection
 * - Eliminates raw asterisks, backticks, and markdown artifacts
 * - Formats player bullets with rating badges, position tags, and monetary amounts
 * - Preserves LTR order for tactical terms, player names, and ratings inside RTL Arabic paragraphs
 */

interface FormattedRichTextProps {
  text: string;
  className?: string;
  onPlayerClick?: (playerName: string) => void;
}

export function FormattedRichText({
  text,
  className = "",
  onPlayerClick,
}: FormattedRichTextProps) {
  if (!text) return null;

  const isOverallArabic = /[\u0600-\u06FF]/.test(text);
  const rawLines = text.split("\n");

  // Helper to parse inline bold, code, ratings, currency, and positions with bidirectional safety
  const parseInline = (str: string, isLineArabic: boolean) => {
    // Sanitize accidental raw markdown like *""* or *"
    const cleaned = str.replace(/\*\"/g, '"').replace(/\"\*/g, '"');

    // Tokenize bold **text**, code `text`, currencies €X.XM, ratings XX OVR, positions CF/CB/GK etc.
    const tokens: React.ReactNode[] = [];
    let lastIdx = 0;

    const regex = /(\*\*[^*]+\*\*|`[^`]+`|€\d+(?:\.\d+)?[MBKmbk]?|\b\d{2}\s*OVR\b|\b(?:CF|ST|GK|CB|LB|RB|LWB|RWB|DMF|CMF|AMF|LWF|RWF|CAM|CDM|LW|RW)\b|#[a-zA-Z0-9_\u0600-\u06FF]+)/gi;

    let match;
    while ((match = regex.exec(cleaned)) !== null) {
      if (match.index > lastIdx) {
        tokens.push(cleaned.substring(lastIdx, match.index));
      }

      const token = match[0];

      if (token.startsWith("**") && token.endsWith("**")) {
        const inner = token.substring(2, token.length - 2);
        tokens.push(
          <strong key={match.index} className="font-extrabold text-white">
            <bdi>{inner}</bdi>
          </strong>
        );
      } else if (token.startsWith("`") && token.endsWith("`")) {
        const inner = token.substring(1, token.length - 1);
        tokens.push(
          <span
            key={match.index}
            className="rounded bg-black/70 px-1.5 py-0.5 font-mono text-[11px] font-bold text-pmb-gold border border-pmb-gold/30 inline-block mx-0.5"
          >
            <bdi>{inner}</bdi>
          </span>
        );
      } else if (/^€\d+/i.test(token)) {
        // Currency Badge
        tokens.push(
          <span
            key={match.index}
            className="rounded bg-emerald-950/60 border border-emerald-500/40 px-1.5 py-0.2 text-emerald-300 font-extrabold text-[11px] inline-block mx-0.5 whitespace-nowrap"
          >
            <bdi>{token}</bdi>
          </span>
        );
      } else if (/\b\d{2}\s*OVR\b/i.test(token)) {
        // OVR Rating Badge
        const ratingNum = parseInt(token);
        const badgeColor =
          ratingNum >= 80
            ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
            : ratingNum >= 75
            ? "bg-yellow-500/20 text-yellow-300 border-yellow-500/40"
            : "bg-rose-500/20 text-rose-300 border-rose-500/40";

        tokens.push(
          <span
            key={match.index}
            className={`rounded px-1.5 py-0.2 font-black text-[11px] border inline-block mx-0.5 whitespace-nowrap ${badgeColor}`}
          >
            <bdi>{token}</bdi>
          </span>
        );
      } else if (/^(?:CF|ST|GK|CB|LB|RB|LWB|RWB|DMF|CMF|AMF|LWF|RWF|CAM|CDM|LW|RW)$/i.test(token)) {
        // Positional Chip
        tokens.push(
          <span
            key={match.index}
            className="rounded bg-pmb-gold/20 border border-pmb-gold/40 px-1.5 py-0.2 text-pmb-gold font-extrabold text-[10px] uppercase inline-block mx-0.5 tracking-wider"
          >
            <bdi>{token.toUpperCase()}</bdi>
          </span>
        );
      } else if (token.startsWith("#")) {
        tokens.push(
          <span key={match.index} className="font-bold text-pmb-gold">
            <bdi>{token}</bdi>
          </span>
        );
      }

      lastIdx = regex.lastIndex;
    }

    if (lastIdx < cleaned.length) {
      tokens.push(cleaned.substring(lastIdx));
    }

    return tokens;
  };

  // Group lines into sections and structured elements
  const renderContent = () => {
    const elements: React.ReactNode[] = [];

    rawLines.forEach((line, idx) => {
      const trimmed = line.trim();
      if (!trimmed) {
        elements.push(<div key={`spacer-${idx}`} className="h-2" />);
        return;
      }

      const isLineArabic = /[\u0600-\u06FF]/.test(trimmed);

      // Section Header Detection
      const isHeader =
        /^([#]{1,4}\s*|[🎯⚔️⭐🧠📋🔥💎💡🔮🛡️⚡]\s*|===|\*\*[🎯⚔️⭐🧠📋🔥💎💡🔮🛡️⚡])/.test(trimmed) ||
        /(MATCH PLAN|OPPONENT ANALYSIS|KEY DANGER MEN|TACTICAL RECOMMENDATION|RECOMMENDED XI|KEY INSTRUCTIONS|TRANSFER RECOMMENDATIONS|EXECUTIVE VERDICT|WHAT-IF|خطة المباراة|تحليل الخصم|أخطر اللاعبين|التوصيات التكتيكية|التشكيلة المقترحة|التعليمات الأساسية|توصيات الانتقالات)/i.test(
          trimmed
        );

      if (isHeader) {
        const cleanHeader = trimmed
          .replace(/^[#\s*=]+|[#\s*=]+$/g, "")
          .replace(/^\*\*|\*\*$/g, "");

        let headerAccent = "border-pmb-gold/50 bg-gradient-to-r from-pmb-gold/20 via-black to-transparent text-pmb-gold";
        let icon = "⚡";

        if (/match plan|خطة المباراة/i.test(cleanHeader)) {
          headerAccent = "border-pmb-gold/60 bg-gradient-to-r from-pmb-gold/20 via-black to-transparent text-pmb-gold";
          icon = "🎯";
        } else if (/opponent|adversaire|الخصم/i.test(cleanHeader)) {
          headerAccent = "border-rose-500/50 bg-gradient-to-r from-rose-950/40 via-black to-transparent text-rose-300";
          icon = "⚔️";
        } else if (/danger|threat|menace|أخطر/i.test(cleanHeader)) {
          headerAccent = "border-amber-500/50 bg-gradient-to-r from-amber-950/40 via-black to-transparent text-amber-300";
          icon = "⭐";
        } else if (/tactical|tactique|تكتيك/i.test(cleanHeader)) {
          headerAccent = "border-blue-500/50 bg-gradient-to-r from-blue-950/40 via-black to-transparent text-blue-300";
          icon = "🧠";
        } else if (/transfer|mercato|انتقال|صفق/i.test(cleanHeader)) {
          headerAccent = "border-emerald-500/50 bg-gradient-to-r from-emerald-950/40 via-black to-transparent text-emerald-300";
          icon = "💎";
        } else if (/xi|formation|تشكيل/i.test(cleanHeader)) {
          headerAccent = "border-purple-500/50 bg-gradient-to-r from-purple-950/40 via-black to-transparent text-purple-300";
          icon = "📋";
        }

        elements.push(
          <div
            key={`header-${idx}`}
            dir={isLineArabic ? "rtl" : "ltr"}
            className={`mt-4 mb-2 rounded-xl border p-2.5 sm:p-3 flex items-center gap-2.5 shadow-md ${headerAccent}`}
          >
            <span className="text-base sm:text-lg">{icon}</span>
            <span className="text-xs sm:text-sm font-black uppercase tracking-wider">
              {parseInline(cleanHeader, isLineArabic)}
            </span>
          </div>
        );
        return;
      }

      // Separator Line
      if (trimmed.includes("━━━━") || trimmed.includes("────") || trimmed.includes("====")) {
        elements.push(<hr key={`hr-${idx}`} className="border-white/10 my-3" />);
        return;
      }

      // Bullet Point Detection (•, -, *)
      if (/^[•\-\*]\s+/.test(trimmed)) {
        const bulletText = trimmed.replace(/^[•\-\*]\s+/, "");
        elements.push(
          <div
            key={`bullet-${idx}`}
            dir={isLineArabic ? "rtl" : "ltr"}
            className={`flex items-start gap-2.5 py-1 px-2 rounded-lg hover:bg-white/5 transition ${
              isLineArabic ? "text-right" : "text-left"
            }`}
          >
            <span className="text-pmb-gold text-xs mt-1 select-none font-bold">⚽</span>
            <div className="text-xs sm:text-sm text-gray-200 leading-relaxed flex-1">
              {parseInline(bulletText, isLineArabic)}
            </div>
          </div>
        );
        return;
      }

      // Blockquote / Scout Verdict
      if (/^>\s+/.test(trimmed) || /^"/.test(trimmed) && trimmed.endsWith('"')) {
        const quoteText = trimmed.replace(/^>\s+/, "").replace(/^"|"$/g, "");
        elements.push(
          <div
            key={`quote-${idx}`}
            dir={isLineArabic ? "rtl" : "ltr"}
            className="my-2 rounded-xl border-l-4 border-pmb-gold bg-pmb-gold/10 p-3 sm:p-4 text-xs sm:text-sm text-pmb-gold font-medium italic shadow-inner"
          >
            <p>"{parseInline(quoteText, isLineArabic)}"</p>
          </div>
        );
        return;
      }

      // Regular Paragraph
      elements.push(
        <p
          key={`p-${idx}`}
          dir={isLineArabic ? "rtl" : "ltr"}
          className={`text-xs sm:text-sm text-gray-200 leading-relaxed py-0.5 ${
            isLineArabic ? "text-right font-sans" : "text-left"
          }`}
        >
          {parseInline(trimmed, isLineArabic)}
        </p>
      );
    });

    return elements;
  };

  return (
    <div
      dir={isOverallArabic ? "rtl" : "ltr"}
      className={`space-y-1 ${isOverallArabic ? "font-sans" : ""} ${className}`}
    >
      {renderContent()}
    </div>
  );
}
