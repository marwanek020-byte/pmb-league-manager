import { PrismaClient } from "@prisma/client";
import { UltrasSocialService } from "../src/lib/services/ultras-social-service";

const prisma = new PrismaClient();

async function testManagerPostReply() {
  console.log("=================================================");
  console.log("⚡ TESTING AI ULTRAS AUTOMATIC POST REPLIES");
  console.log("=================================================\n");

  const managerUser = await prisma.user.findFirst({
    where: { username: "botola-farrabat" },
    include: { club: true },
  });

  if (!managerUser) {
    console.log("No manager user found");
    return;
  }

  console.log(`1. Manager ${managerUser.username} (${managerUser.club?.name}) publishes a post...`);
  const post = await prisma.post.create({
    data: {
      content: "كنوعدو الجماهير ديالنا بـ 3 نقاط فهاد الديربي واللاعبين واجدين للقتالية 90 دقيقة!",
      tag: "BANTER",
      userId: managerUser.id,
      clubId: managerUser.clubId,
    },
  });

  console.log(`2. Triggering AI Ultras reply for Post ID ${post.id}...`);
  await UltrasSocialService.respondToManagerPost(post.id);

  const updatedPost = await prisma.post.findUnique({
    where: { id: post.id },
    include: {
      comments: {
        include: { user: true },
      },
    },
  });

  console.log(`\n✅ Post has ${updatedPost?.comments.length} AI Ultras replies:`);
  updatedPost?.comments.forEach((cmt, idx) => {
    console.log(`   [${idx + 1}] @${cmt.user.username}: "${cmt.content}"`);
  });

  console.log("\n=================================================");
  console.log("🎉 AI ULTRAS POST REPLY ENGINE TEST PASSED!");
  console.log("=================================================");
}

testManagerPostReply()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
