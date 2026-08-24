import { Prisma, BudgetTransactionType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { lockClubBudget, applyBudgetTransaction } from "@/lib/services/budget-service";
import { UltrasSocialService } from "@/lib/services/ultras-social-service";

export const TOTM_PRIZES = {
  FIRST: new Prisma.Decimal("20000000"),  // 20M EUR for 1st Place
  SECOND: new Prisma.Decimal("12000000"), // 12M EUR for 2nd Place
  THIRD: new Prisma.Decimal("11000000"),  // 11M EUR for 3rd Place
  FOURTH: new Prisma.Decimal("10000000"), // 10M EUR for 4th Place
};

export interface ClubMonthlyStats {
  clubId: string;
  clubName: string;
  clubLogo: string | null;
  leagueId: string;
  leagueName: string;
  leagueLogo: string | null;
  managerId: string | null;
  managerName: string;
  matchesPlayed: number;
  wins: number;
  awayWins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  cleanSheets: number;
  bigMarginWins: number;
  winStreak: number;
  isUndefeated: boolean;
  aiScore: number;
  breakdown: {
    resultScore: number;
    attackScore: number;
    defenseScore: number;
    bonusScore: number;
  };
  summaryText: string;
}

export class TeamOfTheMonthService {
  /**
   * 1. Calculate the 60% AI Performance Score for all clubs across their latest 4-round window.
   */
  public static async calculateMonthlyPerformance(): Promise<ClubMonthlyStats[]> {
    // A. Detect latest completed matchday per league
    const leagues = await prisma.league.findMany({
      include: {
        matches: {
          where: { status: "COMPLETED" },
          select: { matchday: true },
        },
      },
    });

    const leagueRoundFilters: { leagueId: string; startRound: number; endRound: number }[] = [];

    for (const league of leagues) {
      if (league.matches.length === 0) continue;
      const matchdays = league.matches.map((m) => m.matchday);
      const maxMD = Math.max(...matchdays);
      const startRound = Math.max(1, maxMD - 3);
      leagueRoundFilters.push({
        leagueId: league.id,
        startRound,
        endRound: maxMD,
      });
    }

    if (leagueRoundFilters.length === 0) return [];

    // B. Fetch matches within each league's last 4-round window
    const orClauses = leagueRoundFilters.map((f) => ({
      leagueId: f.leagueId,
      matchday: { gte: f.startRound, lte: f.endRound },
      status: "COMPLETED" as const,
    }));

    const matches = await prisma.match.findMany({
      where: {
        OR: orClauses,
      },
      include: {
        homeClub: { include: { manager: true } },
        awayClub: { include: { manager: true } },
        league: true,
      },
      orderBy: { playedAt: "asc" },
    });

    if (matches.length === 0) return [];

    const statsMap = new Map<string, ClubMonthlyStats>();

    const getOrInitStats = (club: any, league: any): ClubMonthlyStats => {
      if (!statsMap.has(club.id)) {
        statsMap.set(club.id, {
          clubId: club.id,
          clubName: club.name,
          clubLogo: club.logo,
          leagueId: league.id,
          leagueName: league.name,
          leagueLogo: league.logo,
          managerId: club.manager?.id || null,
          managerName: club.manager?.username || `@${club.name.toLowerCase().replace(/\s+/g, "_")}`,
          matchesPlayed: 0,
          wins: 0,
          awayWins: 0,
          draws: 0,
          losses: 0,
          goalsFor: 0,
          goalsAgainst: 0,
          goalDifference: 0,
          cleanSheets: 0,
          bigMarginWins: 0,
          winStreak: 0,
          isUndefeated: true,
          aiScore: 0,
          breakdown: {
            resultScore: 0,
            attackScore: 0,
            defenseScore: 0,
            bonusScore: 0,
          },
          summaryText: "",
        });
      }
      return statsMap.get(club.id)!;
    };

    // Process all match outcomes
    for (const match of matches) {
      if (!match.homeClub || !match.awayClub || !match.league) continue;

      const homeStats = getOrInitStats(match.homeClub, match.league);
      const awayStats = getOrInitStats(match.awayClub, match.league);

      const hG = match.homeGoals ?? 0;
      const aG = match.awayGoals ?? 0;

      // Home Club
      homeStats.matchesPlayed++;
      homeStats.goalsFor += hG;
      homeStats.goalsAgainst += aG;
      if (aG === 0) homeStats.cleanSheets++;

      // Away Club
      awayStats.matchesPlayed++;
      awayStats.goalsFor += aG;
      awayStats.goalsAgainst += hG;
      if (hG === 0) awayStats.cleanSheets++;

      if (hG > aG) {
        homeStats.wins++;
        homeStats.winStreak++;
        if (hG - aG >= 3) homeStats.bigMarginWins++;
        awayStats.losses++;
        awayStats.isUndefeated = false;
        awayStats.winStreak = 0;
      } else if (aG > hG) {
        awayStats.wins++;
        awayStats.awayWins++;
        awayStats.winStreak++;
        if (aG - hG >= 3) awayStats.bigMarginWins++;
        homeStats.losses++;
        homeStats.isUndefeated = false;
        homeStats.winStreak = 0;
      } else {
        homeStats.draws++;
        awayStats.draws++;
      }
    }

    // Compute AI Performance Score (0 - 100 Points)
    const rankedList: ClubMonthlyStats[] = [];

    for (const stats of Array.from(statsMap.values())) {
      if (stats.matchesPlayed === 0) continue;

      stats.goalDifference = stats.goalsFor - stats.goalsAgainst;

      // 1. Result Points (Max 40 pts)
      const rawResult = stats.wins * 10 + stats.awayWins * 3 + stats.draws * 4;
      const resultScore = Math.min(40, Math.max(0, rawResult));

      // 2. Attack Power (Max 25 pts)
      const rawAttack = stats.goalsFor * 2.5 + stats.bigMarginWins * 3;
      const attackScore = Math.min(25, Math.max(0, rawAttack));

      // 3. Defensive Solidity (Max 20 pts)
      const rawDefense = stats.cleanSheets * 5 - stats.goalsAgainst * 1.5;
      const defenseScore = Math.min(20, Math.max(0, rawDefense));

      // 4. Streak & Form Bonus (Max 15 pts)
      let bonusScore = 0;
      if (stats.isUndefeated && stats.matchesPlayed >= 2) bonusScore += 7;
      if (stats.winStreak >= 2) bonusScore += 8;

      const totalScore = Math.min(100, Math.max(10, Math.round(resultScore + attackScore + defenseScore + bonusScore)));

      stats.aiScore = totalScore;
      stats.breakdown = {
        resultScore: Math.round(resultScore),
        attackScore: Math.round(attackScore),
        defenseScore: Math.round(defenseScore),
        bonusScore: Math.round(bonusScore),
      };

      stats.summaryText = `🤖 AI Score: ${totalScore}/100 • ${stats.wins}W ${stats.draws}D ${stats.losses}L • ${stats.goalsFor} Goals • ${stats.cleanSheets} Clean Sheets`;

      rankedList.push(stats);
    }

    // Sort by AI Score descending
    return rankedList.sort((a, b) => b.aiScore - a.aiScore);
  }

  /**
   * 2. Nominate Top 4 Teams and Open/Refresh the Community Voting Poll.
   */
  public static async nominateTop4Teams() {
    const currentMonth = new Date().toISOString().slice(0, 7); // e.g. "2026-08"
    const monthName = new Date().toLocaleString("en-US", { month: "long", year: "numeric" });

    const rankedClubs = await this.calculateMonthlyPerformance();
    if (rankedClubs.length < 2) {
      throw new Error("Not enough completed match data across the leagues to analyze the last 4 rounds.");
    }

    // Pick top 4 standout clubs across all leagues
    const top4Candidates = rankedClubs.slice(0, 4);

    // Deactivate previous active poll for this month if regenerating
    await (prisma as any).managerPoll.updateMany({
      where: { month: currentMonth, isActive: true },
      data: { isActive: false },
    });

    const poll = await (prisma as any).managerPoll.create({
      data: {
        title: `🏆 PMB Team of the Month — ${monthName}`,
        description: `Official 60% AI Performance + 40% Community Vote. Top 4 Clubs Win €53,000,000 (1st: €20M, 2nd: €12M, 3rd: €11M, 4th: €10M)!`,
        month: currentMonth,
        isActive: true,
        options: {
          create: top4Candidates.map((c, index) => ({
            managerId: c.clubId,
            managerName: c.managerName,
            clubName: c.clubName,
            clubLogo: c.clubLogo,
            statement: `[${c.leagueName}] ${c.summaryText} (AI Rank #${index + 1})`,
          })),
        },
      },
      include: {
        options: { orderBy: { voteCount: "desc" } },
      },
    });

    return {
      poll,
      top4Candidates,
    };
  }

  /**
   * 3. Retrieves the current active monthly poll with voting options (Only if initiated by Admin).
   */
  public static async getOrGenerateMonthlyPoll(userId?: string) {
    const currentMonth = new Date().toISOString().slice(0, 7);

    const poll = await (prisma as any).managerPoll.findFirst({
      where: { month: currentMonth, isActive: true },
      include: {
        options: { orderBy: { voteCount: "desc" } },
        votes: userId ? { where: { userId } } : false,
      },
    });

    if (!poll) {
      return null;
    }

    return this.formatPollResponse(poll, userId);
  }

  /**
   * 4. Finalizes the Monthly Award, ranks the Top 4 clubs (60% AI + 40% Votes),
   * and distributes the €53,000,000 prize pool (1st: 20M, 2nd: 12M, 3rd: 11M, 4th: 10M)!
   */
  public static async resolveAndAwardWinner(pollId?: string) {
    const currentMonth = new Date().toISOString().slice(0, 7);

    // Find target poll
    let poll: any = null;
    if (pollId) {
      poll = await (prisma as any).managerPoll.findUnique({
        where: { id: pollId },
        include: { options: true, votes: true },
      });
    } else {
      poll = await (prisma as any).managerPoll.findFirst({
        where: { month: currentMonth, isActive: true },
        include: { options: true, votes: true },
      });
    }

    if (!poll) {
      throw new Error("No active Team of the Month poll found to finalize.");
    }

    const totalVotes = poll.options.reduce((sum: number, o: any) => sum + o.voteCount, 0);

    // Calculate AI scores across the last 4 rounds
    const rankedClubs = await this.calculateMonthlyPerformance();
    const clubScoreMap = new Map<string, number>();
    rankedClubs.forEach((c) => clubScoreMap.set(c.clubName.toLowerCase(), c.aiScore));

    // Calculate Combined Final Score (60% AI + 40% Votes) for each of the 4 nominees
    const candidateResults = poll.options.map((opt: any) => {
      const aiScore = clubScoreMap.get(opt.clubName.toLowerCase()) || 75;
      const votePercent = totalVotes > 0 ? (opt.voteCount / totalVotes) * 100 : 25;
      const finalScore = Number((aiScore * 0.6 + votePercent * 0.4).toFixed(1));

      return {
        optionId: opt.id,
        clubName: opt.clubName,
        managerName: opt.managerName,
        clubLogo: opt.clubLogo,
        voteCount: opt.voteCount,
        votePercent: Math.round(votePercent),
        aiScore,
        finalScore,
      };
    });

    // Sort by final score descending (1st, 2nd, 3rd, 4th)
    candidateResults.sort((a: any, b: any) => b.finalScore - a.finalScore);

    const prizeTiers = [
      { rank: 1, label: "1st Place (Champion)", prize: TOTM_PRIZES.FIRST, amountNumber: 20000000, emoji: "🥇" },
      { rank: 2, label: "2nd Place", prize: TOTM_PRIZES.SECOND, amountNumber: 12000000, emoji: "🥈" },
      { rank: 3, label: "3rd Place", prize: TOTM_PRIZES.THIRD, amountNumber: 11000000, emoji: "🥉" },
      { rank: 4, label: "4th Place", prize: TOTM_PRIZES.FOURTH, amountNumber: 10000000, emoji: "🏅" },
    ];

    const awardedClubs: any[] = [];

    // Distribute prizes inside a single interactive transaction
    await prisma.$transaction(
      async (tx) => {
        for (let i = 0; i < candidateResults.length && i < prizeTiers.length; i++) {
          const candidate = candidateResults[i];
          const tier = prizeTiers[i];

          const club = await tx.club.findFirst({
            where: {
              name: { equals: candidate.clubName, mode: "insensitive" },
            },
          });

          if (club) {
            const currentBudget = await lockClubBudget(tx, club.id);
            await applyBudgetTransaction(tx, {
              clubId: club.id,
              amount: tier.prize,
              currentBudget,
              type: BudgetTransactionType.COMPETITION_REWARD,
              description: `Team of the Month (${poll.month}): ${tier.label} Award (€${(tier.amountNumber / 1000000).toFixed(0)}M)`,
            });

            awardedClubs.push({
              rank: tier.rank,
              label: tier.label,
              emoji: tier.emoji,
              clubId: club.id,
              clubName: club.name,
              managerName: candidate.managerName,
              finalScore: candidate.finalScore,
              prizeAmount: tier.amountNumber,
            });
          }
        }

        // Mark poll as completed/inactive
        await (tx as any).managerPoll.update({
          where: { id: poll.id },
          data: { isActive: false },
        });
      },
      { maxWait: 15000, timeout: 30000 }
    );

    // Publish Breaking Media Announcement
    try {
      const mediaBotId = await (UltrasSocialService as any).getOrCreateBotUser("pmb_sports_media", "ADMINISTRATOR");
      const postContent = `🏆 **رسمياً: تتويج أفضل 4 فرق في الشهر | TEAM OF THE MONTH AWARDS** 👑
━━━━━━━━━━━━━━━━━━━━━━━━━━
✍️ تعلن رابطة **PMB League** عن نتائج جائزة **فريق الشهر (${poll.month})** بعد احتساب الأداء التكتيكي لآخر 4 جولات عبر الذكاء الاصطناعي (60%) وتصويت المدربين (40%):

🥇 **المركز الأول (بطل الشهر):** **${awardedClubs[0]?.clubName || candidateResults[0]?.clubName}** 
💰 المكافأة: **€20,000,000** أُضيفت لخزينة النادي!

🥈 **المركز الثاني:** **${awardedClubs[1]?.clubName || candidateResults[1]?.clubName}** — **€12,000,000**
🥉 **المركز الثالث:** **${awardedClubs[2]?.clubName || candidateResults[2]?.clubName}** — **€11,000,000**
🏅 **المركز الرابع:** **${awardedClubs[3]?.clubName || candidateResults[3]?.clubName}** — **€10,000,000**

📊 إجمالي الجوائز الموزعة: **€53,000,000** مبروك لجميع الأندية الفائزة! 🔥👏

#TeamOfTheMonth #PMBAwards #فريق_الشهر #جوائز_PMB`;

      await prisma.post.create({
        data: {
          content: postContent,
          tag: "VICTORY",
          userId: mediaBotId,
          clubId: awardedClubs[0]?.clubId || null,
        },
      });
    } catch (socialErr) {
      console.error("Failed to post social announcement:", socialErr);
    }

    return {
      success: true,
      month: poll.month,
      awardedClubs,
      candidateResults,
      totalDistributed: 53000000,
    };
  }

  private static formatPollResponse(poll: any, userId?: string) {
    const totalVotes = poll.options.reduce((sum: number, opt: any) => sum + opt.voteCount, 0);
    const userVotedOptionId = poll.votes && poll.votes.length > 0 ? poll.votes[0].optionId : null;

    return {
      id: poll.id,
      title: poll.title,
      description: poll.description,
      month: poll.month,
      totalVotes,
      userVotedOptionId,
      hasVoted: Boolean(userVotedOptionId),
      options: poll.options.map((opt: any) => ({
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
