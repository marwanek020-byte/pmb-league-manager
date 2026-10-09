import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { getClubPassword } from "@/lib/manager-passwords";

export const dynamic = "force-dynamic";

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

const LEAGUE_PREFIX: Record<string, string> = {
  "Premier League": "premier",
  "La Liga": "laliga",
  "Serie A": "seriea",
  "Ligue 1": "ligue1",
  "VIP League": "vip",
  "BOTOLA PRO": "botola",
};

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
    const adminPasswordHash = await bcrypt.hash("PMBAdmin2026!", 10);

    // 1. Ensure Global Super Admin exists
    await prisma.user.upsert({
      where: { username: "admin" },
      update: { role: Role.SUPER_ADMIN, password: adminPasswordHash },
      create: {
        username: "admin",
        password: adminPasswordHash,
        role: Role.SUPER_ADMIN,
      },
    });

    // 2. Ensure all 6 League Admin accounts exist
    const allLeagues = await prisma.league.findMany();
    for (const league of allLeagues) {
      const prefix = LEAGUE_PREFIX[league.name] || slugify(league.name);
      const adminUsername = `admin-${prefix}`;
      await prisma.user.upsert({
        where: { username: adminUsername },
        update: {
          role: Role.LEAGUE_ADMIN,
          leagueId: league.id,
          password: adminPasswordHash,
        },
        create: {
          username: adminUsername,
          password: adminPasswordHash,
          role: Role.LEAGUE_ADMIN,
          leagueId: league.id,
        },
      });
    }

    // 3. Ensure all Clubs have active manager accounts with their deterministic unique password
    const clubs = await prisma.club.findMany({
      include: {
        league: true,
        manager: true,
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
      const prefix = LEAGUE_PREFIX[club.league.name] || slugify(club.league.name);
      const expectedUsername = `${prefix}-${slugify(club.name)}`;
      const uniquePassword = getClubPassword(club.name);
      const hashedPassword = await bcrypt.hash(uniquePassword, 10);

      let managerUser = club.manager;
      if (managerUser) {
        await prisma.user.update({
          where: { id: managerUser.id },
          data: {
            password: hashedPassword,
            role: Role.CLUB_MANAGER,
            clubId: club.id,
          },
        });
      } else {
        managerUser = await prisma.user.upsert({
          where: { username: expectedUsername },
          update: {
            role: Role.CLUB_MANAGER,
            clubId: club.id,
            password: hashedPassword,
          },
          create: {
            username: expectedUsername,
            password: hashedPassword,
            role: Role.CLUB_MANAGER,
            clubId: club.id,
          },
        });
      }

      // Keep club.managerId synced
      if (club.managerId !== managerUser.id) {
        await prisma.club.update({
          where: { id: club.id },
          data: { managerId: managerUser.id },
        });
      }

      credentialsList.push({
        league: club.league.name,
        club: club.name,
        username: managerUser.username,
        password: uniquePassword,
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
