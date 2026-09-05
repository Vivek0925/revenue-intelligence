import { Router } from "express";
import crypto from "crypto";
import prisma from "../lib/prisma";
import {
  decideRecoveryAction,
  type RecoveryDecision,
} from "../services/decision.service";
import { RecoveryActionType } from "../generated/prisma/client";

const router = Router();

function verifyWebhookSignature(
  rawBody: Buffer,
  signature: string,
  secret: string
) {
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");

  const expected = Buffer.from(expectedSignature);
  const received = Buffer.from(signature);

  if (expected.length !== received.length) {
    return false;
  }

  return crypto.timingSafeEqual(expected, received);
}

const recoveryActionTypeMap: Partial<
  Record<
    RecoveryDecision["action"],
    RecoveryActionType
  >
> = {
  RETRY_PAYMENT: RecoveryActionType.RETRY_PAYMENT,
  WAIT_AND_RETRY: RecoveryActionType.RETRY_PAYMENT,
  ESCALATE_TO_HUMAN:
    RecoveryActionType.REQUEST_APPROVAL,
};

router.post("/razorpay", async (req, res) => {
  try {
    const signature = req.headers[
      "x-razorpay-signature"
    ] as string | undefined;

    const webhookSecret =
      process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!webhookSecret) {
      return res.status(500).json({
        success: false,
        message: "Webhook secret is not configured",
      });
    }

    if (!signature) {
      return res.status(400).json({
        success: false,
        message: "Missing Razorpay webhook signature",
      });
    }

    const rawBody = req.body as Buffer;

    if (!Buffer.isBuffer(rawBody)) {
      return res.status(400).json({
        success: false,
        message: "Webhook body must be raw",
      });
    }

    const valid = verifyWebhookSignature(
      rawBody,
      signature,
      webhookSecret
    );

    if (!valid) {
      return res.status(400).json({
        success: false,
        message: "Invalid webhook signature",
      });
    }

    const event = JSON.parse(
      rawBody.toString("utf8")
    );

    console.log(
      `📩 Razorpay webhook received: ${event.event}`
    );

    // ==========================================
    // PAYMENT CAPTURED
    // ==========================================

    if (event.event === "payment.captured") {
      const payment =
        event.payload?.payment?.entity;

      if (!payment) {
        return res.status(400).json({
          success: false,
          message: "Invalid payment.captured payload",
        });
      }

      const existingPayment =
        await prisma.payment.findFirst({
          where: {
            razorpayOrderId: payment.order_id,
          },
        });

      if (!existingPayment) {
        console.warn(
          "Payment record not found:",
          payment.order_id
        );

        return res.status(200).json({
          success: true,
          message:
            "Webhook received but payment not found",
        });
      }

      await prisma.payment.update({
        where: {
          id: existingPayment.id,
        },
        data: {
          razorpayPaymentId: payment.id,
          status: "CAPTURED",
          method: payment.method ?? null,
        },
      });

      console.log(
        `✅ Payment captured: ${payment.id}`
      );

      return res.status(200).json({
        success: true,
        received: true,
      });
    }

    // ==========================================
    // PAYMENT FAILED
    // ==========================================

    if (event.event === "payment.failed") {
      const payment =
        event.payload?.payment?.entity;

      if (!payment) {
        return res.status(400).json({
          success: false,
          message: "Invalid payment.failed payload",
        });
      }

      // ==========================================
      // 1. FIND PAYMENT
      // ==========================================

      const existingPayment =
        await prisma.payment.findFirst({
          where: {
            razorpayOrderId: payment.order_id,
          },
        });

      if (!existingPayment) {
        console.warn(
          "Payment record not found:",
          payment.order_id
        );

        return res.status(200).json({
          success: true,
          message:
            "Webhook received but payment not found",
        });
      }

      // ==========================================
      // 2. UPDATE PAYMENT
      // ==========================================

      await prisma.payment.update({
        where: {
          id: existingPayment.id,
        },
        data: {
          razorpayPaymentId: payment.id,
          status: "FAILED",
          method: payment.method ?? null,
          failureReason:
            payment.error_description ??
            payment.error_reason ??
            "Payment failed",
        },
      });

      console.log(
        `❌ Payment failed: ${payment.id}`
      );

      const failureReason =
        payment.error_description ??
        payment.error_reason ??
        "Payment failed";

      console.log(
        `Reason: ${failureReason}`
      );

      // ==========================================
      // 3. FETCH MERCHANT FAILED PAYMENTS
      // ==========================================

      const failedPayments =
        await prisma.payment.findMany({
          where: {
            merchantId:
              existingPayment.merchantId,
            status: "FAILED",
          },
          orderBy: {
            createdAt: "desc",
          },
        });

      const totalPayments =
        await prisma.payment.count({
          where: {
            merchantId:
              existingPayment.merchantId,
          },
        });

      // ==========================================
      // 4. CALCULATE FAILURE RATE
      // ==========================================

      const failureRate =
        totalPayments > 0
          ? (failedPayments.length /
              totalPayments) *
            100
          : 0;

      const revenueAtRisk =
        failedPayments.reduce(
          (total, payment) =>
            total + payment.amount,
          0
        );

      // ==========================================
      // 5. FIND DOMINANT FAILURE REASON
      // ==========================================

      const failureReasons =
        failedPayments.reduce(
          (
            acc: Record<string, number>,
            payment
          ) => {
            const reason =
              payment.failureReason ??
              "UNKNOWN";

            acc[reason] =
              (acc[reason] ?? 0) + 1;

            return acc;
          },
          {}
        );

      const dominantFailureReason =
        Object.entries(failureReasons).sort(
          ([, a], [, b]) => b - a
        )[0]?.[0] ?? "UNKNOWN";

      console.log(
        `📊 Merchant failure rate: ${failureRate.toFixed(
          2
        )}%`
      );

      console.log(
        `💰 Revenue at risk: ₹${(
          revenueAtRisk / 100
        ).toFixed(2)}`
      );

      // ==========================================
      // 6. INCIDENT THRESHOLD
      // ==========================================

      const FAILURE_THRESHOLD = 10;

      if (failureRate < FAILURE_THRESHOLD) {
        console.log(
          "ℹ️ Failure threshold not reached"
        );

        return res.status(200).json({
          success: true,
          received: true,
          paymentStatus: "FAILED",
          incidentCreated: false,
          analysis: {
            totalPayments,
            failedPayments:
              failedPayments.length,
            failureRate: Number(
              failureRate.toFixed(2)
            ),
            revenueAtRisk,
            dominantFailureReason,
          },
        });
      }

      // ==========================================
      // 7. DETERMINE SEVERITY
      // ==========================================

      let severity:
        | "LOW"
        | "MEDIUM"
        | "HIGH"
        | "CRITICAL" = "LOW";

      if (failureRate >= 40) {
        severity = "CRITICAL";
      } else if (failureRate >= 25) {
        severity = "HIGH";
      } else {
        severity = "MEDIUM";
      }

      // ==========================================
      // 8. FIND EXISTING INCIDENT
      // ==========================================

      let incident =
        await prisma.incident.findFirst({
          where: {
            merchantId:
              existingPayment.merchantId,
            type: "PAYMENT_FAILURE_SPIKE",
            status: {
              in: [
                "OPEN",
                "INVESTIGATING",
                "ACTION_REQUIRED",
              ],
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        });

      let isNewIncident = false;

      // ==========================================
      // 9. CREATE INCIDENT
      // ==========================================

      if (!incident) {
        incident =
          await prisma.incident.create({
            data: {
              title:
                "Payment Failure Spike Detected",

              description:
                `${failedPayments.length} payment failures detected with a ${failureRate.toFixed(
                  2
                )}% failure rate.`,

              type: "PAYMENT_FAILURE_SPIKE",

              severity,

              revenueAtRisk,

              confidence: 0.92,

              rootCause:
                dominantFailureReason,

              merchantId:
                existingPayment.merchantId,
            },
          });

        isNewIncident = true;

        console.log(
          `🚨 Incident created: ${incident.id}`
        );
      }

      // ==========================================
      // 10. AI DECISION
      // ==========================================

      const decision =
        decideRecoveryAction({
          type: incident.type,
          severity: incident.severity,
          confidence:
            incident.confidence ?? 0,
          revenueAtRisk:
            incident.revenueAtRisk ?? 0,
          rootCause:
            incident.rootCause ?? "UNKNOWN",
        });

      console.log(
        `🤖 AI decision: ${decision.action}`
      );

      console.log(
        `Reason: ${decision.reason}`
      );

      // ==========================================
      // 11. MAP AI ACTION
      // ==========================================

      const mappedAction =
        recoveryActionTypeMap[
          decision.action
        ];

      const shouldAutomate =
        !decision.boundaries
          .requiresHumanApproval;

      // ==========================================
      // 12. FIND EXISTING RECOVERY ACTION
      // ==========================================

      let recoveryAction =
        await prisma.recoveryAction.findFirst({
          where: {
            incidentId: incident.id,
          },
          orderBy: {
            createdAt: "desc",
          },
        });

      // ==========================================
      // 13. CREATE RECOVERY ACTION
      // ==========================================

      if (!recoveryAction && mappedAction) {
        recoveryAction =
          await prisma.recoveryAction.create({
            data: {
              type: mappedAction,

              status: "PENDING",

              reason: decision.reason,

              expectedRecovery:
                shouldAutomate
                  ? revenueAtRisk
                  : 0,

              maxRetries:
                decision.boundaries
                  .maxRetries,

              incidentId:
                incident.id,
            },
          });

        console.log(
          `🔄 Recovery action created: ${recoveryAction.id}`
        );
      }

      // ==========================================
      // 14. AUDIT LOG
      // ==========================================

      if (isNewIncident) {
        await prisma.auditLog.create({
          data: {
            eventType:
              "INCIDENT_DETECTED",

            message:
              `AI detected a payment failure spike and selected decision: ${decision.action}`,

            actor: "SYSTEM",

            merchantId:
              existingPayment.merchantId,

            incidentId: incident.id,

            metadata: {
              failureRate,
              failedPayments:
                failedPayments.length,
              revenueAtRisk,
              dominantFailureReason,

              aiDecision: {
                action:
                  decision.action,

                mappedDatabaseAction:
                  mappedAction ??
                  "NO_ACTION",

                shouldAutomate,

                reason:
                  decision.reason,

                maxRetries:
                  decision.boundaries
                    .maxRetries,

                requiresHumanApproval:
                  decision.boundaries
                    .requiresHumanApproval,

                dailyActionLimit:
                  decision.boundaries
                    .dailyActionLimit,
              },
            },
          },
        });
      }

      // ==========================================
      // 15. RETURN
      // ==========================================

      return res.status(200).json({
        success: true,

        received: true,

        paymentStatus: "FAILED",

        incidentCreated:
          isNewIncident,

        incident,

        decision,

        recoveryAction,

        analysis: {
          totalPayments,
          failedPayments:
            failedPayments.length,
          failureRate: Number(
            failureRate.toFixed(2)
          ),
          revenueAtRisk,
          dominantFailureReason,
        },
      });
    }

    // ==========================================
    // OTHER EVENTS
    // ==========================================

    return res.status(200).json({
      success: true,
      received: true,
      message: `Event ${event.event} received`,
    });
  } catch (error) {
    console.error(
      "Razorpay webhook error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Webhook processing failed",
    });
  }
});

export default router;