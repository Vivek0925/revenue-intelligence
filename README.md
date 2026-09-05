# RevenueAI

### AI-Powered Payment Failure Detection & Revenue Recovery

RevenueAI is an AI-powered payment recovery platform that detects failed payments, identifies their root cause, calculates revenue at risk, and recommends the safest recovery action.

Instead of treating a failed payment as the end of a transaction, RevenueAI turns it into an actionable incident and closes the loop when the revenue is recovered.

> **Detect the failure. Understand the problem. Recover the revenue.**

---

## 🎥 Demo

Watch the demo: [https://youtu.be/6bzFHeXLLPc](https://youtu.be/6bzFHeXLLPc)

---

## 🚨 Problem

Payment failures are common, but most payment systems stop at:

```
Payment → SUCCESS / FAILED
```

Merchants still need to know:

- Why did the payment fail?
- Is it an isolated failure or a larger problem?
- How much revenue is at risk?
- Should the payment be retried?
- Should a human intervene?
- Was the lost revenue eventually recovered?

RevenueAI is built to answer these questions and turn failed payments into actionable recovery workflows.

---

## 💡 Solution

```
Customer Payment
       ↓
Razorpay Checkout
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
Razorpay Checkout
       ↓
Success Webhook
       ↓
Recovery Verification
       ↓
Incident Resolved
       ↓
Revenue Recovered
```

---

## 🏗️ Architecture

RevenueAI uses a webhook-driven architecture. The frontend communicates with the backend through REST APIs, Razorpay handles payment processing, and payment events are sent back to the backend through webhooks.

```
┌──────────────────┐
│     CUSTOMER     │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│     RAZORPAY     │
│     CHECKOUT     │
└────────┬─────────┘
         │
  Payment / Webhook
         │
         ▼
┌──────────────────────────────────────┐
│          NODE.JS + EXPRESS            │
│                                        │
│  Payment API → Webhook Handler        │
│                         │              │
│                         ▼              │
│                 Failure Analysis      │
│                         │              │
│                         ▼              │
│                 Incident Engine       │
│                         │              │
│                         ▼              │
│                 AI Decision Engine    │
│                         │              │
│                         ▼              │
│                 Recovery Engine       │
└───────────────┬────────────────────────┘
                │
      ┌─────────┴─────────┐
      ▼                   ▼
┌──────────────┐   ┌──────────────────┐
│ PostgreSQL   │   │ Customer Recovery│
│ + Prisma     │   │ Page             │
└──────────────┘   └────────┬─────────┘
                            │
                            ▼
                   ┌──────────────────┐
                   │ Razorpay Checkout│
                   └──────────────────┘

                ▲
                │ REST API
                │
      ┌─────────┴─────────┐
      │   NEXT.JS FRONTEND │
      │                    │
      │ Dashboard          │
      │ Incidents          │
      │ Payments           │
      │ Test Payment       │
      │ Recovery           │
      └────────────────────┘
```

### Architecture Components

**Next.js Frontend**
- Merchant dashboard
- Incident management
- Payment views
- Test payments
- Customer recovery page

**Node.js + Express**
- Payment creation
- Payment verification
- Razorpay webhooks
- Failure analysis
- Incident detection
- AI decisions
- Recovery actions
- Audit logging

**PostgreSQL + Prisma**
- Merchants
- Payments
- Incidents
- Recovery actions
- Policies
- Audit logs

**Razorpay**
- Checkout
- Orders
- Payments
- Webhooks
- Payment verification

**AI Decision Engine**
- Evaluates incident context
- Recommends recovery actions
- Applies recovery safety boundaries

---

## 🔍 Failure Intelligence

RevenueAI converts payment failures into structured root causes:

- `BANK_TIMEOUT`
- `INSUFFICIENT_FUNDS`
- `PAYMENT_DECLINED`
- `AUTHENTICATION_FAILURE`
- `PAYMENT_FAILURE`

Related failures are grouped into incidents instead of treating every failed payment as a separate problem.

**Example:**

```
Payment A ─┐
Payment B ─┼──► PAYMENT_FAILURE_SPIKE
Payment C ─┘
```

### Failure Rate

```
Failed Payments
─────────────── × 100
Total Payments
```

### Revenue At Risk

```
Revenue At Risk = Sum of Failed Payment Amounts
```

### Recovery Rate

```
Recovered Revenue
───────────────── × 100
Revenue At Risk
```

---

## 🤖 AI Decision Engine

The decision engine evaluates:

- Root cause
- Incident severity
- Confidence
- Revenue at risk
- Retry limits
- Human approval requirements

**Possible decisions:**

- `RETRY_PAYMENT`
- `WAIT_AND_RETRY`
- `ESCALATE_TO_HUMAN`
- `NO_ACTION`

Higher-risk incidents can instead be escalated for human approval.

Recovery actions use safety boundaries such as maximum retries, human approval requirements, and action limits.

---

## 🔗 Customer Recovery

When recovery is appropriate, the merchant can generate a customer-facing recovery link.

```
Merchant
   ↓
Generate Recovery Link
   ↓
Customer Opens Link
   ↓
RevenueAI Creates Recovery Order
   ↓
Razorpay Checkout
   ↓
Customer Completes Payment
   ↓
Razorpay Webhook
   ↓
Recovery Verified
   ↓
RecoveryAction = SUCCESS
   ↓
Incident = RESOLVED
```

This creates a complete failure-to-recovery loop.

---

## ⚡ Webhook Processing

### Failed Payment

```
Razorpay
   │
   │ payment.failed
   ▼
Webhook Handler
   │
   ├── Find Payment
   ├── Mark FAILED
   ├── Classify Root Cause
   ├── Calculate Failure Rate
   ├── Calculate Revenue At Risk
   ├── Create / Update Incident
   ├── Run AI Decision
   └── Create Recovery Action
```

### Successful Recovery

```
Razorpay
   │
   │ payment.captured
   ▼
Webhook Handler
   │
   ├── Find Recovery Action
   ├── Verify Payment
   ├── Mark Recovery SUCCESS
   ├── Update Actual Recovery
   ├── Resolve Incident
   └── Update Dashboard
```

---

## 🗃️ Database

Core Prisma models:

```
Merchant
Payment
Incident
RecoveryAction
Policy
AuditLog
```

**Relationships:**

```
Merchant
   ├── Payments
   ├── Incidents
   │      ├── Recovery Actions
   │      └── Audit Logs
   └── Policies

Payment
   └── Recovery Actions

RecoveryAction
   ├── Incident
   ├── Payment
   └── Child Recovery Actions
```

---

## 📈 Dashboard

The merchant dashboard provides a view of payment health and recovery. It includes:

- Revenue At Risk
- Recovered Revenue
- Recovery Rate
- Failed Payments
- Active Incidents
- Recovery Actions
- Recovery Status

The dashboard periodically refreshes data so changes from payment and recovery events appear automatically.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js, React, TypeScript |
| Styling | Tailwind CSS |
| Backend | Node.js, Express |
| Database | PostgreSQL |
| ORM | Prisma |
| Payments | Razorpay |
| Webhooks | Razorpay Webhooks |
| API | REST |
| AI | AI Decision Engine |

---

## 📁 Project Structure

```
RevenueAI/
│
├── frontend/
│   └── src/
│       ├── app/
│       │   ├── dashboard/
│       │   ├── incidents/
│       │   │   └── [id]/
│       │   ├── payments/
│       │   ├── test-payment/
│       │   └── recover/
│       │       └── [actionId]/
│       │
│       └── components/
│
├── backend/
│   ├── src/
│   │   ├── routes/
│   │   │   ├── payments.ts
│   │   │   ├── recovery.ts
│   │   │   ├── incidents.ts
│   │   │   └── webhooks.ts
│   │   ├── services/
│   │   │   ├── razorpay.service.ts
│   │   │   └── decision.service.ts
│   │   ├── lib/
│   │   │   └── prisma.ts
│   │   └── server.ts
│   │
│   ├── prisma/
│   │   └── schema.prisma
│   │
│   └── scripts/
│
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js
- npm
- PostgreSQL
- Razorpay Test Mode account
- Public tunnel for local webhook testing

### Backend

```bash
cd backend
npm install
```

Create `backend/.env`:

```env
DATABASE_URL=your_postgresql_connection_string

RAZORPAY_KEY_ID=your_razorpay_test_key
RAZORPAY_KEY_SECRET=your_razorpay_test_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret
```

Generate Prisma Client and run migrations:

```bash
npx prisma generate
npx prisma migrate dev
```

Start the backend:

```bash
npm run dev
```

Backend: `http://localhost:5000`

### Frontend

Open another terminal:

```bash
cd frontend
npm install
npm run dev
```

Frontend: `http://localhost:3000`

---

## 🔔 Razorpay Webhook Setup

Configure the Razorpay webhook endpoint:

```
https://YOUR_PUBLIC_URL/api/webhooks/razorpay
```

Enable:

- `payment.failed`
- `payment.captured`
- `payment.authorized`
- `order.paid`

For local development, expose port 5000 using a public tunnel.

Use Razorpay Test Mode for development and demonstrations.

---

## 🧪 Demo Flow

```
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
```

---

## 🧹 Reset Demo Data

To start a fresh demonstration:

```bash
cd backend
npm run cleanup
```

This clears:

- Payments
- Incidents
- Recovery Actions
- Audit Logs

Merchant records are preserved.

---

## 🔐 Security

RevenueAI includes:

- Server-side Razorpay signature verification
- Environment-based secrets
- Webhook processing
- Recovery retry limits
- Human approval for high-risk actions
- Razorpay-hosted payment collection

RevenueAI does not directly store customer card information.

---

## 🧠 Key Engineering Decisions

**Webhook-driven architecture**
Payment state is updated through Razorpay events instead of relying on manual status checks.

**Incident-based monitoring**
Related payment failures are grouped into incidents to provide a broader view of payment problems.

**Payment-level recovery**
Recovery actions can be linked to the specific failed payment.

**Controlled automation**
AI decisions are constrained by retry limits and human approval requirements.

**Customer recovery links**
Merchants can send customers directly to a recovery checkout instead of manually recreating transactions.

---

## 🔮 Future Improvements

- Predict payment failures before they happen
- Smarter retry timing
- Alternative payment recommendations
- Email / SMS / WhatsApp recovery
- Multiple payment gateway support
- Redis / BullMQ based background processing
- Advanced revenue analytics
- ML-based recovery probability
- Gateway performance analytics
- Proactive payment anomaly detection

---

## 🎯 Core Idea

Traditional payment systems stop at:

```
Payment → SUCCESS / FAILED
```

RevenueAI continues:

```
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
```

**RevenueAI turns payment failures into recoverable revenue.**

---

## 📍 Project Status

RevenueAI currently demonstrates an end-to-end payment recovery workflow using Razorpay Test Mode:

```
Payment Creation
       ↓
Razorpay Checkout
       ↓
Payment Failure
       ↓
Webhook Detection
       ↓
Failure Classification
       ↓
Incident Creation
       ↓
Revenue At Risk
       ↓
AI Recovery Decision
       ↓
Recovery Action
       ↓
Recovery Link
       ↓
Customer Payment
       ↓
Recovery Webhook
       ↓
Recovery Verification
       ↓
Incident Resolution
       ↓
Recovered Revenue
```

---

## 📄 License

Built as a hackathon project for demonstration and educational purposes.
