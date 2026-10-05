import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { isAnyAdmin } from "@/lib/admin-auth";
import { Navbar } from "@/components/Navbar";
import { LiveFeed } from "@/components/LiveFeed";
import { UnreadMessageNotifier } from "@/components/UnreadMessageNotifier";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session) redirect("/login");
  if (!isAnyAdmin(session.user)) {
    redirect("/unauthorized");
  }

  const rightLabel =
    session.user.role === "LEAGUE_ADMIN" && session.user.adminLeagueName
      ? `${session.user.adminLeagueName} Admin`
      : "Administrator";

  return (
    <div className="admin-world min-h-screen">
      <Navbar
        homeHref="/admin/dashboard"
        rightLabel={rightLabel}
      />

      {/* PMB animated live feed */}
      <LiveFeed />

      {/* Real-time Unread Direct Message Toast */}
      <UnreadMessageNotifier isAdmin />

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {children}
      </div>
    </div>
  );
}
