import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type Team = {
  idTeam?: string;
  strTeam?: string;
  strBadge?: string | null;
};

type TeamSearchResponse = {
  teams?: Team[];
};

/**
 * Names that TheSportsDB recognizes differently.
 */
const ALIASES: Record<string, string[]> = {
  Lyon: [
    "Olympique Lyonnais",
    "Olympique Lyon",
  ],

  "Maghreb Fez": [
    "MAS Fes",
    "Maghreb de Fès",
  ],

  Malaga: [
    "Malaga CF",
    "Málaga",
  ],

  "Manchester City": [
    "Manchester City",
  ],

  "Manchester United": [
    "Manchester United",
  ],

  Marseille: [
    "Olympique Marseille",
    "Olympique de Marseille",
  ],

  Metz: [
    "FC Metz",
  ],

  Monaco: [
    "AS Monaco",
  ],

  Monza: [
    "AC Monza",
  ],

  Nantes: [
    "FC Nantes",
  ],

  Napoli: [
    "Napoli",
    "SSC Napoli",
  ],

  Newcastle: [
    "Newcastle United",
  ],

  Nice: [
    "OGC Nice",
  ],

  "Nottingham Forest": [
    "Nottingham Forest",
  ],

  Olympiacos: [
    "Olympiacos FC",
  ],

  "Olympique Safi": [
    "Olympique Club de Safi",
    "Olympic Club de Safi",
  ],

  Osasuna: [
    "CA Osasuna",
  ],

  PSG: [
    "Paris Saint-Germain",
    "Paris SG",
  ],

  PSV: [
    "PSV Eindhoven",
  ],

  "Paris FC": [
    "Paris FC",
  ],

  Parma: [
    "Parma Calcio",
    "Parma FC",
  ],

  Porto: [
    "FC Porto",
  ],

  "RB Leipzig": [
    "RB Leipzig",
  ],

  "Racing Santander": [
    "Racing de Santander",
    "Real Racing Club",
  ],

  "Raja Casablanca": [
    "Raja Club Athletic",
    "Raja Casablanca",
  ],

  "Rayo Vallecano": [
    "Rayo Vallecano",
  ],

  "Real Betis": [
    "Real Betis Balompie",
    "Real Betis",
  ],

  "Real Madrid": [
    "Real Madrid",
  ],

  "Real Sociedad": [
    "Real Sociedad",
  ],

  "Renaissance Zemamra": [
    "Renaissance Zemamra",
  ],

  Rennes: [
    "Stade Rennais",
    "Stade Rennais FC",
  ],

  Roma: [
    "AS Roma",
  ],

  Sassuolo: [
    "US Sassuolo",
    "US Sassuolo Calcio",
  ],

  Sevilla: [
    "Sevilla FC",
  ],

  "Shakhtar Donetsk": [
    "Shakhtar Donetsk",
    "FC Shakhtar Donetsk",
  ],

  "Sporting CP": [
    "Sporting Lisbon",
    "Sporting Clube de Portugal",
  ],

  "St Pauli": [
    "FC St Pauli",
    "FC St. Pauli",
  ],

  Strasbourg: [
    "RC Strasbourg",
    "RC Strasbourg Alsace",
  ],

  Stuttgart: [
    "VfB Stuttgart",
  ],

  Sunderland: [
    "Sunderland AFC",
  ],

  Torino: [
    "Torino FC",
  ],

  Tottenham: [
    "Tottenham Hotspur",
    "Tottenham Hotspur FC",
  ],

  Toulouse: [
    "Toulouse FC",
  ],

  Udinese: [
    "Udinese Calcio",
  ],

  "Union Berlin": [
    "1. FC Union Berlin",
  ],

  "Union Touarga": [
    "Union Touarga Sportif",
  ],

  Valencia: [
    "Valencia CF",
  ],

  Venezia: [
    "Venezia FC",
  ],

  Villarreal: [
    "Villarreal CF",
  ],

  "Werder Bremen": [
    "SV Werder Bremen",
  ],

  "West Ham": [
    "West Ham United",
    "West Ham United FC",
  ],

  Wolfsburg: [
    "VfL Wolfsburg",
  ],

  Wolves: [
    "Wolverhampton Wanderers",
    "Wolverhampton",
  ],

  "Wydad AC": [
    "Wydad Casablanca",
    "Wydad Athletic Club",
  ],

  "Yacoub El Mansour": [
    "Yacoub El Mansour",
  ],

  Zenit: [
    "Zenit Saint Petersburg",
    "FC Zenit",
  ],
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function searchTeam(
  searchName: string
): Promise<Team | null> {
  const url =
    `https://www.thesportsdb.com/api/v1/json/3/searchteams.php?t=` +
    encodeURIComponent(searchName);

  const response = await fetch(url);

  if (response.status === 429) {
    console.log("   ⏳ Rate limited. Waiting 65 seconds...");
    await sleep(65_000);

    const retry = await fetch(url);

    if (!retry.ok) {
      throw new Error(
        `TheSportsDB returned ${retry.status} for ${searchName}`
      );
    }

    const retryData =
      (await retry.json()) as TeamSearchResponse;

    return retryData.teams?.[0] ?? null;
  }

  if (!response.ok) {
    throw new Error(
      `TheSportsDB returned ${response.status} for ${searchName}`
    );
  }

  const data =
    (await response.json()) as TeamSearchResponse;

  return data.teams?.[0] ?? null;
}

async function findLogo(
  clubName: string
): Promise<string | null> {
  const names = [
    clubName,
    ...(ALIASES[clubName] ?? []),
  ];

  for (const searchName of names) {
    console.log(`   → Trying: ${searchName}`);

    const team = await searchTeam(searchName);

    if (team?.strBadge) {
      console.log(
        `   ✅ Found: ${team.strTeam ?? searchName}`
      );

      return team.strBadge;
    }

    // Respect the free API rate limit.
    await sleep(2_200);
  }

  return null;
}

async function main() {
  const clubs = await prisma.club.findMany({
    orderBy: {
      name: "asc",
    },
    select: {
      id: true,
      name: true,
      logo: true,
    },
  });

  console.log(`Found ${clubs.length} clubs.`);
  console.log("");

  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const club of clubs) {
    /*
     * IMPORTANT:
     *
     * Do NOT trust an existing logo just because it is not null.
     *
     * We want to replace the broken Wikimedia URLs.
     */
    const isWikimediaLogo =
      club.logo?.includes("commons.wikimedia.org");

    if (club.logo && !isWikimediaLogo) {
      console.log(`⏭️  Already has logo: ${club.name}`);
      skipped++;
      continue;
    }

    console.log("");
    console.log(`🔎 Club: ${club.name}`);

    try {
      const logo = await findLogo(club.name);

      if (!logo) {
        console.log(`❌ No logo found: ${club.name}`);
        failed++;
        continue;
      }

      await prisma.club.update({
        where: {
          id: club.id,
        },
        data: {
          logo,
        },
      });

      console.log(`💾 Logo saved: ${club.name}`);

      updated++;

      // Stay safely below the free API rate limit.
      await sleep(2_200);
    } catch (error) {
      console.error(`❌ Failed: ${club.name}`);
      console.error(error);
      failed++;
    }
  }

  console.log("");
  console.log("================================");
  console.log("CLUB LOGO IMPORT FINISHED");
  console.log("================================");
  console.log(`Total clubs: ${clubs.length}`);
  console.log(`Updated: ${updated}`);
  console.log(`Already valid: ${skipped}`);
  console.log(`Failed: ${failed}`);
}

main()
  .catch((error) => {
    console.error("Logo import failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });