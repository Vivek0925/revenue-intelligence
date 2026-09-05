import { Router } from "express";
import prisma from "../lib/prisma";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    const incidents = await prisma.incident.findMany({
      orderBy: {
        createdAt: "desc",
      },
      include: {
        recoveryActions: {
          include: {
            childActions: true,
          },
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });

    const formattedIncidents = incidents.map((incident) => {
      const parentAction =
        incident.recoveryActions.find(
          (action) => action.parentActionId === null,
        ) ?? null;

      const childActions = parentAction?.childActions ?? [];

      const successfulActions = childActions.filter(
        (action) => action.status === "SUCCESS",
      );

      const failedActions = childActions.filter(
        (action) => action.status === "FAILED",
      );

      const pendingActions = childActions.filter((action) =>
        ["PENDING", "APPROVED", "EXECUTING"].includes(action.status),
      );

      const totalExpectedRecovery = childActions.reduce(
        (sum, action) => sum + (action.expectedRecovery ?? 0),
        0,
      );

      const totalActualRecovery = childActions.reduce(
        (sum, action) => sum + (action.actualRecovery ?? 0),
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

      return {
        id: incident.id,
        title: incident.title,
        description: incident.description,
        severity: incident.severity,
        status: incident.status,
        revenueAtRisk: incident.revenueAtRisk,
        confidence: incident.confidence,
        rootCause: incident.rootCause,
        merchantId: incident.merchantId,
        createdAt: incident.createdAt,
        updatedAt: incident.updatedAt,

        recoveryStatus: parentAction?.status ?? "NO_ACTION",

        summary: {
          totalChildActions: childActions.length,
          successfulActions: successfulActions.length,
          failedActions: failedActions.length,
          pendingActions: pendingActions.length,
          totalExpectedRecovery,
          totalActualRecovery,
          recoveryRate,
        },
      };
    });

    return res.status(200).json({
      success: true,
      total: formattedIncidents.length,
      incidents: formattedIncidents,
    });
  } catch (error) {
    console.error("Incident history error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch incident history",
    });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const incident = await prisma.incident.findUnique({
      where: { id },
      include: {
        recoveryActions: {
          include: {
            childActions: true,
          },
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });

    if (!incident) {
      return res.status(404).json({
        success: false,
        message: "Incident not found",
      });
    }

    const parentAction =
      incident.recoveryActions.find(
        (action) => action.parentActionId === null
      ) ?? null;

    const childActions = parentAction?.childActions ?? [];

    const successfulActions = childActions.filter(
      (action) => action.status === "SUCCESS"
    );

    const failedActions = childActions.filter(
      (action) => action.status === "FAILED"
    );

    const pendingActions = childActions.filter((action) =>
      ["PENDING", "APPROVED", "EXECUTING"].includes(action.status)
    );

    const totalExpectedRecovery = childActions.reduce(
      (sum, action) => sum + (action.expectedRecovery ?? 0),
      0
    );

    const totalActualRecovery = childActions.reduce(
      (sum, action) => sum + (action.actualRecovery ?? 0),
      0
    );

    const recoveryRate =
      totalExpectedRecovery > 0
        ? Number(
            (
              (totalActualRecovery / totalExpectedRecovery) *
              100
            ).toFixed(2)
          )
        : 0;

    return res.status(200).json({
      success: true,

      incident: {
        id: incident.id,
        title: incident.title,
        description: incident.description,
        type: incident.type,
        severity: incident.severity,
        status: incident.status,
        revenueAtRisk: incident.revenueAtRisk,
        confidence: incident.confidence,
        rootCause: incident.rootCause,
        merchantId: incident.merchantId,
        createdAt: incident.createdAt,
        updatedAt: incident.updatedAt,
      },

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

      decision: parentAction
        ? {
            action: parentAction.type,
            reason:
              parentAction.reason ??
              "Recovery action selected by the decision engine.",
            boundaries: {
              maxRetries: parentAction.maxRetries,
              requiresHumanApproval:
                parentAction.type === "REQUEST_APPROVAL",
              dailyActionLimit: 100,
            },
          }
        : null,
    });
  } catch (error) {
    console.error("Incident detail error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch incident details",
    });
  }
});

export default router;