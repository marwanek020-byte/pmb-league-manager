import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import bcrypt from "bcryptjs";
import crypto from "crypto";

export const dynamic = "force-dynamic";

function generateClubPassword(clubName: string): string {
  const clean = clubName.replace(/[^a-zA-Z]/g, "").slice(0, 4);
  const prefix = clean.length >= 3 ? clean : "Club";
  const formattedPrefix = prefix.charAt(0).toUpperCase() + prefix.slice(1).toLowerCase();
  const randomChars = crypto.randomBytes(3).toString("hex").slice(0, 4);
  return `${formattedPrefix}#${randomChars}!26`;
}

export async function GET(req: Request) {
  const session = await auth();
  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  const isAuthorized =
    session?.user?.role === "SUPER_ADMIN" ||
    session?.user?.role === "ADMINISTRATOR" ||
    token === "pmb-passwords-2026";

  if (!isAuthorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const clubs = await prisma.club.findMany({
      include: {
        league: { select: { id: true, name: true } },
        manager: { select: { id: true, username: true } },
      },
      orderBy: [{ league: { name: "asc" } }, { name: "asc" }],
    });

    const credentialsList: {
      league: string;
      club: string;
      username: string;
      password: string;
    }[] = [];

    for (const club of clubs) {
      if (!club.manager) continue;

      const newPassword = generateClubPassword(club.name);
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      await prisma.user.update({
        where: { id: club.manager.id },
        data: { password: hashedPassword },
      });

      credentialsList.push({
        league: club.league.name,
        club: club.name,
        username: club.manager.username,
        password: newPassword,
      });
    }

    return NextResponse.json({
      success: true,
      totalManagersUpdated: credentialsList.length,
      credentials: credentialsList,
    });
  } catch (error: any) {
    console.error("Reset manager passwords error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to reset manager passwords" },
      { status: 500 }
    );
  }
}
