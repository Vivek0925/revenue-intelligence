interface RecoverySummary {
  totalChildActions: number;
  successfulActions: number;
  failedActions: number;
  pendingActions: number;
  totalExpectedRecovery: number;
  totalActualRecovery: number;
  recoveryRate: number;
}

interface RecoveryOverviewProps {
  summary: RecoverySummary;
}

export default function RecoveryOverview({
  summary,
}: RecoveryOverviewProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      {/* Header */}

      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-indigo-600">
            Recovery Performance
          </p>

          <h2 className="mt-1 text-xl font-semibold text-slate-900">
            Recovery Overview
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Track the overall performance of payment recovery actions.
          </p>
        </div>

        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2">
          <span className="text-lg font-bold text-emerald-700">
            {summary.recoveryRate}%
          </span>

          <p className="text-xs text-emerald-600">
            Recovery Rate
          </p>
        </div>
      </div>

      {/* Recovery Progress */}

      <div className="mt-8">
        <div className="flex flex-col gap-2 text-sm sm:flex-row sm:items-center sm:justify-between">
          <span className="font-medium text-slate-600">
            Recovery Progress
          </span>

          <span className="font-semibold text-slate-800">
            {formatCurrency(summary.totalActualRecovery)}
            <span className="mx-1 text-slate-400">/</span>
            {formatCurrency(summary.totalExpectedRecovery)}
          </span>
        </div>

        <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 transition-all duration-500"
            style={{
              width: `${Math.min(summary.recoveryRate, 100)}%`,
            }}
          />
        </div>
      </div>

      {/* Statistics */}

      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {/* Total */}

        <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
          <p className="text-xs font-medium text-slate-500">
            Total Actions
          </p>

          <p className="mt-2 text-2xl font-bold text-slate-900">
            {summary.totalChildActions}
          </p>
        </div>

        {/* Successful */}

        <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-4">
          <p className="text-xs font-medium text-emerald-700">
            Successful
          </p>

          <p className="mt-2 text-2xl font-bold text-emerald-600">
            {summary.successfulActions}
          </p>
        </div>

        {/* Failed */}

        <div className="rounded-xl border border-red-100 bg-red-50/60 p-4">
          <p className="text-xs font-medium text-red-700">
            Failed
          </p>

          <p className="mt-2 text-2xl font-bold text-red-600">
            {summary.failedActions}
          </p>
        </div>

        {/* Pending */}

        <div className="rounded-xl border border-amber-100 bg-amber-50/60 p-4">
          <p className="text-xs font-medium text-amber-700">
            Pending
          </p>

          <p className="mt-2 text-2xl font-bold text-amber-600">
            {summary.pendingActions}
          </p>
        </div>
      </div>
    </div>
  );
}