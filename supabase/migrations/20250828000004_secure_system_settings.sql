-- Create system_settings table for storing application settings
CREATE TABLE IF NOT EXISTS public.system_settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Drop ALL prior policies to start clean (final desired state for beta)
DROP POLICY IF EXISTS "Admins can read settings" ON public.system_settings;
DROP POLICY IF EXISTS "Admins can manage settings" ON public.system_settings;
DROP POLICY IF EXISTS "Admins can manage system settings" ON public.system_settings;
DROP POLICY IF EXISTS "Anyone can read settings" ON public.system_settings;
DROP POLICY IF EXISTS "Authenticated users can read settings" ON public.system_settings;
DROP POLICY IF EXISTS "Authenticated users can manage settings" ON public.system_settings;
DROP POLICY IF EXISTS "Admins can update settings" ON public.system_settings;
DROP POLICY IF EXISTS "Admins can delete settings" ON public.system_settings;

-- Allow all authenticated users to READ settings only
CREATE POLICY "Anyone can read settings" ON public.system_settings
  FOR SELECT
  TO authenticated
  USING (true);

-- NO ONE can modify settings through the app (only through Supabase dashboard)
-- This is the safest approach for beta testing

-- Insert default settings
INSERT INTO public.system_settings (key, value) 
VALUES 
  ('openai_model', 'gpt-5-mini'),
  ('max_free_trials', '3')
ON CONFLICT (key) DO NOTHING;