import prisma from "../lib/prisma";

export async function executeRecoveryAction(actionId: string) {
  // Find the recovery action
  const action = await prisma.recoveryAction.findUnique({
    where: {
      id: actionId,
    },

    include: {
      incident: true,
    },
  });

  if (!action) {
    throw new Error("Recovery action not found");
  }

  // Only execute pending actions
  if (action.status !== "PENDING") {
    throw new Error(
      `Recovery action cannot be executed. Current status: ${action.status}`,
    );
  }

  // Mark action as executing
  await prisma.recoveryAction.update({
    where: {
      id: action.id,
    },

    data: {
      status: "EXECUTING",
    },
  });

  try {
    // ==========================================
    // SIMULATED PAYMENT RECOVERY
    // ==========================================

    console.log(
      `⚡ Attempting recovery for action ${action.id}`,
    );

    // Temporary simulation
    const recoverySuccessful = Math.random() > 0.35;

    if (!recoverySuccessful) {
      throw new Error("Payment gateway retry failed");
    }

    // ==========================================
    // RECOVERY SUCCESS
    // ==========================================

    const updatedAction = await prisma.recoveryAction.update({
      where: {
        id: action.id,
      },

      data: {
        status: "SUCCESS",

        actualRecovery: action.expectedRecovery,
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        eventType: "RECOVERY_SUCCEEDED",

        message:
          "Recovery action executed successfully.",

        actor: "SYSTEM",

        merchantId: action.incident.merchantId,

        incidentId: action.incidentId,

        metadata: {
          actionId: action.id,
          actionType: action.type,
          recoveredAmount: action.expectedRecovery,
        },
      },
    });

    return {
      success: true,

      message: "Recovery executed successfully",

      recoveryAction: updatedAction,
    };
  } catch (error) {
    // ==========================================
    // RECOVERY FAILURE
    // ==========================================

    const updatedAction = await prisma.recoveryAction.update({
      where: {
        id: action.id,
      },

      data: {
        status: "FAILED",
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        eventType: "RECOVERY_FAILED",

        message: "Recovery action failed gracefully.",

        actor: "SYSTEM",

        merchantId: action.incident.merchantId,

        incidentId: action.incidentId,

        metadata: {
          actionId: action.id,

          error:
            error instanceof Error
              ? error.message
              : "Unknown recovery error",

          fallback: "ESCALATE_TO_HUMAN",
        },
      },
    });

    return {
      success: false,

      message:
        "Recovery failed. Incident requires human review.",

      recoveryAction: updatedAction,
    };
  }
}