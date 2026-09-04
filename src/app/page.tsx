import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { LandingPage } from "@/components/LandingPage";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "PMB — PES Moroccan Bourgeois",
  description: "The Home of Moroccan eFootball. PMB League Manager.",
  other: {
    monetag: "88b435aea520a594f9d18d82cfc78c94",
  },
};

export default async function HomePage({
  searchParams,
}: {
  searchParams?: Promise<{ app?: string }>;
}) {
  const params = searchParams ? await searchParams : {};
  if (params.app === "true") {
    redirect("/app");
  }

  const session = await auth();

  if (session?.user) {
    if (session.user.role === "ADMINISTRATOR") {
      redirect("/admin/dashboard");
    }
    if (session.user.role === "CLUB_MANAGER") {
      redirect("/manager/dashboard");
    }
  }

  return <LandingPage />;
}
