import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// ── String Normalization & Similarity ────────────────────────────────────────
function normalizeText(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove accents
    .replace(/[^a-z0-9\u0600-\u06FF\s]/g, " ") // keep alphanumeric and Arabic
    .replace(/\s+/g, " ")
    .trim();
}

function findBestPlayerMatch(
  detectedName: string,
  _detectedNumber: number | null,
  players: { id: string; fullName: string }[]
): { id: string; fullName: string } | null {
  if (!players || players.length === 0) return null;

  const normDetected = normalizeText(detectedName);

  // 1. Exact normalized name match
  const exact = players.find((p) => normalizeText(p.fullName) === normDetected);
  if (exact) return { id: exact.id, fullName: exact.fullName };

  // 2. Last name / word token match
  const detectedWords = normDetected.split(" ").filter((w) => w.length > 2);
  let bestPlayer: { id: string; fullName: string } | null = null;
  let maxMatchedWords = 0;

  for (const p of players) {
    const normPlayer = normalizeText(p.fullName);
    const matched = detectedWords.filter((w) => normPlayer.includes(w)).length;
    if (matched > maxMatchedWords) {
      maxMatchedWords = matched;
      bestPlayer = p;
    }
  }

  if (bestPlayer && maxMatchedWords > 0) {
    return { id: bestPlayer.id, fullName: bestPlayer.fullName };
  }

  return null;
}

