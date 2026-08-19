import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { ManagerSocialHub } from "@/components/social/ManagerSocialHub";

export default async function AdminSocialPage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  if (session.user.role !== "ADMINISTRATOR") {
    redirect("/unauthorized");
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-pmb-gold animate-ping" />
            <p className="text-[10px] font-black uppercase tracking-[.3em] text-pmb-gold">
              League Headquarters · The Dugout
            </p>
          </div>
          <h1 className="mt-1 text-3xl font-black uppercase tracking-tight text-white sm:text-4xl">
            League Social & Discussion Hub
          </h1>
        </div>
      </div>

      <ManagerSocialHub
        myUserId={session.user.id}
        myUsername={session.user.username}
        myClubName="PMB League Headquarters"
        myClubLogo="/branding/pmb-lion.jpg"
        myBudget={999999999}
      />
    </div>
  );
}
