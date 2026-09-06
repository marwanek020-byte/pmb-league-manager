import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/manager/club-match-history
 *
 * Returns the last 10 completed match results for the authenticated manager's club.
 * Used by the Stadium Dashboard to compute AI team form (1pt win, 0.5pt draw, 0pt loss).
 */
export async function GET() {
  const session = await auth();

  try {
    // ── 1. RESOLVE CLUB ─────────────────────────────────────────────────────
    let clubId = session?.user?.clubId ?? null;
    let club = clubId
      ? await prisma.club.findUnique({ where: { id: clubId }, select: { id: true, name: true } })
      : null;

    // Dev/preview fallback
    if (!club) {
      club = await prisma.club.findFirst({
        where: { name: { contains: "FAR Rabat" } },
        select: { id: true, name: true },
      }) ?? await prisma.club.findFirst({ select: { id: true, name: true } });
    }

    if (!club) {
      return NextResponse.json({ error: "No club found" }, { status: 404 });
    }

    // ── 2. FIND LAST 10 COMPLETED MATCHES ───────────────────────────────────
    const completedMatches = await prisma.match.findMany({
      where: {
        status: "COMPLETED",
        OR: [{ homeClubId: club.id }, { awayClubId: club.id }],
      },
      orderBy: { matchday: "desc" },
      take: 10,
      select: {
        id: true,
        matchday: true,
        homeClubId: true,
        awayClubId: true,
        homeGoals: true,
        awayGoals: true,
        homeClub: { select: { name: true } },
        awayClub: { select: { name: true } },
      },
    });

    // ── 3. MAP TO W/D/L ─────────────────────────────────────────────────────
    const results = completedMatches.reverse().map((m) => {
      const isHome = m.homeClubId === club!.id;
      const myGoals = isHome ? (m.homeGoals ?? 0) : (m.awayGoals ?? 0);
      const oppGoals = isHome ? (m.awayGoals ?? 0) : (m.homeGoals ?? 0);
      const opponent = isHome ? m.awayClub.name : m.homeClub.name;

      let result: "W" | "D" | "L";
      if (myGoals > oppGoals) result = "W";
      else if (myGoals === oppGoals) result = "D";
      else result = "L";

      return {
        matchday: m.matchday,
        result,
        isHome,
        opponent,
        score: `${myGoals}-${oppGoals}`,
      };
    });

    // ── 4. COMPUTE FORM SCORE ────────────────────────────────────────────────
    const formScore =
      results.length === 0
        ? 5
        : Math.round(
            (results.reduce(
              (acc, r) => acc + (r.result === "W" ? 1 : r.result === "D" ? 0.5 : 0),
              0
            ) /
              results.length) *
              10 *
              10
          ) / 10;

    return NextResponse.json({
      clubName: club.name,
      results,
      formScore,
    });
  } catch (err) {
    console.error("[club-match-history] Error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
