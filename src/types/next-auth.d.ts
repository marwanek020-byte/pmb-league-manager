import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      username: string;
      role: "SUPER_ADMIN" | "LEAGUE_ADMIN" | "ADMINISTRATOR" | "CLUB_MANAGER";
      clubId: string | null;
      clubName: string | null;
      leagueName: string | null;
      adminLeagueId: string | null;
      adminLeagueName: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    username: string;
    role: "SUPER_ADMIN" | "LEAGUE_ADMIN" | "ADMINISTRATOR" | "CLUB_MANAGER";
    clubId: string | null;
    clubName: string | null;
    leagueName: string | null;
    adminLeagueId: string | null;
    adminLeagueName: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: "SUPER_ADMIN" | "LEAGUE_ADMIN" | "ADMINISTRATOR" | "CLUB_MANAGER";
    clubId: string | null;
    clubName: string | null;
    leagueName: string | null;
    adminLeagueId: string | null;
    adminLeagueName: string | null;
    username: string;
  }
}
