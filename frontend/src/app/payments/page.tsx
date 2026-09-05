"use client";

import Script from "next/script";
import { useState } from "react";
import { CreditCard, Loader2, ShieldCheck } from "lucide-react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function PaymentsPage() {
  const [amount, setAmount] = useState("5250");
  const [email, setEmail] = useState("customer@example.com");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handlePayment() {
    try {
      setLoading(true);
      setMessage("");

      const response = await fetch(
        `${API_URL}/api/payments/create-order`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            amount: Number(amount),
            customerEmail: email,
            merchantId: "cmtctwy3m0000b4df3k78wq7f",
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Failed to create payment order"
        );
      }

      const options = {
        key: data.keyId,
        amount: data.order.amount,
        currency: data.order.currency,
        name: "RevenueAI",
        description: "Test Merchant Payment",
        order_id: data.order.id,

        prefill: {
          email,
        },

        theme: {
          color: "#4f46e5",
        },

        handler: async function (response: {
          razorpay_payment_id: string;
          razorpay_order_id: string;
          razorpay_signature: string;
        }) {
          console.log("Razorpay payment successful:", response);

          try {
            const verifyResponse = await fetch(
              `${API_URL}/api/payments/verify`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify(response),
              }
            );

            const verifyData = await verifyResponse.json();

            if (!verifyResponse.ok || !verifyData.success) {
              throw new Error(
                verifyData.message ||
                  "Payment verification failed"
              );
            }

            setMessage(
              `Payment successful! Payment ID: ${response.razorpay_payment_id}`
            );
          } catch (error) {
            setMessage(
              error instanceof Error
                ? error.message
                : "Payment verification failed"
            );
          }
        },

        modal: {
          ondismiss: function () {
            setLoading(false);
          },
        },
      };

      if (!(window as any).Razorpay) {
        throw new Error(
          "Razorpay Checkout is still loading. Please try again."
        );
      }

      const razorpay = new (window as any).Razorpay(options);

      razorpay.on(
        "payment.failed",
        function (response: any) {
          console.error("Payment failed:", response);

          setMessage(
            response.error?.description ||
              "Payment failed"
          );

          setLoading(false);
        }
      );

      razorpay.open();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Failed to start payment"
      );

      setLoading(false);
    }
  }

  return (
    <>
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="afterInteractive"
      />

      <main className="min-h-screen bg-[#f8fafc] px-4 py-12 text-slate-900">
        <div className="mx-auto max-w-xl">

          <div className="mb-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-sm">
              <CreditCard size={22} />
            </div>

            <h1 className="mt-5 text-3xl font-bold tracking-tight">
              Test Payment
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Process a real Razorpay Test Mode payment
              through RevenueAI.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">

            <div className="mb-6 flex items-center justify-between rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3">
              <div>
                <p className="text-xs font-medium text-indigo-500">
                  Payment Environment
                </p>
                <p className="mt-1 font-semibold text-indigo-700">
                  Razorpay Test Mode
                </p>
              </div>

              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            </div>

            <div className="space-y-5">

              <div>
                <label className="text-sm font-medium text-slate-700">
                  Customer Email
                </label>

                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">
                  Amount
                </label>

                <div className="relative mt-2">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                    ₹
                  </span>

                  <input
                    type="number"
                    min="1"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-9 pr-4 text-sm outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                  />
                </div>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">
                    Amount to pay
                  </span>

                  <span className="text-xl font-bold text-slate-900">
                    ₹
                    {Number(amount || 0).toLocaleString("en-IN")}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handlePayment}
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-3.5 font-medium text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2
                      size={18}
                      className="animate-spin"
                    />
                    Opening Razorpay...
                  </>
                ) : (
                  <>
                    Pay ₹
                    {Number(amount || 0).toLocaleString("en-IN")}
                  </>
                )}
              </button>

              {message && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                  {message}
                </div>
              )}

              <div className="flex items-center justify-center gap-2 pt-2 text-xs text-slate-400">
                <ShieldCheck size={14} />
                Secure Razorpay Test Mode payment
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}