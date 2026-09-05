import { Router } from "express";
import prisma from "../lib/prisma";
import { createRazorpayOrder } from "../services/razorpay.service";

const router = Router();

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