import prisma from "../lib/prisma";

// ==========================================
// EXECUTE INDIVIDUAL CHILD RECOVERY ACTION
// ==========================================

export async function executeChildRecoveryAction(
  actionId: string,
) {
  // ==========================================
  // 1. FIND CHILD ACTION
  // ==========================================

  const action = await prisma.recoveryAction.findUnique({
    where: {
      id: actionId,
    },
    include: {
      payment: true,
      parentAction: true,
    },
  });

  if (!action) {
    throw new Error("Recovery action not found");
  }

  // ==========================================
  // 2. ENSURE THIS IS A CHILD ACTION
  // ==========================================

  if (!action.parentActionId) {
    throw new Error(
      "This is a parent recovery action. Execute child actions instead.",
    );
  }

  if (!action.paymentId || !action.payment) {
    throw new Error(
      "Child recovery action does not have an associated payment.",
    );
  }

  // ==========================================
  // 3. PREVENT RE-EXECUTION
  // ==========================================

  if (
    action.status === "SUCCESS" ||
    action.status === "FAILED" ||
    action.status === "BLOCKED" ||
    action.status === "ESCALATED"
  ) {
    throw new Error(
      `Recovery action cannot be executed. Current status: ${action.status}`,
    );
  }

  // ==========================================
  // 4. MARK AS EXECUTING
  // ==========================================

  await prisma.recoveryAction.update({
    where: {
      id: actionId,
    },
    data: {
      status: "EXECUTING",
    },
  });

  // ==========================================
  // 5. SIMULATE PAYMENT RECOVERY
  // ==========================================

  // Later, this is where Razorpay/Stripe retry logic
  // will actually execute.

  const recoverySuccessful = Math.random() > 0.3;

  // ==========================================
  // 6. HANDLE SUCCESS
  // ==========================================

  if (recoverySuccessful) {
    const updatedAction = await prisma.recoveryAction.update({
      where: {
        id: actionId,
      },
      data: {
        status: "SUCCESS",
        actualRecovery: action.expectedRecovery ?? 0,
        retryCount: {
          increment: 1,
        },
      },
    });

    return {
      success: true,
      message: "Individual payment recovery successful",
      action: updatedAction,
    };
  }

  // ==========================================
  // 7. HANDLE FAILURE
  // ==========================================

  const updatedAction = await prisma.recoveryAction.update({
    where: {
      id: actionId,
    },
    data: {
      status: "FAILED",
      actualRecovery: 0,
      retryCount: {
        increment: 1,
      },
    },
  });

  return {
    success: false,
    message: "Individual payment recovery failed",
    action: updatedAction,
  };
}