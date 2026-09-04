import DashboardHeader from "@/components/dashboard/DashboardHeader";

import MetricCard from "@/components/dashboard/MetricCard";

import IncidentCard from "@/components/dashboard/IncidentCard";

import RecoveryOverview from "@/components/dashboard/RecoveryOverview";

import ChildActionsTable from "@/components/dashboard/ChildActionsTable";

import { getDashboardData } from "@/lib/api";

export default async function DashboardPage() {
  const data = await getDashboardData();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <main className="min-h-screen bg-[#f8fafc] text-slate-900">
      {/* Subtle top background */}

      <div className="absolute left-0 top-0 -z-10 h-[400px] w-full bg-gradient-to-b from-indigo-50 via-purple-50/30 to-transparent" />

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">

        {/* Header */}

        <DashboardHeader />

        {/* Page Introduction */}

        <section className="mt-8">
          <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">
            Revenue Intelligence
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Recovery Dashboard
          </h1>

          <p className="mt-2 text-slate-500">
            Monitor payment failures, recovery actions, and recovered
            revenue in one place.
          </p>
        </section>

        {/* Metrics */}

        <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title="Revenue At Risk"
            value={formatCurrency(data.incident.revenueAtRisk)}
            subtitle="Total failed payment value"
          />

          <MetricCard
            title="Recovered Revenue"
            value={formatCurrency(data.summary.totalActualRecovery)}
            subtitle="Successfully recovered"
          />

          <MetricCard
            title="Recovery Rate"
            value={`${data.summary.recoveryRate}%`}
            subtitle="Recovery performance"
          />

          <MetricCard
            title="Failed Payments"
            value={data.summary.totalChildActions}
            subtitle={`${data.summary.successfulActions} successfully recovered`}
          />
        </section>

        {/* Main Grid */}

        <section className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          {/* Incident */}

          <IncidentCard incident={data.incident} />

          {/* Recovery */}

          <RecoveryOverview summary={data.summary} />
        </section>

        {/* Child Actions */}

        <section className="mt-6 pb-10">
          <ChildActionsTable actions={data.childActions} />
        </section>
      </div>
    </main>
  );
}