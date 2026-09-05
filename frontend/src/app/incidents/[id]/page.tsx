"use client";

import Link from "next/link";
import Script from "next/script";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Brain,
  CheckCircle2,
  Clock3,
  CreditCard,
  Loader2,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  XCircle,
} from "lucide-react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5000";

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface Payment {
  id: string;
  amount: number;
  currency: string;
  status: string;
  method: string | null;
  failureReason: string | null;
  customerEmail: string | null;
  razorpayPaymentId: string | null;
  razorpayOrderId: string | null;
  createdAt: string;
}

interface RecoveryAction {
  id: string;
  type: string;
  status: string;
  reason: string | null;
  expectedRecovery: number | null;
  actualRecovery: number | null;
  retryCount: number;
  maxRetries: number;
  razorpayReference: string | null;
  paymentId: string | null;
}

interface Incident {
  id: string;
  title: string;
  description: string | null;
  type: string;
  status: string;
  severity: string;
  revenueAtRisk: number | null;
  confidence: number | null;
  rootCause: string | null;
  createdAt: string;
  updatedAt: string;
}

interface IncidentData {
  success: boolean;
  incident: Incident;
  parentAction: RecoveryAction | null;
  childActions: RecoveryAction[];
  summary: {
    totalChildActions: number;
    successfulActions: number;
    failedActions: number;
    pendingActions: number;
    totalExpectedRecovery: number;
    totalActualRecovery: number;
    recoveryRate: number;
  };
  decision?: {
    action: string;
    reason: string;
    boundaries: {
      maxRetries: number;
      requiresHumanApproval: boolean;
      dailyActionLimit: number;
    };
  };
}

function formatCurrency(amount: number | null | undefined) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format((amount ?? 0) / 100);
}

