import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isAnyAdmin } from "@/lib/admin-auth";

export async function GET() {
  const session = await auth();

  if (!session || !isAnyAdmin(session.user)) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const ratings = await prisma.clubPowerRating.findMany({
    orderBy: [
      { rating: "desc" },
      { titles: "desc" },
      { topThree: "desc" },
      { topFive: "desc" },
    ],
    include: {
      club: {
        select: {
          id: true,
          name: true,
          logo: true,
          league: {
            select: {
              id: true,
              name: true,
              country: true,
            },
          },
        },
      },
    },
  });

  return NextResponse.json({
    ratings,
  });
}