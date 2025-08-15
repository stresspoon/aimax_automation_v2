-- Store per-user Gmail OAuth connection for sending emails as the user
CREATE TABLE IF NOT EXISTS public.gmail_connections (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  access_token TEXT,
  refresh_token TEXT NOT NULL,
  expiry_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE public.gmail_connections ENABLE ROW LEVEL SECURITY;

-- Only owner can read/write their own connection from client if needed.
-- For server-side admin usage we will use service role key.
CREATE POLICY IF NOT EXISTS "Users can view own gmail connection" ON public.gmail_connections
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can upsert own gmail connection" ON public.gmail_connections
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can update own gmail connection" ON public.gmail_connections
  FOR UPDATE USING (auth.uid() = user_id);

-- Update trigger for updated_at
CREATE TRIGGER IF NOT EXISTS update_gmail_connections_updated_at BEFORE UPDATE ON public.gmail_connections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