function formatDate(date: string) {
  return new Date(date).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function statusClasses(status: string) {
  switch (status) {
    case "SUCCESS":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";

    case "FAILED":
      return "border-red-200 bg-red-50 text-red-700";

    case "EXECUTING":
      return "border-indigo-200 bg-indigo-50 text-indigo-700";

    case "PENDING":
      return "border-amber-200 bg-amber-50 text-amber-700";

    case "ESCALATED":
      return "border-purple-200 bg-purple-50 text-purple-700";

    default:
      return "border-slate-200 bg-slate-50 text-slate-600";
  }
}

function severityClasses(severity: string) {
  switch (severity) {
    case "CRITICAL":
      return "border-red-200 bg-red-50 text-red-700";

    case "HIGH":
      return "border-orange-200 bg-orange-50 text-orange-700";

    case "MEDIUM":
      return "border-amber-200 bg-amber-50 text-amber-700";

    default:
      return "border-blue-200 bg-blue-50 text-blue-700";
  }
}

export default function IncidentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [incidentId, setIncidentId] =
    useState<string | null>(null);

  const [data, setData] =
    useState<IncidentData | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [recoveryLoading, setRecoveryLoading] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");

  useEffect(() => {
    params.then(({ id }) => {
      setIncidentId(id);
    });
  }, [params]);

  async function loadIncident(id: string) {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `${API_URL}/api/incidents/${id}`,
        {
          cache: "no-store",
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message ||
            "Failed to load incident"
        );
      }

      setData(result);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load incident"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (incidentId) {
      loadIncident(incidentId);
    }
  }, [incidentId]);

  async function startRecovery(action: RecoveryAction) {
  try {
    setRecoveryLoading(true);
    setMessage("");
    setError("");

    const response = await fetch(
      `${API_URL}/api/recovery/${action.id}/create-order`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    const result = await response.json();

    console.log("Recovery order response:", result);

    if (!response.ok || !result.success) {
      throw new Error(
        result.message || "Failed to create recovery order"
      );
    }

    if (!result.keyId) {
      throw new Error(
        "Razorpay key ID is missing from the server."
      );
    }

    if (!result.order?.id) {
      throw new Error(
        "Razorpay order was not created."
      );
    }

    if (!window.Razorpay) {
      throw new Error(
        "Razorpay Checkout has not loaded yet. Please refresh the page and try again."
      );
    }

    console.log(
      "Opening Razorpay recovery checkout:",
      result.order.id
    );

    const razorpay = new window.Razorpay({
      key: result.keyId,

      amount: Number(result.order.amount),

      currency: result.order.currency || "INR",

      name: "RevenueAI",

      description: "Payment Recovery",

      order_id: result.order.id,

      prefill: {
        email: "customer@example.com",
      },

      notes: {
        recoveryActionId: action.id,
      },

      theme: {
        color: "#4f46e5",
      },

      handler: function (paymentResponse: any) {
        console.log(
          "Recovery payment successful:",
          paymentResponse
        );

        setRecoveryLoading(false);

        setMessage(
          "Recovery payment successful. Waiting for Razorpay webhook confirmation..."
        );

        setTimeout(() => {
          if (incidentId) {
            loadIncident(incidentId);
          }
        }, 2000);
      },

      modal: {
        ondismiss: function () {
          console.log(
            "Recovery checkout dismissed"
          );

          setRecoveryLoading(false);

          setMessage(
            "Recovery checkout was closed."
          );
        },
      },
    });

    razorpay.on(
      "payment.failed",
      function (response: any) {
        console.error(
          "Recovery payment failed:",
          response
        );

        setRecoveryLoading(false);

        setError(
          response?.error?.description ||
            "Recovery payment failed."
        );
      }
    );

    razorpay.open();

    /*
     * The modal has now been handed over to Razorpay.
     * Don't keep the button spinning forever.
     */
    setRecoveryLoading(false);
  } catch (err) {
    console.error(
      "Start recovery error:",
      err
    );

    setRecoveryLoading(false);

    setError(
      err instanceof Error
        ? err.message
        : "Failed to start recovery."
    );
  }
}

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f8fafc]">
        <div className="flex items-center gap-3 text-sm text-slate-500">
          <Loader2
            size={18}
            className="animate-spin"
          />
          Loading incident...
        </div>
      </main>
    );
  }

  if (error && !data) {
    return (
      <main className="min-h-screen bg-[#f8fafc] px-4 py-10">
        <div className="mx-auto max-w-4xl">
          <Link
            href="/incidents"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-indigo-600"
          >
            <ArrowLeft size={16} />
            Back to incidents
          </Link>

          <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
            {error}
          </div>
        </div>
      </main>
    );
  }

  if (!data) {
    return null;
  }

  const incident = data.incident;

  /*
   * Find the first actionable recovery.
   */

 const actionableRecovery =
  data.childActions.find(
    (action) =>
      (action.status === "PENDING" ||
        action.status === "FAILED") &&
      action.type === "RETRY_PAYMENT" &&
      action.retryCount < action.maxRetries
  ) ??
  (data.parentAction &&
  (data.parentAction.status === "PENDING" ||
    data.parentAction.status === "FAILED") &&
  data.parentAction.retryCount <
    data.parentAction.maxRetries
    ? data.parentAction
    : null);

  return (
    <>
     <Script
  src="https://checkout.razorpay.com/v1/checkout.js"
  strategy="afterInteractive"
  onLoad={() => {
    console.log("✅ Razorpay Checkout loaded");
  }}
  onError={() => {
    console.error(
      "❌ Failed to load Razorpay Checkout"
    );
  }}
/>

      <main className="min-h-screen bg-[#f8fafc] text-slate-900">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">

          {/* Header */}

          <div className="flex flex-col gap-5 border-b border-slate-200 pb-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <Link
                href="/incidents"
                className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-indigo-600"
              >
                <ArrowLeft size={16} />
                Incident History
              </Link>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                  {incident.title}
                </h1>

                <span
                  className={`rounded-full border px-3 py-1 text-xs font-semibold ${severityClasses(
                    incident.severity
                  )}`}
                >
                  {incident.severity}
                </span>

                <span
                  className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusClasses(
                    incident.status
                  )}`}
                >
                  {incident.status}
                </span>
              </div>

              <p className="mt-2 text-sm text-slate-500">
                Post-incident analysis and recovery execution
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                incidentId &&
                loadIncident(incidentId)
              }
              className="inline-flex w-fit items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600"
            >
              <RefreshCw size={16} />
              Refresh
            </button>
          </div>

          {/* Alerts */}

          {message && (
            <div className="mt-6 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              <CheckCircle2 size={18} />
              {message}
            </div>
          )}

          {error && (
            <div className="mt-6 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <XCircle size={18} />
              {error}
            </div>
          )}

          {/* Metrics */}

          <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">
                Revenue At Risk
              </p>
              <p className="mt-2 text-2xl font-bold">
                {formatCurrency(
                  incident.revenueAtRisk
                )}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">
                Recovered Revenue
              </p>
              <p className="mt-2 text-2xl font-bold text-emerald-600">
                {formatCurrency(
                  data.summary
                    .totalActualRecovery
                )}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">
                Recovery Rate
              </p>
              <p className="mt-2 text-2xl font-bold">
                {data.summary.recoveryRate}%
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">
                AI Confidence
              </p>
              <p className="mt-2 text-2xl font-bold text-indigo-600">
                {(
                  (incident.confidence ??
                    0) * 100
                ).toFixed(0)}
                %
              </p>
            </div>
          </section>

          <section className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">

            {/* Root Cause */}

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                  <Brain size={20} />
                </div>

                <div>
                  <h2 className="font-semibold">
                    Root Cause Analysis
                  </h2>
                  <p className="text-sm text-slate-500">
                    AI-generated failure classification
                  </p>
                </div>
              </div>

              <div className="mt-6 rounded-xl border border-indigo-100 bg-indigo-50/60 p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-indigo-500">
                  Detected Root Cause
                </p>

                <p className="mt-2 text-lg font-bold text-indigo-800">
                  {incident.rootCause ??
                    "UNKNOWN"}
                </p>

                <p className="mt-3 text-sm leading-6 text-slate-600">
                  {incident.description ??
                    "Payment failure pattern detected by RevenueAI."}
                </p>
              </div>

              <div className="mt-6 flex items-start gap-3 text-sm text-slate-500">
                <Clock3
                  size={17}
                  className="mt-0.5"
                />

                <div>
                  <p className="font-medium text-slate-700">
                    Incident detected
                  </p>

                  <p className="mt-1">
                    {formatDate(
                      incident.createdAt
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* AI Decision */}

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                  <Sparkles size={20} />
                </div>

                <div>
                  <h2 className="font-semibold">
                    AI Decision Engine
                  </h2>

                  <p className="text-sm text-slate-500">
                    Recommended recovery strategy
                  </p>
                </div>
              </div>

              {data.decision ? (
                <>
                  <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Recommended Action
                    </p>

                    <p className="mt-2 text-xl font-bold text-slate-900">
                      {data.decision.action.replaceAll(
                        "_",
                        " "
                      )}
                    </p>

                    <p className="mt-3 text-sm leading-6 text-slate-600">
                      {data.decision.reason}
                    </p>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-slate-200 p-4">
                      <p className="text-xs text-slate-500">
                        Max Retries
                      </p>

                      <p className="mt-1 font-semibold">
                        {
                          data.decision
                            .boundaries
                            .maxRetries
                        }
                      </p>
                    </div>

                    <div className="rounded-xl border border-slate-200 p-4">
                      <p className="text-xs text-slate-500">
                        Approval
                      </p>

                      <p className="mt-1 font-semibold">
                        {data.decision
                          .boundaries
                          .requiresHumanApproval
                          ? "Required"
                          : "Not required"}
                      </p>
                    </div>
                  </div>
                </>
              ) : (
                <div className="mt-6 rounded-xl bg-slate-50 p-5 text-sm text-slate-500">
                  Decision data is not available.
                </div>
              )}
            </div>
          </section>

          {/* Recovery Action */}

          <section className="mt-6">
            <div className="rounded-2xl border border-indigo-200 bg-white p-6 shadow-sm">

              <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

                <div>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                      <RefreshCw size={20} />
                    </div>

                    <div>
                      <h2 className="font-semibold">
                        Recovery Execution
                      </h2>

                      <p className="text-sm text-slate-500">
                        Execute the AI-approved recovery strategy
                      </p>
                    </div>
                  </div>

                  {actionableRecovery ? (
  <div className="mt-5">
    <div className="flex flex-wrap items-center gap-2">
      <span
        className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusClasses(
          actionableRecovery.status
        )}`}
      >
        {actionableRecovery.status}
      </span>

      <span className="text-sm font-medium text-slate-600">
        {actionableRecovery.type.replaceAll("_", " ")}
      </span>
    </div>

    <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        Recovery Reason
      </p>

      <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
        {actionableRecovery.reason ??
          "AI recommended a controlled recovery attempt."}
      </p>
    </div>

    <div className="mt-4 grid gap-3 sm:grid-cols-3">
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-xs text-slate-500">
          Expected Recovery
        </p>

        <p className="mt-1 font-semibold text-slate-900">
          {formatCurrency(
            actionableRecovery.expectedRecovery
          )}
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-xs text-slate-500">
          Recovery Attempts
        </p>

        <p className="mt-1 font-semibold text-slate-900">
          {actionableRecovery.retryCount} /{" "}
          {actionableRecovery.maxRetries}
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-xs text-slate-500">
          Recovery Order
        </p>

        <p className="mt-1 truncate font-mono text-xs font-medium text-slate-700">
          {actionableRecovery.razorpayReference ??
            "Not created"}
        </p>
      </div>
    </div>
  </div>
) : (
  <div className="mt-5 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
    <CheckCircle2
      size={22}
      className="shrink-0 text-emerald-600"
    />

    <div>
      <p className="font-semibold text-emerald-800">
        Recovery completed successfully
      </p>

      <p className="mt-1 text-sm text-emerald-700">
        All recovery actions for this incident
        have been processed.
      </p>
    </div>
  </div>
)}
                </div>

                {actionableRecovery && (
                  <div className="shrink-0">
                    <button
                      type="button"
                      disabled={
                        recoveryLoading
                      }
                      onClick={() =>
                        startRecovery(
                          actionableRecovery
                        )
                      }
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-3.5 text-sm font-semibold text-black shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {recoveryLoading ? (
                        <>
                          <Loader2
                            size={18}
                            className="animate-spin"
                          />
                          Opening Checkout...
                        </>
                      ) : (
                        <>
                          <CreditCard
                            size={18}
                          />
                          Start Recovery
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>

              {actionableRecovery && (
                <div className="mt-6 grid gap-4 border-t border-slate-100 pt-6 sm:grid-cols-3">
                  <div>
                    <p className="text-xs text-slate-500">
                      Expected Recovery
                    </p>

                    <p className="mt-1 font-semibold">
                      {formatCurrency(
                        actionableRecovery.expectedRecovery
                      )}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">
                      Attempts
                    </p>

                    <p className="mt-1 font-semibold">
                      {
                        actionableRecovery.retryCount
                      }{" "}
                      /{" "}
                      {
                        actionableRecovery.maxRetries
                      }
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">
                      Razorpay Order
                    </p>

                    <p className="mt-1 truncate font-mono text-xs font-medium">
                      {
                        actionableRecovery.razorpayReference ??
                        "Not created"
                      }
                    </p>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Payment Recovery Table */}

          <section className="mt-6 pb-10">
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">

              <div className="border-b border-slate-200 p-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                    <CreditCard size={19} />
                  </div>

                  <div>
                    <h2 className="font-semibold">
                      Payment-Level Recovery
                    </h2>

                    <p className="text-sm text-slate-500">
                      Individual recovery attempts linked to this incident
                    </p>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-100 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-6 py-4 font-medium">
                        Payment
                      </th>

                      <th className="px-6 py-4 font-medium">
                        Amount
                      </th>

                      <th className="px-6 py-4 font-medium">
                        Action
                      </th>

                      <th className="px-6 py-4 font-medium">
                        Status
                      </th>

                      <th className="px-6 py-4 font-medium">
                        Recovered
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {data.childActions.map(
                      (action) => (
                        <tr
                          key={action.id}
                          className="hover:bg-slate-50"
                        >
                          <td className="px-6 py-4">
                            <p className="font-medium text-slate-800">
                              {action.paymentId ??
                                "—"}
                            </p>

                            <p className="mt-1 font-mono text-xs text-slate-400">
                              {action.id}
                            </p>
                          </td>

                          <td className="px-6 py-4 font-medium">
                            {formatCurrency(
                              action.expectedRecovery
                            )}
                          </td>

                          <td className="px-6 py-4">
                            <span className="text-slate-600">
                              {action.type.replaceAll(
                                "_",
                                " "
                              )}
                            </span>
                          </td>

                          <td className="px-6 py-4">
                            <span
                              className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClasses(
                                action.status
                              )}`}
                            >
                              {action.status}
                            </span>
                          </td>

                          <td className="px-6 py-4 font-semibold text-emerald-600">
                            {formatCurrency(
                              action.actualRecovery
                            )}
                          </td>
                        </tr>
                      )
                    )}

                    {data.childActions
                      .length === 0 && (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-6 py-10 text-center text-sm text-slate-500"
                        >
                          No payment-level recovery actions yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* Footer */}

          <div className="pb-10 text-center text-xs text-slate-400">
            RevenueAI · Razorpay Test Mode · Recovery Intelligence
          </div>
        </div>
      </main>
    </>
  );
}