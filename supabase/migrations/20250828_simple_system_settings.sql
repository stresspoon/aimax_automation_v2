-- Create system_settings table for storing application settings
CREATE TABLE IF NOT EXISTS public.system_settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read settings
CREATE POLICY "Anyone can read settings" ON public.system_settings
  FOR SELECT
  TO authenticated
  USING (true);

-- For now, allow all authenticated users to manage settings
-- You can restrict this later when you have admin setup
CREATE POLICY "Authenticated users can manage settings" ON public.system_settings
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Insert default settings
INSERT INTO public.system_settings (key, value) 
VALUES 
  ('openai_model', 'gpt-5-mini'),
  ('max_free_trials', '3')
ON CONFLICT (key) DO NOTHING;