import { Router } from "express";
import prisma from "../lib/prisma";

const router = Router();

/*
|--------------------------------------------------------------------------
| CALCULATE RECOVERY SUMMARY
|--------------------------------------------------------------------------
*/

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
    ["PENDING", "APPROVED", "EXECUTING"].includes(
      action.status,
    ),
  );

  const totalExpectedRecovery = actions.reduce(
    (sum, action) =>
      sum + (action.expectedRecovery ?? 0),
    0,
  );

  const totalActualRecovery =
    successfulActions.reduce(
      (sum, action) =>
        sum + (action.actualRecovery ?? 0),
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

/*
|--------------------------------------------------------------------------
| GET ALL RECOVERY ATTEMPTS
|--------------------------------------------------------------------------
|
| Supports:
|
| 1. Parent -> child recovery actions
| 2. Direct recovery actions created by webhook
|
*/

function getRecoveryActions(
  recoveryActions: any[],
) {
  const orchestratedChildActions =
    recoveryActions.flatMap(
      (action) => action.childActions ?? [],
    );

  const directRecoveryActions =
    recoveryActions.filter(
      (action) =>
        action.parentActionId === null &&
        action.paymentId !== null,
    );

  return [
    ...orchestratedChildActions,
    ...directRecoveryActions,
  ];
}

/*
|--------------------------------------------------------------------------
| GET PRIMARY AI ACTION
|--------------------------------------------------------------------------
|
| Prefer the actual parent/orchestrator action.
|
| If there is no parent action, fall back to the
| direct recovery action created by the webhook.
|
*/

function getPrimaryAction(
  recoveryActions: any[],
) {
  const parentAction =
    recoveryActions.find(
      (action) =>
        action.parentActionId === null &&
        action.paymentId === null,
    ) ?? null;

  if (parentAction) {
    return parentAction;
  }

  const directAction =
    recoveryActions.find(
      (action) =>
        action.parentActionId === null &&
        action.paymentId !== null,
    ) ?? null;

  return directAction;
}

/*
|--------------------------------------------------------------------------
| GET CURRENT RECOVERY STATUS
|--------------------------------------------------------------------------
*/

function getRecoveryStatus(actions: any[]) {
  if (actions.length === 0) {
    return "NO_ACTION";
  }

  /*
   * Any currently executing action takes priority.
   */
  if (
    actions.some(
      (action) => action.status === "EXECUTING",
    )
  ) {
    return "EXECUTING";
  }

  /*
   * Any pending action means recovery is not finished.
   */
  if (
    actions.some(
      (action) => action.status === "PENDING",
    )
  ) {
    return "PENDING";
  }

  /*
   * Approval waiting state.
   */
  if (
    actions.some(
      (action) => action.status === "APPROVED",
    )
  ) {
    return "APPROVED";
  }

  /*
   * If every recovery attempt succeeded,
   * the overall recovery is successful.
   */
  if (
    actions.every(
      (action) => action.status === "SUCCESS",
    )
  ) {
    return "SUCCESS";
  }

  /*
   * If every attempt failed.
   */
  if (
    actions.every(
      (action) => action.status === "FAILED",
    )
  ) {
    return "FAILED";
  }

  /*
   * Mixed success/failure.
   *
   * We don't have a PARTIAL enum in Prisma,
   * so keep the recovery status as SUCCESS if
   * at least one action succeeded.
   */
  if (
    actions.some(
      (action) => action.status === "SUCCESS",
    )
  ) {
    return "SUCCESS";
  }

  return "NO_ACTION";
}

/*
|--------------------------------------------------------------------------
| RESOLVE INCIDENT WHEN ALL RECOVERY ACTIONS SUCCEED
|--------------------------------------------------------------------------
|
| This is important because older incidents may still have
| status OPEN in the database even though all recovery
| attempts have already succeeded.
|
*/

async function resolveIncidentIfComplete(
  incident: any,
  recoveryActions: any[],
) {
  if (recoveryActions.length === 0) {
    return incident;
  }

  const allActionsSuccessful =
    recoveryActions.every(
      (action) => action.status === "SUCCESS",
    );

  if (
    allActionsSuccessful &&
    incident.status !== "RESOLVED"
  ) {
    console.log(
      `✅ Resolving incident ${incident.id}`,
    );

    return await prisma.incident.update({
      where: {
        id: incident.id,
      },
      data: {
        status: "RESOLVED",
      },
    });
  }

  return incident;
}

/*
|--------------------------------------------------------------------------
| GET /api/incidents
|--------------------------------------------------------------------------
|
| Incident History
|
*/

router.get("/", async (_req, res) => {
  try {
    const incidents =
      await prisma.incident.findMany({
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

    const formattedIncidents = [];

    for (const incident of incidents) {
      /*
       * Build complete recovery list.
       */
      const recoveryActions =
        getRecoveryActions(
          incident.recoveryActions,
        );

      /*
       * Automatically resolve completed incidents.
       */
      const updatedIncident =
        await resolveIncidentIfComplete(
          incident,
          recoveryActions,
        );

      /*
       * Calculate recovery summary.
       */
      const summary =
        calculateRecoverySummary(
          recoveryActions,
          updatedIncident.revenueAtRisk ?? 0,
        );

      const recoveryStatus =
        getRecoveryStatus(
          recoveryActions,
        );

      formattedIncidents.push({
        id: updatedIncident.id,

        title: updatedIncident.title,

        description:
          updatedIncident.description,

        severity:
          updatedIncident.severity,

        status:
          updatedIncident.status,

        revenueAtRisk:
          updatedIncident.revenueAtRisk,

        confidence:
          updatedIncident.confidence,

        rootCause:
          updatedIncident.rootCause,

        merchantId:
          updatedIncident.merchantId,

        createdAt:
          updatedIncident.createdAt,

        updatedAt:
          updatedIncident.updatedAt,

        recoveryStatus,

        summary,
      });
    }

    return res.status(200).json({
      success: true,

      total: formattedIncidents.length,

      incidents: formattedIncidents,
    });
  } catch (error) {
    console.error(
      "Incident history error:",
      error,
    );

    return res.status(500).json({
      success: false,

      message:
        "Failed to fetch incident history",
    });
  }
});

/*
|--------------------------------------------------------------------------
| GET /api/incidents/:id
|--------------------------------------------------------------------------
|
| Incident Detail
|
*/

router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    /*
     * Find incident.
     */
    const incident =
      await prisma.incident.findUnique({
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

        message:
          "Incident not found",
      });
    }

    /*
     * Build complete recovery attempt list.
     */
    const recoveryActions =
      getRecoveryActions(
        incident.recoveryActions,
      );

    /*
     * Find primary AI decision.
     */
    const primaryAction =
      getPrimaryAction(
        incident.recoveryActions,
      );

    /*
     * Automatically resolve if every
     * recovery attempt succeeded.
     */
    const updatedIncident =
      await resolveIncidentIfComplete(
        incident,
        recoveryActions,
      );

    /*
     * Calculate summary.
     */
    const summary =
      calculateRecoverySummary(
        recoveryActions,
        updatedIncident.revenueAtRisk ?? 0,
      );

    /*
     * Current recovery status.
     */
    const recoveryStatus =
      getRecoveryStatus(
        recoveryActions,
      );

    /*
     * Build AI decision response.
     */
    const decision = primaryAction
      ? {
          action:
            primaryAction.type,

          reason:
            primaryAction.reason ??
            "Recovery action selected by the decision engine.",

          boundaries: {
            maxRetries:
              primaryAction.maxRetries,

            requiresHumanApproval:
              primaryAction.type ===
              "REQUEST_APPROVAL",

            dailyActionLimit: 100,
          },
        }
      : null;

    return res.status(200).json({
      success: true,

      /*
       * Incident information.
       */
      incident: {
        id: updatedIncident.id,

        title:
          updatedIncident.title,

        description:
          updatedIncident.description,

        type:
          updatedIncident.type,

        severity:
          updatedIncident.severity,

        status:
          updatedIncident.status,

        revenueAtRisk:
          updatedIncident.revenueAtRisk,

        confidence:
          updatedIncident.confidence,

        rootCause:
          updatedIncident.rootCause,

        merchantId:
          updatedIncident.merchantId,

        createdAt:
          updatedIncident.createdAt,

        updatedAt:
          updatedIncident.updatedAt,
      },

      /*
       * Main AI recovery decision.
       */
      parentAction:
        primaryAction,

      /*
       * All actual recovery attempts.
       */
      childActions:
        recoveryActions,

      /*
       * Raw database recovery actions.
       */
      recoveryActions:
        incident.recoveryActions,

      /*
       * Recovery statistics.
       */
      summary,

      /*
       * Overall recovery state.
       */
      recoveryStatus,

      /*
       * AI decision.
       */
      decision,
    });
  } catch (error) {
    console.error(
      "Incident detail error:",
      error,
    );

    return res.status(500).json({
      success: false,

      message:
        "Failed to fetch incident details",
    });
  }
});

export default router;