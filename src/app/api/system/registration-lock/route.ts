import { NextResponse } from "next/server";
import { SystemSettingsService } from "@/lib/services/system-settings-service";

export const dynamic = "force-dynamic";

// GET /api/system/registration-lock
export async function GET() {
  const locked = await SystemSettingsService.isRegistrationLocked();
  return NextResponse.json({ locked });
}
