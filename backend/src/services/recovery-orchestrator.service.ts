import prisma from "../lib/prisma";

interface OrchestratorResult {
  totalPayments: number;
  childActionsCreated: number;
  childActions: string[];
}

export async function orchestrateRecovery(
  parentActionId: string,
): Promise<OrchestratorResult> {
  // ==========================================
  // 1. FIND THE PARENT RECOVERY ACTION
  // ==========================================

  const parentAction = await prisma.recoveryAction.findUnique({
    where: {
      id: parentActionId,
    },
    include: {
      incident: true,
    },
  });

  if (!parentAction) {
    throw new Error("Parent recovery action not found");
  }

  // ==========================================
  // 2. PREVENT DUPLICATE ORCHESTRATION
  // ==========================================

  const existingChildren = await prisma.recoveryAction.count({
    where: {
      parentActionId,
    },
  });

  if (existingChildren > 0) {
    const children = await prisma.recoveryAction.findMany({
      where: {
        parentActionId,
      },
    });

    return {
      totalPayments: children.length,
      childActionsCreated: 0,
      childActions: children.map((child) => child.id),
    };
  }

  // ==========================================
  // 3. FIND FAILED PAYMENTS
  // ==========================================

  const failedPayments = await prisma.payment.findMany({
    where: {
      merchantId: parentAction.incident.merchantId,
      status: "FAILED",
    },
  });

  if (failedPayments.length === 0) {
    throw new Error("No failed payments available for recovery");
  }

  // ==========================================
  // 4. CREATE CHILD RECOVERY ACTIONS
  // ==========================================

  const childActions = [];

  for (const payment of failedPayments) {
    const childAction = await prisma.recoveryAction.create({
      data: {
        type: parentAction.type,
        status: "PENDING",

        reason: `Individual recovery for failed payment ${payment.id}`,

        expectedRecovery: payment.amount,

        retryCount: 0,
        maxRetries: parentAction.maxRetries,

        incidentId: parentAction.incidentId,

        paymentId: payment.id,

        parentActionId: parentAction.id,
      },
    });

    childActions.push(childAction);
  }

  // ==========================================
  // 5. CREATE AUDIT LOG
  // ==========================================

  await prisma.auditLog.create({
    data: {
      eventType: "RECOVERY_ORCHESTRATED",
      message: `Created ${childActions.length} individual payment recovery actions.`,
      actor: "SYSTEM",

      merchantId: parentAction.incident.merchantId,

      incidentId: parentAction.incidentId,

      metadata: {
        parentActionId: parentAction.id,
        failedPayments: failedPayments.length,
        childActionsCreated: childActions.length,
      },
    },
  });

  // ==========================================
  // 6. RETURN RESULT
  // ==========================================

  return {
    totalPayments: failedPayments.length,

    childActionsCreated: childActions.length,

    childActions: childActions.map((action) => action.id),
  };
}