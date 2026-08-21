import { prisma } from "@/lib/prisma";

export class PollService {
  /**
   * Generates or retrieves the active Global Manager of the Month poll based on REAL match results.
   */
  public static async getGlobalManagerOfMonthPoll(userId?: string) {
    const currentMonth = new Date().toISOString().slice(0, 7); // e.g. "2026-08"

    // 1. Check if a poll already exists for this month
    let poll = await prisma.managerPoll.findFirst({
      where: { month: currentMonth, isActive: true },
      include: {
        options: { orderBy: { voteCount: "desc" } },
        votes: userId ? { where: { userId } } : false,
      },
    });

    // 2. If no poll exists, check real completed matches across ALL leagues
    if (!poll) {
      const completedMatches = await prisma.match.findMany({
        where: { status: "COMPLETED" },
        include: {
          homeClub: { include: { manager: true } },
          awayClub: { include: { manager: true } },
          league: true,
        },
        orderBy: { playedAt: "desc" },
        take: 20,
      });

      // Check maximum completed matchday across the competition
      const maxMatchday = completedMatches.reduce((max, m) => Math.max(max, m.matchday || 0), 0);

      // Only activate the official monthly award after at least 4 Matchdays have concluded (1 Full Month)
      const hasEnoughRounds = maxMatchday >= 4 || completedMatches.length >= 16;

      // Find standout managers from real played games
      const nominees: Array<{
        managerId: string;
        managerName: string;
        clubName: string;
        clubLogo: string | null;
        statement: string;
      }> = [];

      for (const m of completedMatches) {
        const homeScore = m.homeGoals ?? 0;
        const awayScore = m.awayGoals ?? 0;

        if (homeScore > awayScore && m.homeClub.manager) {
          if (!nominees.some((n) => n.managerId === m.homeClub.manager!.id)) {
            nominees.push({
              managerId: m.homeClub.manager.id,
              managerName: m.homeClub.manager.username,
              clubName: m.homeClub.name,
              clubLogo: m.homeClub.logo,
              statement: `Dominant victory in ${m.league.name} Matchday ${m.matchday}`,
            });
          }
        } else if (awayScore > homeScore && m.awayClub.manager) {
          if (!nominees.some((n) => n.managerId === m.awayClub.manager!.id)) {
            nominees.push({
              managerId: m.awayClub.manager.id,
              managerName: m.awayClub.manager.username,
              clubName: m.awayClub.name,
              clubLogo: m.awayClub.logo,
              statement: `Key away victory in ${m.league.name} Matchday ${m.matchday}`,
            });
          }
        }

        if (nominees.length >= 4) break;
      }

      // Only create if 4 rounds are completed AND we have at least 2 real active candidates
      if (hasEnoughRounds && nominees.length >= 2) {
        poll = await prisma.managerPoll.create({
          data: {
            title: `🏆 Global Manager of the Month — ${new Date().toLocaleString("en-US", { month: "long", year: "numeric" })}`,
            description: "Cast your vote for the best tactician across all leagues! The global winner receives a €1,000,000 Transfer Boost.",
            month: currentMonth,
            options: {
              create: nominees.map((n) => ({
                managerId: n.managerId,
                managerName: n.managerName,
                clubName: n.clubName,
                clubLogo: n.clubLogo,
                statement: n.statement,
              })),
            },
          },
          include: {
            options: { orderBy: { voteCount: "desc" } },
            votes: userId ? { where: { userId } } : false,
          },
        });
      }
    }

    if (!poll) return null;

    const totalVotes = poll.options.reduce((sum, opt) => sum + opt.voteCount, 0);
    const userVotedOptionId = poll.votes && poll.votes.length > 0 ? poll.votes[0].optionId : null;

    return {
      id: poll.id,
      title: poll.title,
      description: poll.description,
      month: poll.month,
      totalVotes,
      userVotedOptionId,
      hasVoted: Boolean(userVotedOptionId),
      options: poll.options.map((opt) => ({
        id: opt.id,
        managerId: opt.managerId,
        managerName: opt.managerName,
        clubName: opt.clubName,
        clubLogo: opt.clubLogo,
        statement: opt.statement,
        voteCount: opt.voteCount,
        percentage: totalVotes > 0 ? Math.round((opt.voteCount / totalVotes) * 100) : 0,
      })),
    };
  }
}
