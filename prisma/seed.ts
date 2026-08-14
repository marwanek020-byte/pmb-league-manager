import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const LEAGUE_PREFIX: Record<string, string> = {
  "Premier League": "premier",
  "La Liga": "laliga",
  "Serie A": "seriea",
  "Bundesliga": "bundesliga",
  "Ligue 1": "ligue1",
  "VIP League": "vip",
  "BOTOLA PRO": "botola",
};

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

const leaguesData: { name: string; country: string; clubs: string[] }[] = [
  {
    name: "Premier League",
    country: "England",
    clubs: [
      "Crystal Palace",
      "Newcastle",
      "Brighton",
      "Manchester United",
      "Fulham",
      "Sunderland",
      "Aston Villa",
      "Liverpool",
      "Leeds United",
      "Arsenal",
      "Tottenham",
      "Hull City",
      "Manchester City",
      "Bournemouth",
      "Brentford",
      "Ipswich Town",
      "Coventry City",
      "Nottingham Forest",
      "Chelsea",
      "Everton",
    ],
  },
  {
    name: "La Liga",
    country: "Spain",
    clubs: [
      "Valencia",
      "Barcelona",
      "Real Sociedad",
      "Real Betis",
      "Sevilla",
      "Atletico Madrid",
      "Celta Vigo",
      "Getafe",
      "Real Madrid",
      "Osasuna",
      "Espanyol",
      "Deportivo Alaves",
      "Villarreal",
      "Racing Santander",
      "Rayo Vallecano",
      "Levante",
      "Deportivo La Coruna",
      "Elche",
      "Athletic Club",
      "Malaga",
    ],
  },
  {
    name: "Serie A",
    country: "Italy",
    clubs: [
      "Genoa",
      "Juventus",
      "Parma",
      "Fiorentina",
      "Bologna",
      "Inter",
      "Lazio",
      "Como",
      "Torino",
      "Roma",
      "Napoli",
      "Monza",
      "Udinese",
      "Venezia",
      "Sassuolo",
      "Frosinone",
      "AC Milan",
      "Atalanta",
      "Lecce",
      "Cagliari",
    ],
  },
  {
    name: "Bundesliga",
    country: "Germany",
    clubs: [
      "Mainz",
      "Hamburg",
      "RB Leipzig",
      "Borussia Monchengladbach",
      "Bayer Leverkusen",
      "Eintracht Frankfurt",
      "St Pauli",
      "Hoffenheim",
      "Stuttgart",
      "Union Berlin",
      "Heidenheim",
      "Schalke",
      "Borussia Dortmund",
      "Koln",
      "Werder Bremen",
      "Wolfsburg",
      "Freiburg",
      "Bayern Munich",
    ],
  },
  {
    name: "Ligue 1",
    country: "France",
    clubs: [
      "Strasbourg",
      "Marseille",
      "Lorient",
      "Le Havre",
      "Brest",
      "Paris FC",
      "Rennes",
      "Lens",
      "PSG",
      "Angers",
      "Auxerre",
      "Toulouse",
      "Lyon",
      "Lille",
      "Nantes",
      "Monaco",
      "Metz",
      "Nice",
    ],
  },
  {
    name: "VIP League",
    country: "International",
    clubs: [
      "PSV",
      "Besiktas",
      "Wolves",
      "Fenerbahce",
      "Galatasaray",
      "Olympiacos",
      "Porto",
      "Benfica",
      "Sporting CP",
      "West Ham",
      "Zenit",
      "Celtic",
      "Dynamo Kyiv",
      "Ajax",
      "Club Brugge",
      "Shakhtar Donetsk",
    ],
  },
    {
    name: "BOTOLA PRO",
    country: "Morocco",
    clubs: [
      "Maghreb Fez",
      "Berkane",
      "Raja Casablanca",
      "FAR Rabat",
      "Wydad AC",
      "Difaa El Jadidi",
      "IR Tanger",
      "FUS Rabat",
      "Kawkab Marrakech",
      "COD Meknes",
      "Renaissance Zemamra",
      "Hassania Agadir",
      "Union Touarga",
      "Dcheira",
      "Yacoub El Mansour",
      "Olympique Safi",
    ],
  },
];

async function main() {
  console.log("Seeding PMB League Manager database...");

  // --- Administrator ---
  const adminPasswordHash = await bcrypt.hash("PMBAdmin2026!", 10);
  await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      username: "admin",
      password: adminPasswordHash,
      role: Role.ADMINISTRATOR,
    },
  });
  console.log("Created administrator account: admin");

  // --- Leagues, Clubs, Managers ---
  const managerPasswordHash = await bcrypt.hash("PMB2026!", 10);
  let clubCount = 0;

  for (const leagueData of leaguesData) {
    const league = await prisma.league.upsert({
      where: { name: leagueData.name },
      update: {},
      create: {
        name: leagueData.name,
        country: leagueData.country,
      },
    });

    const prefix = LEAGUE_PREFIX[leagueData.name];

    for (const clubName of leagueData.clubs) {
      const club = await prisma.club.upsert({
        where: { name_leagueId: { name: clubName, leagueId: league.id } },
        update: {},
        create: {
          name: clubName,
          leagueId: league.id,
        },
      });

      const username = `${prefix}-${slugify(clubName)}`;

      const manager = await prisma.user.upsert({
        where: { username },
        update: {},
        create: {
          username,
          password: managerPasswordHash,
          role: Role.CLUB_MANAGER,
          clubId: club.id,
        },
      });

      // Keep the denormalized managerId on Club in sync.
      await prisma.club.update({
        where: { id: club.id },
        data: { managerId: manager.id },
      });

      clubCount += 1;
    }

    console.log(`Seeded league: ${leagueData.name} (${leagueData.clubs.length} clubs)`);
  }

  // --- Transfer window status flag ---
  await prisma.transferWindow.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton", isOpen: false },
  });

  console.log(`Done. ${clubCount} clubs and ${clubCount + 1} user accounts created.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
