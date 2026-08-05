import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      username: string;
      role: "ADMINISTRATOR" | "CLUB_MANAGER";
      clubId: string | null;
      clubName: string | null;
      leagueName: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    username: string;
    role: "ADMINISTRATOR" | "CLUB_MANAGER";
    clubId: string | null;
    clubName: string | null;
    leagueName: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: "ADMINISTRATOR" | "CLUB_MANAGER";
    clubId: string | null;
    clubName: string | null;
    leagueName: string | null;
    username: string;
  }
}
