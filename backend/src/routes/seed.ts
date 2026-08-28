import { Router } from "express";
import prisma from "../lib/prisma";

const router = Router();

router.post("/", async (_req, res) => {
  try {
    // Remove old demo data
    await prisma.auditLog.deleteMany();
    await prisma.recoveryAction.deleteMany();
    await prisma.incident.deleteMany();
    await prisma.payment.deleteMany();
    await prisma.policy.deleteMany();
    await prisma.merchant.deleteMany();

    // Create demo merchant
    const merchant = await prisma.merchant.create({
      data: {
        name: "Demo Electronics Store",
        email: "demo@electronics.com",
      },
    });

    // Generate normal successful payments
    const payments = [];

    for (let i = 0; i < 40; i++) {
      payments.push({
        amount: Math.floor(Math.random() * 5000) + 500,
        currency: "INR",
        status: "CAPTURED" as const,
        method: Math.random() > 0.5 ? "UPI" : "CARD",
        customerEmail: `customer${i}@example.com`,
        merchantId: merchant.id,
      });
    }

    // Generate failed payments
    for (let i = 0; i < 8; i++) {
      payments.push({
        amount: Math.floor(Math.random() * 5000) + 500,
        currency: "INR",
        status: "FAILED" as const,
        method: "UPI",
        customerEmail: `failed${i}@example.com`,
        failureReason: "BANK_TIMEOUT",
        merchantId: merchant.id,
      });
    }

    await prisma.payment.createMany({
      data: payments,
    });

    return res.status(201).json({
      success: true,
      message: "Demo payment data generated successfully 🚀",
      merchant,
      paymentsCreated: payments.length,
      summary: {
        successfulPayments: 40,
        failedPayments: 8,
        failureScenario: "BANK_TIMEOUT",
      },
    });
  } catch (error) {
    console.error("Seed error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to generate demo data",
    });
  }
});

export default router;