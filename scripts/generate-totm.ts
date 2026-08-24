import { TeamOfTheMonthService } from "../src/lib/services/team-of-month-service";

async function main() {
  console.log("Nominate Top 4 Teams of the Month...");
  const result = await TeamOfTheMonthService.nominateTop4Teams();
  console.log("SUCCESS!");
  console.log("Title:", result.poll.title);
  console.log("Options (Top 4 Nominees):");
  result.poll.options.forEach((o: any, idx: number) => {
    console.log(`  #${idx + 1}: ${o.clubName} -> ${o.statement}`);
  });
}

main().catch(console.error);
