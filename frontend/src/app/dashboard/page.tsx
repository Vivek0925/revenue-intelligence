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
      <div className="absolute left-0 top-0 -z-10 h-[350px] w-full bg-gradient-to-b from-indigo-50 via-purple-50/20 to-transparent" />

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">

        {/* Header */}
        <DashboardHeader />

        {/* Overview */}
        <section className="mt-8">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Overview
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Monitor payment health and revenue recovery.
          </p>
        </section>

        {/* KPI Metrics */}
        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title="Revenue At Risk"
            value={formatCurrency(data.incident.revenueAtRisk)}
            subtitle="Failed payment value"
          />

          <MetricCard
            title="Recovered Revenue"
            value={formatCurrency(data.summary.totalActualRecovery)}
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

        {/* Main Overview */}
        <section className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <IncidentCard incident={data.incident} />

          <RecoveryOverview summary={data.summary} />
        </section>

        {/* Recovery Actions */}
        <section className="mt-6 pb-10">
          <ChildActionsTable actions={data.childActions} />
        </section>

      </div>
    </main>
  );
}