// ── POST /api/admin/matches/[matchId]/ai-scan ────────────────────────────────
export async function POST(
  req: NextRequest,
  { params }: { params: { matchId: string } }
) {
  try {
    const session = await auth();
    if (!session || session.user?.role !== "ADMINISTRATOR") {
      return NextResponse.json({ error: "Unauthorized. Admin access required." }, { status: 401 });
    }

    const body = await req.json();
    const { images, apiKey: clientApiKey } = body;

    if (!Array.isArray(images) || images.length === 0) {
      return NextResponse.json(
        { error: "No images provided. Please upload at least one screenshot." },
        { status: 400 }
      );
    }

    // Resolve Gemini API key
    let geminiApiKey = (
      clientApiKey ||
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY
    )?.trim().replace(/^["']|["']$/g, "");

    // Sanitize key against contaminated env values (e.g. accidental DB connection strings)
    if (geminiApiKey && (geminiApiKey.includes("channel_binding") || geminiApiKey.includes("postgresql:") || geminiApiKey.includes("http:"))) {
      geminiApiKey = undefined;
    }

    if (!geminiApiKey) {
      return NextResponse.json(
        {
          error:
            "Google Gemini API Key is not configured. Please set GEMINI_API_KEY in your environment or provide an API Key.",
        },
        { status: 400 }
      );
    }

    // Retrieve match and both squads
    const match = await prisma.match.findUnique({
      where: { id: params.matchId },
      include: {
        homeClub: {
          include: {
            players: {
              where: { status: "REGISTERED" },
              select: { id: true, fullName: true, position: true },
            },
          },
        },
        awayClub: {
          include: {
            players: {
              where: { status: "REGISTERED" },
              select: { id: true, fullName: true, position: true },
            },
          },
        },
        matchLineups: {
          include: {
            starters: { include: { player: true } },
            substitutes: { include: { player: true } },
          },
        },
      },
    });

    if (!match) {
      return NextResponse.json({ error: "Match fixture not found" }, { status: 404 });
    }

    // Build consolidated player lists for both clubs
    const homePlayers = match.homeClub.players;
    const awayPlayers = match.awayClub.players;

    const formatRoster = (players: { id: string; fullName: string; position: string }[]) =>
      players
        .map((p) => `- ID: "${p.id}", Name: "${p.fullName}", Pos: "${p.position}"`)
        .join("\n");

    const prompt = `You are a high-precision computer vision AI specialized in recognizing football video game screenshots (eFootball / PES Mobile & Console, EA Sports FC / FIFA).

The user uploaded ${images.length} screenshot(s) from an official match fixture between:
HOME CLUB: "${match.homeClub.name}" (ID: "${match.homeClub.id}")
AWAY CLUB: "${match.awayClub.name}" (ID: "${match.awayClub.id}")

ROSTER FOR HOME CLUB (${match.homeClub.name}):
${formatRoster(homePlayers)}

ROSTER FOR AWAY CLUB (${match.awayClub.name}):
${formatRoster(awayPlayers)}

SCREEN TYPES TO DETECT:
1. FULL TIME STATS / SCORE SCREEN:
   - Header with Home Team and Away Team names, logos/badges, and final score numbers (e.g. 2 - 3).
   - Names can be in Arabic (e.g., "الكوكب المراكشي"), French/English (e.g., "ASFAR PMB"), or club acronyms (e.g. "RABAT VNR", "MARRAKECH RB").
   - Extract the homeGoals and awayGoals accurately.

2. GOAL & ASSIST REPLAY / HIGHLIGHT CARDS:
   - Yellow/Gold banner with "Goal Scorer" and the minute with an apostrophe (e.g., "30'").
   - Club badge, shirt number (e.g., "18"), and scorer full name (e.g., "Youssef El Fahli").
   - Pink/magenta bottom ribbon with "Assist: [number] [player name]" (e.g., "Assist: 2 Marouane Louadni") or unassisted.
   - For every goal card found across all screenshots:
     - Match the scorer to the candidate player list and output their exact player ID.
     - Match the assist provider (if any) to the player list and output their exact player ID.
     - Note the minute integer (e.g. 30).
     - Assign to the correct clubId.

3. IN-GAME SUBSTITUTIONS (if present on any screen):
   - Player IN, Player OUT, and minute.

OUTPUT FORMAT: Return STRICTLY JSON with this schema (no markdown fences, no conversational text):
{
  "detectedHomeTeam": "string",
  "detectedAwayTeam": "string",
  "homeGoals": number or null,
  "awayGoals": number or null,
  "goals": [
    {
      "clubId": "string (matching home or away club ID)",
      "minute": number,
      "playerId": "string (matching exact player ID from roster)",
      "playerName": "string",
      "playerNumber": number or null,
      "assistPlayerId": "string or null",
      "assistPlayerName": "string or null",
      "assistPlayerNumber": number or null,
      "confidence": number
    }
  ],
  "substitutions": [
    {
      "clubId": "string",
      "minute": number,
      "playerInId": "string",
      "playerInName": "string",
      "playerOutId": "string",
      "playerOutName": "string"
    }
  ],
  "stats": {
    "possession": { "home": number or null, "away": number or null },
    "shots": { "home": number or null, "away": number or null },
    "shotsOnTarget": { "home": number or null, "away": number or null },
    "passes": { "home": number or null, "away": number or null }
  }
}`;

    // Prepare vision parts for Gemini
    const imageParts = images.map((img: { mimeType?: string; data: string }) => {
      let rawData = img.data;
      let mime = img.mimeType || "image/jpeg";

      if (rawData.startsWith("data:")) {
        const matchRegex = rawData.match(/^data:([^;]+);base64,(.+)$/);
        if (matchRegex) {
          mime = matchRegex[1];
          rawData = matchRegex[2];
        }
      }

      return {
        inline_data: {
          mime_type: mime,
          data: rawData,
        },
      };
    });

    const candidateModels = ["gemini-3.6-flash", "gemini-flash-latest", "gemini-2.5-flash", "gemini-1.5-flash"];
    let aiResponseText: string | null = null;
    let lastError: any = null;

    for (const modelName of candidateModels) {
      try {
        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${geminiApiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [
                {
                  role: "user",
                  parts: [{ text: prompt }, ...imageParts],
                },
              ],
              generationConfig: {
                temperature: 0.1,
                responseMimeType: "application/json",
              },
            }),
          }
        );

        if (geminiRes.ok) {
          const json = await geminiRes.json();
          aiResponseText = json.candidates?.[0]?.content?.parts?.[0]?.text;
          if (aiResponseText) break;
        } else {
          const errBody = await geminiRes.json().catch(() => ({}));
          lastError = errBody.error?.message || `Model ${modelName} returned status ${geminiRes.status}`;
        }
      } catch (err: any) {
        lastError = err.message || "Network error calling Gemini API";
      }
    }

    if (!aiResponseText) {
      return NextResponse.json(
        { error: lastError || "Failed to analyze screenshots with Gemini Vision." },
        { status: 502 }
      );
    }

    // Parse AI output
    let parsed: any;
    try {
      parsed = JSON.parse(aiResponseText);
    } catch {
      const cleaned = aiResponseText.replace(/```json\n?|\n?```/g, "").trim();
      parsed = JSON.parse(cleaned);
    }

    // Post-process goals to guarantee exact database player ID matching
    const allPlayers = [...homePlayers, ...awayPlayers];
    const validGoals = (parsed.goals || []).map((g: any) => {
      let clubId = g.clubId;
      if (clubId !== match.homeClub.id && clubId !== match.awayClub.id) {
        const pInHome = homePlayers.some((p: { id: string }) => p.id === g.playerId);
        clubId = pInHome ? match.homeClub.id : match.awayClub.id;
      }

      const relevantSquad = clubId === match.homeClub.id ? homePlayers : awayPlayers;

      // Match Scorer
      let scorerId = g.playerId;
      let scorerName = g.playerName || "";
      const matchedScorer =
        relevantSquad.find((p: { id: string }) => p.id === scorerId) ||
        findBestPlayerMatch(g.playerName || "", g.playerNumber, relevantSquad) ||
        findBestPlayerMatch(g.playerName || "", g.playerNumber, allPlayers);

      if (matchedScorer) {
        scorerId = matchedScorer.id;
        scorerName = matchedScorer.fullName;
      }

      // Match Assist
      let assistId = g.assistPlayerId || null;
      let assistName = g.assistPlayerName || null;
      if (g.assistPlayerName) {
        const matchedAssist =
          relevantSquad.find((p: { id: string }) => p.id === assistId) ||
          findBestPlayerMatch(g.assistPlayerName, g.assistPlayerNumber, relevantSquad) ||
          findBestPlayerMatch(g.assistPlayerName, g.assistPlayerNumber, allPlayers);

        if (matchedAssist) {
          assistId = matchedAssist.id;
          assistName = matchedAssist.fullName;
        }
      }

      return {
        clubId,
        minute: typeof g.minute === "number" ? g.minute : 45,
        playerId: scorerId,
        playerName: scorerName,
        assistPlayerId: assistId,
        assistPlayerName: assistName,
        confidence: g.confidence ?? 0.95,
      };
    });

    return NextResponse.json({
      success: true,
      homeGoals: typeof parsed.homeGoals === "number" ? parsed.homeGoals : null,
      awayGoals: typeof parsed.awayGoals === "number" ? parsed.awayGoals : null,
      goals: validGoals,
      substitutions: parsed.substitutions || [],
      stats: parsed.stats || null,
      detectedHomeTeam: parsed.detectedHomeTeam,
      detectedAwayTeam: parsed.detectedAwayTeam,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Internal server error during AI screenshot scanning." },
      { status: 500 }
    );
  }
}
