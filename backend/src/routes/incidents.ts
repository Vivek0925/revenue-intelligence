import { Router } from "express";
import prisma from "../lib/prisma";

const router = Router();

function calculateRecoverySummary(
  actions: any[],
  revenueAtRisk: number,
) {
  const successfulActions = actions.filter(
    (action) => action.status === "SUCCESS",
  );

  const failedActions = actions.filter(
    (action) => action.status === "FAILED",
  );

  const pendingActions = actions.filter((action) =>
    ["PENDING", "APPROVED", "EXECUTING"].includes(action.status),
  );

  const totalExpectedRecovery = actions.reduce(
    (sum, action) => sum + (action.expectedRecovery ?? 0),
    0,
  );

  const totalActualRecovery = successfulActions.reduce(
    (sum, action) => sum + (action.actualRecovery ?? 0),
    0,
  );

  const recoveryRate =
  revenueAtRisk > 0
    ? Number(
        (
          (totalActualRecovery / revenueAtRisk) *
          100
        ).toFixed(2),
      )
    : 0;

  return {
    totalChildActions: actions.length,
    successfulActions: successfulActions.length,
    failedActions: failedActions.length,
    pendingActions: pendingActions.length,
    totalExpectedRecovery,
    totalActualRecovery,
    recoveryRate,
  };
}

/**
 * Build the complete list of recovery attempts.
 *
 * We support both:
 *
 * 1. Parent -> child recovery actions
 * 2. Direct recovery actions created by the webhook
 *
 * Important:
 * Direct actions must NOT be discarded just because
 * orchestrated child actions already exist.
 */
function getRecoveryActions(recoveryActions: any[]) {
  const orchestratedChildActions = recoveryActions.flatMap(
    (action) => action.childActions ?? [],
  );

  const directRecoveryActions = recoveryActions.filter(
    (action) =>
      action.parentActionId === null &&
      action.paymentId !== null,
  );

  return [
    ...orchestratedChildActions,
    ...directRecoveryActions,
  ];
}

/**
 * Get the main AI decision action.
 *
 * Prefer the actual parent action created by the
 * orchestration system.
 */
function getPrimaryAction(recoveryActions: any[]) {
  return (
    recoveryActions.find(
      (action) =>
        action.parentActionId === null &&
        action.paymentId === null,
    ) ?? null
  );
}

/**
 * Get current recovery status from all recovery attempts.
 */
function getRecoveryStatus(actions: any[]) {
  if (actions.length === 0) {
    return "NO_ACTION";
  }

  if (actions.some((action) => action.status === "EXECUTING")) {
    return "EXECUTING";
  }

  if (actions.some((action) => action.status === "PENDING")) {
    return "PENDING";
  }

  if (actions.some((action) => action.status === "APPROVED")) {
    return "APPROVED";
  }

  if (actions.some((action) => action.status === "SUCCESS")) {
    return "SUCCESS";
  }

  if (actions.every((action) => action.status === "FAILED")) {
    return "FAILED";
  }

  return "NO_ACTION";
}

/* =========================================================
   GET /api/incidents
========================================================= */

router.get("/", async (_req, res) => {
  try {
    const incidents = await prisma.incident.findMany({
      orderBy: {
        createdAt: "desc",
      },
      include: {
        recoveryActions: {
          include: {
            childActions: {
              orderBy: {
                createdAt: "asc",
              },
            },
          },
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });

    const formattedIncidents = incidents.map((incident) => {
      const recoveryActions = getRecoveryActions(
        incident.recoveryActions,
      );

      const summary = calculateRecoverySummary(
        recoveryActions,
        incident.revenueAtRisk ?? 0,
      );

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

        recoveryStatus: getRecoveryStatus(
          recoveryActions,
        ),

        summary,
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

/* =========================================================
   GET /api/incidents/:id
========================================================= */

router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const incident = await prisma.incident.findUnique({
      where: {
        id,
      },
      include: {
        recoveryActions: {
          include: {
            childActions: {
              orderBy: {
                createdAt: "asc",
              },
            },
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

    /*
     * ALL recovery attempts.
     *
     * This includes:
     *
     * - 8 old child actions
     * - new direct ₹5,250 recovery action
     */
    const recoveryActions = getRecoveryActions(
      incident.recoveryActions,
    );

    const primaryAction = getPrimaryAction(
      incident.recoveryActions,
    );

    const summary = calculateRecoverySummary(
      recoveryActions,
      incident.revenueAtRisk ?? 0,
    );

    const recoveryStatus = getRecoveryStatus(
      recoveryActions,
    );

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

      /*
       * Parent AI decision.
       */
      parentAction: primaryAction,

      /*
       * Complete list of actual recovery attempts.
       */
      childActions: recoveryActions,

      /*
       * Raw database actions, useful for debugging
       * and future UI features.
       */
      recoveryActions: incident.recoveryActions,

      summary,

      recoveryStatus,

      decision: primaryAction
        ? {
            action: primaryAction.type,

            reason:
              primaryAction.reason ??
              "Recovery action selected by the decision engine.",

            boundaries: {
              maxRetries: primaryAction.maxRetries,
              requiresHumanApproval:
                primaryAction.type === "REQUEST_APPROVAL",
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