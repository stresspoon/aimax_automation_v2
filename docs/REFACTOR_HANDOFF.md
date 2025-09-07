Refactor Handoff — AIMAX v2

Goal
- Stabilize API/clients with standardized IO (zod + http utils), harden security (RLS/webhooks), and keep behavior unchanged while reducing coupling and adding tests.

What Changed (High‑Level)
- IO Standardization
  - `src/lib/httpClient.ts`: `fetchJSON` (timeout, JSON error mapping, Abort support)
  - `src/lib/http.ts`: standard responses (ok/created/badRequest/…)
  - `src/lib/errors.ts`: `errorMessage()` to normalize errors for UI toasts
- API Validation
  - zod schemas for auth/projects/payments/forms (see `src/app/api/**/schema.ts`)
- Webhooks
  - Payments: signature verify + idempotency (event hash) + unique index in `payment_logs`
  - Forms: signature verify + gate via `ENABLE_SHEETS_INTEGRATION`
- RLS/Policies
  - `supabase/migrations/20250902_rls_hardening.sql`: enable RLS and set minimal policies; keep only essential SECURITY DEFINER functions and lock search_path
  - `scripts/audit-rls-and-indexes.sql`: quick checks for RLS/policies/indexes/security definer functions
- UI (Customer Acquisition)
  - Most fetch calls replaced with `fetchJSON`; Abort preserved for long‑running calls; fire‑and‑forget kept for idempotent background processing

How To Work With It
- API routes: add a zod schema, validate early, and return via `http.ts` helpers
- Client calls: prefer `fetchJSON` with small adapters; pass `signal` for cancelable flows
- Errors: surface `errorMessage(err, fallback)` toasts
- DB: add new idempotent migrations; avoid editing older files; audit with the script

Key Files
- `src/lib/httpClient.ts`, `src/lib/http.ts`, `src/lib/errors.ts`
- `src/app/api/*/schema.ts` (where present)
- `src/app/api/payments/webhook/route.ts`, `src/lib/payments/toss.ts`
- `src/app/api/forms/webhook/route.ts`
- `scripts/audit-rls-and-indexes.sql`, `supabase/migrations/20250902_rls_hardening.sql`

Tests
- Run: `npm test`
- Coverage includes: http client, auth/payments schemas, gates, webhook helpers

Env & Gates
- Forms: `ENABLE_SHEETS_INTEGRATION` (false by default), `FORMS_WEBHOOK_SECRET` (prod required)
- Payments: `TOSS_WEBHOOK_SECRET` (prod required)
- Base: `NEXT_PUBLIC_BASE_URL`, Supabase keys

What’s Next (Suggested Order)
1) Customer Acquisition (phase 2)
   - Remaining fetch calls → `fetchJSON` (non‑canceling paths)
   - Optional: introduce `showErrorFrom()` thin wrapper and apply
2) Extend to other screens
   - Standardize error toasts and client calls on 1–2 more pages
3) Payments route tests (mocked)
   - Create/confirm success/boundary/failure cases
4) Docs
   - `supabase/migrations/README.md` present; keep adding small notes for new migrations

References
- TDD Refactor Guide: `docs/tdd-refactor.chatmode.md`
- Database Setup: `README_DATABASE_SETUP.md`
- Migrations Policy: `supabase/migrations/README.md`

