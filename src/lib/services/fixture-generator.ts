/**
 * Berger Round-Robin Fixture Generator
 *
 * Generates a complete fixture list for a league using the standard Berger table
 * algorithm. Works for any number of clubs regardless of whether N is even or odd.
 *
 * For N clubs:
 *   - Single round-robin  → (N-1) matchdays, each with ⌊N/2⌋ fixtures
 *   - Double round-robin  → 2×(N-1) matchdays (reverse home/away for second half)
 */

export type FixturePair = {
  matchday: number;
  homeClubId: string;
  awayClubId: string;
};

/**
 * Generate a complete fixture list using the Berger round-robin algorithm.
 *
 * @param clubIds  Array of club IDs to schedule (minimum 2 clubs required)
 * @param doubleRoundRobin  If true, every pair plays home AND away (default: true)
 * @returns An array of FixturePair objects ordered by matchday then fixture
 */
export function generateFixtures(
  clubIds: string[],
  doubleRoundRobin = true
): FixturePair[] {
  if (clubIds.length < 2) {
    throw new Error("At least 2 clubs are required to generate fixtures.");
  }

  const fixtures: FixturePair[] = [];

  // Work on a shallow copy to avoid mutating the input array
  const teams = [...clubIds];

  // Berger algorithm requires an even number of teams.
  // If odd, insert a virtual "bye" slot — any match involving the bye is skipped.
  const BYE = "__BYE__";
  if (teams.length % 2 !== 0) {
    teams.push(BYE);
  }

  const n = teams.length; // always even
  const numFirstRoundMatchdays = n - 1;

  // --- First round (single round-robin) ---
  // Fix team at index 0; rotate the remaining n-1 teams clockwise each round.
  const rotation = teams.slice(1); // teams[1..n-1] — the rotating block

  for (let round = 0; round < numFirstRoundMatchdays; round++) {
    // Build current round's team array: [fixed, ...rotation]
    const roundTeams = [teams[0], ...rotation];

    for (let i = 0; i < n / 2; i++) {
      const home = roundTeams[i];
      const away = roundTeams[n - 1 - i];

      // Skip bye matches
      if (home !== BYE && away !== BYE) {
        fixtures.push({
          matchday: round + 1,
          homeClubId: home,
          awayClubId: away,
        });
      }
    }

    // Rotate the rotating block one position clockwise:
    // The last element moves to the front.
    const last = rotation.pop()!;
    rotation.unshift(last);
  }

  if (!doubleRoundRobin) {
    return fixtures;
  }

  // --- Second round (reverse home/away, offset matchday by numFirstRoundMatchdays) ---
  const secondRound: FixturePair[] = fixtures.map((f) => ({
    matchday: f.matchday + numFirstRoundMatchdays,
    homeClubId: f.awayClubId, // swap
    awayClubId: f.homeClubId, // swap
  }));

  return [...fixtures, ...secondRound];
}

/**
 * Returns the total number of matchdays for a double round-robin league.
 */
export function getMatchdayCount(clubCount: number, doubleRoundRobin = true): number {
  // Berger: if odd number of clubs, we use n+1 (adding a bye) then subtract 1 → same formula
  const effectiveN = clubCount % 2 === 0 ? clubCount : clubCount + 1;
  const singleRR = effectiveN - 1;
  return doubleRoundRobin ? singleRR * 2 : singleRR;
}

/**
 * Returns the number of matches per matchday (without byes).
 */
export function getMatchesPerMatchday(clubCount: number): number {
  return Math.floor(clubCount / 2);
}
