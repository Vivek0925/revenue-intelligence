interface ChildAction {
  id: string;
  type: string;
  status: string;
  reason: string | null;
  expectedRecovery: number | null;
  actualRecovery: number | null;
  retryCount: number;
  maxRetries: number;
  paymentId: string | null;
}

interface ChildActionsTableProps {
  actions: ChildAction[];
}

export default function ChildActionsTable({
  actions,
}: ChildActionsTableProps) {
  const formatCurrency = (amount: number | null) => {
    if (!amount) return "₹0";

    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const statusStyles: Record<string, string> = {
    SUCCESS:
      "bg-green-500/10 text-green-400 border-green-500/20",

    FAILED:
      "bg-red-500/10 text-red-400 border-red-500/20",

    PENDING:
      "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",

    EXECUTING:
      "bg-blue-500/10 text-blue-400 border-blue-500/20",

    APPROVED:
      "bg-purple-500/10 text-purple-400 border-purple-500/20",

    BLOCKED:
      "bg-orange-500/10 text-orange-400 border-orange-500/20",

    ESCALATED:
      "bg-red-500/10 text-red-400 border-red-500/20",
  };

  return (
    <div className="rounded-xl border border-white/10 bg-zinc-900">
      {/* Header */}

      <div className="flex items-center justify-between border-b border-white/10 p-6">
        <div>
          <p className="text-sm text-zinc-500">
            Recovery Actions
          </p>

          <h2 className="mt-1 text-xl font-semibold text-white">
            Individual Payment Recovery
          </h2>
        </div>

        <div className="rounded-lg bg-zinc-800 px-3 py-1 text-sm text-zinc-400">
          {actions.length} Actions
        </div>
      </div>

      {/* Table */}

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="border-b border-white/10 text-xs uppercase text-zinc-500">
            <tr>
              <th className="px-6 py-4 font-medium">
                Payment
              </th>

              <th className="px-6 py-4 font-medium">
                Status
              </th>

              <th className="px-6 py-4 font-medium">
                Expected
              </th>

              <th className="px-6 py-4 font-medium">
                Recovered
              </th>

              <th className="px-6 py-4 font-medium">
                Retries
              </th>
            </tr>
          </thead>

          <tbody>
            {actions.map((action) => (
              <tr
                key={action.id}
                className="border-b border-white/5 transition hover:bg-white/[0.02]"
              >
                {/* Payment ID */}

                <td className="px-6 py-4">
                  <p className="font-medium text-white">
                    {action.paymentId
                      ? `${action.paymentId.slice(0, 12)}...`
                      : "Unknown"}
                  </p>

                  <p className="mt-1 text-xs text-zinc-500">
                    {action.reason ?? "No reason provided"}
                  </p>
                </td>

                {/* Status */}

                <td className="px-6 py-4">
                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-medium ${
                      statusStyles[action.status] ??
                      "border-zinc-700 bg-zinc-800 text-zinc-400"
                    }`}
                  >
                    {action.status}
                  </span>
                </td>

                {/* Expected */}

                <td className="px-6 py-4 font-medium text-zinc-300">
                  {formatCurrency(action.expectedRecovery)}
                </td>

                {/* Actual */}

                <td className="px-6 py-4 font-medium">
                  <span
                    className={
                      action.status === "SUCCESS"
                        ? "text-green-400"
                        : "text-zinc-500"
                    }
                  >
                    {formatCurrency(action.actualRecovery)}
                  </span>
                </td>

                {/* Retry */}

                <td className="px-6 py-4 text-zinc-400">
                  {action.retryCount} / {action.maxRetries}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Empty State */}

      {actions.length === 0 && (
        <div className="p-10 text-center text-zinc-500">
          No recovery actions found.
        </div>
      )}
    </div>
  );
}