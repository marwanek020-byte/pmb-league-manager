import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/fix-stuck-upgrades
 * 
 * One-time fix: for every IN_PROGRESS stadium upgrade, count how many
 * COMPLETED matches the club has played since the upgrade was created,
 * then set roundsLeft = max(0, totalRounds - matchesPlayedSince).
 * If roundsLeft reaches 0, mark the upgrade as COMPLETED.
 */
export async function POST() {
  const session = await auth();
  if (!session || session.user.role !== "ADMINISTRATOR") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const stuckUpgrades = await prisma.stadiumUpgrade.findMany({
      where: { status: "IN_PROGRESS" },
    });

    if (stuckUpgrades.length === 0) {
      return NextResponse.json({ message: "No stuck upgrades found", fixed: 0 });
    }

    const results: Array<{ clubId: string; label: string; oldRoundsLeft: number; newRoundsLeft: number; newStatus: string }> = [];

    for (const upgrade of stuckUpgrades) {
      // Count COMPLETED matches this club participated in since the upgrade was created
      const matchesPlayed = await prisma.match.count({
        where: {
          status: "COMPLETED",
          playedAt: { gte: upgrade.createdAt },
          OR: [
            { homeClubId: upgrade.clubId },
            { awayClubId: upgrade.clubId },
          ],
        },
      });

      const newRoundsLeft = Math.max(0, upgrade.totalRounds - matchesPlayed);
      const newStatus = newRoundsLeft <= 0 ? "COMPLETED" : "IN_PROGRESS";

      await prisma.stadiumUpgrade.update({
        where: { id: upgrade.id },
        data: { roundsLeft: newRoundsLeft, status: newStatus },
      });

      results.push({
        clubId: upgrade.clubId,
        label: upgrade.label,
        oldRoundsLeft: upgrade.roundsLeft,
        newRoundsLeft,
        newStatus,
      });
    }

    return NextResponse.json({
      message: `Fixed ${results.length} stuck upgrade(s)`,
      fixed: results.length,
      details: results,
    });
  } catch (err) {
    console.error("[fix-stuck-upgrades] Error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
