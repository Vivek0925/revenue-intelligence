import Link from "next/link";
import {
  ArrowRight,
  CreditCard,
  History,
  Plus,
} from "lucide-react";

interface DashboardHeaderProps {
  title?: string;
  subtitle?: string;
}

export default function DashboardHeader({
  title = "RevenueAI",
  subtitle = "AI-powered revenue recovery",
}: DashboardHeaderProps) {
  return (
    <header className="border-b border-slate-200 pb-5">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-sm font-bold text-white">
            R
          </div>

          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              {title}
            </h1>

            <p className="text-sm text-slate-500">
              {subtitle}
            </p>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex flex-wrap items-center gap-2">

          <Link
            href="/payments"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600"
          >
            <CreditCard size={16} />
            Payments
          </Link>

          <Link
            href="/incidents"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600"
          >
            <History size={16} />
            Incidents
          </Link>

          <Link
            href="/payments"
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3.5 py-2 text-sm font-medium text-white transition hover:bg-indigo-600"
          >
            <Plus size={16} />
            Test Payment
          </Link>

          <div className="ml-1 flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span className="text-xs font-medium text-emerald-700">
              Test Mode
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}