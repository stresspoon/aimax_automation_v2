-- 결제 정보 테이블
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  
  -- 토스페이먼츠 정보
  payment_key TEXT UNIQUE,
  order_id TEXT UNIQUE NOT NULL,
  
  -- 결제 정보
  amount INTEGER NOT NULL,
  currency TEXT DEFAULT 'KRW',
  method TEXT, -- 카드, 계좌이체, 가상계좌 등
  
  -- 상품 정보
  order_name TEXT NOT NULL,
  product_type TEXT NOT NULL, -- 'subscription', 'credit', 'one-time'
  
  -- 결제 상태
  status TEXT NOT NULL DEFAULT 'pending', -- pending, ready, in_progress, done, canceled, failed, expired
  
  -- 추가 정보
  customer_name TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  
  -- 토스페이먼츠 응답 데이터
  requested_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  
  receipt_url TEXT,
  checkout_url TEXT,
  failure_code TEXT,
  failure_message TEXT,
  
  -- 메타데이터
  metadata JSONB DEFAULT '{}',
  raw_response JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 구독 정보 테이블
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- 구독 플랜 정보
  plan_id TEXT NOT NULL, -- 'free', 'basic', 'premium', 'enterprise'
  plan_name TEXT NOT NULL,
  
  -- 구독 상태
  status TEXT NOT NULL DEFAULT 'active', -- active, canceled, expired, suspended
  
  -- 결제 정보 연결
  current_payment_id UUID REFERENCES public.payments(id),
  
  -- 구독 기간
  started_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  
  -- 사용량 제한
  monthly_credits INTEGER DEFAULT 0,
  used_credits INTEGER DEFAULT 0,
  
  -- 메타데이터
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 결제 내역 테이블 (결제 시도 로그)
CREATE TABLE IF NOT EXISTS public.payment_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  payment_id UUID REFERENCES public.payments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  action TEXT NOT NULL, -- 'request', 'approve', 'cancel', 'fail', 'webhook'
  status TEXT NOT NULL,
  
  request_data JSONB DEFAULT '{}',
  response_data JSONB DEFAULT '{}',
  
  ip_address INET,
  user_agent TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 환불 정보 테이블
CREATE TABLE IF NOT EXISTS public.refunds (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  payment_id UUID NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- 환불 정보
  refund_key TEXT UNIQUE,
  amount INTEGER NOT NULL,
  reason TEXT,
  
  -- 환불 상태
  status TEXT NOT NULL DEFAULT 'pending', -- pending, in_progress, completed, failed
  
  -- 토스페이먼츠 응답
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  
  failure_code TEXT,
  failure_message TEXT,
  
  -- 메타데이터
  metadata JSONB DEFAULT '{}',
  raw_response JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 빌링 키 관리 테이블 (자동 결제용)
CREATE TABLE IF NOT EXISTS public.billing_keys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- 빌링 키 정보
  billing_key TEXT UNIQUE NOT NULL,
  customer_key TEXT UNIQUE NOT NULL,
  
  -- 카드 정보 (마스킹된 정보만 저장)
  card_company TEXT,
  card_number TEXT, -- 마스킹된 카드 번호 (예: 1234-****-****-5678)
  
  -- 상태
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  
  -- 메타데이터
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 생성 (IF NOT EXISTS 추가)
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_project_id ON public.payments(project_id);
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON public.payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_key ON public.payments(payment_key);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON public.payments(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan_id ON public.subscriptions(plan_id);

CREATE INDEX IF NOT EXISTS idx_payment_logs_payment_id ON public.payment_logs(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_logs_user_id ON public.payment_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_logs_created_at ON public.payment_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_refunds_payment_id ON public.refunds(payment_id);
CREATE INDEX IF NOT EXISTS idx_refunds_user_id ON public.refunds(user_id);

CREATE INDEX IF NOT EXISTS idx_billing_keys_user_id ON public.billing_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_billing_keys_customer_key ON public.billing_keys(customer_key);

-- RLS 정책 설정
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_keys ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
-- 사용자는 자신의 결제 정보만 조회 가능
  DROP POLICY IF EXISTS "Users can view own payments" ON public.payments;
  CREATE POLICY "Users can view own payments" ON public.payments FOR SELECT USING (auth.uid() = user_id);

  DROP POLICY IF EXISTS "Users can view own subscriptions" ON public.subscriptions;
  CREATE POLICY "Users can view own subscriptions" ON public.subscriptions FOR SELECT USING (auth.uid() = user_id);

  DROP POLICY IF EXISTS "Users can view own payment logs" ON public.payment_logs;
  CREATE POLICY "Users can view own payment logs" ON public.payment_logs FOR SELECT USING (auth.uid() = user_id);

  DROP POLICY IF EXISTS "Users can view own refunds" ON public.refunds;
  CREATE POLICY "Users can view own refunds" ON public.refunds FOR SELECT USING (auth.uid() = user_id);

  DROP POLICY IF EXISTS "Users can view own billing keys" ON public.billing_keys;
  CREATE POLICY "Users can view own billing keys" ON public.billing_keys FOR SELECT USING (auth.uid() = user_id);

-- 시스템은 모든 작업 가능 (service role 사용)
  DROP POLICY IF EXISTS "Service role can do all operations on payments" ON public.payments;
  CREATE POLICY "Service role can do all operations on payments" ON public.payments FOR ALL USING (auth.role() = 'service_role');

  DROP POLICY IF EXISTS "Service role can do all operations on subscriptions" ON public.subscriptions;
  CREATE POLICY "Service role can do all operations on subscriptions" ON public.subscriptions FOR ALL USING (auth.role() = 'service_role');

  DROP POLICY IF EXISTS "Service role can do all operations on payment_logs" ON public.payment_logs;
  CREATE POLICY "Service role can do all operations on payment_logs" ON public.payment_logs FOR ALL USING (auth.role() = 'service_role');

  DROP POLICY IF EXISTS "Service role can do all operations on refunds" ON public.refunds;
  CREATE POLICY "Service role can do all operations on refunds" ON public.refunds FOR ALL USING (auth.role() = 'service_role');

  DROP POLICY IF EXISTS "Service role can do all operations on billing_keys" ON public.billing_keys;
  CREATE POLICY "Service role can do all operations on billing_keys" ON public.billing_keys FOR ALL USING (auth.role() = 'service_role');
END $$;

-- 트리거: updated_at 자동 업데이트
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_refunds_updated_at BEFORE UPDATE ON public.refunds
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_billing_keys_updated_at BEFORE UPDATE ON public.billing_keys
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();