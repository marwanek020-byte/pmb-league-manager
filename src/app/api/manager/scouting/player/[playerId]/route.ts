import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: { playerId: string } }
) {
  try {
    const session = await auth();

    if (!session || !session.user.clubId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { playerId } = params;

    const [club, player] = await Promise.all([
      prisma.club.findUnique({
        where: { id: session.user.clubId },
        include: {
          players: {
            where: { status: "REGISTERED" },
            orderBy: { overallRating: "desc" },
          },
        },
      }),
      prisma.player.findUnique({
        where: { id: playerId },
        include: {
          pmbClub: { select: { id: true, name: true, logo: true } },
          auctions: {
            where: { status: "ACTIVE", expiresAt: { gt: new Date() } },
            take: 1,
          },
        },
      }),
    ]);

    if (!club) {
      return NextResponse.json({ error: "Club not found" }, { status: 404 });
    }

    if (!player) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 });
    }

    const budget = Number(club.budget);
    const playerPrice = Number(player.marketValue ?? 0);
    const playerOvr = player.overallRating ?? 75;
    const pos = player.position.toUpperCase();

    // Squad comparison: find current starters / best player at this position in user's club
    const clubPlayersAtPos = club.players.filter((p) =>
      p.position.toUpperCase().includes(pos) || pos.includes(p.position.toUpperCase())
    );
    const bestClubPlayerAtPos = clubPlayersAtPos[0] || null;
    const clubPosAvg =
      clubPlayersAtPos.length > 0
        ? Math.round(
            clubPlayersAtPos.reduce((sum, p) => sum + (p.overallRating ?? 75), 0) /
              clubPlayersAtPos.length
          )
        : null;

    const squadAvgOvr =
      club.players.length > 0
        ? Math.round(
            club.players.reduce((sum, p) => sum + (p.overallRating ?? 75), 0) /
              club.players.length
          )
        : 75;

    const ovrDeltaVsSquad = playerOvr - squadAvgOvr;
    const ovrDeltaVsPos = bestClubPlayerAtPos
      ? playerOvr - (bestClubPlayerAtPos.overallRating ?? 75)
      : playerOvr - squadAvgOvr;

    // Strengths & Weaknesses generator based on position & rating
    const strengths: string[] = [];
    const weaknesses: string[] = [];

    if (playerOvr >= 85) {
      strengths.push("Elite world-class rating & composure");
      strengths.push("High match-winning impact in clutch fixtures");
    } else if (playerOvr >= 80) {
      strengths.push("Proven high-level consistency & tactical maturity");
    }

    if (/GK/i.test(pos)) {
      strengths.push("Commanding aerial reach & reflex shot-stopping");
      if (playerOvr < 78) weaknesses.push("Vulnerable to long-range efforts and corner scrambles");
    } else if (/CB/i.test(pos)) {
      strengths.push("Dominant aerial duels & box clearance");
      if (playerOvr < 78) weaknesses.push("Vulnerable to agile pacey dribblers in 1v1 transitions");
    } else if (/LB|RB/i.test(pos)) {
      strengths.push("Speed down the flanks & recovery defending");
      if (playerOvr < 78) weaknesses.push("Can be caught out of position during defensive transitions");
    } else if (/DMF/i.test(pos)) {
      strengths.push("Tackling interception & defensive shield");
      if (playerOvr < 78) weaknesses.push("Limited progressive passing range under heavy press");
    } else if (/CMF|AMF/i.test(pos)) {
      strengths.push("Vision, link-up passing & tempo control");
      if (playerOvr < 78) weaknesses.push("Physical duel success rate in crowded midfield battles");
    } else if (/CF|ST/i.test(pos)) {
      strengths.push("Clinical finishing inside the penalty box");
      if (playerOvr < 78) weaknesses.push("Inconsistent conversion on half-chances");
    } else if (/LWF|RWF|LW|RW/i.test(pos)) {
      strengths.push("Explosive acceleration & 1v1 take-ons on the wing");
      if (playerOvr < 78) weaknesses.push("Can be crowded out by physical double-marking fullbacks");
    }

    if (weaknesses.length === 0) weaknesses.push("Occasional fatigue in congested fixture weeks");

    // Squad Role Prediction
    let squadRole = "Rotation Option";
    if (ovrDeltaVsPos >= 3 || (!bestClubPlayerAtPos && playerOvr >= squadAvgOvr)) {
      squadRole = "Key Undisputed Starter";
    } else if (ovrDeltaVsPos >= 0) {
      squadRole = "First-Team Contender";
    } else if (ovrDeltaVsPos >= -3) {
      squadRole = "Valuable Squad Depth / Impact Sub";
    }

    // Recommendation Badge Calculation
    let recommendation: "HIGHLY_RECOMMENDED" | "CONSIDER" | "ONLY_IF_NEEDED" | "NOT_RECOMMENDED" = "CONSIDER";
    let recommendationReason = "";

    const isAffordable = playerPrice <= budget;
    const isFreeAgent = player.status === "AVAILABLE" && !player.pmbClubId;
    const fillsPosGap = clubPlayersAtPos.length <= 1 || ovrDeltaVsPos > 0;

    if (fillsPosGap && isAffordable && ovrDeltaVsPos >= 1) {
      recommendation = "HIGHLY_RECOMMENDED";
      recommendationReason = `Instant +${ovrDeltaVsPos} OVR positional upgrade within your available budget.`;
    } else if (isAffordable && playerOvr >= squadAvgOvr) {
      recommendation = "CONSIDER";
      recommendationReason = `Solid quality addition that elevates overall squad depth and rotation options.`;
    } else if (!isAffordable) {
      recommendation = "ONLY_IF_NEEDED";
      recommendationReason = `Exceeds current cash balance (€${(budget / 1_000_000).toFixed(1)}M). Player sales or auctions required first.`;
    } else {
      recommendation = "NOT_RECOMMENDED";
      recommendationReason = `You already have stronger registered options at ${pos} (${bestClubPlayerAtPos?.fullName ?? "Starters"}).`;
    }

    // Tactical Fit score (0 - 100)
    let tacticalFitScore = 70;
    if (fillsPosGap) tacticalFitScore += 15;
    if (playerOvr >= squadAvgOvr) tacticalFitScore += 10;
    if (isAffordable) tacticalFitScore += 5;
    tacticalFitScore = Math.min(99, tacticalFitScore);

    return NextResponse.json({
      player: {
        id: player.id,
        playerId: player.playerId,
        fullName: player.fullName,
        position: player.position.toUpperCase(),
        nationality: player.nationality,
        realClub: player.realClub,
        photo: player.photo,
        overallRating: playerOvr,
        marketValue: playerPrice,
        status: player.status,
        currentClub: player.pmbClub
          ? { id: player.pmbClub.id, name: player.pmbClub.name, logo: player.pmbClub.logo }
          : null,
        activeAuction: player.auctions[0] ? { id: player.auctions[0].id, currentBid: Number(player.auctions[0].currentBid) } : null,
      },
      evaluation: {
        squadRole,
        recommendation,
        recommendationReason,
        tacticalFitScore,
        strengths,
        weaknesses,
        squadComparison: {
          squadAvgOvr,
          clubPosAvg,
          bestClubPlayer: bestClubPlayerAtPos
            ? { fullName: bestClubPlayerAtPos.fullName, overallRating: bestClubPlayerAtPos.overallRating ?? 75 }
            : null,
          ovrDeltaVsPos,
          ovrDeltaVsSquad,
        },
        financialImpact: {
          playerPrice,
          clubBudget: budget,
          isAffordable,
          remainingBudgetAfterSigning: budget - playerPrice,
          budgetPercentUsed: budget > 0 ? Math.min(100, Math.round((playerPrice / budget) * 100)) : 0,
        },
      },
    });
  } catch (error) {
    console.error("Failed to generate player scout dossier:", error);
    return NextResponse.json(
      { error: "Failed to generate player scout dossier" },
      { status: 500 }
    );
  }
}
