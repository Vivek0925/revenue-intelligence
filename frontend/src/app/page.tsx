import Link from "next/link";
import {
  ArrowRight,
  BrainCircuit,
  ShieldCheck,
  TrendingUp,
  Zap,
} from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#09090b] text-white">
      {/* Navigation */}

      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600">
            <TrendingUp size={22} />
          </div>

          <div>
            <h1 className="font-semibold">RevenueAI</h1>
            <p className="text-xs text-zinc-500">
              Intelligence Platform
            </p>
          </div>
        </div>

        <Link
          href="/dashboard"
          className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-black transition hover:bg-zinc-200"
        >
          Open Dashboard
          <ArrowRight size={16} />
        </Link>
      </nav>

      {/* Hero */}

      <section className="mx-auto flex max-w-7xl flex-col items-center px-6 pb-20 pt-24 text-center lg:pt-32">
        <div className="mb-6 flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-4 py-2 text-sm text-blue-400">
          <Zap size={15} />
          AI-Powered Revenue Recovery
        </div>

        <h2 className="max-w-4xl text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
          Detect failures.
          <br />
          Recover revenue.
          <br />
          <span className="text-zinc-500">
            Automatically.
          </span>
        </h2>

        <p className="mt-8 max-w-2xl text-lg leading-8 text-zinc-400">
          RevenueAI detects payment failures, identifies root causes,
          makes intelligent recovery decisions, and helps recover lost
          revenue automatically.
        </p>

        <div className="mt-10 flex flex-col gap-4 sm:flex-row">
          <Link
            href="/dashboard"
            className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-medium transition hover:bg-blue-500"
          >
            View Recovery Dashboard
            <ArrowRight size={18} />
          </Link>

          <a
            href="http://localhost:5000/api/health"
            target="_blank"
            className="rounded-xl border border-white/10 px-6 py-3 font-medium text-zinc-300 transition hover:bg-white/5"
          >
            Check API Status
          </a>
        </div>
      </section>

      {/* Features */}

      <section className="mx-auto grid max-w-7xl gap-5 px-6 pb-20 md:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-zinc-900/50 p-6">
          <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-red-500/10 text-red-400">
            <TrendingUp size={21} />
          </div>

          <h3 className="text-lg font-semibold">
            Failure Detection
          </h3>

          <p className="mt-3 text-sm leading-6 text-zinc-500">
            Detect abnormal payment failure patterns before they cause
            significant revenue loss.
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-zinc-900/50 p-6">
          <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400">
            <BrainCircuit size={21} />
          </div>

          <h3 className="text-lg font-semibold">
            AI Decision Engine
          </h3>

          <p className="mt-3 text-sm leading-6 text-zinc-500">
            Analyze failure reasons and intelligently decide the best
            recovery strategy.
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-zinc-900/50 p-6">
          <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-green-500/10 text-green-400">
            <ShieldCheck size={21} />
          </div>

          <h3 className="text-lg font-semibold">
            Automated Recovery
          </h3>

          <p className="mt-3 text-sm leading-6 text-zinc-500">
            Execute controlled recovery actions and track every payment
            through the recovery pipeline.
          </p>
        </div>
      </section>
    </main>
  );
}