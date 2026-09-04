interface DashboardHeaderProps {
  title?: string;
  subtitle?: string;
}

export default function DashboardHeader({
  title = "Revenue Intelligence",
  subtitle = "AI-powered payment recovery monitoring",
}: DashboardHeaderProps) {
  return (
    <div className="flex flex-col gap-2 border-b border-white/10 pb-6 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">
          {title}
        </h1>

        <p className="mt-1 text-sm text-zinc-400">
          {subtitle}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-green-500" />

        <span className="text-sm text-zinc-400">
          System Operational
        </span>
      </div>
    </div>
  );
}