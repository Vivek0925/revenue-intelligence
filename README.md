# RevenueAI

**AI-powered payment failure detection & revenue recovery**

Most payment systems treat a failed transaction as the end of the story: `SUCCESS` or `FAILED`, and that's it. But merchants are the ones left holding the questions — why did it fail, is this a one-off or the start of a bigger problem, how much money is actually at risk, and is there anything worth doing about it?

RevenueAI was built to answer those questions instead of ignoring them. It watches for payment failures coming through Razorpay, figures out what actually went wrong, groups related failures into incidents, and decides whether to retry automatically, wait, or hand it off to a human. If recovery makes sense, it can generate a link for the customer to complete the payment — and it tracks the whole thing through to resolution.

**Demo:**

[![RevenueAI Demo](https://img.youtube.com/vi/6bzFHeXLLPc/maxresdefault.jpg)](https://youtu.be/6bzFHeXLLPc)

---

## The problem, basically

Payment failures happen all the time, and in most systems they just... disappear. Nobody's asking why the payment failed, whether it's isolated, how much revenue is actually sitting at risk, or whether a retry would even help. That's the gap RevenueAI is trying to close — turning a failed payment from a dead end into something actionable.

---

## How it flows

```
Customer pays → Razorpay Checkout → Payment fails → Webhook fires
   → Failure gets classified → Incident created (if it's part of a pattern)
   → Revenue at risk calculated → AI decides what to do
   → Retry, wait, or escalate to a human
   → If recovery makes sense, a link goes to the customer
   → Customer pays → Success webhook → Incident resolved
```

---

## Architecture

It's a fairly standard webhook-driven setup — nothing exotic, just wired together carefully.

```
CUSTOMER → RAZORPAY CHECKOUT → (payment / webhook)
                    │
                    ▼
        ┌───────────────────────────┐
        │     NODE.JS + EXPRESS     │
        │  Payment API → Webhook    │
        │  → Failure Analysis       │
        │  → Incident Engine        │
        │  → AI Decision Engine     │
        │  → Recovery Engine        │
        └─────────┬─────────┬───────┘
                  ▼         ▼
        PostgreSQL      Customer Recovery Page
        + Prisma           → Razorpay Checkout
                  ▲
                  │ REST API
        NEXT.JS FRONTEND
        (Dashboard, Incidents, Payments, Test Payment, Recovery)
```

The **frontend** (Next.js) is where merchants actually see and manage things — dashboard, incident views, payment history, a test-payment page, and the customer-facing recovery page.

The **backend** (Express) does the real work: creating and verifying payments, handling Razorpay webhooks, analyzing failures, running the AI decision logic, kicking off recovery actions, and logging everything for audit purposes.

**Postgres + Prisma** hold merchants, payments, incidents, recovery actions, policies, and audit logs. **The AI decision engine** looks at incident context and recommends what to do next, staying inside whatever safety limits are configured.

---

## Turning failures into something useful

Every failed payment gets classified into a root cause: `BANK_TIMEOUT`, `INSUFFICIENT_FUNDS`, `PAYMENT_DECLINED`, `AUTHENTICATION_FAILURE`, or a generic `PAYMENT_FAILURE`. When several failures look related, they get grouped into a single incident instead of being treated as separate problems — a burst of similar failures might get flagged as a `PAYMENT_FAILURE_SPIKE`, for example.

A few numbers the system tracks:

- **Failure rate** — failed payments ÷ total payments × 100
- **Revenue at risk** — the total value of failed payments
- **Recovery rate** — recovered revenue ÷ revenue at risk × 100

---

## The decision engine

This is the part deciding what happens next. It looks at the root cause, how severe the incident is, its confidence in that read, how much revenue is on the line, and whether retry limits or approval requirements apply. From there it lands on one of: `RETRY_PAYMENT`, `WAIT_AND_RETRY`, `ESCALATE_TO_HUMAN`, or `NO_ACTION`.

It's intentionally not fully autonomous — anything above a certain risk threshold gets kicked to a human instead of retried blindly, and there are hard limits on retries so it can't spiral.

---

## Getting the customer to pay again

When a recovery attempt makes sense, the merchant can generate a link and send it to the customer. That link creates a fresh recovery order, sends the customer through Razorpay Checkout again, and once the payment succeeds, the webhook marks the recovery action as successful and closes out the incident. It's basically a clean way to say "hey, that payment didn't go through — try again here" without the merchant having to manually recreate anything.

---

## What happens on each webhook

**When a payment fails:** find the payment, mark it failed, classify why, recalculate the failure rate and revenue at risk, create or update the relevant incident, run the AI decision, and create a recovery action if warranted.

**When a recovery payment succeeds:** find the recovery action, verify the payment, mark it successful, update the actual recovered amount, resolve the incident, and let the dashboard pick up the change.

---

## Data model

Core Prisma models: `Merchant`, `Payment`, `Incident`, `RecoveryAction`, `Policy`, `AuditLog`.

A merchant has payments, incidents, and policies. Each incident can have multiple recovery actions and audit log entries. A payment can have its own recovery actions, and a recovery action links back to its incident, its payment, and can even have follow-up (child) recovery actions if the first attempt didn't stick.

---

## Dashboard

Nothing fancy — just the numbers a merchant actually cares about: revenue at risk, revenue recovered, recovery rate, failed payments, active incidents, and the status of ongoing recovery actions. It refreshes on its own so you're not stuck hitting F5 during a demo.

---

## Stack

| Layer | What's used |
|---|---|
| Frontend | Next.js, React, TypeScript, Tailwind |
| Backend | Node.js, Express |
| Database | PostgreSQL + Prisma |
| Payments | Razorpay (Checkout, Orders, Webhooks) |
| API | REST |
| AI | Custom decision engine |

---

## Project layout

```
RevenueAI/
├── frontend/src/
│   ├── app/
│   │   ├── dashboard/
│   │   ├── incidents/[id]/
│   │   ├── payments/
│   │   ├── test-payment/
│   │   └── recover/[actionId]/
│   └── components/
├── backend/
│   ├── src/
│   │   ├── routes/        (payments, recovery, incidents, webhooks)
│   │   ├── services/      (razorpay.service.ts, decision.service.ts)
│   │   ├── lib/prisma.ts
│   │   └── server.ts
│   ├── prisma/schema.prisma
│   └── scripts/
└── README.md
```

---

## Running it locally

You'll need Node.js, npm, a Postgres instance, a Razorpay test-mode account, and something like ngrok to expose your local backend for webhooks.

**Backend:**
```bash
cd backend
npm install
```

Add a `.env` file:
```env
DATABASE_URL=your_postgresql_connection_string
RAZORPAY_KEY_ID=your_razorpay_test_key
RAZORPAY_KEY_SECRET=your_razorpay_test_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret
```

Then:
```bash
npx prisma generate
npx prisma migrate dev
npm run dev
```
Runs on `http://localhost:5000`.

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```
Runs on `http://localhost:3000`.

**Webhooks:** point Razorpay at `https://YOUR_PUBLIC_URL/api/webhooks/razorpay` and turn on `payment.failed`, `payment.captured`, `payment.authorized`, and `order.paid`. Test mode only, obviously.

**Resetting demo data**, if you need a clean slate between runs:
```bash
cd backend
npm run cleanup
```
This wipes payments, incidents, recovery actions, and audit logs, but leaves merchant records alone.

---

## Security notes

Razorpay signatures are verified server-side, secrets live in environment variables, retries are capped, and anything high-risk needs human sign-off before it goes further. Card details never touch our servers — Razorpay handles all of that.

---

## Why it's built this way

A few decisions worth explaining:

**Webhooks over polling** — payment state changes because Razorpay tells us, not because we're constantly checking.

**Grouping failures into incidents** — a single failed payment isn't that interesting on its own, but ten of them in ten minutes is a signal worth acting on.

**Recovery tied to the actual payment** — every recovery action knows exactly which payment it's trying to fix, so nothing gets mixed up.

**Automation with guardrails** — the AI can act, but only within limits; anything risky goes to a person.

**Recovery links instead of manual re-entry** — customers get a direct path back to checkout instead of the merchant having to recreate the transaction by hand.

---

## What's next

Things on the roadmap: predicting failures before they happen, smarter retry timing instead of fixed intervals, suggesting alternative payment methods, recovery via email/SMS/WhatsApp, support for gateways beyond Razorpay, background job processing with Redis/BullMQ, deeper analytics, and eventually a proper ML model for recovery probability instead of rule-based heuristics.

---

## License

Built as a hackathon project, for demonstration and learning purposes.
