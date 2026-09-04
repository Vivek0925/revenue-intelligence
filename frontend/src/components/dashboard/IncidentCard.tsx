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
    LOW: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    MEDIUM: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    HIGH: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    CRITICAL: "bg-red-500/10 text-red-400 border-red-500/20",
  };

  return (
    <div className="rounded-xl border border-white/10 bg-zinc-900 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm text-zinc-500">
            Active Incident
          </p>

          <h2 className="mt-1 text-xl font-semibold text-white">
            {incident.title}
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
            {incident.description}
          </p>
        </div>

        <span
          className={`w-fit rounded-full border px-3 py-1 text-xs font-medium ${
            severityStyles[incident.severity] ??
            "border-zinc-700 bg-zinc-800 text-zinc-300"
          }`}
        >
          {incident.severity}
        </span>
      </div>

      <div className="mt-6 grid gap-4 border-t border-white/10 pt-5 sm:grid-cols-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-zinc-500">
            Root Cause
          </p>

          <p className="mt-1 font-medium text-white">
            {incident.rootCause ?? "Unknown"}
          </p>
        </div>

        <div>
          <p className="text-xs uppercase tracking-wide text-zinc-500">
            AI Confidence
          </p>

          <p className="mt-1 font-medium text-white">
            {(incident.confidence * 100).toFixed(0)}%
          </p>
        </div>

        <div>
          <p className="text-xs uppercase tracking-wide text-zinc-500">
            Status
          </p>

          <p className="mt-1 font-medium text-green-400">
            {incident.status}
          </p>
        </div>
      </div>
    </div>
  );
}