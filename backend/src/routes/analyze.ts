import { Router } from "express";
import prisma from "../lib/prisma";

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
      0
    );

    // Get total payments
    const totalPayments = await prisma.payment.count();

    // Calculate failure rate
    const failureRate =
      totalPayments > 0
        ? (failedPayments.length / totalPayments) * 100
        : 0;

    // Get merchant from the first failed payment
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

    const firstPayment = failedPayments[0];

if (!firstPayment) {
  return res.status(404).json({
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
      {}
    );

    const sortedFailureReasons = Object.entries(failureReasons).sort(
  ([, a], [, b]) => b - a
);

const dominantFailureReason =
  sortedFailureReasons[0]?.[0] ?? "UNKNOWN";

    // Simple incident detection threshold
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
        },
      });
    }

    // Determine severity
    let severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" = "LOW";

    if (failureRate >= 40) severity = "CRITICAL";
    else if (failureRate >= 25) severity = "HIGH";
    else if (failureRate >= 10) severity = "MEDIUM";

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

    if (!incident) {
      incident = await prisma.incident.create({
        data: {
          title: "Payment Failure Spike Detected",
          description: `${failedPayments.length} payment failures detected with a ${failureRate.toFixed(
            2
          )}% failure rate.`,

          type: "PAYMENT_FAILURE_SPIKE",
          severity,
          revenueAtRisk,
          confidence: 0.92,
          rootCause: dominantFailureReason,

          merchantId,
        },
      });

      // Create recommended recovery action
      await prisma.recoveryAction.create({
        data: {
          type: "RETRY_PAYMENT",
          status: "PENDING",

          reason: `Detected dominant failure reason: ${dominantFailureReason}`,

          expectedRecovery: revenueAtRisk,

          incidentId: incident.id,
        },
      });

      // Create audit log
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