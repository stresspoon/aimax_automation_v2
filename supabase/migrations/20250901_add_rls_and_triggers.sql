-- RLS 정책 설정
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_keys ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 결제 정보만 조회 가능
CREATE POLICY "Users can view own payments" ON public.payments
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own subscriptions" ON public.subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own payment logs" ON public.payment_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own refunds" ON public.refunds
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own billing keys" ON public.billing_keys
  FOR SELECT USING (auth.uid() = user_id);

-- 시스템은 모든 작업 가능 (service role 사용)
CREATE POLICY "Service role can do all operations on payments" ON public.payments
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can do all operations on subscriptions" ON public.subscriptions
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can do all operations on payment_logs" ON public.payment_logs
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can do all operations on refunds" ON public.refunds
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can do all operations on billing_keys" ON public.billing_keys
  FOR ALL USING (auth.role() = 'service_role');

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