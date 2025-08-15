-- Enable RLS on all public tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tool_purchases ENABLE ROW LEVEL SECURITY;

-- RLS policies for profiles table
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- RLS policies for campaigns table
CREATE POLICY "Users can view own campaigns" ON public.campaigns
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own campaigns" ON public.campaigns
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own campaigns" ON public.campaigns
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own campaigns" ON public.campaigns
  FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for projects table
CREATE POLICY "Users can view own projects" ON public.projects
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own projects" ON public.projects
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own projects" ON public.projects
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own projects" ON public.projects
  FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for orders table
CREATE POLICY "Users can view own orders" ON public.orders
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own orders" ON public.orders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own orders" ON public.orders
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS policies for tool_purchases table
CREATE POLICY "Users can view own tool purchases" ON public.tool_purchases
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tool purchases" ON public.tool_purchases
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Note: If you have an applicants table mentioned in the error, add this:
-- ALTER TABLE public.applicants ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Users can view own applicants" ON public.applicants
--   FOR SELECT USING (auth.uid() = user_id);
-- CREATE POLICY "Users can insert own applicants" ON public.applicants
--   FOR INSERT WITH CHECK (auth.uid() = user_id);
-- CREATE POLICY "Users can update own applicants" ON public.applicants
--   FOR UPDATE USING (auth.uid() = user_id);
-- CREATE POLICY "Users can delete own applicants" ON public.applicants
--   FOR DELETE USING (auth.uid() = user_id);