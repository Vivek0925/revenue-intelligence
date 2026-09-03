import prisma from "../lib/prisma";

export async function aggregateRecovery(parentActionId: string) {
  // Get parent action with all child actions
  const parentAction = await prisma.recoveryAction.findUnique({
    where: {
      id: parentActionId,
    },
    include: {
      childActions: true,
    },
  });

  if (!parentAction) {
    throw new Error("Parent recovery action not found");
  }

  const childActions = parentAction.childActions;

  const totalChildActions = childActions.length;

  const successfulActions = childActions.filter(
    (action) => action.status === "SUCCESS",
  );

  const failedActions = childActions.filter(
    (action) =>
      action.status === "FAILED" ||
      action.status === "BLOCKED" ||
      action.status === "ESCALATED",
  );

  const pendingActions = childActions.filter(
    (action) =>
      action.status === "PENDING" ||
      action.status === "APPROVED" ||
      action.status === "EXECUTING",
  );

  // Calculate money recovered
  const totalActualRecovery = successfulActions.reduce(
    (total, action) => total + (action.actualRecovery ?? 0),
    0,
  );

  const totalExpectedRecovery = childActions.reduce(
    (total, action) => total + (action.expectedRecovery ?? 0),
    0,
  );

  const recoveryRate =
    totalExpectedRecovery > 0
      ? Number(
          ((totalActualRecovery / totalExpectedRecovery) * 100).toFixed(2),
        )
      : 0;

  // ==========================================
  // DETERMINE PARENT STATUS
  // ==========================================

  let parentStatus = parentAction.status;

  // Still processing children
  if (pendingActions.length > 0) {
    parentStatus = "EXECUTING";
  }

  // All children completed
  else if (successfulActions.length === totalChildActions) {
    parentStatus = "SUCCESS";
  }

  // Everything failed
  else if (failedActions.length === totalChildActions) {
    parentStatus = "FAILED";
  }

  // Mixed result
  else if (
    successfulActions.length > 0 &&
    failedActions.length > 0
  ) {
    parentStatus = "SUCCESS";
  }

  // No child actions
  else if (totalChildActions === 0) {
    parentStatus = "BLOCKED";
  }

  // ==========================================
  // UPDATE PARENT ACTION
  // ==========================================

  const updatedParentAction = await prisma.recoveryAction.update({
    where: {
      id: parentActionId,
    },
    data: {
      status: parentStatus,
      actualRecovery: totalActualRecovery,
    },
  });

  return {
    parentAction: {
      id: updatedParentAction.id,
      status: updatedParentAction.status,
      expectedRecovery: updatedParentAction.expectedRecovery,
      actualRecovery: updatedParentAction.actualRecovery,
    },

    summary: {
      totalChildActions,
      successfulActions: successfulActions.length,
      failedActions: failedActions.length,
      pendingActions: pendingActions.length,
      totalExpectedRecovery,
      totalActualRecovery,
      recoveryRate,
    },
  };
}