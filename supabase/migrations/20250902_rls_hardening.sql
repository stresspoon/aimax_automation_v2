-- RLS hardening and security fixes

DO $$
DECLARE v_exists boolean; polname text;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema='public' AND table_name='system_settings'
  ) INTO v_exists;

  IF v_exists THEN
    EXECUTE 'ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY';

    -- drop existing policies
    FOR polname IN
      SELECT policyname FROM pg_policies 
      WHERE schemaname='public' AND tablename='system_settings'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.system_settings', polname);
    END LOOP;

    -- create minimal policies
    EXECUTE 'CREATE POLICY "Authenticated can read settings" ON public.system_settings '
         || 'FOR SELECT USING (auth.role() = ''authenticated'' OR auth.role() = ''service_role'')';

    EXECUTE 'CREATE POLICY "Admins can manage settings" ON public.system_settings '
         || 'FOR ALL USING (auth.role() = ''service_role'') WITH CHECK (auth.role() = ''service_role'')';
  END IF;
END $$;

-- 2) Ensure RLS enabled and policies for user_profile_map
DO $$
DECLARE v_exists boolean; polname text; col_name text;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema='public' AND table_name='user_profile_map'
  ) INTO v_exists;

  IF v_exists THEN
    EXECUTE 'ALTER TABLE public.user_profile_map ENABLE ROW LEVEL SECURITY';

    FOR polname IN
      SELECT policyname FROM pg_policies 
      WHERE schemaname='public' AND tablename='user_profile_map'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.user_profile_map', polname);
    END LOOP;

    -- Check which column exists (user_id, auth_id, or id)
    SELECT column_name INTO col_name
    FROM information_schema.columns 
    WHERE table_schema='public' 
      AND table_name='user_profile_map' 
      AND column_name IN ('user_id', 'auth_id', 'id')
    LIMIT 1;

    IF col_name IS NOT NULL THEN
      EXECUTE format('CREATE POLICY "Users can view own mapping" ON public.user_profile_map '
           || 'FOR SELECT USING (auth.uid() = %I)', col_name);
    ELSE
      -- If no matching column, skip user-specific policy
      RAISE NOTICE 'No user identifier column found in user_profile_map, skipping user policy';
    END IF;

    EXECUTE 'CREATE POLICY "Service role full access (user_profile_map)" ON public.user_profile_map '
         || 'FOR ALL USING (auth.role() = ''service_role'') WITH CHECK (auth.role() = ''service_role'')';
  END IF;
END $$;

-- 3) Remove security definer from maintenance function (if exists)
-- 3-a) Make maintenance function invoker
DO $$
DECLARE r record;
BEGIN
  FOR r IN 
    SELECT p.oid, n.nspname AS schema, p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname='public' AND p.proname='auto_delete_old_responses'
  LOOP
    EXECUTE format('ALTER FUNCTION %I.%I(%s) SECURITY INVOKER', r.schema, r.proname, r.args);
  END LOOP;
END $$;

-- 3-b) Keep signup/sync functions as SECURITY DEFINER (needed for auth.users triggers), but lock search_path
DO $$
DECLARE r record;
BEGIN
  FOR r IN 
    SELECT p.oid, n.nspname AS schema, p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname='public' AND p.proname IN ('handle_new_user','sync_last_sign_in','sync_profiles_to_user_profiles')
  LOOP
    -- Force safe search_path to prevent hijacking
    EXECUTE format('ALTER FUNCTION %I.%I(%s) SET search_path = public, pg_temp', r.schema, r.proname, r.args);
  END LOOP;
END $$;
