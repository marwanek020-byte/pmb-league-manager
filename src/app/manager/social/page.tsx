import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ManagerSocialHub } from "@/components/social/ManagerSocialHub";

export default async function ManagerSocialPage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  let myClubName = "PMB League HQ";
  let myClubLogo: string | null = null;
  let myBudget = 0;

  if (session.user.clubId) {
    const club = await prisma.club.findUnique({
      where: { id: session.user.clubId },
      select: {
        id: true,
        name: true,
        logo: true,
        budget: true,
      },
    });

    if (club) {
      myClubName = club.name;
      myClubLogo = club.logo;
      myBudget = Number(club.budget);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-ping" />
            <p className="text-[10px] font-black uppercase tracking-[.3em] text-pmb-gold">
              The Dugout · League Lounge
            </p>
          </div>
          <h1 className="mt-1 text-3xl font-black uppercase tracking-tight text-white sm:text-4xl">
            Manager Social Hub
          </h1>
        </div>
      </div>

      <ManagerSocialHub
        myUserId={session.user.id}
        myUsername={session.user.username}
        myClubName={myClubName}
        myClubLogo={myClubLogo}
        myBudget={myBudget}
      />
    </div>
  );
}
