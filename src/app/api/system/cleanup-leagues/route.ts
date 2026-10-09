import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

const NEW_VIP_CLUBS: { name: string; logo: string }[] = [
  {
    name: "Borussia Dortmund",
    logo: "https://r2.thesportsdb.com/images/media/team/badge/tqo8ge1716960353.png",
  },
  {
    name: "Bayern Munich",
    logo: "https://r2.thesportsdb.com/images/media/team/badge/01ogkh1716960412.png",
  },
  {
    name: "Bayer Leverkusen",
    logo: "https://r2.thesportsdb.com/images/media/team/badge/3x9k851726760113.png",
  },
  {
    name: "Eintracht Frankfurt",
    logo: "https://r2.thesportsdb.com/images/media/team/badge/rurwpy1473453269.png",
  },
  {
    name: "Galatasaray",
    logo: "https://r2.thesportsdb.com/images/media/team/badge/io7jk21767941298.png",
  },
  {
    name: "Besiktas",
    logo: "https://r2.thesportsdb.com/images/media/team/badge/svo05k1776827439.png",
  },
  {
    name: "Fenerbahce",
    logo: "https://r2.thesportsdb.com/images/media/team/badge/twxxvs1448199691.png",
  },
  {
    name: "Ajax",
    logo: "https://r2.thesportsdb.com/images/media/team/badge/zg9tii1755495289.png",
  },
  {
    name: "PSV",
    logo: "https://r2.thesportsdb.com/images/media/team/badge/xfsz6i1721297428.png",
  },
  {
    name: "Celtic",
    logo: "https://r2.thesportsdb.com/images/media/team/badge/3uv1641758780002.png",
  },
  {
    name: "West Ham",
    logo: "https://r2.thesportsdb.com/images/media/team/badge/hfum4l1599931799.png",
  },
  {
    name: "Benfica",
    logo: "https://r2.thesportsdb.com/images/media/team/badge/hj4kyc1781152436.png",
  },
  {
    name: "Porto",
    logo: "https://r2.thesportsdb.com/images/media/team/badge/xu47rb1628855600.png",
  },
  {
    name: "Genk",
    logo: "https://r2.thesportsdb.com/images/media/team/badge/ijp86h1788968480.png",
  },
];

