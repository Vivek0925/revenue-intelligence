import { Router } from "express";

import { executeRecoveryAction } from "../services/recovery.service";
import prisma from "../lib/prisma";
import { createRazorpayOrder } from "../services/razorpay.service";

const router = Router();

// ==========================================
// EXECUTE RECOVERY ACTION
// ==========================================

router.post("/:actionId/create-order", async (req, res) => {
  try {
    const { actionId } = req.params;

    const action =
      await prisma.recoveryAction.findUnique({
        where: {
          id: actionId,
        },
        include: {
          payment: true,
          incident: true,
        },
      });

    if (!action) {
      return res.status(404).json({
        success: false,
        message: "Recovery action not found",
      });
    }

    if (!action.payment) {
      return res.status(400).json({
        success: false,
        message:
          "Recovery action is not linked to a payment",
      });
    }

    if (
      action.status === "SUCCESS" ||
      action.status === "EXECUTING"
    ) {
      return res.status(400).json({
        success: false,
        message:
          `Recovery action cannot be started. Current status: ${action.status}`,
      });
    }

    /*
     * Don't create multiple Razorpay orders
     * for the same recovery action.
     */
    if (action.razorpayReference) {
      return res.status(200).json({
        success: true,
        message:
          "Recovery order already exists",
        orderId:
          action.razorpayReference,
        keyId:
          process.env.RAZORPAY_KEY_ID,
      });
    }

    /*
     * Mark recovery as executing.
     */
    await prisma.recoveryAction.update({
      where: {
        id: action.id,
      },
      data: {
        status: "EXECUTING",
      },
    });

    /*
     * Create a NEW Razorpay order.
     */
    const order =
      await createRazorpayOrder({
        amount: action.payment.amount,
        currency:
          action.payment.currency,
        receipt:
          `recovery_${action.id}`.slice(
            0,
            40
          ),
        notes: {
          recoveryActionId:
            action.id,

          originalPaymentId:
            action.payment.id,

          incidentId:
            action.incidentId,
        },
      });

    /*
     * Store the new Razorpay order
     * against the recovery action.
     */
    const updatedAction =
      await prisma.recoveryAction.update({
        where: {
          id: action.id,
        },
        data: {
          razorpayReference:
            order.id,
        },
      });

    /*
     * Audit trail.
     */
    await prisma.auditLog.create({
      data: {
        eventType:
          "RECOVERY_ORDER_CREATED",

        message:
          `Recovery order ${order.id} created for failed payment ${action.payment.id}.`,

        actor: "SYSTEM",

        merchantId:
          action.incident
            ? action.incident.merchantId
            : action.payment.merchantId,

        incidentId:
          action.incidentId,

        metadata: {
          recoveryActionId:
            action.id,

          originalPaymentId:
            action.payment.id,

          originalAmount:
            action.payment.amount,

          razorpayOrderId:
            order.id,
        },
      },
    });

    return res.status(201).json({
      success: true,

      message:
        "Recovery Razorpay order created",

      order: {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
      },

      recoveryAction:
        updatedAction,

      keyId:
        process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.error(
      "Recovery order creation error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to create recovery order",
    });
  }
});

router.post("/:actionId/execute", async (req, res) => {
  try {
    const { actionId } = req.params;

    if (!actionId) {
      return res.status(400).json({
        success: false,
        message: "Recovery action ID is required",
      });
    }

    const result = await executeRecoveryAction(actionId);

    return res.status(200).json(result);
  } catch (error) {
    console.error("Recovery execution error:", error);

    return res.status(500).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to execute recovery action",
    });
  }
});

export default router;