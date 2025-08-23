-- Add missing columns to projects table if they don't exist
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS campaign_name TEXT,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'writing',
ADD COLUMN IF NOT EXISTS content_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS emails_sent INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS leads_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS step1_completed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS step2_completed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS step3_completed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS generated_content TEXT,
ADD COLUMN IF NOT EXISTS db_collected BOOLEAN DEFAULT false;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON public.projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_campaign_id ON public.projects(campaign_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects(status);