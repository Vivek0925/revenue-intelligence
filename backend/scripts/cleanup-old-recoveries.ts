import prisma from "../src/lib/prisma";

async function main() {
  const incidentId = "cmtmzuxep00000kdfoxdovzrh";

  const result = await prisma.recoveryAction.deleteMany({
    where: {
      incidentId,
      parentActionId: {
        not: null,
      },
    },
  });

  console.log(
    `Deleted ${result.count} old simulated recovery actions.`,
  );
}

main()
  .catch((error) => {
    console.error("Cleanup failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });