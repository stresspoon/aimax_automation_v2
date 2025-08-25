-- Create system_settings table for storing application settings
CREATE TABLE IF NOT EXISTS public.system_settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

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