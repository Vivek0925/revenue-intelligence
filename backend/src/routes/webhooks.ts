import { Router } from "express";
import crypto from "crypto";

import prisma from "../lib/prisma";

import {
  decideRecoveryAction,
  type RecoveryDecision,
} from "../services/decision.service";

import { RecoveryActionType } from "../generated/prisma/client";

import { createRazorpayOrder } from "../services/razorpay.service";

const router = Router();

/*
|--------------------------------------------------------------------------
| Configuration
|--------------------------------------------------------------------------
*/

const FAILURE_THRESHOLD = 10;

/*
|--------------------------------------------------------------------------
| Failure classification
|--------------------------------------------------------------------------
*/

function classifyFailureReason(reason: string) {
  const normalized = reason.toLowerCase();

  if (
    normalized.includes("timeout") ||
    normalized.includes("timed out") ||
    normalized.includes("temporary issue")
  ) {
    return "BANK_TIMEOUT";
  }

  if (
    normalized.includes("insufficient") ||
    normalized.includes("balance")
  ) {
    return "INSUFFICIENT_FUNDS";
  }

  if (
    normalized.includes("declined") ||
    normalized.includes("decline")
  ) {
    return "PAYMENT_DECLINED";
  }

  if (
    normalized.includes("authentication") ||
    normalized.includes("otp")
  ) {
    return "AUTHENTICATION_FAILURE";
  }

  return "PAYMENT_FAILURE";
}

/*
|--------------------------------------------------------------------------
| Severity
|--------------------------------------------------------------------------
*/

function determineSeverity(
  failureRate: number
): "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" {
  if (failureRate >= 40) {
    return "CRITICAL";
  }

  if (failureRate >= 25) {
    return "HIGH";
  }

  if (failureRate >= 10) {
    return "MEDIUM";
  }

  return "LOW";
}

/*
|--------------------------------------------------------------------------
| AI → Database action
|--------------------------------------------------------------------------
*/

const recoveryActionTypeMap: Partial<
  Record<
    RecoveryDecision["action"],
    RecoveryActionType
  >
> = {
  RETRY_PAYMENT:
    RecoveryActionType.RETRY_PAYMENT,

  WAIT_AND_RETRY:
    RecoveryActionType.RETRY_PAYMENT,

  ESCALATE_TO_HUMAN:
    RecoveryActionType.REQUEST_APPROVAL,
};

/*
|--------------------------------------------------------------------------
| Webhook signature verification
|--------------------------------------------------------------------------
*/

function verifyWebhookSignature(
  rawBody: Buffer,
  signature: string,
  secret: string
) {
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");

  const expected = Buffer.from(
    expectedSignature,
    "utf8"
  );

  const received = Buffer.from(
    signature,
    "utf8"
  );

  if (expected.length !== received.length) {
    return false;
  }

  return crypto.timingSafeEqual(
    expected,
    received
  );
}

/*
|--------------------------------------------------------------------------
| RAZORPAY WEBHOOK
|--------------------------------------------------------------------------
*/

