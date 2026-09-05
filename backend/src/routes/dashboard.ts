import { Router } from "express";

import prisma from "../lib/prisma";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    // ============================================================
    // 1. GET LATEST INCIDENT
    // ============================================================

    const incident = await prisma.incident.findFirst({
      orderBy: {
        createdAt: "desc",
      },
      include: {
        recoveryActions: {
          include: {
            childActions: {
              orderBy: {
                createdAt: "desc",
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

    if (!incident) {
      return res.status(404).json({
        success: false,
        message: "No incidents found",
      });
    }

    // ============================================================
    // 2. FIND PARENT ACTION
    // ============================================================

    const parentAction =
      incident.recoveryActions.find(
        (action) => action.parentActionId === null,
      ) ?? null;

    // ============================================================
    // 3. GET CHILD ACTIONS
    // ============================================================

    const orchestratedChildActions =
      incident.recoveryActions.flatMap(
        (action) => action.childActions,
      );

    /*
     * There are two possible recovery architectures:
     *
     * A. Parent -> Child actions
     * B. Direct recovery actions created by the webhook
     *
     * If child actions exist, use them.
     * Otherwise use the direct recovery actions.
     */

    const directRecoveryActions =
      incident.recoveryActions.filter(
        (action) =>
          action.parentActionId === null &&
          action.paymentId !== null,
      );

    const childActions =
      orchestratedChildActions.length > 0
        ? orchestratedChildActions
        : directRecoveryActions;

    // ============================================================
    // 4. CALCULATE RECOVERY SUMMARY
    // ============================================================

    const successfulActions = childActions.filter(
      (action) => action.status === "SUCCESS",
    );

    const failedActions = childActions.filter(
      (action) => action.status === "FAILED",
    );

    const pendingActions = childActions.filter((action) =>
      [
        "PENDING",
        "APPROVED",
        "EXECUTING",
      ].includes(action.status),
    );

    const totalActualRecovery =
      successfulActions.reduce(
        (total, action) =>
          total + (action.actualRecovery ?? 0),
        0,
      );

    const totalExpectedRecovery =
      childActions.reduce(
        (total, action) =>
          total + (action.expectedRecovery ?? 0),
        0,
      );

    const recoveryRate =
      totalExpectedRecovery > 0
        ? Number(
            (
              (totalActualRecovery /
                totalExpectedRecovery) *
              100
            ).toFixed(2),
          )
        : 0;

    // ============================================================
    // 5. RETURN DASHBOARD DATA
    // ============================================================

    return res.status(200).json({
      success: true,

      incident,

      parentAction,

      childActions,

      summary: {
        totalChildActions: childActions.length,
        successfulActions:
          successfulActions.length,
        failedActions: failedActions.length,
        pendingActions: pendingActions.length,

        // These values remain in paise.
        // Frontend converts them to INR.
        totalExpectedRecovery,
        totalActualRecovery,

        recoveryRate,
      },
    });
  } catch (error) {
    console.error("Dashboard error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch dashboard data",
    });
  }
});

export default router;