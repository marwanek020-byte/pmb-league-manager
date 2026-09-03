import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { FreeAgentMarketClient } from "@/components/manager/transfers/FreeAgentMarketClient";

export const metadata = {
  title: "سوق اللاعبين الأحرار (Free Agent Market) · PMB League Manager",
  description: "تعاقد مباشر مع اللاعبين الأحرار بقيمة انتقال 0 € والتفاوض المباشر على الراتب والعقد",
};

export const dynamic = "force-dynamic";

export default async function FreeAgentMarketPage() {
  const session = await auth();
  if (!session || session.user.role !== "CLUB_MANAGER" || !session.user.clubId) {
    redirect("/unauthorized");
  }

  return <FreeAgentMarketClient />;
}
