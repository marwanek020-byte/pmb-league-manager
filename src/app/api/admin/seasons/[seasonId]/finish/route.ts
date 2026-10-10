import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAnyAdmin } from "@/lib/admin-auth";
import {
  previewSeasonPrizes,
  finishSeasonAndDistributePrizes,
} from "@/lib/services/season-prize-service";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: { seasonId: string } }
) {
  const session = await auth();
  if (!session || !isAnyAdmin(session.user)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const preview = await previewSeasonPrizes(params.seasonId);
    return NextResponse.json({ success: true, preview });
  } catch (err: any) {
    console.error("Preview season prizes failed:", err);
    return NextResponse.json(
      { error: err.message || "Failed to preview season prizes" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: Request,
  { params }: { params: { seasonId: string } }
) {
  const session = await auth();
  if (!session || !isAnyAdmin(session.user)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const receipt = await finishSeasonAndDistributePrizes(
      params.seasonId,
      session.user.id
    );
    return NextResponse.json({ success: true, receipt });
  } catch (err: any) {
    console.error("Finish season and distribute prizes failed:", err);
    return NextResponse.json(
      { error: err.message || "Failed to finish season and distribute prizes" },
      { status: 500 }
    );
  }
}
