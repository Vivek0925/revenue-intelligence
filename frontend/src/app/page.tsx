import Link from "next/link";

import {
  ArrowRight,
  BrainCircuit,
  ShieldCheck,
  TrendingUp,
  Zap,
  Activity,
  BarChart3,
} from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#f8fafc] text-[#0f172a]">
      {/* Navigation */}

      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/20">
            <TrendingUp size={22} />
          </div>

          <div>
            <h1 className="text-lg font-bold tracking-tight">
              RevenueAI
            </h1>

            <p className="text-xs text-slate-500">
              Revenue Intelligence Platform
            </p>
          </div>
        </div>

        <Link
          href="/dashboard"
          className="flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-indigo-600"
        >
          Open Dashboard
          <ArrowRight size={16} />
        </Link>
      </nav>

      {/* Hero Background */}

      <div className="relative">
        <div className="absolute left-1/2 top-0 -z-0 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-indigo-200/40 blur-3xl" />

        {/* Hero */}

        <section className="relative z-10 mx-auto flex max-w-7xl flex-col items-center px-6 pb-24 pt-20 text-center lg:pt-28">
          <div className="mb-7 flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-600">
            <Zap size={15} />
            AI-Powered Revenue Recovery
          </div>

          <h2 className="max-w-5xl text-5xl font-bold tracking-tight text-slate-900 sm:text-6xl lg:text-7xl">
            Stop losing revenue
            <br />

            <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              to payment failures.
            </span>
          </h2>

          <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-500">
            RevenueAI detects payment failures, identifies root causes,
            and intelligently orchestrates recovery actions to help your
            business recover lost revenue.
          </p>

          <div className="mt-10 flex flex-col gap-4 sm:flex-row">
            <Link
              href="/dashboard"
              className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-3.5 font-medium text-white shadow-lg shadow-indigo-500/20 transition hover:-translate-y-0.5 hover:shadow-xl"
            >
              View Recovery Dashboard
              <ArrowRight size={18} />
            </Link>

            <a
              href="http://localhost:5000/api/health"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl border border-slate-200 bg-white px-6 py-3.5 font-medium text-slate-700 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50"
            >
              Check API Status
            </a>
          </div>
        </section>
      </div>

      {/* Small Stats */}

      <section className="mx-auto grid max-w-5xl grid-cols-1 gap-4 px-6 pb-20 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 text-center shadow-sm">
          <Activity className="mx-auto mb-3 text-indigo-600" size={22} />

          <p className="text-2xl font-bold text-slate-900">
            Real-Time
          </p>

          <p className="mt-1 text-sm text-slate-500">
            Failure Detection
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 text-center shadow-sm">
          <BrainCircuit
            className="mx-auto mb-3 text-purple-600"
            size={22}
          />

          <p className="text-2xl font-bold text-slate-900">
            AI Driven
          </p>

          <p className="mt-1 text-sm text-slate-500">
            Recovery Decisions
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 text-center shadow-sm">
          <BarChart3
            className="mx-auto mb-3 text-emerald-600"
            size={22}
          />

          <p className="text-2xl font-bold text-slate-900">
            Automated
          </p>

          <p className="mt-1 text-sm text-slate-500">
            Revenue Recovery
          </p>
        </div>
      </section>

      {/* Features */}

      <section className="mx-auto max-w-7xl px-6 pb-24">
        <div className="mb-12 text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">
            Intelligence Pipeline
          </p>

          <h3 className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
            From failure detection to recovery.
          </h3>

          <p className="mx-auto mt-4 max-w-xl text-slate-500">
            A complete system for identifying revenue loss and taking
            controlled recovery actions.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {/* Feature 1 */}

          <div className="group rounded-2xl border border-slate-200 bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:border-red-200 hover:shadow-md">
            <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-red-500">
              <TrendingUp size={22} />
            </div>

            <h3 className="text-lg font-semibold text-slate-900">
              Failure Detection
            </h3>

            <p className="mt-3 text-sm leading-6 text-slate-500">
              Detect abnormal payment failure patterns and identify
              incidents before they create major revenue loss.
            </p>
          </div>

          {/* Feature 2 */}

          <div className="group rounded-2xl border border-slate-200 bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:border-purple-200 hover:shadow-md">
            <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
              <BrainCircuit size={22} />
            </div>

            <h3 className="text-lg font-semibold text-slate-900">
              AI Decision Engine
            </h3>

            <p className="mt-3 text-sm leading-6 text-slate-500">
              Analyze severity, confidence, root causes, and revenue at
              risk to determine the best recovery strategy.
            </p>
          </div>

          {/* Feature 3 */}

          <div className="group rounded-2xl border border-slate-200 bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:border-emerald-200 hover:shadow-md">
            <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <ShieldCheck size={22} />
            </div>

            <h3 className="text-lg font-semibold text-slate-900">
              Controlled Recovery
            </h3>

            <p className="mt-3 text-sm leading-6 text-slate-500">
              Execute individual payment recovery actions with retry
              limits, orchestration, tracking, and safety boundaries.
            </p>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}

      <section className="mx-auto max-w-7xl px-6 pb-16">
        <div className="rounded-3xl bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-12 text-center text-white sm:px-16">
          <h2 className="text-3xl font-bold">
            Your revenue recovery system.
          </h2>

          <p className="mx-auto mt-4 max-w-xl text-indigo-100">
            Monitor incidents, understand recovery decisions, and track
            exactly how much revenue your system recovers.
          </p>

          <Link
            href="/dashboard"
            className="mt-7 inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 font-medium text-indigo-700 transition hover:bg-indigo-50"
          >
            Explore Dashboard
            <ArrowRight size={17} />
          </Link>
        </div>
      </section>
    </main>
  );
}