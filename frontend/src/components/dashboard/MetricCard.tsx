interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
}

export default function MetricCard({
  title,
  value,
  subtitle,
}: MetricCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      {/* Title */}

      <p className="text-sm font-medium text-slate-500">
        {title}
      </p>

      {/* Value */}

      <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
        {value}
      </h2>

      {/* Subtitle */}

      {subtitle && (
        <div className="mt-4 border-t border-slate-100 pt-3">
          <p className="text-sm text-slate-500">
            {subtitle}
          </p>
        </div>
      )}
    </div>
  );
}