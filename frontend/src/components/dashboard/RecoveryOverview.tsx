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
    <div className="rounded-xl border border-white/10 bg-zinc-900 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-zinc-500">
            Recovery Performance
          </p>

          <h2 className="mt-1 text-xl font-semibold text-white">
            Recovery Overview
          </h2>
        </div>

        <div className="rounded-lg border border-green-500/20 bg-green-500/10 px-3 py-2">
          <span className="text-lg font-semibold text-green-400">
            {summary.recoveryRate}%
          </span>
        </div>
      </div>

      <div className="mt-6">
        <div className="flex justify-between text-sm">
          <span className="text-zinc-400">
            Recovery Progress
          </span>

          <span className="text-white">
            {formatCurrency(summary.totalActualRecovery)} /{" "}
            {formatCurrency(summary.totalExpectedRecovery)}
          </span>
        </div>

        <div className="mt-3 h-3 overflow-hidden rounded-full bg-zinc-800">
          <div
            className="h-full rounded-full bg-green-500 transition-all"
            style={{
              width: `${Math.min(summary.recoveryRate, 100)}%`,
            }}
          />
        </div>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-lg bg-zinc-800/60 p-4">
          <p className="text-xs text-zinc-500">
            Total Actions
          </p>

          <p className="mt-2 text-2xl font-semibold text-white">
            {summary.totalChildActions}
          </p>
        </div>

        <div className="rounded-lg bg-zinc-800/60 p-4">
          <p className="text-xs text-zinc-500">
            Successful
          </p>

          <p className="mt-2 text-2xl font-semibold text-green-400">
            {summary.successfulActions}
          </p>
        </div>

        <div className="rounded-lg bg-zinc-800/60 p-4">
          <p className="text-xs text-zinc-500">
            Failed
          </p>

          <p className="mt-2 text-2xl font-semibold text-red-400">
            {summary.failedActions}
          </p>
        </div>

        <div className="rounded-lg bg-zinc-800/60 p-4">
          <p className="text-xs text-zinc-500">
            Pending
          </p>

          <p className="mt-2 text-2xl font-semibold text-yellow-400">
            {summary.pendingActions}
          </p>
        </div>
      </div>
    </div>
  );
}