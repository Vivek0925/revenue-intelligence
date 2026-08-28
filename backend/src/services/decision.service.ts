export type RecoveryAction =
  | "RETRY_PAYMENT"
  | "WAIT_AND_RETRY"
  | "ESCALATE_TO_HUMAN"
  | "NO_ACTION";

interface IncidentInput {
  type: string;
  severity: string;
  confidence: number;
  revenueAtRisk: number;
  rootCause: string;
}

export function decideRecoveryAction(incident: IncidentInput) {
  let action: RecoveryAction = "NO_ACTION";
  let reason = "";
  let maxRetries = 0;
  let requiresHumanApproval = false;

  // Low confidence → don't let automation act
  if (incident.confidence < 0.7) {
    action = "ESCALATE_TO_HUMAN";
    reason =
      "Root cause confidence is too low for automated recovery.";
    requiresHumanApproval = true;
  }

  // Bank timeout → safe retry strategy
  else if (incident.rootCause === "BANK_TIMEOUT") {
    action = "WAIT_AND_RETRY";
    reason =
      "Bank timeout detected. Payment may succeed after a controlled retry.";

    maxRetries = 3;
  }

  // High severity incidents → human supervision
  else if (incident.severity === "HIGH") {
    action = "ESCALATE_TO_HUMAN";
    reason =
      "High severity incident requires human approval.";

    requiresHumanApproval = true;
  }

  // Generic payment failures
  else if (incident.type === "PAYMENT_FAILURE_SPIKE") {
    action = "RETRY_PAYMENT";
    reason =
      "Payment failure pattern detected. Controlled retry is recommended.";

    maxRetries = 2;
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