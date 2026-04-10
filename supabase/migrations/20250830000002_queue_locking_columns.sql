-- Add locking fields to processing_queue and support dead-letter semantics
ALTER TABLE public.processing_queue 
  ADD COLUMN IF NOT EXISTS locked_by TEXT,
  ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS state TEXT DEFAULT 'queued' CHECK (state IN ('queued','locked','dead'));

CREATE INDEX IF NOT EXISTS idx_processing_queue_lock ON public.processing_queue(locked_at);


