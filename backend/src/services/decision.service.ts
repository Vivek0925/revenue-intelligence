import { RecoveryActionType } from "../generated/prisma/client";

interface IncidentInput {
  type: string;
  severity: string;
  confidence: number;
  revenueAtRisk: number;
  rootCause: string;
}

export interface RecoveryDecision {
  action: RecoveryActionType | null;
  reason: string;

  boundaries: {
    maxRetries: number;
    requiresHumanApproval: boolean;
    dailyActionLimit: number;
  };
}

export function decideRecoveryAction(
  incident: IncidentInput,
): RecoveryDecision {
  let action: RecoveryActionType | null = null;

  let reason = "";
  let maxRetries = 0;
  let requiresHumanApproval = false;

  // Low confidence → require human approval
  if (incident.confidence < 0.7) {
    action = RecoveryActionType.REQUEST_APPROVAL;

    reason =
      "Root cause confidence is too low for automated recovery. Human approval is required.";

    requiresHumanApproval = true;
  }

  // High / Critical severity → human approval
  else if (
    incident.severity === "HIGH" ||
    incident.severity === "CRITICAL"
  ) {
    action = RecoveryActionType.REQUEST_APPROVAL;

    reason =
      "The incident severity exceeds safe automation boundaries and requires human approval.";

    requiresHumanApproval = true;
  }

  // Bank timeout → controlled retry
  else if (incident.rootCause === "BANK_TIMEOUT") {
    action = RecoveryActionType.RETRY_PAYMENT;

    reason =
      "Bank timeout detected. A controlled payment retry is recommended.";

    maxRetries = 3;
  }

  // Generic payment failure spike → retry
  else if (incident.type === "PAYMENT_FAILURE_SPIKE") {
    action = RecoveryActionType.RETRY_PAYMENT;

    reason =
      "Payment failure pattern detected. A controlled retry is recommended.";

    maxRetries = 2;
  }

  // No safe action
  else {
    action = null;

    reason =
      "No safe automated recovery action could be determined for this incident.";
  }

  return {
    action,
    reason,

    boundaries: {
      maxRetries,
      requiresHumanApproval,
      dailyActionLimit: 100,
    },
  };
}