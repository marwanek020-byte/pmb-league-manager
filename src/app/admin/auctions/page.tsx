import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AdminAuctionManager } from "@/components/admin/AdminAuctionManager";

export const dynamic = "force-dynamic";

export default async function AdminAuctionsPage() {
  const session = await auth();

  if (!session || session.user.role !== "ADMINISTRATOR") {
    redirect("/unauthorized");
  }

  return <AdminAuctionManager />;
}
