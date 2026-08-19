import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch all users with clubs & league details
    const users = await prisma.user.findMany({
      where: {
        id: { not: session.user.id },
      },
      select: {
        id: true,
        username: true,
        role: true,
        club: {
          select: {
            id: true,
            name: true,
            logo: true,
            league: {
              select: {
                id: true,
                name: true,
                country: true,
                logo: true,
              },
            },
          },
        },
      },
      orderBy: { username: "asc" },
    });

    // Count unread messages per sender
    const unreadCounts = await prisma.directMessage.groupBy({
      by: ["senderId"],
      where: {
        receiverId: session.user.id,
        read: false,
      },
      _count: {
        id: true,
      },
    });

    const unreadMap: { [userId: string]: number } = {};
    let totalUnread = 0;
    unreadCounts.forEach((u) => {
      unreadMap[u.senderId] = u._count.id;
      totalUnread += u._count.id;
    });

    // Format contacts with league information
    const contacts = users.map((u) => {
      const isHQ = u.role === "ADMINISTRATOR";
      const leagueId = isHQ ? "hq" : u.club?.league?.id || "other";
      const leagueName = isHQ ? "🛡️ PMB League HQ & Officials" : u.club?.league?.name || "Independent Clubs";

      return {
        userId: u.id,
        username: u.username,
        role: u.role,
        clubName: u.club?.name || (isHQ ? "PMB League HQ" : "Independent"),
        clubLogo: u.club?.logo || (isHQ ? "/branding/pmb-lion.jpg" : null),
        leagueId,
        leagueName,
        leagueLogo: u.club?.league?.logo || null,
        unread: unreadMap[u.id] || 0,
      };
    });

    // Get all unique leagues from contacts
    const leaguesMap = new Map<string, { id: string; name: string; unread: number; count: number }>();
    contacts.forEach((c) => {
      if (!leaguesMap.has(c.leagueId)) {
        leaguesMap.set(c.leagueId, {
          id: c.leagueId,
          name: c.leagueName,
          unread: 0,
          count: 0,
        });
      }
      const l = leaguesMap.get(c.leagueId)!;
      l.count += 1;
      l.unread += c.unread;
    });

    const leagues = Array.from(leaguesMap.values());

    return NextResponse.json({
      contacts,
      leagues,
      totalUnread,
    });
  } catch (error) {
    console.error("Error fetching message contacts:", error);
    return NextResponse.json({ error: "Failed to fetch contacts" }, { status: 500 });
  }
}
