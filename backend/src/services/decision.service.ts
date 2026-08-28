export type AIRecoveryAction =
  | "RETRY_PAYMENT"
  | "WAIT_AND_RETRY"
  | "ESCALATE_TO_HUMAN"
  | "NO_ACTION";

export interface IncidentInput {
  type: string;
  severity: string;
  confidence: number;
  revenueAtRisk: number;
  rootCause: string;
}

export interface RecoveryDecision {
  action: AIRecoveryAction;
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
  let action: AIRecoveryAction = "NO_ACTION";
  let reason = "No recovery action is required.";
  let maxRetries = 0;
  let requiresHumanApproval = false;

  // ==========================================
  // 1. LOW CONFIDENCE
  // ==========================================

  if (incident.confidence < 0.7) {
    action = "ESCALATE_TO_HUMAN";

    reason =
      "Root cause confidence is too low for automated recovery.";

    requiresHumanApproval = true;
  }

  // ==========================================
  // 2. CRITICAL INCIDENT
  // ==========================================

  else if (incident.severity === "CRITICAL") {
    action = "ESCALATE_TO_HUMAN";

    reason =
      "Critical severity incident requires immediate human supervision.";

    requiresHumanApproval = true;
  }

  // ==========================================
  // 3. HIGH SEVERITY
  // ==========================================

  else if (incident.severity === "HIGH") {
    action = "ESCALATE_TO_HUMAN";

    reason =
      "High severity incident requires human approval before recovery.";

    requiresHumanApproval = true;
  }

  // ==========================================
  // 4. BANK TIMEOUT
  // ==========================================

  else if (incident.rootCause === "BANK_TIMEOUT") {
    action = "WAIT_AND_RETRY";

    reason =
      "Bank timeout detected. A delayed controlled retry is recommended.";

    maxRetries = 3;
  }

  // ==========================================
  // 5. GENERIC PAYMENT FAILURE
  // ==========================================

  else if (incident.type === "PAYMENT_FAILURE_SPIKE") {
    action = "RETRY_PAYMENT";

    reason =
      "Payment failure pattern detected. A controlled retry is recommended.";

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