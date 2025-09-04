-- form_responses_temp 테이블에 이메일 발송 추적 필드 추가
ALTER TABLE public.form_responses_temp 
ADD COLUMN IF NOT EXISTS email_sent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS email_sent_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_email_type TEXT; -- 'selected', 'not_selected', 'reminder' 등

-- 인덱스 추가 for 빠른 검색
CREATE INDEX IF NOT EXISTS idx_form_responses_email_sent 
ON public.form_responses_temp(form_id, email_sent_at);

CREATE INDEX IF NOT EXISTS idx_form_responses_email_status 
ON public.form_responses_temp(form_id, is_selected, email_sent_count);

-- 이메일 발송 이력 테이블 생성 (상세 이력 추적용)
CREATE TABLE IF NOT EXISTS public.email_send_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  response_id UUID REFERENCES public.form_responses_temp(id) ON DELETE CASCADE,
  form_id UUID REFERENCES public.forms(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  email_type TEXT NOT NULL, -- 'selected', 'not_selected', 'reminder', 'follow_up'
  email_subject TEXT,
  email_content TEXT,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  sent_by UUID REFERENCES auth.users(id),
  status TEXT DEFAULT 'sent', -- 'sent', 'failed', 'bounced'
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_email_history_response 
ON public.email_send_history(response_id, sent_at DESC);

CREATE INDEX IF NOT EXISTS idx_email_history_project 
ON public.email_send_history(project_id, sent_at DESC);

CREATE INDEX IF NOT EXISTS idx_email_history_recipient 
ON public.email_send_history(recipient_email, sent_at DESC);

-- RLS 정책
ALTER TABLE public.email_send_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view email history for their projects" 
ON public.email_send_history
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = email_send_history.project_id 
    AND p.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert email history for their projects" 
ON public.email_send_history
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_id 
    AND p.user_id = auth.uid()
  )
);

-- 권한 부여
GRANT ALL ON public.email_send_history TO authenticated;
GRANT SELECT ON public.email_send_history TO anon;

-- 함수: 이메일 발송 전 중복 체크
CREATE OR REPLACE FUNCTION check_email_already_sent(
  p_response_id UUID,
  p_email_type TEXT
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.email_send_history 
    WHERE response_id = p_response_id 
    AND email_type = p_email_type
    AND status = 'sent'
  );
END;
$$ LANGUAGE plpgsql;

-- 함수: 이메일 발송 기록
CREATE OR REPLACE FUNCTION record_email_sent(
  p_response_id UUID,
  p_form_id UUID,
  p_project_id UUID,
  p_recipient_email TEXT,
  p_recipient_name TEXT,
  p_email_type TEXT,
  p_email_subject TEXT,
  p_email_content TEXT
) RETURNS UUID AS $$
DECLARE
  v_history_id UUID;
BEGIN
  -- email_send_history에 기록
  INSERT INTO public.email_send_history (
    response_id, form_id, project_id, 
    recipient_email, recipient_name, 
    email_type, email_subject, email_content,
    sent_by
  ) VALUES (
    p_response_id, p_form_id, p_project_id,
    p_recipient_email, p_recipient_name,
    p_email_type, p_email_subject, p_email_content,
    auth.uid()
  ) RETURNING id INTO v_history_id;
  
  -- form_responses_temp 업데이트
  UPDATE public.form_responses_temp 
  SET 
    email_sent_at = NOW(),
    email_sent_count = COALESCE(email_sent_count, 0) + 1,
    last_email_type = p_email_type
  WHERE id = p_response_id;
  
  RETURN v_history_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE public.email_send_history IS '이메일 발송 이력 추적 테이블';
COMMENT ON COLUMN public.form_responses_temp.email_sent_at IS '마지막 이메일 발송 시간';
COMMENT ON COLUMN public.form_responses_temp.email_sent_count IS '총 이메일 발송 횟수';
COMMENT ON COLUMN public.form_responses_temp.last_email_type IS '마지막 발송 이메일 타입';