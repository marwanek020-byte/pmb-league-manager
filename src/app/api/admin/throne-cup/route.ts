import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { ThroneCupService } from "@/lib/services/throne-cup-service";

export const dynamic = "force-dynamic";

async function requireAdmin() {
  const session = await auth();
  if (!session || session.user.role !== "ADMINISTRATOR") return null;
  return session;
}

// GET /api/admin/throne-cup
export async function GET() {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const cup = await ThroneCupService.getOrInitializeCup();
    return NextResponse.json({ success: true, cup });
  } catch (error: any) {
    console.error("Failed to load Throne Cup:", error);
    return NextResponse.json({ error: error.message || "Failed to load Throne Cup." }, { status: 500 });
  }
}

// POST /api/admin/throne-cup (Generate / Draw Bracket)
export async function POST(req: Request) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const forceRegenerate = Boolean(body.forceRegenerate);
    const cup = await ThroneCupService.getOrInitializeCup(forceRegenerate);

    return NextResponse.json({
      success: true,
      message: "Throne Cup tournament bracket successfully initialized.",
      cup,
    });
  } catch (error: any) {
    console.error("Failed to initialize Throne Cup:", error);
    return NextResponse.json({ error: error.message || "Failed to initialize Throne Cup." }, { status: 500 });
  }
}
