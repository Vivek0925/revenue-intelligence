import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Clock3,
  BrainCircuit,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

async function getIncident(id: string) {
  const response = await fetch(`${API_URL}/api/incidents/${id}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Failed to fetch incident");
  }

  return response.json();
}

function formatCurrency(amount: number | null | undefined) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount ?? 0);
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
}

function statusStyle(status: string) {
  const styles: Record<string, string> = {
    SUCCESS: "border-emerald-200 bg-emerald-50 text-emerald-700",
    FAILED: "border-red-200 bg-red-50 text-red-700",
    PENDING: "border-amber-200 bg-amber-50 text-amber-700",
    EXECUTING: "border-blue-200 bg-blue-50 text-blue-700",
    APPROVED: "border-purple-200 bg-purple-50 text-purple-700",
    BLOCKED: "border-orange-200 bg-orange-50 text-orange-700",
    ESCALATED: "border-red-200 bg-red-50 text-red-700",
  };

  return (
    styles[status] ??
    "border-slate-200 bg-slate-50 text-slate-600"
  );
}

function severityStyle(severity: string) {
  const styles: Record<string, string> = {
    LOW: "border-blue-200 bg-blue-50 text-blue-700",
    MEDIUM: "border-amber-200 bg-amber-50 text-amber-700",
    HIGH: "border-orange-200 bg-orange-50 text-orange-700",
    CRITICAL: "border-red-200 bg-red-50 text-red-700",
  };

  return (
    styles[severity] ??
    "border-slate-200 bg-slate-50 text-slate-600"
  );
}

export default async function IncidentDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getIncident(id);

  const incident = data.incident;
  const parentAction = data.parentAction;
  const childActions = data.childActions ?? [];
  const summary = data.summary;
  const decision = data.decision;

  return (
    <main className="min-h-screen bg-[#f8fafc] text-slate-900">
      <div className="pointer-events-none absolute left-0 top-0 -z-0 h-[380px] w-full bg-gradient-to-b from-indigo-50 via-purple-50/30 to-transparent" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">

        {/* Header */}
        <div className="border-b border-slate-200 pb-6">
          <Link
            href="/incidents"
            className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-indigo-600"
          >
            <ArrowLeft size={16} />
            Back to Incident History
          </Link>

          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">
                  Post-Incident Report
                </p>

                <span
                  className={`rounded-full border px-3 py-1 text-xs font-semibold ${severityStyle(
                    incident.severity
                  )}`}
                >
                  {incident.severity}
                </span>
              </div>

              <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                {incident.title}
              </h1>

              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-500">
                {incident.description}
              </p>

              <p className="mt-4 text-xs text-slate-400">
                Detected {formatDate(incident.createdAt)}
              </p>
            </div>

            <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
              <CheckCircle2
                size={18}
                className="text-emerald-600"
              />
              <div>
                <p className="text-xs text-emerald-600">
                  Recovery Status
                </p>
                <p className="font-semibold text-emerald-700">
                  {parentAction?.status ?? "NO_ACTION"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Incident overview */}
        <section className="mt-8">
          <div className="mb-4">
            <p className="text-sm font-semibold text-indigo-600">
              Incident Overview
            </p>
            <h2 className="mt-1 text-xl font-semibold text-slate-900">
              What happened
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Revenue At Risk
              </p>
              <p className="mt-3 text-2xl font-bold text-slate-900">
                {formatCurrency(incident.revenueAtRisk)}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Revenue Recovered
              </p>
              <p className="mt-3 text-2xl font-bold text-emerald-600">
                {formatCurrency(summary.totalActualRecovery)}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Recovery Rate
              </p>
              <p className="mt-3 text-2xl font-bold text-indigo-600">
                {summary.recoveryRate}%
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                AI Confidence
              </p>
              <p className="mt-3 text-2xl font-bold text-purple-600">
                {(incident.confidence * 100).toFixed(0)}%
              </p>
            </div>
          </div>
        </section>

        {/* Root cause + AI decision */}
        <section className="mt-6 grid gap-6 lg:grid-cols-2">

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-600">
                <AlertTriangle size={20} />
              </div>

              <div>
                <p className="text-sm font-medium text-red-600">
                  Root Cause Analysis
                </p>
                <h2 className="text-lg font-semibold text-slate-900">
                  Failure Diagnosis
                </h2>
              </div>
            </div>

            <div className="mt-6 rounded-xl bg-slate-50 p-5">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Dominant Failure Reason
              </p>

              <p className="mt-2 text-lg font-semibold text-slate-900">
                {incident.rootCause ?? "Unknown"}
              </p>

              <p className="mt-3 text-sm leading-6 text-slate-500">
                The system detected a payment failure pattern and
                identified the dominant failure reason before selecting
                a recovery strategy.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-indigo-100 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <BrainCircuit size={20} />
              </div>

              <div>
                <p className="text-sm font-medium text-indigo-600">
                  AI Decision Engine
                </p>
                <h2 className="text-lg font-semibold text-slate-900">
                  Recovery Strategy
                </h2>
              </div>
            </div>

            {decision ? (
              <>
                <div className="mt-6 flex items-center justify-between rounded-xl bg-indigo-50 p-5">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-indigo-500">
                      Recommended Action
                    </p>
                    <p className="mt-2 text-lg font-bold text-indigo-700">
                      {decision.action}
                    </p>
                  </div>

                  <ShieldCheck
                    size={28}
                    className="text-indigo-500"
                  />
                </div>

                <p className="mt-4 text-sm leading-6 text-slate-500">
                  {decision.reason}
                </p>

                <div className="mt-5 grid grid-cols-3 gap-3">
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">
                      Max Retries
                    </p>
                    <p className="mt-1 font-semibold text-slate-800">
                      {decision.boundaries.maxRetries}
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">
                      Approval
                    </p>
                    <p className="mt-1 font-semibold text-slate-800">
                      {decision.boundaries.requiresHumanApproval
                        ? "Required"
                        : "Not Required"}
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">
                      Daily Limit
                    </p>
                    <p className="mt-1 font-semibold text-slate-800">
                      {decision.boundaries.dailyActionLimit}
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <div className="mt-6 rounded-xl bg-slate-50 p-5">
                <p className="text-sm text-slate-500">
                  No AI recovery decision was recorded for this incident.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Parent recovery */}
        <section className="mt-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-indigo-600">
                  Recovery Orchestration
                </p>
                <h2 className="mt-1 text-xl font-semibold text-slate-900">
                  Recovery Execution
                </h2>
              </div>

              {parentAction && (
                <span
                  className={`w-fit rounded-full border px-3 py-1.5 text-xs font-semibold ${statusStyle(
                    parentAction.status
                  )}`}
                >
                  {parentAction.status}
                </span>
              )}
            </div>

            {parentAction ? (
              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs text-slate-500">
                    Recovery Type
                  </p>
                  <p className="mt-2 font-semibold text-slate-800">
                    {parentAction.type}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs text-slate-500">
                    Expected Recovery
                  </p>
                  <p className="mt-2 font-semibold text-slate-800">
                    {formatCurrency(parentAction.expectedRecovery)}
                  </p>
                </div>

                <div className="rounded-xl bg-emerald-50 p-4">
                  <p className="text-xs text-emerald-600">
                    Actual Recovery
                  </p>
                  <p className="mt-2 font-semibold text-emerald-700">
                    {formatCurrency(parentAction.actualRecovery)}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs text-slate-500">
                    Retry Count
                  </p>
                  <p className="mt-2 font-semibold text-slate-800">
                    {parentAction.retryCount} /{" "}
                    {parentAction.maxRetries}
                  </p>
                </div>
              </div>
            ) : (
              <p className="mt-6 text-sm text-slate-500">
                No recovery action was created for this incident.
              </p>
            )}
          </div>
        </section>

        {/* Child actions */}
        <section className="mt-6 pb-10">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-slate-200 p-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-indigo-600">
                  Individual Recovery Results
                </p>
                <h2 className="mt-1 text-xl font-semibold text-slate-900">
                  Payment-Level Recovery
                </h2>
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-600">
                {childActions.length} Payments
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-6 py-4 font-semibold">
                      Payment
                    </th>
                    <th className="px-6 py-4 font-semibold">
                      Status
                    </th>
                    <th className="px-6 py-4 font-semibold">
                      Expected
                    </th>
                    <th className="px-6 py-4 font-semibold">
                      Recovered
                    </th>
                    <th className="px-6 py-4 font-semibold">
                      Retries
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {childActions.map((action: any) => (
                    <tr
                      key={action.id}
                      className="border-b border-slate-100 last:border-0 transition hover:bg-slate-50"
                    >
                      <td className="px-6 py-4">
                        <p className="font-medium text-slate-800">
                          {action.paymentId
                            ? `${action.paymentId.slice(0, 12)}...`
                            : "Unknown"}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          {action.type}
                        </p>
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${statusStyle(
                            action.status
                          )}`}
                        >
                          {action.status === "SUCCESS" ? (
                            <CheckCircle2 size={13} />
                          ) : action.status === "FAILED" ? (
                            <XCircle size={13} />
                          ) : (
                            <Clock3 size={13} />
                          )}

                          {action.status}
                        </span>
                      </td>

                      <td className="px-6 py-4 font-medium text-slate-700">
                        {formatCurrency(action.expectedRecovery)}
                      </td>

                      <td className="px-6 py-4 font-semibold">
                        <span
                          className={
                            action.status === "SUCCESS"
                              ? "text-emerald-600"
                              : "text-slate-400"
                          }
                        >
                          {formatCurrency(action.actualRecovery)}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <span className="font-medium text-slate-700">
                          {action.retryCount}
                        </span>
                        <span className="text-slate-400">
                          {" "}
                          / {action.maxRetries}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {childActions.length === 0 && (
              <div className="p-10 text-center">
                <p className="font-medium text-slate-700">
                  No individual recovery actions
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Footer navigation */}
        <div className="flex justify-center pb-12">
          <Link
            href="/incidents"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-700 shadow-sm transition hover:border-indigo-200 hover:text-indigo-600"
          >
            View All Incidents
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </main>
  );
}