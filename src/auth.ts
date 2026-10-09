import { logSecurityEvent } from "@/lib/audit-logger";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getClubPassword } from "@/lib/manager-passwords";

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

        // Auto-provision super-admin on the fly if standard admin password matches
        if (!user && trimmedUsername.toLowerCase() === "admin" && (password === "PMBAdmin2026!" || password === "PMBLeagueAdmin2026!")) {
          const hash = await bcrypt.hash(password, 10);
          user = await prisma.user.create({
            data: {
              username: "admin",
              password: hash,
              role: "SUPER_ADMIN",
            },
            include: { club: { include: { league: true } }, adminLeague: true },
          });
        }

        // Auto-provision league admins on the fly if standard admin password matches
        if (!user) {
          const lower = trimmedUsername.toLowerCase();
          if (lower.startsWith("admin-") && (password === "PMBAdmin2026!" || password === "PMBLeagueAdmin2026!")) {
            const prefix = lower.replace("admin-", "");
            const leagues = await prisma.league.findMany();
            const league = leagues.find((l) => {
              const slug = l.name.toLowerCase().replace(/[^a-z0-9]/g, "");
              return slug.includes(prefix) || prefix.includes(slug.slice(0, 5));
            });
            if (league) {
              const hash = await bcrypt.hash(password, 10);
              user = await prisma.user.create({
                data: {
                  username: lower,
                  password: hash,
                  role: "LEAGUE_ADMIN",
                  leagueId: league.id,
                },
                include: { club: { include: { league: true } }, adminLeague: true },
              });
            }
          }
        }

        // Auto-provision or link club manager on the fly if their unique club password is provided
        if (!user) {
          const lower = trimmedUsername.toLowerCase();
          const allClubs = await prisma.club.findMany({ include: { league: true } });
          const matchingClub = allClubs.find((c) => {
            const leagueSlug = c.league.name.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 7);
            const clubSlug = c.name.toLowerCase().replace(/[^a-z0-9]/g, "");
            return lower === `${leagueSlug}-${clubSlug}` || lower === `vip-${clubSlug}` || lower === clubSlug;
          });
          if (matchingClub && password === getClubPassword(matchingClub.name)) {
            const hash = await bcrypt.hash(password, 10);
            user = await prisma.user.create({
              data: {
                username: lower,
                password: hash,
                role: "CLUB_MANAGER",
                clubId: matchingClub.id,
              },
              include: { club: { include: { league: true } }, adminLeague: true },
            });
            await prisma.club.update({
              where: { id: matchingClub.id },
              data: { managerId: user.id },
            });
          }
        }

        if (!user) return null;

        let passwordValid = await bcrypt.compare(password, user.password);
        // Fallback for admins with standard password
        if (!passwordValid && (user.role === "SUPER_ADMIN" || user.role === "LEAGUE_ADMIN" || user.role === "ADMINISTRATOR")) {
          if (password === "PMBAdmin2026!" || password === "PMBLeagueAdmin2026!") {
            passwordValid = true;
          }
        }
        // Fallback for club manager unique password
        if (!passwordValid && user.role === "CLUB_MANAGER") {
          let clubName = user.club?.name;
          if (!clubName && user.clubId) {
            const c = await prisma.club.findUnique({ where: { id: user.clubId } });
            if (c) clubName = c.name;
          }
          if (!clubName) {
            const allClubs = await prisma.club.findMany();
            const cleanUser = user.username.toLowerCase().replace(/[^a-z0-9]/g, "");
            const matching = allClubs.find((c) =>
              cleanUser.includes(c.name.toLowerCase().replace(/[^a-z0-9]/g, ""))
            );
            if (matching) clubName = matching.name;
          }
          if (clubName && password === getClubPassword(clubName)) {
            passwordValid = true;
          }
        }

        // Sync hash in background if login validated via fallback
        if (passwordValid) {
          const matches = await bcrypt.compare(password, user.password).catch(() => false);
          if (!matches) {
            const newHash = await bcrypt.hash(password, 10);
            await prisma.user.update({
              where: { id: user.id },
              data: { password: newHash },
            }).catch(() => {});
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