export async function GET(req: Request) {
  // Allow super admin or authenticated admin, or fallback system token for emergency maintenance
  const session = await auth();
  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  const isAuthorized =
    session?.user?.role === "SUPER_ADMIN" ||
    session?.user?.role === "ADMINISTRATOR" ||
    token === "pmb-clean-2026";

  if (!isAuthorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: any = {
    bundesliga: null,
    vipLeague: null,
  };

  try {
    // ══════════════════════════════════════════════════════════════
    // 1. REMOVE BUNDESLIGA
    // ══════════════════════════════════════════════════════════════
    const bundesliga = await prisma.league.findFirst({
      where: { name: { contains: "Bundesliga", mode: "insensitive" } },
      include: {
        clubs: { include: { players: true, manager: true } },
        seasons: true,
        matches: true,
        leagueAdmins: true,
      },
    });

    if (bundesliga) {
      const bClubIds = bundesliga.clubs.map((c) => c.id);
      const bPlayerIds = bundesliga.clubs.flatMap((c) => c.players.map((p) => p.id));
      const bManagerIds = bundesliga.clubs
        .map((c) => c.manager?.id)
        .filter((id): id is string => Boolean(id));
      const bAdminIds = bundesliga.leagueAdmins.map((u) => u.id);
      const bUserIds = [...bManagerIds, ...bAdminIds];
      const bMatchIds = bundesliga.matches.map((m) => m.id);
      const bSeasonIds = bundesliga.seasons.map((s) => s.id);

      // Matches
      if (bMatchIds.length > 0) {
        await prisma.matchEvent.deleteMany({ where: { matchId: { in: bMatchIds } } });
        await prisma.matchStarter.deleteMany({ where: { matchLineup: { matchId: { in: bMatchIds } } } });
        await prisma.matchSubstitute.deleteMany({ where: { matchLineup: { matchId: { in: bMatchIds } } } });
        await prisma.matchSetPiece.deleteMany({ where: { matchLineup: { matchId: { in: bMatchIds } } } });
        await prisma.matchLineup.deleteMany({ where: { matchId: { in: bMatchIds } } });
        await prisma.matchSubmission.deleteMany({ where: { matchId: { in: bMatchIds } } });
        await prisma.match.deleteMany({ where: { id: { in: bMatchIds } } });
      }

      // TOTW
      await prisma.totwPlayer.deleteMany({ where: { totw: { leagueId: bundesliga.id } } });
      await prisma.teamOfTheWeek.deleteMany({ where: { leagueId: bundesliga.id } });
      await prisma.globalTotwPlayer.deleteMany({ where: { leagueId: bundesliga.id } });

      // Club relationships
      if (bClubIds.length > 0) {
        await prisma.lineupStarter.deleteMany({ where: { lineup: { clubId: { in: bClubIds } } } });
        await prisma.lineupSubstitute.deleteMany({ where: { lineup: { clubId: { in: bClubIds } } } });
        await prisma.setPieceAssignment.deleteMany({ where: { lineup: { clubId: { in: bClubIds } } } });
        await prisma.clubLineup.deleteMany({ where: { clubId: { in: bClubIds } } });

        await prisma.stadiumUpgrade.deleteMany({ where: { clubId: { in: bClubIds } } });
        await prisma.stadiumRentalOffer.deleteMany({
          where: { OR: [{ fromClubId: { in: bClubIds } }, { toClubId: { in: bClubIds } }] },
        });
        await prisma.clubBudgetTransaction.deleteMany({ where: { clubId: { in: bClubIds } } });
        await prisma.clubPowerRating.deleteMany({ where: { clubId: { in: bClubIds } } });
        await prisma.seasonClassification.deleteMany({ where: { clubId: { in: bClubIds } } });

        await prisma.postReaction.deleteMany({ where: { post: { clubId: { in: bClubIds } } } });
        await prisma.postComment.deleteMany({ where: { post: { clubId: { in: bClubIds } } } });
        await prisma.post.deleteMany({ where: { clubId: { in: bClubIds } } });

        await prisma.playerLoan.deleteMany({
          where: { OR: [{ fromClubId: { in: bClubIds } }, { toClubId: { in: bClubIds } }] },
        });
        await prisma.auctionBid.deleteMany({ where: { clubId: { in: bClubIds } } });
        await prisma.auction.deleteMany({ where: { currentWinnerClubId: { in: bClubIds } } });
        await prisma.transfer.deleteMany({
          where: { OR: [{ fromClubId: { in: bClubIds } }, { toClubId: { in: bClubIds } }] },
        });
      }

      // Players
      if (bPlayerIds.length > 0) {
        await prisma.matchEvent.deleteMany({
          where: { OR: [{ playerId: { in: bPlayerIds } }, { assistPlayerId: { in: bPlayerIds } }] },
        });
        await prisma.auctionBid.deleteMany({ where: { auction: { playerId: { in: bPlayerIds } } } });
        await prisma.auction.deleteMany({ where: { playerId: { in: bPlayerIds } } });
        await prisma.transfer.deleteMany({ where: { playerId: { in: bPlayerIds } } });
        await prisma.player.deleteMany({ where: { id: { in: bPlayerIds } } });
      }

      // Seasons
      if (bSeasonIds.length > 0) {
        await prisma.seasonClassification.deleteMany({ where: { seasonId: { in: bSeasonIds } } });
        await prisma.season.deleteMany({ where: { id: { in: bSeasonIds } } });
      }

      // Clubs
      if (bClubIds.length > 0) {
        await prisma.club.updateMany({
          where: { id: { in: bClubIds } },
          data: { managerId: null },
        });
        await prisma.club.deleteMany({ where: { id: { in: bClubIds } } });
      }

      // Users
      if (bUserIds.length > 0) {
        await prisma.notification.deleteMany({ where: { userId: { in: bUserIds } } });
        await prisma.activityLog.deleteMany({ where: { actorUserId: { in: bUserIds } } });
        await prisma.directMessage.deleteMany({
          where: { OR: [{ senderId: { in: bUserIds } }, { receiverId: { in: bUserIds } }] },
        });
        await prisma.user.deleteMany({ where: { id: { in: bUserIds } } });
      }

      const extraBUsers = await prisma.user.findMany({
        where: {
          OR: [
            { username: { startsWith: "bundesliga-" } },
            { username: "admin-bundesliga" },
          ],
        },
        select: { id: true },
      });
      if (extraBUsers.length > 0) {
        const extraIds = extraBUsers.map((u) => u.id);
        await prisma.notification.deleteMany({ where: { userId: { in: extraIds } } });
        await prisma.activityLog.deleteMany({ where: { actorUserId: { in: extraIds } } });
        await prisma.user.deleteMany({ where: { id: { in: extraIds } } });
      }

      // Delete League
      await prisma.league.delete({ where: { id: bundesliga.id } });
      results.bundesliga = { status: "deleted", clubs: bClubIds.length, players: bPlayerIds.length };
    } else {
      results.bundesliga = { status: "already_deleted" };
    }

    // ══════════════════════════════════════════════════════════════
    // 2. CLEAN UP OLD VIP LEAGUE TEAMS & SETUP 14 NEW TEAMS
    // ══════════════════════════════════════════════════════════════
    const vipLeague = await prisma.league.findFirst({
      where: { name: "VIP League" },
      include: {
        clubs: { include: { players: true, manager: true } },
        seasons: true,
        matches: true,
      },
    });

    if (vipLeague) {
      const vClubIds = vipLeague.clubs.map((c) => c.id);
      const vPlayerIds = vipLeague.clubs.flatMap((c) => c.players.map((p) => p.id));
      const vManagerIds = vipLeague.clubs
        .map((c) => c.manager?.id)
        .filter((id): id is string => Boolean(id));
      const vMatchIds = vipLeague.matches.map((m) => m.id);
      const vSeasonIds = vipLeague.seasons.map((s) => s.id);

      if (vMatchIds.length > 0) {
        await prisma.matchEvent.deleteMany({ where: { matchId: { in: vMatchIds } } });
        await prisma.matchStarter.deleteMany({ where: { matchLineup: { matchId: { in: vMatchIds } } } });
        await prisma.matchSubstitute.deleteMany({ where: { matchLineup: { matchId: { in: vMatchIds } } } });
        await prisma.matchSetPiece.deleteMany({ where: { matchLineup: { matchId: { in: vMatchIds } } } });
        await prisma.matchLineup.deleteMany({ where: { matchId: { in: vMatchIds } } });
        await prisma.matchSubmission.deleteMany({ where: { matchId: { in: vMatchIds } } });
        await prisma.match.deleteMany({ where: { id: { in: vMatchIds } } });
      }

      await prisma.totwPlayer.deleteMany({ where: { totw: { leagueId: vipLeague.id } } });
      await prisma.teamOfTheWeek.deleteMany({ where: { leagueId: vipLeague.id } });
      await prisma.globalTotwPlayer.deleteMany({ where: { leagueId: vipLeague.id } });

      if (vClubIds.length > 0) {
        await prisma.lineupStarter.deleteMany({ where: { lineup: { clubId: { in: vClubIds } } } });
        await prisma.lineupSubstitute.deleteMany({ where: { lineup: { clubId: { in: vClubIds } } } });
        await prisma.setPieceAssignment.deleteMany({ where: { lineup: { clubId: { in: vClubIds } } } });
        await prisma.clubLineup.deleteMany({ where: { clubId: { in: vClubIds } } });

        await prisma.stadiumUpgrade.deleteMany({ where: { clubId: { in: vClubIds } } });
        await prisma.stadiumRentalOffer.deleteMany({
          where: { OR: [{ fromClubId: { in: vClubIds } }, { toClubId: { in: vClubIds } }] },
        });
        await prisma.clubBudgetTransaction.deleteMany({ where: { clubId: { in: vClubIds } } });
        await prisma.clubPowerRating.deleteMany({ where: { clubId: { in: vClubIds } } });
        await prisma.seasonClassification.deleteMany({ where: { clubId: { in: vClubIds } } });

        await prisma.postReaction.deleteMany({ where: { post: { clubId: { in: vClubIds } } } });
        await prisma.postComment.deleteMany({ where: { post: { clubId: { in: vClubIds } } } });
        await prisma.post.deleteMany({ where: { clubId: { in: vClubIds } } });

        await prisma.playerLoan.deleteMany({
          where: { OR: [{ fromClubId: { in: vClubIds } }, { toClubId: { in: vClubIds } }] },
        });
        await prisma.auctionBid.deleteMany({ where: { clubId: { in: vClubIds } } });
        await prisma.auction.deleteMany({ where: { currentWinnerClubId: { in: vClubIds } } });
        await prisma.transfer.deleteMany({
          where: { OR: [{ fromClubId: { in: vClubIds } }, { toClubId: { in: vClubIds } }] },
        });
      }

      if (vPlayerIds.length > 0) {
        await prisma.matchEvent.deleteMany({
          where: { OR: [{ playerId: { in: vPlayerIds } }, { assistPlayerId: { in: vPlayerIds } }] },
        });
        await prisma.auctionBid.deleteMany({ where: { auction: { playerId: { in: vPlayerIds } } } });
        await prisma.auction.deleteMany({ where: { playerId: { in: vPlayerIds } } });
        await prisma.transfer.deleteMany({ where: { playerId: { in: vPlayerIds } } });
        await prisma.player.deleteMany({ where: { id: { in: vPlayerIds } } });
      }

      if (vSeasonIds.length > 0) {
        await prisma.seasonClassification.deleteMany({ where: { seasonId: { in: vSeasonIds } } });
        await prisma.season.deleteMany({ where: { id: { in: vSeasonIds } } });
      }

      if (vClubIds.length > 0) {
        await prisma.club.updateMany({
          where: { id: { in: vClubIds } },
          data: { managerId: null },
        });
        await prisma.club.deleteMany({ where: { id: { in: vClubIds } } });
      }

      if (vManagerIds.length > 0) {
        await prisma.notification.deleteMany({ where: { userId: { in: vManagerIds } } });
        await prisma.activityLog.deleteMany({ where: { actorUserId: { in: vManagerIds } } });
        await prisma.directMessage.deleteMany({
          where: { OR: [{ senderId: { in: vManagerIds } }, { receiverId: { in: vManagerIds } }] },
        });
        await prisma.user.deleteMany({ where: { id: { in: vManagerIds } } });
      }

      const extraVUsers = await prisma.user.findMany({
        where: {
          username: { startsWith: "vip-" },
          role: Role.CLUB_MANAGER,
        },
        select: { id: true },
      });
      if (extraVUsers.length > 0) {
        const extraIds = extraVUsers.map((u) => u.id);
        await prisma.notification.deleteMany({ where: { userId: { in: extraIds } } });
        await prisma.activityLog.deleteMany({ where: { actorUserId: { in: extraIds } } });
        await prisma.user.deleteMany({ where: { id: { in: extraIds } } });
      }

      // Recreate the 14 new VIP clubs
      const managerPasswordHash = await bcrypt.hash("PMB2026!", 10);
      const createdClubs = [];

      for (const item of NEW_VIP_CLUBS) {
        const club = await prisma.club.create({
          data: {
            name: item.name,
            logo: item.logo,
            leagueId: vipLeague.id,
            budget: 100000000,
          },
        });

        const username = `vip-${slugify(item.name)}`;

        const manager = await prisma.user.upsert({
          where: { username },
          update: { clubId: club.id },
          create: {
            username,
            password: managerPasswordHash,
            role: Role.CLUB_MANAGER,
            clubId: club.id,
          },
        });

        await prisma.club.update({
          where: { id: club.id },
          data: { managerId: manager.id },
        });

        createdClubs.push({ name: item.name, username });
      }

      results.vipLeague = {
        status: "updated",
        oldClubsRemoved: vClubIds.length,
        oldPlayersRemoved: vPlayerIds.length,
        newClubsCreated: createdClubs.length,
        clubs: createdClubs,
      };
    }

    try {
      revalidatePath("/admin/dashboard");
      revalidatePath("/");
    } catch {}

    return NextResponse.json({ success: true, results });
  } catch (error: any) {
    console.error("Cleanup leagues error:", error);
    return NextResponse.json({ error: error?.message || "Failed to cleanup leagues" }, { status: 500 });
  }
}
