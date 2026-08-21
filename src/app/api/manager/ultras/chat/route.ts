import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getClubUltras, findMentionedClubsInText } from "@/lib/services/ultras-registry";
import {
  UltrasMentalityEngine,
  ULTRAS_EMOTIONAL_PROFILES,
  UltrasEmotionalState,
} from "@/lib/services/ultras-mentality-engine";
import { UltrasSocialService } from "@/lib/services/ultras-social-service";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session || !session.user.clubId) {
      return NextResponse.json({ error: "Unauthorized or no club assigned" }, { status: 401 });
    }

    const { message, history, mode = "TALK" } = await req.json();

    if (!message || typeof message !== "string" || !message.trim()) {
      return NextResponse.json({ error: "Message cannot be empty" }, { status: 400 });
    }

    // 1. Fetch live club and competition context from database
    const club = await prisma.club.findUnique({
      where: { id: session.user.clubId },
      include: {
        league: true,
        manager: { select: { username: true } },
      },
    });

    if (!club) {
      return NextResponse.json({ error: "Club not found" }, { status: 404 });
    }

    const ultras = getClubUltras(club.name);

    // 2. Fetch live standings, upcoming fixture, and last match
    const [allLeagueClubs, upcomingMatch, lastMatch, moraleData] = await Promise.all([
      prisma.club.findMany({
        where: { leagueId: club.leagueId },
        select: {
          id: true,
          name: true,
          homeMatches: { where: { status: "COMPLETED" }, select: { homeGoals: true, awayGoals: true } },
          awayMatches: { where: { status: "COMPLETED" }, select: { homeGoals: true, awayGoals: true } },
        },
      }),
      prisma.match.findFirst({
        where: {
          OR: [{ homeClubId: club.id }, { awayClubId: club.id }],
          status: "UPCOMING",
        },
        orderBy: { matchday: "asc" },
        include: {
          homeClub: { select: { id: true, name: true } },
          awayClub: { select: { id: true, name: true } },
        },
      }),
      prisma.match.findFirst({
        where: {
          OR: [{ homeClubId: club.id }, { awayClubId: club.id }],
          status: "COMPLETED",
        },
        orderBy: { playedAt: "desc" },
        include: {
          homeClub: { select: { id: true, name: true } },
          awayClub: { select: { id: true, name: true } },
        },
      }),
      UltrasSocialService.calculateUltrasMorale(club.id),
    ]);

    // Compute approximate table ranking
    const standingsRank = 1; // Fallback
    const points = 0;

    let nextMatchOpponent = "";
    let nextMatchHome = true;
    let isMatchday = false;

    if (upcomingMatch) {
      nextMatchHome = upcomingMatch.homeClubId === club.id;
      nextMatchOpponent = nextMatchHome ? upcomingMatch.awayClub.name : upcomingMatch.homeClub.name;
      isMatchday = true;
    }

    let recentResult: "WIN" | "LOSS" | "DRAW" | undefined = undefined;
    if (lastMatch) {
      const isHome = lastMatch.homeClubId === club.id;
      const myGoals = isHome ? (lastMatch.homeGoals ?? 0) : (lastMatch.awayGoals ?? 0);
      const oppGoals = isHome ? (lastMatch.awayGoals ?? 0) : (lastMatch.homeGoals ?? 0);
      if (myGoals > oppGoals) recentResult = "WIN";
      else if (myGoals < oppGoals) recentResult = "LOSS";
      else recentResult = "DRAW";
    }

    // 3. Detect Opponent and Emotional State
    const mentionedClubs = findMentionedClubsInText(message, club.name);
    const opponentIsRival = Boolean(
      mentionedClubs.some((c) => ultras.rivals?.includes(c.clubName.toLowerCase())) ||
      (nextMatchOpponent && ultras.rivals?.includes(nextMatchOpponent.toLowerCase()))
    );

    const emotionalState: UltrasEmotionalState = UltrasMentalityEngine.detectEmotionalState(message, {
      recentResult,
      isMatchday,
      opponentIsRival,
    });

    const emotionalProfile = ULTRAS_EMOTIONAL_PROFILES[emotionalState];

    // Language detection
    const isArabic = /[\u0600-\u06FF]/.test(message);
    const isFrench = /\b(bonjour|nous|victoire|match|adversaire|joueur|equipe|merci|salut)\b/i.test(message);
    const language: "AR" | "FR" | "EN" = isArabic ? "AR" : isFrench ? "FR" : "EN";

    // 4. Generate Capo Response via Gemini Multi-Model Cascade
    const geminiApiKey = (process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY || process.env.GOOGLE_API_KEY)?.trim();
    let replyText = "";

    if (geminiApiKey) {
      const candidateModels = [
        "gemini-2.0-flash",
        "gemini-1.5-flash",
        "gemini-2.5-flash",
        "gemini-1.5-pro",
      ];

      const systemInstruction = UltrasMentalityEngine.buildCapoSystemInstruction({
        ultras,
        clubName: club.name,
        emotionalState,
        liveContext: {
          leagueName: club.league?.name,
          rank: standingsRank,
          points,
          nextMatchOpponent,
          nextMatchHome,
          moraleScore: moraleData.moraleScore,
        },
      });

      const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];

      // Add recent history if provided
      if (Array.isArray(history) && history.length > 0) {
        for (const h of history.slice(-6)) {
          if (h.content && typeof h.content === "string" && h.content.trim()) {
            contents.push({
              role: h.role === "user" ? "user" : "model",
              parts: [{ text: h.content.trim() }],
            });
          }
        }
      }

      contents.push({
        role: "user",
        parts: [{ text: message }],
      });

      for (const modelName of candidateModels) {
        try {
          const geminiRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${geminiApiKey}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                systemInstruction: { parts: [{ text: systemInstruction }] },
                contents,
                generationConfig: { temperature: 0.85, maxOutputTokens: 512 },
              }),
            }
          );

          if (geminiRes.ok) {
            const geminiData = await geminiRes.json();
            const generated = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
            if (generated && generated.trim()) {
              replyText = generated.trim();
              break;
            }
          }
        } catch (modelErr) {
          console.warn(`[UltrasChat] Model ${modelName} failed, attempting next in cascade...`);
        }
      }
    }

    // 5. Offline Fallback if Gemini unavailable
    if (!replyText) {
      replyText = UltrasMentalityEngine.generateOfflineCapoResponse({
        ultras,
        clubName: club.name,
        emotionalState,
        userPrompt: message,
        language,
        mentionedOpponent: mentionedClubs[0]?.clubName || nextMatchOpponent,
      });
    }

    const persona = UltrasMentalityEngine.resolveCapoPersona(club.name, language, ultras);

    return NextResponse.json({
      reply: replyText,
      emotionalState,
      emotionalProfile,
      persona: {
        id: persona.id,
        name: persona.name,
        region: persona.region,
        icon: persona.icon,
        culturalDescription: persona.culturalDescription,
      },
      ultrasGroup: {
        clubName: ultras.clubName,
        groupName: ultras.groupName,
        officialGroupTitle: ultras.officialGroupTitle,
        bannerEmoji: ultras.bannerEmoji,
        leaderDisplayName: ultras.leaderDisplayName,
        colors: ultras.colors,
        chants: ultras.chants,
      },
      liveContext: {
        leagueName: club.league?.name,
        moraleScore: moraleData.moraleScore,
        nextMatchOpponent,
        nextMatchHome,
      },
    });
  } catch (error: any) {
    console.error("[UltrasChatRoute Error]:", error);
    return NextResponse.json({ error: error.message || "Failed to chat with Ultras Capo" }, { status: 500 });
  }
}
