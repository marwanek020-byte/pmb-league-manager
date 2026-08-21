import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function testDossierActionButtons() {
  console.log("Testing Dossier Action Buttons detection...");
  const replySample = `
### Top Targets:
1. **Lionel Messi** (RWF | 99 OVR | Free Agent)
2. **Mohamed Rabie Hrimat** (DMF | 75 OVR)
3. **Ange-freedy Plumain** (LWF | 75 OVR)
`;

  const allDbPlayers = await prisma.player.findMany({
    select: { id: true, fullName: true, position: true, overallRating: true },
  });

  const replyLower = replySample.toLowerCase();
  const detected: any[] = [];
  for (const p of allDbPlayers) {
    if (replyLower.includes(p.fullName.toLowerCase())) {
      detected.push({
        id: p.id,
        name: p.fullName,
        position: p.position.toUpperCase(),
        overallRating: p.overallRating ?? 75,
      });
    }
  }

  console.log("Detected Players to render as 1-click dossier buttons:", detected);
}

testDossierActionButtons().finally(() => prisma.$disconnect());
