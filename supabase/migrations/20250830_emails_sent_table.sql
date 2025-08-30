-- Email send ledger for compliance and dedup using provider_message_id
CREATE TABLE IF NOT EXISTS public.emails_sent (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  project_id UUID NULL REFERENCES public.projects(id) ON DELETE SET NULL,
  recipient TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_preview TEXT,
  provider TEXT,
  provider_message_id TEXT,
  status TEXT NOT NULL CHECK (status IN ('sent', 'failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Dedup key if provider returns stable message id
CREATE UNIQUE INDEX IF NOT EXISTS uq_emails_sent_provider_msg ON public.emails_sent(provider, provider_message_id) WHERE provider_message_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_emails_sent_user_created ON public.emails_sent(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_emails_sent_project_created ON public.emails_sent(project_id, created_at DESC);

-- RLS
ALTER TABLE public.emails_sent ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Users can view own emails" ON public.emails_sent FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users can insert own emails" ON public.emails_sent FOR INSERT WITH CHECK (auth.uid() = user_id);


