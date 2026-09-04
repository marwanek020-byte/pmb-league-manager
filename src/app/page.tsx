import { redirect } from "next/navigation";
import { headers } from "next/headers";
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

  // Automatically detect the Capacitor Android APK (com.pmb.manager)
  // so users DO NOT need to re-download or re-upload a new APK to MediaFire!
  const reqHeaders = await headers();
  const requestedWith = reqHeaders.get("x-requested-with");
  const userAgent = reqHeaders.get("user-agent") || "";

  const isAndroidApp =
    requestedWith === "com.pmb.manager" ||
    (userAgent.includes("Android") && userAgent.includes("; wv"));

  if (isAndroidApp) {
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
