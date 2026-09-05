import StadiumDashboard from "@/components/manager/stadium/StadiumDashboard";

// TODO: Replace these with values from your real session/auth context
// once the global state provider is wired up.
const DEFAULT_CLUB  = "FAR Rabat";
const DEFAULT_BUDGET = 125_262_096;

export const metadata = {
  title: "Stadium & Finance Dashboard | PMB League Manager",
  description: "Matchday economy, ticket pricing elasticity, and venue management.",
};

export default function StadiumPage() {
  return (
    <StadiumDashboard
      currentClub={DEFAULT_CLUB}
      globalBudget={DEFAULT_BUDGET}
      onBudgetChange={(newBudget) => {
        // TODO: Dispatch to your global budget store / server action
        console.log("[StadiumPage] Budget change requested:", newBudget);
      }}
    />
  );
}
