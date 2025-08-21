-- 안전한 버전: 기존 테이블이 있으면 변경만 수행

-- usage_logs 테이블이 없을 때만 생성
CREATE TABLE IF NOT EXISTS usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  feature TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for faster queries (IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_usage_logs_user_feature ON usage_logs(user_id, feature);
CREATE INDEX IF NOT EXISTS idx_usage_logs_created ON usage_logs(created_at);

-- Enable RLS
ALTER TABLE usage_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and recreate
DROP POLICY IF EXISTS "Users can view own usage logs" ON usage_logs;
CREATE POLICY "Users can view own usage logs"
  ON usage_logs
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own usage logs" ON usage_logs;
CREATE POLICY "Users can create own usage logs"
  ON usage_logs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Add subscription fields to user_profiles if not exists
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'free',
ADD COLUMN IF NOT EXISTS subscription_plan TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS subscription_started_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMPTZ DEFAULT NULL;

-- Create index for subscription status
CREATE INDEX IF NOT EXISTS idx_user_profiles_subscription 
  ON user_profiles(subscription_status, subscription_plan);

-- Service role can do everything
DROP POLICY IF EXISTS "Service role can manage all usage logs" ON usage_logs;
CREATE POLICY "Service role can manage all usage logs"
  ON usage_logs
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');