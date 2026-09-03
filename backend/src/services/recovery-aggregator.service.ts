import prisma from "../lib/prisma";

// ==========================================
// AGGREGATE CHILD RECOVERY RESULTS
// ==========================================

export async function aggregateRecovery(parentActionId: string) {
  // ==========================================
  // 1. FIND PARENT ACTION
  // ==========================================

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

  // ==========================================
  // 2. ENSURE THIS IS A PARENT ACTION
  // ==========================================

  if (parentAction.parentActionId) {
    throw new Error(
      "Cannot aggregate a child recovery action. Use the parent action ID.",
    );
  }

  const childActions = parentAction.childActions;

  if (childActions.length === 0) {
    throw new Error(
      "No child recovery actions found for this parent action",
    );
  }

  // ==========================================
  // 3. CALCULATE RECOVERY STATISTICS
  // ==========================================

  const successfulActions = childActions.filter(
    (action) => action.status === "SUCCESS",
  );

  const failedActions = childActions.filter(
    (action) => action.status === "FAILED",
  );

  const pendingActions = childActions.filter(
    (action) =>
      action.status === "PENDING" ||
      action.status === "APPROVED" ||
      action.status === "EXECUTING",
  );

  const totalExpectedRecovery = childActions.reduce(
    (total, action) => total + (action.expectedRecovery ?? 0),
    0,
  );

  const totalActualRecovery = successfulActions.reduce(
    (total, action) => total + (action.actualRecovery ?? 0),
    0,
  );

  const recoveryRate =
    totalExpectedRecovery > 0
      ? (totalActualRecovery / totalExpectedRecovery) * 100
      : 0;

  // ==========================================
  // 4. DETERMINE PARENT STATUS
  // ==========================================

  let parentStatus = parentAction.status;

  // All child actions are completed
  if (pendingActions.length === 0) {
    if (successfulActions.length === childActions.length) {
      parentStatus = "SUCCESS";
    } else if (successfulActions.length > 0) {
      parentStatus = "SUCCESS";
    } else {
      parentStatus = "FAILED";
    }
  } else {
    parentStatus = "EXECUTING";
  }

  // ==========================================
  // 5. UPDATE PARENT ACTION
  // ==========================================

  const updatedParentAction = await prisma.recoveryAction.update({
    where: {
      id: parentActionId,
    },
    data: {
      status: parentStatus,
      expectedRecovery: totalExpectedRecovery,
      actualRecovery: totalActualRecovery,
    },
  });

  // ==========================================
  // 6. RETURN AGGREGATED RESULT
  // ==========================================

  return {
    parentAction: updatedParentAction,

    summary: {
      totalChildActions: childActions.length,

      successfulActions: successfulActions.length,

      failedActions: failedActions.length,

      pendingActions: pendingActions.length,

      totalExpectedRecovery,

      totalActualRecovery,

      recoveryRate: Number(recoveryRate.toFixed(2)),
    },
  };
}