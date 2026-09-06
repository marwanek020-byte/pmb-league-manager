import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { lockClubBudget, applyBudgetTransaction } from "@/lib/services/budget-service";

export const dynamic = "force-dynamic";

// Mirrors UPGRADE_OPTIONS in StadiumDashboard
const UPGRADE_OPTIONS = [
  { id: "std-sm", label: "+2,000 Standard Seats",  seatsAdded:  2_000, vipSeatsAdded: 0,     cost:   300_000, totalRounds: 2, type: "standard" },
  { id: "std-md", label: "+10,000 Standard Seats", seatsAdded: 10_000, vipSeatsAdded: 0,     cost: 1_600_000, totalRounds: 3, type: "standard" },
  { id: "std-lg", label: "+20,000 Standard Seats", seatsAdded: 20_000, vipSeatsAdded: 0,     cost: 3_000_000, totalRounds: 5, type: "standard" },
  { id: "vip-sm", label: "+500 VIP Suite Seats",   seatsAdded: 0,      vipSeatsAdded:   500, cost:   800_000, totalRounds: 2, type: "vip" },
  { id: "vip-lg", label: "+1,500 VIP Suite Seats", seatsAdded: 0,      vipSeatsAdded: 1_500, cost: 2_000_000, totalRounds: 4, type: "vip" },
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/manager/stadium-upgrade
// Returns the active upgrade for the authenticated club (if any)
// Also returns the club's current stadium capacity overrides
// ─────────────────────────────────────────────────────────────────────────────
export async function GET() {
  const session = await auth();

  try {
    let clubId = session?.user?.clubId ?? null;
    if (!clubId) {
      const fallback = await prisma.club.findFirst({
        where: { name: { contains: "FAR Rabat" } },
        select: { id: true },
      });
      clubId = fallback?.id ?? null;
    }
    if (!clubId) return NextResponse.json({ upgrade: null });

    const upgrade = await prisma.stadiumUpgrade.findUnique({
      where: { clubId },
    });

    return NextResponse.json({
      upgrade: upgrade
        ? {
            id: upgrade.id,
            upgradeOptionId: upgrade.upgradeOptionId,
            label: upgrade.label,
            seatsAdded: upgrade.seatsAdded,
            vipSeatsAdded: upgrade.vipSeatsAdded,
            cost: Number(upgrade.cost),
            totalRounds: upgrade.totalRounds,
            roundsLeft: upgrade.roundsLeft,
            status: upgrade.status,
            createdAt: upgrade.createdAt,
          }
        : null,
    });
  } catch (err) {
    console.error("[stadium-upgrade GET] Error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/manager/stadium-upgrade
// Body: { upgradeOptionId: string }
// Purchases a stadium upgrade (deducts budget, creates upgrade record)
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.clubId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { upgradeOptionId } = await req.json();
  const option = UPGRADE_OPTIONS.find((o) => o.id === upgradeOptionId);
  if (!option) return NextResponse.json({ error: "Invalid upgrade option" }, { status: 400 });

  const clubId = session.user.clubId;

  try {
    // Check no active upgrade already
    const existing = await prisma.stadiumUpgrade.findUnique({ where: { clubId } });
    if (existing && existing.status === "IN_PROGRESS") {
      return NextResponse.json({ error: "Construction already in progress" }, { status: 409 });
    }

    await prisma.$transaction(async (tx) => {
      const currentBudget = await lockClubBudget(tx, clubId);
      await applyBudgetTransaction(tx, {
        clubId,
        amount: new Prisma.Decimal(option.cost).negated(),
        currentBudget,
        type: "STADIUM_UPGRADE",
        description: `Stadium upgrade: ${option.label}`,
      });

      // Upsert upgrade record (overwrite any completed one)
      await tx.stadiumUpgrade.upsert({
        where: { clubId },
        update: {
          upgradeOptionId: option.id,
          label: option.label,
          seatsAdded: option.seatsAdded,
          vipSeatsAdded: option.vipSeatsAdded,
          cost: new Prisma.Decimal(option.cost),
          totalRounds: option.totalRounds,
          roundsLeft: option.totalRounds,
          status: "IN_PROGRESS",
        },
        create: {
          clubId,
          upgradeOptionId: option.id,
          label: option.label,
          seatsAdded: option.seatsAdded,
          vipSeatsAdded: option.vipSeatsAdded,
          cost: new Prisma.Decimal(option.cost),
          totalRounds: option.totalRounds,
          roundsLeft: option.totalRounds,
          status: "IN_PROGRESS",
        },
      });
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes("INSUFFICIENT_BUDGET")) {
      return NextResponse.json({ error: "Insufficient budget" }, { status: 400 });
    }
    console.error("[stadium-upgrade POST] Error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/manager/stadium-upgrade
// Body: { action: "ADVANCE_ROUND" }
// Called by admin or system to advance the construction by 1 round.
// When roundsLeft reaches 0, marks as COMPLETED.
// ─────────────────────────────────────────────────────────────────────────────
export async function PATCH(req: NextRequest) {
  const session = await auth();
  const body = await req.json();
  const { action, clubId: targetClubId } = body;

  // Only admins can advance rounds, or use the club's own ID
  const isAdmin = session?.user?.role === "ADMINISTRATOR";
  const resolvedClubId = isAdmin ? (targetClubId ?? session?.user?.clubId) : session?.user?.clubId;

  if (!resolvedClubId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (action !== "ADVANCE_ROUND") {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  try {
    const upgrade = await prisma.stadiumUpgrade.findUnique({ where: { clubId: resolvedClubId } });
    if (!upgrade || upgrade.status !== "IN_PROGRESS") {
      return NextResponse.json({ error: "No active upgrade" }, { status: 404 });
    }

    const newRoundsLeft = upgrade.roundsLeft - 1;
    if (newRoundsLeft <= 0) {
      await prisma.stadiumUpgrade.update({
        where: { clubId: resolvedClubId },
        data: { roundsLeft: 0, status: "COMPLETED" },
      });
      return NextResponse.json({ success: true, completed: true });
    }

    await prisma.stadiumUpgrade.update({
      where: { clubId: resolvedClubId },
      data: { roundsLeft: newRoundsLeft },
    });
    return NextResponse.json({ success: true, completed: false, roundsLeft: newRoundsLeft });
  } catch (err) {
    console.error("[stadium-upgrade PATCH] Error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
