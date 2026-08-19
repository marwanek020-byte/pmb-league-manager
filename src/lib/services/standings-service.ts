/**
 * Live Standings Service
 *
 * Computes standings from completed Match records.
 * This is the authoritative source of truth for an active season.
 * SeasonClassification is only written as a snapshot when a season is FINISHED.
 *
 * Ranking order (PMB standard):
 *  1. Points (descending)
 *  2. Goal difference (descending)
 *  3. Goals scored (descending)
 *  4. Wins (descending)
 *  5. Club name (alphabetical, as final tiebreaker)
 */

export type StandingRow = {
  position: number;
  clubId: string;
  clubName: string;
  clubLogo: string | null;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  /** Last 5 match results for this club, most recent first */
  form: ("W" | "D" | "L")[];
};

type MatchRecord = {
  id: string;
  status: string; // "UPCOMING" | "COMPLETED"
  homeClubId: string;
  awayClubId: string;
  homeGoals: number | null;
  awayGoals: number | null;
  matchday: number;
  playedAt: Date | null;
};

type ClubRecord = {
  id: string;
  name: string;
  logo: string | null;
};

type ClubStats = {
  clubId: string;
  clubName: string;
  clubLogo: string | null;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
  /** Recent matches sorted by matchday asc for form calculation */
  recentMatches: { result: "W" | "D" | "L"; matchday: number }[];
};

export function computeStandings(
  matches: MatchRecord[],
  clubs: ClubRecord[]
): StandingRow[] {
  // Initialize stats for every club (even those with no matches played yet)
  const statsMap = new Map<string, ClubStats>();

  for (const club of clubs) {
    statsMap.set(club.id, {
      clubId: club.id,
      clubName: club.name,
      clubLogo: club.logo,
      played: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      points: 0,
      recentMatches: [],
    });
  }

  // Process completed matches
  for (const match of matches) {
    if (
      match.status !== "COMPLETED" ||
      match.homeGoals === null ||
      match.awayGoals === null
    ) {
      continue;
    }

    const home = statsMap.get(match.homeClubId);
    const away = statsMap.get(match.awayClubId);

    if (!home || !away) continue;

    const hg = match.homeGoals;
    const ag = match.awayGoals;

    home.played++;
    away.played++;
    home.goalsFor += hg;
    home.goalsAgainst += ag;
    away.goalsFor += ag;
    away.goalsAgainst += hg;

    if (hg > ag) {
      // Home win
      home.wins++;
      home.points += 3;
      away.losses++;
      home.recentMatches.push({ result: "W", matchday: match.matchday });
      away.recentMatches.push({ result: "L", matchday: match.matchday });
    } else if (hg === ag) {
      // Draw
      home.draws++;
      away.draws++;
      home.points++;
      away.points++;
      home.recentMatches.push({ result: "D", matchday: match.matchday });
      away.recentMatches.push({ result: "D", matchday: match.matchday });
    } else {
      // Away win
      away.wins++;
      away.points += 3;
      home.losses++;
      home.recentMatches.push({ result: "L", matchday: match.matchday });
      away.recentMatches.push({ result: "W", matchday: match.matchday });
    }
  }

  // Sort clubs by the PMB ranking rules
  const sortedClubs = Array.from(statsMap.values()).sort((a, b) => {
    // 1. Points descending
    if (b.points !== a.points) return b.points - a.points;
    // 2. Goal difference descending
    const gdA = a.goalsFor - a.goalsAgainst;
    const gdB = b.goalsFor - b.goalsAgainst;
    if (gdB !== gdA) return gdB - gdA;
    // 3. Goals scored descending
    if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
    // 4. Wins descending
    if (b.wins !== a.wins) return b.wins - a.wins;
    // 5. Alphabetical (final tiebreaker — deterministic)
    return a.clubName.localeCompare(b.clubName);
  });

  return sortedClubs.map((club, index) => {
    // Build form: sort recent matches by matchday descending, take last 5
    const recentSorted = [...club.recentMatches]
      .sort((a, b) => b.matchday - a.matchday)
      .slice(0, 5)
      .map((m) => m.result);

    return {
      position: index + 1,
      clubId: club.clubId,
      clubName: club.clubName,
      clubLogo: club.clubLogo,
      played: club.played,
      wins: club.wins,
      draws: club.draws,
      losses: club.losses,
      goalsFor: club.goalsFor,
      goalsAgainst: club.goalsAgainst,
      goalDifference: club.goalsFor - club.goalsAgainst,
      points: club.points,
      form: recentSorted,
    };
  });
}

/**
 * Compute the standings snapshot to write into SeasonClassification when
 * a season is being FINISHED. Returns data in the SeasonClassification shape.
 */
export function computeClassificationSnapshot(
  standings: StandingRow[],
  seasonId: string
): {
  seasonId: string;
  clubId: string;
  position: number;
  points: number;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
}[] {
  return standings.map((row) => ({
    seasonId,
    clubId: row.clubId,
    position: row.position,
    points: row.points,
    played: row.played,
    wins: row.wins,
    draws: row.draws,
    losses: row.losses,
    goalsFor: row.goalsFor,
    goalsAgainst: row.goalsAgainst,
    goalDifference: row.goalDifference,
  }));
}
