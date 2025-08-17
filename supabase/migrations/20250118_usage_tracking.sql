-- Create usage_logs table for tracking feature usage
CREATE TABLE IF NOT EXISTS usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  feature TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Index for faster queries
  INDEX idx_usage_logs_user_feature (user_id, feature),
  INDEX idx_usage_logs_created (created_at)
);

-- Add RLS policies
ALTER TABLE usage_logs ENABLE ROW LEVEL SECURITY;

-- Users can only see their own usage logs
CREATE POLICY "Users can view own usage logs"
  ON usage_logs
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own usage logs
CREATE POLICY "Users can create own usage logs"
  ON usage_logs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Add subscription fields to profiles if not exists
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'free',
ADD COLUMN IF NOT EXISTS subscription_plan TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS subscription_started_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMPTZ DEFAULT NULL;

-- Create index for subscription status
CREATE INDEX IF NOT EXISTS idx_profiles_subscription 
  ON profiles(subscription_status, subscription_plan);