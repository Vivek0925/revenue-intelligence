import prisma from "../src/lib/prisma";

async function cleanupAll() {
  console.log("🧹 Starting RevenueAI demo cleanup...\n");

  try {
    // 1. Remove parent-child links between recovery actions
    //    so all recovery actions can be deleted safely.
    await prisma.recoveryAction.updateMany({
      where: {
        parentActionId: {
          not: null,
        },
      },
      data: {
        parentActionId: null,
      },
    });

    // 2. Delete recovery actions
    const recoveryActions =
      await prisma.recoveryAction.deleteMany({});

    console.log(
      `🗑️ Recovery actions deleted: ${recoveryActions.count}`,
    );

    // 3. Delete audit logs
    const auditLogs =
      await prisma.auditLog.deleteMany({});

    console.log(
      `🗑️ Audit logs deleted: ${auditLogs.count}`,
    );

    // 4. Delete incidents
    const incidents =
      await prisma.incident.deleteMany({});

    console.log(
      `🗑️ Incidents deleted: ${incidents.count}`,
    );

    // 5. Delete payments
    const payments =
      await prisma.payment.deleteMany({});

    console.log(
      `🗑️ Payments deleted: ${payments.count}`,
    );

    console.log("\n✅ RevenueAI demo data completely cleared.");
    console.log("👤 Merchants were kept.");
    console.log("🚀 You can now start a fresh demo.\n");
  } catch (error) {
    console.error("\n❌ Cleanup failed:", error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

cleanupAll();