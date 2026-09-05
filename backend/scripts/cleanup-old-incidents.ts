import prisma from "../src/lib/prisma";

async function main() {
  const incidents = await prisma.incident.findMany({
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      title: true,
      createdAt: true,
    },
  });

  if (incidents.length <= 1) {
    console.log("Nothing to clean. Only one incident exists.");
    return;
  }

  const oldIncidents = incidents.slice(1);

  console.log(`Deleting ${oldIncidents.length} old incidents...`);

  for (const incident of oldIncidents) {
    // Delete audit logs belonging to this incident
    await prisma.auditLog.deleteMany({
      where: {
        incidentId: incident.id,
      },
    });

    // Delete recovery actions belonging to this incident.
    // Delete children first because of the self relation.
    await prisma.recoveryAction.deleteMany({
      where: {
        incidentId: incident.id,
        parentActionId: {
          not: null,
        },
      },
    });

    await prisma.recoveryAction.deleteMany({
      where: {
        incidentId: incident.id,
      },
    });

    await prisma.incident.delete({
      where: {
        id: incident.id,
      },
    });

    console.log(`Deleted incident: ${incident.id}`);
  }

  console.log("Cleanup complete.");
}

main()
  .catch((error) => {
    console.error("Cleanup failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });