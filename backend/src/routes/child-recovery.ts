import { Router } from "express";

import { executeChildRecoveryAction } from "../services/child-recovery.service";

const router = Router();

// ==========================================
// EXECUTE CHILD RECOVERY ACTION
// ==========================================

router.post("/:actionId", async (req, res) => {
  try {
    const { actionId } = req.params;

    const result =
      await executeChildRecoveryAction(actionId);

    return res.status(200).json(result);
  } catch (error) {
    console.error("Child recovery execution error:", error);

    return res.status(500).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to execute child recovery",
    });
  }
});

export default router;