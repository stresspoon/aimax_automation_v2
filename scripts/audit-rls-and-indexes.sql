-- Audit RLS and indexes for critical tables (Supabase SQL editor compatible)

-- 1) RLS status per table
SELECT n.nspname AS schema,
       c.relname AS table,
       c.relrowsecurity AS rls_enabled
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND c.relname IN ('payments','subscriptions','payment_logs','refunds','billing_keys','usage_logs','system_settings','user_profile_map')
ORDER BY c.relname;

-- 2) Tables in public without RLS enabled (quick scan)
SELECT n.nspname AS schema,
       c.relname AS table,
       c.relrowsecurity AS rls_enabled
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND c.relrowsecurity = false
ORDER BY c.relname;

-- 3) Policies on critical tables
SELECT pol.schemaname,
       pol.tablename,
       pol.policyname,
       pol.permissive,
       pol.cmd,
       pol.roles,
       pol.qual AS using_expr,
       pol.with_check
FROM pg_policies pol
WHERE pol.schemaname = 'public'
  AND pol.tablename IN ('payments','subscriptions','payment_logs','refunds','billing_keys','usage_logs','system_settings','user_profile_map')
ORDER BY pol.tablename, pol.cmd, pol.policyname;

-- 4) Indexes on critical tables
SELECT schemaname, tablename, indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('payments','subscriptions','payment_logs','refunds','billing_keys','usage_logs','system_settings','user_profile_map')
ORDER BY tablename, indexname;

-- 5) Security definer functions in public (should be reviewed)
SELECT n.nspname AS schema,
       p.proname AS function,
       p.prosecdef AS security_definer
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
ORDER BY p.proname;
