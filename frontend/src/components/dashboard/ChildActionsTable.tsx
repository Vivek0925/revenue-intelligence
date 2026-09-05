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
    }).format((amount ?? 0) / 100);
  };

  const statusStyles: Record<string, string> = {
    SUCCESS:
      "border-emerald-200 bg-emerald-50 text-emerald-700",

    FAILED:
      "border-red-200 bg-red-50 text-red-700",

    PENDING:
      "border-amber-200 bg-amber-50 text-amber-700",

    EXECUTING:
      "border-blue-200 bg-blue-50 text-blue-700",

    APPROVED:
      "border-purple-200 bg-purple-50 text-purple-700",

    BLOCKED:
      "border-orange-200 bg-orange-50 text-orange-700",

    ESCALATED:
      "border-red-200 bg-red-50 text-red-700",
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* Header */}

      <div className="flex flex-col gap-4 border-b border-slate-200 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-indigo-600">
            Recovery Actions
          </p>

          <h2 className="mt-1 text-xl font-semibold text-slate-900">
            Individual Payment Recovery
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Track recovery attempts for each failed payment.
          </p>
        </div>

        <div className="w-fit rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-1.5 text-sm font-medium text-indigo-700">
          {actions.length} Actions
        </div>
      </div>

      {/* Table */}

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-6 py-4 font-semibold">
                Payment
              </th>

              <th className="px-6 py-4 font-semibold">
                Status
              </th>

              <th className="px-6 py-4 font-semibold">
                Expected
              </th>

              <th className="px-6 py-4 font-semibold">
                Recovered
              </th>

              <th className="px-6 py-4 font-semibold">
                Retries
              </th>
            </tr>
          </thead>

          <tbody>
            {actions.map((action) => (
              <tr
                key={action.id}
                className="border-b border-slate-100 transition hover:bg-indigo-50/40"
              >
                {/* Payment */}

                <td className="px-6 py-4">
                  <p className="font-medium text-slate-800">
                    {action.paymentId
                      ? `${action.paymentId.slice(0, 12)}...`
                      : "Unknown"}
                  </p>

                  <p className="mt-1 max-w-xs truncate text-xs text-slate-500">
                    {action.reason ?? "No reason provided"}
                  </p>
                </td>

                {/* Status */}

                <td className="px-6 py-4">
                  <span
                    className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${
                      statusStyles[action.status] ??
                      "border-slate-200 bg-slate-50 text-slate-600"
                    }`}
                  >
                    {action.status}
                  </span>
                </td>

                {/* Expected */}

                <td className="px-6 py-4 font-medium text-slate-700">
                  {formatCurrency(action.expectedRecovery)}
                </td>

                {/* Actual */}

                <td className="px-6 py-4 font-medium">
                  <span
                    className={
                      action.status === "SUCCESS"
                        ? "text-emerald-600"
                        : "text-slate-400"
                    }
                  >
                    {formatCurrency(action.actualRecovery)}
                  </span>
                </td>

                {/* Retries */}

                <td className="px-6 py-4">
                  <span className="font-medium text-slate-700">
                    {action.retryCount}
                  </span>

                  <span className="text-slate-400">
                    {" "}
                    / {action.maxRetries}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Empty State */}

      {actions.length === 0 && (
        <div className="p-12 text-center">
          <p className="font-medium text-slate-700">
            No recovery actions found
          </p>

          <p className="mt-2 text-sm text-slate-500">
            Recovery actions will appear here when payments are processed.
          </p>
        </div>
      )}
    </div>
  );
}