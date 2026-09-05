# RevenueAI

### AI-Powered Payment Failure Detection & Revenue Recovery

RevenueAI is an AI-powered payment recovery platform that detects failed payments, identifies their root cause, calculates revenue at risk, and recommends the safest recovery action.

Instead of treating a failed payment as the end of a transaction, RevenueAI turns it into an actionable incident and closes the loop when the revenue is recovered.

> **Detect the failure. Understand the problem. Recover the revenue.**

---

## 🎥 Demo

[![RevenueAI Demo](https://img.youtube.com/vi/6bzFHeXLLPc/maxresdefault.jpg)](https://youtu.be/6bzFHeXLLPc)

**Watch the demo:** https://youtu.be/6bzFHeXLLPc

---

# 🚨 Problem

Payment failures are common, but most systems only tell merchants that a payment failed.

Merchants still need to know:

- Why did it fail?
- How much revenue is at risk?
- Is it an isolated failure or a larger incident?
- Should the payment be retried?
- Should a human intervene?
- Was the lost revenue eventually recovered?

RevenueAI answers these questions automatically.

---

# 💡 Solution

```text
Customer Payment
       ↓
Razorpay
       ↓
Payment Failure
       ↓
Webhook
       ↓
Failure Classification
       ↓
Incident Detection
       ↓
Revenue At Risk
       ↓
AI Decision Engine
       ↓
Recovery / Human Escalation
       ↓
Customer Recovery Link
       ↓
Razorpay Payment
       ↓
Success Webhook
       ↓
Recovery Verified
       ↓
Incident Resolved

🏗️ Architecture

                         ┌──────────────┐
                         │   CUSTOMER   │
                         └──────┬───────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │    RAZORPAY     │
                       │    CHECKOUT     │
                       └────────┬────────┘
                                │
                         Payment Webhook
                                │
                                ▼
┌──────────────────────────────────────────────────┐
│              NODE.JS + EXPRESS                   │
│                                                  │
│  Payment API → Webhook Handler → AI Decision    │
│                         │              │          │
│                         ▼              ▼          │
│                 Failure Analysis   Recovery      │
│                         │              │          │
│                         └──────┬───────┘          │
│                                ▼                  │
│                         PostgreSQL                │
│                          + Prisma                 │
└──────────────────────────────────────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │   NEXT.JS UI    │
                       │                 │
                       │ Dashboard       │
                       │ Incidents       │
                       │ Payments        │
                       │ Recovery        │
                       └─────────────────┘


                       🔍 Failure Intelligence

RevenueAI classifies payment failures into structured root causes:

BANK_TIMEOUT
INSUFFICIENT_FUNDS
PAYMENT_DECLINED
AUTHENTICATION_FAILURE
PAYMENT_FAILURE

It also calculates:

Failure Rate
Failed Payments
─────────────── × 100
Total Payments
Revenue At Risk
Sum of Failed Payment Amounts
Recovery Rate
Recovered Revenue
───────────────── × 100
Revenue At Risk

Related failures are grouped into incidents so merchants can understand the bigger problem rather than individual transactions.

🤖 AI Decision Engine

The decision engine evaluates:

Root cause
Severity
Confidence
Revenue at risk
Retry limits
Human approval requirements

Possible decisions:

RETRY_PAYMENT
WAIT_AND_RETRY
ESCALATE_TO_HUMAN
NO_ACTION

High-risk incidents can require human approval instead of automatic recovery.

Recovery actions also have safety boundaries such as maximum retries and action limits.

🔗 Customer Recovery

When recovery is appropriate, the merchant generates a customer-facing recovery link.

Merchant
   ↓
Generate Recovery Link
   ↓
Customer Opens Link
   ↓
Razorpay Checkout
   ↓
Payment Success
   ↓
Webhook
   ↓
RecoveryAction = SUCCESS
   ↓
Incident = RESOLVED

This creates a complete failure-to-recovery loop.

🗃️ Database

Core Prisma models:

Merchant
Payment
Incident
RecoveryAction
Policy
AuditLog

The main relationship is:

Merchant
   ├── Payments
   ├── Incidents
   │      ├── Recovery Actions
   │      └── Audit Logs
   └── Policies
🛠️ Tech Stack
Layer	Technology
Frontend	Next.js, React, TypeScript
Styling	Tailwind CSS
Backend	Node.js, Express
Database	PostgreSQL
ORM	Prisma
Payments	Razorpay
Webhooks	Razorpay Webhooks
AI	AI Decision Engine
API	REST
📁 Project Structure
RevenueAI/
│
├── frontend/
│   └── src/
│       ├── app/
│       │   ├── dashboard/
│       │   ├── incidents/
│       │   ├── payments/
│       │   ├── test-payment/
│       │   └── recover/[actionId]/
│       └── components/
│
├── backend/
│   ├── src/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── lib/
│   │   └── server.ts
│   ├── prisma/
│   │   └── schema.prisma
│   └── scripts/
│
└── README.md
🚀 Getting Started
Backend
cd backend
npm install

Create .env:

DATABASE_URL=your_postgresql_connection_string
RAZORPAY_KEY_ID=your_razorpay_test_key
RAZORPAY_KEY_SECRET=your_razorpay_test_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret

Then:

npx prisma generate
npx prisma migrate dev
npm run dev

Backend:

http://localhost:5000
Frontend
cd frontend
npm install
npm run dev

Frontend:

http://localhost:3000
🔔 Razorpay Webhook

Configure:

https://YOUR_PUBLIC_URL/api/webhooks/razorpay

Enable:

payment.failed
payment.captured
payment.authorized
order.paid

For local development, expose port 5000 using a public tunnel.

🧪 Demo Flow
Create Test Payment
        ↓
Payment Fails
        ↓
Razorpay Webhook
        ↓
Incident Created
        ↓
AI Recovery Decision
        ↓
Generate Recovery Link
        ↓
Customer Pays
        ↓
Success Webhook
        ↓
Recovery Verified
        ↓
Revenue Recovered
🧹 Reset Demo Data

To clear demo data while keeping merchants:

cd backend
npm run cleanup

This clears:

Payments
Incidents
Recovery Actions
Audit Logs
🔐 Security

RevenueAI includes:

Server-side Razorpay signature verification
Environment-based secrets
Webhook processing
Recovery retry limits
Human approval for high-risk actions
Razorpay-hosted payment collection

RevenueAI does not directly store customer card information.

🔮 Future Improvements
Predict payment failures before they happen
Smarter retry timing
Alternative payment recommendations
Email / SMS / WhatsApp recovery
Multiple payment gateway support
Redis/BullMQ based background processing
Advanced revenue and recovery analytics
ML-based recovery probability
🎯 Core Idea

Traditional payment systems stop at:

Payment → SUCCESS / FAILED

RevenueAI continues:

Payment
   ↓
Failure
   ↓
Why?
   ↓
How much is at risk?
   ↓
What should we do?
   ↓
Can we recover it?
   ↓
Did recovery succeed?

RevenueAI turns payment failures into recoverable revenue.
