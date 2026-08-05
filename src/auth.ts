import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
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

        const user = await prisma.user.findUnique({
          where: { username },
          include: {
            club: {
              include: { league: true },
            },
          },
        });

        if (!user) return null;

        const passwordValid = await bcrypt.compare(password, user.password);
        if (!passwordValid) return null;

        return {
          id: user.id,
          username: user.username,
          role: user.role,
          clubId: user.clubId,
          clubName: user.club?.name ?? null,
          leagueName: user.club?.league.name ?? null,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const u = user as typeof user & {
          role: "ADMINISTRATOR" | "CLUB_MANAGER";
          clubId: string | null;
          clubName: string | null;
          leagueName: string | null;
          username: string;
        };
        token.role = u.role;
        token.clubId = u.clubId;
        token.clubName = u.clubName;
        token.leagueName = u.leagueName;
        token.username = u.username;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub as string;
        session.user.role = token.role as "ADMINISTRATOR" | "CLUB_MANAGER";
        session.user.clubId = token.clubId as string | null;
        session.user.clubName = token.clubName as string | null;
        session.user.leagueName = token.leagueName as string | null;
        session.user.username = token.username as string;
      }
      return session;
    },
  },
});
