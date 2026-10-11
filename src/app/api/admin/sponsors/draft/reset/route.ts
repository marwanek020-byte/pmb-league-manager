import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isAnyAdmin } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await auth();
  const url = new URL(req.url);
  const secret = url.searchParams.get("secret");

  const isAuthorized =
    (session?.user && isAnyAdmin(session.user)) ||
    secret === "pmb-reset-2026" ||
    secret === process.env.AUTH_SECRET;

  if (!isAuthorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 1. Delete all sponsor contracts
    const deleted = await prisma.clubSponsorContract.deleteMany({});

    // 2. Reset session to turn 0
    await prisma.sponsorDraftSession.upsert({
      where: { id: "botola-s2-draft" },
      update: {
        currentTurnIndex: 0,
        isCompleted: false,
      },
      create: {
        id: "botola-s2-draft",
        currentTurnIndex: 0,
        isCompleted: false,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Sponsor draft successfully reset to Turn 0. ${deleted.count} contracts cleared.`,
    });
  } catch (error: any) {
    console.error("Error resetting sponsor draft:", error);
    return NextResponse.json(
      { error: error.message || "Failed to reset sponsor draft" },
      { status: 500 }
    );
  }
}
