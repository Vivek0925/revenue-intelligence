import { Router } from "express";
import crypto from "crypto";

import prisma from "../lib/prisma";

import {
  decideRecoveryAction,
  type RecoveryDecision,
} from "../services/decision.service";

import { RecoveryActionType } from "../generated/prisma/client";

const router = Router();

/*
|--------------------------------------------------------------------------
| CONFIGURATION
|--------------------------------------------------------------------------
*/

const FAILURE_THRESHOLD = 10;

/*
|--------------------------------------------------------------------------
| FAILURE CLASSIFICATION
|--------------------------------------------------------------------------
*/

function classifyFailureReason(reason: string): string {
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
| SEVERITY
|--------------------------------------------------------------------------
*/

function determineSeverity(
  failureRate: number,
): "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" {
  if (failureRate >= 40) {
    return "CRITICAL";
  }

  if (failureRate >= 25) {
    return "HIGH";
  }

  return "MEDIUM";
}

/*
|--------------------------------------------------------------------------
| AI ACTION → DATABASE ACTION
|--------------------------------------------------------------------------
*/

const recoveryActionTypeMap: Partial<
  Record<RecoveryDecision["action"], RecoveryActionType>
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
| WEBHOOK SIGNATURE VERIFICATION
|--------------------------------------------------------------------------
*/

function verifyWebhookSignature(
  rawBody: Buffer,
  signature: string,
  secret: string,
): boolean {
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");

  const expected = Buffer.from(
    expectedSignature,
    "utf8",
  );

  const received = Buffer.from(
    signature,
    "utf8",
  );

  if (expected.length !== received.length) {
    return false;
  }

  return crypto.timingSafeEqual(
    expected,
    received,
  );
}

/*
|--------------------------------------------------------------------------
| RAZORPAY WEBHOOK
|--------------------------------------------------------------------------
*/

router.post("/razorpay", async (req, res) => {
  try {
    /*
    |--------------------------------------------------------------------------
    | 1. WEBHOOK SECRET
    |--------------------------------------------------------------------------
    */

    const webhookSecret =
      process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!webhookSecret) {
      return res.status(500).json({
        success: false,
        message:
          "RAZORPAY_WEBHOOK_SECRET is not configured",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | 2. SIGNATURE
    |--------------------------------------------------------------------------
    */

    const signature =
      req.headers["x-razorpay-signature"] as
        | string
        | undefined;

    if (!signature) {
      return res.status(400).json({
        success: false,
        message:
          "Missing Razorpay webhook signature",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | 3. RAW BODY
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
    | 4. VERIFY SIGNATURE
    |--------------------------------------------------------------------------
    */

    const signatureValid =
      verifyWebhookSignature(
        rawBody,
        signature,
        webhookSecret,
      );

    if (!signatureValid) {
      console.warn(
        "⚠️ Invalid Razorpay webhook signature",
      );

      return res.status(400).json({
        success: false,
        message:
          "Invalid webhook signature",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | 5. PARSE EVENT
    |--------------------------------------------------------------------------
    */

    const event = JSON.parse(
      rawBody.toString("utf8"),
    );

    console.log(
      `📩 Razorpay webhook received: ${event.event}`,
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

      if (!payment) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid payment.captured payload",
        });
      }

      /*
      |--------------------------------------------------------------------------
      | CHECK RECOVERY PAYMENT FIRST
      |--------------------------------------------------------------------------
      |
      | A recovery payment uses a NEW Razorpay order.
      | The order ID is stored in RecoveryAction.razorpayReference.
      |
      */

      const capturedRecoveryAction =
        await prisma.recoveryAction.findFirst({
          where: {
            razorpayReference:
              payment.order_id,
          },

          include: {
            payment: true,
            incident: true,
          },
        });

      /*
      |--------------------------------------------------------------------------
      | RECOVERY PAYMENT SUCCESS
      |--------------------------------------------------------------------------
      */

      if (capturedRecoveryAction) {
        console.log(
          `🔄 Recovery payment captured: ${payment.id}`,
        );

        /*
        |--------------------------------------------------------------------------
        | DUPLICATE WEBHOOK
        |--------------------------------------------------------------------------
        */

        if (
          capturedRecoveryAction.status ===
          "SUCCESS"
        ) {
          console.log(
            `ℹ️ Recovery already processed: ${capturedRecoveryAction.id}`,
          );

          return res.status(200).json({
            success: true,
            received: true,
            recovery: true,
            duplicate: true,
          });
        }

        /*
        |--------------------------------------------------------------------------
        | MARK RECOVERY SUCCESS
        |--------------------------------------------------------------------------
        */

        const successfulRecovery =
          await prisma.recoveryAction.update({
            where: {
              id:
                capturedRecoveryAction.id,
            },

            data: {
              status: "SUCCESS",

              actualRecovery:
                Number(payment.amount),

              retryCount: {
                increment: 1,
              },
            },
          });

        /*
        |--------------------------------------------------------------------------
        | RESOLVE INCIDENT
        |--------------------------------------------------------------------------
        */

        await prisma.incident.update({
          where: {
            id:
              capturedRecoveryAction.incidentId,
          },

          data: {
            status: "RESOLVED",
          },
        });

        /*
        |--------------------------------------------------------------------------
        | UPDATE ASSOCIATED PAYMENT IF IT EXISTS
        |--------------------------------------------------------------------------
        */

        if (
          capturedRecoveryAction.payment
        ) {
          await prisma.payment.update({
            where: {
              id:
                capturedRecoveryAction
                  .payment!.id,
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
        }

        /*
        |--------------------------------------------------------------------------
        | AUDIT
        |--------------------------------------------------------------------------
        */

        await prisma.auditLog.create({
          data: {
            eventType:
              "RECOVERY_SUCCESS",

            message:
              `Recovery payment ${payment.id} captured successfully. ₹${(
                Number(payment.amount) /
                100
              ).toFixed(2)} recovered.`,

            actor: "RAZORPAY",

            merchantId:
              capturedRecoveryAction
                .incident
                .merchantId,

            incidentId:
              capturedRecoveryAction
                .incidentId,

            metadata: {
              recoveryActionId:
                capturedRecoveryAction.id,

              originalPaymentId:
                capturedRecoveryAction
                  .paymentId,

              razorpayPaymentId:
                payment.id,

              razorpayOrderId:
                payment.order_id,

              recoveredAmount:
                Number(payment.amount),
            },
          },
        });

        console.log(
          `💰 RECOVERY SUCCESS: ₹${(
            Number(payment.amount) /
            100
          ).toFixed(2)}`,
        );

        console.log(
          `✅ Incident resolved: ${capturedRecoveryAction.incidentId}`,
        );

        return res.status(200).json({
          success: true,
          received: true,
          recovery: true,

          recoveredAmount:
            Number(payment.amount),

          recoveryAction:
            successfulRecovery,

          incidentStatus:
            "RESOLVED",
        });
      }

      /*
      |--------------------------------------------------------------------------
      | NORMAL PAYMENT CAPTURE
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
          payment.order_id,
        );

        return res.status(200).json({
          success: true,
          received: true,
        });
      }

      /*
      |--------------------------------------------------------------------------
      | DUPLICATE CAPTURE PROTECTION
      |--------------------------------------------------------------------------
      */

      if (
        existingPayment.status ===
          "CAPTURED" &&
        existingPayment.razorpayPaymentId ===
          payment.id
      ) {
        return res.status(200).json({
          success: true,
          received: true,
          duplicate: true,
        });
      }

      /*
      |--------------------------------------------------------------------------
      | UPDATE NORMAL PAYMENT
      |--------------------------------------------------------------------------
      */

      const capturedPayment =
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
      | AUDIT
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
              Number(payment.amount),

            method:
              payment.method ?? null,
          },
        },
      });

      console.log(
        `✅ Payment captured: ${payment.id}`,
      );

      return res.status(200).json({
        success: true,
        received: true,
        payment: capturedPayment,
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
      | CHECK RECOVERY PAYMENT FAILURE FIRST
      |--------------------------------------------------------------------------
      |
      | IMPORTANT:
      | Use a DIFFERENT variable name here.
      |
      */

      const failedRecoveryAction =
        await prisma.recoveryAction.findFirst({
          where: {
            razorpayReference:
              payment.order_id,
          },

          include: {
            payment: true,
            incident: true,
          },
        });

      /*
      |--------------------------------------------------------------------------
      | RECOVERY PAYMENT FAILED
      |--------------------------------------------------------------------------
      */

      if (failedRecoveryAction) {
        console.log(
          `❌ Recovery payment failed: ${payment.id}`,
        );

        /*
        |--------------------------------------------------------------------------
        | DUPLICATE PROTECTION
        |--------------------------------------------------------------------------
        */

        if (
          failedRecoveryAction.status ===
            "FAILED" &&
          failedRecoveryAction.retryCount >
            0
        ) {
          console.log(
            `ℹ️ Duplicate recovery failure ignored: ${payment.id}`,
          );

          return res.status(200).json({
            success: true,
            received: true,
            recovery: true,
            duplicate: true,
          });
        }

        /*
        |--------------------------------------------------------------------------
        | FAILURE REASON
        |--------------------------------------------------------------------------
        */

        const recoveryFailureReason =
          payment.error_description ??
          payment.error_reason ??
          "Recovery payment failed";

        /*
        |--------------------------------------------------------------------------
        | MARK RECOVERY FAILED
        |--------------------------------------------------------------------------
        */

        const failedRecovery =
          await prisma.recoveryAction.update({
            where: {
              id:
                failedRecoveryAction.id,
            },

            data: {
              status: "FAILED",

              actualRecovery: 0,

              retryCount: {
                increment: 1,
              },
            },
          });

        /*
        |--------------------------------------------------------------------------
        | UPDATE RECOVERY PAYMENT
        |--------------------------------------------------------------------------
        */

        if (
          failedRecoveryAction.payment
        ) {
          await prisma.payment.update({
            where: {
              id:
                failedRecoveryAction
                  .payment!.id,
            },

            data: {
              razorpayPaymentId:
                payment.id,

              status: "FAILED",

              method:
                payment.method ?? null,

              failureReason:
                recoveryFailureReason,
            },
          });
        }

        /*
        |--------------------------------------------------------------------------
        | AUDIT
        |--------------------------------------------------------------------------
        */

        await prisma.auditLog.create({
          data: {
            eventType:
              "RECOVERY_FAILED",

            message:
              `Recovery payment ${payment.id} failed: ${recoveryFailureReason}`,

            actor: "RAZORPAY",

            merchantId:
              failedRecoveryAction
                .incident
                .merchantId,

            incidentId:
              failedRecoveryAction
                .incidentId,

            metadata: {
              recoveryActionId:
                failedRecoveryAction.id,

              originalPaymentId:
                failedRecoveryAction
                  .paymentId,

              razorpayPaymentId:
                payment.id,

              razorpayOrderId:
                payment.order_id,

              amount:
                Number(payment.amount),

              failureReason:
                recoveryFailureReason,

              retryCount:
                failedRecovery.retryCount,

              maxRetries:
                failedRecovery.maxRetries,
            },
          },
        });

        console.log(
          `🔁 Recovery attempt ${failedRecovery.retryCount}/${failedRecovery.maxRetries}`,
        );

        /*
        |--------------------------------------------------------------------------
        | ESCALATE AFTER MAX RETRIES
        |--------------------------------------------------------------------------
        */

        if (
          failedRecovery.retryCount >=
          failedRecovery.maxRetries
        ) {
          await prisma.recoveryAction.update({
            where: {
              id:
                failedRecovery.id,
            },

            data: {
              status: "ESCALATED",
            },
          });

          console.log(
            `🚨 Recovery escalated: ${failedRecovery.id}`,
          );

          return res.status(200).json({
            success: true,
            received: true,
            recovery: true,

            recoveryAction: {
              ...failedRecovery,
              status: "ESCALATED",
            },

            retryCount:
              failedRecovery.retryCount,

            maxRetries:
              failedRecovery.maxRetries,
          });
        }

        /*
        |--------------------------------------------------------------------------
        | RECOVERY CAN BE RETRIED
        |--------------------------------------------------------------------------
        */

        return res.status(200).json({
          success: true,
          received: true,
          recovery: true,

          recoveryAction:
            failedRecovery,

          retryCount:
            failedRecovery.retryCount,

          maxRetries:
            failedRecovery.maxRetries,
        });
      }

      /*
      |--------------------------------------------------------------------------
      | NORMAL PAYMENT FAILURE
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
          payment.order_id,
        );

        return res.status(200).json({
          success: true,
          received: true,
        });
      }

      /*
      |--------------------------------------------------------------------------
      | DUPLICATE FAILURE PROTECTION
      |--------------------------------------------------------------------------
      */

      if (
        existingPayment.status ===
          "FAILED" &&
        existingPayment.razorpayPaymentId ===
          payment.id
      ) {
        console.log(
          `ℹ️ Duplicate failure webhook ignored: ${payment.id}`,
        );

        return res.status(200).json({
          success: true,
          received: true,
          duplicate: true,
        });
      }

      /*
      |--------------------------------------------------------------------------
      | FAILURE REASON
      |--------------------------------------------------------------------------
      */

      const failureReason =
        payment.error_description ??
        payment.error_reason ??
        "Payment failed";

      const classifiedRootCause =
        classifyFailureReason(
          failureReason,
        );

      console.log(
        `❌ Payment failed: ${payment.id}`,
      );

      console.log(
        `Reason: ${failureReason}`,
      );

      console.log(
        `🧠 Classified root cause: ${classifiedRootCause}`,
      );

      /*
      |--------------------------------------------------------------------------
      | UPDATE PAYMENT
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
      | AUDIT PAYMENT FAILURE
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
              Number(payment.amount),

            failureReason,

            classifiedRootCause,
          },
        },
      });

      /*
      |--------------------------------------------------------------------------
      | MERCHANT-WIDE FAILURE ANALYSIS
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
      | REVENUE AT RISK
      |--------------------------------------------------------------------------
      |
      | Database stores money in paise.
      |
      */

      const revenueAtRisk =
        failedPayments.reduce(
          (total, item) =>
            total + Number(item.amount),
          0,
        );

      console.log(
        `📊 Merchant failure rate: ${failureRate.toFixed(2)}%`,
      );

      console.log(
        `💳 Current failed payment: ₹${(
          Number(failedPayment.amount) /
          100
        ).toFixed(2)}`,
      );

      console.log(
        `💰 Total revenue at risk: ₹${(
          revenueAtRisk / 100
        ).toFixed(2)}`,
      );

      /*
      |--------------------------------------------------------------------------
      | INCIDENT THRESHOLD
      |--------------------------------------------------------------------------
      */

      if (
        failureRate <
        FAILURE_THRESHOLD
      ) {
        console.log(
          "ℹ️ Failure threshold not reached",
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
              failureRate.toFixed(2),
            ),

            currentPaymentAmount:
              Number(
                failedPayment.amount,
              ),

            revenueAtRisk,

            rootCause:
              classifiedRootCause,
          },
        });
      }

      /*
      |--------------------------------------------------------------------------
      | DETERMINE SEVERITY
      |--------------------------------------------------------------------------
      */

      const severity =
        determineSeverity(
          failureRate,
        );

      /*
      |--------------------------------------------------------------------------
      | FIND ACTIVE INCIDENT
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
      | CREATE INCIDENT
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
                  2,
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
          `🚨 Incident created: ${incident.id}`,
        );
      } else {
        /*
        |--------------------------------------------------------------------------
        | UPDATE ACTIVE INCIDENT
        |--------------------------------------------------------------------------
        */

        incident =
          await prisma.incident.update({
            where: {
              id: incident.id,
            },

            data: {
              revenueAtRisk,

              confidence: 0.92,

              rootCause:
                classifiedRootCause,

              severity,

              description:
                `${failedPayments.length} payment failures detected with a ${failureRate.toFixed(
                  2,
                )}% failure rate.`,
            },
          });

        console.log(
          `🔄 Incident updated: ${incident.id}`,
        );
      }

      /*
      |--------------------------------------------------------------------------
      | AI DECISION ENGINE
      |--------------------------------------------------------------------------
      */

      const decision =
        decideRecoveryAction({
          type:
            incident.type,

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
        `🤖 AI decision: ${decision.action}`,
      );

      console.log(
        `Reason: ${decision.reason}`,
      );

      /*
      |--------------------------------------------------------------------------
      | MAP AI ACTION
      |--------------------------------------------------------------------------
      */

      const mappedAction =
        recoveryActionTypeMap[
          decision.action
        ];

      const requiresApproval =
        decision.boundaries
          .requiresHumanApproval;

      /*
      |--------------------------------------------------------------------------
      | FIND RECOVERY ACTION FOR THIS PAYMENT
      |--------------------------------------------------------------------------
      |
      | One failed payment should have one recovery action.
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
      | CREATE RECOVERY ACTION
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
                "PENDING",

              reason:
                decision.reason,

              expectedRecovery:
                requiresApproval
                  ? 0
                  : Number(
                      failedPayment.amount,
                    ),

              actualRecovery: 0,

              retryCount: 0,

              maxRetries:
                decision.boundaries
                  .maxRetries,

              incidentId:
                incident.id,

              paymentId:
                failedPayment.id,
            },
          });

        console.log(
          `🔄 Recovery action created: ${recoveryAction.id}`,
        );
      }

      /*
      |--------------------------------------------------------------------------
      | AUDIT INCIDENT DETECTION
      |--------------------------------------------------------------------------
      */

      await prisma.auditLog.create({
        data: {
          eventType: isNewIncident
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
              Number(
                failedPayment.amount,
              ),

            failureRate,

            failedPayments:
              failedPayments.length,

            revenueAtRisk,

            rootCause:
              classifiedRootCause,

            aiDecision: {
              action:
                decision.action,

              mappedDatabaseAction:
                mappedAction ??
                "NO_ACTION",

              reason:
                decision.reason,

              requiresHumanApproval:
                decision.boundaries
                  .requiresHumanApproval,

              maxRetries:
                decision.boundaries
                  .maxRetries,

              dailyActionLimit:
                decision.boundaries
                  .dailyActionLimit,
            },
          },
        },
      });

      /*
      |--------------------------------------------------------------------------
      | RESPONSE
      |--------------------------------------------------------------------------
      */

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
            failureRate.toFixed(2),
          ),

          currentPaymentAmount:
            Number(
              failedPayment.amount,
            ),

          revenueAtRisk,

          rootCause:
            classifiedRootCause,
        },
      });
    }

    /*
    |--------------------------------------------------------------------------
    | OTHER RAZORPAY EVENTS
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
      error,
    );

    return res.status(500).json({
      success: false,

      message:
        error instanceof Error
          ? error.message
          : "Webhook processing failed",
    });
  }
});

export default router;