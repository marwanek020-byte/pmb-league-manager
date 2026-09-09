import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isMoroccanNationality } from "@/lib/services/botola-contract-service";

export const dynamic = "force-dynamic";

export interface ValidationIssue {
  type: "ERROR" | "WARNING" | "INFO";
  code: string;
  message: string;
}

export async function GET(
  _req: Request,
  { params }: { params: { clubId: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const lineup = await prisma.clubLineup.findUnique({
      where: { clubId: params.clubId },
      include: {
        starters: {
          include: {
            player: {
              select: {
                id: true,
                fullName: true,
                position: true,
                nationality: true,
                squadRole: true,
                overallRating: true,
              },
            },
          },
        },
        substitutes: {
          include: {
            player: {
              select: {
                id: true,
                fullName: true,
                position: true,
                nationality: true,
                squadRole: true,
                overallRating: true,
              },
            },
          },
        },
        setPieces: true,
      },
    });

    const issues: ValidationIssue[] = [];

    if (!lineup) {
      return NextResponse.json({
        isValid: false,
        issues: [
          {
            type: "ERROR",
            code: "NO_LINEUP",
            message: "No tactical lineup has been saved for this club yet.",
          },
        ],
      });
    }

    // Rule 1: Incomplete Starting XI
    if (lineup.starters.length < 11) {
      issues.push({
        type: "ERROR",
        code: "INCOMPLETE_XI",
        message: `Starting XI has only ${lineup.starters.length}/11 players assigned.`,
      });
    }

    // Rule 2: Duplicate players
    const starterIds = lineup.starters.map((s) => s.playerId);
    const subIds = lineup.substitutes.map((s) => s.playerId);
    const combined = [...starterIds, ...subIds];
    const uniqueCombined = new Set(combined);
    if (uniqueCombined.size !== combined.length) {
      issues.push({
        type: "ERROR",
        code: "DUPLICATE_PLAYERS",
        message: "Duplicate player selected between Starting XI and Substitutes.",
      });
    }

    // Rule 3: Foreign Player Quota (max 5 in starting XI)
    const foreignStarters = lineup.starters.filter(
      (s) => !isMoroccanNationality(s.player.nationality)
    );
    if (foreignStarters.length > 5) {
      issues.push({
        type: "ERROR",
        code: "FOREIGN_QUOTA_EXCEEDED",
        message: `Foreign quota exceeded: ${foreignStarters.length}/5 allowed in Starting XI.`,
      });
    } else {
      issues.push({
        type: "INFO",
        code: "FOREIGN_QUOTA_OK",
        message: `Foreign player quota: ${foreignStarters.length}/5 utilized (Compliant).`,
      });
    }

    // Rule 4: Goalkeeper in GK slot
    const gkStarter = lineup.starters.find(
      (s) => s.slotRole === "GK" || s.slotKey.toLowerCase() === "gk"
    );
    if (!gkStarter) {
      issues.push({
        type: "ERROR",
        code: "NO_GOALKEEPER",
        message: "Starting XI does not have a designated Goalkeeper (GK).",
      });
    } else if (gkStarter.player.position.toUpperCase() !== "GK") {
      issues.push({
        type: "WARNING",
        code: "OUTFIELD_IN_GOAL",
        message: `Outfield player (${gkStarter.player.fullName}, ${gkStarter.player.position}) is positioned in goal!`,
      });
    }

    // Rule 5: Out of position players (affinity < 0.70)
    const outOfPos = lineup.starters.filter((s) => s.positionAffinity < 0.7);
    if (outOfPos.length > 0) {
      issues.push({
        type: "WARNING",
        code: "OUT_OF_POSITION",
        message: `${outOfPos.length} player(s) are severely out of their natural position: ${outOfPos
          .map((p) => `${p.player.fullName} (${p.player.position} at ${p.slotRole})`)
          .join(", ")}.`,
      });
    }

    // Rule 6: Missing Captain
    const captain = lineup.setPieces.find((sp) => sp.type === "CAPTAIN");
    if (!captain) {
      issues.push({
        type: "WARNING",
        code: "MISSING_CAPTAIN",
        message: "No team Captain (C) has been selected.",
      });
    }

    // Rule 7: Bench Size
    if (lineup.substitutes.length > 12) {
      issues.push({
        type: "ERROR",
        code: "BENCH_LIMIT_EXCEEDED",
        message: `Substitutes bench exceeds the 12-player maximum limit (${lineup.substitutes.length}/12).`,
      });
    }

    // Rule 8: Benched CRITICAL / STAR squad players
    const benchedCritical = lineup.substitutes.filter(
      (s) => s.player.squadRole === "CRITICAL" || s.player.squadRole === "STAR"
    );
    if (benchedCritical.length > 0) {
      issues.push({
        type: "WARNING",
        code: "CRITICAL_PLAYERS_BENCHED",
        message: `Key squad players with CRITICAL contracts are on the bench: ${benchedCritical
          .map((s) => s.player.fullName)
          .join(", ")}. This may lower contract satisfaction.`,
      });
    }

    const hasErrors = issues.some((i) => i.type === "ERROR");

    return NextResponse.json({
      isValid: !hasErrors,
      issues,
      summary: {
        formation: lineup.formation,
        startersCount: lineup.starters.length,
        substitutesCount: lineup.substitutes.length,
        foreignStartersCount: foreignStarters.length,
        captainId: captain?.playerId ?? null,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Validation failed" },
      { status: 500 }
    );
  }
}
