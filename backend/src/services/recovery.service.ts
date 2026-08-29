import prisma from "../lib/prisma";

export async function executeRecoveryAction(actionId: string) {
  // ==========================================
  // 1. FIND RECOVERY ACTION
  // ==========================================

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

  // ==========================================
  // 2. PREVENT EXECUTING COMPLETED ACTIONS
  // ==========================================

  if (
    action.status === "SUCCESS" ||
    action.status === "ESCALATED" ||
    action.status === "BLOCKED"
  ) {
    throw new Error(
      `Recovery action cannot be executed. Current status: ${action.status}`,
    );
  }

  // ==========================================
  // 3. CHECK HUMAN APPROVAL
  // ==========================================

  if (action.status === "PENDING") {
    await prisma.recoveryAction.update({
      where: {
        id: actionId,
      },
      data: {
        status: "EXECUTING",
      },
    });
  }

  // ==========================================
  // 4. CHECK RETRY LIMIT
  // ==========================================

  if (action.retryCount >= action.maxRetries) {
    const escalatedAction = await prisma.recoveryAction.update({
      where: {
        id: actionId,
      },
      data: {
        status: "ESCALATED",
      },
    });

    await prisma.auditLog.create({
      data: {
        eventType: "RECOVERY_ESCALATED",
        message: `Recovery action exceeded maximum retry limit of ${action.maxRetries}. Human intervention required.`,
        actor: "SYSTEM",
        merchantId: action.incident.merchantId,
        incidentId: action.incidentId,
        metadata: {
          actionId: action.id,
          retryCount: action.retryCount,
          maxRetries: action.maxRetries,
          reason: "MAX_RETRIES_EXCEEDED",
        },
      },
    });

    return {
      success: false,
      message: "Maximum retry limit reached. Escalated to human.",
      action: escalatedAction,
    };
  }

  // ==========================================
  // 5. INCREMENT RETRY COUNT
  // ==========================================

  const updatedAction = await prisma.recoveryAction.update({
    where: {
      id: actionId,
    },
    data: {
      retryCount: {
        increment: 1,
      },
      status: "EXECUTING",
    },
  });

  // ==========================================
  // 6. SIMULATE PAYMENT RECOVERY
  // ==========================================

  const recoverySuccessful = Math.random() > 0.5;

  // ==========================================
  // 7. SUCCESS
  // ==========================================

  if (recoverySuccessful) {
    const successfulAction = await prisma.recoveryAction.update({
      where: {
        id: actionId,
      },
      data: {
        status: "SUCCESS",
        actualRecovery: updatedAction.expectedRecovery,
      },
    });

    await prisma.auditLog.create({
      data: {
        eventType: "RECOVERY_SUCCESS",
        message: `Recovery succeeded on attempt ${updatedAction.retryCount}.`,
        actor: "SYSTEM",
        merchantId: action.incident.merchantId,
        incidentId: action.incidentId,
        metadata: {
          actionId: action.id,
          attempt: updatedAction.retryCount,
          recoveredAmount: updatedAction.expectedRecovery,
        },
      },
    });

    return {
      success: true,
      message: `Recovery successful on attempt ${updatedAction.retryCount}`,
      action: successfulAction,
    };
  }

  // ==========================================
  // 8. RECOVERY FAILED
  // ==========================================

  const attemptsRemaining =
    updatedAction.maxRetries - updatedAction.retryCount;

  // Last retry failed → escalate
  if (attemptsRemaining <= 0) {
    const escalatedAction = await prisma.recoveryAction.update({
      where: {
        id: actionId,
      },
      data: {
        status: "ESCALATED",
      },
    });

    await prisma.auditLog.create({
      data: {
        eventType: "RECOVERY_ESCALATED",
        message: `Recovery failed after ${updatedAction.retryCount} attempts. Escalated to human.`,
        actor: "SYSTEM",
        merchantId: action.incident.merchantId,
        incidentId: action.incidentId,
        metadata: {
          actionId: action.id,
          retryCount: updatedAction.retryCount,
          maxRetries: updatedAction.maxRetries,
        },
      },
    });

    return {
      success: false,
      message: "Recovery failed. Maximum retries reached. Escalated to human.",
      action: escalatedAction,
    };
  }

  // Still retries remaining
  const failedAction = await prisma.recoveryAction.update({
    where: {
      id: actionId,
    },
    data: {
      status: "FAILED",
    },
  });

  await prisma.auditLog.create({
    data: {
      eventType: "RECOVERY_FAILED",
      message: `Recovery attempt ${updatedAction.retryCount} failed. ${attemptsRemaining} retries remaining.`,
      actor: "SYSTEM",
      merchantId: action.incident.merchantId,
      incidentId: action.incidentId,
      metadata: {
        actionId: action.id,
        attempt: updatedAction.retryCount,
        attemptsRemaining,
      },
    },
  });

  return {
    success: false,
    message: `Recovery failed. ${attemptsRemaining} retries remaining.`,
    action: failedAction,
  };
}