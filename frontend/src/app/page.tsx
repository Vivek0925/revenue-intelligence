"use client";

import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  DollarSign,
  RefreshCw,
  ShieldAlert,
  TrendingUp,
  XCircle,
} from "lucide-react";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const recoveryData = [
  {
    name: "Expected",
    amount: 29489,
  },
  {
    name: "Recovered",
    amount: 16166,
  },
];

const recoveryStatusData = [
  {
    name: "Success",
    value: 5,
  },
  {
    name: "Failed",
    value: 3,
  },
];

const childActions = [
  {
    id: "Payment Recovery #1",
    amount: 5250,
    status: "SUCCESS",
  },
  {
    id: "Payment Recovery #2",
    amount: 1708,
    status: "FAILED",
  },
  {
    id: "Payment Recovery #3",
    amount: 3424,
    status: "FAILED",
  },
  {
    id: "Payment Recovery #4",
    amount: 1506,
    status: "SUCCESS",
  },
  {
    id: "Payment Recovery #5",
    amount: 5312,
    status: "SUCCESS",
  },
  {
    id: "Payment Recovery #6",
    amount: 4825,
    status: "SUCCESS",
  },
  {
    id: "Payment Recovery #7",
    amount: 4649,
    status: "FAILED",
  },
  {
    id: "Payment Recovery #8",
    amount: 2815,
    status: "SUCCESS",
  },
];

export default function Home() {
  const recoveryRate = 54.82;

  return (
    <main className="dashboard">
      {/* Sidebar */}

      <aside className="sidebar">
        <div className="logo">
          <div className="logo-icon">
            <TrendingUp size={22} />
          </div>

          <div>
            <h2>RevenueAI</h2>
            <span>Intelligence Platform</span>
          </div>
        </div>

        <nav>
          <a className="nav-item active">
            <TrendingUp size={19} />
            Dashboard
          </a>

          <a className="nav-item">
            <ShieldAlert size={19} />
            Incidents
          </a>

          <a className="nav-item">
            <RefreshCw size={19} />
            Recovery Actions
          </a>

          <a className="nav-item">
            <DollarSign size={19} />
            Revenue Analytics
          </a>
        </nav>

        <div className="sidebar-bottom">
          <div className="system-status">
            <span className="status-dot"></span>
            System Operational
          </div>
        </div>
      </aside>

      {/* Main Content */}

      <section className="content">
        {/* Header */}

        <header className="header">
          <div>
            <p className="eyebrow">REVENUE INTELLIGENCE</p>

            <h1>Recovery Dashboard</h1>

            <p className="subtitle">
              AI-powered payment failure detection and revenue recovery.
            </p>
          </div>

          <button className="refresh-button">
            <RefreshCw size={18} />
            Refresh Data
          </button>
        </header>

        {/* Stats */}

        <section className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon danger">
              <AlertTriangle size={22} />
            </div>

            <div>
              <p>Revenue At Risk</p>
              <h2>₹29,489</h2>
              <span className="negative">8 failed payments</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon success">
              <CheckCircle2 size={22} />
            </div>

            <div>
              <p>Revenue Recovered</p>
              <h2>₹16,166</h2>
              <span className="positive">5 successful recoveries</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon primary">
              <TrendingUp size={22} />
            </div>

            <div>
              <p>Recovery Rate</p>
              <h2>{recoveryRate}%</h2>
              <span className="positive">AI recovery performance</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon warning">
              <ShieldAlert size={22} />
            </div>

            <div>
              <p>Active Incident</p>
              <h2>1</h2>
              <span className="warning-text">Payment failure spike</span>
            </div>
          </div>
        </section>

        {/* Incident + AI */}

        <section className="top-grid">
          <div className="panel incident-panel">
            <div className="panel-header">
              <div>
                <p className="panel-label">ACTIVE INCIDENT</p>
                <h2>Payment Failure Spike Detected</h2>
              </div>

              <span className="severity medium">MEDIUM</span>
            </div>

            <div className="incident-details">
              <div>
                <span>Failure Rate</span>
                <strong>16.67%</strong>
              </div>

              <div>
                <span>Root Cause</span>
                <strong>BANK_TIMEOUT</strong>
              </div>

              <div>
                <span>AI Confidence</span>
                <strong>92%</strong>
              </div>
            </div>

            <div className="incident-footer">
              <AlertTriangle size={18} />

              <span>
                AI detected abnormal payment failure behavior requiring
                automated recovery.
              </span>
            </div>
          </div>

          <div className="panel ai-panel">
            <div className="panel-header">
              <div>
                <p className="panel-label">AI DECISION ENGINE</p>
                <h2>WAIT_AND_RETRY</h2>
              </div>

              <div className="ai-badge">AI</div>
            </div>

            <p className="ai-reason">
              Bank timeout detected. A delayed controlled retry is recommended.
            </p>

            <div className="ai-boundaries">
              <div>
                <span>Max Retries</span>
                <strong>3</strong>
              </div>

              <div>
                <span>Human Approval</span>
                <strong className="approved">Not Required</strong>
              </div>

              <div>
                <span>Daily Limit</span>
                <strong>100 Actions</strong>
              </div>
            </div>
          </div>
        </section>

        {/* Charts */}

        <section className="chart-grid">
          <div className="panel chart-panel">
            <div className="panel-header">
              <div>
                <p className="panel-label">RECOVERY PERFORMANCE</p>
                <h2>Expected vs Recovered Revenue</h2>
              </div>
            </div>

            <div className="chart">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={recoveryData}>
                  <CartesianGrid strokeDasharray="3 3" />

                  <XAxis dataKey="name" />

                  <YAxis />

                  <Tooltip />

                  <Bar dataKey="amount" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="panel chart-panel">
            <div className="panel-header">
              <div>
                <p className="panel-label">ACTION RESULTS</p>
                <h2>Recovery Outcomes</h2>
              </div>
            </div>

            <div className="pie-container">
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={recoveryStatusData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={65}
                    outerRadius={100}
                    paddingAngle={5}
                  >
                    {recoveryStatusData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={index === 0 ? "#22c55e" : "#ef4444"}
                      />
                    ))}
                  </Pie>

                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>

              <div className="chart-legend">
                <span>
                  <i className="success-dot"></i>
                  5 Successful
                </span>

                <span>
                  <i className="failed-dot"></i>
                  3 Failed
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Recovery Actions */}

        <section className="panel actions-panel">
          <div className="panel-header">
            <div>
              <p className="panel-label">RECOVERY PIPELINE</p>
              <h2>Individual Payment Recovery Actions</h2>
            </div>

            <span className="action-summary">
              5 Success · 3 Failed
            </span>
          </div>

          <div className="actions-list">
            {childActions.map((action) => (
              <div className="action-row" key={action.id}>
                <div className="action-info">
                  {action.status === "SUCCESS" ? (
                    <CheckCircle2
                      className="success-icon"
                      size={21}
                    />
                  ) : (
                    <XCircle className="failed-icon" size={21} />
                  )}

                  <span>{action.id}</span>
                </div>

                <div className="action-amount">
                  ₹{action.amount.toLocaleString()}
                </div>

                <span
                  className={`action-status ${
                    action.status === "SUCCESS"
                      ? "success-status"
                      : "failed-status"
                  }`}
                >
                  {action.status}
                </span>

                <ArrowUpRight size={18} className="action-arrow" />
              </div>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}