"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

import DashboardHeader from "@/components/dashboard/DashboardHeader";
import MetricCard from "@/components/dashboard/MetricCard";
import IncidentCard from "@/components/dashboard/IncidentCard";
import RecoveryOverview from "@/components/dashboard/RecoveryOverview";
import ChildActionsTable from "@/components/dashboard/ChildActionsTable";
import { getDashboardData } from "@/lib/api";

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = useCallback(async () => {
    try {
      const dashboardData = await getDashboardData();
      setData(dashboardData);
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();

    // Automatically refresh dashboard every 3 seconds
    const interval = setInterval(fetchDashboard, 3000);

    return () => clearInterval(interval);
  }, [fetchDashboard]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Initial loading state
  if (loading && !data) {
    return (
      <main className="min-h-screen bg-[#f8fafc] text-slate-900">
        <div className="absolute left-0 top-0 -z-10 h-[350px] w-full bg-gradient-to-b from-indigo-50 via-purple-50/20 to-transparent" />

        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <DashboardHeader />

          <section className="mt-8">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">
              Overview
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Loading payment health and revenue recovery...
            </p>
          </section>
        </div>
      </main>
    );
  }

  // Fresh database / no incidents
  if (!data?.incident) {
    return (
      <main className="min-h-screen bg-[#f8fafc] text-slate-900">
        <div className="absolute left-0 top-0 -z-10 h-[350px] w-full bg-gradient-to-b from-indigo-50 via-purple-50/20 to-transparent" />

        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <DashboardHeader />

          <section className="mt-8">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">
              Overview
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Monitor payment health and revenue recovery.
            </p>
          </section>

          <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              title="Revenue At Risk"
              value={formatCurrency(0)}
              subtitle="Failed payment value"
            />

            <MetricCard
              title="Recovered Revenue"
              value={formatCurrency(0)}
              subtitle="Successfully recovered"
            />

            <MetricCard
              title="Recovery Rate"
              value="0%"
              subtitle="Overall performance"
            />

            <MetricCard
              title="Failed Payments"
              value={0}
              subtitle="0 recovered"
            />
          </section>

          <section className="mt-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-10 shadow-sm">
              <div className="mx-auto max-w-xl text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                  <span className="text-2xl font-bold">✦</span>
                </div>

                <h2 className="mt-5 text-xl font-bold text-slate-900">
                  No payment incidents yet
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  RevenueAI is ready to monitor your payment activity.
                  Create a test payment and trigger a payment failure to
                  start detecting revenue incidents.
                </p>

                <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
                  <Link
                    href="/test-payment"
                    className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                  >
                    Create Test Payment
                  </Link>

                  <Link
                    href="/payments"
                    className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600"
                  >
                    View Payments
                  </Link>
                </div>
              </div>
            </div>
          </section>

          <section className="mt-6 pb-10">
            <div className="flex items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4">
              <div>
                <p className="text-sm font-semibold text-emerald-800">
                  RevenueAI is ready
                </p>

                <p className="mt-1 text-xs text-emerald-700">
                  Payment monitoring and recovery detection are active.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />

                <span className="text-xs font-medium text-emerald-700">
                  Operational
                </span>
              </div>
            </div>
          </section>
        </div>
      </main>
    );
  }

  // Normal dashboard
  return (
    <main className="min-h-screen bg-[#f8fafc] text-slate-900">
      <div className="absolute left-0 top-0 -z-10 h-[350px] w-full bg-gradient-to-b from-indigo-50 via-purple-50/20 to-transparent" />

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <DashboardHeader />

        <section className="mt-8">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Overview
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Monitor payment health and revenue recovery.
          </p>
        </section>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title="Revenue At Risk"
            value={formatCurrency(data.incident.revenueAtRisk / 100)}
            subtitle="Failed payment value"
          />

          <MetricCard
            title="Recovered Revenue"
            value={formatCurrency(
              data.summary.totalActualRecovery / 100,
            )}
            subtitle="Successfully recovered"
          />

          <MetricCard
            title="Recovery Rate"
            value={`${data.summary.recoveryRate}%`}
            subtitle="Overall performance"
          />

          <MetricCard
            title="Failed Payments"
            value={data.summary.totalChildActions}
            subtitle={`${data.summary.successfulActions} recovered`}
          />
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <IncidentCard incident={data.incident} />

          <RecoveryOverview summary={data.summary} />
        </section>

        <section className="mt-6 pb-10">
          <ChildActionsTable actions={data.childActions} />
        </section>
      </div>
    </main>
  );
}