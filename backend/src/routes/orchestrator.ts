import { Router } from "express";

import { orchestrateRecovery } from "../services/recovery-orchestrator.service";

const router = Router();

// ==========================================
// ORCHESTRATE INDIVIDUAL PAYMENT RECOVERY
// ==========================================

router.post("/:parentActionId", async (req, res) => {
  try {
    const { parentActionId } = req.params;

    const result = await orchestrateRecovery(parentActionId);

    return res.status(200).json({
      success: true,
      message: "Individual payment recovery orchestrated successfully",
      ...result,
    });
  } catch (error) {
    console.error("Recovery orchestration error:", error);

    return res.status(500).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to orchestrate recovery",
    });
  }
});

export default router;