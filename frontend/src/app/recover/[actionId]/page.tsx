"use client";

import Script from "next/script";
import { useEffect, useState } from "react";
import {
  CheckCircle2,
  CreditCard,
  Loader2,
  ShieldCheck,
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

interface RecoveryData {
  id: string;
  amount: number;
  currency: string;
  customerEmail: string | null;
  reason: string | null;
  status: string;
  retryCount: number;
  maxRetries: number;
  incidentId: string;
}

function formatCurrency(
  amount: number,
  currency: string,
) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: currency || "INR",
    maximumFractionDigits: 0,
  }).format(amount / 100);
}

export default function RecoveryPage({
  params,
}: {
  params: Promise<{
    actionId: string;
  }>;
}) {
  const [actionId, setActionId] =
    useState<string | null>(null);

  const [recovery, setRecovery] =
    useState<RecoveryData | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [paymentLoading, setPaymentLoading] =
    useState(false);

  const [success, setSuccess] =
    useState(false);

  const [error, setError] =
    useState("");

  useEffect(() => {
    params.then(({ actionId }) => {
      setActionId(actionId);
    });
  }, [params]);

  /*
  |--------------------------------------------------------------------------
  | LOAD RECOVERY
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (!actionId) {
      return;
    }

    async function loadRecovery() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          `${API_URL}/api/recovery/${actionId}`,
          {
            cache: "no-store",
          },
        );

        const data =
          await response.json();

        if (
          !response.ok ||
          !data.success
        ) {
          throw new Error(
            data.message ||
              "Recovery payment not found",
          );
        }

        setRecovery(data.recovery);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load payment recovery",
        );
      } finally {
        setLoading(false);
      }
    }

    loadRecovery();
  }, [actionId]);

  /*
  |--------------------------------------------------------------------------
  | START CUSTOMER PAYMENT
  |--------------------------------------------------------------------------
  */

  async function handlePayment() {
    if (!actionId || !recovery) {
      return;
    }

    try {
      setPaymentLoading(true);
      setError("");

      /*
      |--------------------------------------------------------------------------
      | CREATE / REUSE RAZORPAY RECOVERY ORDER
      |--------------------------------------------------------------------------
      */

      const response = await fetch(
        `${API_URL}/api/recovery/${actionId}/create-order`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },
        },
      );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.message ||
            "Unable to create payment",
        );
      }

      if (!data.keyId) {
        throw new Error(
          "Razorpay configuration is missing",
        );
      }

      if (!data.order?.id) {
        throw new Error(
          "Payment order was not created",
        );
      }

      if (!window.Razorpay) {
        throw new Error(
          "Payment checkout is still loading. Please refresh and try again.",
        );
      }

      /*
      |--------------------------------------------------------------------------
      | OPEN RAZORPAY
      |--------------------------------------------------------------------------
      */

      const razorpay =
        new window.Razorpay({
          key: data.keyId,

          amount:
            Number(
              data.order.amount,
            ),

          currency:
            data.order.currency ||
            "INR",

          name: "RevenueAI",

          description:
            "Complete your payment",

          order_id:
            data.order.id,

          prefill: {
            email:
              recovery.customerEmail ||
              "",
          },

          notes: {
            recoveryActionId:
              actionId,
          },

          theme: {
            color: "#4f46e5",
          },

          handler:
            function () {
              setPaymentLoading(
                false,
              );

              setSuccess(true);
            },

          modal: {
            ondismiss:
              function () {
                setPaymentLoading(
                  false,
                );
              },
          },
        });

      razorpay.on(
        "payment.failed",
        function (response: any) {
          console.error(
            "Customer recovery payment failed:",
            response,
          );

          setPaymentLoading(false);

          setError(
            response?.error
              ?.description ||
              "Payment failed. Please try again.",
          );
        },
      );

      razorpay.open();

      setPaymentLoading(false);
    } catch (err) {
      console.error(
        "Customer payment error:",
        err,
      );

      setPaymentLoading(false);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to start payment",
      );
    }
  }

  /*
  |--------------------------------------------------------------------------
  | LOADING
  |--------------------------------------------------------------------------
  */

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f8fafc]">
        <div className="flex items-center gap-3 text-sm text-slate-500">
          <Loader2
            size={18}
            className="animate-spin"
          />
          Loading payment...
        </div>
      </main>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | ERROR
  |--------------------------------------------------------------------------
  */

  if (error && !recovery) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f8fafc] px-4">
        <div className="w-full max-w-md rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
            <XCircle size={24} />
          </div>

          <h1 className="mt-5 text-xl font-bold text-slate-900">
            Payment unavailable
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            {error}
          </p>
        </div>
      </main>
    );
  }

  if (!recovery) {
    return null;
  }

  /*
  |--------------------------------------------------------------------------
  | SUCCESS SCREEN
  |--------------------------------------------------------------------------
  */

  if (success) {
    return (
      <>
        <Script
          src="https://checkout.razorpay.com/v1/checkout.js"
          strategy="afterInteractive"
        />

        <main className="flex min-h-screen items-center justify-center bg-[#f8fafc] px-4">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <CheckCircle2
                size={32}
              />
            </div>

            <h1 className="mt-6 text-2xl font-bold tracking-tight text-slate-900">
              Payment submitted
            </h1>

            <p className="mt-3 text-sm leading-6 text-slate-500">
              Your payment was submitted
              successfully. The merchant
              will receive confirmation
              shortly.
            </p>

            <div className="mt-6 rounded-2xl bg-emerald-50 p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
                Amount
              </p>

              <p className="mt-2 text-3xl font-bold text-emerald-700">
                {formatCurrency(
                  recovery.amount,
                  recovery.currency,
                )}
              </p>
            </div>

            <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-400">
              <ShieldCheck
                size={15}
              />
              Secure payment powered by
              Razorpay
            </div>
          </div>
        </main>
      </>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | CUSTOMER PAYMENT PAGE
  |--------------------------------------------------------------------------
  */

  return (
    <>
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="afterInteractive"
      />

      <main className="min-h-screen bg-[#f8fafc] px-4 py-10">
        <div className="mx-auto flex min-h-[80vh] max-w-md items-center justify-center">
          <div className="w-full rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            {/* BRAND */}

            <div className="flex items-center justify-center">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-sm font-bold text-white">
                R
              </div>
            </div>

            <div className="mt-5 text-center">
              <p className="text-sm font-medium text-indigo-600">
                RevenueAI
              </p>

              <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
                Complete Your Payment
              </h1>

              <p className="mt-3 text-sm leading-6 text-slate-500">
                Your previous payment could
                not be completed. You can
                securely complete the payment
                again using the recovery link.
              </p>
            </div>

            {/* PAYMENT CARD */}

            <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">
                  Amount due
                </span>

                <span className="text-2xl font-bold text-slate-900">
                  {formatCurrency(
                    recovery.amount,
                    recovery.currency,
                  )}
                </span>
              </div>

              {recovery.reason && (
                <div className="mt-5 border-t border-slate-200 pt-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Payment issue
                  </p>

                  <p className="mt-1 text-sm text-slate-600">
                    Temporary payment
                    processing issue detected.
                  </p>
                </div>
              )}
            </div>

            {/* ERROR */}

            {error && (
              <div className="mt-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                <XCircle
                  size={18}
                  className="mt-0.5 shrink-0"
                />

                <p>{error}</p>
              </div>
            )}

            {/* PAY */}

            <button
              type="button"
              onClick={handlePayment}
              disabled={paymentLoading}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-4 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
            >
              {paymentLoading ? (
                <>
                  <Loader2
                    size={18}
                    className="animate-spin"
                  />
                  Opening Secure Checkout...
                </>
              ) : (
                <>
                  <CreditCard
                    size={18}
                  />
                  Pay{" "}
                  {formatCurrency(
                    recovery.amount,
                    recovery.currency,
                  )}
                </>
              )}
            </button>

            {/* SECURITY */}

            <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-400">
              <ShieldCheck
                size={15}
              />
              Secure payment via Razorpay
            </div>

            <p className="mt-3 text-center text-[11px] leading-5 text-slate-400">
              This payment link was generated
              by the merchant through RevenueAI.
            </p>
          </div>
        </div>
      </main>
    </>
  );
}