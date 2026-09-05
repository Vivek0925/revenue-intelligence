import { Router } from "express";
import prisma from "../lib/prisma";
import { createRazorpayOrder } from "../services/razorpay.service";
import crypto from "crypto";
import razorpay from "../services/razorpay.service";

const router = Router();

router.post("/verify", async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

    if (
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature
    ) {
      return res.status(400).json({
        success: false,
        message: "Missing Razorpay payment details",
      });
    }

    const secret = process.env.RAZORPAY_KEY_SECRET;

    if (!secret) {
      throw new Error("RAZORPAY_KEY_SECRET is not configured");
    }

    const generatedSignature = crypto
      .createHmac("sha256", secret)
      .update(
        `${razorpay_order_id}|${razorpay_payment_id}`
      )
      .digest("hex");

    if (generatedSignature !== razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: "Invalid Razorpay signature",
      });
    }

    const payment = await prisma.payment.findFirst({
      where: {
        razorpayOrderId: razorpay_order_id,
      },
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment record not found",
      });
    }

    const razorpayPayment =
      await razorpay.payments.fetch(
        razorpay_payment_id
      );

    const updatedPayment =
      await prisma.payment.update({
        where: {
          id: payment.id,
        },
        data: {
          razorpayPaymentId: razorpay_payment_id,
          method: razorpayPayment.method ?? null,
          status:
            razorpayPayment.status === "captured"
              ? "CAPTURED"
              : razorpayPayment.status === "authorized"
                ? "AUTHORIZED"
                : "CREATED",
        },
      });

    return res.status(200).json({
      success: true,
      message: "Payment verified successfully",
      payment: updatedPayment,
    });
  } catch (error) {
    console.error("Payment verification error:", error);

    return res.status(500).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Payment verification failed",
    });
  }
});

router.post("/create-order", async (req, res) => {
  try {
    const {
      amount,
      customerEmail,
      merchantId,
    } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Valid amount is required",
      });
    }

    if (!merchantId) {
      return res.status(400).json({
        success: false,
        message: "merchantId is required",
      });
    }

    const merchant = await prisma.merchant.findUnique({
      where: {
        id: merchantId,
      },
    });

    if (!merchant) {
      return res.status(404).json({
        success: false,
        message: "Merchant not found",
      });
    }

    const amountInPaise = Math.round(Number(amount) * 100);

    const order = await createRazorpayOrder({
      amount: amountInPaise,
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
      notes: {
        merchantId,
        customerEmail: customerEmail ?? "",
      },
    });

    const payment = await prisma.payment.create({
      data: {
        razorpayOrderId: order.id,
        amount: amountInPaise,
        currency: "INR",
        status: "CREATED",
        customerEmail: customerEmail ?? null,
        merchantId,
      },
    });

    return res.status(201).json({
      success: true,
      order: {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
      },
      payment,
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.error("Create Razorpay order error:", error);

    return res.status(500).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to create Razorpay order",
    });
  }
});

export default router;