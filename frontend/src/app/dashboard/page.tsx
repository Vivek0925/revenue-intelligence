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
    <main className="min-h-screen bg-[#09090b] text-white">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">

        {/* Header */}
        <DashboardHeader />

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

        {/* Incident */}
        <section className="mt-6">
          <IncidentCard incident={data.incident} />
        </section>

        {/* Recovery Overview */}
        <section className="mt-6">
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