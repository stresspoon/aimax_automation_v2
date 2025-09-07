-- URGENT FIX: RLS policy for form_responses_temp table
-- 이 스크립트를 Supabase SQL Editor에서 실행하세요

-- 1. RLS 일시적으로 비활성화하여 정책 초기화
ALTER TABLE public.form_responses_temp DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.processing_queue DISABLE ROW LEVEL SECURITY;

-- 2. 모든 기존 정책 삭제
DROP POLICY IF EXISTS "Anyone can submit responses" ON public.form_responses_temp;
DROP POLICY IF EXISTS "Users can view own form responses" ON public.form_responses_temp;
DROP POLICY IF EXISTS "Users can update own form responses" ON public.form_responses_temp;
DROP POLICY IF EXISTS "Form owners can view responses" ON public.form_responses_temp;
DROP POLICY IF EXISTS "Form owners can update responses" ON public.form_responses_temp;
DROP POLICY IF EXISTS "Form owners can delete responses" ON public.form_responses_temp;

DROP POLICY IF EXISTS "Users can view own queue" ON public.processing_queue;
DROP POLICY IF EXISTS "Form owners can view queue" ON public.processing_queue;
DROP POLICY IF EXISTS "Anyone can insert to queue" ON public.processing_queue;
DROP POLICY IF EXISTS "Service role can manage queue" ON public.processing_queue;

-- 3. RLS 다시 활성화
ALTER TABLE public.form_responses_temp ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.processing_queue ENABLE ROW LEVEL SECURITY;

-- 4. 새로운 정책 생성 - 더 명확한 권한 설정

-- form_responses_temp 정책
-- 모든 사용자(로그인하지 않은 사용자 포함)가 응답 제출 가능
CREATE POLICY "Public can insert responses" ON public.form_responses_temp
  FOR INSERT 
  WITH CHECK (true);

-- 폼 소유자만 응답 조회 가능
CREATE POLICY "Form owners can select responses" ON public.form_responses_temp
  FOR SELECT 
  USING (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM public.forms 
      WHERE forms.id = form_responses_temp.form_id 
      AND forms.user_id = auth.uid()
    )
  );

-- 폼 소유자만 응답 수정 가능
CREATE POLICY "Form owners can update responses" ON public.form_responses_temp
  FOR UPDATE 
  USING (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM public.forms 
      WHERE forms.id = form_responses_temp.form_id 
      AND forms.user_id = auth.uid()
    )
  );

-- 폼 소유자만 응답 삭제 가능
CREATE POLICY "Form owners can delete responses" ON public.form_responses_temp
  FOR DELETE 
  USING (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM public.forms 
      WHERE forms.id = form_responses_temp.form_id 
      AND forms.user_id = auth.uid()
    )
  );

-- processing_queue 정책
-- 모든 사용자가 큐에 추가 가능
CREATE POLICY "Public can insert to queue" ON public.processing_queue
  FOR INSERT 
  WITH CHECK (true);

-- 폼 소유자만 자신의 큐 조회 가능
CREATE POLICY "Form owners can view queue" ON public.processing_queue
  FOR SELECT 
  USING (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM public.form_responses_temp r
      JOIN public.forms f ON r.form_id = f.id
      WHERE r.id = processing_queue.response_id
      AND f.user_id = auth.uid()
    )
  );

-- 시스템만 큐 수정/삭제 가능 (서버 사이드 처리용)
CREATE POLICY "System can manage queue" ON public.processing_queue
  FOR UPDATE 
  USING (false)
  WITH CHECK (false);

CREATE POLICY "System can delete queue" ON public.processing_queue
  FOR DELETE 
  USING (false);

-- 5. 권한 부여 확인
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- 특히 중요한 테이블 권한 명시
GRANT INSERT, SELECT ON public.form_responses_temp TO anon;
GRANT ALL ON public.form_responses_temp TO authenticated;
GRANT INSERT ON public.processing_queue TO anon;
GRANT SELECT, INSERT ON public.processing_queue TO authenticated;

-- 6. forms 테이블의 공개 읽기 권한 확인 (slug로 폼 조회 가능하게)
DROP POLICY IF EXISTS "Public can view active forms by slug" ON public.forms;
CREATE POLICY "Public can view active forms" ON public.forms
  FOR SELECT 
  USING (is_active = true);

-- 7. 확인 메시지
DO $$
BEGIN
  RAISE NOTICE '✅ RLS policies have been completely reset and fixed!';
  RAISE NOTICE '✅ Public users can now submit form responses';
  RAISE NOTICE '✅ Form owners can manage their form responses';
END $$;

-- 8. 정책 확인 쿼리
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename IN ('form_responses_temp', 'processing_queue', 'forms')
ORDER BY tablename, policyname;