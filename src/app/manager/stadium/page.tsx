"use client";

import React from "react";
import StadiumDashboard from "@/components/manager/stadium/StadiumDashboard";

export default function StadiumPage() {
  return (
    <StadiumDashboard
      currentClub="FAR Rabat"
      globalBudget={125262096}
      onBudgetChange={(newBudget) => {
        console.log("Budget updated:", newBudget);
      }}
    />
  );
}
