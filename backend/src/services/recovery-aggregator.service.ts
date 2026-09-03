import prisma from "../lib/prisma";

// ==========================================
// AGGREGATE CHILD RECOVERY RESULTS
// ==========================================

export async function aggregateRecovery(parentActionId: string) {
  // 1. Find parent action
  const parentAction = await prisma.recoveryAction.findUnique({
    where: {
      id: parentActionId,
    },
  });

  if (!parentAction) {
    throw new Error("Parent recovery action not found");
  }

  // Ensure this is a parent action
  if (parentAction.parentActionId !== null) {
    throw new Error(
      "Cannot aggregate a child recovery action. Use the parent action ID.",
    );
  }

  // 2. Fetch children separately
  const childActions = await prisma.recoveryAction.findMany({
    where: {
      parentActionId: parentActionId,
    },
  });

  if (childActions.length === 0) {
    throw new Error(
      "No child recovery actions found for this parent action",
    );
  }

  // 3. Calculate counts
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

  // 4. Calculate money
  const totalExpectedRecovery = childActions.reduce(
    (total, action) => total + (action.expectedRecovery ?? 0),
    0,
  );

  const totalActualRecovery = childActions.reduce(
    (total, action) => total + (action.actualRecovery ?? 0),
    0,
  );

  const recoveryRate =
    totalExpectedRecovery > 0
      ? (totalActualRecovery / totalExpectedRecovery) * 100
      : 0;

  // 5. Determine parent status
  let parentStatus:
    | "PENDING"
    | "APPROVED"
    | "EXECUTING"
    | "SUCCESS"
    | "FAILED"
    | "BLOCKED"
    | "ESCALATED";

  if (pendingActions.length > 0) {
    parentStatus = "EXECUTING";
  } else if (successfulActions.length > 0) {
    parentStatus = "SUCCESS";
  } else {
    parentStatus = "FAILED";
  }

  // 6. Update parent
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

  // 7. Return summary
  return {
    parentAction: {
      id: updatedParentAction.id,
      status: updatedParentAction.status,
      expectedRecovery: updatedParentAction.expectedRecovery,
      actualRecovery: updatedParentAction.actualRecovery,
    },

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