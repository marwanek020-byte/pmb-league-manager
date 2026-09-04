import { LandingPage } from "@/components/LandingPage";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "PMB — PES Moroccan Bourgeois",
  description: "The Home of Moroccan eFootball. PMB League Manager.",
  other: {
    monetag: "88b435aea520a594f9d18d82cfc78c94",
  },
};

export default async function WelcomePage({
  searchParams,
}: {
  searchParams?: Promise<{ preview?: string; fromApp?: string }>;
}) {
  const params = searchParams ? await searchParams : {};
  const session = await auth();

  if (session?.user && params.fromApp !== "true" && params.preview !== "true") {
    if (session.user.role === "ADMINISTRATOR") {
      redirect("/admin/dashboard");
    }
    if (session.user.role === "CLUB_MANAGER") {
      redirect("/manager/dashboard");
    }
  }

  return <LandingPage initialFromApp={params.fromApp === "true"} />;
}

