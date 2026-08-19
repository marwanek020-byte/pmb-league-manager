import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { LiveAuctionRoom } from "@/components/manager/auctions/LiveAuctionRoom";

export const dynamic = "force-dynamic";

export default async function ManagerAuctionsPage() {
  const session = await auth();

  if (!session || session.user.role !== "CLUB_MANAGER") {
    redirect("/unauthorized");
  }

  const club = await prisma.club.findUnique({
    where: { id: session.user.clubId ?? "" },
    select: { id: true, name: true, logo: true, budget: true },
  });

  if (!club) redirect("/unauthorized");

  return (
    <LiveAuctionRoom
      myClubId={club.id}
      myClubName={club.name}
      myClubLogo={club.logo}
      myClubBudget={Number(club.budget)}
    />
  );
}
