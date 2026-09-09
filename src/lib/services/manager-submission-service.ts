import crypto from "crypto";
import { Prisma, BudgetTransactionType, MatchSubmissionStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { lockClubBudget, applyBudgetTransaction } from "@/lib/services/budget-service";

// ── Image Hashing ────────────────────────────────────────────────────────────
export function computeImageHash(base64Data: string): string {
  const clean = base64Data.replace(/^data:[^;]+;base64,/, "");
  return crypto.createHash("sha256").update(clean).digest("hex");
}

// ── String Normalization & Similarity ────────────────────────────────────────
function normalizeText(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\u0600-\u06FF\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function findBestPlayerMatch(
  detectedName: string,
  players: { id: string; fullName: string }[]
): { id: string; fullName: string } | null {
  if (!players || players.length === 0) return null;

  const normDetected = normalizeText(detectedName);
  const exact = players.find((p) => normalizeText(p.fullName) === normDetected);
  if (exact) return { id: exact.id, fullName: exact.fullName };

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

export type ManagerSubmissionInput = {
  matchId: string;
  submittingClubId: string;
  submittingUserId: string;
  images: { mimeType: string; data: string; screenType?: "FULL_TIME" | "GOAL_HIGHLIGHT" | "OTHER" }[];
  apiKey?: string;
};

export async function processManagerMatchSubmission({
  matchId,
  submittingClubId,
  submittingUserId,
  images,
  apiKey,
}: ManagerSubmissionInput) {
  if (!images || images.length === 0) {
    throw new Error("At least one match screenshot must be provided.");
  }

  // 1. Fetch match and rosters
  const match = await prisma.match.findUnique({
    where: { id: matchId },
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
    },
  });

  if (!match) {
    throw new Error("Match fixture not found.");
  }

  if (submittingClubId !== match.homeClubId && submittingClubId !== match.awayClubId) {
    throw new Error("Your club is not a participant in this fixture.");
  }

  const isHome = submittingClubId === match.homeClubId;
  const myClub = isHome ? match.homeClub : match.awayClub;
  const opponentClub = isHome ? match.awayClub : match.homeClub;

  // 2. Compute hashes and check for DUPLICATE / REUSED SCREENSHOT CHEAT (Rule 2)
  const imageWithHashes = images.map((img) => ({
    ...img,
    hash: computeImageHash(img.data),
  }));

  const hashes = imageWithHashes.map((img) => img.hash);

  // Check if any of these hashes were previously submitted in any OTHER match
  const duplicateScreens = await prisma.matchSubmissionScreenshot.findMany({
    where: {
      imageHash: { in: hashes },
      submission: {
        matchId: { not: matchId },
      },
    },
    include: {
      submission: {
        include: {
          match: {
            select: {
              matchday: true,
              homeClub: { select: { name: true } },
              awayClub: { select: { name: true } },
            },
          },
        },
      },
    },
  });

  const fraudReasons: string[] = [];
  let totalPenalty = 0;

  if (duplicateScreens.length > 0) {
    const dupCount = duplicateScreens.length;
    // Penalty: €10,000,000 per fake/duplicate screen, up to €20,000,000
    const dupFine = Math.min(dupCount * 10_000_000, 20_000_000);
    totalPenalty += dupFine;
    fraudReasons.push(
      `REUSED_SCREENSHOT: ${dupCount} screenshot(s) were previously used in another fixture (e.g. Matchday ${duplicateScreens[0].submission.match.matchday}). Reusing match screens is strictly prohibited.`
    );
  }

  // 3. Multimodal Vision Analysis via Gemini 2.0 Flash
  const geminiApiKey = (
    apiKey ||
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY
  )?.trim();

  if (!geminiApiKey) {
    throw new Error("Gemini API key is not configured for vision analysis.");
  }

  const homePlayers = match.homeClub.players;
  const awayPlayers = match.awayClub.players;

  const formatRoster = (players: { id: string; fullName: string; position: string }[]) =>
    players.map((p) => `- ID: "${p.id}", Name: "${p.fullName}", Pos: "${p.position}"`).join("\n");

  const prompt = `You are a strict anti-cheat sports vision AI referee verifying official match screenshots for an eFootball / PES league.

FIXTURE DETAILS:
- Scheduled Home Club: "${match.homeClub.name}" (ID: "${match.homeClub.id}")
- Scheduled Away Club: "${match.awayClub.name}" (ID: "${match.awayClub.id}")
- Submitting Club: "${myClub.name}"
- Scheduled Opponent: "${opponentClub.name}"

ROSTER FOR ${match.homeClub.name}:
${formatRoster(homePlayers)}

ROSTER FOR ${match.awayClub.name}:
${formatRoster(awayPlayers)}

VERIFICATION CHECKS:
1. OPPONENT & TEAM CHECK (ANTI-FRAUD):
   - Examine the teams shown in the Full Time score screen and Goal highlight cards.
   - Look at Arabic team names (e.g., "الكوكب المراكشي", "الجيش الملكي"), English names ("ASFAR PMB"), acronyms ("MARRAKECH RB", "RABAT VNR"), and club badges.
   - Does this screenshot show a match between "${match.homeClub.name}" and "${match.awayClub.name}"?
   - If the screenshot shows a completely different opponent (e.g. against Raja, Wydad, or a random club), set "isOpponentValid": false and state the detected opponent.

2. EXTRACT SCORE & HIGHLIGHT DETAILS:
   - Extract homeGoals and awayGoals.
   - For every goal card found:
     - Match scorer to exact player ID from roster.
     - Match assist player (if any) to exact player ID.
     - Note the minute integer (e.g. 30).
     - Assign correct clubId.

OUTPUT STRICT JSON FORMAT (no markdown fences, no conversational text):
{
  "detectedHomeTeam": "string",
  "detectedAwayTeam": "string",
  "isOpponentValid": boolean,
  "opponentMismatchReason": "string or null",
  "homeGoals": number or null,
  "awayGoals": number or null,
  "goals": [
    {
      "clubId": "string",
      "minute": number,
      "playerId": "string",
      "playerName": "string",
      "assistPlayerId": "string or null",
      "assistPlayerName": "string or null",
      "confidence": number
    }
  ],
  "stats": {
    "possession": { "home": number or null, "away": number or null },
    "shots": { "home": number or null, "away": number or null }
  }
}`;

  const imageParts = imageWithHashes.map((img) => {
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

  const candidateModels = ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-2.5-flash"];
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
            contents: [{ role: "user", parts: [{ text: prompt }, ...imageParts] }],
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
    throw new Error(lastError || "Failed to analyze screenshots with AI Vision.");
  }

  let parsed: any;
  try {
    parsed = JSON.parse(aiResponseText);
  } catch {
    const cleaned = aiResponseText.replace(/```json\n?|\n?```/g, "").trim();
    parsed = JSON.parse(cleaned);
  }

  // 4. Evaluate Opponent Fraud (Rule 1)
  if (parsed.isOpponentValid === false) {
    totalPenalty += 10_000_000; // €10M penalty for wrong opponent
    fraudReasons.push(
      `WRONG_OPPONENT: Screenshot shows a match against "${parsed.detectedAwayTeam || parsed.detectedHomeTeam || "Unknown"}" instead of official scheduled opponent "${opponentClub.name}".`
    );
  }

  // Cap max combined penalty at €20,000,000 (€20M)
  totalPenalty = Math.min(totalPenalty, 20_000_000);
  const isFraud = totalPenalty > 0;

  // 5. Post-process extracted goals
  const allPlayers = [...homePlayers, ...awayPlayers];
  const validGoals = (parsed.goals || []).map((g: any) => {
    let clubId = g.clubId;
    if (clubId !== match.homeClub.id && clubId !== match.awayClub.id) {
      const pInHome = homePlayers.some((p) => p.id === g.playerId);
      clubId = pInHome ? match.homeClub.id : match.awayClub.id;
    }

    const relevantSquad = clubId === match.homeClub.id ? homePlayers : awayPlayers;
    let scorerId = g.playerId;
    let scorerName = g.playerName || "";

    const matchedScorer =
      relevantSquad.find((p) => p.id === scorerId) ||
      findBestPlayerMatch(g.playerName || "", relevantSquad) ||
      findBestPlayerMatch(g.playerName || "", allPlayers);

    if (matchedScorer) {
      scorerId = matchedScorer.id;
      scorerName = matchedScorer.fullName;
    }

    let assistId = g.assistPlayerId || null;
    let assistName = g.assistPlayerName || null;
    if (g.assistPlayerName) {
      const matchedAssist =
        relevantSquad.find((p) => p.id === assistId) ||
        findBestPlayerMatch(g.assistPlayerName, relevantSquad) ||
        findBestPlayerMatch(g.assistPlayerName, allPlayers);

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

  // 6. If fraud detected: Execute automatic disciplinary budget deduction (€10M or €20M)
  let appliedFineDecimal: Prisma.Decimal | null = null;

  if (isFraud) {
    appliedFineDecimal = new Prisma.Decimal(-totalPenalty);

    await prisma.$transaction(async (tx) => {
      const currentBudget = await lockClubBudget(tx, submittingClubId);

      await applyBudgetTransaction(tx, {
        clubId: submittingClubId,
        amount: appliedFineDecimal!,
        currentBudget,
        type: BudgetTransactionType.ADMIN_ADJUSTMENT,
        description: `🚨 DISCIPLINARY PENALTY: -€${(totalPenalty / 1_000_000).toFixed(0)}M fine for falsified match submission in Matchday ${match.matchday}. Reasons: ${fraudReasons.join(" · ")}`,
        matchId,
      });
    });
  }

  // 7. Save MatchSubmission & Screenshots
  const submission = await prisma.matchSubmission.create({
    data: {
      matchId,
      submittingClubId,
      submittedById: submittingUserId,
      status: isFraud ? MatchSubmissionStatus.REJECTED_FRAUD : MatchSubmissionStatus.PENDING_ADMIN_REVIEW,
      homeGoals: parsed.homeGoals ?? 0,
      awayGoals: parsed.awayGoals ?? 0,
      events: validGoals,
      stats: parsed.stats || null,
      aiFraudDetected: isFraud,
      aiFraudReason: isFraud ? fraudReasons.join("; ") : null,
      penaltyApplied: appliedFineDecimal,
      screenshots: {
        create: imageWithHashes.map((img) => ({
          imageHash: img.hash,
          imageUrl: img.data.startsWith("data:") ? img.data.slice(0, 1000) : null,
          screenType: img.screenType || "FULL_TIME",
        })),
      },
    },
    include: {
      screenshots: true,
      submittingClub: { select: { name: true } },
    },
  });

  return {
    submissionId: submission.id,
    status: submission.status,
    isFraud,
    fraudReasons,
    penaltyApplied: totalPenalty > 0 ? `€${(totalPenalty / 1_000_000).toFixed(0)}M` : null,
    homeGoals: parsed.homeGoals ?? 0,
    awayGoals: parsed.awayGoals ?? 0,
    goals: validGoals,
    detectedHomeTeam: parsed.detectedHomeTeam,
    detectedAwayTeam: parsed.detectedAwayTeam,
  };
}
