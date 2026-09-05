import "dotenv/config";
import prisma from "../src/lib/prisma";

async function main() {
  console.log("Starting recovery amount normalization...");

  const actions = await prisma.recoveryAction.findMany({
    select: {
      id: true,
      expectedRecovery: true,
      actualRecovery: true,
      parentActionId: true,
      paymentId: true,
      razorpayReference: true,
    },
  });

  let updated = 0;

  for (const action of actions) {
    /*
     * Only fix the old orchestrated actions.
     *
     * The new Razorpay recovery actions are already stored
     * in paise, so don't touch direct actions that have
     * a paymentId and no parentActionId.
     */
    const isOldOrchestratedAction =
      action.parentActionId !== null;

    if (!isOldOrchestratedAction) {
      continue;
    }

    const expected =
      action.expectedRecovery !== null
        ? action.expectedRecovery * 100
        : null;

    const actual =
      action.actualRecovery !== null
        ? action.actualRecovery * 100
        : null;

    await prisma.recoveryAction.update({
      where: {
        id: action.id,
      },
      data: {
        expectedRecovery: expected,
        actualRecovery: actual,
      },
    });

    updated++;

    console.log(
      `Updated ${action.id}: ${action.expectedRecovery} → ${expected}`,
    );
  }

  console.log(`\nDone. Updated ${updated} recovery actions.`);
}

main()
  .catch((error) => {
    console.error("Migration failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });