import { Router } from "express";
import prisma from "../lib/prisma";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    // Get latest incident
    const incident = await prisma.incident.findFirst({
      orderBy: {
        createdAt: "desc",
      },
      include: {
        recoveryActions: {
          include: {
            childActions: true,
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

    // Find parent recovery action
    const parentAction =
      incident.recoveryActions.find(
        (action) => action.parentActionId === null,
      ) ?? null;

    // Get child actions
    const childActions = parentAction?.childActions ?? [];

    // Calculate summary
    const successfulActions = childActions.filter(
      (action) => action.status === "SUCCESS",
    );

    const failedActions = childActions.filter(
      (action) => action.status === "FAILED",
    );

    const pendingActions = childActions.filter((action) =>
      ["PENDING", "APPROVED", "EXECUTING"].includes(action.status),
    );

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
            (
              (totalActualRecovery / totalExpectedRecovery) *
              100
            ).toFixed(2),
          )
        : 0;

    return res.status(200).json({
      success: true,

      incident,

      parentAction,

      childActions,

      summary: {
        totalChildActions: childActions.length,
        successfulActions: successfulActions.length,
        failedActions: failedActions.length,
        pendingActions: pendingActions.length,
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