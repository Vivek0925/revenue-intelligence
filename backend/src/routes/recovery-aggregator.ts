import { Router } from "express";

import { aggregateRecovery } from "../services/recovery-aggregator.service";

const router = Router();

// ==========================================
// AGGREGATE RECOVERY RESULTS
// ==========================================

router.post("/:parentActionId", async (req, res) => {
  try {
    const { parentActionId } = req.params;

    const result = await aggregateRecovery(parentActionId);

    return res.status(200).json({
      success: true,
      message: "Recovery results aggregated successfully",
      ...result,
    });
  } catch (error) {
    console.error("Recovery aggregation error:", error);

    return res.status(500).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to aggregate recovery results",
    });
  }
});

export default router;