router.post(
  "/razorpay",
  async (req, res) => {
    try {
      /*
      |--------------------------------------------------------------------------
      | 1. VERIFY CONFIGURATION
      |--------------------------------------------------------------------------
      */

      const signature = req.headers[
        "x-razorpay-signature"
      ] as string | undefined;

      const webhookSecret =
        process.env.RAZORPAY_WEBHOOK_SECRET;

      if (!webhookSecret) {
        return res.status(500).json({
          success: false,
          message:
            "RAZORPAY_WEBHOOK_SECRET is not configured",
        });
      }

      if (!signature) {
        return res.status(400).json({
          success: false,
          message:
            "Missing Razorpay webhook signature",
        });
      }

      /*
      |--------------------------------------------------------------------------
      | 2. RAW BODY
      |--------------------------------------------------------------------------
      */

      const rawBody = req.body as Buffer;

      if (!Buffer.isBuffer(rawBody)) {
        return res.status(400).json({
          success: false,
          message:
            "Webhook body must be raw",
        });
      }

      /*
      |--------------------------------------------------------------------------
      | 3. VERIFY SIGNATURE
      |--------------------------------------------------------------------------
      */

      const valid =
        verifyWebhookSignature(
          rawBody,
          signature,
          webhookSecret
        );

      if (!valid) {
        console.warn(
          "⚠️ Invalid Razorpay webhook signature"
        );

        return res.status(400).json({
          success: false,
          message:
            "Invalid webhook signature",
        });
      }

      /*
      |--------------------------------------------------------------------------
      | 4. PARSE EVENT
      |--------------------------------------------------------------------------
      */

      const event = JSON.parse(
        rawBody.toString("utf8")
      );

      console.log(
        `📩 Razorpay webhook received: ${event.event}`
      );

      /*
      |--------------------------------------------------------------------------
      | PAYMENT CAPTURED
      |--------------------------------------------------------------------------
      */

      if (
        event.event ===
        "payment.captured"
      ) {
        const payment =
          event.payload?.payment?.entity;

          const recoveryAction =
  await prisma.recoveryAction.findFirst({
    where: {
      razorpayReference:
        payment.order_id,
    },
    include: {
      payment: true,
    },
  });

  if (recoveryAction) {
  const originalPayment =
    recoveryAction.payment;

  if (!originalPayment) {
    return res.status(200).json({
      success: true,
      received: true,
    });
  }

  /*
   * Recovery payment succeeded.
   */

  await prisma.recoveryAction.update({
    where: {
      id: recoveryAction.id,
    },
    data: {
      status: "SUCCESS",

      actualRecovery:
        payment.amount,

      razorpayReference:
        payment.order_id,

      retryCount: {
        increment: 1,
      },
    },
  });

  await prisma.auditLog.create({
    data: {
      eventType:
        "RECOVERY_SUCCESS",

      message:
        `Recovery payment ${payment.id} captured successfully. ₹${(
          payment.amount / 100
        ).toFixed(2)} recovered.`,

      actor: "RAZORPAY",

      merchantId:
        originalPayment.merchantId,

      incidentId:
        recoveryAction.incidentId,

      metadata: {
        recoveryActionId:
          recoveryAction.id,

        originalPaymentId:
          originalPayment.id,

        razorpayPaymentId:
          payment.id,

        razorpayOrderId:
          payment.order_id,

        recoveredAmount:
          payment.amount,
      },
    },
  });

  console.log(
    `💰 RECOVERY SUCCESS: ₹${(
      payment.amount / 100
    ).toFixed(2)}`
  );

  return res.status(200).json({
    success: true,
    received: true,
    recovery: true,
    recoveredAmount:
      payment.amount,
  });
}

        if (!payment) {
          return res.status(400).json({
            success: false,
            message:
              "Invalid payment.captured payload",
          });
        }

        const existingPayment =
          await prisma.payment.findFirst({
            where: {
              razorpayOrderId:
                payment.order_id,
            },
          });

        if (!existingPayment) {
          console.warn(
            "⚠️ Payment record not found:",
            payment.order_id
          );

          return res.status(200).json({
            success: true,
            received: true,
          });
        }

        /*
        |--------------------------------------------------------------------------
        | Update payment
        |--------------------------------------------------------------------------
        */

        const updatedPayment =
          await prisma.payment.update({
            where: {
              id: existingPayment.id,
            },

            data: {
              razorpayPaymentId:
                payment.id,

              status: "CAPTURED",

              method:
                payment.method ?? null,

              failureReason: null,
            },
          });

        /*
        |--------------------------------------------------------------------------
        | Audit
        |--------------------------------------------------------------------------
        */

        await prisma.auditLog.create({
          data: {
            eventType:
              "PAYMENT_CAPTURED",

            message:
              `Razorpay payment ${payment.id} was captured successfully.`,

            actor: "RAZORPAY",

            merchantId:
              existingPayment.merchantId,

            metadata: {
              razorpayPaymentId:
                payment.id,

              razorpayOrderId:
                payment.order_id,

              amount:
                payment.amount,

              method:
                payment.method ?? null,
            },
          },
        });

        console.log(
          `✅ Payment captured: ${payment.id}`
        );

        return res.status(200).json({
          success: true,
          received: true,
          payment: updatedPayment,
        });
      }

      /*
      |--------------------------------------------------------------------------
      | PAYMENT FAILED
      |--------------------------------------------------------------------------
      */

      if (
        event.event ===
        "payment.failed"
      ) {
        const payment =
          event.payload?.payment?.entity;

        if (!payment) {
          return res.status(400).json({
            success: false,
            message:
              "Invalid payment.failed payload",
          });
        }

        /*
        |--------------------------------------------------------------------------
        | 5. FIND PAYMENT
        |--------------------------------------------------------------------------
        */

        const existingPayment =
          await prisma.payment.findFirst({
            where: {
              razorpayOrderId:
                payment.order_id,
            },
          });

        if (!existingPayment) {
          console.warn(
            "⚠️ Payment record not found:",
            payment.order_id
          );

          return res.status(200).json({
            success: true,
            received: true,
          });
        }

        /*
        |--------------------------------------------------------------------------
        | 6. DUPLICATE PROTECTION
        |--------------------------------------------------------------------------
        */

        if (
          existingPayment.status ===
            "FAILED" &&
          existingPayment.razorpayPaymentId ===
            payment.id
        ) {
          console.log(
            `ℹ️ Duplicate failure webhook ignored: ${payment.id}`
          );

          return res.status(200).json({
            success: true,
            received: true,
            duplicate: true,
          });
        }

        /*
        |--------------------------------------------------------------------------
        | 7. FAILURE REASON
        |--------------------------------------------------------------------------
        */

        const failureReason =
          payment.error_description ??
          payment.error_reason ??
          "Payment failed";

        const classifiedRootCause =
          classifyFailureReason(
            failureReason
          );

        console.log(
          `❌ Payment failed: ${payment.id}`
        );

        console.log(
          `Reason: ${failureReason}`
        );

        console.log(
          `🧠 Classified root cause: ${classifiedRootCause}`
        );

        /*
        |--------------------------------------------------------------------------
        | 8. UPDATE PAYMENT
        |--------------------------------------------------------------------------
        */

        const failedPayment =
          await prisma.payment.update({
            where: {
              id: existingPayment.id,
            },

            data: {
              razorpayPaymentId:
                payment.id,

              status: "FAILED",

              method:
                payment.method ?? null,

              failureReason,
            },
          });

        /*
        |--------------------------------------------------------------------------
        | 9. AUDIT PAYMENT FAILURE
        |--------------------------------------------------------------------------
        */

        await prisma.auditLog.create({
          data: {
            eventType:
              "PAYMENT_FAILED",

            message:
              `Razorpay payment ${payment.id} failed: ${failureReason}`,

            actor: "RAZORPAY",

            merchantId:
              existingPayment.merchantId,

            metadata: {
              razorpayPaymentId:
                payment.id,

              razorpayOrderId:
                payment.order_id,

              amount:
                payment.amount,

              failureReason,

              classifiedRootCause,
            },
          },
        });

        /*
        |--------------------------------------------------------------------------
        | 10. MERCHANT ANALYSIS
        |--------------------------------------------------------------------------
        */

        const merchantId =
          existingPayment.merchantId;

        const failedPayments =
          await prisma.payment.findMany({
            where: {
              merchantId,
              status: "FAILED",
            },

            orderBy: {
              createdAt: "desc",
            },
          });

        const totalPayments =
          await prisma.payment.count({
            where: {
              merchantId,
            },
          });

        const failureRate =
          totalPayments > 0
            ? (failedPayments.length /
                totalPayments) *
              100
            : 0;

        /*
        |--------------------------------------------------------------------------
        | 11. REVENUE AT RISK
        |--------------------------------------------------------------------------
        |
        | This is merchant-wide risk.
        | The individual payment amount remains
        | available separately as failedPayment.amount.
        |
        */

        const revenueAtRisk =
          failedPayments.reduce(
            (total, item) =>
              total + item.amount,
            0
          );

        console.log(
          `📊 Merchant failure rate: ${failureRate.toFixed(
            2
          )}%`
        );

        console.log(
          `💳 Current failed payment: ₹${(
            failedPayment.amount / 100
          ).toFixed(2)}`
        );

        console.log(
          `💰 Total revenue at risk: ₹${(
            revenueAtRisk / 100
          ).toFixed(2)}`
        );

        /*
        |--------------------------------------------------------------------------
        | 12. INCIDENT THRESHOLD
        |--------------------------------------------------------------------------
        */

        if (
          failureRate <
          FAILURE_THRESHOLD
        ) {
          console.log(
            "ℹ️ Failure threshold not reached"
          );

          return res.status(200).json({
            success: true,
            received: true,

            paymentStatus:
              "FAILED",

            incidentCreated:
              false,

            analysis: {
              totalPayments,

              failedPayments:
                failedPayments.length,

              failureRate: Number(
                failureRate.toFixed(2)
              ),

              currentPaymentAmount:
                failedPayment.amount,

              revenueAtRisk,

              rootCause:
                classifiedRootCause,
            },
          });
        }

        /*
        |--------------------------------------------------------------------------
        | 13. SEVERITY
        |--------------------------------------------------------------------------
        */

        const severity =
          determineSeverity(
            failureRate
          );

        /*
        |--------------------------------------------------------------------------
        | 14. FIND ACTIVE INCIDENT
        |--------------------------------------------------------------------------
        */

        let incident =
          await prisma.incident.findFirst({
            where: {
              merchantId,

              type:
                "PAYMENT_FAILURE_SPIKE",

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

        /*
        |--------------------------------------------------------------------------
        | 15. CREATE OR UPDATE INCIDENT
        |--------------------------------------------------------------------------
        */

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

                type:
                  "PAYMENT_FAILURE_SPIKE",

                severity,

                revenueAtRisk,

                confidence: 0.92,

                rootCause:
                  classifiedRootCause,

                merchantId,
              },
            });

          isNewIncident = true;

          console.log(
            `🚨 Incident created: ${incident.id}`
          );
        } else {
          /*
          |----------------------------------------------------------------------
          | Update active incident with latest information
          |----------------------------------------------------------------------
          */

          incident =
            await prisma.incident.update({
              where: {
                id: incident.id,
              },

              data: {
                severity,

                revenueAtRisk,

                confidence: 0.92,

                rootCause:
                  classifiedRootCause,

                description:
                  `${failedPayments.length} payment failures detected with a ${failureRate.toFixed(
                    2
                  )}% failure rate.`,
              },
            });

          console.log(
            `🔄 Incident updated: ${incident.id}`
          );
        }

        /*
        |--------------------------------------------------------------------------
        | 16. AI DECISION
        |--------------------------------------------------------------------------
        */

        const decision =
          decideRecoveryAction({
            type: incident.type,

            severity:
              incident.severity,

            confidence:
              incident.confidence ?? 0,

            revenueAtRisk:
              incident.revenueAtRisk ?? 0,

            rootCause:
              incident.rootCause ??
              "UNKNOWN",
          });

        console.log(
          `🤖 AI decision: ${decision.action}`
        );

        console.log(
          `Reason: ${decision.reason}`
        );

        /*
        |--------------------------------------------------------------------------
        | 17. MAP ACTION
        |--------------------------------------------------------------------------
        */

        const mappedAction =
          recoveryActionTypeMap[
            decision.action
          ];

        const shouldAutomate =
          !decision.boundaries
            .requiresHumanApproval;

        /*
        |--------------------------------------------------------------------------
        | 18. FIND EXISTING ACTION
        |--------------------------------------------------------------------------
        |
        | Important:
        | We now search for an action belonging to
        | THIS failed payment, not merely the incident.
        |
        */

        let recoveryAction =
          await prisma.recoveryAction.findFirst({
            where: {
              incidentId:
                incident.id,

              paymentId:
                failedPayment.id,
            },

            orderBy: {
              createdAt: "desc",
            },
          });

        /*
        |--------------------------------------------------------------------------
        | 19. CREATE RECOVERY ACTION
        |--------------------------------------------------------------------------
        */

        if (
          !recoveryAction &&
          mappedAction
        ) {
          recoveryAction =
            await prisma.recoveryAction.create({
              data: {
                type:
                  mappedAction,

                status:
                  decision
                    .boundaries
                    .requiresHumanApproval
                    ? "PENDING"
                    : "PENDING",

                reason:
                  decision.reason,

                expectedRecovery:
                  shouldAutomate
                    ? failedPayment.amount
                    : 0,

                actualRecovery:
                  0,

                retryCount: 0,

                maxRetries:
                  decision
                    .boundaries
                    .maxRetries,

                incidentId:
                  incident.id,

                paymentId:
                  failedPayment.id,
              },
            });

          console.log(
            `🔄 Recovery action created: ${recoveryAction.id}`
          );
        }

        /*
        |--------------------------------------------------------------------------
        | 20. AUDIT INCIDENT
        |--------------------------------------------------------------------------
        */

        await prisma.auditLog.create({
          data: {
            eventType:
              isNewIncident
                ? "INCIDENT_DETECTED"
                : "INCIDENT_UPDATED",

            message:
              `Payment failure intelligence processed. AI decision: ${decision.action}`,

            actor: "SYSTEM",

            merchantId,

            incidentId:
              incident.id,

            metadata: {
              razorpayPaymentId:
                payment.id,

              currentPaymentAmount:
                failedPayment.amount,

              failureRate,

              failedPayments:
                failedPayments.length,

              revenueAtRisk,

              rootCause:
                classifiedRootCause,

              aiDecision: {
                action:
                  decision.action,

                reason:
                  decision.reason,

                mappedDatabaseAction:
                  mappedAction ??
                  "NO_ACTION",

                shouldAutomate,

                maxRetries:
                  decision
                    .boundaries
                    .maxRetries,

                requiresHumanApproval:
                  decision
                    .boundaries
                    .requiresHumanApproval,

                dailyActionLimit:
                  decision
                    .boundaries
                    .dailyActionLimit,
              },
            },
          },
        });

        /*
        |--------------------------------------------------------------------------
        | 21. RETURN
        |--------------------------------------------------------------------------
        */

        return res.status(200).json({
          success: true,

          received: true,

          paymentStatus:
            "FAILED",

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

            currentPaymentAmount:
              failedPayment.amount,

            revenueAtRisk,

            rootCause:
              classifiedRootCause,
          },
        });
      }

      /*
      |--------------------------------------------------------------------------
      | OTHER EVENTS
      |--------------------------------------------------------------------------
      */

      return res.status(200).json({
        success: true,

        received: true,

        message:
          `Event ${event.event} received`,
      });
    } catch (error) {
      console.error(
        "❌ Razorpay webhook error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Webhook processing failed",
      });
    }
  }
);

export default router;