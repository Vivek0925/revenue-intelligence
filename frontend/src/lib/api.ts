const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export interface Incident {
  id: string;
  title: string;
  description: string;
  severity: string;
  status: string;
  revenueAtRisk: number;
  confidence: number;
  rootCause: string | null;
}

export interface RecoveryAction {
  id: string;
  type: string;
  status: string;
  reason: string | null;
  expectedRecovery: number | null;
  actualRecovery: number | null;
  retryCount: number;
  maxRetries: number;
  paymentId: string | null;
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

export interface DashboardData {
  success: boolean;
  incident: Incident;
  parentAction: RecoveryAction | null;
  childActions: RecoveryAction[];
  summary: RecoverySummary;
}

export async function getDashboardData(): Promise<DashboardData> {
  const response = await fetch(`${API_URL}/api/dashboard`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Failed to fetch dashboard data");
  }

  return response.json();
}