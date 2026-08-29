import { Router } from "express";

import { executeRecoveryAction } from "../services/recovery.service";

const router = Router();

// ==========================================
// EXECUTE RECOVERY ACTION
// ==========================================

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