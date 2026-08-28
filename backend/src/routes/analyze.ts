import { Router } from "express";

import prisma from "../lib/prisma";

import { decideRecoveryAction } from "../services/decision.service";

import { RecoveryActionType } from "../generated/prisma/client";

const router = Router();

/**
 * Maps AI decision actions to valid Prisma RecoveryActionType values.
 */
const recoveryActionTypeMap = {
  RETRY_PAYMENT: RecoveryActionType.RETRY_PAYMENT,

  WAIT_AND_RETRY: RecoveryActionType.RETRY_PAYMENT,

  ESCALATE_TO_HUMAN: RecoveryActionType.REQUEST_APPROVAL,
} as const;

router.post("/", async (_req, res) => {
  try {
    // ==========================================
    // 1. FETCH FAILED PAYMENTS
    // ==========================================

    const failedPayments = await prisma.payment.findMany({
      where: {
        status: "FAILED",
      },
    });

    // ==========================================
    // 2. CALCULATE REVENUE AT RISK
    // ==========================================

    const revenueAtRisk = failedPayments.reduce(
      (total, payment) => total + payment.amount,
      0,
    );

    // ==========================================
    // 3. GET TOTAL PAYMENT COUNT
    // ==========================================

    const totalPayments = await prisma.payment.count();

    // ==========================================
    // 4. CALCULATE FAILURE RATE
    // ==========================================

    const failureRate =
      totalPayments > 0 ? (failedPayments.length / totalPayments) * 100 : 0;

    // ==========================================
    // 5. NO FAILURES
    // ==========================================

    if (failedPayments.length === 0) {
      return res.status(200).json({
        success: true,

        message: "No payment failures detected",

        analysis: {
          totalPayments,

          failedPayments: 0,

          failureRate: 0,

          revenueAtRisk: 0,

          dominantFailureReason: null,
        },
      });
    }

    const firstPayment = failedPayments[0];

    if (!firstPayment) {
      return res.status(404).json({
        success: false,

        message: "No failed payments found",
      });
    }

    const merchantId = firstPayment.merchantId;

    // ==========================================
    // 6. DETECT DOMINANT FAILURE REASON
    // ==========================================

    const failureReasons = failedPayments.reduce(
      (acc: Record<string, number>, payment) => {
        const reason = payment.failureReason || "UNKNOWN";

        acc[reason] = (acc[reason] || 0) + 1;

        return acc;
      },
      {},
    );

    const sortedFailureReasons = Object.entries(failureReasons).sort(
      ([, a], [, b]) => b - a,
    );

    const dominantFailureReason = sortedFailureReasons[0]?.[0] ?? "UNKNOWN";

    // ==========================================
    // 7. INCIDENT DETECTION THRESHOLD
    // ==========================================

    const FAILURE_THRESHOLD = 10;

    if (failureRate < FAILURE_THRESHOLD) {
      return res.status(200).json({
        success: true,

        message: "Payments analyzed successfully. No major incident detected.",

        analysis: {
          totalPayments,

          failedPayments: failedPayments.length,

          failureRate: Number(failureRate.toFixed(2)),

          revenueAtRisk,

          dominantFailureReason,
        },
      });
    }

    // ==========================================
    // 8. DETERMINE INCIDENT SEVERITY
    // ==========================================

    let severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" = "LOW";

    if (failureRate >= 40) {
      severity = "CRITICAL";
    } else if (failureRate >= 25) {
      severity = "HIGH";
    } else if (failureRate >= 10) {
      severity = "MEDIUM";
    }

    // ==========================================
    // 9. PREVENT DUPLICATE OPEN INCIDENTS
    // ==========================================

    const existingIncident = await prisma.incident.findFirst({
      where: {
        merchantId,

        type: "PAYMENT_FAILURE_SPIKE",

        status: {
          in: ["OPEN", "INVESTIGATING", "ACTION_REQUIRED"],
        },
      },
    });

    let incident = existingIncident;

    let decision = null;

    let recoveryAction = null;

    // ==========================================
    // 10. CREATE INCIDENT
    // ==========================================

    if (!incident) {
      incident = await prisma.incident.create({
        data: {
          title: "Payment Failure Spike Detected",

          description: `${failedPayments.length} payment failures detected with a ${failureRate.toFixed(
            2,
          )}% failure rate.`,

          type: "PAYMENT_FAILURE_SPIKE",

          severity,

          revenueAtRisk,

          confidence: 0.92,

          rootCause: dominantFailureReason,

          merchantId,
        },
      });

      // ==========================================
      // 11. AI DECISION ENGINE
      // ==========================================

      decision = decideRecoveryAction({
        type: incident.type,

        severity: incident.severity,

        confidence: incident.confidence ?? 0,

        revenueAtRisk: incident.revenueAtRisk ?? 0,

        rootCause: incident.rootCause ?? "UNKNOWN",
      });

      // ==========================================
      // 12. DETERMINE IF ACTION SHOULD BE CREATED
      // ==========================================

      const shouldAutomate = !decision.boundaries.requiresHumanApproval;

      // ==========================================
      // 13. MAP AI ACTION TO DATABASE ACTION
      // ==========================================

      const mappedAction =
        decision.action === "NO_ACTION"
          ? null
          : recoveryActionTypeMap[
              decision.action as keyof typeof recoveryActionTypeMap
            ];

      if (mappedAction) {
        recoveryAction = await prisma.recoveryAction.create({
          data: {
            type: mappedAction,
            status: "PENDING",
            reason: decision.reason,
            expectedRecovery: shouldAutomate ? revenueAtRisk : 0,
            incidentId: incident.id,
          },
        });
      }

      // ==========================================
      // 15. CREATE AUDIT LOG
      // ==========================================

      await prisma.auditLog.create({
        data: {
          eventType: "INCIDENT_DETECTED",

          message: `AI detected a payment failure spike and selected decision: ${decision.action}`,

          actor: "SYSTEM",

          merchantId,

          incidentId: incident.id,

          metadata: {
            failureRate,

            failedPayments: failedPayments.length,

            revenueAtRisk,

            dominantFailureReason,

            aiDecision: {
              action: decision.action,

              mappedDatabaseAction: mappedAction ?? "NO_ACTION",

              shouldAutomate,

              reason: decision.reason,

              requiresHumanApproval: decision.boundaries.requiresHumanApproval,
            },
          },
        },
      });
    }

    // ==========================================
    // 16. RETURN ANALYSIS RESULT
    // ==========================================

    return res.status(200).json({
      success: true,

      message: "🚨 Payment failure incident detected",

      incident,

      decision,

      recoveryAction,

      analysis: {
        totalPayments,

        failedPayments: failedPayments.length,

        failureRate: Number(failureRate.toFixed(2)),

        revenueAtRisk,

        dominantFailureReason,
      },
    });
  } catch (error) {
    console.error("Analysis error:", error);

    return res.status(500).json({
      success: false,

      message: "Failed to analyze payments",
    });
  }
});

export default router;
