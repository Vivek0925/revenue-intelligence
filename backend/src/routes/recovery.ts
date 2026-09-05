import { Router } from "express";

import prisma from "../lib/prisma";

import { createRazorpayOrder } from "../services/razorpay.service";

import { executeRecoveryAction } from "../services/recovery.service";

const router = Router();

/*
|--------------------------------------------------------------------------
| CREATE RAZORPAY RECOVERY ORDER
|--------------------------------------------------------------------------
|
| A failed Razorpay payment cannot be retried by modifying the original
| payment. We create a NEW Razorpay order.
|
*/

router.post("/:actionId/create-order", async (req, res) => {
  try {
    const { actionId } = req.params;

    if (!actionId) {
      return res.status(400).json({
        success: false,
        message: "Recovery action ID is required",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | 1. FIND RECOVERY ACTION
    |--------------------------------------------------------------------------
    */

    const action = await prisma.recoveryAction.findUnique({
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

    /*
    |--------------------------------------------------------------------------
    | 2. PAYMENT REQUIRED
    |--------------------------------------------------------------------------
    */

    if (!action.payment) {
      return res.status(400).json({
        success: false,
        message: "Recovery action is not linked to a payment",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | 3. SUCCESSFUL ACTION CANNOT BE STARTED AGAIN
    |--------------------------------------------------------------------------
    */

    if (action.status === "SUCCESS") {
      return res.status(400).json({
        success: false,
        message: "Recovery action is already successful",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | 4. IF ALREADY EXECUTING, RETURN EXISTING ORDER
    |--------------------------------------------------------------------------
    |
    | Prevents duplicate Razorpay orders if the user clicks the button
    | multiple times.
    |
    */

    if (
      action.status === "EXECUTING" &&
      action.razorpayReference
    ) {
      return res.status(200).json({
        success: true,
        message: "Recovery order already exists",

        order: {
          id: action.razorpayReference,
          amount: action.payment.amount,
          currency: action.payment.currency,
        },

        recoveryAction: action,

        keyId: process.env.RAZORPAY_KEY_ID,
      });
    }

    /*
    |--------------------------------------------------------------------------
    | 5. CHECK RETRY LIMIT
    |--------------------------------------------------------------------------
    */

    if (action.retryCount >= action.maxRetries) {
      await prisma.recoveryAction.update({
        where: {
          id: action.id,
        },

        data: {
          status: "ESCALATED",
        },
      });

      return res.status(400).json({
        success: false,
        message: "Maximum recovery attempts reached",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | 6. CREATE NEW RAZORPAY ORDER
    |--------------------------------------------------------------------------
    |
    | If the previous recovery attempt failed, we intentionally create
    | a completely new Razorpay order.
    |
    */

    const order = await createRazorpayOrder({
      amount: action.payment.amount,
      currency: action.payment.currency,

      receipt: `recovery_${action.id}_${Date.now()}`.slice(
        0,
        40
      ),

      notes: {
        recoveryActionId: action.id,
        originalPaymentId: action.payment.id,
        incidentId: action.incidentId,

        retryAttempt: String(
          action.retryCount + 1
        ),
      },
    });

    /*
    |--------------------------------------------------------------------------
    | 7. STORE NEW RAZORPAY ORDER
    |--------------------------------------------------------------------------
    */

    const updatedAction =
      await prisma.recoveryAction.update({
        where: {
          id: action.id,
        },

        data: {
          status: "EXECUTING",

          razorpayReference: order.id,
        },
      });

    /*
    |--------------------------------------------------------------------------
    | 8. AUDIT LOG
    |--------------------------------------------------------------------------
    */

    await prisma.auditLog.create({
      data: {
        eventType: "RECOVERY_ORDER_CREATED",

        message:
          `Recovery order ${order.id} created for failed payment ${action.payment.id}.`,

        actor: "SYSTEM",

        merchantId: action.payment.merchantId,

        incidentId: action.incidentId,

        metadata: {
          recoveryActionId: action.id,

          originalPaymentId: action.payment.id,

          originalAmount: action.payment.amount,

          razorpayOrderId: order.id,

          retryAttempt:
            action.retryCount + 1,
        },
      },
    });

    console.log(
      `🔄 Recovery order created: ${order.id}`
    );

    console.log(
      `💳 Recovery amount: ₹${(
        Number(order.amount) / 100
      ).toFixed(2)}`
    );

    console.log(
      `🔁 Recovery attempt: ${
        action.retryCount + 1
      }/${action.maxRetries}`
    );

    /*
    |--------------------------------------------------------------------------
    | 9. RETURN CHECKOUT DATA
    |--------------------------------------------------------------------------
    */

    return res.status(201).json({
      success: true,

      message: "Recovery Razorpay order created",

      order: {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
      },

      recoveryAction: updatedAction,

      keyId: process.env.RAZORPAY_KEY_ID,
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

/*
|--------------------------------------------------------------------------
| LEGACY / INTERNAL RECOVERY EXECUTION
|--------------------------------------------------------------------------
|
| Kept for the existing orchestrator/child recovery architecture.
|
| The Razorpay frontend flow uses /create-order.
|
*/

router.post("/:actionId/execute", async (req, res) => {
  try {
    const { actionId } = req.params;

    if (!actionId) {
      return res.status(400).json({
        success: false,
        message: "Recovery action ID is required",
      });
    }

    const result =
      await executeRecoveryAction(actionId);

    return res.status(200).json(result);
  } catch (error) {
    console.error(
      "Recovery execution error:",
      error
    );

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