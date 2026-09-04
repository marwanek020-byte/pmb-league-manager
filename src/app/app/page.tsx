import { auth } from "@/auth";
import { AppLandingPage } from "@/components/app/AppLandingPage";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "PMB Manager — Mobile App",
  description: "Official PMB League Manager Mobile App",
};

export default async function AppRootPage() {
  const session = await auth();

  return <AppLandingPage initialUser={session?.user || null} />;
}
