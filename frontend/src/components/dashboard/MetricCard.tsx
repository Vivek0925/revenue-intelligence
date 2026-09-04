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
    <div className="rounded-xl border border-white/10 bg-zinc-900 p-5">
      <p className="text-sm text-zinc-400">
        {title}
      </p>

      <h2 className="mt-2 text-3xl font-semibold text-white">
        {value}
      </h2>

      {subtitle && (
        <p className="mt-2 text-sm text-zinc-500">
          {subtitle}
        </p>
      )}
    </div>
  );
}