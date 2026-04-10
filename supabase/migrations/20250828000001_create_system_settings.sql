-- Create system_settings table for storing application settings
-- First, ensure is_admin column exists in profiles as it is used in policies below
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

CREATE TABLE IF NOT EXISTS public.system_settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for system_settings
DO $$ 
BEGIN
-- Only admins can read settings
  DROP POLICY IF EXISTS "Admins can read settings" ON public.system_settings;
  CREATE POLICY "Admins can read settings" ON public.system_settings
    FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.is_admin = true
      )
    );

-- Only admins can insert/update settings
  DROP POLICY IF EXISTS "Admins can manage settings" ON public.system_settings;
  CREATE POLICY "Admins can manage settings" ON public.system_settings
    FOR ALL
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.is_admin = true
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.is_admin = true
      )
    );
END $$;

-- Insert default settings
INSERT INTO public.system_settings (key, value) 
VALUES 
  ('openai_model', 'gpt-5-mini'),
  ('max_free_trials', '3')
ON CONFLICT (key) DO NOTHING;