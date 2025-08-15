-- Applicants table to store Google Form submissions and auto-selection results
CREATE TABLE public.applicants (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT NOT NULL,
  source TEXT,
  threads_url TEXT,
  instagram_url TEXT,
  blog_url TEXT,
  video_consent BOOLEAN DEFAULT FALSE,
  privacy_consent BOOLEAN DEFAULT FALSE,
  metrics JSONB DEFAULT '{}'::jsonb,
  selection_status TEXT NOT NULL DEFAULT 'pending' CHECK (selection_status IN ('pending','selected','rejected')),
  selection_reason TEXT,
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Indexes
CREATE INDEX idx_applicants_email ON public.applicants(email);
CREATE INDEX idx_applicants_selection_status ON public.applicants(selection_status);

-- Enable Row Level Security
ALTER TABLE public.applicants ENABLE ROW LEVEL SECURITY;

-- Note: No RLS policies are created intentionally. Use service role key for all writes/reads.

-- Update trigger for updated_at
CREATE TRIGGER update_applicants_updated_at BEFORE UPDATE ON public.applicants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


