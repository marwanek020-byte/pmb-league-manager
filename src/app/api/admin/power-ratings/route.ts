import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();

  if (!session || session.user.role !== "ADMINISTRATOR") {
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