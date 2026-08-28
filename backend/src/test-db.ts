import prisma from "./lib/prisma";

async function test() {
  const merchantCount = await prisma.merchant.count();

  console.log("Merchants:", merchantCount);
}

test()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });