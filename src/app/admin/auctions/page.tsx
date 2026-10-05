import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AdminAuctionManager } from "@/components/admin/AdminAuctionManager";
import { isAnyAdmin } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export default async function AdminAuctionsPage() {
  const session = await auth();

  if (!session || !isAnyAdmin(session.user)) {
    redirect("/unauthorized");
  }

  return <AdminAuctionManager />;
}
