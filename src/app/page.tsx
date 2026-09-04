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

export default async function HomePage() {
  const session = await auth();

  return <LandingPage initialUser={session?.user || null} />;
}

