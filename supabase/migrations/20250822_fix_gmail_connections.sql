-- Drop existing gmail_connections table if exists
DROP TABLE IF EXISTS public.gmail_connections CASCADE;

-- Recreate gmail_connections table with correct reference to user_profiles
CREATE TABLE public.gmail_connections (
  user_id UUID PRIMARY KEY REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  access_token TEXT,
  refresh_token TEXT NOT NULL,
  expiry_at TIMESTAMP WITH TIME ZONE,
  connected_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.gmail_connections ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own gmail connection" ON public.gmail_connections
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own gmail connection" ON public.gmail_connections
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own gmail connection" ON public.gmail_connections
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own gmail connection" ON public.gmail_connections
  FOR DELETE USING (auth.uid() = user_id);

-- Service role can do everything
CREATE POLICY "Service role can manage all gmail connections" ON public.gmail_connections
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Create index for faster queries
CREATE INDEX idx_gmail_connections_user_id ON public.gmail_connections(user_id);

-- Create or replace function to update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_gmail_connections_updated_at ON public.gmail_connections;
CREATE TRIGGER update_gmail_connections_updated_at 
  BEFORE UPDATE ON public.gmail_connections
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();