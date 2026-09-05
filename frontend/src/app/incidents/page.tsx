import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Clock3,
  ShieldAlert,
} from "lucide-react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

async function getIncidents() {
  const response = await fetch(`${API_URL}/api/incidents`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Failed to fetch incidents");
  }

  return response.json();
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
}

export default async function IncidentsPage() {
  const data = await getIncidents();

  const incidents = data.incidents ?? [];

  return (
    <main className="min-h-screen bg-[#f8fafc] text-slate-900">
      {/* Background */}

      <div className="pointer-events-none absolute left-0 top-0 -z-0 h-[350px] w-full bg-gradient-to-b from-indigo-50 via-purple-50/30 to-transparent" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        {/* Header */}

        <div className="flex flex-col gap-5 border-b border-slate-200 pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link
              href="/dashboard"
              className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-indigo-600"
            >
              <ArrowLeft size={16} />
              Back to Dashboard
            </Link>

            <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">
              Revenue Intelligence
            </p>

            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Incident History
            </h1>

            <p className="mt-2 max-w-2xl text-slate-500">
              Review previous payment incidents, recovery performance,
              and the revenue recovered by the system.
            </p>
          </div>

          <div className="flex h-fit items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <ShieldAlert size={18} className="text-indigo-600" />

            <div>
              <p className="text-xs text-slate-500">
                Total Incidents
              </p>

              <p className="font-semibold text-slate-900">
                {incidents.length}
              </p>
            </div>
          </div>
        </div>

        {/* Incident List */}

        <section className="mt-8 space-y-4">
          {incidents.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
              <AlertCircle
                className="mx-auto text-slate-400"
                size={32}
              />

              <h2 className="mt-4 text-lg font-semibold text-slate-900">
                No incidents found
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                Payment incidents will appear here once they are detected.
              </p>
            </div>
          ) : (
            incidents.map((incident: any) => {
              const isSuccessful =
                incident.recoveryStatus === "SUCCESS";

              const isFailed =
                incident.recoveryStatus === "FAILED";

              return (
                <Link
                  key={incident.id}
                  href={`/incidents/${incident.id}`}
                  className="group block rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md"
                >
                  <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                    {/* Incident Info */}

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-3">
                        <h2 className="text-lg font-semibold text-slate-900">
                          {incident.title}
                        </h2>

                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                            incident.severity === "CRITICAL"
                              ? "border-red-200 bg-red-50 text-red-700"
                              : incident.severity === "HIGH"
                                ? "border-orange-200 bg-orange-50 text-orange-700"
                                : incident.severity === "MEDIUM"
                                  ? "border-amber-200 bg-amber-50 text-amber-700"
                                  : "border-blue-200 bg-blue-50 text-blue-700"
                          }`}
                        >
                          {incident.severity}
                        </span>
                      </div>

                      <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                        {incident.description}
                      </p>

                      <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-slate-500">
                        <span>
                          Root cause:{" "}
                          <strong className="text-slate-700">
                            {incident.rootCause ?? "Unknown"}
                          </strong>
                        </span>

                        <span className="hidden sm:block">•</span>

                        <span>
                          {formatDate(incident.createdAt)}
                        </span>
                      </div>
                    </div>

                    {/* Recovery */}

                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:w-[520px]">
                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-xs text-slate-500">
                          At Risk
                        </p>

                        <p className="mt-1 text-sm font-semibold text-slate-800">
                          {formatCurrency(
                            incident.revenueAtRisk,
                          )}
                        </p>
                      </div>

                      <div className="rounded-xl bg-emerald-50 p-3">
                        <p className="text-xs text-emerald-600">
                          Recovered
                        </p>

                        <p className="mt-1 text-sm font-semibold text-emerald-700">
                          {formatCurrency(
                            incident.summary.totalActualRecovery,
                          )}
                        </p>
                      </div>

                      <div className="rounded-xl bg-indigo-50 p-3">
                        <p className="text-xs text-indigo-600">
                          Recovery
                        </p>

                        <p className="mt-1 text-sm font-semibold text-indigo-700">
                          {incident.summary.recoveryRate}%
                        </p>
                      </div>

                      <div
                        className={`rounded-xl p-3 ${
                          isSuccessful
                            ? "bg-emerald-50"
                            : isFailed
                              ? "bg-red-50"
                              : "bg-amber-50"
                        }`}
                      >
                        <p className="text-xs text-slate-500">
                          Status
                        </p>

                        <div className="mt-1 flex items-center gap-1.5">
                          {isSuccessful ? (
                            <CheckCircle2
                              size={15}
                              className="text-emerald-600"
                            />
                          ) : isFailed ? (
                            <AlertCircle
                              size={15}
                              className="text-red-600"
                            />
                          ) : (
                            <Clock3
                              size={15}
                              className="text-amber-600"
                            />
                          )}

                          <span className="text-sm font-semibold text-slate-700">
                            {incident.recoveryStatus}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Arrow */}

                    <ArrowRight
                      size={20}
                      className="hidden text-slate-300 transition group-hover:translate-x-1 group-hover:text-indigo-500 lg:block"
                    />
                  </div>
                </Link>
              );
            })
          )}
        </section>
      </div>
    </main>
  );
}