interface Incident {
  id: string;
  title: string;
  description: string;
  severity: string;
  status: string;
  revenueAtRisk: number;
  confidence: number;
  rootCause: string | null;
}

interface IncidentCardProps {
  incident: Incident;
}

export default function IncidentCard({
  incident,
}: IncidentCardProps) {
  const severityStyles: Record<string, string> = {
    LOW: "border-blue-200 bg-blue-50 text-blue-700",

    MEDIUM: "border-amber-200 bg-amber-50 text-amber-700",

    HIGH: "border-orange-200 bg-orange-50 text-orange-700",

    CRITICAL: "border-red-200 bg-red-50 text-red-700",
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      {/* Header */}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium text-indigo-600">
            Active Incident
          </p>

          <h2 className="mt-1 text-xl font-semibold text-slate-900">
            {incident.title}
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            {incident.description}
          </p>
        </div>

        {/* Severity */}

        <span
          className={`w-fit rounded-full border px-3 py-1.5 text-xs font-semibold ${
            severityStyles[incident.severity] ??
            "border-slate-200 bg-slate-50 text-slate-600"
          }`}
        >
          {incident.severity}
        </span>
      </div>

      {/* Details */}

      <div className="mt-6 grid gap-4 border-t border-slate-100 pt-6 sm:grid-cols-3">
        {/* Root Cause */}

        <div className="rounded-xl bg-slate-50 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Root Cause
          </p>

          <p className="mt-2 font-semibold text-slate-800">
            {incident.rootCause ?? "Unknown"}
          </p>
        </div>

        {/* AI Confidence */}

        <div className="rounded-xl bg-indigo-50 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-indigo-500">
            AI Confidence
          </p>

          <p className="mt-2 text-xl font-bold text-indigo-700">
            {(incident.confidence * 100).toFixed(0)}%
          </p>
        </div>

        {/* Status */}

        <div className="rounded-xl bg-emerald-50 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-emerald-600">
            Status
          </p>

          <div className="mt-2 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />

            <p className="font-semibold text-emerald-700">
              {incident.status}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}