interface DashboardHeaderProps {
  title?: string;
  subtitle?: string;
}

export default function DashboardHeader({
  title = "Revenue Intelligence",
  subtitle = "AI-powered payment recovery monitoring",
}: DashboardHeaderProps) {
  return (
    <div className="flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-lg font-bold text-white shadow-sm">
            R
          </div>

          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              {title}
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              {subtitle}
            </p>
          </div>
        </div>
      </div>

      <div className="flex w-fit items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2">
        <span className="h-2 w-2 rounded-full bg-emerald-500" />

        <span className="text-sm font-medium text-emerald-700">
          System Operational
        </span>
      </div>
    </div>
  );
}