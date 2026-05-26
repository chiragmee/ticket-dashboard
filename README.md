# TicketView

> A purpose-built Zendesk ticket management dashboard with AI-powered classification, SLA tracking, real-time updates, and reporting.

**Live:** [ticket-dashboard-teal.vercel.app](https://ticket-dashboard-teal.vercel.app)

---

## Why this exists

Zendesk's native interface works well as a ticketing backend, but it lacks:
- **Domain-scoped access control** — agents seeing only tickets relevant to their team
- **Automated SLA tracking** — breach detection and proactive alerts
- **AI classification** — consistent category, priority, and domain tagging at the point of ingestion
- **Consolidated reporting** — a manager-friendly summary view with export options

TicketView sits in front of Zendesk and solves all of these.

---

## Features

### Ticket Dashboard
- Paginated ticket list with real-time updates (no refresh needed)
- Filter by status, category, domain, assignee, date range, or free-text search
- Clickable category bars — click a category to filter the table instantly
- Export current view to CSV

### AI Classification
- Every ticket that comes in (via webhook or manual sync) is automatically classified by Claude Haiku
- Classifies: **Category** (bug / feature / query / other), **Priority** (urgent / high / normal / low), **Domain** (configurable per deployment)
- Removes manual tagging entirely

### SLA Management
- Define SLA policies per domain and/or category (e.g. "bugs in Team A → resolve within 4 hours")
- SLA breach time is computed and stored per ticket on sync
- Daily cron job scans for breaches and near-breaches, sends email alerts
- SLA compliance % tracked in reports

### Reports
- Generate a summary for any date range and domain
- KPI cards: total, open, pending, in progress, resolved, overdue, SLA compliance, avg CSAT
- Breakdown charts: by category, status, priority, domain
- Export as **CSV** (raw data) or **PDF** (print-ready summary of the report view)

### Ticket Detail
- Chat-style comment thread pulled from Zendesk
- Update status, add public/private replies — synced back to Zendesk in real-time
- Send & Resolve in one click

### Email Notifications (via Resend)
- Acknowledgment email on ticket creation
- Resolution email with a 1–5 CSAT survey link
- SLA breach and warning alerts to agents/admins

### User Management
- Invite-based onboarding (no self-signup)
- Role-based access: **Admin** (full access) and **Agent** (domain-scoped)
- Domain access enforced server-side on every API call

---

## Tech Stack

| | |
|---|---|
| Framework | Next.js 14 (App Router) |
| UI | React 19, Tailwind CSS v4 |
| Database | Supabase (PostgreSQL + Realtime) |
| Auth | Supabase Auth |
| AI | Anthropic Claude Haiku |
| Email | Resend |
| Deployment | Vercel |

---

## How it works

```
Zendesk
  │
  ├── Webhook (real-time) ──→ /api/webhooks/zendesk
  │                                │
  └── Manual sync ──────→ /api/sync/zendesk
                                   │
                            AI Classification
                            (Claude Haiku)
                                   │
                            Supabase (tickets table)
                                   │
                    ┌──────────────┼──────────────┐
                    │              │              │
               Dashboard       Reports       Ticket Detail
               (real-time)    (summary)      (comments + status)
```

---

## Getting Started

### Prerequisites
- Node.js 18+
- A [Supabase](https://supabase.com) project
- A [Zendesk](https://zendesk.com) account with API access
- An [Anthropic](https://anthropic.com) API key
- A [Resend](https://resend.com) account for emails

### 1. Clone and install

```bash
git clone https://github.com/Chiragmee/ticket-dashboard.git
cd ticket-dashboard
npm install
```

### 2. Set up environment variables

Copy the example below into a `.env.local` file and fill in your values:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Zendesk
ZENDESK_SUBDOMAIN=your_zendesk_subdomain
ZENDESK_EMAIL=your_zendesk_admin_email
ZENDESK_API_TOKEN=your_zendesk_api_token
ZENDESK_WEBHOOK_SECRET=your_webhook_secret

# Anthropic (AI classification)
ANTHROPIC_API_KEY=your_anthropic_api_key

# Resend (email)
RESEND_API_KEY=your_resend_api_key
EMAIL_FROM=support@yourdomain.com

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
SYNC_SECRET=a_random_secret_for_internal_sync_calls
```

### 3. Set up the database

Run the migration in your Supabase SQL editor:

```bash
supabase/migrations/001_tickets_schema.sql
```

Then create the additional tables for `user_profiles`, `sla_policies`, and `ticket_csat` — see the schema section below or the migration file for the full structure.

### 4. Configure Zendesk webhook

In Zendesk, create a webhook pointing to:
```
https://your-domain.com/api/webhooks/zendesk
```

Set a trigger to fire on ticket create/update and pass your `ZENDESK_WEBHOOK_SECRET` as a query param or header.

### 5. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You'll be redirected to the login page. Create your first admin user directly in Supabase Auth, then set their role in the `user_profiles` table.

---

## Database Schema (overview)

| Table | Purpose |
|-------|---------|
| `tickets` | All synced Zendesk tickets with AI classification and SLA fields |
| `sync_logs` | History of webhook and manual sync operations |
| `user_profiles` | Role and domain access per user |
| `sla_policies` | Configurable SLA rules by domain/category |
| `ticket_csat` | CSAT survey responses (1–5) linked to tickets |

---

## Deployment

This project is designed to deploy on Vercel.

```bash
npm i -g vercel
vercel --prod
```

Add all environment variables in your Vercel project settings before deploying.

For the SLA cron job, add this to your `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/sla/check",
      "schedule": "0 9 * * *"
    }
  ]
}
```

> **Note:** Vercel Hobby plan supports 1 cron job per day. Upgrade to Pro for more frequent SLA checks.

---

## Project Structure

```
src/
├── app/
│   ├── dashboard/          # Main ticket dashboard + reports
│   ├── admin/              # User management (admin only)
│   ├── api/                # All route handlers
│   │   ├── tickets/        # Ticket CRUD, export, assignees
│   │   ├── reports/        # Report summary API
│   │   ├── sla/            # SLA config and cron check
│   │   ├── sync/           # Manual sync trigger
│   │   ├── webhooks/       # Zendesk webhook receiver
│   │   └── auth/           # Login, logout, invite, profile
│   └── ...
├── components/
│   └── DashboardShell.tsx  # Shared sidebar layout
├── hooks/
│   └── useTicketRealtime.ts # Supabase Realtime subscription
└── lib/
    ├── ai/classify.ts       # Claude Haiku classification
    ├── email/               # Resend templates and sender
    ├── zendesk/             # Zendesk API client
    └── supabase/            # Supabase client instances
```

---

## License

MIT

---

## Author

Chirag Mewara · Product Manager · [chirag-mewara-portfolio.vercel.app](https://chirag-mewara-portfolio.vercel.app)
