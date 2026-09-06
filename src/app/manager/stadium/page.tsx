import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import StadiumDashboard from "@/components/manager/stadium/StadiumDashboard";

export const dynamic = "force-dynamic";

export default async function StadiumPage() {
  const session = await auth();
  if (!session || session.user.role !== "CLUB_MANAGER" || !session.user.clubId) {
    redirect("/unauthorized");
  }

  // Fetch real club + budget from DB
  const club = await prisma.club.findUnique({
    where: { id: session.user.clubId },
    select: { name: true, budget: true },
  });

  const clubName = club?.name ?? session.user.clubName ?? "Unknown Club";
  const globalBudget = club?.budget ? Number(club.budget) : 0;

  return (
    <StadiumDashboard
      currentClub={clubName}
      globalBudget={globalBudget}
    />
  );
}
