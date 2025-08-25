-- First, add is_admin column to profiles if it doesn't exist
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- Create system_settings table for storing application settings
CREATE TABLE IF NOT EXISTS public.system_settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Create simpler policies for system_settings
-- For now, allow all authenticated users to read settings
CREATE POLICY "Authenticated users can read settings" ON public.system_settings
  FOR SELECT
  TO authenticated
  USING (true);

-- Only users with is_admin = true can manage settings
CREATE POLICY "Admins can manage settings" ON public.system_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can update settings" ON public.system_settings
  FOR UPDATE
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

CREATE POLICY "Admins can delete settings" ON public.system_settings
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_admin = true
    )
  );

-- Insert default settings
INSERT INTO public.system_settings (key, value) 
VALUES 
  ('openai_model', 'gpt-5-mini'),
  ('max_free_trials', '3')
ON CONFLICT (key) DO NOTHING;

-- Make yourself an admin (replace with your actual user ID)
-- You can find your user ID in Supabase Dashboard > Authentication > Users
-- UPDATE profiles SET is_admin = true WHERE id = 'YOUR-USER-ID-HERE';