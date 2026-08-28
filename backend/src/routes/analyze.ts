import { Router } from "express";

import prisma from "../lib/prisma";
import { decideRecoveryAction } from "../services/decision.service";

const router = Router();

router.post("/", async (_req, res) => {
  try {
    // Get all failed payments
    const failedPayments = await prisma.payment.findMany({
      where: {
        status: "FAILED",
      },
    });

    // Calculate revenue at risk
    const revenueAtRisk = failedPayments.reduce(
      (total, payment) => total + payment.amount,
      0,
    );

    // Get total payments
    const totalPayments = await prisma.payment.count();

    // Calculate failure rate
    const failureRate =
      totalPayments > 0
        ? (failedPayments.length / totalPayments) * 100
        : 0;

    // No failed payments
    if (failedPayments.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No payment failures detected",

        analysis: {
          totalPayments,
          failedPayments: 0,
          failureRate: 0,
          revenueAtRisk: 0,
        },
      });
    }

    // Get merchant from first failed payment
    const firstPayment = failedPayments[0];

    if (!firstPayment) {
      return res.status(404).json({
        success: false,
        message: "No failed payments found",
      });
    }

    const merchantId = firstPayment.merchantId;

    // Detect dominant failure reason
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

    const dominantFailureReason =
      sortedFailureReasons[0]?.[0] ?? "UNKNOWN";

    // Incident detection threshold
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

    // Determine severity
    let severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" = "LOW";

    if (failureRate >= 40) {
      severity = "CRITICAL";
    } else if (failureRate >= 25) {
      severity = "HIGH";
    } else if (failureRate >= 10) {
      severity = "MEDIUM";
    }

    // Prevent duplicate open incidents
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

    // Create incident only if one doesn't already exist
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

      // Create audit log for detection
      await prisma.auditLog.create({
        data: {
          eventType: "INCIDENT_DETECTED",

          message: `AI detected a payment failure spike with ${failedPayments.length} failed payments.`,

          actor: "SYSTEM",

          merchantId,
          incidentId: incident.id,

          metadata: {
            failureRate,
            failedPayments: failedPayments.length,
            revenueAtRisk,
            dominantFailureReason,
          },
        },
      });
    }

    // 🧠 AI / Decision Engine
    const decision = decideRecoveryAction({
      type: incident.type,
      severity: incident.severity,
      confidence: incident.confidence ?? 0,
      revenueAtRisk: incident.revenueAtRisk ?? 0,
      rootCause: incident.rootCause ?? "UNKNOWN",
    });

    // Return the complete Detect → Decide result
    return res.status(200).json({
      success: true,

      message: "🚨 Payment failure incident detected",

      incident,

      analysis: {
        totalPayments,
        failedPayments: failedPayments.length,
        failureRate: Number(failureRate.toFixed(2)),
        revenueAtRisk,
        dominantFailureReason,
      },

      decision,
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