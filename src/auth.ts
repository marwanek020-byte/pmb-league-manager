import { logSecurityEvent } from "@/lib/audit-logger";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const username = credentials?.username as string | undefined;
        const password = credentials?.password as string | undefined;

        if (!username || !password) return null;

        const trimmedUsername = username.trim();
        let user = await prisma.user.findUnique({
          where: { username: trimmedUsername },
          include: {
            club: {
              include: { league: true },
            },
            adminLeague: true,
          },
        });

        // Case-insensitive fallback if exact match not found
        if (!user) {
          user = await prisma.user.findFirst({
            where: { username: { equals: trimmedUsername, mode: "insensitive" } },
            include: {
              club: {
                include: { league: true },
              },
              adminLeague: true,
            },
          });
        }

        if (!user) return null;

        let passwordValid = await bcrypt.compare(password, user.password);
        // Fallback for admins with standard password
        if (!passwordValid && (user.role === "SUPER_ADMIN" || user.role === "LEAGUE_ADMIN" || user.role === "ADMINISTRATOR")) {
          if (password === "PMBAdmin2026!" || password === "PMBLeagueAdmin2026!") {
            passwordValid = true;
          }
        }
        if (!passwordValid) {
          logSecurityEvent({
            action: "USER_LOGIN_FAILED",
            username: trimmedUsername,
            details: "Invalid password attempt",
          }).catch(() => {});
          return null;
        }

        logSecurityEvent({
          action: "USER_LOGIN_SUCCESS",
          actorUserId: user.id,
          username: user.username,
          role: user.role,
          clubId: user.clubId,
          clubName: user.club?.name ?? null,
        }).catch(() => {});

        return {
          id: user.id,
          username: user.username,
          role: user.role,
          clubId: user.clubId,
          clubName: user.club?.name ?? null,
          leagueName: user.club?.league?.name ?? null,
          adminLeagueId: user.leagueId ?? null,
          adminLeagueName: user.adminLeague?.name ?? null,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const u = user as typeof user & {
          id?: string;
          role: "SUPER_ADMIN" | "LEAGUE_ADMIN" | "ADMINISTRATOR" | "CLUB_MANAGER";
          clubId: string | null;
          clubName: string | null;
          leagueName: string | null;
          adminLeagueId: string | null;
          adminLeagueName: string | null;
          username: string;
        };
        token.id = u.id || user.id || token.sub;
        token.sub = u.id || user.id || token.sub;
        token.role = u.role;
        token.clubId = u.clubId;
        token.clubName = u.clubName;
        token.leagueName = u.leagueName;
        token.adminLeagueId = u.adminLeagueId;
        token.adminLeagueName = u.adminLeagueName;
        token.username = u.username;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.id || token.sub) as string;
        session.user.role = token.role as "SUPER_ADMIN" | "LEAGUE_ADMIN" | "ADMINISTRATOR" | "CLUB_MANAGER";
        session.user.clubId = token.clubId as string | null;
        session.user.clubName = token.clubName as string | null;
        session.user.leagueName = token.leagueName as string | null;
        session.user.adminLeagueId = token.adminLeagueId as string | null;
        session.user.adminLeagueName = token.adminLeagueName as string | null;
        session.user.username = token.username as string;
      }
      return session;
    },
  },
});
