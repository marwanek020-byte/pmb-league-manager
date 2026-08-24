import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { SystemSettingsService } from "@/lib/services/system-settings-service";

export const dynamic = "force-dynamic";

async function requireAdmin() {
  const session = await auth();
  if (!session || session.user.role !== "ADMINISTRATOR") return null;
  return session;
}

// GET /api/admin/settings/registration-lock
export async function GET() {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const locked = await SystemSettingsService.isRegistrationLocked();
  return NextResponse.json({ locked });
}

// POST /api/admin/settings/registration-lock
export async function POST(req: Request) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const locked = Boolean(body.locked);
    await SystemSettingsService.setRegistrationLocked(locked);

    return NextResponse.json({
      success: true,
      locked,
      message: locked
        ? "🔒 Player registration window has been LOCKED. All clubs are blocked from adding players."
        : "🔓 Player registration window has been UNLOCKED. Clubs can now add players.",
    });
  } catch (error: any) {
    console.error("Error setting registration lock:", error);
    return NextResponse.json({ error: "Failed to update registration lock" }, { status: 500 });
  }
}
