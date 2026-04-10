-- Fix RLS policies for projects table to allow proper deletion

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can delete own projects" ON public.projects;

-- Create new deletion policy
CREATE POLICY "Users can delete own projects" ON public.projects
  FOR DELETE
  USING (auth.uid() = user_id);

-- Also ensure campaigns can be deleted properly
DROP POLICY IF EXISTS "Users can delete own campaigns" ON public.campaigns;

CREATE POLICY "Users can delete own campaigns" ON public.campaigns
  FOR DELETE
  USING (auth.uid() = user_id);

-- Clean up orphaned projects (projects without valid campaign_id)
DELETE FROM public.projects 
WHERE campaign_id NOT IN (SELECT id FROM public.campaigns);

-- Optional: Add ON DELETE CASCADE if not already present
-- This ensures projects are deleted when campaigns are deleted
ALTER TABLE public.projects
DROP CONSTRAINT IF EXISTS projects_campaign_id_fkey,
ADD CONSTRAINT projects_campaign_id_fkey 
  FOREIGN KEY (campaign_id) 
  REFERENCES public.campaigns(id) 
  ON DELETE CASCADE;