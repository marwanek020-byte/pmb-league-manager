import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { UltrasGamificationService } from "@/lib/services/ultras-gamification-service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();

    if (!session || !session.user.id || !session.user.clubId) {
      return NextResponse.json({ error: "Unauthorized or no club assigned" }, { status: 401 });
    }

    const profile = await UltrasGamificationService.getSupporterProfile(session.user.id, session.user.clubId);
    return NextResponse.json(profile);
  } catch (error: any) {
    console.error("[SupporterProfileRoute GET Error]:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch supporter profile" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session || !session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    await UltrasGamificationService.updatePersonalization(session.user.id, {
      preferredLanguage: body.preferredLanguage,
      favoritePlayerId: body.favoritePlayerId,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[SupporterProfileRoute POST Error]:", error);
    return NextResponse.json({ error: error.message || "Failed to update personalization" }, { status: 500 });
  }
}
