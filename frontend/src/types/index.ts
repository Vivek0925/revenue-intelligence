export interface Incident {
  id: string;
  title: string;
  description: string;
  type: string;
  status: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  revenueAtRisk: number;
  confidence: number;
  rootCause: string;
  merchantId: string;
  createdAt: string;
  updatedAt: string;
}

export interface RecoveryAction {
  id: string;
  type: string;
  status:
    | "PENDING"
    | "APPROVED"
    | "EXECUTING"
    | "SUCCESS"
    | "FAILED"
    | "BLOCKED"
    | "ESCALATED";

  reason: string | null;

  expectedRecovery: number | null;
  actualRecovery: number | null;

  retryCount: number;
  maxRetries: number;

  razorpayReference: string | null;

  incidentId: string;
  paymentId: string | null;

  parentActionId?: string | null;

  createdAt: string;
  updatedAt: string;
}

export interface RecoverySummary {
  totalChildActions: number;
  successfulActions: number;
  failedActions: number;
  pendingActions: number;

  totalExpectedRecovery: number;
  totalActualRecovery: number;

  recoveryRate: number;
}

export interface AggregationResponse {
  success: boolean;
  message: string;

  parentAction: {
    id: string;
    status: string;
    expectedRecovery: number | null;
    actualRecovery: number | null;
  };

  summary: RecoverySummary;
}