Supabase Migrations — Policy & How-To

Scope
- This folder contains idempotent migrations that harden security (RLS/policies), create or adjust tables, and keep the database in a consistent state across environments.

Run
- CLI: `npm run db:migrate` (if wired) or execute files in order via Supabase SQL editor.
- Order: Prefer newest files as they are idempotent and self‑healing (DROP POLICY IF EXISTS… patterns).

Key Files
- 20250902_rls_hardening.sql
  - Enables RLS and sets consistent policies for:
    - public.system_settings: SELECT for authenticated/service_role, ALL for service_role
    - public.user_profile_map: SELECT own mapping, ALL for service_role (table must exist; adjust column if needed)
  - Functions: keeps only the minimal SECURITY DEFINER functions (auth triggers) and locks search_path to `public, pg_temp`. Others set to SECURITY INVOKER.

Audit
- Use scripts/audit-rls-and-indexes.sql to review:
  - RLS enabled flags
  - Policies in effect
  - Indexes
  - Security definer functions

Notes
- Avoid editing older files; add new idempotent migrations for fixes.
- If `user_profile_map` uses a different user id column, update policy creation accordingly or apply the dynamic column detection snippet from the handoff doc.

